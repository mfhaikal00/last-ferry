// Last Ferry — asset pipeline.
// GLB templates for the cast, vehicles and rifle; procedural canvas surfaces and
// signs; the geometry merger used by every static builder; and the pooled
// muzzle-flash / tracer effects. All assets are local files or generated in the
// browser, so the game runs offline.

import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/gltf-loader.min.js';
import { MeshoptDecoder } from '../vendor/meshopt-decoder.min.js';
import { cloneSkeleton } from '../vendor/skeleton-utils.min.js';
import { mergeGeometries } from '../vendor/geometry-utils.min.js';
import { CHARACTERS, VEHICLES, rngFor, range } from './core.js';

const FILES = {
  bagas: 'player_bagas.glb',
  dara: 'guard_dara.glb',
  citizen: 'npc_citizen.glb',
  police: 'npc_police.glb',
  gangster: 'enemy_gangster.glb',
  tow: 'car_tow.glb',
  patrol: 'car_police.glb',
  civilian: 'car_sport.glb',
  ferry: 'ferry.glb',
  rifle: 'rifle.glb',
};

const CHARACTER_KEYS = ['bagas', 'dara', 'citizen', 'police', 'gangster'];
const VEHICLE_KEYS = ['tow', 'patrol', 'civilian', 'ferry'];

export class AssetLibrary {
  constructor() {
    this.templates = {};
    this.rifle = null;
    this.stats = [];
  }

  async load(onProgress = () => {}) {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const keys = Object.keys(FILES);
    let done = 0;
    for (const key of keys) {
      const gltf = await loader.loadAsync(`./assets/${FILES[key]}`);
      const template = this.prepare(key, gltf);
      this.templates[key] = template;
      this.stats.push(template.stats);
      onProgress(++done / keys.length, key);
    }
    this.rifle = this.prepareRifle(this.templates.rifle);
    return this;
  }

  prepare(key, gltf) {
    const scene = gltf.scene;
    const isCharacter = CHARACTER_KEYS.includes(key);
    const isVehicle = VEHICLE_KEYS.includes(key);
    const cfg = isCharacter ? CHARACTERS[key] : VEHICLES[key === 'patrol' ? 'police' : key];
    let skins = 0;
    let textures = 0;
    let meshes = 0;
    let triangles = 0;
    const materials = new Set();

    scene.traverse((node) => {
      if (!node.isMesh) return;
      meshes++;
      node.castShadow = true;
      node.receiveShadow = true;
      if (node.isSkinnedMesh) {
        skins++;
        node.frustumCulled = false;
      }
      const pos = node.geometry.getAttribute('position');
      if (pos) triangles += (node.geometry.index ? node.geometry.index.count : pos.count) / 3;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      for (const mat of mats) {
        if (!mat) continue;
        materials.add(mat);
        for (const slot of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap']) {
          if (mat[slot]) textures++;
        }
      }
    });

    const initial = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
    let scale = 1;
    if (isCharacter && cfg) scale = cfg.height / Math.max(0.01, initial.y);
    if (isVehicle && cfg) {
      if (key === 'ferry') {
        // The scanned ferry lies diagonally in its own frame; point the keel down +Z.
        scene.rotation.y = -0.616;
        scene.updateMatrixWorld(true);
      }
      const oriented = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
      scale = cfg.length / Math.max(0.01, Math.max(oriented.x, oriented.z));
      if (key !== 'ferry' && oriented.x > oriented.z) scene.rotation.y = -Math.PI / 2;
    }
    scene.scale.multiplyScalar(scale);
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene);
    const centre = box.getCenter(new THREE.Vector3());
    scene.position.x -= centre.x;
    scene.position.z -= centre.z;
    scene.position.y -= box.min.y;

    const wrapper = new THREE.Group();
    wrapper.name = `template_${key}`;
    wrapper.add(scene);
    wrapper.updateMatrixWorld(true);
    const size = new THREE.Box3().setFromObject(wrapper).getSize(new THREE.Vector3());

    return {
      key,
      scene: wrapper,
      animations: gltf.animations ?? [],
      scale,
      size,
      stats: {
        key,
        meshes,
        skins,
        animations: (gltf.animations ?? []).length,
        textures,
        materials: materials.size,
        triangles: Math.round(triangles),
        height: +size.y.toFixed(2),
        length: +Math.max(size.x, size.z).toFixed(2),
      },
    };
  }

  prepareRifle(template) {
    if (!template) return null;
    const scene = template.scene;
    // Tripo rifle: the long axis is X; rotate the stock-to-muzzle line onto Z.
    if (new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3()).x > 0.01) {
      const size = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
      if (size.x > size.z) {
        scene.rotation.y = -Math.PI / 2;
        scene.updateMatrixWorld(true);
      }
    }
    const box = new THREE.Box3().setFromObject(scene);
    const target = 0.92;
    const holder = new THREE.Group();
    const pivot = new THREE.Group();
    pivot.add(scene);
    pivot.scale.setScalar(target / Math.max(box.getSize(new THREE.Vector3()).z, 0.01));
    holder.add(pivot);
    holder.updateMatrixWorld(true);
    const placed = new THREE.Box3().setFromObject(holder);
    const centre = placed.getCenter(new THREE.Vector3());
    pivot.position.y -= centre.y;
    pivot.position.x -= centre.x;
    pivot.position.z -= placed.min.z;
    holder.name = 'rifle_template';
    return { scene: holder, length: target };
  }

  cloneCharacter(key) {
    const template = this.templates[key];
    if (!template) return null;
    const root = cloneSkeleton(template.scene);
    root.name = `character_${key}`;
    root.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
      if (node.isSkinnedMesh) node.frustumCulled = false;
    });
    return { root, animations: template.animations, scale: template.scale };
  }

  cloneVehicle(key) {
    const template = this.templates[key];
    if (!template) return null;
    const root = template.scene.clone(true);
    root.name = `vehicle_${key}`;
    root.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
    });
    return root;
  }

  cloneFerry() {
    const template = this.templates.ferry;
    const root = template.scene.clone(true);
    root.name = 'ferry_salt_harbor';
    // The photogrammetry albedo reads as a black wreck at sunset; replace it
    // with clean harbour livery bands while keeping the scanned hull.
    const hull = new THREE.Color(0xc9632a);
    const cream = new THREE.Color(0xe8dcc6);
    const dark = new THREE.Color(0x2a2823);
    const windows = new THREE.Color(0x24444f);
    root.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
      const geo = node.geometry.clone();
      geo.computeBoundingBox();
      const minY = geo.boundingBox.min.y;
      const span = Math.max(0.001, geo.boundingBox.max.y - minY);
      const pos = geo.attributes.position;
      const colours = new Float32Array(pos.count * 3);
      const c = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        const h = (pos.getY(i) - minY) / span;
        if (h < 0.07) c.copy(dark);
        else if (h < 0.36) c.copy(hull);
        else if (h < 0.42) c.copy(cream);
        else if (h < 0.55) c.copy(windows);
        else c.copy(cream);
        const grain = (Math.sin(pos.getX(i) * 12.9898 + pos.getY(i) * 78.233 + pos.getZ(i) * 37.719) * 43758.5453) % 1;
        c.offsetHSL(0, 0, (grain - 0.5) * 0.035);
        colours[i * 3] = c.r;
        colours[i * 3 + 1] = c.g;
        colours[i * 3 + 2] = c.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      node.geometry = geo;
      node.material = new THREE.MeshStandardMaterial({
        vertexColors: true, color: 0xffffff, roughness: 0.72, metalness: 0.06,
        side: THREE.DoubleSide, shadowSide: THREE.DoubleSide,
      });
    });
    const funnelMat = new THREE.MeshStandardMaterial({
      color: 0xe9772c, emissive: 0x5c1f08, emissiveIntensity: 0.35, roughness: 0.66, metalness: 0.04,
    });
    const funnel = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.35, 3.3, 10), funnelMat);
    funnel.position.set(0, 13.2, -2.2);
    funnel.castShadow = true;
    root.add(funnel);
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 0.45, 10),
      new THREE.MeshStandardMaterial({ color: 0x25211e, roughness: 0.8 }),
    );
    cap.position.set(0, 15.0, -2.2);
    root.add(cap);
    return { root, size: template.size };
  }

  get debugStats() { return this.stats; }
}

export function findBone(root, fragment) {
  const needle = fragment.toLowerCase().replace(/[^a-z]/g, '');
  let found = null;
  root.traverse((node) => {
    if (found || !node.isBone) return;
    const name = node.name.toLowerCase().replace(/[^a-z]/g, '');
    if (name.endsWith(needle) || name.includes(needle)) found = node;
  });
  return found;
}

// --- geometry merger --------------------------------------------------------

export class Merger {
  constructor() {
    this.groups = new Map();
  }

  add(geometry, material, matrix) {
    const g = geometry.clone();
    if (matrix) g.applyMatrix4(matrix);
    if (!g.attributes.uv) {
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    }
    if (!this.groups.has(material.uuid)) this.groups.set(material.uuid, { material, geometries: [] });
    this.groups.get(material.uuid).geometries.push(g);
  }

  finish(parent, options = {}) {
    const { castShadow = true, receiveShadow = true } = options;
    const meshes = [];
    for (const { material, geometries } of this.groups.values()) {
      if (!geometries.length) continue;
      const merged = mergeGeometries(geometries, false);
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      parent.add(mesh);
      meshes.push(mesh);
      for (const g of geometries) g.dispose();
    }
    this.groups.clear();
    return meshes;
  }
}

// --- procedural surfaces ----------------------------------------------------

const textures = new Map();

function canvasTexture(size, paint, repeat = 1) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  paint(c.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function grain(ctx, size, rng, amount, lift = 0, fleck = false) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng() - 0.5) * amount;
    d[i] = Math.max(0, Math.min(255, d[i] + n + lift));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n + lift * 0.9));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n + lift * 0.65));
    if (fleck && rng() < 0.015) {
      d[i] *= 0.72;
      d[i + 1] *= 0.72;
      d[i + 2] *= 0.72;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function blotches(ctx, size, rng, count, colour) {
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

const painters = {
  concrete(ctx, size) {
    const rng = rngFor('concrete');
    ctx.fillStyle = '#cfc7b8';
    ctx.fillRect(0, 0, size, size);
    grain(ctx, size, rng, 22, 0, true);
    blotches(ctx, size, rng, 24, 'rgba(92,76,58,0.09)');
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
  },
  corrugated(ctx, size) {
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
    grain(ctx, size, rng, 18);
    blotches(ctx, size, rng, 40, 'rgba(48,28,18,0.22)');
    blotches(ctx, size, rng, 20, 'rgba(206,120,60,0.16)');
    ctx.fillStyle = 'rgba(220,210,190,0.16)';
    for (let i = 0; i < 26; i++) ctx.fillRect(rng() * size, rng() * size, range(rng, 2, 10), range(rng, 2, 8));
  },
  roofTile(ctx, size) {
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
    grain(ctx, size, rng, 16, 0, true);
    blotches(ctx, size, rng, 24, 'rgba(40,30,26,0.18)');
  },
  asphalt(ctx, size) {
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
    blotches(ctx, size, rng, 20, 'rgba(20,20,22,0.18)');
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
  },
  sidewalk(ctx, size) {
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
    grain(ctx, size, rng, 18, 0, true);
    blotches(ctx, size, rng, 16, 'rgba(72,60,44,0.12)');
  },
  wood(ctx, size) {
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
    grain(ctx, size, rng, 14);
  },
  awning(ctx, size) {
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
    grain(ctx, size, rng, 12);
  },
  glass(ctx, size) {
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
    grain(ctx, size, rng, 10);
  },
  dirt(ctx, size) {
    const rng = rngFor('dirt');
    ctx.fillStyle = '#8d7a5f';
    ctx.fillRect(0, 0, size, size);
    grain(ctx, size, rng, 34, 0, true);
    blotches(ctx, size, rng, 50, 'rgba(60,46,30,0.16)');
    blotches(ctx, size, rng, 30, 'rgba(210,190,150,0.12)');
  },
  metal(ctx, size) {
    const rng = rngFor('metal');
    ctx.fillStyle = '#8e918f';
    ctx.fillRect(0, 0, size, size);
    grain(ctx, size, rng, 24);
    for (let i = 0; i < 90; i++) {
      const v = rng() < 0.5 ? 60 : 220;
      ctx.fillStyle = `rgba(${v},${v},${v},0.05)`;
      ctx.fillRect(rng() * size, rng() * size, range(rng, 4, 40), 1);
    }
  },
};

const REPEAT = { concrete: 2, corrugated: 3, roofTile: 3, asphalt: 5, sidewalk: 4, wood: 3, awning: 1, glass: 1, dirt: 4, metal: 2 };
const SIZE = { concrete: 512, corrugated: 512, roofTile: 512, asphalt: 512, sidewalk: 512, wood: 512, awning: 256, glass: 256, dirt: 512, metal: 256 };

export function getTexture(name) {
  if (!textures.has(name)) {
    textures.set(name, canvasTexture(SIZE[name], painters[name], REPEAT[name]));
  }
  return textures.get(name);
}

export function createSignTexture(title, subtitle = '', options = {}) {
  const key = `sign:${title}:${subtitle}:${JSON.stringify(options)}`;
  if (textures.has(key)) return textures.get(key);
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
  textures.set(key, tex);
  return tex;
}

export function createLabelTexture(text, sub = '') {
  const key = `label:${text}:${sub}`;
  if (textures.has(key)) return textures.get(key);
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
  textures.set(key, tex);
  return tex;
}

export function createCloudTexture() {
  const c = document.createElement('canvas');
  c.width = 768;
  c.height = 320;
  const ctx = c.getContext('2d');
  const puffs = [
    [80, 220, 52], [145, 195, 66], [215, 168, 78], [300, 152, 92],
    [395, 150, 100], [490, 160, 86], [570, 175, 72], [650, 200, 58],
    [710, 220, 42], [260, 205, 80], [430, 205, 92], [560, 215, 60],
  ];
  const base = ctx.createRadialGradient(384, 238, 20, 384, 238, 330);
  base.addColorStop(0, 'rgba(120,88,72,0.28)');
  base.addColorStop(1, 'rgba(120,88,72,0)');
  ctx.fillStyle = base;
  ctx.fillRect(0, 120, 768, 200);
  for (const [x, y, r] of puffs) {
    const g = ctx.createRadialGradient(x, y - r * 0.2, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,246,229,0.95)');
    g.addColorStop(0.55, 'rgba(255,226,200,0.62)');
    g.addColorStop(0.82, 'rgba(248,200,168,0.22)');
    g.addColorStop(1, 'rgba(240,190,160,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// --- transient effects ------------------------------------------------------

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,220,150,0.9)');
  g.addColorStop(0.6, 'rgba(255,170,80,0.25)');
  g.addColorStop(1, 'rgba(255,150,60,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.rng = rngFor('effects');
    const glow = glowTexture();
    this.spark = new THREE.SpriteMaterial({ map: glow, color: 0xffb15a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.smokeMat = new THREE.SpriteMaterial({ map: glow, color: 0x8d8b84, transparent: true, opacity: 0.35, depthWrite: false });
    this.tracerMat = new THREE.LineBasicMaterial({ color: 0xffd58a, transparent: true, opacity: 0.8 });
  }

  flash(position) {
    const sprite = new THREE.Sprite(this.spark.clone());
    sprite.position.copy(position);
    sprite.scale.set(0.65, 0.65, 1);
    this.scene.add(sprite);
    this.items.push({ object: sprite, life: 0.07, max: 0.07, kind: 'flash' });
  }

  tracer(from, to) {
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, to]), this.tracerMat.clone());
    this.scene.add(line);
    this.items.push({ object: line, life: 0.09, max: 0.09, kind: 'tracer' });
  }

  impact(position, normal = null, colour = 0xffb15a) {
    for (let i = 0; i < 4; i++) {
      const sprite = new THREE.Sprite(this.spark.clone());
      sprite.material.color = new THREE.Color(colour);
      sprite.position.copy(position);
      sprite.scale.setScalar(range(this.rng, 0.08, 0.2));
      const vel = new THREE.Vector3(range(this.rng, -1, 1), range(this.rng, 0.2, 1.4), range(this.rng, -1, 1));
      this.scene.add(sprite);
      this.items.push({ object: sprite, life: 0.3, max: 0.3, kind: 'spark', vel, gravity: -4 });
    }
  }

  smoke(position) {
    const sprite = new THREE.Sprite(this.smokeMat.clone());
    sprite.position.copy(position);
    sprite.scale.setScalar(range(this.rng, 0.5, 1.0));
    this.scene.add(sprite);
    this.items.push({
      object: sprite, life: range(this.rng, 0.7, 1.3), max: 1.3, kind: 'smoke',
      vel: new THREE.Vector3(range(this.rng, -0.3, 0.3), 0.8, range(this.rng, -0.3, 0.3)),
    });
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.life -= dt;
      if (item.life <= 0) {
        this.scene.remove(item.object);
        item.object.geometry?.dispose();
        item.object.material?.dispose();
        this.items.splice(i, 1);
        continue;
      }
      const alpha = item.life / item.max;
      if (item.object.material) item.object.material.opacity = alpha * (item.kind === 'smoke' ? 0.4 : 0.9);
      if (item.vel) {
        item.object.position.addScaledVector(item.vel, dt);
        if (item.gravity) item.vel.y += item.gravity * dt;
      }
      if (item.kind === 'smoke') item.object.scale.addScalar(dt * 0.8);
    }
  }
}