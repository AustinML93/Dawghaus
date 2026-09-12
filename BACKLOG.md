# DawgHaus — Backlog / Ideas

_Repo-scoped backlog. Cross-cutting family and homelab initiatives live in `~/Developer/Projects/agent-backlog/projects/`; see `~/Developer/Projects/CLAUDE.md` for the split._

Product direction (agreed 2026-09-04): a **gameday toy for the Huskies group chat**. Prefer
features that live in the during-game or post-game moment. No logins, minimal state.

## Next up (ordered by leverage)
1. **"Who's actually coming?"** — extend the Where We Watching card with In / Maybe / Couch
   and a meetup time, so five people get a headcount instead of an anonymous tally.
   Reuses `/api/watch` (one record per voter id per game).
2. **Cope button** — loss-day emergency button: one tap, a cope line, maybe a sad trombone.
   Trivial once the lines exist.
3. **Crew quote bank** — seed the crew's actual lines into the trash-talk generator.
   *Blocked on Mike sending the lines.*
4. **Postgame mood tint** — the 72h gloat/cope window already changes the headline and
   share text; add a subtle win/loss body tint so the mood is visible at a glance
   (like the Oregon-week green and the gameday class).

## Held (decided, not building for now)
- **Score-prediction poll** — nickname + both scores, lock at confirmed kickoff, season
  leaderboard. Dropped 2026-09-04 as off-track; Codex re-pitched it 2026-09-12 and it's
  the strongest of the held ideas. Mike: hold for now.
- **Road-trip / away-game roll call** — one or two decisions a year; a group-chat
  one-liner, not a feature. Bowl-week "blood pact" roll call could ride on the watch card.
- **Soundboard card** — parked 2026-06-24 in favor of the floating siren button; revisit
  only if we add more sounds.

## Shipped (so nobody re-proposes it)
- 2026-09-12 (evening): live scores via the ESPN summary endpoint (schedule feed is null
  in-game); **liveness alert** to ntfy `omv-alerts` when the sync is stale >6h, plus recovery.
- 2026-09-12: Codex review fixes (API bypasses the SW cache, LIVE instead of "0", date-only
  TBD countdowns, honest rank fallback, Leading/Deadlock vote lines with save feedback);
  freshness stamp on the hero card; folded earlier results in the slate.
- 2026-09-04: in-season mode (live scoreboard, FINAL/W-L, TV, adaptive polling, Record
  card, weekly hype meter, gloat/cope, Oregon-week takeover, Duck Watch, AP ranks, bowl
  auto-append), shared siren counter (`api/server.py`, `/api/siren`), shareable score
  card (`web/js/sharecard.js`, canvas PNG → share sheet; this is the "shareable countdown
  image"), Where We Watching? vote card (`/api/watch`).
