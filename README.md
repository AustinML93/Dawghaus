# DawgHaus 🐺💜

A snarky, Husky-themed PWA that counts down the days until **college football** returns and until the **Washington Huskies'** first game — shows the full 2026 slate, a hype meter, gameday weather, and a permanent reminder that we are, and forever will be, the **last Pac-12 Champions**.

> Working name: **DawgHaus**. (If this ever goes public: *Purple Reign*.)

Built to self-host on an OMV server in Docker and expose via a Cloudflare tunnel.

## Features

- ⏳ Dual countdowns: first CFB game (Week 0) + first Husky game (the Apple Cup 🍎).
- 🐺 Full 2026 schedule with per-game countdowns, TV, and auto W/L once games finish.
- 🏆 **Forever Pac-12 Champions** banner (2023 — the last one ever).
- ☠️ "Days since we beat Oregon" counter + countdown to the Nov 28 revenge game in Eugene.
- 🔥 Hype meter that fills as kickoff approaches.
- 🌦️ Gameday weather for home games (auto-pulled within 7 days of kickoff).
- 📣 Installable PWA + one-tap share so your buddies can add it to their home screens.
- 😈 Full-degenerate snark engine, rotating daily.

## Architecture

Two tiny containers, no build step:

- **web** — `nginx:alpine` serving the static PWA in `web/` plus the JSON in `data/`.
- **updater** — `python:3.12-alpine` running `updater/update.py` on a loop. It pulls the
  live UW schedule from ESPN's free API and merges kickoff times / TV / scores onto the
  hand-seeded `data/schedule.json`, and fetches gameday weather from Open-Meteo. **No API keys.**

The seeded schedule means the app works immediately; ESPN fills in exact kickoff times and
TV networks automatically as they're announced (which, per your note, won't be much until the
season nears).

## Run it

```bash
docker compose up -d
```

Then open `http://<server>:8080`. Point your Cloudflare tunnel at `localhost:8080`:

```yaml
# cloudflared config.yml
ingress:
  - hostname: dawghaus.example.com
    service: http://localhost:8080
  - service: http_status:404
```

### Tuning

- `UPDATE_INTERVAL` (in `docker-compose.yml`) — refresh cadence in seconds. Default 6h;
  drop to ~`1800` (30 min) once the season starts and kickoff times/scores move.

## Editing the schedule / data

Everything lives in `data/schedule.json`:

- `oregon_last_win` — date of the last win over Oregon (currently `2023-12-01`, the Pac-12 title game).
- `cfb_opener.date` — Week 0 kickoff used for the CFB countdown.
- `games[]` — opponent, date, `home`, `tv`, `result`, and `rivalry` (`apple-cup` / `oregon`).

The updater overwrites `kickoff`, `tv`, `result`, and `timeConfirmed` from ESPN; the rest is yours.

## Snark

Edit `web/js/snark.js`. Tiers scale by days remaining; `OPP` holds opponent-specific burns
(Oregon and the Apple Cup get special treatment). Lines rotate once per calendar day.

## Icons

Regenerate the purple-and-gold "W" icons (pure stdlib, no PIL):

```bash
python3 web/icons/generate_icons.py
```

Go Dawgs. 🐺
