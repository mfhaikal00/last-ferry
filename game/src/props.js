// Last Ferry — street dressing.
// Palms, utility wires, containers, crates, carts, bollards, street lamps,
// benches, the impound lot, the east dock yard, the workshop rack and the
// district signs. Every solid prop registers a labelled collision proxy.

import * as THREE from '../vendor/three.module.min.js';
import { Merger, createSignTexture, getTexture } from './assets.js';
import { WORLD, range, rngFor } from './core.js';

const PALMS = [
  [-168, -84, 9], [-158, -62, 11], [-118, -62, 10], [-78, -60, 12], [-38, -61, 9], [4, -61, 11],
  [46, -61, 10], [88, -52, 9], [136, -56, 10], [152, 4, 11], [168, 66, 10],
  [138, 103, 12], [96, 102, 9], [58, 102, 10], [10, 100, 11], [-30, 101, 9], [-68, 101, 12],
  [-76, 107, 8], [-150, 86, 10], [-166, 58, 9], [-166, 4, 11], [-166, -30, 9],
  [80, -20, 8], [60, 24, 9], [60, 48, 8], [76, 104, 8], [168, 92, 10],
  [-20, 10, 9], [-90, 8, 8],
];

const POLES = [
  [-164, -58], [-126, -58], [-86, -58], [-46, -58], [-4, -58], [38, -58], [82, -56],
  [132, -54], [158, 8], [166, 62], [72, 102], [24, 102], [-26, 102],
  [-72, 103], [-164, 24], [-164, -18],
];

export function buildProps(scene, collision, materials) {
  const trunks = new Merger();
  const leaves = new Merger();
  const props = new Merger();
  const metal = new Merger();
  const palmTrunk = new THREE.MeshStandardMaterial({ map: getTexture('wood'), color: 0x8b7451, roughness: 0.95 });
  const leafMats = [0x2f6136, 0x3d7a41, 0x4f8a4b].map((colour) => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.85, side: THREE.DoubleSide }));
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x5c5a34, roughness: 0.9 });
  const containerMat = new THREE.MeshStandardMaterial({ map: getTexture('corrugated'), color: 0x8d9e93, roughness: 0.82 });
  const containerBlue = new THREE.MeshStandardMaterial({ map: getTexture('corrugated'), color: 0x497d96, roughness: 0.82 });
  const containerRed = new THREE.MeshStandardMaterial({ map: getTexture('corrugated'), color: 0x9c5a48, roughness: 0.82 });
  const buoyMat = new THREE.MeshStandardMaterial({ color: 0xd9672b, roughness: 0.6 });
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x6c5a44, roughness: 0.9 });
  const goods = [0xc8563c, 0x3f8a72, 0xe0a63f, 0x7c5a96].map((colour) => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.85 }));

  const rng = rngFor('palms');
  for (const [x, z, h] of PALMS) {
    palm(trunks, leaves, x, z, h, rng, palmTrunk, leafMats, crownMat);
    collision.addBox(x, z, 0.28, 0.28, 0, h * 0.9, 0, `palm:${Math.round(x)}:${Math.round(z)}`, 'tree');
  }

  const poleTops = [];
  for (const [x, z] of POLES) {
    const h = 8.4;
    const pole = new THREE.CylinderGeometry(0.1, 0.15, h, 7);
    props.add(pole, materials.concrete, new THREE.Matrix4().makeTranslation(x, h / 2, z));
    pole.dispose();
    const arm = new THREE.BoxGeometry(1.6, 0.1, 0.1);
    props.add(arm, materials.metal, new THREE.Matrix4().makeTranslation(x, h - 0.4, z));
    arm.dispose();
    for (const dx of [-0.6, 0, 0.6]) {
      const cap = new THREE.CylinderGeometry(0.06, 0.08, 0.16, 6);
      props.add(cap, materials.woodDark, new THREE.Matrix4().makeTranslation(x + dx, h - 0.27, z));
      cap.dispose();
    }
    collision.addBox(x, z, 0.16, 0.16, 0, h, 0, `utility-pole:${Math.round(x)}:${Math.round(z)}`, 'pole');
    poleTops.push([x, z, h - 0.3]);
  }
  for (const line of [[0, 1, 2, 3, 4, 5], [5, 6], [6, 7, 8, 9, 10, 11, 12, 13], [14, 15]]) {
    for (let i = 1; i < line.length; i++) {
      const a = poleTops[line[i - 1]];
      const b = poleTops[line[i]];
      if (a && b) cable(props, ropeMat, a, b);
    }
  }

  const containers = [
    [-58, 78, 12, 2.5, 0.06, containerBlue], [-44, 79, 12, 2.5, 0.06, containerRed],
    [-70, 76, 6.2, 2.5, -0.03, containerMat], [24, 78, 12, 2.5, Math.PI, containerMat],
    [38, 77, 12, 2.5, Math.PI, containerBlue], [166, 12, 12, 2.5, Math.PI / 2, containerRed],
    [188, 48, 12, 2.5, Math.PI / 2, containerMat], [182, 14, 12, 2.5, 0.04, containerMat],
    [158, 20, 12, 2.5, Math.PI / 2, containerBlue], [186, 34, 12, 2.5, 0.02, containerRed],
    [178, 48, 12, 2.5, 0.02, containerMat], [-52, 76, 6.2, 2.5, 0.06, containerBlue],
  ];
  for (const [x, z, length, height, yaw, mat] of containers) {
    container(props, mat, materials.dark, x, z, length, height, yaw);
    collision.addBox(x, z, length / 2, 1.25, 0, height, yaw, `container:${Math.round(x)}:${Math.round(z)}`, 'container');
  }

  const crates = [
    [90, -48, 1.1, 0.7], [92.2, -48.4, 0.9, 1.4], [87, 102, 1.2, 0.2], [85.5, 99.4, 0.9, 0.5],
    [56, -46, 1.0, 0.1], [57, -44.4, 0.8, 1.0], [-70, 103, 1.1, 0.2], [-68, 104.2, 0.8, 0.7],
    [172, 60, 1.3, 0.4], [174, 62.2, 0.9, 0.9], [118, -27.4, 1.1, 0.3], [119.4, -28.6, 0.9, 1.1],
    [116.4, -26.6, 0.9, 0.2], [158, 38, 1.2, 0.2], [160, 36.4, 0.9, 1.1], [182, 46, 1.1, 0.5],
    [180, 28, 1.3, 0.1], [156, 30, 0.9, 0.9], [178, 26, 1.0, 0.3], [-126, 113, 1.1, 0.2],
    [-124, 114.6, 0.8, 0.9], [-108, 138, 1.2, 0.3],
  ];
  for (const [x, z, size, yaw] of crates) {
    crate(props, materials.wood, x, z, size, yaw);
    collision.addBox(x, z, size / 2, size / 2, 0, size * 0.9, yaw, `crate:${Math.round(x)}:${Math.round(z)}`, 'crate');
  }

  for (let i = 0; i < 14; i++) {
    const geo = new THREE.BoxGeometry(0.55, 0.28, 0.4);
    props.add(geo, goods[i % goods.length], new THREE.Matrix4().compose(
      new THREE.Vector3(range(rng, 62, 136), 0.72, range(rng, -72, -52)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, range(rng, -0.3, 0.3), 0)),
      new THREE.Vector3(1, 1, 1),
    ));
    geo.dispose();
  }

  for (const [x, z, yaw] of [[-160, -84, 0], [-158.4, -83.2, 0.4], [-161.2, -82.4, 0.2]]) {
    const b = new THREE.CylinderGeometry(0.34, 0.34, 0.92, 10);
    props.add(b, containerRed, new THREE.Matrix4().makeTranslation(x, 0.46, z));
    b.dispose();
    collision.addBox(x, z, 0.36, 0.36, 0, 0.92, yaw, 'barrel:workshop', 'prop');
  }
  for (const [x, z] of [[-154, -82], [-152.8, -81.4], [-153.4, -83]]) {
    const tyre = new THREE.TorusGeometry(0.34, 0.13, 6, 12);
    props.add(tyre, materials.dark, new THREE.Matrix4().compose(
      new THREE.Vector3(x, 0.14, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
      new THREE.Vector3(1, 1, 1),
    ));
    tyre.dispose();
  }

  for (const [x, z, yaw] of [[74, -56, 0.3], [118, -58, -0.2], [94, -73, 0.1], [98, -29, 0.5]]) {
    cart(props, metal, materials, x, z, yaw);
    collision.addBox(x, z, 1.1, 0.7, 0, 1.1, yaw, `market-cart:${Math.round(x)}`, 'prop');
  }

  for (let x = -168; x < 70; x += 16) {
    if (x > -134 && x < -100) continue;
    const b = new THREE.CylinderGeometry(0.22, 0.3, 0.62, 8);
    props.add(b, materials.dark, new THREE.Matrix4().makeTranslation(x, 0.3, 106.2));
    b.dispose();
    collision.addBox(x, 106.2, 0.24, 0.24, 0.2, 0.72, 0, 'mooring-bollard', 'prop');
  }
  for (const [x, z] of [[-150, 123], [-96, 126], [22, 122], [180, 24], [182, 40]]) {
    const b = new THREE.SphereGeometry(0.55, 10, 8);
    props.add(b, buoyMat, new THREE.Matrix4().makeTranslation(x, -0.1, z));
    b.dispose();
  }

  for (const [x, z] of [[70, -63], [-62, -64], [-95, 86], [130, 100], [156, 60], [87, -31]]) {
    const bin = new THREE.CylinderGeometry(0.3, 0.26, 0.9, 8);
    metal.add(bin, materials.metal, new THREE.Matrix4().makeTranslation(x, 0.45, z));
    bin.dispose();
    collision.addBox(x, z, 0.32, 0.32, 0, 0.9, 0, 'trash-bin', 'prop');
  }
  for (const [x, z, yaw] of [[-70, -66, 0.2], [124, 88, 0.4], [172, 44, 1.2]]) {
    const pallet = new THREE.BoxGeometry(1.2, 0.12, 1.0);
    props.add(pallet, materials.wood, new THREE.Matrix4().compose(
      new THREE.Vector3(x, 0.18, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
      new THREE.Vector3(1, 1, 1),
    ));
    pallet.dispose();
  }

  trunks.finish(scene);
  leaves.finish(scene);
  props.finish(scene);
  metal.finish(scene);
  return { palmCount: PALMS.length, poleCount: POLES.length };
}

function palm(trunks, leaves, x, z, height, rng, trunkMat, leafMats, crownMat) {
  const trunkHeight = height * 0.66;
  const crownX = x + range(rng, -0.8, 0.8);
  const crownZ = z + range(rng, -0.8, 0.8);
  const base = new THREE.Vector3(x, 0, z);
  const top = new THREE.Vector3(crownX, trunkHeight, crownZ);
  const dir = top.clone().sub(base);
  const trunk = new THREE.CylinderGeometry(0.12, 0.22, dir.length(), 8, 1, false);
  trunks.add(trunk, trunkMat, new THREE.Matrix4().compose(
    base.clone().add(top).multiplyScalar(0.5),
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()),
    new THREE.Vector3(1, 1, 1),
  ));
  trunk.dispose();
  for (let i = 0; i < 11; i++) {
    const angle = (i / 11) * Math.PI * 2 + range(rng, -0.12, 0.12);
    const geo = frond(range(rng, 2.6, 3.8), range(rng, 0.9, 1.5), angle, rng);
    geo.translate(crownX, trunkHeight, crownZ);
    leaves.add(geo, leafMats[Math.floor(rng() * leafMats.length)]);
    geo.dispose();
  }
  const crown = new THREE.SphereGeometry(0.34, 8, 6);
  leaves.add(crown, crownMat, new THREE.Matrix4().makeTranslation(crownX, trunkHeight, crownZ));
  crown.dispose();
}

function frond(length, droop, angle, rng) {
  const verts = [];
  const idx = [];
  const segs = 10;
  const width = range(rng, 0.55, 0.82);
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const r = length * t;
    const y = Math.sin(t * Math.PI) * 1.05 * (droop / 1.2) - t * t * droop * 1.75;
    let w = width * (1 - t * 0.88) + 0.025;
    if (i % 3 === 0) w *= 0.72;
    const cx = Math.cos(angle) * r;
    const cz = Math.sin(angle) * r;
    verts.push(cx + Math.sin(angle) * w, y, cz - Math.cos(angle) * w, cx - Math.sin(angle) * w, y, cz + Math.cos(angle) * w);
    if (i < segs) {
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

function cable(merger, material, a, b) {
  const [ax, az, ay] = a;
  const [bx, bz, by] = b;
  const sag = 0.7 + Math.hypot(bx - ax, bz - az) * 0.008;
  const point = (t) => new THREE.Vector3(
    THREE.MathUtils.lerp(ax, bx, t),
    THREE.MathUtils.lerp(ay, by, t) - Math.sin(t * Math.PI) * sag,
    THREE.MathUtils.lerp(az, bz, t),
  );
  for (let i = 0; i < 10; i++) {
    const p0 = point(i / 10);
    const p1 = point((i + 1) / 10);
    const geo = new THREE.CylinderGeometry(0.022, 0.022, p0.distanceTo(p1), 4);
    merger.add(geo, material, new THREE.Matrix4().compose(
      p0.clone().add(p1).multiplyScalar(0.5),
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize()),
      new THREE.Vector3(1, 1, 1),
    ));
    geo.dispose();
  }
}

function container(m, mat, doorMat, x, z, length, height, yaw) {
  const body = new THREE.BoxGeometry(length, height, 2.5);
  m.add(body, mat, new THREE.Matrix4().compose(
    new THREE.Vector3(x, height / 2, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
    new THREE.Vector3(1, 1, 1),
  ));
  body.dispose();
  for (const end of [-0.5, 0.5]) {
    const door = new THREE.BoxGeometry(0.14, height * 0.9, 2.3);
    m.add(door, doorMat, new THREE.Matrix4().compose(
      new THREE.Vector3(x + Math.cos(yaw) * length * end, height / 2, z - Math.sin(yaw) * length * end),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
      new THREE.Vector3(1, 1, 1),
    ));
    door.dispose();
  }
}

function crate(m, wood, x, z, size, yaw) {
  const body = new THREE.BoxGeometry(size, size * 0.85, size);
  m.add(body, wood, new THREE.Matrix4().compose(
    new THREE.Vector3(x, size * 0.45, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
    new THREE.Vector3(1, 1, 1),
  ));
  body.dispose();
}

function cart(props, metal, materials, x, z, yaw) {
  const base = new THREE.BoxGeometry(1.5, 0.12, 0.9);
  props.add(base, materials.wood, new THREE.Matrix4().compose(
    new THREE.Vector3(x, 0.82, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
    new THREE.Vector3(1, 1, 1),
  ));
  base.dispose();
  for (const side of [-1, 1]) {
    const wheel = new THREE.TorusGeometry(0.28, 0.07, 5, 10);
    metal.add(wheel, materials.dark, new THREE.Matrix4().compose(
      new THREE.Vector3(x + Math.cos(yaw) * 0.55, 0.3, z - Math.sin(yaw) * 0.55 + side * 0.5),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
      new THREE.Vector3(1, 1, 1),
    ));
    wheel.dispose();
  }
  const canopy = new THREE.BoxGeometry(1.7, 0.06, 1.2);
  props.add(canopy, materials.tarp, new THREE.Matrix4().compose(
    new THREE.Vector3(x, 1.9, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
    new THREE.Vector3(1, 1, 1),
  ));
  canopy.dispose();
  for (const dx of [-0.7, 0.7]) {
    const post = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 5);
    props.add(post, materials.dark, new THREE.Matrix4().makeTranslation(x + Math.cos(yaw) * dx, 1.35, z - Math.sin(yaw) * dx));
    post.dispose();
  }
}

// --- promenade lamps and benches -------------------------------------------

export function buildStreetFurniture(scene, collision, materials) {
  const m = new Merger();
  const lamps = [
    [-160, -60], [-100, -60], [-40, -60], [20, -60], [74, -60], [112, -60],
    [154, 8], [154, 48], [72, 102], [20, 100], [-40, 100], [-90, 88], [-150, 86],
    [-164, 20], [-164, -40], [-180, -80],
  ];
  for (const [x, z] of lamps) {
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
    m.add(lamp, materials.emissiveWarm, new THREE.Matrix4().makeTranslation(x + 1.4, 5.32, z));
    lamp.dispose();
    collision.addBox(x, z, 0.18, 0.18, 0, 5.6, 0, `lamp:${Math.round(x)}:${Math.round(z)}`, 'pole');
  }
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
      m.add(leg, materials.metal, new THREE.Matrix4().makeTranslation(x + Math.cos(yaw) * dx, 0.26, z - Math.sin(yaw) * dx));
      leg.dispose();
    }
    collision.addBox(x, z, 1.25, 0.4, 0, 0.68, yaw, 'bench:promenade', 'prop');
  }
  return m.finish(scene);
}

// --- impound lot, dock yard, rack and district signs -----------------------

export function buildParkingLot(scene, collision, materials) {
  const m = new Merger();
  const lot = new THREE.BoxGeometry(48, 0.12, 26);
  m.add(lot, materials.asphalt, new THREE.Matrix4().makeTranslation(104, WORLD.roadY - 0.02, -37));
  lot.dispose();
  for (const [x, z, w, d] of [[80, -50, 0.4, 26], [80, -24, 0.4, 26], [104, -24, 48, 0.4], [104, -50, 48, 0.4]]) {
    const kerb = new THREE.BoxGeometry(w, 0.28, d);
    m.add(kerb, materials.concrete, new THREE.Matrix4().makeTranslation(x, 0.14, z));
    kerb.dispose();
  }
  for (let i = 0; i < 5; i++) addLine(m, materials.paint, 84 + i * 7, 0.18, -45, 0.16, 8);
  addLine(m, materials.yellow, 104, 0.18, -27.2, 20, 0.2);
  addLine(m, materials.yellow, 104, 0.18, -46.8, 20, 0.2);

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 2.0),
    new THREE.MeshStandardMaterial({
      map: createSignTexture('IMPOUND LOT', 'VEHICLES RELEASE · 08:00', { bg: '#30484b', fg: '#f0ddaf' }),
      roughness: 0.7,
    }),
  );
  sign.position.set(79.4, 2.5, -37);
  sign.rotation.y = Math.PI / 2;
  scene.add(sign);
  collision.addBox(79.4, -37, 0.2, 2.3, 1.4, 3.6, 0, 'sign:impound-lot', 'sign');
  const post = new THREE.CylinderGeometry(0.08, 0.1, 2.6, 6);
  m.add(post, materials.metal, new THREE.Matrix4().makeTranslation(79.4, 1.3, -37));
  post.dispose();
  m.finish(scene);
}

export function buildDockYard(scene, collision, materials) {
  const m = new Merger();
  const floor = new THREE.BoxGeometry(36, 0.16, 48);
  const yardMat = new THREE.MeshStandardMaterial({ map: getTexture('concrete'), color: 0x8f9691, roughness: 0.92 });
  m.add(floor, yardMat, new THREE.Matrix4().makeTranslation(172, 0.08, 30));
  floor.dispose();
  for (let i = 0; i < 14; i++) {
    const stripe = new THREE.BoxGeometry(0.7, 0.02, 3.2);
    m.add(stripe, i % 2 ? materials.paint : materials.yellow, new THREE.Matrix4().makeTranslation(152.5 + i * 1.1, 0.18, 7));
    stripe.dispose();
  }
  for (let i = 0; i < 5; i++) {
    const line = new THREE.BoxGeometry(0.14, 0.02, 38);
    m.add(line, materials.yellow, new THREE.Matrix4().makeTranslation(158 + i * 6, 0.18, 28));
    line.dispose();
  }

  const gantry = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ map: getTexture('metal'), color: 0x8b9490, roughness: 0.55, metalness: 0.35 });
  const legA = new THREE.Mesh(new THREE.BoxGeometry(0.7, 9, 0.7), steel);
  legA.position.set(192, 4.5, 4);
  legA.castShadow = true;
  gantry.add(legA);
  const legB = legA.clone();
  legB.position.set(192, 4.5, 36);
  gantry.add(legB);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 32), steel);
  beam.position.set(192, 9, 20);
  beam.castShadow = true;
  gantry.add(beam);
  const trolley = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 2.2), steel);
  trolley.position.set(192, 8.4, 22);
  gantry.add(trolley);
  const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 5.4, 5), materials.dark);
  hook.position.set(192, 5.2, 22);
  gantry.add(hook);
  scene.add(gantry);
  collision.addBox(192, 4, 0.5, 0.5, 0, 9, 0, 'dock:crane-leg', 'pillar');
  collision.addBox(192, 36, 0.5, 0.5, 0, 9, 0, 'dock:crane-leg', 'pillar');
  collision.addBox(192, 20, 0.5, 17, 8.2, 9.2, 0, 'dock:crane-beam', 'prop');

  const backSign = new THREE.Mesh(new THREE.PlaneGeometry(12, 2.4), new THREE.MeshStandardMaterial({
    map: createSignTexture('EAST QUAY', 'PATROL POST · BERTH 9', { bg: '#233f48', fg: '#f1d9a8', wide: true }), roughness: 0.7,
  }));
  backSign.position.set(174, 6.2, 8.2);
  scene.add(backSign);

  for (const [x, z] of [[154, 12], [190, 56], [190, 14]]) {
    const pole = new THREE.CylinderGeometry(0.09, 0.12, 8.5, 6);
    m.add(pole, materials.metal, new THREE.Matrix4().makeTranslation(x, 4.25, z));
    pole.dispose();
    const head = new THREE.BoxGeometry(0.8, 0.25, 0.5);
    m.add(head, materials.emissiveWarm, new THREE.Matrix4().makeTranslation(x, 8.4, z));
    head.dispose();
    collision.addBox(x, z, 0.15, 0.15, 0, 8.5, 0, 'dock:floodlight', 'pole');
  }

  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(5.6, 2.3),
    new THREE.MeshStandardMaterial({
      map: createSignTexture('EAST QUAY', 'PATROL POST · CARGO', { bg: '#233f48', fg: '#f1d9a8' }),
      roughness: 0.7,
    }),
  );
  board.position.set(156, 2.7, 10);
  board.rotation.y = -Math.PI / 2;
  board.castShadow = true;
  scene.add(board);
  collision.addBox(156, 10, 0.2, 2.8, 1.5, 3.9, 0, 'sign:east-quay', 'sign');
  m.finish(scene, { castShadow: false, receiveShadow: true });
}

function addLine(m, material, x, y, z, w, d) {
  const geo = new THREE.BoxGeometry(w, 0.02, d);
  m.add(geo, material, new THREE.Matrix4().makeTranslation(x, y, z));
  geo.dispose();
}

export function buildWeaponRack(assets, materials) {
  const group = new THREE.Group();
  group.name = 'weaponRack_workshop';
  const frameMat = new THREE.MeshStandardMaterial({ map: getTexture('metal'), color: 0x6d7572, roughness: 0.6, metalness: 0.3 });
  const woodMat = new THREE.MeshStandardMaterial({ map: getTexture('wood'), color: 0x9a7449, roughness: 0.9 });
  for (const x of [-1.4, 1.4]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.1, 0.12), frameMat);
    post.position.set(x, 1.05, 0);
    post.castShadow = true;
    group.add(post);
  }
  for (const y of [0.7, 1.7]) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.1, 0.35), woodMat);
    shelf.position.set(0, y, 0);
    shelf.castShadow = true;
    group.add(shelf);
  }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 2.1), new THREE.MeshStandardMaterial({
    map: createSignTexture('WEAPON RACK', 'WORKSHOP 02', { bg: '#27393c', fg: '#e7cf9c' }),
    roughness: 0.8,
  }));
  back.position.set(0, 1.3, -0.12);
  group.add(back);
  if (assets.rifle) {
    const display = assets.rifle.scene.clone(true);
    display.scale.setScalar(0.85);
    display.position.set(0, 1.78, 0.15);
    display.rotation.y = Math.PI / 2;
    group.add(display);
  }
  return group;
}

export function addDistrictSign(scene, collision, title, subtitle, x, z, yaw, w, h) {
  const mat = new THREE.MeshStandardMaterial({
    map: createSignTexture(title, subtitle, { bg: '#1b4658', fg: '#f6e2b7', wide: true }),
    roughness: 0.7,
  });
  const group = new THREE.Group();
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  sign.position.y = 3.4;
  group.add(sign);
  const postMat = new THREE.MeshStandardMaterial({ map: getTexture('metal'), color: 0x747d7a, roughness: 0.6, metalness: 0.3 });
  for (const dx of [-w / 2 + 0.4, w / 2 - 0.4]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.6, 6), postMat);
    post.position.set(dx, 1.8, -0.06);
    post.castShadow = true;
    group.add(post);
  }
  group.position.set(x, 0, z);
  group.rotation.y = yaw;
  scene.add(group);
  collision.addBox(x, z, w / 2, 0.2, 0, 3.8, yaw, `sign:${title.toLowerCase().replace(/\s/g, '-')}`, 'sign');
}