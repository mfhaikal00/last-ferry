// Last Ferry — the static world.
// Collision proxies, road mathematics, terrain and sea, the sky, the lift
// bridge, the ferry terminal and the assembly pass that puts Salt Harbor
// together. Geometry is merged per material to keep draw calls small.

import * as THREE from '../vendor/three.module.min.js';
import { BRIDGE, NODES, ROADS, WORLD } from './core.js';
import { Merger, createCloudTexture, createSignTexture, getTexture } from './assets.js';
import { buildBuildings } from './buildings.js';
import { buildDockYard, buildParkingLot, buildProps, buildStreetFurniture, buildWeaponRack, addDistrictSign } from './props.js';

const CELL = 10;

export class CollisionWorld {
  constructor() {
    this.boxes = [];
    this.grid = new Map();
    this.stamp = 1;
  }

  addBox(x, z, hx, hz, y0, y1, yaw, label, tag = 'prop') {
    const angle = yaw ?? 0;
    const box = {
      x, z, hx, hz, y0, y1,
      yaw: angle,
      cos: Math.cos(angle),
      sin: Math.sin(angle),
      label,
      tag,
      mark: 0,
    };
    box.radius = Math.hypot(hx, hz);
    this.boxes.push(box);
    return box;
  }

  addBoxAt(x, z, w, d, y0, y1, yaw, label, tag = 'prop') {
    return this.addBox(x, z, w / 2, d / 2, y0, y1, yaw ?? 0, label, tag);
  }

  addWall(x1, z1, x2, z2, thickness, y0, y1, label, tag = 'wall') {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.hypot(dx, dz);
    if (length < 0.01) return;
    // The proxy's local +Z follows the wall segment.
    this.addBox((x1 + x2) / 2, (z1 + z2) / 2, thickness / 2, length / 2, y0, y1, Math.atan2(dx, dz), label, tag);
  }

  build() {
    this.grid.clear();
    for (const box of this.boxes) {
      const ex = Math.abs(box.hx * box.cos) + Math.abs(box.hz * box.sin);
      const ez = Math.abs(box.hx * box.sin) + Math.abs(box.hz * box.cos);
      for (let gx = Math.floor((box.x - ex) / CELL); gx <= Math.floor((box.x + ex) / CELL); gx++) {
        for (let gz = Math.floor((box.z - ez) / CELL); gz <= Math.floor((box.z + ez) / CELL); gz++) {
          const key = gx * 100003 + gz;
          if (!this.grid.has(key)) this.grid.set(key, []);
          this.grid.get(key).push(box);
        }
      }
    }
  }

  query(x, z, radius = 0) {
    const out = [];
    this.stamp++;
    for (let gx = Math.floor((x - radius) / CELL); gx <= Math.floor((x + radius) / CELL); gx++) {
      for (let gz = Math.floor((z - radius) / CELL); gz <= Math.floor((z + radius) / CELL); gz++) {
        const cell = this.grid.get(gx * 100003 + gz);
        if (!cell) continue;
        for (const box of cell) {
          if (box.mark === this.stamp) continue;
          box.mark = this.stamp;
          out.push(box);
        }
      }
    }
    return out;
  }

  // Resolve a circle footprint. `y` is the feet height, and the capsule spans
  // y+0.12..y+1.62, so a 14 cm kerb never grabs it.
  resolveCircle(pos, radius, y) {
    let pushes = 0;
    const low = y + 0.12;
    const high = y + 1.62;
    for (let pass = 0; pass < 3; pass++) {
      let moved = false;
      for (const box of this.query(pos.x, pos.z, radius + 2.5)) {
        if (high < box.y0 || low > box.y1) continue;
        const dx = pos.x - box.x;
        const dz = pos.z - box.z;
        const reach = box.radius + radius;
        if (dx * dx + dz * dz > reach * reach) continue;
        const lx = dx * box.cos - dz * box.sin;
        const lz = dx * box.sin + dz * box.cos;
        const cx = Math.max(-box.hx, Math.min(box.hx, lx));
        const cz = Math.max(-box.hz, Math.min(box.hz, lz));
        let nx = lx - cx;
        let nz = lz - cz;
        let dist = Math.hypot(nx, nz);
        if (dist >= radius) continue;
        let push;
        if (dist < 1e-5) {
          const ox = box.hx - Math.abs(lx);
          const oz = box.hz - Math.abs(lz);
          if (ox < oz) { nx = Math.sign(lx) || 1; nz = 0; push = ox + radius; }
          else { nx = 0; nz = Math.sign(lz) || 1; push = oz + radius; }
        } else {
          push = radius - dist;
          nx /= dist;
          nz /= dist;
        }
        pos.x += (nx * box.cos + nz * box.sin) * push;
        pos.z += (-nx * box.sin + nz * box.cos) * push;
        pushes++;
        moved = true;
      }
      if (!moved) break;
    }
    return pushes;
  }

  // Minimum translation between two yaw-rotated footprints.
  static obbOverlap(a, b) {
    const axes = [[a.cos, -a.sin], [a.sin, a.cos], [b.cos, -b.sin], [b.sin, b.cos]];
    let depth = Infinity;
    let axis = null;
    for (const [ax, az] of axes) {
      const projA = Math.abs(a.hx * (a.cos * ax - a.sin * az)) + Math.abs(a.hz * (a.sin * ax + a.cos * az));
      const projB = Math.abs(b.hx * (b.cos * ax - b.sin * az)) + Math.abs(b.hz * (b.sin * ax + b.cos * az));
      const dist = Math.abs((b.x - a.x) * ax + (b.z - a.z) * az);
      const overlap = projA + projB - dist;
      if (overlap <= 0) return null;
      if (overlap < depth) {
        depth = overlap;
        const dir = (b.x - a.x) * ax + (b.z - a.z) * az >= 0 ? -1 : 1;
        axis = [ax * dir, az * dir];
      }
    }
    return { depth, nx: axis[0], nz: axis[1] };
  }

  // Push a vehicle OBB out of statics. Returns the deepest hit so the caller can
  // scrub speed along that normal instead of stopping dead.
  resolveVehicle(car, y, ignoreLabels = null) {
    let hit = null;
    for (const box of this.query(car.x, car.z, car.radius + 3)) {
      if (y + 1.4 < box.y0 || y + 0.2 > box.y1) continue;
      if (ignoreLabels && ignoreLabels.includes(box.label)) continue;
      const overlap = CollisionWorld.obbOverlap(car, box);
      if (!overlap) continue;
      car.x += overlap.nx * overlap.depth;
      car.z += overlap.nz * overlap.depth;
      if (!hit || overlap.depth > hit.depth) hit = { ...overlap, box };
    }
    return hit;
  }

  raycast(origin, direction, maxDistance) {
    let best = maxDistance;
    let bestBox = null;
    const steps = Math.ceil(maxDistance / CELL) + 1;
    const seen = new Set();
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * maxDistance;
      for (const box of this.query(origin.x + direction.x * t, origin.z + direction.z * t, CELL)) {
        if (seen.has(box)) continue;
        seen.add(box);
        const tHit = rayBox(origin, direction, box);
        if (tHit !== null && tHit >= 0 && tHit < best) {
          best = tHit;
          bestBox = box;
        }
      }
    }
    return bestBox ? { distance: best, box: bestBox } : null;
  }

  stats() {
    const byTag = {};
    for (const box of this.boxes) byTag[box.tag] = (byTag[box.tag] ?? 0) + 1;
    return { total: this.boxes.length, byTag };
  }
}

function rayBox(origin, dir, box) {
  const ox = origin.x - box.x;
  const oz = origin.z - box.z;
  const lox = ox * box.cos - oz * box.sin;
  const loz = ox * box.sin + oz * box.cos;
  const ldx = dir.x * box.cos - dir.z * box.sin;
  const ldz = dir.x * box.sin + dir.z * box.cos;
  let tmin = 0;
  let tmax = Infinity;
  const slab = (o, d, h) => {
    if (Math.abs(d) < 1e-8) return o >= -h && o <= h;
    let t1 = (-h - o) / d;
    let t2 = (h - o) / d;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    return tmin <= tmax;
  };
  if (!slab(lox, ldx, box.hx)) return null;
  if (!slab(loz, ldz, box.hz)) return null;
  if (!slab(origin.y - (box.y0 + box.y1) / 2, dir.y, (box.y1 - box.y0) / 2)) return null;
  return tmin;
}

// --- roads, heights and water ----------------------------------------------

function smooth01(t) {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

export function bridgeHeightAt(x, z = BRIDGE.z) {
  if (Math.abs(z - BRIDGE.z) > 9.5) return WORLD.roadY;
  if (x <= BRIDGE.westRampX0 || x >= BRIDGE.eastRampX1) return WORLD.roadY;
  if (x < BRIDGE.deckX0) {
    return THREE.MathUtils.lerp(WORLD.roadY, WORLD.bridgeY, smooth01((x - BRIDGE.westRampX0) / (BRIDGE.deckX0 - BRIDGE.westRampX0)));
  }
  if (x <= BRIDGE.deckX1) return WORLD.bridgeY;
  return THREE.MathUtils.lerp(WORLD.roadY, WORLD.bridgeY, smooth01((BRIDGE.eastRampX1 - x) / (BRIDGE.eastRampX1 - BRIDGE.deckX1)));
}

export function heightAtXZ(x, z) {
  return Math.abs(z - BRIDGE.z) < 8.6 && x > BRIDGE.westRampX0 - 2 && x < BRIDGE.eastRampX1 + 2
    ? bridgeHeightAt(x, z)
    : WORLD.roadY;
}

export function sampleRoad(name, step = 3.5) {
  const def = ROADS[name];
  const curve = new THREE.CatmullRomCurve3(def.points.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'catmullrom', 0.18);
  const length = curve.getLength();
  const count = Math.max(4, Math.ceil(length / step));
  const sampled = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const p = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    sampled.push({
      x: p.x, z: p.z,
      y: def.bridge ? bridgeHeightAt(p.x, p.z) : WORLD.roadY,
      tx: tangent.x, tz: tangent.z, t,
    });
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
  const positions = new Float32Array(n * 6);
  const uvs = new Float32Array(n * 4);
  const indices = [];
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const len = Math.hypot(p.tx ?? 1, p.tz ?? 0) || 1;
    const nx = -(p.tz ?? 0) / len;
    const nz = (p.tx ?? 1) / len;
    const half = width / 2;
    positions.set([p.x + nx * half, p.y, p.z + nz * half, p.x - nx * half, p.y, p.z - nz * half], i * 6);
    uvs.set([0, p.t * 30 * uvScale, 1, p.t * 30 * uvScale], i * 4);
    if (i < n - 1) indices.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
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
    const x = p.x + (p.ox ?? 0) * side * 0.02;
    const z = p.z + (p.oz ?? 1) * side * 0.02;
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

// Walkable surface: the bridge deck only counts when the caller is already near
// it, so the alley below stays walkable; the pier deck and sidewalks sit above
// the road plane.
export function walkHeightAt(x, z, currentY = 0, vehicle = false) {
  if (Math.abs(z - BRIDGE.z) < 11.5 && x > BRIDGE.westRampX0 - 3 && x < BRIDGE.eastRampX1 + 3) {
    const deck = bridgeHeightAt(x, z);
    if (vehicle) return currentY > deck - 1.5 ? deck : WORLD.roadY;
    const onRamp = x < BRIDGE.deckX0 || x > BRIDGE.deckX1;
    return currentY > deck - (onRamp ? 2.2 : 1.2) ? deck : WORLD.roadY;
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

// True where there is water instead of walkable ground. The pier is the only
// deck that projects past the quay.
export function isWaterAt(x, z) {
  const pier = x > -132 && x < -104 && z > 109 && z < 144;
  if (z > 108.2 && !pier) return true;
  if (x > 75.6 && x < 124.4 && z > 25.2 && z < 108.2) return true;
  return false;
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
    if (!best || d < best.distance) best = { distance: d, x: px, z: pz, index: i - 1, t };
  }
  return best;
}

export function polylineLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  return total;
}

// --- shared materials -------------------------------------------------------

export function createMaterials() {
  const std = (options) => new THREE.MeshStandardMaterial(options);
  return {
    asphalt: std({ map: getTexture('asphalt'), color: 0xffffff, roughness: 0.94, metalness: 0.02 }),
    sidewalk: std({ map: getTexture('sidewalk'), color: 0xffffff, roughness: 0.9 }),
    concrete: std({ map: getTexture('concrete'), color: 0xffffff, roughness: 0.88 }),
    concreteTint: std({ map: getTexture('concrete'), color: 0xd9cbb4, roughness: 0.9 }),
    paint: std({ color: 0xe9e2cd, roughness: 0.7 }),
    yellow: std({ color: 0xdfb63b, roughness: 0.75 }),
    dark: std({ color: 0x2c2f31, roughness: 0.9 }),
    metal: std({ map: getTexture('metal'), color: 0x9aa0a0, roughness: 0.55, metalness: 0.35 }),
    wood: std({ map: getTexture('wood'), color: 0xffffff, roughness: 0.9 }),
    woodDark: std({ map: getTexture('wood'), color: 0x8f7050, roughness: 0.92 }),
    glass: std({ map: getTexture('glass'), color: 0xbcd6da, roughness: 0.18, metalness: 0.55 }),
    emissiveWarm: std({ color: 0xffd28a, emissive: 0xffb14d, emissiveIntensity: 1.4, roughness: 0.5 }),
    rust: std({ map: getTexture('corrugated'), color: 0xffffff, roughness: 0.84 }),
    tarp: std({ map: getTexture('awning'), color: 0xffffff, roughness: 0.86 }),
  };
}

// --- sky and water ----------------------------------------------------------

export function buildSky(scene) {
  const sunDir = new THREE.Vector3(-0.62, 0.3, 0.28).normalize();
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x2b5f80) },
      midColor: { value: new THREE.Color(0xb97b62) },
      horizonColor: { value: new THREE.Color(0xf1d2a8) },
      sunDir: { value: sunDir },
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = normalize(w.xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 topColor, midColor, horizonColor, sunDir;
      varying vec3 vWorld;
      void main() {
        float h = clamp(vWorld.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 col = mix(horizonColor, midColor, smoothstep(0.48, 0.6, h));
        col = mix(col, topColor, smoothstep(0.58, 0.94, h));
        float sun = max(dot(normalize(vWorld), normalize(sunDir)), 0.0);
        col += vec3(1.0, 0.62, 0.28) * pow(sun, 180.0) * 1.15;
        col += vec3(1.0, 0.55, 0.25) * pow(sun, 6.0) * 0.055;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(760, 32, 20), skyMat);
  sky.frustumCulled = false;
  sky.name = 'salt_harbor_sky';
  scene.add(sky);

  const cloudMat = new THREE.MeshBasicMaterial({
    map: createCloudTexture(), transparent: true, depthWrite: false, opacity: 0.72,
    color: 0xffdcc2, side: THREE.DoubleSide, fog: true,
  });
  const band = new THREE.Group();
  band.name = 'cloud_band';
  const clouds = [
    [-240, 92, -320, 260, 86, -0.2], [90, 120, -360, 300, 96, 0.15],
    [-380, 86, 40, 240, 70, 0.5], [300, 130, 80, 300, 92, -0.45],
    [420, 100, -160, 250, 76, 0.9], [-120, 76, 380, 300, 80, 0.1],
    [40, 105, 420, 260, 72, -0.1],
  ];
  for (const [x, y, z, w, h, rot] of clouds) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), cloudMat);
    plane.position.set(x, y, z);
    plane.lookAt(0, y, 0);
    plane.rotation.z = rot * 0.12;
    plane.renderOrder = -1;
    band.add(plane);
  }
  scene.add(band);
  return sunDir;
}

export function buildWater(scene, sunDir) {
  const geo = new THREE.PlaneGeometry(1500, 1500, 90, 90);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      sunDir: { value: sunDir.clone() },
      deep: { value: new THREE.Color(0x0e4c5c) },
      shallow: { value: new THREE.Color(0x2f8795) },
      sky: { value: new THREE.Color(0xf0b98a) },
      fogColor: { value: new THREE.Color(0xe0b494) },
      fogNear: { value: WORLD.fogNear },
      fogFar: { value: WORLD.fogFar },
    },
    vertexShader: `
      uniform float time;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      void main() {
        vec3 p = position;
        p.y += sin(p.x * 0.11 + time * 0.9) * 0.14 + sin(p.z * 0.16 - time * 1.2) * 0.1;
        vec4 world = modelMatrix * vec4(p, 1.0);
        vWorld = world.xyz;
        vNormalW = normalize(vec3(-0.16 * cos(p.x * 0.11 + time * 0.9), 1.0, 0.12 * cos(p.z * 0.16 - time * 1.2)));
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: `
      uniform float time;
      uniform vec3 sunDir, deep, shallow, sky, fogColor;
      uniform float fogNear, fogFar;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorld);
        vec3 n = normalize(vNormalW);
        float fres = pow(1.0 - max(dot(n, viewDir), 0.0), 2.2);
        vec3 col = mix(deep, shallow, 0.42);
        col = mix(col, sky, fres * 0.55);
        vec3 halfway = normalize(normalize(sunDir) + viewDir);
        col += vec3(1.0, 0.78, 0.48) * pow(max(dot(n, halfway), 0.0), 220.0) * 2.8;
        float ripple = 0.5 + 0.5 * sin(vWorld.x * 0.9 + time * 1.6 + sin(vWorld.z * 0.6));
        col += vec3(0.06, 0.10, 0.10) * ripple * 0.2;
        col = mix(col, fogColor, smoothstep(fogNear, fogFar, length(cameraPosition - vWorld)) * 0.85);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const water = new THREE.Mesh(geo, mat);
  water.position.y = WORLD.seaLevel;
  water.name = 'harbour_water';
  water.receiveShadow = false;
  scene.add(water);
  return mat;
}

// --- terrain, quays and pier ------------------------------------------------

export function buildTerrain(scene, collision, materials) {
  const m = new Merger();
  const addLand = (x0, x1, z0, z1, label) => {
    m.add(new THREE.BoxGeometry(x1 - x0, 2.6, z1 - z0), materials.concreteTint,
      new THREE.Matrix4().makeTranslation((x0 + x1) / 2, -1.3, (z0 + z1) / 2));
    collision.addBox((x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / 2, (z1 - z0) / 2, -3, 0, 0, label, 'terrain');
  };
  addLand(-210, 200, -165, 25, 'terrain:north');
  addLand(-210, 75, 25, 108, 'terrain:west-bank');
  addLand(125, 200, 25, 108, 'terrain:east-bank');

  const wall = (x, z, w, d, label) => {
    m.add(new THREE.BoxGeometry(w, 2.6, d), materials.concrete, new THREE.Matrix4().makeTranslation(x, -1.25, z));
    collision.addBox(x, z, w / 2, d / 2, -3, 0.05, 0, label, 'quay');
  };
  wall(75, 66.5, 1.1, 83, 'quay:canal-west');
  wall(125, 66.5, 1.1, 83, 'quay:canal-east');
  wall(-67.5, 108.5, 285, 1.2, 'quay:north-west');
  wall(162.5, 108.5, 75, 1.2, 'quay:north-east');
  wall(100, 25, 50, 1.1, 'quay:canal-head');

  const parapet = (x0, x1, z) => {
    const w = x1 - x0;
    if (w <= 0) return;
    m.add(new THREE.BoxGeometry(w, 0.95, 0.42), materials.concrete, new THREE.Matrix4().makeTranslation((x0 + x1) / 2, 0.48, z));
    collision.addBox((x0 + x1) / 2, z, w / 2, 0.28, 0, 1.0, 0, `quay-parapet:${Math.round(x0)}`, 'quay');
  };
  parapet(-210, -132, 108);
  parapet(-104, 75, 108);
  parapet(125, 200, 108);
  for (const [x, z0, z1, label] of [[75, 25, 108, 'canal:west-edge'], [125, 25, 108, 'canal:east-edge']]) {
    collision.addWall(x, z0, x, z1, 0.3, 0, 1.2, label, 'water-edge');
  }
  collision.addWall(-210, 108, -132, 108, 0.3, 0, 1.2, 'sea:edge-west', 'water-edge');
  collision.addWall(-104, 108, 75, 108, 0.3, 0, 1.2, 'sea:edge-centre', 'water-edge');
  collision.addWall(125, 108, 200, 108, 0.3, 0, 1.2, 'sea:edge-east', 'water-edge');

  const pier = { x0: -132, x1: -104, z0: 108, z1: 144 };
  const pw = pier.x1 - pier.x0;
  const pd = pier.z1 - pier.z0;
  m.add(new THREE.BoxGeometry(pw, 0.34, pd), materials.wood,
    new THREE.Matrix4().makeTranslation((pier.x0 + pier.x1) / 2, WORLD.pierY - 0.17, (pier.z0 + pier.z1) / 2));
  collision.addBox((pier.x0 + pier.x1) / 2, (pier.z0 + pier.z1) / 2, pw / 2, pd / 2, 0.1, WORLD.pierY, 0, 'pier:deck', 'pier');
  for (let x = pier.x0 + 2; x < pier.x1; x += 5) {
    for (let z = pier.z0 + 3; z < pier.z1; z += 6) {
      m.add(new THREE.CylinderGeometry(0.16, 0.2, 2.0, 6), materials.woodDark, new THREE.Matrix4().makeTranslation(x, -0.5, z));
    }
  }
  // Side rails and the sea-end barrier; the land end stays open as the entrance.
  for (const xSide of [pier.x0 + 0.2, pier.x1 - 0.2]) {
    for (let z = pier.z0 + 1; z < pier.z1; z += 2.2) {
      m.add(new THREE.CylinderGeometry(0.055, 0.055, 1.05, 6), materials.metal,
        new THREE.Matrix4().makeTranslation(xSide, WORLD.pierY + 0.5, z));
    }
    collision.addWall(xSide, pier.z0, xSide, pier.z1, 0.22, WORLD.pierY, WORLD.pierY + 1.15, 'pier:railing', 'railing');
  }
  m.add(new THREE.BoxGeometry(pw, 0.08, 0.1), materials.metal,
    new THREE.Matrix4().makeTranslation((pier.x0 + pier.x1) / 2, WORLD.pierY + 1.02, pier.z1));
  collision.addWall(pier.x0, pier.z1, pier.x1, pier.z1, 0.26, WORLD.pierY, WORLD.pierY + 1.15, 'pier:end-rail', 'railing');
  // Corner posts close the rail ends so a capsule cannot squeeze past them.
  for (const [x, z] of [[pier.x0 + 0.2, pier.z1], [pier.x1 - 0.2, pier.z1]]) {
    collision.addBox(x, z, 0.32, 0.32, WORLD.pierY, WORLD.pierY + 1.15, 0, 'pier:corner-rail', 'railing');
  }
  for (let z = pier.z1; z < 160; z += 5) {
    for (const x of [pier.x0 + 2, pier.x0 + 12, pier.x0 + 24]) {
      m.add(new THREE.CylinderGeometry(0.18, 0.22, 2.0, 6), materials.woodDark, new THREE.Matrix4().makeTranslation(x, -0.5, z));
    }
  }
  return m.finish(scene);
}

// --- road ribbons and markings ---------------------------------------------

export function buildRoads(scene, collision, materials) {
  const surface = new Merger();
  const walks = new Merger();
  const kerbs = new Merger();
  const markings = new Merger();
  const sampledRoads = {};

  for (const [name, def] of Object.entries(ROADS)) {
    const sampled = sampleRoad(name, def.bridge ? 2.4 : 3.2);
    sampledRoads[name] = sampled;
    const surf = ribbonGeometry(sampled.sampled, def.width, 0.09);
    surface.add(surf, materials.asphalt);
    surf.dispose();
    const own = sampled.sampled.map((p) => ({ x: p.x, z: p.z }));
    for (const side of [-1, 1]) {
      const walk = offsetSampled(sampled.sampled, side * (def.width / 2 + def.sidewalk / 2), 0.14);
      const edge = offsetSampled(sampled.sampled, side * (def.width / 2), 0);
      const valid = walk.map((p) => {
        const nearest = nearestOnPolyline(own, p.x, p.z);
        if (nearest && nearest.distance < def.width / 2 + 1.4) return false;
        for (const [otherName, other] of Object.entries(ROADS)) {
          if (otherName === name) continue;
          const near = nearestOnPolyline(other.points.map(([x, z]) => ({ x, z })), p.x, p.z);
          if (near && near.distance < other.width / 2 + 3.2) return false;
        }
        return true;
      });
      let start = -1;
      for (let i = 0; i <= walk.length; i++) {
        const ok = i < walk.length && valid[i];
        if (ok && start < 0) start = i;
        if (!ok && start >= 0) {
          if (i - start >= 2) {
            const walkRun = walk.slice(start, i);
            const geo = ribbonGeometry(walkRun, def.sidewalk, 0.12);
            walks.add(geo, materials.sidewalk);
            geo.dispose();
            const curb = kerbGeometry(edge.slice(start, i), side, 0.14);
            kerbs.add(curb, materials.concrete);
            curb.dispose();
          }
          start = -1;
        }
      }
    }
    addCenterDashes(markings, sampled.sampled, materials.paint, def.twoWay ? 3.2 : 1.2);
    if (def.width >= 10) {
      for (const side of [-1, 1]) addEdgeLine(markings, sampled.sampled, materials.paint, side * (def.width / 2 - 0.55));
    }
  }

  for (const [x, z] of [[112, -52], [-172, -70], [-172, 90], [147, 54], [-146, 98], [-86, 96]]) {
    const pad = new THREE.CircleGeometry(6.4, 24);
    pad.rotateX(-Math.PI / 2);
    surface.add(pad, materials.asphalt, new THREE.Matrix4().makeTranslation(x, WORLD.roadY + 0.012, z));
    pad.dispose();
  }

  addCrosswalk(markings, materials.paint, -146, -70, 0, 9);
  addCrosswalk(markings, materials.paint, 68, -70, 0, 9);
  addCrosswalk(markings, materials.paint, -118, 94, Math.PI / 2, 3.4);
  addCrosswalk(markings, materials.paint, -172, -40, Math.PI / 2, 9);
  addCrosswalk(markings, materials.paint, 147, 30, 0, 9);

  for (let i = 0; i < 4; i++) addStrip(markings, materials.paint, -140, 97 + i * 3.1, 48, 0.18, 0);
  for (let i = 0; i < 3; i++) addStrip(markings, materials.paint, -132 + i * 18, 101, 0.3, 12, 0);
  addStrip(markings, materials.yellow, -110, 106.6, 64, 0.5, 0);
  for (let x = 58; x < 112; x += 4) {
    addStrip(markings, (x / 4) % 2 < 1 ? materials.yellow : materials.paint, x, -63.6, 2, 0.34, 0);
  }

  const roadMesh = surface.finish(scene);
  const walkMesh = walks.finish(scene);
  kerbs.finish(scene);
  markings.finish(scene, { castShadow: false, receiveShadow: true });
  return { sampledRoads, roadMeshes: [...roadMesh, ...walkMesh] };
}

function addCenterDashes(merger, sampled, material, dashLength) {
  let distance = 0;
  let next = 2;
  for (let i = 1; i < sampled.length; i++) {
    const a = sampled[i - 1];
    const b = sampled[i];
    const seg = Math.hypot(b.x - a.x, b.z - a.z);
    distance += seg;
    if (distance < next) continue;
    const t = (distance - next) / Math.max(seg, 0.001);
    const x = THREE.MathUtils.lerp(a.x, b.x, t);
    const z = THREE.MathUtils.lerp(a.z, b.z, t);
    const geo = new THREE.BoxGeometry(0.18, 0.02, dashLength);
    merger.add(geo, material, new THREE.Matrix4().compose(
      new THREE.Vector3(x, (a.y ?? WORLD.roadY) + 0.022, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(b.x - a.x, b.z - a.z), 0)),
      new THREE.Vector3(1, 1, 1),
    ));
    geo.dispose();
    next += 7.5;
  }
}

function addEdgeLine(merger, sampled, material, offset) {
  const points = offsetSampled(sampled, offset, 0.02);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const seg = Math.hypot(b.x - a.x, b.z - a.z);
    if (seg < 0.2) continue;
    const geo = new THREE.BoxGeometry(0.13, 0.02, seg);
    merger.add(geo, material, new THREE.Matrix4().compose(
      new THREE.Vector3((a.x + b.x) / 2, (a.y ?? WORLD.roadY) + 0.02, (a.z + b.z) / 2),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(b.x - a.x, b.z - a.z), 0)),
      new THREE.Vector3(1, 1, 1),
    ));
    geo.dispose();
  }
}

function addCrosswalk(merger, material, x, z, yaw, width) {
  const count = Math.floor(width / 0.9);
  for (let i = 0; i < count; i++) {
    const off = (i - (count - 1) / 2) * 0.9;
    addStrip(merger, material, x + Math.cos(yaw) * off, z - Math.sin(yaw) * off, 0.46, 3.6, yaw);
  }
}

function addStrip(merger, material, x, z, w, d, yaw) {
  const geo = new THREE.BoxGeometry(w, 0.02, d);
  merger.add(geo, material, new THREE.Matrix4().compose(
    new THREE.Vector3(x, WORLD.roadY + 0.028, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
    new THREE.Vector3(1, 1, 1),
  ));
  geo.dispose();
}

// --- lift bridge ------------------------------------------------------------

export function buildBridge(scene, collision, materials) {
  const m = new Merger();
  const rails = new Merger();
  const half = BRIDGE.halfWidth;
  const z = BRIDGE.z;
  const slab = new THREE.BoxGeometry(BRIDGE.deckX1 - BRIDGE.deckX0, 0.38, half * 2 - 0.4);
  m.add(slab, materials.concrete, new THREE.Matrix4().makeTranslation((BRIDGE.deckX0 + BRIDGE.deckX1) / 2, WORLD.bridgeY - 0.25, z));
  slab.dispose();

  const westLen = Math.hypot(BRIDGE.deckX0 - BRIDGE.westRampX0, WORLD.bridgeY - WORLD.roadY);
  const west = new THREE.BoxGeometry(westLen, 0.34, half * 2 - 0.4);
  const westAngle = Math.atan2(WORLD.bridgeY - WORLD.roadY, BRIDGE.deckX0 - BRIDGE.westRampX0);
  m.add(west, materials.concrete, new THREE.Matrix4().compose(
    new THREE.Vector3((BRIDGE.deckX0 + BRIDGE.westRampX0) / 2, (WORLD.bridgeY + WORLD.roadY) / 2 - 0.23, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, westAngle)),
    new THREE.Vector3(1, 1, 1),
  ));
  west.dispose();

  const eastLen = Math.hypot(BRIDGE.eastRampX1 - BRIDGE.deckX1, WORLD.bridgeY - WORLD.roadY);
  const east = new THREE.BoxGeometry(eastLen, 0.34, half * 2 - 0.4);
  const eastAngle = Math.atan2(WORLD.bridgeY - WORLD.roadY, BRIDGE.eastRampX1 - BRIDGE.deckX1);
  m.add(east, materials.concrete, new THREE.Matrix4().compose(
    new THREE.Vector3((BRIDGE.eastRampX1 + BRIDGE.deckX1) / 2, (WORLD.bridgeY + WORLD.roadY) / 2 - 0.23, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -eastAngle)),
    new THREE.Vector3(1, 1, 1),
  ));
  east.dispose();

  for (const px of [78, 98, 118, 132]) {
    const pier = new THREE.BoxGeometry(2.0, WORLD.bridgeY + 1.2, half * 1.8);
    m.add(pier, materials.concrete, new THREE.Matrix4().makeTranslation(px, (WORLD.bridgeY - 1.6) / 2, z));
    pier.dispose();
  }
  for (const ax of [BRIDGE.deckX0 - 1.2, BRIDGE.deckX1 + 1.2]) {
    const ab = new THREE.BoxGeometry(2.4, WORLD.bridgeY + 0.4, half * 2);
    m.add(ab, materials.concreteTint, new THREE.Matrix4().makeTranslation(ax, (WORLD.bridgeY + 0.4) / 2 - 0.2, z));
    ab.dispose();
  }

  for (const side of [-1, 1]) {
    const end = side === -1 ? 130 : BRIDGE.eastRampX1;
    for (let x = BRIDGE.westRampX0; x < end; x += 3) {
      const h = bridgeHeightAt(x);
      const post = new THREE.BoxGeometry(0.12, 1.15, 0.12);
      rails.add(post, materials.metal, new THREE.Matrix4().makeTranslation(x, h + 0.58, z + side * (half - 0.25)));
      post.dispose();
      const bar = new THREE.BoxGeometry(3, 0.1, 0.12);
      rails.add(bar, materials.paint, new THREE.Matrix4().makeTranslation(x + 1.5, h + 1.12, z + side * (half - 0.25)));
      bar.dispose();
      collision.addBox(x + 1.5, z + side * (half - 0.25), 1.5, 0.22, h, h + 1.2, 0, 'bridge:railing', 'railing');
    }
    const railZ = z + side * (half - 0.25);
    collision.addWall(BRIDGE.westRampX0, railZ, BRIDGE.deckX0, railZ, 0.3, WORLD.roadY - 0.2, WORLD.bridgeY + 1.2, 'bridge:railing-ramp', 'railing');
    collision.addWall(BRIDGE.deckX0, railZ, end, railZ, 0.3, WORLD.bridgeY, WORLD.bridgeY + 1.2, 'bridge:railing-deck', 'railing');
    if (side === 1) collision.addWall(BRIDGE.eastRampX1 - 16, railZ, BRIDGE.eastRampX1, railZ, 0.3, WORLD.roadY - 0.2, WORLD.bridgeY + 1.2, 'bridge:railing-east-ramp', 'railing');
  }
  const bridgeMeshes = m.finish(scene);
  rails.finish(scene);
  return bridgeMeshes;
}

// --- terminal ---------------------------------------------------------------

export function buildTerminal(scene, collision, materials) {
  const m = new Merger();
  const floor = new THREE.PlaneGeometry(74, 20);
  floor.rotateX(-Math.PI / 2);
  m.add(floor, materials.concreteTint, new THREE.Matrix4().makeTranslation(-112, 0.14, 100));
  floor.dispose();
  collision.addBox(-112, 100, 37, 10, -1, 0.15, 0, 'terminal:forecourt', 'terrain');

  for (let x = -140; x <= -80; x += 5) {
    const b = new THREE.CylinderGeometry(0.14, 0.17, 0.8, 8);
    m.add(b, materials.metal, new THREE.Matrix4().makeTranslation(x, 0.4, 108.6));
    b.dispose();
    collision.addBox(x, 108.6, 0.18, 0.18, 0, 0.85, 0, 'terminal:bollard', 'prop');
  }
  const edge = new THREE.BoxGeometry(0.5, 0.02, 13);
  m.add(edge, materials.yellow, new THREE.Matrix4().makeTranslation(-110, 0.16, 100));
  edge.dispose();

  const gang = new THREE.BoxGeometry(4.4, 0.16, 10);
  m.add(gang, materials.woodDark, new THREE.Matrix4().compose(
    new THREE.Vector3(-118, 1.05, 149),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.06, 0, 0)),
    new THREE.Vector3(1, 1, 1),
  ));
  gang.dispose();
  collision.addBox(-118, 149, 2.2, 5, 0.5, 1.2, 0, 'terminal:gangway', 'pier');

  const meshes = m.finish(scene, { castShadow: false, receiveShadow: true });
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(19, 4.2),
    new THREE.MeshStandardMaterial({
      map: createSignTexture('FERRY TERMINAL', 'SALT HARBOR · PIER 4', { bg: '#153f52', fg: '#f5e6c8', wide: true }),
      roughness: 0.7,
    }),
  );
  sign.position.set(-112, 6.8, 82.4);
  sign.castShadow = true;
  scene.add(sign);
  collision.addBox(-112, 82.4, 9.5, 0.3, 4.7, 8.9, 0, 'terminal:signboard', 'sign');
  return meshes;
}

// --- assembly ---------------------------------------------------------------

export function buildWorld(scene, collision, assets) {
  const materials = createMaterials();
  const terrainMeshes = buildTerrain(scene, collision, materials);
  const roadData = buildRoads(scene, collision, materials);
  const bridgeMeshes = buildBridge(scene, collision, materials);
  const terminalMeshes = buildTerminal(scene, collision, materials);
  buildStreetFurniture(scene, collision, materials);
  const buildingData = buildBuildings(scene, collision, materials);
  const propData = buildProps(scene, collision, materials);

  const b = WORLD.bounds;
  collision.addWall(b.minX, b.minZ, b.maxX, b.minZ, 1, 0, 4, 'bounds:north', 'bounds');
  collision.addWall(b.minX, b.maxZ, b.maxX, b.maxZ, 1, 0, 4, 'bounds:south', 'bounds');
  collision.addWall(b.minX, b.minZ, b.minX, b.maxZ, 1, 0, 4, 'bounds:west', 'bounds');
  collision.addWall(b.maxX, b.minZ, b.maxX, b.maxZ, 1, 0, 4, 'bounds:east', 'bounds');

  buildParkingLot(scene, collision, materials);
  buildDockYard(scene, collision, materials);

  const nodes = {};
  for (const [name, node] of Object.entries(NODES)) {
    const obj = new THREE.Object3D();
    obj.name = name;
    obj.position.set(node.x, walkHeightAt(node.x, node.z, 0), node.z);
    obj.rotation.y = node.yaw;
    obj.userData = { area: node.area, node: true };
    scene.add(obj);
    nodes[name] = obj;
  }

  const ferry = assets.cloneFerry();
  ferry.root.position.set(-112, WORLD.seaLevel - 1.5, 138);
  ferry.root.rotation.y = Math.PI / 2;
  ferry.root.name = 'ferry_salt_harbor';
  scene.add(ferry.root);
  // The hull proxy sits below the pier deck so it cannot shove a walker off the
  // pier; only the superstructure blocks at deck height.
  collision.addBox(-112, 138, 18, 7, WORLD.seaLevel - 2, 0.45, 0, 'ferry:hull', 'ferry');
  collision.addBox(-112, 138, 9, 3.4, 0.45, 5.5, 0, 'ferry:superstructure', 'ferry');

  const lineMat = new THREE.MeshStandardMaterial({ color: 0x5a4a36, roughness: 0.9 });
  for (const x of [-128, -96]) {
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 26, 5), lineMat);
    line.position.set(x + 6, 2.4, 123);
    line.rotation.x = Math.PI / 2.25;
    scene.add(line);
  }

  const rack = buildWeaponRack(assets, materials);
  rack.position.set(-157, 0, -83.5);
  rack.rotation.y = 0.35;
  scene.add(rack);
  collision.addBox(-157, -83.5, 1.6, 0.6, 0, 2.2, 0.35, 'weaponRack_workshop', 'prop');

  addDistrictSign(scene, collision, 'SALT HARBOR', 'WORKSHOP · FISH MARKET · FERRY', -184, -70, Math.PI / 2, 6.2, 2.2);
  addDistrictSign(scene, collision, 'CANAL BEND', 'BRIDGE AHEAD', 138, 20, -Math.PI / 2, 5.0, 1.8);
  addDistrictSign(scene, collision, 'BRIDGE', 'SALT HARBOR', 166, 96, Math.PI, 5.0, 1.8);

  return {
    materials,
    ferry,
    nodes,
    roadData,
    weaponRack: rack,
    buildingBlocks: buildingData.blocks,
    props: propData,
    meshes: { terrainMeshes, bridgeMeshes, terminalMeshes },
  };
}