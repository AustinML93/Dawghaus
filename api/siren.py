#!/usr/bin/env python3
"""DawgHaus siren counter — the only stateful thing in the app. Stdlib only.

  GET  /siren  -> {"today": n, "total": n, "date": "YYYY-MM-DD", "days": {...last 14}}
  POST /siren  -> increments today's count, returns the same shape

State lives in DATA_DIR/siren.json (atomic writes). "Today" is a Pacific date.
Light per-IP rate limiting so one bored buddy can't script it to a million.
"""
import json, os, threading, time
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from zoneinfo import ZoneInfo

DATA_DIR = os.environ.get("DATA_DIR", "/data")
STATE = os.path.join(DATA_DIR, "siren.json")
PORT = int(os.environ.get("PORT", "8080"))
PT = ZoneInfo("America/Los_Angeles")
MIN_GAP = 0.7          # seconds between taps from one IP (a siren toggle is ~1s anyway)
DAILY_CAP = 500        # per IP per day; we love enthusiasm, not scripts

lock = threading.Lock()
state = {"total": 0, "days": {}}
ip_last = {}           # ip -> last tap ts
ip_day = {}            # (ip, date) -> count


def log(*a): print("[siren]", *a, flush=True)


def today(): return datetime.now(PT).date().isoformat()


def load():
    global state
    try:
        with open(STATE) as f:
            s = json.load(f)
        if isinstance(s, dict) and "days" in s:
            state = s
    except FileNotFoundError:
        pass
    except Exception as e:
        log("state unreadable, starting fresh:", e)


def save():
    tmp = STATE + ".tmp"
    with open(tmp, "w") as f:
        json.dump(state, f)
    os.replace(tmp, STATE)


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

    def do_GET(self):
        if self.path.rstrip("/") != "/siren":
            return self._send(404, {"error": "not found"})
        with lock:
            self._send(200, snapshot())

    def do_POST(self):
        if self.path.rstrip("/") != "/siren":
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

    def log_message(self, fmt, *args):  # quieter than default
        if self.command == "POST":
            log(self._ip(), fmt % args)


if __name__ == "__main__":
    os.makedirs(DATA_DIR, exist_ok=True)
    load()
    log(f"listening on :{PORT}, total so far {state.get('total', 0)}")
    ThreadingHTTPServer(("0.0.0.0", PORT), H).serve_forever()
