// Synthesized sound effects (no audio files needed).
window.Sfx = (() => {
  let ctx = null;
  let master = null;
  let volume = 0.7;
  let lastPlayed = 0;

  function ac() {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = volume * 0.65;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    lastPlayed = Date.now();
    return ctx;
  }

  function envGain(c, t, peak, attack, dur) {
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    return g;
  }

  function noise(c, seconds) {
    const len = Math.floor(c.sampleRate * seconds);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    return src;
  }

  // Short breathy "h" before each giggle syllable.
  function breath(c, t) {
    const src = noise(c, 0.03);
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2500;
    src.connect(hp).connect(envGain(c, t, 0.06, 0.004, 0.03)).connect(master);
    src.start(t);
  }

  // One "he" syllable: buzzy source through a formant-ish bandpass.
  function syllable(c, t, dur, f) {
    breath(c, t);
    const st = t + 0.012;
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f * 1.18, st);
    o.frequency.exponentialRampToValueAtTime(f * 0.82, st + dur);
    const o2 = c.createOscillator();
    o2.type = 'sine';
    o2.frequency.setValueAtTime(f * 1.18, st);
    o2.frequency.exponentialRampToValueAtTime(f * 0.82, st + dur);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f * 2.4;
    bp.Q.value = 2.5;
    o.connect(bp).connect(envGain(c, st, 0.5, 0.012, dur)).connect(master);
    o2.connect(envGain(c, st, 0.25, 0.012, dur)).connect(master);
    o.start(st); o2.start(st);
    o.stop(st + dur + 0.03); o2.stop(st + dur + 0.03);
  }

  function giggle(count) {
    const c = ac();
    const n = count || 5 + Math.floor(Math.random() * 3);
    let t = c.currentTime + 0.02;
    const base = 680 + Math.random() * 140;
    for (let i = 0; i < n; i++) {
      const dur = 0.065 + Math.random() * 0.03;
      const f = base * (1 - i * 0.04) * (1 + (Math.random() - 0.5) * 0.08);
      syllable(c, t, dur, f);
      t += dur + 0.05 + Math.random() * 0.02;
    }
  }

  function tone(c, t, f, dur, peak, type = 'sine') {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.connect(envGain(c, t, peak, 0.01, dur)).connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function bell(c, t, f, dur, peak) {
    tone(c, t, f, dur, peak);
    tone(c, t, f * 2, dur * 0.6, peak * 0.25, 'triangle');
  }

  function chime() {
    const c = ac();
    const t = c.currentTime + 0.02;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(c, t + i * 0.09, f, 0.7, 0.35));
  }

  function ping() {
    const c = ac();
    const t = c.currentTime + 0.02;
    bell(c, t, 880, 0.25, 0.35);
    bell(c, t + 0.16, 1174.66, 0.35, 0.35);
  }

  function pop() {
    const c = ac();
    const t = c.currentTime + 0.01;
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(400, t);
    o.frequency.exponentialRampToValueAtTime(900, t + 0.08);
    o.connect(envGain(c, t, 0.3, 0.005, 0.1)).connect(master);
    o.start(t);
    o.stop(t + 0.12);
  }

  function chomp() {
    const c = ac();
    const t = c.currentTime + 0.01;
    const src = noise(c, 0.07);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    src.connect(lp).connect(envGain(c, t, 0.4, 0.004, 0.07)).connect(master);
    src.start(t);
  }

  // Soft purr: low tone with a fast tremolo.
  function purr() {
    const c = ac();
    const t = c.currentTime + 0.02;
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.value = 85;
    const trem = c.createGain();
    trem.gain.value = 0.5;
    const lfo = c.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 24;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 0.5;
    lfo.connect(lfoGain).connect(trem.gain);
    o.connect(trem).connect(envGain(c, t, 0.35, 0.15, 1.3)).connect(master);
    o.start(t); lfo.start(t);
    o.stop(t + 1.4); lfo.stop(t + 1.4);
  }

  // Little dance tune.
  function tune() {
    const c = ac();
    const t = c.currentTime + 0.02;
    const melody = [523.25, 659.25, 783.99, 659.25, 698.46, 880, 783.99, 1046.5, 783.99, 880, 698.46, 783.99];
    const bass = [130.81, 130.81, 174.61, 196];
    melody.forEach((f, i) => tone(c, t + i * 0.18, f, 0.16, 0.18, 'triangle'));
    bass.forEach((f, i) => tone(c, t + i * 0.54, f, 0.45, 0.22, 'sine'));
  }

  // "Wheee!": a voice-ish slide up then down.
  function whee() {
    const c = ac();
    const t = c.currentTime + 0.02;
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(500, t);
    o.frequency.exponentialRampToValueAtTime(1300, t + 0.35);
    o.frequency.exponentialRampToValueAtTime(700, t + 0.9);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    bp.Q.value = 1.8;
    o.connect(bp).connect(envGain(c, t, 0.35, 0.05, 0.95)).connect(master);
    o.start(t);
    o.stop(t + 1);
  }

  // Slingshot tension click; higher for each power level (1..4).
  function tick(level = 1) {
    const c = ac();
    const t = c.currentTime + 0.005;
    const f = 380 + level * 220;
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.06);
    o.connect(envGain(c, t, 0.28, 0.004, 0.09)).connect(master);
    o.start(t);
    o.stop(t + 0.1);
  }

  // Cartoon spring bounce.
  function boing() {
    const c = ac();
    const t = c.currentTime + 0.01;
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(520, t + 0.08);
    o.frequency.exponentialRampToValueAtTime(220, t + 0.3);
    const lfo = c.createOscillator();
    lfo.frequency.value = 28;
    const depth = c.createGain();
    depth.gain.value = 40;
    lfo.connect(depth).connect(o.frequency);
    o.connect(envGain(c, t, 0.4, 0.005, 0.35)).connect(master);
    o.start(t); lfo.start(t);
    o.stop(t + 0.4); lfo.stop(t + 0.4);
  }

  return {
    giggle, chime, ping, pop, chomp, purr, tune, whee, boing, tick,
    setVolume: (v) => {
      volume = v;
      if (master) master.gain.value = v * 0.65;
    },
    lastPlayed: () => lastPlayed,
  };
})();
