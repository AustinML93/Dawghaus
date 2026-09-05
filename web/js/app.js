/* DawgHaus — countdown brain. Vanilla JS, no build step. */

const $ = (id) => document.getElementById(id);
const MS_DAY = 86400000;

let DATA = null;

async function loadData() {
  try {
    const res = await fetch("/data/schedule.json", { cache: "no-store" });
    if (!res.ok) throw new Error("bad status " + res.status);
    DATA = await res.json();
  } catch (e) {
    console.error("Failed to load schedule.json", e);
    $("scheduleList").innerHTML = '<p class="muted">Couldn\'t load the schedule. The updater may still be warming up. Refresh in a bit.</p>';
    return;
  }
  await Promise.all([loadWeather(), loadDucks()]);
  render();
  tick();
  setInterval(tick, 1000);
  setInterval(renderHype, 60000);
  scheduleRefresh();
}

// In-season: re-pull schedule.json so scores/status update without a reload.
// Every 60s while a game is live or within an hour of kickoff, else every 10 min.
let refreshTimer = null;
function scheduleRefresh() {
  const hg = nextHuskyGame();
  const soon = hg && (isLive(hg) || (parse(hg.kickoff) - now()) < 3600000);
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(refreshData, soon ? 60000 : 600000);
}
async function refreshData() {
  try {
    const res = await fetch("/data/schedule.json", { cache: "no-store" });
    if (res.ok) {
      const fresh = await res.json();
      if (JSON.stringify(fresh) !== JSON.stringify(DATA)) {
        DATA = fresh;
        await Promise.all([loadWeather(), loadDucks()]);
        render();
        tick();
      }
    }
  } catch (_) { /* try again next round */ }
  scheduleRefresh();
}
document.addEventListener("visibilitychange", () => { if (!document.hidden && DATA) refreshData(); });

let DUCKDATA = null;
async function loadDucks() {
  try {
    const res = await fetch("/data/oregon.json", { cache: "no-store" });
    if (res.ok) DUCKDATA = await res.json();
  } catch (_) { /* optional */ }
}

let WEATHER = {};
async function loadWeather() {
  try {
    const res = await fetch("/data/weather.json", { cache: "no-store" });
    if (res.ok) WEATHER = await res.json();
  } catch (_) { /* weather is optional garnish */ }
}

// --- time helpers ---
function parse(d) { return d ? new Date(d) : null; }
// Parse a bare "YYYY-MM-DD" as LOCAL midnight (not UTC) to avoid off-by-one dates.
function parseLocalDate(d) {
  if (!d) return null;
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
}
function now() { return new Date(); }
function daysUntil(date) {
  if (!date) return null;
  // Whole-day countdown based on calendar days, not raw 24h chunks.
  const a = new Date(); a.setHours(0,0,0,0);
  const b = new Date(date); b.setHours(0,0,0,0);
  return Math.round((b - a) / MS_DAY);
}
function clockUntil(date) {
  if (!date) return "--:--:--";
  let ms = date - now();
  if (ms < 0) ms = 0;
  const s = Math.floor(ms/1000);
  const dd = Math.floor(s/86400);
  const hh = String(Math.floor((s%86400)/3600)).padStart(2,"0");
  const mm = String(Math.floor((s%3600)/60)).padStart(2,"0");
  const ss = String(s%60).padStart(2,"0");
  return (dd>0 ? dd+"d " : "") + `${hh}:${mm}:${ss}`;
}

// Game state. Prefer ESPN's status (pre/in/post) from the updater; fall back to
// a kickoff + 4h window if the status is missing (e.g. updater offline).
function gameOver(g) {
  if (!g || g.bye) return false;
  if (g.status) return g.status === "post";
  const k = parse(g.kickoff);
  return !!k && k.getTime() + 4*3600*1000 < now().getTime();
}
function isLive(g) {
  if (!g || g.bye) return false;
  if (g.status) return g.status === "in";
  const k = parse(g.kickoff); if (!k) return false;
  const t = now().getTime();
  return t >= k.getTime() && t <= k.getTime() + 4*3600*1000;
}
function nextHuskyGame() {
  if (!DATA || !DATA.games) return null;
  const upcoming = DATA.games
    .filter(g => !g.bye && parse(g.kickoff) && !gameOver(g))
    .sort((a,b) => parse(a.kickoff) - parse(b.kickoff));
  return upcoming[0] || null;
}
function liveScore(g) {
  const l = g && g.live;
  if (!l) return null;
  const q = l.period ? (l.period > 4 ? "OT" : "Q" + l.period) : "";
  return { line: `UW ${l.us} – ${l.them} ${g.abbr || g.opponent}`, clock: [q, l.clock].filter(Boolean).join(" ") };
}
function record() {
  let w = 0, l = 0;
  (DATA.games || []).forEach(g => { if (g.result) (g.result[0] === "W" ? w++ : l++); });
  return { w, l, played: w + l };
}
function playedGames() {
  return (DATA.games || []).filter(g => !g.bye && g.kickoff).sort((a,b) => parse(a.kickoff) - parse(b.kickoff));
}
function firstGame() { return playedGames()[0] || null; }
function lastPlayed() { return playedGames().filter(g => gameOver(g) && g.result).pop() || null; }
// In-season = the opener has kicked off (or is today).
function inSeason() {
  const f = firstGame();
  return !!f && daysUntil(parse(f.kickoff)) <= 0;
}
// Most recent result is "fresh" for 72h — long enough to gloat/cope through the week's start.
function freshResult() {
  const g = lastPlayed();
  if (!g) return null;
  const age = now() - parse(g.kickoff);
  return age < 72 * 3600000 ? g : null;
}
function isDuckWeek(hg) {
  return !!hg && hg.rivalry === "oregon" && daysUntil(parse(hg.kickoff)) <= 7;
}
function postseasonGame() { return (DATA.games || []).find(g => g.postseason && !gameOver(g)) || null; }
function ducks() { return (typeof DUCKS !== "undefined") ? DUCKS : null; }

// --- rendering ---
function render() {
  renderSchedule();
  renderOregon();
  renderDuckWatch();
  renderHype();
  // share/install wired separately
}

function tick() {
  if (!DATA) return;
  const hg = nextHuskyGame();
  const cfb = parse(DATA.cfb_opener && DATA.cfb_opener.date);

  // Husky countdown
  if (hg) {
    const k = parse(hg.kickoff);
    const d = daysUntil(k);
    const live = isLive(hg);
    const sc = live ? liveScore(hg) : null;
    $("huskyDays").textContent = live ? (sc ? `${hg.live.us}–${hg.live.them}` : "0") : (d >= 0 ? d : "0");
    $("huskyUnit").textContent = live ? (sc ? sc.clock || "LIVE" : "LIVE") : "days";
    $("huskyClock").textContent = live ? (sc ? sc.line : "LIVE NOW 🔴") : clockUntil(k);
    const tbd = hg.timeConfirmed ? "" : " (time TBD)";
    const tv = hg.tv ? ` · ${hg.tv}` : "";
    $("huskySub").textContent = `${hg.home ? "vs" : "@"} ${hg.opponent}${tbd}${live ? " 🔴" : (hg.timeConfirmed ? " · " + fmtTime(k) : "")}${tv}`;
    $("huskyCard").classList.toggle("is-live", live);
    const duckWeek = isDuckWeek(hg);
    document.body.classList.toggle("oregon-week", duckWeek);
    document.body.classList.toggle("gameday", d === 0 || live);
    $("huskyTitle").textContent = live ? "🔴 DAWGS LIVE"
      : duckWeek ? "🦆 DUCK HUNT IN"
      : hg.postseason ? "🩸 BOWL GAME IN"
      : (record().played ? "🐺 Next up in" : "🐺 The Dawgs are back in");
    const fresh = !live && freshResult();
    const D = ducks();
    $("snarkLine").textContent = live
      ? (sc && hg.live.us > hg.live.them ? "THE DAWGS ARE WINNING RIGHT NOW. Why are you reading this?"
         : sc && hg.live.us < hg.live.them ? "It's fine. We're fine. Everything is fine. (Trailing. Keep barking.)"
         : "THE DAWGS ARE PLAYING RIGHT NOW. Why are you reading this?")
      : (duckWeek && D) ? D.oregonWeek(d)
      : (fresh && D && d > 1) ? (fresh.result[0] === "W" ? D.gloat(fresh) : D.cope(fresh))
      : SNARK.headline(d);
  } else {
    $("huskyDays").textContent = "✓";
    $("huskyClock").textContent = "Season complete";
    $("huskySub").textContent = "See you next year. Stay mad, Oregon.";
    $("snarkLine").textContent = SNARK.flavor();
  }

  // Second card: CFB opener countdown pre-season, Record card in-season.
  if (inSeason()) {
    renderRecordCard();
  } else if (cfb) {
    const d = daysUntil(cfb);
    if (d >= 0) {
      $("cfbDays").textContent = d;
      $("cfbClock").textContent = clockUntil(cfb);
      $("cfbSub").textContent = DATA.cfb_opener.label || "Week 0";
    } else {
      $("cfbDays").textContent = "🏈";
      $("cfbClock").textContent = "It's BACK";
      $("cfbSub").textContent = "College football is officially live.";
    }
  }

  // refresh per-game countdowns cheaply
  document.querySelectorAll("[data-cd]").forEach(el => {
    const k = parse(el.getAttribute("data-cd"));
    const d = daysUntil(k);
    if (d > 0) el.innerHTML = d + '<small>days</small>';
    else if (d === 0) el.innerHTML = 'TODAY<small>' + fmtClock(k) + '</small>';
  });
}

function renderRecordCard() {
  const rec = record();
  const last = lastPlayed();
  const rank = DATA.rank ? `#${DATA.rank} ` : "";
  $("cfbTitle").textContent = "📊 The Record";
  const num = $("cfbDays");
  num.textContent = rec.played ? `${rec.w}-${rec.l}` : "0-0";
  num.classList.add("rec");
  $("cfbUnit").textContent = rank ? `${rank}Huskies` : (rec.played ? (rec.l === 0 ? "undefeated" : "record") : "kickoff pending");
  const clk = $("cfbClock");
  clk.classList.remove("w", "l");
  if (last) {
    const won = last.result[0] === "W";
    clk.textContent = `${won ? "Beat" : "Lost to"} ${last.opponent} ${last.result.slice(2)}`;
    clk.classList.add(won ? "w" : "l");
  } else {
    clk.textContent = "No results yet";
  }
  const bowl = postseasonGame();
  const oreg = (DATA.games || []).find(g => g.rivalry === "oregon");
  let sub = rec.played
    ? (rec.l === 0 ? "Zero losses. Zero chill." : rec.w > rec.l ? "Winning record. Act like you've been here." : "It's a rebuild. It's a vibe. It's fine.")
    : "Season's here. Bow down.";
  if (oreg && oreg.result) sub = oreg.result[0] === "W" ? "AND WE BEAT OREGON. Season complete, spiritually." : "Oregon happened. We don't talk about it.";
  const sc = SIREN.get();
  $("cfbSub").innerHTML = sub
    + (bowl ? `<span class="pact">🩸 BLOOD PACT ACTIVATED — vs ${bowl.opponent}</span>` : "")
    + `<span class="pact" style="color:var(--gold)" id="sirenLine">${sc && sc.total ? `🚨 ${sc.total} siren pulls this season` : ""}</span>`;
}

function renderDuckWatch() {
  const D = ducks();
  const dd = DUCKDATA;
  if (dd && dd.record) {
    const r = dd.record;
    $("duckRecord").textContent = `${dd.rank ? "#" + dd.rank + " · " : ""}${r.w}-${r.l}`;
  } else {
    $("duckRecord").textContent = "";
  }
  const lossEl = $("duckLoss");
  if (dd && dd.losses && dd.losses.length) {
    const L = dd.losses[dd.losses.length - 1];
    lossEl.textContent = D ? D.duckLoss(L) : `Oregon lost to ${L.opponent} (${L.score}). Delightful.`;
    lossEl.classList.add("lost");
  } else if (dd && dd.record) {
    lossEl.textContent = D ? D.duckUndefeated() : "Oregon hasn't lost yet. It's early. Their schedule is soft.";
    lossEl.classList.remove("lost");
  } else {
    lossEl.textContent = D ? D.duckUndefeated() : "Duck intel loading…";
  }
  $("duckFact").textContent = D ? D.fact().text : "Oregon has never won a national championship in football. That's the fact. Every day.";
}

function renderHype() {
  const hg = nextHuskyGame();
  const opener = firstGame();
  if (!opener) return;
  const t = now().getTime();
  const season = inSeason();
  const duckWeek = isDuckWeek(hg);
  let target, start, caps;
  if (!season) {
    // Pre-season: one long ramp to the opener.
    target = parse(opener.kickoff);
    start = new Date(target.getTime() - 250 * MS_DAY);
    caps = [
      [25, "Barely contained. We're vibrating."],
      [50, "Hype rising. Resistance is futile."],
      [75, "Dangerously hyped. Approach with snacks."],
      [95, "MAXIMUM HYPE. Somebody check on this guy."],
      [101, "🔥 FULLY UNHINGED. IT'S HERE. 🔥"],
    ];
    $("hypeLabel").textContent = "HYPE METER";
  } else if (hg) {
    // In-season: weekly ramp from the previous game (or 7 days out) to the next kickoff.
    target = parse(hg.kickoff);
    const prev = playedGames().filter(g => parse(g.kickoff) < target).pop();
    const weekAgo = new Date(target.getTime() - 7 * MS_DAY);
    start = prev ? new Date(Math.max(parse(prev.kickoff).getTime() + 4 * 3600000, weekAgo.getTime())) : weekAgo;
    caps = duckWeek ? [
      [25, "Duck week. Sharpening things."],
      [50, "Halfway to Eugene. The smell is already here."],
      [75, "Nike money can't buy what's coming."],
      [95, "DUCK SEASON. LICENSES ARE FREE."],
      [101, "🦆🔪 HUNT. THEM. DOWN. 🔪🦆"],
    ] : [
      [25, "Recovering. Rehydrating. Replaying the highlights."],
      [50, "Midweek. The hype is compounding."],
      [75, "Gameday is close. Jersey's already out."],
      [95, "IT'S ALMOST TIME. Tailgate math in progress."],
      [101, "🔥 GAMEDAY. BOW DOWN. 🔥"],
    ];
    $("hypeLabel").textContent = duckWeek ? "DUCK HUNT METER" : "WEEKLY HYPE";
  } else {
    $("hypeFill").style.width = "100%"; $("hypePct").textContent = "∞";
    $("hypeLabel").textContent = "HYPE METER";
    $("hypeCap").textContent = "Season's over. Hype is now a lifestyle.";
    return;
  }
  $("hypeCard").classList.toggle("is-duckweek", duckWeek);
  let pct = (t - start.getTime()) / (target.getTime() - start.getTime()) * 100;
  pct = Math.max(2, Math.min(100, pct));
  if (t >= target.getTime()) pct = 100;
  $("hypeFill").style.width = pct.toFixed(1) + "%";
  $("hypePct").textContent = Math.round(pct) + "%";
  $("hypeCap").textContent = (caps.find(c => pct < c[0]) || caps[caps.length-1])[1];
}

function renderOregon() {
  const last = parse(DATA.oregon_last_win);
  if (!last) { $("oregonDays").textContent = "—"; return; }
  const days = Math.floor((now() - last) / MS_DAY);
  $("oregonDays").textContent = days.toLocaleString();
  $("oregonSub").textContent = SNARK.oregonLine(days);
}

const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

function renderSchedule() {
  const list = $("scheduleList");
  const games = DATA.games || [];
  const next = nextHuskyGame();
  list.innerHTML = "";

  games.forEach(g => {
    if (g.bye) {
      const b = document.createElement("div");
      b.className = "bye-card";
      b.textContent = `${labelDate(g.date)} — BYE WEEK (touch grass, recover)`;
      list.appendChild(b);
      return;
    }
    const k = parse(g.kickoff || g.date);
    const past = gameOver(g);
    const live = isLive(g);
    const sc = liveScore(g);
    const isNext = next && g === next;
    const rival = g.rivalry === "oregon" || g.rivalry === "apple-cup";

    const card = document.createElement("div");
    card.className = "sched-card"
      + (past ? " is-past" : "")
      + (isNext ? " is-next" : "")
      + (live ? " is-live" : "")
      + (g.rivalry === "apple-cup" ? " is-applecup" : "")
      + (g.rivalry === "oregon" ? " is-rival" : "");

    const dt = parseLocalDate(g.date);
    const right = past && g.result
      ? `<div class="sched-result ${g.result[0].toLowerCase()}">${g.result}</div>`
      : past ? `<div class="sched-result">FINAL</div>`
      : sc ? `<div class="sched-result live">${g.live.us}–${g.live.them}<small>${sc.clock || "LIVE"}</small></div>`
      : live ? `<div class="sched-result live">LIVE</div>`
      : `<div class="sched-cd" data-cd="${g.kickoff || g.date}">—</div>`;

    const wx = weatherFor(g);
    const badge = g.rivalry === "apple-cup" ? "🍎 " : g.rivalry === "oregon" ? "🦆 " : "";
    const time = g.timeConfirmed ? fmtTime(k) : "Time TBD";
    const metaBits = [
      rival ? SNARK.opponentBurn(g.opponent) : "",
      time,
      g.neutral ? "neutral site" : "",
      g.tv || "",
    ].filter(Boolean).join(" · ");

    card.innerHTML = `
      <div class="sched-date">
        <span class="mo">${MONTHS[dt.getMonth()]}</span>
        <span class="dy">${dt.getDate()}</span>
      </div>
      <div class="sched-main">
        <div class="opp"><span class="ha ${g.home ? "home":"away"}">${g.home ? "vs" : "@"}</span> ${badge}${g.opponent}</div>
        <div class="meta">${metaBits}</div>
        ${wx ? `<div class="sched-weather">${wx}</div>` : ""}
      </div>
      <div class="sched-right">${right}</div>`;
    list.appendChild(card);
  });

  if (DATA.updated) {
    const age = (now() - new Date(DATA.updated)) / 3600000;
    let msg = "Live data last synced " + new Date(DATA.updated).toLocaleString();
    if (DATA.sync_error || age > 24) msg += " ⚠️ ESPN sync is failing — times/scores may be stale.";
    $("updatedAt").textContent = msg;
  }
}

function weatherFor(g) {
  if (!WEATHER || !WEATHER.games || !g.id) return "";
  const w = WEATHER.games[g.id];
  if (!w) return "";
  return `🌦️ Gameday: ${w.tempHi}°/${w.tempLo}°F, ${w.summary}`;
}

function labelDate(d) {
  const dt = parseLocalDate(d);
  return `${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
}
function fmtTime(d) {
  return d.toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" });
}
function fmtClock(d) {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// --- shared siren counter (POST /api/siren; see api/siren.py) ---
const SIREN = (() => {
  let counts = null, timer = null;
  function paint(bump) {
    const el = $("tdCount");
    if (!counts || !counts.today) { el.hidden = true; return; }
    el.textContent = counts.today > 999 ? "999+" : counts.today;
    el.title = `${counts.today} siren pulls today · ${counts.total} all season`;
    el.hidden = false;
    if (bump) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
    const rc = $("sirenLine"); if (rc) rc.textContent = `🚨 ${counts.total} siren pulls this season`;
  }
  async function poll() {
    try {
      const r = await fetch("/api/siren", { cache: "no-store" });
      if (r.ok) { counts = await r.json(); paint(false); }
    } catch (_) {}
    clearTimeout(timer);
    const hg = DATA && nextHuskyGame();
    const hot = hg && (isLive(hg) || daysUntil(parse(hg.kickoff)) === 0);
    timer = setTimeout(poll, hot ? 20000 : 300000);
  }
  async function tap() {
    if (counts) { counts.today++; counts.total++; paint(true); }  // optimistic
    try {
      const r = await fetch("/api/siren", { method: "POST" });
      if (r.ok || r.status === 429) { counts = await r.json(); paint(false); }
    } catch (_) {}
  }
  return { start: poll, tap, get: () => counts };
})();

// --- share card ---
async function shareCard() {
  if (!DATA || typeof SHARECARD === "undefined") return;
  const btn = $("cardBtn"); const label = btn.textContent; btn.textContent = "🎨 Rendering…"; btn.disabled = true;
  try {
    const rec = record(); const D = ducks(); const fresh = freshResult(); const hg = nextHuskyGame();
    const duck = DUCKDATA && DUCKDATA.record ? `Oregon: ${DUCKDATA.record.w}-${DUCKDATA.record.l}` : null;
    let st;
    if (fresh) {
      const won = fresh.result[0] === "W";
      st = { mode: "result", won, score: fresh.result.slice(2), opponent: fresh.opponent, home: fresh.home,
             line: D ? (won ? D.gloat(fresh) : D.cope(fresh)) : "", text: `${won ? "DAWGS WIN" : "Dawgs lost"} ${fresh.result.slice(2)} ${fresh.home ? "vs" : "@"} ${fresh.opponent} 🐺` };
    } else if (hg) {
      const d = daysUntil(parse(hg.kickoff));
      st = { mode: "countdown", days: Math.max(0, d), opponent: hg.opponent, home: hg.home,
             when: hg.timeConfirmed ? fmtTime(parse(hg.kickoff)) + (hg.tv ? " · " + hg.tv : "") : "time TBD",
             line: isDuckWeek(hg) && D ? D.oregonWeek(d) : SNARK.headline(d), text: `${d} days until Husky football 🐺` };
    } else {
      st = { mode: "countdown", days: 0, opponent: "next season", home: true, line: SNARK.flavor(), text: "Husky football 🐺" };
    }
    st.rank = DATA.rank; st.record = rec.played ? `${rec.w}-${rec.l}` : null; st.duckLine = duck; st.url = location.host;
    const out = await SHARECARD.share(st);
    if (out && out.url) { $("cardImg").src = out.url; $("cardDlg").showModal(); }
  } catch (e) { console.warn("share card failed", e); }
  btn.textContent = label; btn.disabled = false;
}

// --- share + install ---
function wireButtons() {
  const shareBtn = $("shareBtn");
  shareBtn.addEventListener("click", async () => {
    const hg = nextHuskyGame();
    const d = hg ? daysUntil(parse(hg.kickoff)) : null;
    const rec = record();
    const fresh = freshResult();
    const D = ducks();
    const text = fresh && D
      ? `${fresh.result[0] === "W" ? "DAWGS WIN" : "Dawgs lost"} ${fresh.result.slice(2)} ${fresh.home ? "vs" : "@"} ${fresh.opponent}. ${fresh.result[0] === "W" ? D.gloat(fresh) : D.cope(fresh)} 🐺`
      : hg && isLive(hg)
      ? `Dawgs are LIVE right now ${hg.home ? "vs" : "@"} ${hg.opponent} 🐺🔴 Get in here:`
      : d != null && rec.played
      ? `Huskies are ${rec.w}-${rec.l}. ${d} days until we ${hg.home ? "host" : "visit"} ${hg.opponent} 🐺 (still the last Pac-12 champs):`
      : d != null
      ? `${d} days until Husky football 🐺 (and we're STILL the last Pac-12 champs). Get hyped:`
      : `Husky football season is here 🐺💜 Bow down:`;
    const url = location.origin;
    if (navigator.share) {
      try { await navigator.share({ title: "DawgHaus 🐺", text, url }); } catch (_) {}
    } else {
      try {
        await navigator.clipboard.writeText(`${text} ${url}`);
        shareBtn.textContent = "✅ Link copied!";
        setTimeout(() => shareBtn.textContent = "📣 Send to a buddy", 2000);
      } catch (_) { alert(`${text} ${url}`); }
    }
  });

  // Fight song (toggle play/stop, label reflects state)
  $("songBtn").addEventListener("click", () => FIGHTSONG.play());
  document.addEventListener("fightsong:started", () => { $("songBtn").textContent = "⏹ Stop"; });
  document.addEventListener("fightsong:stopped", () => { $("songBtn").textContent = "🎺 Fight Song"; });

  // Touchdown siren (floating button, toggle) + shared tap counter
  $("tdBtn").addEventListener("click", () => TOUCHDOWN.play());
  document.addEventListener("touchdown:started", () => { $("tdBtn").classList.add("is-blasting"); SIREN.tap(); });
  document.addEventListener("touchdown:stopped", () => $("tdBtn").classList.remove("is-blasting"));
  SIREN.start();

  // Share card
  $("cardBtn").addEventListener("click", shareCard);
  $("cardClose").addEventListener("click", () => $("cardDlg").close());

  // Trash talk
  const trashLine = () => {
    const D = ducks();
    const duckWeek = DATA && isDuckWeek(nextHuskyGame());
    return (D && (duckWeek || Math.random() < 0.4)) ? D.trash() : TRASH.generate();
  };
  $("trashText").textContent = TRASH.ofTheDay();
  $("trashBtn").addEventListener("click", () => { $("trashText").textContent = trashLine(); });

  // Theme toggle (dark default, light is cream + purple + gold)
  const themeBtn = $("themeBtn");
  const setThemeIcon = () => {
    const light = document.documentElement.getAttribute("data-theme") === "light";
    themeBtn.textContent = light ? "☀️" : "🌙";
  };
  setThemeIcon();
  themeBtn.addEventListener("click", () => {
    const light = document.documentElement.getAttribute("data-theme") === "light";
    const next = light ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("dawghaus-theme", next); } catch (_) {}
    setThemeIcon();
  });

  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    $("installBtn").hidden = false;
  });
  $("installBtn").addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    $("installBtn").hidden = true;
  });
}

// --- boot ---
wireButtons();
loadData();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(e => console.warn("SW failed", e));
  });
}
