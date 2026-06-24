#!/usr/bin/env python3
"""DawgHaus updater — keeps data/schedule.json fresh from ESPN's free API and
pulls gameday weather from Open-Meteo. Stdlib only, no pip install.

Runs in a loop (interval via UPDATE_INTERVAL secs, default 6h). It MERGES live
data onto the hand-seeded schedule so the app works even before ESPN populates
kickoff times / TV / scores. Failures are non-fatal: we keep the last good file.
"""
import json, os, sys, time, urllib.request, urllib.error
from datetime import datetime, timezone, date, timedelta

DATA_DIR = os.environ.get("DATA_DIR", "/data")
SCHEDULE = os.path.join(DATA_DIR, "schedule.json")
WEATHER = os.path.join(DATA_DIR, "weather.json")
TEAM_ID = 264  # Washington Huskies
INTERVAL = int(os.environ.get("UPDATE_INTERVAL", "21600"))
ESPN = ("https://site.api.espn.com/apis/site/v2/sports/football/"
        f"college-football/teams/{TEAM_ID}/schedule?season=2026")
# Home games are in Seattle (Husky Stadium). We only fetch weather for home games.
HOME_LAT, HOME_LON = 47.6503, -122.3018

WX = {0:"clear",1:"mostly clear",2:"partly cloudy",3:"overcast",45:"foggy",48:"foggy",
      51:"drizzle",53:"drizzle",55:"drizzle",61:"light rain",63:"rain",65:"heavy rain",
      71:"light snow",73:"snow",75:"heavy snow",80:"showers",81:"showers",82:"downpour",
      95:"thunderstorms",96:"thunderstorms",99:"thunderstorms"}


def log(*a): print("[dawghaus]", *a, flush=True)


def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "DawgHaus/1.0 (+self-hosted)"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode("utf-8"))


def norm(s):
    return "".join(c for c in (s or "").lower() if c.isalnum())


def score_val(c):
    s = c.get("score")
    if isinstance(s, dict):
        return s.get("value", s.get("displayValue"))
    return s


def parse_event(ev):
    """Pull the bits we care about from one ESPN event."""
    comp = (ev.get("competitions") or [{}])[0]
    comps = comp.get("competitors") or []
    us = next((c for c in comps if str(c.get("team", {}).get("id")) == str(TEAM_ID)), None)
    them = next((c for c in comps if c is not us), None)
    if not them:
        return None
    out = {
        "opponent_name": them.get("team", {}).get("displayName"),
        "kickoff": ev.get("date"),
        "timeConfirmed": bool(comp.get("timeValid", False)),
        "tv": None,
        "result": None,
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
    # Result if completed
    status = ((comp.get("status") or {}).get("type") or {})
    if status.get("completed") and us is not None:
        u, t = score_val(us), score_val(them)
        try:
            u, t = int(float(u)), int(float(t))
            out["result"] = f"{'W' if u > t else 'L'} {u}-{t}"
        except (TypeError, ValueError):
            pass
    return out


def merge_schedule():
    sched = json.load(open(SCHEDULE))
    try:
        data = fetch_json(ESPN)
    except (urllib.error.URLError, TimeoutError, ValueError) as e:
        log("ESPN fetch failed (keeping seed):", e)
        return sched, False

    events = [parse_event(ev) for ev in (data.get("events") or [])]
    events = [e for e in events if e]
    log(f"ESPN returned {len(events)} events")

    by_opp = {norm(e["opponent_name"]): e for e in events}
    changed = False
    for g in sched["games"]:
        if g.get("bye"):
            continue
        ev = by_opp.get(norm(g["opponent"]))
        if not ev:
            continue
        for field in ("kickoff", "tv", "result"):
            if ev.get(field) and ev[field] != g.get(field):
                g[field] = ev[field]; changed = True
        if ev.get("timeConfirmed") and not g.get("timeConfirmed"):
            g["timeConfirmed"] = True; changed = True

    sched["updated"] = datetime.now(timezone.utc).isoformat()
    return sched, changed


def fetch_weather(sched):
    """Gameday forecast for home games within the next 7 days."""
    today = date.today()
    out = {"games": {}, "updated": datetime.now(timezone.utc).isoformat()}
    targets = []
    for g in sched["games"]:
        if g.get("bye") or not g.get("home"):
            continue
        try:
            gd = datetime.fromisoformat(g["kickoff"]).date()
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


def run_once():
    sched, changed = merge_schedule()
    write_atomic(SCHEDULE, sched)
    log("schedule written" + (" (live changes merged)" if changed else " (no schedule changes)"))
    wx = fetch_weather(sched)
    write_atomic(WEATHER, wx)
    log(f"weather written for {len(wx['games'])} game(s)")


if __name__ == "__main__":
    if not os.path.exists(SCHEDULE):
        log("FATAL: seed schedule not found at", SCHEDULE); sys.exit(1)
    while True:
        try:
            run_once()
        except Exception as e:  # noqa: BLE001 — never let the loop die
            log("update cycle error:", e)
        log(f"sleeping {INTERVAL}s")
        time.sleep(INTERVAL)
