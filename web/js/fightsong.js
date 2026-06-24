/* DawgHaus fight song button.
 * If you drop a real recording at web/audio/fight-song.mp3 (Bow Down to
 * Washington is public domain, 1915), it plays that. Otherwise it synthesizes
 * a triumphant brass fanfare with Web Audio so the button always does something
 * — and it works offline.
 *
 * play() is a TOGGLE: press to start, press again to stop. It fires
 * "fightsong:started" / "fightsong:stopped" on document so the UI can update
 * the button label. */

const FIGHTSONG = (() => {
  let audioEl = null;
  let fanfareCtx = null;

  function emit(name) { document.dispatchEvent(new CustomEvent(name)); }

  function isPlaying() {
    if (audioEl && !audioEl.paused && !audioEl.ended) return true;
    if (fanfareCtx && fanfareCtx.state !== "closed") return true;
    return false;
  }

  function stop() {
    if (audioEl) { try { audioEl.pause(); } catch (_) {} audioEl = null; }
    if (fanfareCtx) { try { fanfareCtx.close(); } catch (_) {} fanfareCtx = null; }
    emit("fightsong:stopped");
  }

  function play() {
    // Toggle off if something is already going.
    if (isPlaying()) { stop(); return; }

    // Start playback SYNCHRONOUSLY inside the click — any await first breaks the
    // user-gesture requirement on iOS/Safari and the audio is silently blocked.
    const audio = new Audio("/audio/fight-song.mp3");
    audio.preload = "auto";
    audio.addEventListener("playing", () => emit("fightsong:started"), { once: true });
    audio.addEventListener("ended", () => { audioEl = null; emit("fightsong:stopped"); });
    audioEl = audio;
    const p = audio.play();
    if (p && p.catch) {
      p.catch(() => { audioEl = null; fanfare(); });  // no file / can't play -> synth
    }
  }

  function fanfare() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    fanfareCtx = ctx;
    emit("fightsong:started");
    const t0 = ctx.currentTime + 0.04;
    const master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);

    // Brass-ish note: two slightly detuned sawtooths with an envelope.
    function tone(freq, start, dur, peak = 0.3) {
      [0, 4].forEach((detune) => {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = freq;
        o.detune.value = detune;
        const g = ctx.createGain();
        o.connect(g); g.connect(master);
        const s = t0 + start;
        g.gain.setValueAtTime(0.0001, s);
        g.gain.exponentialRampToValueAtTime(peak, s + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
        o.start(s);
        o.stop(s + dur + 0.05);
      });
    }

    // Rising charge → big purple-and-gold chord.
    const G4 = 392, C5 = 523.25, E5 = 659.25, G5 = 783.99;
    tone(G4, 0.00, 0.18);
    tone(C5, 0.18, 0.18);
    tone(E5, 0.36, 0.18);
    tone(G5, 0.54, 0.34, 0.34);
    [C5, E5, G5, C5 * 2].forEach((f) => tone(f, 1.0, 1.0, 0.22));

    const totalMs = 2400;
    setTimeout(() => {
      if (fanfareCtx === ctx) { try { ctx.close(); } catch (_) {} fanfareCtx = null; emit("fightsong:stopped"); }
    }, totalMs);
  }

  return { play, stop, isPlaying };
})();
