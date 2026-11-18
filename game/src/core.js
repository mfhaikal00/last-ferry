// Last Ferry — foundations for Salt Harbor.
// World constants, deterministic randomness, browser save/load, raw input and
// the procedural audio director all live here so every other module shares one
// source of truth. North is -Z; units are metres.

export const TITLE = 'Last Ferry';
export const CITY = 'Salt Harbor';

export const WORLD = {
  bounds: { minX: -200, maxX: 196, minZ: -158, maxZ: 176 },
  seaLevel: -0.9,
  landY: 0,
  roadY: 0.16,
  sidewalkY: 0.3,
  paintY: 0.315,
  marketY: 0.12,
  pierY: 0.55,
  bridgeY: 2.5,
  fogNear: 60,
  fogFar: 340,
};

export const NODES = {
  spawn_player_01: { x: -146, z: -78, yaw: 1.18, area: 'Workshop' },
  slot_tow_truck_A: { x: 98, z: -38, yaw: Math.PI / 2, area: 'Parking Lot' },
  pos_guard_harbor: { x: 87, z: -36, yaw: -Math.PI / 2, area: 'Parking Lot' },
  junction_patrol_entry: { x: 147, z: 44, yaw: Math.PI, area: 'Canal Bend' },
  lane_ferry_dest: { x: -110, z: 101, yaw: Math.PI / 2, area: 'Ferry Lane' },
  checkpoint_bridge_01: { x: 96, z: 86, yaw: Math.PI / 2, area: 'Bridge' },
};

export const POI = {
  workshop: { x: -143, z: -80 },
  shopStreet: { x: -30, z: -70 },
  market: { x: 100, z: -92 },
  parkingLot: { x: 103, z: -37 },
  canalBend: { x: 147, z: 30 },
  bridge: { x: 96, z: 86 },
  waterfront: { x: -20, z: 92 },
  terminal: { x: -130, z: 80 },
  ferryLane: { x: -110, z: 101 },
  westJunction: { x: -172, z: 20 },
  alley: { x: 64, z: 40 },
  pier: { x: -106, z: 122 },
  patrolStandby: { x: 173, z: 41 },
};

export const ROADS = {
  shopStreet: {
    width: 10, sidewalk: 2.4, twoWay: true,
    points: [[-176, -70], [-120, -70], [-60, -70], [0, -70], [62, -69], [88, -67], [104, -60], [112, -52]],
  },
  marketLink: {
    width: 10, sidewalk: 2.4, twoWay: true,
    points: [[112, -52], [126, -46], [138, -32], [145, -12], [147, 14], [147, 36], [147, 54], [150, 66], [156, 76], [160, 82], [160, 86], [156, 86]],
  },
  bridge: {
    width: 13, sidewalk: 1.5, twoWay: true, bridge: true,
    points: [[156, 86], [146, 86], [138, 86], [122, 86], [96, 86], [72, 86], [58, 86], [50, 87], [38, 90], [28, 91]],
  },
  waterfront: {
    width: 11, sidewalk: 3.0, twoWay: true,
    points: [[28, 91], [-20, 92], [-60, 93], [-90, 94], [-118, 94], [-144, 94], [-160, 93], [-172, 90]],
  },
  westRoad: {
    width: 10, sidewalk: 2.4, twoWay: true,
    points: [[-172, 90], [-172, 48], [-172, 8], [-172, -34], [-172, -62], [-176, -70]],
  },
  terminalLoop: {
    width: 10, sidewalk: 2.6, twoWay: false,
    points: [[-150, 94], [-146, 100], [-136, 103], [-112, 104], [-94, 102], [-86, 98], [-84, 94]],
  },
  lotDrive: {
    width: 8, sidewalk: 1.6, twoWay: false,
    points: [[112, -38], [124, -38], [134, -36], [142, -32], [147, -24]],
  },
  patrolSide: {
    width: 7, sidewalk: 1.8, twoWay: false,
    points: [[147, 44], [158, 42], [170, 41], [190, 41]],
  },
};

export const BRIDGE = {
  z: 86,
  deckX0: 58,
  deckX1: 140,
  westRampX0: 40,
  eastRampX1: 156,
  halfWidth: 8.2,
  rampWidth: 8.5,
};

export const PED_PATHS = {
  alley: {
    loop: false,
    points: [[96, -48], [80, -47], [70, -42], [66, -24], [64, 6], [63, 34], [63, 58], [64, 74], [66, 84], [66, 94], [46, 98], [4, 99], [-46, 99], [-80, 98], [-104, 95]],
  },
  marketWalk: {
    loop: true,
    points: [[-150, -60], [-100, -60], [-40, -60], [20, -60], [62, -60], [80, -57], [94, -52], [100, -44], [96, -38], [80, -44], [68, -52], [20, -58], [-50, -58], [-120, -58], [-150, -60]],
  },
  terminalWalk: {
    loop: true,
    points: [[-148, 93], [-138, 99], [-118, 100], [-98, 99], [-86, 95], [-112, 92], [-140, 91], [-148, 93]],
  },
  innerLane: {
    loop: true,
    points: [[-77, -36], [-77, 44], [-36, 44], [-36, -36], [-77, -36]],
  },
};

export const TRAFFIC_LOOPS = {
  harbourLoop: {
    speed: 8.5,
    points: [[-158, -70], [-100, -70], [-40, -70], [20, -70], [62, -69], [88, -67], [104, -60], [112, -52], [126, -46], [138, -32], [145, -12], [147, 14], [147, 36], [147, 54], [150, 66], [156, 76], [160, 82], [160, 86], [156, 86], [146, 86], [138, 86], [122, 86], [96, 86], [72, 86], [58, 86], [50, 87], [38, 90], [28, 91], [-20, 92], [-60, 93], [-90, 94], [-118, 94], [-144, 94], [-160, 93], [-172, 90], [-172, 48], [-172, 8], [-172, -34], [-172, -62], [-166, -68], [-158, -70]],
  },
  marketLoop: {
    speed: 7.2,
    points: [[112, -52], [126, -46], [138, -32], [145, -12], [147, 14], [147, 36], [147, 54], [150, 66], [156, 76], [160, 82], [160, 86], [156, 86], [146, 86], [138, 86], [122, 86], [96, 86], [72, 86], [58, 86], [50, 87], [38, 90], [28, 91], [-20, 92], [-60, 93], [-90, 94], [-118, 94], [-144, 94], [-160, 93], [-172, 90], [-172, 48], [-172, 8], [-172, -34], [-172, -62], [-166, -68], [-158, -70], [-100, -70], [-40, -70], [20, -70], [62, -69], [88, -67], [104, -60], [112, -52]],
  },
};

export const PATROL_ROUTE = [[172, 41], [160, 42], [150, 44], [147, 44], [147, 54], [150, 66], [156, 76], [160, 82], [160, 86], [156, 86], [146, 86], [140, 86], [120, 86], [96, 86], [74, 86]];

export const CHARACTERS = {
  bagas: { file: 'player_bagas.glb', height: 1.82, label: 'Bagas' },
  dara: { file: 'guard_dara.glb', height: 1.74, label: 'Dara' },
  citizen: { file: 'npc_citizen.glb', height: 1.76, label: 'Citizen' },
  police: { file: 'npc_police.glb', height: 1.82, label: 'Police' },
  gangster: { file: 'enemy_gangster.glb', height: 1.84, label: 'Dock Thug' },
};

export const VEHICLES = {
  tow: { file: 'car_tow.glb', length: 6.2, width: 2.35, height: 2.55, label: 'Tirta' },
  police: { file: 'car_police.glb', length: 4.95, width: 1.95, height: 1.55, label: 'Unit 7', flip: true },
  civilian: { file: 'car_sport.glb', length: 4.55, width: 1.92, height: 1.42, label: 'Civilian Car', flip: true },
  ferry: { file: 'ferry.glb', length: 36, width: 13.7, height: 16.2, label: 'Ferry' },
  rifle: { file: 'rifle.glb', label: 'Rifle' },
};

export const WEAPON = {
  clip: 'Rifle_Walk',
  bone: 'RightHand',
  magazine: 30,
  damage: 34,
  range: 90,
};

export const PALETTE = {
  concrete: 0xd6cdbb,
  concreteDark: 0x9a9384,
  coral: 0xc9715c,
  teal: 0x4f8d8a,
  ochre: 0xd2a14a,
  blue: 0x2f6fb4,
  awningBlue: 0x2a5fa8,
  rust: 0x8a4a32,
  roofRust: 0x7a4632,
  roofTile: 0xa9543c,
  roofGrey: 0x8b8b82,
  wood: 0x8a6642,
  glass: 0x27464d,
  asphalt: 0x3a3b3c,
  sidewalk: 0xb9b0a0,
  paint: 0xe8e2d0,
  yellow: 0xe4b93a,
  ferryOrange: 0xd96a2b,
  water: 0x2d7488,
  palm: 0x3f7a43,
  neon: 0xffc861,
};

export const QUALITY = {
  shadowMap: 2048,
  pixelRatioLimit: 1.5,
  drawDistance: 320,
  trafficCars: 3,
  citizens: 4,
};

// --- deterministic maths ----------------------------------------------------

export function hashString(text) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rngFor = (name) => mulberry32(hashString(name));
export const range = (rng, min, max) => min + (max - min) * rng();
export const pick = (rng, list) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const damp = (current, target, lambda, dt) => current + (target - current) * (1 - Math.exp(-lambda * dt));

export function angleDelta(a, b) {
  let d = (b - a + Math.PI * 3) % (Math.PI * 2) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export const dampAngle = (current, target, lambda, dt) => current + angleDelta(current, target) * (1 - Math.exp(-lambda * dt));
export const distance2D = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

// --- persistence ------------------------------------------------------------

const SAVE_KEY = 'lastFerry.save.v1';

export class SaveSystem {
  constructor() {
    this.memory = null;
  }

  read() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data && data.version === 1 ? data : null;
    } catch {
      return this.memory;
    }
  }

  write(state) {
    const data = { ...state, version: 1, savedAt: new Date().toISOString() };
    this.memory = data;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  clear() {
    this.memory = null;
    try { localStorage.removeItem(SAVE_KEY); } catch { /* private window */ }
  }

  summary() {
    const data = this.read();
    if (!data) return '';
    return `$${data.money ?? 0} · ${data.district ?? 'Salt Harbor'}`;
  }
}

// --- keyboard and mouse -----------------------------------------------------

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set();
    this.pressed = new Set();
    this.mouse = { dx: 0, dy: 0, wheel: 0, left: false, right: false, clicked: false };
    this.locked = false;
    this.enabled = true;

    window.addEventListener('keydown', (event) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
      if (!this.down.has(event.code)) this.pressed.add(event.code);
      this.down.add(event.code);
    });
    window.addEventListener('keyup', (event) => this.down.delete(event.code));
    window.addEventListener('blur', () => this.down.clear());
    canvas.addEventListener('mousedown', (event) => {
      if (!this.enabled) return;
      if (!this.locked) { this.requestLock(); return; }
      if (event.button === 0) { this.mouse.left = true; this.mouse.clicked = true; }
      if (event.button === 2) this.mouse.right = true;
    });
    canvas.addEventListener('mouseup', (event) => {
      if (event.button === 0) this.mouse.left = false;
      if (event.button === 2) this.mouse.right = false;
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    window.addEventListener('mousemove', (event) => {
      if (!this.locked) return;
      this.mouse.dx += event.movementX;
      this.mouse.dy += event.movementY;
    });
    window.addEventListener('wheel', (event) => {
      if (this.locked) this.mouse.wheel += Math.sign(event.deltaY);
    }, { passive: true });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (!this.locked) {
        this.down.clear();
        this.mouse.left = false;
        this.mouse.right = false;
      }
    });
  }

  requestLock() {
    if (this.locked) return;
    try {
      const result = this.canvas.requestPointerLock?.();
      if (result?.catch) result.catch(() => {});
    } catch { /* refused by the browser */ }
  }

  release() { if (this.locked) document.exitPointerLock?.(); }
  isDown(code) { return this.down.has(code); }

  consume(code) {
    if (!this.pressed.has(code)) return false;
    this.pressed.delete(code);
    return true;
  }

  consumeClick() {
    if (!this.mouse.clicked) return false;
    this.mouse.clicked = false;
    return true;
  }

  takeLook() {
    const dx = this.mouse.dx;
    const dy = this.mouse.dy;
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    return { dx, dy };
  }

  endFrame() {
    this.pressed.clear();
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    this.mouse.wheel = 0;
    this.mouse.clicked = false;
  }
}

// --- procedural audio -------------------------------------------------------

export class AudioDirector {
  constructor() {
    this.ctx = null;
    this.started = false;
    this.engine = null;
    this.siren = null;
    this.sirenGain = null;
    this.chordIndex = 0;
  }

  start() {
    if (this.started) { this.ctx?.resume(); return; }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);
    this.started = true;
    this.ambience();
    this.music();
  }

  ambience() {
    const ctx = this.ctx;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
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
    setInterval(() => this.gull(), 9000);
  }

  gull() {
    if (this.ctx?.state !== 'running') return;
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

  music() {
    const chords = [
      [110, 164.81, 196.0],
      [98, 146.83, 174.61],
      [87.31, 130.81, 164.81],
      [98, 146.83, 220.0],
    ];
    const play = () => {
      if (this.ctx?.state !== 'running') return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const chord = chords[this.chordIndex++ % chords.length];
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
    setInterval(play, 7600);
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
    this.sirenGain.gain.setTargetAtTime(active ? volume * 0.07 : 0, this.ctx.currentTime, 0.25);
  }

  gunshot(volume = 0.5, distanceGain = 1) {
    if (this.ctx?.state !== 'running') return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.18, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 4);
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
    if (this.ctx?.state !== 'running') return;
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
    if (this.ctx?.state !== 'running') return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    [392, 493.88, 587.33, 783.99].forEach((freq, i) => {
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

  thugDown() { this.gunshot(0.16, 0.6); }

  ui() {
    if (this.ctx?.state !== 'running') return;
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