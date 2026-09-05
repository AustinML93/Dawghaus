/* DawgHaus duck module — a dedicated Oregon-shade appliance. 🦆🖕
 * Everything in here is either a real, checkable fact about Oregon football
 * (twisted for sport) or a joke about programs, fans, money, and fabric.
 * House rules: PG-13, no slurs, no injury/tragedy bits, no naming individual
 * current players or coaches. Programs, cities, uniforms, and history only.
 * Forever Pac-12 Champions. 2023. The last one ever. It does not expire. */

const DUCKS = (() => {
  // ---------------------------------------------------------------------
  // helpers
  // ---------------------------------------------------------------------
  function daySeed() { return Math.floor(Date.now() / 86400000); }

  // Day-seeded when you pass nothing weird; used everywhere the line should
  // hold still for 24 hours. rand() is for the stuff that should reroll.
  function pick(arr, offset = 0) {
    if (!arr || !arr.length) return "";
    return arr[(daySeed() + offset) % arr.length];
  }
  function rand(arr) {
    if (!arr || !arr.length) return "";
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // "W 31-24" -> "31-24"; anything unparseable comes back as-is.
  function scoreOf(result) {
    if (!result) return "";
    const m = String(result).match(/(\d+\s*[-–]\s*\d+)/);
    return m ? m[1].replace(/\s+/g, "") : String(result);
  }
  function fill(line, opp, score) {
    return String(line)
      .replace(/\{opp\}/g, opp || "them")
      .replace(/\{score\}/g, score || "");
  }

  // ---------------------------------------------------------------------
  // Duck Fact of the Day — 40+, all rooted in real history. Rotates daily.
  // ---------------------------------------------------------------------
  const FACTS = [
    { tag: "history",  text: "Oregon has never won a national championship in football. Not one. In the entire history of the sport." },
    { tag: "history",  text: "Oregon football predates the airplane and still has the same number of natties as your fantasy team." },
    { tag: "2010",     text: "2010: 12-0, No. 1 in the country, lost the BCS title game to Auburn. So close you could taste the cope." },
    { tag: "2014",     text: "2014: Oregon made the very first College Football Playoff final and got handled by Ohio State. Historic, technically." },
    { tag: "2024",     text: "2024: 13-0, Big Ten champs, then Ohio State turned the Rose Bowl into a wellness check. One and done." },
    { tag: "2024",     text: "Oregon beat Ohio State in October 2024 and spent January being reminded that January is the only month that counts." },
    { tag: "1994",     text: "The 1994 season ended with Oregon in the Rose Bowl getting beaten by Penn State. Ask a Duck how that game went. Watch the eyes." },
    { tag: "2023",     text: "In 2023 Washington beat Oregon twice — once in Seattle, once for the Pac-12 title. Best-of-three and we didn't need the third." },
    { tag: "2023",     text: "Oregon's 2023 season had exactly two losses. Both were to Washington. Both were by three. Both were forever." },
    { tag: "2023",     text: "Washington is the final Pac-12 champion in history. Oregon spent a century in that league and never got the last word." },
    { tag: "2023",     text: "The last Pac-12 Championship ever played ended with purple confetti. That's not a take, that's the historical record." },
    { tag: "money",    text: "Phil Knight has poured a Nike-sized fortune into Eugene. The trophy case is still doing its impression of a display shelf." },
    { tag: "money",    text: "Oregon has a football facility with a barbershop and a Brazilian hardwood weight room. Zero national titles. Great floors, though." },
    { tag: "money",    text: "Nike built Oregon a football palace. Nobody has figured out how to buy a January." },
    { tag: "money",    text: "Oregon's library, arena, and science campus all carry the same donor's name. So does the vibe. So does the debt of gratitude." },
    { tag: "money",    text: "You can name a building after yourself. You cannot name yourself national champion. Eugene is testing this daily." },
    { tag: "fashion",  text: "Oregon has worn hundreds of uniform combinations and won the same number of national titles as a team with one." },
    { tag: "fashion",  text: "The Ducks change uniforms weekly because it's easier than changing the result in the big game." },
    { tag: "fashion",  text: "Oregon's chrome helmets reflect a lot of things. None of them are a championship trophy." },
    { tag: "fashion",  text: "Duck Wing helmets, liquid metal, feathered shoulders — a program that's basically a lookbook with a fight song." },
    { tag: "fashion",  text: "Somewhere in Eugene there's a room of unworn uniform combos, and it's still less empty than the natty case." },
    { tag: "mascot",   text: "The Oregon Duck is legally Donald Duck. They license him from Disney. Their identity is a rental agreement." },
    { tag: "mascot",   text: "Oregon's mascot required permission from a cartoon studio. Ours is a real animal that could eat him." },
    { tag: "mascot",   text: "Imagine a rivalry where one side's mascot has a Disney contract and the other has actual teeth." },
    { tag: "stadium",  text: "Husky Stadium opened in 1920. Autzen opened in 1967. We were selling out games before their stadium was a blueprint." },
    { tag: "stadium",  text: "Autzen holds fewer people than Husky Stadium and they will tell you about the decibels anyway." },
    { tag: "stadium",  text: "Autzen is loud the way a smoke alarm is loud: briefly impressive, then somebody's on a chair fixing it." },
    { tag: "stadium",  text: "Husky Stadium sits on a lake. You can arrive by boat. Autzen's flex is a parking lot and a grass berm." },
    { tag: "eugene",   text: "Eugene is Track Town USA, which is a lovely way of saying the football team is the second-best team in town." },
    { tag: "eugene",   text: "Oregon's most reliably world-class program involves running in a circle, which is also their bowl-season strategy." },
    { tag: "eugene",   text: "Animal House was filmed on the Oregon campus in the '70s. It remains their most accurate recruiting video." },
    { tag: "eugene",   text: "Eugene: two hours from anything, one hour from the nearest airport that matters, zero minutes from a moral victory." },
    { tag: "eugene",   text: "It rains in Eugene and it rains in Seattle. Only one of those cities has something to show for staying inside and working." },
    { tag: "series",   text: "Oregon went from the Nixon era to the Clinton era without beating Washington. Entire presidencies. Entire hairstyles." },
    { tag: "series",   text: "Ask a Duck about 1994 and they'll tell you about one interception. That's the whole highlight reel. One play, thirty years." },
    { tag: "series",   text: "Oregon fans built a personality around a single defensive play from 1994. We built one around trophies." },
    { tag: "series",   text: "Washington has more Rose Bowl wins than Oregon has national titles, which is a sentence that will always be true." },
    { tag: "series",   text: "Washington won a national championship in 1991. Oregon's response has been thirty-plus years of nice pants." },
    { tag: "b1g",      text: "Oregon paid a Big Ten entry fee for the privilege of flying to New Jersey in November. Enjoy the road trips, ducks." },
    { tag: "b1g",      text: "Both of us left the Pac-12. Only one of us left holding the last trophy it ever handed out." },
    { tag: "b1g",      text: "Oregon joined the Big Ten and immediately learned that Ohio State is a weather system, not an opponent." },
    { tag: "b1g",      text: "The Pac-12 is gone. Its final champion is Washington. That's carved in now, and Eugene has to read it forever." },
    { tag: "history",  text: "Oregon has exactly one Heisman winner and zero national titles, which is a very Oregon ratio." },
    { tag: "history",  text: "Oregon's greatest teams are all remembered for the game they lost at the end. That's not shade, that's a pattern." },
    { tag: "history",  text: "'Win the Day' is a great slogan. The Ducks have historically been undefeated at days and winless at seasons." },
    { tag: "history",  text: "Oregon has been to the mountaintop three times and taken a picture from the parking lot every time." },
    { tag: "vibes",    text: "Duck fans discovered football roughly when the swoosh money landed. We have programs older than their fanbase." },
    { tag: "vibes",    text: "'The Ducks fly together' is beautiful. Migration is also a thing ducks do, and the portal is due south." },
    { tag: "vibes",    text: "Every year Oregon is a trendy playoff pick. Every year the picks are the only thing trending." },
  ];

  function fact() {
    return pick(FACTS, 0);
  }

  // ---------------------------------------------------------------------
  // gloat(game) — we won. Random, because winning should feel fresh.
  // ---------------------------------------------------------------------
  const GLOAT_GENERIC = [
    "{opp} {score}. Another body for the pile. Bow down. 🐺",
    "Final: {score} over {opp}. We came, we saw, we ruined a Saturday.",
    "{score}. {opp} showed up with a game plan and left with a lesson.",
    "Dubs up. {opp} handled, {score}. Somewhere in Eugene, a duck feels this and doesn't know why.",
    "{opp} down {score}. The scoreboard is a primary source. Cite it.",
    "{score} over {opp}. Purple reign, unmerciful and on schedule.",
    "We beat {opp} {score} and the Pac-12 trophy is still ours forever. Two facts, one day.",
    "{opp}: outclassed, {score}. Put it on the wall next to the last one.",
    "{score}. {opp} will call it a learning experience. We call it Saturday.",
    "Woof. {opp} {score}. Nothing personal — okay, some of it was personal.",
    "{score} over {opp}. The Dawgs are eating and the plate is not clean yet.",
    "{opp} got the full DawgHaus experience: {score} and a long bus ride.",
    "{score}. Tell {opp} we said thanks for coming. We won't mean it.",
  ];

  const GLOAT_OREGON = [
    "WE BEAT OREGON {score}. Put it in the museum. Put it on a shirt. Put it on my headstone.",
    "{score} over the Ducks. Hundreds of uniform combos and not one of them is a win today. 🦆🖕",
    "Oregon {score}. Nike money bought everything in Eugene except the last hour of this football game.",
    "{score}. The Ducks flew together, directly into a wall. Beautiful formation, terrible outcome.",
    "We beat Oregon {score} and we are STILL the last Pac-12 champions. Compounding interest on your misery.",
    "{score} over Oregon. Somebody check on Autzen. Actually don't. Let it sit in that.",
    "Ducks handled, {score}. Their natty count is unchanged, which is to say it remains zero.",
    "{score}. Oregon spent a week telling us how good they are. We spent three hours disagreeing.",
    "OREGON. {score}. The chrome helmets reflected everything except the rush.",
    "{score} over the Ducks. Cancel the uniform reveal, nobody's looking at the fit anymore.",
    "We beat Oregon {score}. Frame the ticket. Laminate the receipt. Tell your kids.",
    "{score}. Disney licenses their mascot and we just repossessed their season. 🐺",
    "Oregon down {score}. Eugene, feel free to bring up 1994 again. We'll bring up today. Forever.",
    "{score} over Oregon and the last Pac-12 trophy still lives in Seattle. Double-dipped in your tears.",
  ];

  const GLOAT_APPLE_CUP = [
    "APPLE CUP RETAINED. {score}. The cup stays, the Cougs go, the sun rises in the east.",
    "{score}. Keep the apple, take the souls. Same as it ever was. 🍎",
    "Apple Cup: {score}. Pullman is eight hours from anywhere and today it feels like twelve.",
    "{score} over the Cougs. Great tailgate, terrible ending, see you next year.",
    "The Apple Cup lives in the DawgHaus. {score}. Don't touch the glass.",
    "{score}. Cougs brought the passion. We brought the points. Both matter, one more.",
  ];

  function gloat(game) {
    game = game || {};
    const opp = game.opponent || "them";
    const score = scoreOf(game.result);
    let pool = GLOAT_GENERIC;
    if (game.rivalry === "oregon") pool = GLOAT_OREGON;
    else if (game.rivalry === "apple-cup") pool = GLOAT_APPLE_CUP;
    return fill(rand(pool), opp, score);
  }

  // ---------------------------------------------------------------------
  // cope(game) — we lost. Gallows humor. Never punch down at our own guys.
  // ---------------------------------------------------------------------
  const COPE_GENERIC = [
    "{score} to {opp}. Football is a cruel sport invented to punish the people who love it most.",
    "Lost to {opp}, {score}. The Pac-12 trophy in Seattle does not care. It cannot be repossessed.",
    "{score}. We'll be back next week, unwell but present. That's the whole contract.",
    "{opp} got us {score}. Somewhere Oregon also played a football game, and that's its own punishment.",
    "{score} to {opp}. Delete the app for six days. Redownload it on Friday. You know the drill.",
    "Rough one, {score}. On the bright side, we have won a national championship, which Oregon has not.",
    "{opp} {score}. Purple is a color you wear in defeat too. Stay dressed.",
    "{score}. The Dawgs lost a game. Oregon has lost every national title game they've ever played. Perspective.",
    "Lost {score} to {opp}. I'm going to go stare at the 2023 Pac-12 Championship highlights for a while.",
    "{score}. Bad day at the office. The office is still older and prettier than Autzen.",
    "{opp} beat us {score}. Cool. Ask them how many final Pac-12 titles they have. Zero. Only one exists.",
    "{score}. We take the L like adults and then immediately go be unreasonable about Oregon.",
    "Dropped one to {opp}, {score}. The sun rose, the lake's still there, the Dawgs still play next week.",
  ];

  const COPE_OREGON = [
    "{score} to Oregon. Fine. FINE. We are still the last Pac-12 champions and that is permanent. 2023 is a fossil record.",
    "Oregon {score}. Enjoy it. You've got a whole year and still zero national championships to fill it with.",
    "{score}. They won a football game. We won the last conference title in Pac-12 history. Different weight classes.",
    "Lost to the Ducks {score}. Congratulations to Oregon on tying their all-time national championship total: still zero.",
    "{score} to Oregon. Somewhere a man in chrome is celebrating a regular-season win like it's January. Let him have it.",
    "Ducks got us {score}. Put it next to 2023, where we beat them twice, including for the trophy. The math still favors the vault.",
    "{score}. Painful. Survivable. Ask again in January when their season ends the way it always ends.",
    "Oregon wins {score} and Disney still owns their mascot. Small mercies, tiny consolations, I'll take them.",
    "{score} to Oregon. Losing to them stings. Being them for a hundred years sounds worse.",
    "Ducks {score}. We'll remember this. We remember everything. That's the entire personality of this rivalry.",
    "{score}. They can have the day. We've got the last word the Pac-12 ever said, and it was 'Washington.'",
    "Lost {score}. Go outside, breathe, come back. The uniforms will still be nicer than the trophy case tomorrow.",
  ];

  const COPE_APPLE_CUP = [
    "{score} in the Apple Cup. The cup goes east. Temporarily. Aggressively temporarily.",
    "Cougs got us {score}. Enjoy the year, Pullman. It's a long one out there.",
    "{score}. Losing the Apple Cup is a wound. Losing to Oregon is a condition. Grateful for the diagnosis.",
    "{score} to WSU. We'll be back for the cup. It knows the way home.",
  ];

  function cope(game) {
    game = game || {};
    const opp = game.opponent || "them";
    const score = scoreOf(game.result);
    let pool = COPE_GENERIC;
    if (game.rivalry === "oregon") pool = COPE_OREGON;
    else if (game.rivalry === "apple-cup") pool = COPE_APPLE_CUP;
    return fill(rand(pool), opp, score);
  }

  // ---------------------------------------------------------------------
  // oregonWeek(days) — the seven-day descent into madness. Day-seeded.
  // ---------------------------------------------------------------------
  const OREGON_WEEK = {
    7: [
      "One week until Oregon. Begin the taper: less sleep, more spite.",
      "{n} days to the Ducks. Start hydrating now so you can waste it later.",
      "{n} days out. Somewhere in Eugene they're picking out a uniform. We're picking out a grudge.",
    ],
    6: [
      "{n} days. Time to rewatch 2023. Both of them. Back to back. Snacks optional.",
      "{n} days to Oregon. Set your away message: 'unavailable, historically motivated.'",
    ],
    5: [
      "{n} days. The chrome helmets are coming. So is the reckoning.",
      "{n} days out. Start dropping unprompted Pac-12 championship references into work meetings.",
    ],
    4: [
      "{n} days. Your Duck-fan coworker is being weirdly quiet. Note it. Use it later.",
      "{n} days to Oregon. Charge everything. Wash the purple. Sharpen the takes.",
    ],
    3: [
      "{n} days. This is the part of the week where you stop being fun at parties.",
      "{n} days out. Every conversation is about Oregon now. Your family has accepted it. Barely.",
    ],
    2: [
      "{n} days. Two sleeps, zero sleep. Classic.",
      "{n} days to the Ducks. Lay out the jersey. Yes, that one. The one with the history.",
    ],
    1: [
      "TOMORROW. Oregon. Set three alarms, then don't need any of them.",
      "One day. Tonight you will lie awake mentally rehearsing a first-quarter goal-line stand. Normal.",
      "{n} day out. Pre-write the group chat message. Both versions. Delete one tomorrow night.",
    ],
    0: [
      "IT'S OREGON DAY. I have not blinked since Tuesday. BOW DOWN AND BEAT THE DUCKS. 🐺🔥",
      "TODAY. TODAY. TODAY. Put on the purple. Yell at a television. Alarm the neighbors. GO DAWGS.",
      "OREGON. TODAY. Every uniform combination in that closet and not one of them can stop what's coming.",
      "GAMEDAY VS THE DUCKS. Nike money doesn't play defense. Disney doesn't play linebacker. LET'S GO.",
      "It's Oregon day and I have already lost the ability to speak in full sentences. DUBS UP. DUCKS DOWN. 🖕🦆",
    ],
  };

  function oregonWeek(days) {
    const d = Math.max(0, Math.min(7, Number(days) || 0));
    const pool = OREGON_WEEK[d] || OREGON_WEEK[7];
    return pick(pool, d).replace(/\{n\}/g, d);
  }

  // ---------------------------------------------------------------------
  // duckLoss(loss) / duckUndefeated() — schadenfreude module.
  // ---------------------------------------------------------------------
  const DUCK_LOSS = [
    "Oregon lost to {opp}. Somewhere a very expensive weight room sits quietly in the dark. 🦆",
    "{opp} beat Oregon. The uniforms were immaculate. The scoreboard was not.",
    "Ducks fall to {opp}. Every year the trendy pick, every year the same November.",
    "Oregon lost to {opp} and their national championship total is somehow still exactly zero.",
    "{opp} handled the Ducks. Nike can dress a program; it cannot coach a fourth quarter.",
    "Oregon lost. To {opp}. I'd like to thank {opp}, the state of Oregon, and whoever scheduled this.",
    "{opp} did what we've been doing since 2023. Welcome to the club, there's a jacket.",
    "Ducks down to {opp}. Autzen went from loudest place on earth to a very expensive quiet room.",
    "Oregon lost to {opp} and I have never felt more strongly about {opp} in my entire life.",
    "{opp} over Oregon. Add it to the list of things Phil Knight's money did not prevent.",
    "The Ducks fly together and today they flew directly into {opp}. Formation held. Result didn't.",
    "Oregon lost to {opp}. Save the box score. Print it. Put it on the fridge.",
    "{opp} beat Oregon. Nothing heals like other people's losses. Nothing.",
  ];

  const DUCK_UNDEFEATED = [
    "Oregon hasn't lost yet. It's early. It is so, so early.",
    "Ducks still undefeated. Have you SEEN that schedule? A stiff breeze and three bye weeks.",
    "No losses in Eugene yet. Neither was there in 2010. Or 2014. Or 2024. Ask how those ended.",
    "Oregon's undefeated and I'm supposed to be impressed by a September win over a team that flew commercial.",
    "Still no L for the Ducks. Relax. The calendar is undefeated against Oregon and always has been.",
    "Oregon: unbeaten, unbothered, untested. Two of those change in November.",
    "No Duck losses yet. Their whole thing is being perfect until the exact moment it matters. Be patient.",
    "Oregon is 'rolling.' They've beaten nobody. Check the strength of schedule and then check it again.",
    "Undefeated Ducks. Somewhere a playoff bracket is already sharpening the knife. It always does.",
    "Oregon hasn't lost. Oregon also hasn't won a national title in the history of organized football. Both true.",
  ];

  function duckLoss(loss) {
    loss = loss || {};
    const opp = loss.opponent || "somebody";
    return fill(rand(DUCK_LOSS), opp, scoreOf(loss.score));
  }
  function duckUndefeated() {
    return rand(DUCK_UNDEFEATED);
  }

  // ---------------------------------------------------------------------
  // trash() — 30+ short, screenshot-able Oregon-specific shots.
  // ---------------------------------------------------------------------
  const TRASH = [
    "Oregon has more uniform combinations than national championships, and one of those numbers is zero.",
    "Three trips to the title game, three participation photos.",
    "The Ducks have never won a national championship. Say it slowly. Let it land.",
    "Eugene's biggest athletic export is people running in circles, which explains the football program.",
    "Oregon's mascot is a licensed Disney character. Their identity has a renewal date.",
    "Husky Stadium was hosting football before Autzen was a drainage problem.",
    "Nike built the nicest football building in America and filled it with almosts.",
    "Oregon fans talk about 1994 the way other programs talk about titles. Because it's all they've got.",
    "We beat Oregon twice in 2023 and then the entire conference stopped existing. Coincidence? Ask them.",
    "Washington is the last Pac-12 champion in history. Oregon had a hundred years and missed the last call.",
    "The Ducks won the Big Ten and lost the only game anyone remembers. Tradition preserved.",
    "Beat Ohio State in October, get erased by Ohio State in January. Peak Oregon.",
    "You can rent a Disney duck. You cannot rent a trophy.",
    "Chrome helmets, zero rings. Reflective, not collective.",
    "Oregon's greatest seasons are all remembered by the final score of the last game.",
    "The Ducks fly together, mostly toward the portal.",
    "Autzen is the loudest stadium in America for exactly as long as they're winning.",
    "Oregon spent decades not beating Washington and built a whole personality around ending it once.",
    "A century of football, a mountain of money, and a trophy case you could use as a mirror.",
    "Oregon's fight song is fine. Our fight song is a threat.",
    "Eugene is two hours from an airport and zero hours from a moral victory.",
    "Ducks fans found football the same year the swoosh money did.",
    "Oregon in the playoff is a rental car: looks great, returned early.",
    "'Win the Day' is a hell of a slogan for a program that keeps losing the season.",
    "They have a barbershop in the football facility and still nothing worth getting a haircut for.",
    "Oregon has one Heisman and zero titles, which is the most Oregon sentence ever written.",
    "The 2023 Pac-12 Championship trophy lives in Seattle permanently. Sleep on that, Eugene.",
    "Every year Oregon is a sexy playoff pick. Every year the pick is the sexiest part.",
    "Oregon changed conferences, coasts, and uniforms. Never changed the ending.",
    "Duck fans measure success in preseason rankings because December keeps declining the interview.",
    "They played in the first-ever CFP final and the first-ever CFP final played them.",
    "Oregon's about to tell you the schedule was hard. The schedule is always hard, in Eugene, in January.",
    "Half a billion dollars of facilities and the biggest thing they've ever built is expectation.",
    "The Ducks have never trailed in a fashion show.",
    "Purple is heavier than green. It's carrying more.",
    "Oregon: the only program that treats a Rose Bowl loss like a founding document.",
  ];

  function trash() { return rand(TRASH); }

  return {
    fact,
    gloat,
    cope,
    oregonWeek,
    duckLoss,
    duckUndefeated,
    trash,
    // exposed for the trash-talk generator to fold into its own pools
    lines: TRASH,
    facts: FACTS,
  };
})();
