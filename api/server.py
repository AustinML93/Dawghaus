#!/usr/bin/env python3
"""DawgHaus API — the only stateful thing in the app. Stdlib only.

  GET  /siren              -> {"today": n, "total": n, "date": "YYYY-MM-DD", "days": {...last 14}}
  POST /siren              -> increments today's count, returns the same shape
  GET  /watch?game=<id>    -> {"game": id, "votes": {"spot": n}, "voters": n}
  POST /watch  {game, spot, voter}  -> records/changes one voter's spot for that game

State: DATA_DIR/siren.json and DATA_DIR/watch.json (atomic writes). "Today" is a
Pacific date. Light per-IP rate limiting so one bored buddy can't script it.
"""
import json, os, re, threading, time
from urllib.parse import urlparse, parse_qs
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from zoneinfo import ZoneInfo

DATA_DIR = os.environ.get("DATA_DIR", "/data")
STATE = os.path.join(DATA_DIR, "siren.json")
WATCH = os.path.join(DATA_DIR, "watch.json")
SPOT_MAX = 40
ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
PORT = int(os.environ.get("PORT", "8080"))
PT = ZoneInfo("America/Los_Angeles")
MIN_GAP = 0.7          # seconds between taps from one IP (a siren toggle is ~1s anyway)
DAILY_CAP = 500        # per IP per day; we love enthusiasm, not scripts

lock = threading.Lock()
state = {"total": 0, "days": {}}
watch = {}             # game_id -> {voter_id: spot}
ip_last = {}           # ip -> last tap ts
ip_day = {}            # (ip, date) -> count


def log(*a): print("[siren]", *a, flush=True)


def today(): return datetime.now(PT).date().isoformat()


def _read(path, default):
    try:
        with open(path) as f:
            v = json.load(f)
        return v if isinstance(v, dict) else default
    except FileNotFoundError:
        return default
    except Exception as e:
        log(path, "unreadable, starting fresh:", e)
        return default


def load():
    global state, watch
    s = _read(STATE, state)
    if "days" in s: state = s
    watch = _read(WATCH, {})


def _write(path, obj):
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(obj, f)
    os.replace(tmp, path)


def save(): _write(STATE, state)
def save_watch(): _write(WATCH, watch)


def clean_spot(s):
    s = re.sub(r"\s+", " ", str(s or "")).strip()
    s = "".join(ch for ch in s if ch.isprintable())
    return s[:SPOT_MAX]


def watch_snapshot(game):
    votes = {}
    for spot in (watch.get(game) or {}).values():
        votes[spot] = votes.get(spot, 0) + 1
    return {"game": game, "votes": votes, "voters": sum(votes.values())}


def snapshot():
    d = today()
    days = dict(sorted(state["days"].items())[-14:])
    return {"date": d, "today": state["days"].get(d, 0), "total": state.get("total", 0), "days": days}


class H(BaseHTTPRequestHandler):
    server_version = "DawgHausSiren/1.0"

    def _ip(self):
        return (self.headers.get("X-Real-IP") or
                (self.headers.get("X-Forwarded-For") or "").split(",")[0].strip() or
                self.client_address[0])

    def _send(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _route(self):
        u = urlparse(self.path)
        return u.path.rstrip("/"), parse_qs(u.query)

    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 0 or n > 4096:
            return {}
        try:
            return json.loads(self.rfile.read(n).decode("utf-8")) or {}
        except Exception:
            return {}

    def do_GET(self):
        path, q = self._route()
        with lock:
            if path == "/siren":
                return self._send(200, snapshot())
            if path == "/watch":
                game = (q.get("game") or [""])[0]
                if not ID_RE.match(game):
                    return self._send(400, {"error": "bad game id"})
                return self._send(200, watch_snapshot(game))
        self._send(404, {"error": "not found"})

    def do_POST(self):
        path, _ = self._route()
        if path == "/watch":
            return self._post_watch()
        if path != "/siren":
            return self._send(404, {"error": "not found"})
        ip, now, d = self._ip(), time.time(), today()
        with lock:
            if now - ip_last.get(ip, 0) < MIN_GAP:
                return self._send(429, {"error": "easy, tiger", **snapshot()})
            if ip_day.get((ip, d), 0) >= DAILY_CAP:
                return self._send(429, {"error": "you have sirened enough today", **snapshot()})
            ip_last[ip] = now
            ip_day[(ip, d)] = ip_day.get((ip, d), 0) + 1
            state["days"][d] = state["days"].get(d, 0) + 1
            state["total"] = state.get("total", 0) + 1
            try:
                save()
            except Exception as e:
                log("save failed:", e)
            snap = snapshot()
        self._send(200, snap)

    def _post_watch(self):
        b = self._body()
        game, voter, spot = str(b.get("game") or ""), str(b.get("voter") or ""), clean_spot(b.get("spot"))
        if not ID_RE.match(game) or not ID_RE.match(voter):
            return self._send(400, {"error": "bad game/voter id"})
        ip, now = self._ip(), time.time()
        with lock:
            if now - ip_last.get(("w", ip), 0) < MIN_GAP:
                return self._send(429, {"error": "easy", **watch_snapshot(game)})
            ip_last[("w", ip)] = now
            g = watch.setdefault(game, {})
            if not spot:
                g.pop(voter, None)          # empty spot = clear my vote
            else:
                if len(g) >= 500 and voter not in g:
                    return self._send(429, {"error": "that's a lot of buddies", **watch_snapshot(game)})
                g[voter] = spot
            try:
                save_watch()
            except Exception as e:
                log("watch save failed:", e)
            snap = watch_snapshot(game)
        self._send(200, snap)

    def log_message(self, fmt, *args):  # quieter than default
        if self.command == "POST":
            log(self._ip(), fmt % args)


if __name__ == "__main__":
    os.makedirs(DATA_DIR, exist_ok=True)
    load()
    log(f"listening on :{PORT}, sirens so far {state.get('total', 0)}, watch games {len(watch)}")
    ThreadingHTTPServer(("0.0.0.0", PORT), H).serve_forever()
