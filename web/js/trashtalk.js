/* DawgHaus trash talk generator — combinatorial smack, Oregon-weighted.
 * generate() => a fresh zinger. ofTheDay() => a stable pick for today. */

const TRASH = (() => {
  // Fully-formed bangers (carry the heaviest hits here).
  const ZINGERS = [
    "Oregon's natty drought is older than their uniforms are new.",
    "Eugene smells like patchouli and moral victories.",
    "The Ducks have more jersey combos than conference titles. Math is undefeated.",
    "We didn't leave the Pac-12. We dissolved it on our way out. You're welcome.",
    "Forever Pac-12 champs. That trophy doesn't expire. Their relevance did.",
    "Phil Knight can buy a lot of things. A win that matters in January isn't one of them.",
    "Imagine being a tree-named team and still getting chopped down by the Dawgs.",
    "WSU brought a cup to a knife fight. We kept the apple AND the bragging rights.",
    "The Ducks fly together — straight into the transfer portal every offseason.",
    "Autzen's loud until the Dawgs make it a library.",
    "Oregon: undefeated in fashion shows, winless when it counts.",
    "We've got a fight song you literally cannot sing. Stay mad you can't even hum yours.",
  ];

  // Combinatorial templates: {target} gets a rival, slots fill from pools.
  const RIVALS = ["the Ducks", "Oregon", "the Cougs", "anyone in green and yellow", "Eugene"];
  const SETUP = [
    "Let's be honest:",
    "Hot take, ice cold facts:",
    "Say it with me:",
    "Breaking news from the DawgHaus:",
    "Reminder for the group chat:",
    "Purple truth bomb:",
  ];
  const BURN = [
    "{target} peaked in the uniform reveal.",
    "{target} will be must-see TV right up until kickoff.",
    "{target} has a great chance this year — to disappoint everyone again.",
    "{target} couldn't spell 'championship' without autocorrect.",
    "{target} treats December like a participation trophy ceremony.",
    "{target} plays their biggest game of the year against us and it shows.",
    "{target} is the appetizer; the Dawgs are the whole damn meal.",
    "{target} brought hype. We brought receipts.",
  ];
  const KICKER = [
    "Bow down. 🐺",
    "Dubs up. 💜",
    "Stay pressed. 😈",
    "Woof. 🐾",
    "Cope and seethe. 🔥",
    "GO DAWGS.",
  ];

  function rand(a) { return a[Math.floor(Math.random() * a.length)]; }
  function fill(s) { return s.replace("{target}", rand(RIVALS)); }

  function generate() {
    // ~40% a curated banger, ~60% a freshly assembled one.
    if (Math.random() < 0.4) return rand(ZINGERS);
    return `${rand(SETUP)} ${fill(rand(BURN))} ${rand(KICKER)}`;
  }

  function ofTheDay() {
    const seed = Math.floor(Date.now() / 86400000);
    return ZINGERS[seed % ZINGERS.length];
  }

  return { generate, ofTheDay };
})();
