# DawgHaus — Backlog / Ideas

Parking lot for things we've discussed but haven't built.

## In-season mode (proposed 2026-09-04, season just started)
Shipped 2026-09-04: live scoreboard, FINAL/W-L in the slate, TV, adaptive polling, stale-sync
warning, Record card (replaces the CFB countdown once the opener kicks), weekly hype meter,
post-game gloat/cope headline + share text (72h window), Oregon-week takeover (Duck Hunt meter,
all-duck trash talk, green tint), Duck Watch card (Oregon record/rank, "Oregon lost to X",
Duck Fact of the Day from `web/js/ducks.js`), AP ranks, bowl auto-append with 🩸 BLOOD PACT line,
bigger siren on gameday.
Still open:
- **Shared siren tap counter** — needs a tiny backend (Worker or endpoint on the box). Parked
  until Mike says go.
- **Gameday "where are we watching"** line — needs a data source (manual field in schedule.json?).
- **Shareable score card image** — canvas-render the Record card + gloat line for the group chat.

- **Soundboard card** — a dedicated section holding Fight Song + Touchdown (and any
  future sounds) to declutter the top bar. *Parked 2026-06-24 in favor of a floating
  siren button; revisit if we add more sounds.*
- **Score-prediction poll** — let the crew guess the score before each game.
- **Shareable countdown image** — generate an image for the group chat / socials.
- **Crew-specific trash talk** — seed inside-joke lines into the trash-talk generator.
- **GitHub issue templates** — so buddies can file bugs/requests cleanly.
- **Road-trip game planner** — help the crew pick the one away game to travel to each
  year (we try to do at least one). Built on the away games already in the schedule. Ideas:
  - **Voting** — crew votes on which away game(s) to attend; show a tally.
  - **Travel advice** — rough flight/drive distance to each away stadium, best/worst weather
    months, "how far is the airport," etc.
  - **Ticket search** — deep links to tickets for each away game.
  - **Bucket-list stadiums** — flag marquee venues (the Big Ten cathedrals — Penn State night
    game, etc.), track which ones we've already crossed off.
