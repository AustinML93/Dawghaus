#!/usr/bin/env python3
"""DawgHaus updater — keeps data/schedule.json fresh from ESPN's free API and
pulls gameday weather from Open-Meteo. Stdlib only, no pip install.

Runs in a loop (interval via UPDATE_INTERVAL secs, default 30 min; drops to
LIVE_INTERVAL while a game is on). It MERGES live data onto the hand-seeded
schedule so the app works even before ESPN populates kickoff times / TV /
scores. Failures are non-fatal: we keep the last good file.

⚠️ ESPN gotcha (bit us Aug–Sep 2026): their Akamai edge returns 403 to custom
User-Agents ("DawgHaus/1.0", and even a spoofed Chrome UA) but happily serves the
stock Python-urllib / curl UAs. So: send NO custom User-Agent. The bare endpoint
defaults to the current season, so no `?season=` needed either.
"""
import json, os, sys, time, urllib.request, urllib.error
from datetime import datetime, timezone, date, timedelta
from zoneinfo import ZoneInfo

DATA_DIR = os.environ.get("DATA_DIR", "/data")
SCHEDULE = os.path.join(DATA_DIR, "schedule.json")
WEATHER = os.path.join(DATA_DIR, "weather.json")
TEAM_ID = 264  # Washington Huskies
INTERVAL = int(os.environ.get("UPDATE_INTERVAL", "1800"))
LIVE_INTERVAL = int(os.environ.get("LIVE_INTERVAL", "120"))  # while a game is on
ESPN = ("https://site.api.espn.com/apis/site/v2/sports/football/"
        f"college-football/teams/{TEAM_ID}/schedule")
PT = ZoneInfo("America/Los_Angeles")
ET = ZoneInfo("America/New_York")  # ESPN encodes "time TBD" as midnight Eastern
# Home games are in Seattle (Husky Stadium). We only fetch weather for home games.
HOME_LAT, HOME_LON = 47.6503, -122.3018

WX = {0:"clear",1:"mostly clear",2:"partly cloudy",3:"overcast",45:"foggy",48:"foggy",
      51:"drizzle",53:"drizzle",55:"drizzle",61:"light rain",63:"rain",65:"heavy rain",
      71:"light snow",73:"snow",75:"heavy snow",80:"showers",81:"showers",82:"downpour",
      95:"thunderstorms",96:"thunderstorms",99:"thunderstorms"}


def log(*a): print("[dawghaus]", *a, flush=True)


def fetch_json(url):
    # Deliberately no custom User-Agent — ESPN 403s anything that isn't a stock client UA.
    with urllib.request.urlopen(url, timeout=20) as r:
        return json.loads(r.read().decode("utf-8"))


def norm(s):
    return "".join(c for c in (s or "").lower() if c.isalnum())


def score_val(c):
    s = c.get("score")
    if isinstance(s, dict):
        s = s.get("value", s.get("displayValue"))
    try:
        return int(float(s))
    except (TypeError, ValueError):
        return None


def parse_espn_date(s):
    """ESPN dates look like 2026-09-06T20:00Z."""
    return datetime.strptime(s, "%Y-%m-%dT%H:%MZ").replace(tzinfo=timezone.utc)


def parse_event(ev):
    """Pull the bits we care about from one ESPN event."""
    comp = (ev.get("competitions") or [{}])[0]
    comps = comp.get("competitors") or []
    us = next((c for c in comps if str(c.get("team", {}).get("id")) == str(TEAM_ID)), None)
    them = next((c for c in comps if c is not us), None)
    if not them or not ev.get("date"):
        return None
    utc = parse_espn_date(ev["date"])
    time_valid = bool(comp.get("timeValid", False))
    if time_valid:
        local = utc.astimezone(PT)
        kickoff = local.isoformat(timespec="minutes")
        day = local.date().isoformat()
    else:
        # Midnight Eastern placeholder: trust the DATE (in ET), not the time.
        day = utc.astimezone(ET).date().isoformat()
        kickoff = None
    tt = them.get("team", {})
    out = {
        # ESPN displayName includes the mascot ("Washington State Cougars"); the seed
        # uses the school ("Washington State"). Keep all handles for matching.
        "opponent_name": tt.get("displayName"),
        "opponent_keys": {norm(tt.get("location")), norm(tt.get("abbreviation")),
                          norm(tt.get("displayName")), norm(tt.get("shortDisplayName"))} - {""},
        "espnId": ev.get("id"),
        "date": day,
        "kickoff": kickoff,
        "timeConfirmed": time_valid,
        "tv": None,
        "result": None,
        "status": "pre",
        "live": None,
    }
    # TV / broadcast
    for b in (comp.get("broadcasts") or []):
        name = (b.get("media") or {}).get("shortName") or (b.get("names") or [None])[0]
        if name:
            out["tv"] = name
            break
    if not out["tv"]:
        for b in (comp.get("geoBroadcasts") or []):
            name = (b.get("media") or {}).get("shortName")
            if name:
                out["tv"] = name
                break
    # Status: pre / in / post, plus live score while in progress
    st = (comp.get("status") or {})
    stype = st.get("type") or {}
    state = stype.get("state") or "pre"
    out["status"] = "post" if stype.get("completed") else state
    u, t = (score_val(us) if us else None), score_val(them)
    if out["status"] == "in" and u is not None and t is not None:
        out["live"] = {
            "us": u, "them": t,
            "period": st.get("period"),
            "clock": st.get("displayClock"),
            "detail": stype.get("shortDetail"),
        }
    if out["status"] == "post" and u is not None and t is not None:
        out["result"] = f"{'W' if u > t else 'L'} {u}-{t}"
    return out


def merge_schedule():
    sched = json.load(open(SCHEDULE))
    try:
        data = fetch_json(ESPN)
    except (urllib.error.URLError, TimeoutError, ValueError) as e:
        log("ESPN fetch failed (keeping last good data):", e)
        sched["sync_error"] = f"{datetime.now(timezone.utc).isoformat(timespec='seconds')}: {e}"
        return sched, False

    events = [parse_event(ev) for ev in (data.get("events") or [])]
    events = [e for e in events if e]
    log(f"ESPN returned {len(events)} events")

    def find_event(g):
        keys = {norm(g.get("opponent")), norm(g.get("abbr"))} - {""}
        for e in events:
            if keys & e["opponent_keys"]:
                return e
        # last resort: ESPN displayName starts with our name ("Utah State Aggies")
        for e in events:
            if norm(e["opponent_name"]).startswith(norm(g.get("opponent"))):
                return e
        return None

    changed = False

    def setf(g, k, v):
        nonlocal changed
        if v is not None and g.get(k) != v:
            log(f"  {g['id']}: {k} {g.get(k)!r} -> {v!r}")
            g[k] = v; changed = True

    for g in sched["games"]:
        if g.get("bye"):
            continue
        ev = find_event(g)
        if not ev:
            log(f"  {g['id']}: no ESPN match for {g['opponent']!r}")
            continue
        setf(g, "espnId", ev["espnId"])
        setf(g, "tv", ev["tv"])
        setf(g, "result", ev["result"])
        setf(g, "status", ev["status"])
        if ev["timeConfirmed"]:
            setf(g, "date", ev["date"])
            setf(g, "kickoff", ev["kickoff"])
            setf(g, "timeConfirmed", True)
        elif ev["date"] != g.get("date"):
            # Date moved but time still TBD: keep a noon-ish placeholder kickoff.
            setf(g, "date", ev["date"])
            ph = datetime.fromisoformat(ev["date"]).replace(hour=12, minute=30, tzinfo=PT)
            setf(g, "kickoff", ph.isoformat(timespec="minutes"))
        # live block is transient: overwrite/clear every cycle
        if g.get("live") != ev["live"]:
            g["live"] = ev["live"]; changed = True

    sched.pop("sync_error", None)
    sched["updated"] = datetime.now(timezone.utc).isoformat()
    return sched, changed


def game_is_hot(sched, now=None):
    """True if any game is within [kickoff-1h, kickoff+5h] or ESPN says in-progress."""
    now = now or datetime.now(timezone.utc)
    for g in sched.get("games", []):
        if g.get("bye"):
            continue
        if g.get("status") == "in":
            return True
        try:
            k = datetime.fromisoformat(g["kickoff"])
        except (ValueError, KeyError, TypeError):
            continue
        if k - timedelta(hours=1) <= now <= k + timedelta(hours=5) and g.get("status") != "post":
            return True
    return False


def fetch_weather(sched):
    """Gameday forecast for home games within the next 7 days."""
    today = datetime.now(PT).date()
    out = {"games": {}, "updated": datetime.now(timezone.utc).isoformat()}
    targets = []
    for g in sched["games"]:
        if g.get("bye") or not g.get("home"):
            continue
        try:
            gd = date.fromisoformat(g["date"])
        except (ValueError, KeyError):
            continue
        if today <= gd <= today + timedelta(days=7):
            targets.append((g["id"], gd))
    for gid, gd in targets:
        url = ("https://api.open-meteo.com/v1/forecast"
               f"?latitude={HOME_LAT}&longitude={HOME_LON}"
               "&daily=temperature_2m_max,temperature_2m_min,weathercode"
               "&temperature_unit=fahrenheit&timezone=America/Los_Angeles"
               f"&start_date={gd}&end_date={gd}")
        try:
            w = fetch_json(url)["daily"]
            out["games"][gid] = {
                "tempHi": round(w["temperature_2m_max"][0]),
                "tempLo": round(w["temperature_2m_min"][0]),
                "summary": WX.get(w["weathercode"][0], "weather happening"),
            }
        except Exception as e:  # weather is garnish; never fatal
            log("weather fetch failed for", gid, e)
    return out


def write_atomic(path, obj):
    tmp = path + ".tmp"
    json.dump(obj, open(tmp, "w"), indent=2)
    os.replace(tmp, path)


def run_once(with_weather=True):
    sched, changed = merge_schedule()
    write_atomic(SCHEDULE, sched)
    log("schedule written" + (" (live changes merged)" if changed else " (no schedule changes)"))
    if with_weather:
        wx = fetch_weather(sched)
        write_atomic(WEATHER, wx)
        log(f"weather written for {len(wx['games'])} game(s)")
    return sched


if __name__ == "__main__":
    if not os.path.exists(SCHEDULE):
        log("FATAL: seed schedule not found at", SCHEDULE); sys.exit(1)
    last_wx = 0.0
    while True:
        hot = False
        try:
            # Weather at most every INTERVAL even while polling fast for scores.
            do_wx = (time.time() - last_wx) >= INTERVAL
            sched = run_once(with_weather=do_wx)
            if do_wx: last_wx = time.time()
            hot = game_is_hot(sched)
        except Exception as e:  # noqa: BLE001 — never let the loop die
            log("update cycle error:", e)
        nap = LIVE_INTERVAL if hot else INTERVAL
        log(f"sleeping {nap}s" + (" (GAME ON 🔴)" if hot else ""))
        time.sleep(nap)
