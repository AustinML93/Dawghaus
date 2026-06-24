/* DawgHaus touchdown siren button (floating).
 * Drop your siren at web/audio/touchdown.mp3 and it plays that. Otherwise it
 * synthesizes a wailing siren with Web Audio so the button always blasts.
 *
 * play() is a TOGGLE (tap to blast, tap to silence) and fires
 * "touchdown:started" / "touchdown:stopped" so the UI can light up the button. */

const TOUCHDOWN = (() => {
  let audioEl = null;
  let sirenCtx = null;
  let sirenTimer = null;

  function emit(name) { document.dispatchEvent(new CustomEvent(name)); }

  function isPlaying() {
    if (audioEl && !audioEl.paused && !audioEl.ended) return true;
    if (sirenCtx && sirenCtx.state !== "closed") return true;
    return false;
  }

  function stop() {
    if (audioEl) { try { audioEl.pause(); } catch (_) {} audioEl = null; }
    if (sirenTimer) { clearTimeout(sirenTimer); sirenTimer = null; }
    if (sirenCtx) { try { sirenCtx.close(); } catch (_) {} sirenCtx = null; }
    emit("touchdown:stopped");
  }

  function play() {
    if (isPlaying()) { stop(); return; }

    // Start SYNCHRONOUSLY inside the gesture (iOS autoplay rule).
    const audio = new Audio("/audio/touchdown.mp3");
    audio.preload = "auto";
    audio.addEventListener("playing", () => emit("touchdown:started"), { once: true });
    audio.addEventListener("ended", () => { audioEl = null; emit("touchdown:stopped"); });
    audioEl = audio;
    const p = audio.play();
    if (p && p.catch) {
      p.catch(() => { audioEl = null; siren(); });  // no file -> synth
    }
  }

  function siren() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    sirenCtx = ctx;
    emit("touchdown:started");

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    const gain = ctx.createGain();
    gain.gain.value = 0.18;
    osc.connect(gain); gain.connect(ctx.destination);

    // Wail: sweep the pitch up and down a few times.
    const t0 = ctx.currentTime;
    const cycles = 4, period = 0.55;
    osc.frequency.setValueAtTime(600, t0);
    for (let i = 0; i < cycles; i++) {
      const s = t0 + i * period;
      osc.frequency.exponentialRampToValueAtTime(1200, s + period / 2);
      osc.frequency.exponentialRampToValueAtTime(600, s + period);
    }
    const total = cycles * period;
    gain.gain.setValueAtTime(0.18, t0 + total - 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + total);
    osc.start(t0);
    osc.stop(t0 + total + 0.05);

    sirenTimer = setTimeout(() => {
      if (sirenCtx === ctx) { try { ctx.close(); } catch (_) {} sirenCtx = null; emit("touchdown:stopped"); }
    }, total * 1000 + 100);
  }

  return { play, stop, isPlaying };
})();
