# DawgHaus — Backlog / Ideas

Parking lot for things we've discussed but haven't built.

## In-season mode (proposed 2026-09-04, season just started)
Shipped 2026-09-04: live scoreboard, FINAL/W-L in the slate, TV, adaptive polling, stale-sync
warning, Record card (replaces the CFB countdown once the opener kicks), weekly hype meter,
post-game gloat/cope headline + share text (72h window), Oregon-week takeover (Duck Hunt meter,
all-duck trash talk, green tint), Duck Watch card (Oregon record/rank, "Oregon lost to X",
Duck Fact of the Day from `web/js/ducks.js`), AP ranks, bowl auto-append with 🩸 BLOOD PACT line,
bigger siren on gameday.
Shipped 2026-09-04 (pass 2): **shared siren tap counter** (`api/siren.py`, stdlib, proxied at
`/api/siren`, state in `data/siren.json`; badge on the FAB = today's pulls, season total on the
Record card) and **shareable score card** (`web/js/sharecard.js`, canvas PNG → native share sheet,
falls back to a long-press-to-save dialog). Slate now shows kickoff time on rivalry rows too.
Shipped 2026-09-04 (pass 3): **Where We Watching?** card — crew votes per game (`/api/watch`,
one vote per phone via a localStorage id, changeable, presets Little Woodrow's / Lavaca Street
Bar / Someone's house / Other…), tally + consensus line, leader spot lands on the countdown
share card. No manual data entry.
Still open: nothing big. Ideas: crew inside-joke trash talk (waiting on lines from Mike),
"Cope" button for when things go wrong, bowl-week blood-pact roll call (who's in).

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
