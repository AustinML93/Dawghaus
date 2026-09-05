/* DawgHaus share card — renders a 1080x1080 PNG on a canvas for the group chat.
 * Modes: "result" (last score + gloat/cope line) or "countdown" (days to next game).
 * No deps. Emoji render via the system font. */

const SHARECARD = (() => {
  const W = 1080, H = 1080;
  const PURPLE = "#4B2E83", DEEP = "#2a1a4e", GOLD = "#B7A57A", GOLDB = "#e6d8a8", WIN = "#58e08a", LOSS = "#ff6b6b";

  function wrap(ctx, text, maxW, font) {
    ctx.font = font;
    const words = String(text).split(/\s+/), lines = [];
    let cur = "";
    for (const w of words) {
      const t = cur ? cur + " " + w : w;
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function draw(s) {
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d");
    const sys = "-apple-system, 'SF Pro Display', 'Helvetica Neue', Inter, Roboto, Arial, sans-serif";

    // background
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, PURPLE); g.addColorStop(1, "#140a26");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W * .8, H * .15, 20, W * .8, H * .15, 600);
    glow.addColorStop(0, "rgba(183,165,122,.35)"); glow.addColorStop(1, "rgba(183,165,122,0)");
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(183,165,122,.55)"; ctx.lineWidth = 6; ctx.strokeRect(36, 36, W - 72, H - 72);

    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    // brand
    ctx.fillStyle = "#fff"; ctx.font = `900 64px ${sys}`;
    ctx.fillText("🐺 DawgHaus", W / 2, 130);
    ctx.fillStyle = GOLD; ctx.font = `700 30px ${sys}`;
    ctx.fillText((s.rank ? `#${s.rank} ` : "") + "WASHINGTON HUSKIES" + (s.record ? `  ·  ${s.record}` : ""), W / 2, 195);

    if (s.mode === "result") {
      const won = s.won;
      ctx.fillStyle = won ? WIN : LOSS; ctx.font = `900 72px ${sys}`;
      ctx.fillText(won ? "DAWGS WIN" : "DAWGS FALL", W / 2, 330);
      ctx.fillStyle = "#fff"; ctx.font = `900 200px ${sys}`;
      ctx.fillText(s.score, W / 2, 500);
      ctx.fillStyle = GOLDB; ctx.font = `700 46px ${sys}`;
      ctx.fillText(`${won ? "over" : "to"} ${s.opponent}${s.home ? " · Husky Stadium" : ""}`, W / 2, 630);
    } else {
      ctx.fillStyle = GOLDB; ctx.font = `700 52px ${sys}`;
      ctx.fillText(s.days === 0 ? "IT'S GAMEDAY" : "DAWGS ARE BACK IN", W / 2, 320);
      ctx.fillStyle = "#fff"; ctx.font = `900 300px ${sys}`;
      ctx.fillText(s.days === 0 ? "🏈" : String(s.days), W / 2, 500);
      ctx.fillStyle = GOLD; ctx.font = `700 44px ${sys}`;
      ctx.fillText(s.days === 1 ? "DAY" : (s.days === 0 ? "" : "DAYS"), W / 2, 660);
      ctx.fillStyle = GOLDB; ctx.font = `700 46px ${sys}`;
      ctx.fillText(`${s.home ? "vs" : "@"} ${s.opponent}${s.when ? " · " + s.when : ""}`, W / 2, 725);
    }

    // snark line
    if (s.line) {
      ctx.fillStyle = "#fff";
      const lines = wrap(ctx, s.line, W - 200, `italic 600 40px ${sys}`);
      let y = 800 - (lines.length - 1) * 26;
      for (const ln of lines.slice(0, 3)) { ctx.fillText(ln, W / 2, y); y += 52; }
    }

    // footer banner
    ctx.fillStyle = "rgba(183,165,122,.9)"; ctx.fillRect(36, H - 150, W - 72, 114);
    ctx.fillStyle = DEEP; ctx.font = `900 40px ${sys}`;
    ctx.fillText("🏆 FOREVER PAC-12 CHAMPIONS 🏆", W / 2, H - 108);
    ctx.font = `700 24px ${sys}`;
    ctx.fillText((s.duckLine || "Stay mad, Oregon.") + "   ·   " + (s.url || "dawghaus"), W / 2, H - 66);
    return c;
  }

  function toBlob(canvas) {
    return new Promise(res => canvas.toBlob(b => res(b), "image/png"));
  }

  async function share(state) {
    const canvas = draw(state);
    const blob = await toBlob(canvas);
    const file = new File([blob], "dawghaus.png", { type: "image/png" });
    const text = state.text || "";
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], text, title: "DawgHaus 🐺" }); return "shared"; }
      catch (e) { if (e && e.name === "AbortError") return "cancelled"; }
    }
    return { blob, url: URL.createObjectURL(blob) };
  }

  return { draw, share };
})();
