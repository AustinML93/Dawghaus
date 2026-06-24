/* DawgHaus fight song button.
 * If you drop a real recording at web/audio/fight-song.mp3 (Bow Down to
 * Washington is public domain, 1915), it plays that. Otherwise it synthesizes
 * a triumphant brass fanfare with Web Audio so the button always does something
 * — and it works offline. */

const FIGHTSONG = (() => {
  let playing = null;

  function play() {
    // Must start playback SYNCHRONOUSLY inside the click — any await first
    // breaks the user-gesture requirement on iOS/Safari and the audio is
    // silently blocked. So we try the real recording immediately and only
    // fall back to the synth fanfare if it can't play (e.g. file missing).
    stop();
    const audio = new Audio("/audio/fight-song.mp3");
    audio.preload = "auto";
    audio.addEventListener("ended", () => { playing = null; });
    playing = audio;
    const p = audio.play();
    if (p && p.catch) {
      p.catch(() => { playing = null; fanfare(); });
    }
  }

  function stop() {
    if (playing) { try { playing.pause(); } catch (_) {} playing = null; }
  }

  function fanfare() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
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
    // Triumphant final chord.
    [C5, E5, G5, C5 * 2].forEach((f) => tone(f, 1.0, 1.0, 0.22));

    setTimeout(() => ctx.close(), 2400);
  }

  return { play, stop };
})();
