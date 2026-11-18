// Last Ferry — Salt Harbor.
// Road geometry helpers shared by the renderer, the traffic paths and the
// minimap. Roads are Catmull-Rom polylines with a fixed width, kerbs and
// sidewalks; the bridge deck has its own height profile so the alley can pass
// beneath the west landing.

import * as THREE from '../vendor/three.module.min.js';
import { BRIDGE, ROADS, WORLD } from './config.js';

export function bridgeHeightAt(x, z = BRIDGE.z) {
  if (Math.abs(z - BRIDGE.z) > 9.5) return WORLD.roadY;
  if (x <= BRIDGE.westRampX0 || x >= BRIDGE.eastRampX1) return WORLD.roadY;
  if (x < BRIDGE.deckX0) {
    const t = (x - BRIDGE.westRampX0) / (BRIDGE.deckX0 - BRIDGE.westRampX0);
    return THREE.MathUtils.lerp(WORLD.roadY, WORLD.bridgeY, smooth(t));
  }
  if (x <= BRIDGE.deckX1) return WORLD.bridgeY;
  const t = (BRIDGE.eastRampX1 - x) / (BRIDGE.eastRampX1 - BRIDGE.deckX1);
  return THREE.MathUtils.lerp(WORLD.roadY, WORLD.bridgeY, smooth(t));
}

function smooth(t) {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

export function heightAtXZ(x, z) {
  if (Math.abs(z - BRIDGE.z) < 8.6 && x > BRIDGE.westRampX0 - 2 && x < BRIDGE.eastRampX1 + 2) {
    return bridgeHeightAt(x, z);
  }
  return WORLD.roadY;
}

export function sampleRoad(name, step = 3.5) {
  const def = ROADS[name];
  const pts = def.points.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.18);
  const length = curve.getLength();
  const count = Math.max(4, Math.ceil(length / step));
  const sampled = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const p = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    const y = def.bridge ? bridgeHeightAt(p.x, p.z) : WORLD.roadY;
    sampled.push({ x: p.x, z: p.z, y, tx: tangent.x, tz: tangent.z, t });
  }
  return { name, def, sampled, length };
}

export function offsetSampled(sampled, offset, yOffset = 0) {
  return sampled.map((p) => {
    const len = Math.hypot(p.tx, p.tz) || 1;
    const nx = -p.tz / len;
    const nz = p.tx / len;
    return { ...p, x: p.x + nx * offset, z: p.z + nz * offset, y: p.y + yOffset, ox: nx, oz: nz };
  });
}

export function ribbonGeometry(points, width, uvScale = 0.08) {
  const n = points.length;
  const positions = new Float32Array(n * 2 * 3);
  const uvs = new Float32Array(n * 2 * 2);
  const indices = [];
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const tx = p.tx ?? 1;
    const tz = p.tz ?? 0;
    const len = Math.hypot(tx, tz) || 1;
    const nx = -tz / len;
    const nz = tx / len;
    const half = width / 2;
    positions[i * 6] = p.x + nx * half;
    positions[i * 6 + 1] = p.y;
    positions[i * 6 + 2] = p.z + nz * half;
    positions[i * 6 + 3] = p.x - nx * half;
    positions[i * 6 + 4] = p.y;
    positions[i * 6 + 5] = p.z - nz * half;
    uvs[i * 4] = 0;
    uvs[i * 4 + 1] = p.t * 30 * uvScale;
    uvs[i * 4 + 2] = 1;
    uvs[i * 4 + 3] = p.t * 30 * uvScale;
    if (i < n - 1) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

export function kerbGeometry(points, side, height) {
  const verts = [];
  const idx = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const nx = p.ox ?? 0;
    const nz = p.oz ?? 1;
    const x = p.x + nx * side * 0.02;
    const z = p.z + nz * side * 0.02;
    verts.push(x, p.y - height, z, x, p.y, z);
    if (i < points.length - 1) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Returns the walkable surface height at a point, respecting the bridge deck
// only when the query is already close to deck height. That is what lets the
// player walk under the bridge at ground level and over it from the ramps.
export function walkHeightAt(x, z, currentY = 0, vehicle = false) {
  if (Math.abs(z - BRIDGE.z) < 11.5 && x > BRIDGE.westRampX0 - 3 && x < BRIDGE.eastRampX1 + 3) {
    const deck = bridgeHeightAt(x, z);
    if (vehicle) return deck;
    const onRamp = x < BRIDGE.deckX0 || x > BRIDGE.deckX1;
    if (currentY > deck - (onRamp ? 2.2 : 1.2)) return deck;
    return WORLD.roadY;
  }
  if (x > -132 && x < -104 && z > 108 && z < 144) return WORLD.pierY;
  let best = WORLD.roadY;
  for (const def of Object.values(ROADS)) {
    const nearest = nearestOnPolyline(def.points.map(([px, pz]) => ({ x: px, z: pz })), x, z);
    if (!nearest) continue;
    if (nearest.distance <= def.width / 2) return WORLD.roadY;
    if (nearest.distance <= def.width / 2 + def.sidewalk) best = Math.max(best, WORLD.sidewalkY);
  }
  return best;
}

export function polylineLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  return total;
}

export function nearestOnPolyline(points, x, z) {
  let best = null;
  for (let i = 1; i < points.length; i++) {
    const ax = points[i - 1].x ?? points[i - 1][0];
    const az = points[i - 1].z ?? points[i - 1][1];
    const bx = points[i].x ?? points[i][0];
    const bz = points[i].z ?? points[i][1];
    const dx = bx - ax;
    const dz = bz - az;
    const len2 = dx * dx + dz * dz;
    const t = len2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2)) : 0;
    const px = ax + dx * t;
    const pz = az + dz * t;
    const d = Math.hypot(x - px, z - pz);
    if (!best || d < best.distance) {
      best = { distance: d, x: px, z: pz, index: i - 1, t };
    }
  }
  return best;
}