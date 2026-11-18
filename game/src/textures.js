// Last Ferry — Salt Harbor.
// Procedural canvas textures for Salt Harbor. Seeded, generated at boot, never
// downloaded. Textures are light so material colours can tint them.

import * as THREE from '../vendor/three.module.min.js';
import { rngFor, range } from './random.js';

const cache = new Map();

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}

function finish(c, repeat = 1, colorSpace = THREE.SRGBColorSpace) {
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.colorSpace = colorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function noise(ctx, size, rng, alpha, light, dark) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng() - 0.5) * alpha;
    d[i] = Math.max(0, Math.min(255, d[i] + n + (light ? 8 : 0)));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n + (light ? 7 : 0)));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n + (light ? 5 : 0)));
    if (dark && rng() < 0.015) {
      d[i] *= 0.72;
      d[i + 1] *= 0.72;
      d[i + 2] *= 0.72;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function stains(ctx, size, rng, count, colour) {
  for (let i = 0; i < count; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = range(rng, 4, 26);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, colour);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function concrete() {
  const size = 512;
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const rng = rngFor('concrete');
  ctx.fillStyle = '#cfc7b8';
  ctx.fillRect(0, 0, size, size);
  noise(ctx, size, rng, 22, false, true);
  stains(ctx, size, rng, 24, 'rgba(92,76,58,0.09)');
  ctx.strokeStyle = 'rgba(90,84,72,0.28)';
  ctx.lineWidth = 1;
  for (let y = 0; y < size; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(size, y + 0.5);
    ctx.stroke();
  }
  for (let i = 0; i < 8; i++) {
    ctx.strokeStyle = 'rgba(70,62,50,0.16)';
    ctx.beginPath();
    let x = rng() * size;
    let y = rng() * size;
    ctx.moveTo(x, y);
    for (let s = 0; s < 5; s++) {
      x += range(rng, -24, 24);
      y += range(rng, 8, 34);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return finish(c, 2);
}

function corrugated() {
  const size = 512;
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const rng = rngFor('corrugated');
  ctx.fillStyle = '#a9633f';
  ctx.fillRect(0, 0, size, size);
  for (let x = 0; x < size; x += 12) {
    const shade = 0.72 + 0.22 * Math.sin((x / 12) * Math.PI);
    ctx.fillStyle = `rgba(${Math.round(122 * shade)},${Math.round(66 * shade)},${Math.round(44 * shade)},1)`;
    ctx.fillRect(x, 0, 6, size);
    ctx.fillStyle = 'rgba(255,225,190,0.10)';
    ctx.fillRect(x + 6, 0, 3, size);
  }
  noise(ctx, size, rng, 18, false, false);
  stains(ctx, size, rng, 40, 'rgba(48,28,18,0.22)');
  stains(ctx, size, rng, 20, 'rgba(206,120,60,0.16)');
  ctx.fillStyle = 'rgba(220,210,190,0.16)';
  for (let i = 0; i < 26; i++) ctx.fillRect(rng() * size, rng() * size, range(rng, 2, 10), range(rng, 2, 8));
  return finish(c, 3);
}

function roofTile() {
  const size = 512;
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const rng = rngFor('roofTile');
  ctx.fillStyle = '#a8543c';
  ctx.fillRect(0, 0, size, size);
  const rh = 34;
  const rw = 52;
  for (let y = 0; y < size + rh; y += rh) {
    const off = (Math.floor(y / rh) % 2) * (rw / 2);
    for (let x = -rw; x < size + rw; x += rw) {
      ctx.fillStyle = `rgba(${150 + rng() * 30},${74 + rng() * 20},${52 + rng() * 16},1)`;
      ctx.fillRect(x + off + 1, y + 1, rw - 3, rh - 3);
      ctx.fillStyle = 'rgba(255,220,190,0.12)';
      ctx.fillRect(x + off + 3, y + 2, rw - 8, 3);
    }
  }
  noise(ctx, size, rng, 16, false, true);
  stains(ctx, size, rng, 24, 'rgba(40,30,26,0.18)');
  return finish(c, 3);
}

function asphalt() {
  const size = 512;
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const rng = rngFor('asphalt');
  ctx.fillStyle = '#47484a';
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng() - 0.5) * 26;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  stains(ctx, size, rng, 20, 'rgba(20,20,22,0.18)');
  ctx.strokeStyle = 'rgba(28,28,30,0.4)';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    let x = rng() * size;
    let y = rng() * size;
    ctx.moveTo(x, y);
    for (let s = 0; s < 7; s++) {
      x += range(rng, -30, 30);
      y += range(rng, -20, 20);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return finish(c, 5);
}

function sidewalk() {
  const size = 512;
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const rng = rngFor('sidewalk');
  ctx.fillStyle = '#c3baa9';
  ctx.fillRect(0, 0, size, size);
  const tile = 64;
  for (let y = 0; y < size; y += tile) {
    for (let x = 0; x < size; x += tile) {
      const v = 0.9 + rng() * 0.14;
      ctx.fillStyle = `rgba(${Math.round(196 * v)},${Math.round(188 * v)},${Math.round(170 * v)},1)`;
      ctx.fillRect(x + 2, y + 2, tile - 4, tile - 4);
    }
  }
  ctx.strokeStyle = 'rgba(100,94,82,0.5)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= size; i += tile) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }
  noise(ctx, size, rng, 18, false, true);
  stains(ctx, size, rng, 16, 'rgba(72,60,44,0.12)');
  return finish(c, 4);
}

function wood() {
  const size = 512;
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const rng = rngFor('wood');
  ctx.fillStyle = '#8a6642';
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 32) {
    const v = 0.85 + rng() * 0.25;
    ctx.fillStyle = `rgba(${Math.round(138 * v)},${Math.round(100 * v)},${Math.round(64 * v)},1)`;
    ctx.fillRect(0, y + 2, size, 28);
    ctx.fillStyle = 'rgba(60,40,24,0.45)';
    ctx.fillRect(0, y, size, 2);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = 'rgba(60,42,26,0.15)';
      ctx.fillRect(rng() * size, y + rng() * 24, range(rng, 20, 120), 1);
    }
  }
  noise(ctx, size, rng, 14, false, false);
  return finish(c, 3);
}

function awning() {
  const size = 256;
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const rng = rngFor('awning');
  ctx.fillStyle = '#2a5fa8';
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 32) {
    ctx.fillStyle = 'rgba(255,255,255,0.055)';
    ctx.fillRect(0, y, size, 16);
  }
  for (let x = 0; x < size; x += 42) {
    ctx.fillStyle = 'rgba(10,30,70,0.16)';
    ctx.fillRect(x, 0, 2, size);
  }
  noise(ctx, size, rng, 12, false, false);
  return finish(c, 1);
}

function glass() {
  const size = 256;
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const rng = rngFor('glass');
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, '#476c74');
  g.addColorStop(0.45, '#22393f');
  g.addColorStop(0.7, '#34555d');
  g.addColorStop(1, '#18282c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(255,240,210,0.2)';
  ctx.beginPath();
  ctx.moveTo(0, size * 0.2);
  ctx.lineTo(size * 0.45, 0);
  ctx.lineTo(size * 0.62, 0);
  ctx.lineTo(0, size * 0.55);
  ctx.fill();
  noise(ctx, size, rng, 10, false, false);
  return finish(c, 1);
}

function dirt() {
  const size = 512;
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const rng = rngFor('dirt');
  ctx.fillStyle = '#8d7a5f';
  ctx.fillRect(0, 0, size, size);
  noise(ctx, size, rng, 34, false, true);
  stains(ctx, size, rng, 50, 'rgba(60,46,30,0.16)');
  stains(ctx, size, rng, 30, 'rgba(210,190,150,0.12)');
  return finish(c, 4);
}

function metal() {
  const size = 256;
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const rng = rngFor('metal');
  ctx.fillStyle = '#8e918f';
  ctx.fillRect(0, 0, size, size);
  noise(ctx, size, rng, 24, false, false);
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(${rng() < 0.5 ? 60 : 220},${rng() < 0.5 ? 60 : 220},${rng() < 0.5 ? 60 : 220},0.05)`;
    ctx.fillRect(rng() * size, rng() * size, range(rng, 4, 40), 1);
  }
  return finish(c, 2);
}

const builders = { concrete, corrugated, roofTile, asphalt, sidewalk, wood, awning, glass, dirt, metal };

export function getTexture(name) {
  if (!cache.has(name)) cache.set(name, builders[name]());
  return cache.get(name);
}

export function createSignTexture(title, subtitle = '', options = {}) {
  const key = `sign:${title}:${subtitle}:${JSON.stringify(options)}`;
  if (cache.has(key)) return cache.get(key);
  const w = options.wide ? 1024 : 512;
  const h = options.tall ? 512 : 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  const bg = options.bg ?? '#1d4c63';
  const fg = options.fg ?? '#f4ead3';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = fg;
  ctx.lineWidth = options.border === false ? 0 : 10;
  if (options.border !== false) ctx.strokeRect(14, 14, w - 28, h - 28);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const family = options.serif ? 'Georgia, serif' : 'Arial, Helvetica, sans-serif';
  const titleSize = options.titleSize ?? (subtitle ? h * 0.34 : h * 0.44);
  ctx.font = `${options.bold === false ? '' : 'bold '}${titleSize}px ${family}`;
  ctx.fillText(title, w / 2, subtitle ? h * 0.42 : h * 0.52);
  if (subtitle) {
    ctx.font = `${Math.round(h * 0.12)}px ${family}`;
    ctx.globalAlpha = 0.86;
    ctx.fillText(subtitle, w / 2, h * 0.68);
    ctx.globalAlpha = 1;
  }
  if (options.arrow) {
    ctx.beginPath();
    ctx.moveTo(w * 0.14, h * 0.66);
    ctx.lineTo(w * 0.22, h * 0.58);
    ctx.lineTo(w * 0.22, h * 0.62);
    ctx.lineTo(w * 0.3, h * 0.62);
    ctx.lineTo(w * 0.3, h * 0.7);
    ctx.lineTo(w * 0.22, h * 0.7);
    ctx.lineTo(w * 0.22, h * 0.74);
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  cache.set(key, tex);
  return tex;
}

export function createLabelTexture(text, sub = '') {
  const key = `label:${text}:${sub}`;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 512, 160);
  ctx.fillStyle = 'rgba(8,20,28,0.78)';
  ctx.beginPath();
  ctx.roundRect(24, 20, 464, 120, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,196,110,0.9)';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = '#ffe1ab';
  ctx.font = 'bold 52px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, sub ? 66 : 80);
  if (sub) {
    ctx.fillStyle = '#cfe4e8';
    ctx.font = '28px Arial, Helvetica, sans-serif';
    ctx.fillText(sub, 256, 112);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  cache.set(key, tex);
  return tex;
}