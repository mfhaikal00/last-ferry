// Last Ferry — Salt Harbor.
// Procedural audio: harbour surf, distant gulls, an engine note, the patrol
// siren, radio chatter, gunshots and a low ambient score. No audio files and no
// network; the context starts on the first user gesture.

export class AudioDirector {
  constructor() {
    this.ctx = null;
    this.started = false;
    this.engine = null;
    this.siren = null;
    this.sirenGain = null;
    this.musicTimer = null;
    this.chordIndex = 0;
  }

  start() {
    if (this.started) {
      this.ctx?.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);
    this.started = true;
    this.buildAmbience();
    this.buildMusic();
  }

  buildAmbience() {
    const ctx = this.ctx;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 620;
    const gain = ctx.createGain();
    gain.gain.value = 0.055;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.18;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.022;
    lfo.connect(lfoGain).connect(gain.gain);
    source.connect(filter).connect(gain).connect(this.master);
    source.start();
    lfo.start();
    this.ambience = gain;
    // Occasional gull calls.
    this.gullTimer = setInterval(() => this.gull(), 9000);
  }

  gull() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(720, now + 0.24);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.02, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + 0.34);
  }

  buildMusic() {
    const chords = [
      [110, 164.81, 196.0],
      [98, 146.83, 174.61],
      [87.31, 130.81, 164.81],
      [98, 146.83, 220.0],
    ];
    const play = () => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const chord = chords[this.chordIndex % chords.length];
      this.chordIndex++;
      for (const freq of chord) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 700;
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.018, now + 1.6);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 7.5);
        osc.connect(filter).connect(gain).connect(this.master);
        osc.start(now);
        osc.stop(now + 7.8);
      }
    };
    play();
    this.musicTimer = setInterval(play, 7600);
  }

  setEngine(active, speedRatio = 0) {
    if (!this.ctx) return;
    if (!this.engine) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc2.type = 'square';
      osc.frequency.value = 55;
      osc2.frequency.value = 82;
      filter.type = 'lowpass';
      filter.frequency.value = 240;
      gain.gain.value = 0;
      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain).connect(this.master);
      osc.start();
      osc2.start();
      this.engine = { osc, osc2, filter, gain };
    }
    const now = this.ctx.currentTime;
    const e = this.engine;
    e.osc.frequency.setTargetAtTime(48 + speedRatio * 52, now, 0.12);
    e.osc2.frequency.setTargetAtTime(74 + speedRatio * 70, now, 0.12);
    e.filter.frequency.setTargetAtTime(220 + speedRatio * 420, now, 0.15);
    e.gain.gain.setTargetAtTime(active ? 0.035 + speedRatio * 0.03 : 0, now, 0.15);
  }

  setSiren(active, volume = 0.4) {
    if (!this.ctx) return;
    if (!this.siren) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 760;
      lfo.type = 'sine';
      lfo.frequency.value = 0.55;
      lfoGain.gain.value = 180;
      gain.gain.value = 0;
      lfo.connect(lfoGain).connect(osc.frequency);
      osc.connect(gain).connect(this.master);
      osc.start();
      lfo.start();
      this.siren = osc;
      this.sirenGain = gain;
    }
    const now = this.ctx.currentTime;
    this.sirenGain.gain.setTargetAtTime(active ? volume * 0.07 : 0, now, 0.25);
  }

  gunshot(volume = 0.5, distanceGain = 1) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.18, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 4);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1800;
    const gain = ctx.createGain();
    gain.gain.value = volume * distanceGain;
    src.connect(filter).connect(gain).connect(this.master);
    src.start(now);
  }

  radioChatter() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 1000 + Math.random() * 900;
      const at = now + i * 0.09;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.018, at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
      osc.connect(gain).connect(this.master);
      osc.start(at);
      osc.stop(at + 0.08);
    }
  }

  success() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const notes = [392, 493.88, 587.33, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const at = now + i * 0.14;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.05, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.2);
      osc.connect(gain).connect(this.master);
      osc.start(at);
      osc.stop(at + 1.3);
    });
  }

  thugDown() {
    this.gunshot(0.16, 0.6);
  }

  ui() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.02, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + 0.13);
  }
}