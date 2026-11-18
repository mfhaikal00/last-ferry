// Last Ferry — Salt Harbor.
// Salt Harbor terrain: quays, water, the canal, the road ribbons, the lift bridge
// and the ferry terminal structures. Geometry is merged by material so the whole
// static city costs a small number of draw calls.

import * as THREE from '../vendor/three.module.min.js';
import { mergeGeometries } from '../vendor/geometry-utils.min.js';
import { BRIDGE, PALETTE, POI, ROADS, WORLD } from './config.js';
import { bridgeHeightAt, heightAtXZ, kerbGeometry, nearestOnPolyline, offsetSampled, ribbonGeometry, sampleRoad } from './roads.js';
import { createSignTexture, getTexture } from './textures.js';

export class Merger {
  constructor() {
    this.groups = new Map();
  }

  add(geometry, material, matrix) {
    const g = geometry.clone();
    if (matrix) g.applyMatrix4(matrix);
    if (!g.attributes.uv) {
      const count = g.attributes.position.count;
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
    }
    const key = material.uuid;
    if (!this.groups.has(key)) this.groups.set(key, { material, geometries: [] });
    this.groups.get(key).geometries.push(g);
  }

  finish(parent, { castShadow = true, receiveShadow = true } = {}) {
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

export function createMaterials() {
  const asphalt = new THREE.MeshStandardMaterial({
    map: getTexture('asphalt'), color: 0xffffff, roughness: 0.94, metalness: 0.02,
  });
  const sidewalk = new THREE.MeshStandardMaterial({
    map: getTexture('sidewalk'), color: 0xffffff, roughness: 0.9, metalness: 0,
  });
  const concrete = new THREE.MeshStandardMaterial({
    map: getTexture('concrete'), color: 0xffffff, roughness: 0.88, metalness: 0,
  });
  const concreteTint = new THREE.MeshStandardMaterial({
    map: getTexture('concrete'), color: 0xd9cbb4, roughness: 0.9,
  });
  const paint = new THREE.MeshStandardMaterial({ color: 0xe9e2cd, roughness: 0.7 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xdfb63b, roughness: 0.75 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2c2f31, roughness: 0.9 });
  const metal = new THREE.MeshStandardMaterial({ map: getTexture('metal'), color: 0x9aa0a0, roughness: 0.55, metalness: 0.35 });
  const wood = new THREE.MeshStandardMaterial({ map: getTexture('wood'), color: 0xffffff, roughness: 0.9 });
  const woodDark = new THREE.MeshStandardMaterial({ map: getTexture('wood'), color: 0x8f7050, roughness: 0.92 });
  const glass = new THREE.MeshStandardMaterial({
    map: getTexture('glass'), color: 0xbcd6da, roughness: 0.18, metalness: 0.55,
  });
  const emissiveWarm = new THREE.MeshStandardMaterial({
    color: 0xffd28a, emissive: 0xffb14d, emissiveIntensity: 1.4, roughness: 0.5,
  });
  const rust = new THREE.MeshStandardMaterial({ map: getTexture('corrugated'), color: 0xffffff, roughness: 0.84 });
  const tarp = new THREE.MeshStandardMaterial({ map: getTexture('awning'), color: 0xffffff, roughness: 0.86 });
  return {
    asphalt, sidewalk, concrete, concreteTint, paint, yellow, dark, metal, wood, woodDark, glass,
    emissiveWarm, rust, tarp,
  };
}

export function buildSky(scene) {
  const sunDir = new THREE.Vector3(-0.62, 0.3, 0.28).normalize();
  const skyGeo = new THREE.SphereGeometry(760, 32, 20);
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
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 horizonColor;
      uniform vec3 sunDir;
      varying vec3 vWorld;
      void main() {
        float h = clamp(vWorld.y * 0.5 + 0.5, 0.0, 1.0);
        float horizon = smoothstep(0.34, 0.5, h);
        vec3 col = mix(horizonColor, midColor, smoothstep(0.48, 0.6, h));
        col = mix(col, topColor, smoothstep(0.58, 0.94, h));
        float sun = max(dot(normalize(vWorld), normalize(sunDir)), 0.0);
        col += vec3(1.0, 0.62, 0.28) * pow(sun, 180.0) * 1.15;
        col += vec3(1.0, 0.55, 0.25) * pow(sun, 6.0) * 0.055;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.frustumCulled = false;
  sky.name = 'salt_harbor_sky';
  scene.add(sky);

  // A handful of flat cumulus cards, deterministic and unlit.
  const cloudTexture = makeCloudTexture();
  const cloudMat = new THREE.MeshBasicMaterial({
    map: cloudTexture, transparent: true, depthWrite: false, opacity: 0.72, color: 0xffdcc2, side: THREE.DoubleSide, fog: true,
  });
  const cloudGroup = new THREE.Group();
  cloudGroup.name = 'cloud_band';
  const clouds = [
    [-240, 92, -320, 260, 86, -0.2],
    [90, 120, -360, 300, 96, 0.15],
    [-380, 86, 40, 240, 70, 0.5],
    [300, 130, 80, 300, 92, -0.45],
    [420, 100, -160, 250, 76, 0.9],
    [-120, 76, 380, 300, 80, 0.1],
    [40, 105, 420, 260, 72, -0.1],
  ];
  for (const [x, y, z, w, h, rot] of clouds) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), cloudMat);
    plane.position.set(x, y, z);
    plane.lookAt(0, y, 0);
    plane.rotation.z = rot * 0.12;
    plane.renderOrder = -1;
    cloudGroup.add(plane);
  }
  scene.add(cloudGroup);
  return sunDir;
}

function makeCloudTexture() {
  const c = document.createElement('canvas');
  c.width = 768;
  c.height = 320;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 768, 320);
  const puffs = [
    [80, 220, 52], [145, 195, 66], [215, 168, 78], [300, 152, 92],
    [395, 150, 100], [490, 160, 86], [570, 175, 72], [650, 200, 58],
    [710, 220, 42], [260, 205, 80], [430, 205, 92], [560, 215, 60],
  ];
  // A warm shadowed base makes the cloud sit in the sky rather than glow as a smudge.
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
        float w = sin(p.x * 0.11 + time * 0.9) * 0.14 + sin(p.z * 0.16 - time * 1.2) * 0.1;
        p.y += w;
        vec4 world = modelMatrix * vec4(p, 1.0);
        vWorld = world.xyz;
        vNormalW = normalize(vec3(-0.16 * cos(p.x * 0.11 + time * 0.9), 1.0, 0.12 * cos(p.z * 0.16 - time * 1.2)));
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 sunDir;
      uniform vec3 deep;
      uniform vec3 shallow;
      uniform vec3 sky;
      uniform vec3 fogColor;
      uniform float fogNear;
      uniform float fogFar;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorld);
        vec3 n = normalize(vNormalW);
        float fres = pow(1.0 - max(dot(n, viewDir), 0.0), 2.2);
        vec3 col = mix(deep, shallow, 0.42);
        col = mix(col, sky, fres * 0.55);
        vec3 sun = normalize(sunDir);
        vec3 halfway = normalize(sun + viewDir);
        float spec = pow(max(dot(n, halfway), 0.0), 220.0);
        col += vec3(1.0, 0.78, 0.48) * spec * 2.8;
        float ripple = 0.5 + 0.5 * sin(vWorld.x * 0.9 + time * 1.6 + sin(vWorld.z * 0.6));
        col += vec3(0.06, 0.10, 0.10) * ripple * 0.2;
        float d = length(cameraPosition - vWorld);
        float fog = smoothstep(fogNear, fogFar, d);
        col = mix(col, fogColor, fog * 0.85);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const water = new THREE.Mesh(geo, mat);
  water.position.y = WORLD.seaLevel;
  water.name = 'harbour_water';
  water.receiveShadow = false;
  scene.add(water);

  return mat;
}

export function buildTerrain(scene, collision, materials) {
  const m = new Merger();
  const landMat = materials.concreteTint;
  const wallMat = materials.concrete;
  const addLand = (x0, x1, z0, z1, label) => {
    const w = x1 - x0;
    const d = z1 - z0;
    const geo = new THREE.BoxGeometry(w, 2.6, d);
    m.add(geo, landMat, new THREE.Matrix4().makeTranslation((x0 + x1) / 2, -1.3, (z0 + z1) / 2));
    collision.addBox((x0 + x1) / 2, (z0 + z1) / 2, w / 2, d / 2, -3, 0, 0, label, 'terrain');
  };
  addLand(-210, 200, -165, 25, 'terrain:north');
  addLand(-210, 75, 25, 108, 'terrain:west-bank');
  addLand(125, 200, 25, 108, 'terrain:east-bank');

  // Canal and harbour retaining walls give the land a real edge.
  const wallH = 2.6;
  const addWallMesh = (x, z, w, d, label) => {
    m.add(new THREE.BoxGeometry(w, wallH, d), wallMat, new THREE.Matrix4().makeTranslation(x, -wallH / 2 + 0.05, z));
    collision.addBox(x, z, w / 2, d / 2, -3, 0.05, 0, label, 'quay');
  };
  addWallMesh(75, 66.5, 1.1, 83, 'quay:canal-west');
  addWallMesh(125, 66.5, 1.1, 83, 'quay:canal-east');
  addWallMesh(-67.5, 108.5, 285, 1.2, 'quay:north-west');
  addWallMesh(162.5, 108.5, 75, 1.2, 'quay:north-east');
  addWallMesh(100, 25, 50, 1.1, 'quay:canal-head');

  // Low concrete parapet along the sea wall, with the pier opening left clear.
  const parapet = (x0, x1, z) => {
    const w = x1 - x0;
    if (w <= 0) return;
    m.add(new THREE.BoxGeometry(w, 0.95, 0.42), materials.concrete, new THREE.Matrix4().makeTranslation((x0 + x1) / 2, 0.48, z));
    collision.addBox((x0 + x1) / 2, z, w / 2, 0.28, 0, 1.0, 0, `quay-parapet:${Math.round(x0)}`, 'quay');
  };
  parapet(-210, -132, 108);
  parapet(-104, 75, 108);
  parapet(125, 200, 108);
  // Invisible canal-edge barriers: the visible stone edges are below the player's
  // capsule, so these keep the walker out of the water without extra geometry.
  for (const [x, z0, z1, label] of [[75, 25, 108, 'canal:west-edge'], [125, 25, 108, 'canal:east-edge']]) {
    collision.addWall(x, z0, x, z1, 0.3, 0, 1.2, label, 'water-edge');
  }
  collision.addWall(-210, 108, -132, 108, 0.3, 0, 1.2, 'sea:edge-west', 'water-edge');
  collision.addWall(-104, 108, 75, 108, 0.3, 0, 1.2, 'sea:edge-centre', 'water-edge');
  collision.addWall(125, 108, 200, 108, 0.3, 0, 1.2, 'sea:edge-east', 'water-edge');

  // Pier planks and piles.
  const pier = { x0: -132, x1: -104, z0: 108, z1: 144 };
  const pw = pier.x1 - pier.x0;
  const pd = pier.z1 - pier.z0;
  m.add(new THREE.BoxGeometry(pw, 0.34, pd), materials.wood, new THREE.Matrix4().makeTranslation((pier.x0 + pier.x1) / 2, WORLD.pierY - 0.17, (pier.z0 + pier.z1) / 2));
  collision.addBox((pier.x0 + pier.x1) / 2, (pier.z0 + pier.z1) / 2, pw / 2, pd / 2, 0.1, WORLD.pierY, 0, 'pier:deck', 'pier');
  for (let x = pier.x0 + 2; x < pier.x1; x += 5) {
    for (let z = pier.z0 + 3; z < pier.z1; z += 6) {
      m.add(new THREE.CylinderGeometry(0.16, 0.2, 2.0, 6), materials.woodDark, new THREE.Matrix4().makeTranslation(x, -0.5, z));
    }
  }
  // Pier railings and end barrier (the water is not walkable).
  const railMaterial = materials.metal;
  for (const xSide of [pier.x0 + 0.2, pier.x1 - 0.2]) {
    for (let z = pier.z0 + 1; z < pier.z1; z += 2.2) {
      m.add(new THREE.CylinderGeometry(0.055, 0.055, 1.05, 6), railMaterial, new THREE.Matrix4().makeTranslation(xSide, WORLD.pierY + 0.5, z));
    }
    collision.addWall(xSide, pier.z0, xSide, pier.z1, 0.16, WORLD.pierY, WORLD.pierY + 1.1, 'pier:railing', 'railing');
  }
  m.add(new THREE.BoxGeometry(pw, 0.08, 0.1), railMaterial, new THREE.Matrix4().makeTranslation((pier.x0 + pier.x1) / 2, WORLD.pierY + 1.02, pier.z0));
  collision.addWall(pier.x0, pier.z0, pier.x1, pier.z0, 0.2, WORLD.pierY, WORLD.pierY + 1.1, 'pier:end-rail', 'railing');
  collision.addWall(pier.x0, pier.z1, pier.x1, pier.z1, 0.2, WORLD.pierY, WORLD.pierY + 1.1, 'pier:end-rail', 'railing');
  for (let z = pier.z1; z < 160; z += 5) {
    for (const x of [pier.x0 + 2, pier.x0 + 12, pier.x0 + 24]) {
      m.add(new THREE.CylinderGeometry(0.18, 0.22, 2.0, 6), materials.woodDark, new THREE.Matrix4().makeTranslation(x, -0.5, z));
    }
  }

  return m.finish(scene);
}

// Road ribbons, sidewalk ribbons, kerbs, markings, junctions.
export function buildRoads(scene, collision, materials) {
  const m = new Merger();
  const sidewalkM = new Merger();
  const kerbM = new Merger();
  const markingM = new Merger();
  const roadMeshes = [];
  const sampledRoads = {};

  for (const [name, def] of Object.entries(ROADS)) {
    const sampled = sampleRoad(name, def.bridge ? 2.4 : 3.2);
    sampledRoads[name] = sampled;
    const surf = ribbonGeometry(sampled.sampled, def.width, 0.09);
    m.add(surf, materials.asphalt);
    surf.dispose();
    const ownPts = sampled.sampled.map((p) => ({ x: p.x, z: p.z }));
    for (const side of [-1, 1]) {
      const walk = offsetSampled(sampled.sampled, side * (def.width / 2 + def.sidewalk / 2), 0.14);
      const edge = offsetSampled(sampled.sampled, side * (def.width / 2), 0);
      const valid = walk.map((p) => {
        const own = nearestOnPolyline(ownPts, p.x, p.z);
        if (own && own.distance < def.width / 2 + 1.4) return false;
        for (const [otherName, other] of Object.entries(ROADS)) {
          if (otherName === name) continue;
          const near = nearestOnPolyline(other.points.map(([x, z]) => ({ x, z })), p.x, p.z);
          if (near && near.distance < other.width / 2 + 3.2) return false;
        }
        return true;
      });
      // Build contiguous walkable runs, so no sidewalk ribbon crosses a road
      // mouth at a junction or folds over the asphalt on a tight bend.
      let start = -1;
      for (let i = 0; i <= walk.length; i++) {
        const ok = i < walk.length && valid[i];
        if (ok && start < 0) start = i;
        if (!ok && start >= 0) {
          const end = i;
          if (end - start >= 2) {
            const walkRun = walk.slice(start, end);
            const walkGeo = ribbonGeometry(walkRun, def.sidewalk, 0.12);
            sidewalkM.add(walkGeo, materials.sidewalk);
            walkGeo.dispose();
            const edgeRun = edge.slice(start, end);
            const curb = kerbGeometry(edgeRun, side, 0.14);
            kerbM.add(curb, materials.concrete);
            curb.dispose();
          }
          start = -1;
        }
      }
    }
    // Centre dashes (two-way) and solid edge lines.
    if (def.twoWay) {
      addCenterDashes(markingM, sampled.sampled, materials.paint, def.width);
    } else {
      addCenterDashes(markingM, sampled.sampled, materials.paint, def.width, 1.2);
    }
    if (def.width >= 10) {
      for (const side of [-1, 1]) {
        addEdgeLine(markingM, sampled.sampled, materials.paint, side * (def.width / 2 - 0.55));
      }
    }
  }

  // Junction pads hide the seams where ribbons meet.
  const padJunctions = [
    [112, -52], [-172, -70], [-172, 90], [147, 54], [-146, 98], [-86, 96],
  ];
  for (const [x, z] of padJunctions) {
    const pad = new THREE.CircleGeometry(6.4, 24);
    pad.rotateX(-Math.PI / 2);
    m.add(pad, materials.asphalt, new THREE.Matrix4().makeTranslation(x, WORLD.roadY + 0.012, z));
    pad.dispose();
  }

  // Crosswalks at the workshop, the market and the terminal.
  addCrosswalk(markingM, materials.paint, -146, -70, 0, 9);
  addCrosswalk(markingM, materials.paint, 68, -70, 0, 9);
  addCrosswalk(markingM, materials.paint, -118, 94, Math.PI / 2, 3.4);
  addCrosswalk(markingM, materials.paint, -172, -40, Math.PI / 2, 9);
  addCrosswalk(markingM, materials.paint, 147, 30, 0, 9);

  // The terrace in front of the terminal: queue lanes and a wide truck apron.
  for (let i = 0; i < 4; i++) {
    const z = 97 + i * 3.1;
    addStrip(markingM, materials.paint, -140, z, 48, 0.18, 0);
  }
  for (let i = 0; i < 3; i++) {
    const x = -132 + i * 18;
    addStrip(markingM, materials.paint, x, 101, 0.3, 12, 0);
  }
  addStrip(markingM, materials.yellow, -110, 106.6, 64, 0.5, 0);
  // Painted curb at the market frontage.
  for (let x = 58; x < 112; x += 4) {
    addStrip(markingM, (x / 4) % 2 < 1 ? materials.yellow : materials.paint, x, -63.6, 2, 0.34, 0);
  }

  const roadMesh = m.finish(scene);
  const walkMesh = sidewalkM.finish(scene);
  kerbM.finish(scene);
  markingM.finish(scene, { castShadow: false, receiveShadow: true });
  roadMeshes.push(...roadMesh, ...walkMesh);

  // Sidewalk edge proxy: a low kerb is walkable, but the quay-edge parapets and
  // the bridge railings are the real boundaries; no invisible wall is placed
  // along ordinary kerbs so the player can step up freely.
  return { sampledRoads, roadMeshes };
}

function addCenterDashes(merger, sampled, material, width, dashLength = 3.2) {
  let distance = 0;
  let nextDash = 2;
  for (let i = 1; i < sampled.length; i++) {
    const a = sampled[i - 1];
    const b = sampled[i];
    const seg = Math.hypot(b.x - a.x, b.z - a.z);
    distance += seg;
    if (distance >= nextDash) {
      const t = (distance - nextDash) / Math.max(seg, 0.001);
      const x = THREE.MathUtils.lerp(a.x, b.x, t);
      const z = THREE.MathUtils.lerp(a.z, b.z, t);
      const yaw = Math.atan2(b.x - a.x, b.z - a.z);
      const geo = new THREE.BoxGeometry(0.18, 0.02, dashLength);
      merger.add(geo, material, new THREE.Matrix4().compose(
        new THREE.Vector3(x, (a.y ?? WORLD.roadY) + 0.022, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
        new THREE.Vector3(1, 1, 1),
      ));
      geo.dispose();
      nextDash += 7.5;
    }
  }
}

function addEdgeLine(merger, sampled, material, offset) {
  const points = offsetSampled(sampled, offset, 0.02);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const seg = Math.hypot(b.x - a.x, b.z - a.z);
    if (seg < 0.2) continue;
    const yaw = Math.atan2(b.x - a.x, b.z - a.z);
    const geo = new THREE.BoxGeometry(0.13, 0.02, seg);
    merger.add(geo, material, new THREE.Matrix4().compose(
      new THREE.Vector3((a.x + b.x) / 2, (a.y ?? WORLD.roadY) + 0.02, (a.z + b.z) / 2),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
      new THREE.Vector3(1, 1, 1),
    ));
    geo.dispose();
  }
}

function addCrosswalk(merger, material, x, z, yaw, width) {
  const count = Math.floor(width / 0.9);
  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) / 2) * 0.9;
    const dx = Math.cos(yaw) * offset;
    const dz = -Math.sin(yaw) * offset;
    addStrip(merger, material, x + dx, z + dz, 0.46, 3.6, yaw);
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

export function buildBridge(scene, collision, materials) {
  const m = new Merger();
  const rail = new Merger();
  const half = BRIDGE.halfWidth;
  const z = BRIDGE.z;
  // Structural slab, flat across the canal, with a visible underside clearance
  // over the alley at the west landing.
  const slab = new THREE.BoxGeometry(BRIDGE.deckX1 - BRIDGE.deckX0, 0.38, half * 2 - 0.4);
  m.add(slab, materials.concrete, new THREE.Matrix4().makeTranslation((BRIDGE.deckX0 + BRIDGE.deckX1) / 2, WORLD.bridgeY - 0.25, z));
  slab.dispose();
  // Ramps.
  const rampWestLen = Math.hypot(BRIDGE.deckX0 - BRIDGE.westRampX0, WORLD.bridgeY - WORLD.roadY);
  const west = new THREE.BoxGeometry(rampWestLen, 0.34, half * 2 - 0.4);
  const westAngle = Math.atan2(WORLD.bridgeY - WORLD.roadY, BRIDGE.deckX0 - BRIDGE.westRampX0);
  m.add(west, materials.concrete, new THREE.Matrix4().compose(
    new THREE.Vector3((BRIDGE.deckX0 + BRIDGE.westRampX0) / 2, (WORLD.bridgeY + WORLD.roadY) / 2 - 0.23, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, westAngle)),
    new THREE.Vector3(1, 1, 1),
  ));
  west.dispose();
  const rampEastLen = Math.hypot(BRIDGE.eastRampX1 - BRIDGE.deckX1, WORLD.bridgeY - WORLD.roadY);
  const east = new THREE.BoxGeometry(rampEastLen, 0.34, half * 2 - 0.4);
  const eastAngle = Math.atan2(WORLD.bridgeY - WORLD.roadY, BRIDGE.eastRampX1 - BRIDGE.deckX1);
  m.add(east, materials.concrete, new THREE.Matrix4().compose(
    new THREE.Vector3((BRIDGE.eastRampX1 + BRIDGE.deckX1) / 2, (WORLD.bridgeY + WORLD.roadY) / 2 - 0.23, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -eastAngle)),
    new THREE.Vector3(1, 1, 1),
  ));
  east.dispose();

  // Piers into the canal.
  for (const px of [78, 98, 118, 132]) {
    const pier = new THREE.BoxGeometry(2.0, WORLD.bridgeY + 1.2, half * 1.8);
    m.add(pier, materials.concrete, new THREE.Matrix4().makeTranslation(px, (WORLD.bridgeY - 1.6) / 2, z));
    pier.dispose();
  }
  // Abutments at both landings.
  for (const ax of [BRIDGE.deckX0 - 1.2, BRIDGE.deckX1 + 1.2]) {
    const ab = new THREE.BoxGeometry(2.4, WORLD.bridgeY + 0.4, half * 2);
    m.add(ab, materials.concreteTint, new THREE.Matrix4().makeTranslation(ax, (WORLD.bridgeY + 0.4) / 2 - 0.2, z));
    ab.dispose();
  }

  // Railings follow the deck profile in short segments.
  for (const side of [-1, 1]) {
    // The north-east side is open at the ramp landing so the market road can
    // join the bridge; the rest of the deck stays railed.
    const railStart = side === -1 ? BRIDGE.westRampX0 : BRIDGE.westRampX0;
    const railEnd = side === -1 ? 130 : BRIDGE.eastRampX1;
    for (let x = railStart; x < railEnd; x += 3) {
      const h = bridgeHeightAt(x);
      const post = new THREE.BoxGeometry(0.12, 1.15, 0.12);
      rail.add(post, materials.metal, new THREE.Matrix4().makeTranslation(x, h + 0.58, z + side * (half - 0.25)));
      post.dispose();
      const bar = new THREE.BoxGeometry(3, 0.1, 0.12);
      rail.add(bar, materials.paint, new THREE.Matrix4().makeTranslation(x + 1.5, h + 1.12, z + side * (half - 0.25)));
      bar.dispose();
      collision.addBox(x + 1.5, z + side * (half - 0.25), 1.5, 0.22, h, h + 1.2, 0, 'bridge:railing', 'railing');
    }
    const railZ = z + side * (half - 0.25);
    // The west ramp is guarded down to the ground; along the flat deck the
    // barrier starts at deck height, leaving the alley beneath it walkable.
    collision.addWall(BRIDGE.westRampX0, railZ, BRIDGE.deckX0, railZ, 0.3, WORLD.roadY - 0.2, WORLD.bridgeY + 1.2, 'bridge:railing-ramp', 'railing');
    collision.addWall(BRIDGE.deckX0, railZ, side === -1 ? 130 : BRIDGE.eastRampX1, railZ, 0.3, WORLD.bridgeY, WORLD.bridgeY + 1.2, 'bridge:railing-deck', 'railing');
    if (side === 1) {
      collision.addWall(BRIDGE.eastRampX1 - 16, railZ, BRIDGE.eastRampX1, railZ, 0.3, WORLD.roadY - 0.2, WORLD.bridgeY + 1.2, 'bridge:railing-east-ramp', 'railing');
    }
  }

  const bridgeMeshes = m.finish(scene);
  rail.finish(scene);
  return bridgeMeshes;
}

export function buildTerminal(scene, collision, materials) {
  const m = new Merger();
  const floor = new THREE.PlaneGeometry(74, 20);
  floor.rotateX(-Math.PI / 2);
  m.add(floor, materials.concreteTint, new THREE.Matrix4().makeTranslation(-112, 0.14, 100));
  floor.dispose();
  collision.addBox(-112, 100, 37, 10, -1, 0.15, 0, 'terminal:forecourt', 'terrain');

  // Low bollards along the queue lane and the quay.
  for (let x = -140; x <= -80; x += 5) {
    const b = new THREE.CylinderGeometry(0.14, 0.17, 0.8, 8);
    m.add(b, materials.metal, new THREE.Matrix4().makeTranslation(x, 0.4, 108.6));
    b.dispose();
    collision.addBox(x, 108.6, 0.18, 0.18, 0, 0.85, 0, 'terminal:bollard', 'prop');
  }
  // Yellow lane edge by the ferry gate.
  const edge = new THREE.BoxGeometry(0.5, 0.02, 13);
  m.add(edge, materials.yellow, new THREE.Matrix4().makeTranslation(-110, 0.16, 100));
  edge.dispose();

  // Gangway from pier to the moored ferry.
  const gang = new THREE.BoxGeometry(4.4, 0.16, 10);
  m.add(gang, materials.woodDark, new THREE.Matrix4().compose(
    new THREE.Vector3(-118, 1.05, 149),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.06, 0, 0)),
    new THREE.Vector3(1, 1, 1),
  ));
  gang.dispose();
  collision.addBox(-118, 149, 2.2, 5, 0.5, 1.2, 0, 'terminal:gangway', 'pier');

  const meshes = m.finish(scene, { castShadow: false, receiveShadow: true });

  // Terminal signboard on the forecourt.
  const signMat = new THREE.MeshStandardMaterial({
    map: createSignTexture('FERRY TERMINAL', 'SALT HARBOR · PIER 4', { bg: '#153f52', fg: '#f5e6c8', wide: true }),
    roughness: 0.7,
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(19, 4.2), signMat);
  sign.position.set(-112, 6.8, 82.4);
  sign.castShadow = true;
  scene.add(sign);
  collision.addBox(-112, 82.4, 9.5, 0.3, 4.7, 8.9, 0, 'terminal:signboard', 'sign');
  return meshes;
}

export function buildStreetFurniture(scene, collision, materials) {
  const m = new Merger();
  const lampMat = materials.emissiveWarm;
  const lampPositions = [
    [-160, -60], [-100, -60], [-40, -60], [20, -60], [74, -60], [112, -60],
    [154, 8], [154, 44], [72, 102], [20, 100], [-40, 100], [-90, 88], [-150, 86],
    [-164, 20], [-164, -40], [-180, -80],
  ];
  for (const [x, z] of lampPositions) {
    const pole = new THREE.CylinderGeometry(0.08, 0.12, 5.6, 8);
    m.add(pole, materials.metal, new THREE.Matrix4().makeTranslation(x, 2.8, z));
    pole.dispose();
    const arm = new THREE.BoxGeometry(1.5, 0.1, 0.1);
    m.add(arm, materials.metal, new THREE.Matrix4().compose(
      new THREE.Vector3(x + 0.7, 5.45, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.16)),
      new THREE.Vector3(1, 1, 1),
    ));
    arm.dispose();
    const lamp = new THREE.BoxGeometry(0.9, 0.22, 0.42);
    m.add(lamp, lampMat, new THREE.Matrix4().makeTranslation(x + 1.4, 5.32, z));
    lamp.dispose();
    collision.addBox(x, z, 0.18, 0.18, 0, 5.6, 0, `lamp:${Math.round(x)}:${Math.round(z)}`, 'pole');
  }
  // Benches on the promenade.
  for (const [x, z, yaw] of [[-60, 103, 0], [-20, 103, 0], [22, 103, 0], [-136, 86, Math.PI / 2]]) {
    const seat = new THREE.BoxGeometry(2.4, 0.12, 0.62);
    m.add(seat, materials.woodDark, new THREE.Matrix4().compose(
      new THREE.Vector3(x, 0.55, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
      new THREE.Vector3(1, 1, 1),
    ));
    seat.dispose();
    for (const dx of [-0.9, 0.9]) {
      const leg = new THREE.BoxGeometry(0.12, 0.5, 0.5);
      const ox = Math.cos(yaw) * dx;
      const oz = -Math.sin(yaw) * dx;
      m.add(leg, materials.metal, new THREE.Matrix4().makeTranslation(x + ox, 0.26, z + oz));
      leg.dispose();
    }
    collision.addBox(x, z, 1.25, 0.4, 0, 0.68, yaw, 'bench:promenade', 'prop');
  }
  return m.finish(scene);
}