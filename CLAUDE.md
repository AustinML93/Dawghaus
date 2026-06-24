# DawgHaus 🐺 — project notes for Claude

A snarky, Husky-themed PWA: countdowns to the first college football game and the first
UW Husky game, the full 2026 schedule (live-updating), a hype meter, gameday weather, a
trash-talk generator, fight-song + touchdown-siren buttons, and a permanent "Forever
Pac-12 Champions" banner. Self-hosted on OMV, behind a Cloudflare tunnel.

Working name **DawgHaus**; public-name idea is *Purple Reign*.

## Voice / design intent
- **Full-degenerate snark**, relentless **Oregon shade** (the breakout feature — lean in).
- Husky purple (`#4B2E83`) + gold (`#B7A57A`). Light + dark themes.
- Forever Pac-12 Champions (2023, the last one ever) is a permanent bit.

## Stack & layout
No build step. Vanilla HTML/CSS/JS PWA + two stock-image Docker containers.
- `web/` — the PWA: `index.html`, `css/styles.css`, `js/{app,snark,trashtalk,fightsong,touchdown}.js`, `sw.js`, `manifest.webmanifest`, `icons/`, `audio/`.
- `data/schedule.json` — hand-seeded 2026 schedule; the updater merges live data onto it.
- `updater/update.py` — stdlib-only; pulls ESPN (team **264**) for kickoff/TV/scores and Open-Meteo for home-game weather. No API keys. Runs on a loop (`UPDATE_INTERVAL`, default 6h; drop to 1800 once the season's near).
- `docker-compose.yml` (web=nginx, updater=python), `nginx.conf`, `deploy.sh`, `BACKLOG.md`.

## Deploy
- GitHub: **https://github.com/AustinML93/Dawghaus** (public). `gh` is authed as AustinML93; commits authored as Mike Larsen. End commit messages with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- OMV: `deploy@192.168.1.200`, cloned at `/srv/dev-disk-by-uuid-5c291e74-2a76-4eb0-924b-7bf8f9eca72c/compose/dawghaus`.
- Ship: commit + push, then on the box `./deploy.sh` (stash → pull → pull images → **up -d --force-recreate**).
- **Port 1889** (UW's first-ever game). Cloudflare tunnel (dashboard-managed) routes `dawghaus.austinmlapps.com` → `http://localhost:1889`. Mike owns tunnel/DNS changes.

## ⚠️ Caching — read before debugging "my change isn't live"
These each cost real time once. In order of how often they bite:
1. **Cloudflare 4h edge cache** (proxied; default Browser Cache TTL = `max-age=14400` overrides origin headers). On any change to a shell asset, **bump the `?v=N` query** in BOTH `web/index.html` and the `sw.js` SHELL list (currently `?v=5`). `index.html` is `DYNAMIC` (not edge-cached) so new refs are seen immediately. nginx also sends `Cache-Control: no-cache` on js/css/mp3/html/sw/manifest so CF revalidates.
2. **Service worker:** bump `CACHE = "dawghaus-vN"` in `web/sw.js` on every shell change. Clients need a full PWA close/reopen (sometimes twice).
3. **`nginx.conf` is a single-file bind mount:** `git pull` swaps the inode, so a plain reload serves OLD config — `deploy.sh` uses `--force-recreate` to fix. Verify: `docker exec dawghaus-web grep -n 'location ~' /etc/nginx/conf.d/default.conf`.
4. **LAN DNS via AdGuard Home** (`192.168.1.200`): after CF DNS changes it can hold a stale/negative cache for the whole LAN. `docker restart adguardhome` clears it (brief blip). Cellular bypasses it.

## Other gotchas
- `/data` is served via nginx `alias /srv/dawghaus-data/` (mounted OUTSIDE the web root). Do **not** reintroduce a mount nested under the read-only `./web` mount, and never `rm -rf web/data` in tests then `git add -A`.
- Audio (`web/audio/{fight-song,touchdown}.mp3`) is git-ignored (user-supplied). Both buttons are toggles and fall back to a synthesized sound if the file is missing. Audio must start **synchronously inside the click** (iOS autoplay rule) — no `await` before `.play()`.
- Local screenshot testing: serve `web/` and temporarily put `schedule.json` under `web/data/` (the live site uses the alias). Headless Chrome `--screenshot` clips to the viewport; `position:fixed` FAB sits at the bottom edge.

## Backlog
See `BACKLOG.md` (soundboard, score-prediction poll, shareable countdown image, crew-specific trash talk, **road-trip game planner**: voting / travel advice / tickets / bucket-list stadiums).
