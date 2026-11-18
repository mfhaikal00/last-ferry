// Last Ferry — Salt Harbor.
// Street and waterfront props: palms, utility poles with sagging cables,
// containers, crates, barrels, market carts, buoys and pier clutter. Every
// prop registers a labelled collision proxy.

import * as THREE from '../vendor/three.module.min.js';
import { Merger } from './city.js';
import { getTexture } from './textures.js';
import { rngFor, range } from './random.js';

const PALM_SPOTS = [
  [-168, -84, 9], [-158, -62, 11], [-118, -62, 10], [-78, -60, 12], [-38, -61, 9], [4, -61, 11],
  [46, -61, 10], [88, -52, 9], [136, -56, 10], [152, 4, 11], [168, 66, 10],
  [138, 103, 12], [96, 102, 9], [58, 102, 10], [10, 100, 11], [-30, 101, 9], [-68, 101, 12],
  [-76, 107, 8], [-150, 86, 10], [-166, 58, 9], [-166, 4, 11], [-166, -30, 9],
  [80, -20, 8], [60, 24, 9], [60, 48, 8], [76, 104, 8], [168, 92, 10],
  [-20, 10, 9], [-90, 8, 8],
];

const POLE_SPOTS = [
  [-164, -58], [-126, -58], [-86, -58], [-46, -58], [-4, -58], [38, -58], [82, -56],
  [132, -54], [158, 8], [166, 62], [72, 102], [24, 102], [-26, 102],
  [-72, 103], [-164, 24], [-164, -18],
];

export function buildProps(scene, collision, materials) {
  const trunkM = new Merger();
  const leafM = new Merger();
  const propM = new Merger();
  const metalM = new Merger();
  const cablePoints = [];
  const palmTrunk = new THREE.MeshStandardMaterial({ map: getTexture('wood'), color: 0x8b7451, roughness: 0.95 });
  const palmLeafDark = new THREE.MeshStandardMaterial({ color: 0x2f6136, roughness: 0.85, side: THREE.DoubleSide });
  const palmLeafMid = new THREE.MeshStandardMaterial({ color: 0x3d7a41, roughness: 0.85, side: THREE.DoubleSide });
  const palmLeafLight = new THREE.MeshStandardMaterial({ color: 0x4f8a4b, roughness: 0.85, side: THREE.DoubleSide });
  const palmCrown = new THREE.MeshStandardMaterial({ color: 0x5c5a34, roughness: 0.9 });
  const palmLeaves = [palmLeafDark, palmLeafMid, palmLeafLight];
  const containerMat = new THREE.MeshStandardMaterial({ map: getTexture('corrugated'), color: 0x8d9e93, roughness: 0.82 });
  const containerBlue = new THREE.MeshStandardMaterial({ map: getTexture('corrugated'), color: 0x497d96, roughness: 0.82 });
  const containerRed = new THREE.MeshStandardMaterial({ map: getTexture('corrugated'), color: 0x9c5a48, roughness: 0.82 });
  const buoyMat = new THREE.MeshStandardMaterial({ color: 0xd9672b, roughness: 0.6 });
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x6c5a44, roughness: 0.9 });
  const goods = [
    new THREE.MeshStandardMaterial({ color: 0xc8563c, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0x3f8a72, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0xe0a63f, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0x7c5a96, roughness: 0.85 }),
  ];

  // Palms.
  const rng = rngFor('palms');
  for (const [x, z, h] of PALM_SPOTS) {
    addPalm(trunkM, leafM, x, z, h, rng, palmTrunk, palmLeaves, palmCrown);
    collision.addBox(x, z, 0.28, 0.28, 0, h * 0.9, 0, `palm:${Math.round(x)}:${Math.round(z)}`, 'tree');
  }

  // Utility poles and catenary cables.
  const poleTop = [];
  for (const [x, z] of POLE_SPOTS) {
    const h = 8.4;
    const pole = new THREE.CylinderGeometry(0.1, 0.15, h, 7);
    propM.add(pole, materials.concrete, new THREE.Matrix4().makeTranslation(x, h / 2, z));
    pole.dispose();
    const arm = new THREE.BoxGeometry(1.6, 0.1, 0.1);
    propM.add(arm, materials.metal, new THREE.Matrix4().makeTranslation(x, h - 0.4, z));
    arm.dispose();
    for (const dx of [-0.6, 0, 0.6]) {
      const cap = new THREE.CylinderGeometry(0.06, 0.08, 0.16, 6);
      propM.add(cap, materials.woodDark, new THREE.Matrix4().makeTranslation(x + dx, h - 0.27, z));
      cap.dispose();
    }
    collision.addBox(x, z, 0.16, 0.16, 0, h, 0, `utility-pole:${Math.round(x)}:${Math.round(z)}`, 'pole');
    poleTop.push([x, z, h - 0.3]);
  }
  // Link neighbouring poles along each street line.
  const lines = [
    [0, 1, 2, 3, 4, 5], [5, 6], [6, 7, 8, 9, 10, 11, 12, 13], [14, 15],
  ];
  for (const line of lines) {
    for (let i = 1; i < line.length; i++) {
      const a = poleTop[line[i - 1]];
      const b = poleTop[line[i]];
      if (!a || !b) continue;
      addCable(propM, ropeMat, a, b);
    }
  }
  // The physical cable mesh is a set of thin tubes, not a Line, so it still
  // reads in screenshots and casts a faint shadow.

  // Dock containers, stacked and offset so nothing looks grid-like.
  const containers = [
    [-58, 78, 12, 2.5, 0.06, containerBlue],
    [-44, 79, 12, 2.5, 0.06, containerRed],
    [-70, 76, 6.2, 2.5, -0.03, containerMat],
    [24, 78, 12, 2.5, Math.PI, containerMat],
    [38, 77, 12, 2.5, Math.PI, containerBlue],
    [166, 12, 12, 2.5, Math.PI / 2, containerRed],
    [188, 48, 12, 2.5, Math.PI / 2, containerMat],
    [182, 14, 12, 2.5, 0.04, containerMat],
    [158, 20, 12, 2.5, Math.PI / 2, containerBlue],
    [186, 34, 12, 2.5, 0.02, containerRed],
    [178, 48, 12, 2.5, 0.02, containerMat],
    [-52, 76, 6.2, 2.5, 0.06, containerBlue],
  ];
  for (const [x, z, length, height, yaw, mat] of containers) {
    addContainer(propM, mat, materials.dark, x, z, length, height, yaw);
    collision.addBox(x, z, length / 2, 1.25, 0, height, yaw, `container:${Math.round(x)}:${Math.round(z)}`, 'container');
  }

  // Crates near the market and the pier.
  const crateSpots = [
    [90, -48, 1.1, 0.7], [92.2, -48.4, 0.9, 1.4], [87, 102, 1.2, 0.2], [85.5, 99.4, 0.9, 0.5],
    [56, -46, 1.0, 0.1], [57, -44.4, 0.8, 1.0], [-70, 103, 1.1, 0.2], [-68, 104.2, 0.8, 0.7],
    [172, 60, 1.3, 0.4], [174, 62.2, 0.9, 0.9],
    [118, -27.4, 1.1, 0.3], [119.4, -28.6, 0.9, 1.1], [116.4, -26.6, 0.9, 0.2],
    [158, 38, 1.2, 0.2], [160, 36.4, 0.9, 1.1], [182, 46, 1.1, 0.5], [180, 28, 1.3, 0.1],
    [156, 30, 0.9, 0.9], [178, 26, 1.0, 0.3], [-126, 113, 1.1, 0.2], [-124, 114.6, 0.8, 0.9], [-108, 138, 1.2, 0.3],
  ];
  for (const [x, z, size, yaw] of crateSpots) {
    addCrate(propM, materials.wood, x, z, size, yaw);
    collision.addBox(x, z, size / 2, size / 2, 0, size * 0.9, yaw, `crate:${Math.round(x)}:${Math.round(z)}`, 'crate');
  }

  // Fish crates on the market tables / foreground.
  for (let i = 0; i < 14; i++) {
    const x = range(rng, 62, 136);
    const z = range(rng, -72, -52);
    const geo = new THREE.BoxGeometry(0.55, 0.28, 0.4);
    const mat = goods[i % goods.length];
    propM.add(geo, mat, new THREE.Matrix4().compose(
      new THREE.Vector3(x, 0.72, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, range(rng, -0.3, 0.3), 0)),
      new THREE.Vector3(1, 1, 1),
    ));
    geo.dispose();
  }

  // Barrels and tyres at the workshop.
  const barrelSpots = [[-160, -84, 0], [-158.4, -83.2, 0.4], [-161.2, -82.4, 0.2]];
  for (const [x, z, yaw] of barrelSpots) {
    const b = new THREE.CylinderGeometry(0.34, 0.34, 0.92, 10);
    propM.add(b, containerRed, new THREE.Matrix4().makeTranslation(x, 0.46, z));
    b.dispose();
    collision.addBox(x, z, 0.36, 0.36, 0, 0.92, yaw, 'barrel:workshop', 'prop');
  }
  for (const [x, z] of [[-154, -82], [-152.8, -81.4], [-153.4, -83]]) {
    const tyre = new THREE.TorusGeometry(0.34, 0.13, 6, 12);
    propM.add(tyre, materials.dark, new THREE.Matrix4().compose(
      new THREE.Vector3(x, 0.14, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
      new THREE.Vector3(1, 1, 1),
    ));
    tyre.dispose();
  }

  // Market carts with wheels and striped canopies.
  for (const [x, z, yaw] of [[74, -56, 0.3], [118, -58, -0.2], [94, -73, 0.1], [98, -29, 0.5]]) {
    addCart(propM, metalM, materials, x, z, yaw);
    collision.addBox(x, z, 1.1, 0.7, 0, 1.1, yaw, `market-cart:${Math.round(x)}`, 'prop');
  }

  // Mooring bollards and buoys along the quay.
  for (let x = -168; x < 70; x += 16) {
    if (x > -134 && x < -100) continue;
    const b = new THREE.CylinderGeometry(0.22, 0.3, 0.62, 8);
    propM.add(b, materials.dark, new THREE.Matrix4().makeTranslation(x, 0.3, 106.2));
    b.dispose();
    collision.addBox(x, 106.2, 0.24, 0.24, 0.2, 0.72, 0, 'mooring-bollard', 'prop');
  }
  for (const [x, z] of [[-150, 123], [-96, 126], [22, 122], [180, 24], [182, 40]]) {
    const b = new THREE.SphereGeometry(0.55, 10, 8);
    propM.add(b, buoyMat, new THREE.Matrix4().makeTranslation(x, -0.1, z));
    b.dispose();
  }

  // Trash bins and pallets.
  for (const [x, z] of [[70, -63], [-62, -64], [-95, 86], [130, 100], [156, 60], [87, -31]]) {
    const bin = new THREE.CylinderGeometry(0.3, 0.26, 0.9, 8);
    metalM.add(bin, materials.metal, new THREE.Matrix4().makeTranslation(x, 0.45, z));
    bin.dispose();
    collision.addBox(x, z, 0.32, 0.32, 0, 0.9, 0, 'trash-bin', 'prop');
  }
  for (const [x, z, yaw] of [[-70, -66, 0.2], [124, 88, 0.4], [172, 44, 1.2]]) {
    const pallet = new THREE.BoxGeometry(1.2, 0.12, 1.0);
    propM.add(pallet, materials.wood, new THREE.Matrix4().compose(
      new THREE.Vector3(x, 0.18, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
      new THREE.Vector3(1, 1, 1),
    ));
    pallet.dispose();
  }

  trunkM.finish(scene);
  leafM.finish(scene);
  propM.finish(scene);
  metalM.finish(scene);
  return { palmCount: PALM_SPOTS.length, poleCount: POLE_SPOTS.length };
}

function addPalm(trunkM, leafM, x, z, height, rng, palmTrunk, palmLeaves, palmCrown) {
  const leanX = range(rng, -0.8, 0.8);
  const leanZ = range(rng, -0.8, 0.8);
  const trunkHeight = height * 0.66;
  const crownX = x + leanX;
  const crownZ = z + leanZ;
  const base = new THREE.Vector3(x, 0, z);
  const top = new THREE.Vector3(crownX, trunkHeight, crownZ);
  const dir = top.clone().sub(base);
  const length = dir.length();
  const mid = base.clone().add(top).multiplyScalar(0.5);
  const trunk = new THREE.CylinderGeometry(0.12, 0.22, length, 8, 1, false);
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  trunkM.add(trunk, palmTrunk, new THREE.Matrix4().compose(mid, quat, new THREE.Vector3(1, 1, 1)));
  trunk.dispose();
  const fronds = 11;
  for (let i = 0; i < fronds; i++) {
    const angle = (i / fronds) * Math.PI * 2 + range(rng, -0.12, 0.12);
    const geo = frondGeometry(range(rng, 2.6, 3.8), range(rng, 0.9, 1.5), angle, rng);
    geo.translate(crownX, trunkHeight, crownZ);
    leafM.add(geo, palmLeaves[Math.floor(rng() * palmLeaves.length)]);
    geo.dispose();
  }
  const crown = new THREE.SphereGeometry(0.34, 8, 6);
  leafM.add(crown, palmCrown, new THREE.Matrix4().makeTranslation(crownX, trunkHeight, crownZ));
  crown.dispose();
}

function frondGeometry(length, droop, angle, rng) {
  // A broad, drooping palm blade with a notched edge. At city distances the
  // broad silhouette reads far better than a set of hairline leaflets.
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
    const nx = -Math.sin(angle);
    const nz = Math.cos(angle);
    verts.push(cx - nx * w, y, cz - nz * w, cx + nx * w, y, cz + nz * w);
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

function addCable(merger, material, a, b) {
  const [ax, az, ay] = a;
  const [bx, bz, by] = b;
  const segments = 10;
  const sag = 0.7 + Math.hypot(bx - ax, bz - az) * 0.008;
  for (let i = 0; i < segments; i++) {
    const t0 = i / segments;
    const t1 = (i + 1) / segments;
    const p0 = cablePoint(ax, az, ay, bx, bz, by, t0, sag);
    const p1 = cablePoint(ax, az, ay, bx, bz, by, t1, sag);
    const len = p0.distanceTo(p1);
    const geo = new THREE.CylinderGeometry(0.022, 0.022, len, 4);
    const mid = p0.clone().add(p1).multiplyScalar(0.5);
    const dir = p1.clone().sub(p0).normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    merger.add(geo, material, new THREE.Matrix4().compose(mid, quat, new THREE.Vector3(1, 1, 1)));
    geo.dispose();
  }
}

function cablePoint(ax, az, ay, bx, bz, by, t, sag) {
  return new THREE.Vector3(
    THREE.MathUtils.lerp(ax, bx, t),
    THREE.MathUtils.lerp(ay, by, t) - Math.sin(t * Math.PI) * sag,
    THREE.MathUtils.lerp(az, bz, t),
  );
}

function addContainer(propM, mat, doorMat, x, z, length, height, yaw) {
  const body = new THREE.BoxGeometry(length, height, 2.5);
  propM.add(body, mat, new THREE.Matrix4().compose(
    new THREE.Vector3(x, height / 2, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
    new THREE.Vector3(1, 1, 1),
  ));
  body.dispose();
  for (const end of [-0.5, 0.5]) {
    const door = new THREE.BoxGeometry(0.14, height * 0.9, 2.3);
    const dx = Math.cos(yaw) * length * end;
    const dz = -Math.sin(yaw) * length * end;
    propM.add(door, doorMat, new THREE.Matrix4().compose(
      new THREE.Vector3(x + dx, height / 2, z + dz),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
      new THREE.Vector3(1, 1, 1),
    ));
    door.dispose();
  }
}

function addCrate(merger, wood, x, z, size, yaw) {
  const body = new THREE.BoxGeometry(size, size * 0.85, size);
  merger.add(body, wood, new THREE.Matrix4().compose(
    new THREE.Vector3(x, size * 0.45, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
    new THREE.Vector3(1, 1, 1),
  ));
  body.dispose();
}

function addCart(propM, metalM, materials, x, z, yaw) {
  const base = new THREE.BoxGeometry(1.5, 0.12, 0.9);
  propM.add(base, materials.wood, new THREE.Matrix4().compose(
    new THREE.Vector3(x, 0.82, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
    new THREE.Vector3(1, 1, 1),
  ));
  base.dispose();
  for (const side of [-1, 1]) {
    const wheel = new THREE.TorusGeometry(0.28, 0.07, 5, 10);
    metalM.add(wheel, materials.dark, new THREE.Matrix4().compose(
      new THREE.Vector3(x + Math.cos(yaw) * 0.55, 0.3, z - Math.sin(yaw) * 0.55 + side * 0.5),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
      new THREE.Vector3(1, 1, 1),
    ));
    wheel.dispose();
  }
  const canopy = new THREE.BoxGeometry(1.7, 0.06, 1.2);
  propM.add(canopy, materials.tarp, new THREE.Matrix4().compose(
    new THREE.Vector3(x, 1.9, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
    new THREE.Vector3(1, 1, 1),
  ));
  canopy.dispose();
  for (const dx of [-0.7, 0.7]) {
    const post = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 5);
    propM.add(post, materials.dark, new THREE.Matrix4().makeTranslation(x + Math.cos(yaw) * dx, 1.35, z - Math.sin(yaw) * dx));
    post.dispose();
  }
}