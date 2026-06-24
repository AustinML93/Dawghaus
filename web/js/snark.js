/* DawgHaus snark engine — full degenerate mode.
 * Lines rotate daily (deterministic per calendar day) so it feels alive
 * without being random garbage every refresh. Keep it spicy, keep it Husky. */

const SNARK = (() => {
  // Deterministic daily picker: same line all day, new line tomorrow.
  function daySeed() { return Math.floor(Date.now() / 86400000); }
  function pick(arr, offset = 0) {
    if (!arr || !arr.length) return "";
    return arr[(daySeed() + offset) % arr.length];
  }

  // Tiers keyed by days remaining to the next Husky game.
  const TIERS = [
    { max: 0, lines: [
      "IT'S GAME DAY. Put the phone down, grab a beer, and BOW DOWN.",
      "Today. TODAY. Stop refreshing this stupid app and go scream at a TV.",
      "Kickoff is today. Hydrate, then immediately undo all of it.",
    ]},
    { max: 1, lines: [
      "ONE day. Set three alarms. Call in 'sick' preemptively.",
      "Tomorrow we ride. Lay out the purple. Charge the megaphone.",
      "1 day out. Your liver has filed a formal complaint. Ignore it.",
    ]},
    { max: 3, lines: [
      "Game week, baby. The only week that matters.",
      "{n} days. Close enough to taste it. It tastes like victory and stale nachos.",
      "{n} days out. Start ignoring your responsibilities now to get ahead.",
    ]},
    { max: 7, lines: [
      "{n} days. We're in single digits. Behave accordingly (don't).",
      "Under a week. Time to pretend you understand the new offense.",
      "{n} days. Practice your 'we're so back' speech for the group chat.",
    ]},
    { max: 14, lines: [
      "{n} days. Two weeks. Buy the jersey you definitely don't need.",
      "{n} sleeps till Dawg football. Not that you'll be sleeping.",
      "{n} days. Oregon fans are counting down to their next moral victory.",
    ]},
    { max: 30, lines: [
      "{n} days. Less than a month. The drought is ending.",
      "{n} days. Start your fantasy of beating Oregon early and often.",
      "{n} days out. Touch grass now — there's no time once the season hits.",
    ]},
    { max: 60, lines: [
      "{n} days. Close enough to start lying about your expectations.",
      "{n} days. Summer is just the loading screen for football.",
      "{n} days. Somewhere, a Duck is already making excuses.",
    ]},
    { max: 120, lines: [
      "{n} days. Yeah it's a while. Suffer with me.",
      "{n} days. The offseason is a cruel, godless void.",
      "{n} days. Go outside? In THIS economy of anticipation?",
    ]},
    { max: 99999, lines: [
      "{n} days. We're deep in the desert. Drink water, dream purple.",
      "{n} days. That's a lot. We do not negotiate with the calendar.",
      "{n} days until football. Until then we simply ache.",
    ]},
  ];

  // Generic rotating one-liners shown alongside the count sometimes.
  const FLAVOR = [
    "Forever Pac-12 champs. Cope, Eugene.",
    "Purple reign or get rained on.",
    "Dubs up. Heads down. Ducks out.",
    "Built in the DawgHaus, fueled by spite.",
  ];

  // Days-since-we-beat-Oregon snark, scales with how long the suffering is.
  function oregonLine(days) {
    if (days < 0) return "We literally just beat them. Frame this moment.";
    if (days < 30) return "Still basking. The tears in Eugene haven't dried.";
    if (days < 200) return "It's been a minute. Nov 28 in Eugene fixes everything.";
    if (days < 400) return "Over a year. The disrespect is being noted. Revenge is dated: Nov 28.";
    if (days < 800) return "This has gone on long enough. Autzen, Nov 28. Bring a coat and a vendetta.";
    return "An unacceptable amount of time. We riot Nov 28.";
  }

  // Opponent-specific burns for schedule cards.
  const OPP = {
    "washington state": "Apple Cup. Keep the Apple. Take the souls.",
    "utah state": "A gentle tune-up. Be polite. Then don't.",
    "eastern washington": "In-state cupcake. Eat responsibly.",
    "minnesota": "Welcome back to the rivalry, Goldy. It's been since 1977. Still got it.",
    "usc": "Road trip to L.A. Beat the traffic AND the Trojans.",
    "iowa": "Iowa football: 13-10 the sport. Outscore the punter.",
    "purdue": "Boilermakers. Bring the train whistle home as a trophy.",
    "nebraska": "Huskers vs Huskies. Only one of us has a pulse lately.",
    "penn state": "White Out? We brought our own purple. Spoil the party.",
    "michigan state": "Sparty on the road. Send them back to East Lansing sad.",
    "indiana": "Indiana got good. Cute. Remind them where they ranked historically.",
    "oregon": "OREGON. The finale. In Eugene. Ruin their season for sport. 🖕🦆",
  };

  function opponentBurn(name) {
    if (!name) return "";
    const key = name.toLowerCase();
    for (const k in OPP) if (key.includes(k)) return OPP[k];
    return "Another body for the pile.";
  }

  function headline(days) {
    if (days == null || isNaN(days)) return pick(FLAVOR);
    const tier = TIERS.find(t => days <= t.max) || TIERS[TIERS.length - 1];
    return pick(tier.lines).replace("{n}", days);
  }

  return { headline, oregonLine, opponentBurn, flavor: () => pick(FLAVOR, 1) };
})();
