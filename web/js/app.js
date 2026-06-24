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
  await loadWeather();
  render();
  tick();
  setInterval(tick, 1000);
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

function nextHuskyGame() {
  if (!DATA || !DATA.games) return null;
  const n = now();
  const upcoming = DATA.games
    .filter(g => !g.bye && parse(g.kickoff))
    .filter(g => parse(g.kickoff).getTime() + 4*3600*1000 > n.getTime()) // game still "live" for ~4h
    .sort((a,b) => parse(a.kickoff) - parse(b.kickoff));
  return upcoming[0] || null;
}

function isLive(game) {
  if (!game) return false;
  const k = parse(game.kickoff).getTime();
  const t = now().getTime();
  return t >= k && t <= k + 4*3600*1000;
}

// --- rendering ---
function render() {
  renderSchedule();
  renderOregon();
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
    $("huskyDays").textContent = isLive(hg) ? "0" : (d >= 0 ? d : "0");
    $("huskyClock").textContent = isLive(hg) ? "LIVE NOW 🔴" : clockUntil(k);
    const tbd = hg.timeConfirmed ? "" : " (time TBD)";
    $("huskySub").textContent = `${hg.home ? "vs" : "@"} ${hg.opponent}${tbd}`;
    $("huskyCard").classList.toggle("is-live", isLive(hg));
    $("snarkLine").textContent = isLive(hg)
      ? "THE DAWGS ARE PLAYING RIGHT NOW. Why are you reading this?"
      : SNARK.headline(d);
  } else {
    $("huskyDays").textContent = "✓";
    $("huskyClock").textContent = "Season complete";
    $("huskySub").textContent = "See you next year. Stay mad, Oregon.";
    $("snarkLine").textContent = SNARK.flavor();
  }

  // CFB opener countdown
  if (cfb) {
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
  });
}

function renderHype() {
  const hg = nextHuskyGame() || (DATA.games || []).find(g => !g.bye && g.kickoff);
  const opener = (DATA.games || []).filter(g => !g.bye && g.kickoff)
    .sort((a,b)=>parse(a.kickoff)-parse(b.kickoff))[0];
  if (!opener) return;
  const target = parse(opener.kickoff);
  const start = new Date(target.getTime() - 250 * MS_DAY); // hype ramps over ~250 days
  const t = now().getTime();
  let pct = (t - start.getTime()) / (target.getTime() - start.getTime()) * 100;
  pct = Math.max(2, Math.min(100, pct));
  if (t >= target.getTime()) pct = 100;
  $("hypeFill").style.width = pct.toFixed(1) + "%";
  $("hypePct").textContent = Math.round(pct) + "%";
  const caps = [
    [25, "Barely contained. We're vibrating."],
    [50, "Hype rising. Resistance is futile."],
    [75, "Dangerously hyped. Approach with snacks."],
    [95, "MAXIMUM HYPE. Somebody check on this guy."],
    [101, "🔥 FULLY UNHINGED. IT'S HERE. 🔥"],
  ];
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
    const past = k && (k.getTime() + 4*3600*1000 < now().getTime());
    const isNext = next && g === next;
    const rival = g.rivalry === "oregon" || g.rivalry === "apple-cup";

    const card = document.createElement("div");
    card.className = "sched-card"
      + (past ? " is-past" : "")
      + (isNext ? " is-next" : "")
      + (g.rivalry === "apple-cup" ? " is-applecup" : "")
      + (g.rivalry === "oregon" ? " is-rival" : "");

    const dt = parseLocalDate(g.date);
    const right = past && g.result
      ? `<div class="sched-result ${g.result[0].toLowerCase()}">${g.result}</div>`
      : `<div class="sched-cd" data-cd="${g.kickoff || g.date}">—</div>`;

    const wx = weatherFor(g);
    const badge = g.rivalry === "apple-cup" ? "🍎 " : g.rivalry === "oregon" ? "🦆 " : "";
    const time = g.timeConfirmed ? fmtTime(k) : "Time TBD";
    const metaBits = [
      rival ? SNARK.opponentBurn(g.opponent) : time,
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
    $("updatedAt").textContent = "Live data last synced " + new Date(DATA.updated).toLocaleString();
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

// --- share + install ---
function wireButtons() {
  const shareBtn = $("shareBtn");
  shareBtn.addEventListener("click", async () => {
    const hg = nextHuskyGame();
    const d = hg ? daysUntil(parse(hg.kickoff)) : null;
    const text = d != null
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

  // Fight song
  $("songBtn").addEventListener("click", () => FIGHTSONG.play());

  // Trash talk
  $("trashText").textContent = TRASH.ofTheDay();
  $("trashBtn").addEventListener("click", () => {
    $("trashText").textContent = TRASH.generate();
  });

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
