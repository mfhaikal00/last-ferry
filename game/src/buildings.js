// Last Ferry — building generator.
// Every structure is assembled from a footprint, walls with pilasters, a pitched
// roof with overhang, a recessed door, framed windows, awnings, AC units, pipes,
// laundry, antennas and signage. District rows are merged into one block each so
// off-screen buildings cull as a unit.

import * as THREE from '../vendor/three.module.min.js';
import { Merger, createSignTexture, getTexture } from './assets.js';
import { rngFor, range } from './core.js';

const SIGN_BACKING = new THREE.MeshStandardMaterial({ color: 0x2b2f2d, roughness: 0.8 });

export function buildBuildings(scene, collision, base) {
  const mats = makeMaterials(base);
  const rng = rngFor('salt-harbor-buildings');
  const groups = {};
  const open = (name) => (groups[name] = new Merger());

  // Workshop ---------------------------------------------------------------
  {
    const m = open('workshop');
    const b = { x: -143, z: -99, w: 38, d: 26, h: 8.4, yaw: 0, wall: mats.cream, roof: mats.rust };
    shell(m, b, mats, collision, { roofPitch: 0.34, gable: true });
    recessedDoor(m, mats, b, -10, 4.4, 3.8, 4.6, mats.metalDark);
    recessedDoor(m, mats, b, 8, 2.4, 2.4, 3.0, mats.woodDark);
    sign(m, b, 'WORKSHOP', 'TIRTA TOWING · SALT HARBOR', 0, 7.1, 9, 2.3, { bg: '#233b46', fg: '#f1d9a8' });
    awning(m, mats, b, -10, 5.8, 7.4, 2.6);
    acUnit(m, mats, b, 12, 6.4, 0.8);
    pipes(m, mats, b, -17.2, 8.0);
    vents(m, mats, b, 3, 8.4);
    for (let i = 0; i < 7; i++) {
      m.add(new THREE.BoxGeometry(2.0, 0.2, 0.8), mats.concrete, local(b, 16.6, 0.3 + i * 0.26, 3 + i * 0.8));
    }
    collision.addBox(b.x + 16.6, b.z + 4.8, 1.1, 3.0, 0, 2.2, 0, 'workshop:stairs', 'stairs');
    fence(m, mats, collision, -160, -84, -147, -84);
    fence(m, mats, collision, -124, -84, -114, -84);
    standingSign(m, mats, 'TIRTA TOWING', 'IMPOUNDED VEHICLES', -150, -80.5, -0.2, 4.6, 1.6, { bg: '#7a3627', fg: '#f5e3bb' });
    collision.addBox(-150, -80.5, 2.3, 0.3, 0, 1.6, 0, 'sign:tirta-towing', 'sign');
    finish(scene, m);
  }

  // Shop Street, south row -------------------------------------------------
  {
    const m = open('shopSouth');
    const row = [
      { x: -96, z: -51, w: 24, d: 16, h: 7.6, wall: mats.coral, roof: mats.tile, sign: 'SALT & BAIT', sub: 'FISH AND CHIPS' },
      { x: -70, z: -50, w: 22, d: 17, h: 8.8, wall: mats.ochre, roof: mats.rust, sign: 'HARBOUR SUPPLY', sub: 'ROPES · PAINT · ICE' },
      { x: -46, z: -51, w: 20, d: 16, h: 6.8, wall: mats.teal, roof: mats.grey, sign: 'LAUNDRY', sub: 'WASH · FOLD · OPEN LATE' },
      { x: -24, z: -50, w: 18, d: 17, h: 9.2, wall: mats.paleBlue, roof: mats.tile, sign: 'THE ANCHOR', sub: 'COFFEE AND PIE' },
      { x: -2, z: -51, w: 22, d: 16, h: 7.2, wall: mats.cream, roof: mats.rust, sign: 'BAIT & TACKLE', sub: 'SALT HARBOR' },
    ];
    for (const b of row) { b.yaw = Math.PI; shophouse(m, b, mats, collision, rng); }
    finish(scene, m);
  }

  // Shop Street, north row -------------------------------------------------
  {
    const m = open('shopNorth');
    const row = [
      { x: -106, z: -93, w: 20, d: 18, h: 7.4, wall: mats.paleBlue, roof: mats.rust, sign: 'ICE HOUSE', sub: 'COLD STORAGE' },
      { x: -82, z: -94, w: 22, d: 18, h: 8.6, wall: mats.coral, roof: mats.tile, sign: 'SALT HARBOR', sub: 'PORT AUTHORITY' },
      { x: -56, z: -93, w: 18, d: 17, h: 6.6, wall: mats.ochre, roof: mats.grey, sign: 'DOCK SUPPLY', sub: 'OPEN 06:00' },
      { x: 34, z: -94, w: 22, d: 18, h: 8.0, wall: mats.teal, roof: mats.rust, sign: 'NETMAKERS', sub: 'REPAIRS' },
      { x: 58, z: -93, w: 18, d: 17, h: 6.9, wall: mats.cream, roof: mats.tile, sign: 'HARBOUR POST', sub: 'PARCELS · MAIL' },
    ];
    for (const b of row) { b.yaw = 0; shophouse(m, b, mats, collision, rng); }
    finish(scene, m);
  }

  // Fish market ------------------------------------------------------------
  {
    const m = open('market');
    const b = { x: 110, z: -98, w: 64, d: 32, h: 8.8, yaw: 0 };
    marketHall(m, b, mats, collision, rng);
    const plaza = new THREE.PlaneGeometry(78, 36);
    plaza.rotateX(-Math.PI / 2);
    m.add(plaza, mats.dirt, new THREE.Matrix4().makeTranslation(108, 0.13, -64));
    plaza.dispose();
    const stalls = [
      [82, -77, 0.2, mats.tarpBlue], [96, -78, -0.15, mats.tarpBlue], [112, -77, 0.12, mats.tarpOrange],
      [128, -76, -0.1, mats.tarpBlue], [94, -74, 0.1, mats.tarpBlue], [108, -71, 0.2, mats.tarpBlue],
      [122, -70, -0.2, mats.tarpOrange], [136, -68, 0.16, mats.tarpBlue],
    ];
    for (const [x, z, yaw, canopy] of stalls) {
      stall(m, mats, x, z, yaw, canopy, rng);
      collision.addBox(x, z, 1.6, 1.3, 0, 2.4, yaw, `market:stall:${Math.round(x)}`, 'stall');
    }
    sign(m, { x: 110, z: -80, yaw: 0, d: 0 }, 'FISH MARKET', 'SALT HARBOR', 0, 7.9, 13, 2.8, { bg: '#1c5163', fg: '#ffe6b1', wide: true });
    for (let i = 0; i < 18; i++) {
      const x = 76 + i * 4;
      const z = -66 + Math.sin(i * 1.7) * 7;
      const flag = new THREE.BufferGeometry();
      flag.setAttribute('position', new THREE.Float32BufferAttribute([-0.35, 0, 0, 0.35, 0, 0, 0, -0.55, 0], 3));
      flag.setIndex([0, 1, 2]);
      flag.computeVertexNormals();
      m.add(flag, i % 2 ? mats.tarpOrange : mats.paint, new THREE.Matrix4().makeTranslation(x, 5.6, z));
      flag.dispose();
      if (i > 0) {
        const px = 76 + (i - 1) * 4;
        const pz = -66 + Math.sin((i - 1) * 1.7) * 7;
        const rope = new THREE.BoxGeometry(0.03, 0.03, Math.hypot(x - px, z - pz));
        m.add(rope, mats.metalDark, new THREE.Matrix4().compose(
          new THREE.Vector3((x + px) / 2, 5.62, (z + pz) / 2),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(x - px, z - pz), 0)),
          new THREE.Vector3(1, 1, 1),
        ));
        rope.dispose();
      }
    }
    collision.addBox(110, -80, 6.6, 0.3, 7.4, 8.4, 0, 'market:signboard', 'sign');
    finish(scene, m);
  }

  // Terminal hall ----------------------------------------------------------
  {
    const m = open('terminal');
    terminalHall(m, { x: -142, z: 67, w: 40, d: 26, h: 9.4, yaw: 0 }, mats, collision);
    finish(scene, m);
  }

  // Waterfront warehouses --------------------------------------------------
  {
    const m = open('warehouses');
    for (const b of [
      { x: -2, z: 70, w: 34, d: 24, h: 8.6, yaw: 0, wall: mats.cream, roof: mats.rust, sign: 'HARBOUR FREIGHT', sub: 'CARGO · COLD CHAIN' },
      { x: 55, z: 70, w: 24, d: 23, h: 7.8, yaw: 0, wall: mats.teal, roof: mats.grey, sign: 'DOCK SUPPLY', sub: 'MARINE STORES' },
    ]) warehouse(m, b, mats, collision);
    finish(scene, m);
  }

  // Alley houses -----------------------------------------------------------
  {
    const m = open('alley');
    for (const b of [
      { x: 47, z: -4, w: 18, d: 16, h: 6.9, wall: mats.ochre, roof: mats.rust, sign: 'SUNRISE STORE', sub: 'GROCERIES' },
      { x: 47, z: 16, w: 18, d: 15, h: 8.2, wall: mats.paleBlue, roof: mats.tile, sign: 'ALLEY CAFE', sub: 'COLD DRINKS' },
      { x: 47, z: 35, w: 18, d: 16, h: 7.1, wall: mats.coral, roof: mats.grey, sign: 'REPAIR SHOP', sub: 'FANS · RADIOS' },
      { x: 47, z: 54, w: 18, d: 16, h: 8.8, wall: mats.cream, roof: mats.rust, sign: 'BOARDING', sub: 'ROOMS BY THE WEEK' },
    ]) { b.yaw = Math.PI / 2; shophouse(m, b, mats, collision, rng, { narrow: true }); }
    for (const b of [
      { x: 71.5, z: -2, w: 6, d: 15, h: 5.8, wall: mats.teal, roof: mats.grey, sign: 'ICE', sub: '' },
      { x: 71.5, z: 16, w: 6, d: 15, h: 6.4, wall: mats.ochre, roof: mats.rust, sign: 'FISH', sub: '' },
      { x: 71.5, z: 34, w: 6, d: 15, h: 5.4, wall: mats.paleBlue, roof: mats.tile, sign: 'SALT', sub: '' },
      { x: 71.5, z: 52, w: 6, d: 15, h: 6.1, wall: mats.coral, roof: mats.rust, sign: 'ROPE', sub: '' },
    ]) { b.yaw = -Math.PI / 2; shophouse(m, b, mats, collision, rng, { narrow: true, noRoofDetails: true }); }
    finish(scene, m);
  }

  // West road --------------------------------------------------------------
  {
    const m = open('west');
    for (const b of [
      { x: -191, z: 6, w: 20, d: 26, h: 9.2, wall: mats.coral, roof: mats.rust, sign: 'WEST JUNCTION', sub: 'GARAGE' },
      { x: -191, z: -32, w: 20, d: 24, h: 7.4, wall: mats.teal, roof: mats.grey, sign: 'TIDE MOTEL', sub: 'VACANCY' },
      { x: -155, z: -32, w: 18, d: 22, h: 8.4, wall: mats.paleBlue, roof: mats.tile, sign: 'PHARMACY', sub: 'OPEN LATE' },
    ]) { b.yaw = b.x > -175 ? -Math.PI / 2 : Math.PI / 2; shophouse(m, b, mats, collision, rng); }
    finish(scene, m);
  }

  // East bank --------------------------------------------------------------
  {
    const m = open('east');
    warehouse(m, { x: 174, z: -8, w: 32, d: 30, h: 8.8, yaw: Math.PI / 2, wall: mats.paleBlue, roof: mats.rust, sign: 'EAST QUAY', sub: 'BONDED WAREHOUSE' }, mats, collision);
    finish(scene, m);
  }

  // Inner city -------------------------------------------------------------
  {
    const m = open('inner');
    const cityBlocks = [
      { x: -136, z: -25, w: 34, d: 28, h: 9.6, yaw: 0, wall: mats.coral, roof: mats.rust, sign: 'COLD STORAGE', sub: 'HARBOUR ICE' },
      { x: -98, z: -24, w: 32, d: 30, h: 8.2, yaw: 0, wall: mats.ochre, roof: mats.tile, sign: 'HARBOUR VIEW', sub: 'APARTMENTS' },
      { x: -56, z: -22, w: 30, d: 28, h: 7.4, yaw: 0, wall: mats.teal, roof: mats.grey, sign: 'FISH SMOKEHOUSE', sub: 'OPEN AT DAWN' },
      { x: -16, z: -24, w: 28, d: 30, h: 8.8, yaw: 0, wall: mats.paleBlue, roof: mats.tile, sign: 'BAGAS MOTORS', sub: 'REPAIRS · TOWING' },
      { x: 22, z: -26, w: 30, d: 28, h: 9.4, yaw: 0, wall: mats.cream, roof: mats.rust, sign: 'SALT HARBOR CLINIC', sub: 'WALK IN' },
      { x: -136, z: 30, w: 36, d: 26, h: 8.4, yaw: 0, wall: mats.ochre, roof: mats.rust, sign: 'CANNERY', sub: 'SINCE 1961' },
      { x: -96, z: 30, w: 32, d: 28, h: 9.2, yaw: Math.PI, wall: mats.teal, roof: mats.grey, sign: 'NET LOFTS', sub: 'ROOMS BY THE WEEK' },
      { x: -56, z: 32, w: 32, d: 26, h: 7.8, yaw: 0, wall: mats.coral, roof: mats.tile, sign: 'HARBOUR POST', sub: 'PARCELS · MAIL' },
      { x: -16, z: 30, w: 30, d: 28, h: 8.6, yaw: Math.PI, wall: mats.paleBlue, roof: mats.rust, sign: 'SALT & IRON', sub: 'HARDWARE' },
      { x: 20, z: 30, w: 28, d: 26, h: 7.2, yaw: 0, wall: mats.cream, roof: mats.tile, sign: 'FERRY CREW', sub: 'BUNKHOUSE' },
    ];
    for (const b of cityBlocks) {
      if (b.h > 9) warehouse(m, b, mats, collision);
      else shophouse(m, b, mats, collision, rng);
    }
    for (const lane of [{ x: -77, z: 2, w: 7, d: 88 }, { x: -36, z: 3, w: 7, d: 84 }, { x: -46, z: 12, w: 82, d: 6 }]) {
      const geo = new THREE.BoxGeometry(lane.w, 0.18, lane.d);
      m.add(geo, mats.concrete, local({ x: lane.x, z: lane.z, yaw: 0 }, 0, 0.09, 0));
      geo.dispose();
    }
    courtyard(m, mats, collision, 5, 7);
    finish(scene, m);
  }

  return { blocks: Object.keys(groups).length, materials: mats };
}

function finish(scene, merger) { merger.finish(scene); }

function makeMaterials(base) {
  const wall = (colour) => new THREE.MeshStandardMaterial({ map: getTexture('concrete'), color: colour, roughness: 0.91 });
  const roof = (map, colour) => new THREE.MeshStandardMaterial({ map: getTexture(map), color: colour, roughness: 0.86, side: THREE.DoubleSide });
  return {
    cream: wall(0xd9cdb6),
    coral: wall(0xbf6f5d),
    teal: wall(0x558b86),
    ochre: wall(0xc59a50),
    paleBlue: wall(0x9fb9bd),
    concrete: base.concrete,
    concreteDark: new THREE.MeshStandardMaterial({ map: getTexture('concrete'), color: 0x9b9484, roughness: 0.92 }),
    rust: roof('corrugated', 0xffffff),
    tile: roof('roofTile', 0xffffff),
    grey: roof('corrugated', 0x8e928c),
    metal: base.metal,
    metalDark: new THREE.MeshStandardMaterial({ color: 0x394341, roughness: 0.65, metalness: 0.3 }),
    wood: base.wood,
    woodDark: base.woodDark,
    glass: new THREE.MeshStandardMaterial({ color: 0x9db9bd, roughness: 0.16, metalness: 0.55, transparent: true, opacity: 0.78 }),
    glassLit: new THREE.MeshStandardMaterial({ color: 0xffdda2, emissive: 0xffa94d, emissiveIntensity: 0.8, roughness: 0.4 }),
    paint: base.paint,
    dark: new THREE.MeshStandardMaterial({ color: 0x252a2b, roughness: 0.85 }),
    tarpBlue: new THREE.MeshStandardMaterial({ map: getTexture('awning'), color: 0xffffff, roughness: 0.88, side: THREE.DoubleSide }),
    tarpOrange: new THREE.MeshStandardMaterial({ map: getTexture('awning'), color: 0xd88b3f, roughness: 0.9, side: THREE.DoubleSide }),
    cloth: [0xc85a4b, 0x4b7fa3, 0xe0c05a].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, side: THREE.DoubleSide })),
    dirt: new THREE.MeshStandardMaterial({ map: getTexture('dirt'), roughness: 0.98 }),
  };
}

function local(b, lx, ly, lz, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const root = new THREE.Matrix4().makeRotationY(b.yaw);
  root.setPosition(b.x, 0, b.z);
  return root.multiply(new THREE.Matrix4().compose(
    new THREE.Vector3(lx, ly, lz),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz)),
    new THREE.Vector3(sx, sy, sz),
  ));
}

function box(m, mat, b, lx, ly, lz, w, h, d, rx = 0, rz = 0) {
  const geo = new THREE.BoxGeometry(w, h, d);
  m.add(geo, mat, local(b, lx, ly, lz, rx, rz));
  geo.dispose();
}

function shell(m, b, mats, collision, opts = {}) {
  const { w, d, h } = b;
  box(m, b.wall, b, 0, h / 2, 0, w, h, d);
  box(m, mats.concreteDark, b, 0, 0.28, 0, w + 0.12, 0.56, d + 0.12);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) box(m, mats.concreteDark, b, sx * (w / 2 - 0.08), h / 2, sz * (d / 2 - 0.08), 0.28, h, 0.28);
  }
  box(m, mats.paint, b, 0, h * 0.54, 0, w + 0.2, 0.14, d + 0.2);
  box(m, mats.dark, b, 0, 0.08, 0, w + 0.3, 0.16, d + 0.3);
  if (opts.gable !== false) gableRoof(m, b.roof, b, w, d, h, opts.roofPitch ?? 0.34, 0.9);
  collision.addBox(b.x, b.z, w / 2, d / 2, 0, h, b.yaw, `building:${opts.label ?? Math.round(b.x)}`, 'building');
}

function gableRoof(m, mat, b, w, d, h, pitch, overhang) {
  const run = d / 2 + overhang;
  const rise = Math.tan(pitch) * run;
  const slope = Math.hypot(run, rise);
  const width = w + overhang * 2;
  for (const side of [-1, 1]) {
    const geo = new THREE.BoxGeometry(width, 0.14, slope);
    m.add(geo, mat, local(b, 0, h + rise / 2 - 0.02, (side * run) / 2, side * pitch, 0));
    geo.dispose();
  }
  for (const side of [-1, 1]) {
    const x = side * (w / 2 + 0.01);
    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([x, h - 0.02, -d / 2, x, h - 0.02, d / 2, x, h + rise - 0.02, 0], 3));
    tri.setIndex([0, 1, 2]);
    tri.computeVertexNormals();
    m.add(tri, mat, local(b, 0, 0, 0));
    tri.dispose();
  }
  box(m, mat, b, 0, h + rise + 0.04, 0, width + 0.08, 0.16, 0.28);
  for (const side of [-1, 1]) box(m, mat, b, 0, h + rise * 0.04, side * (run + 0.02), width, 0.22, 0.12);
}

function shophouse(m, b, mats, collision, rng, opts = {}) {
  shell(m, b, mats, collision, { label: 'shop', roofPitch: 0.4 });
  const front = b.d / 2 + 0.02;
  const doorX = range(rng, -b.w * 0.22, b.w * 0.22);
  recessedDoor(m, mats, b, doorX, 2.0, 1.5, 2.6, mats.woodDark);
  if (!opts.narrow) {
    awning(m, mats, b, doorX, 3.35, 3.6, 1.7);
    sign(m, b, b.sign ?? 'SHOP', b.sub ?? '', 0, 4.1, Math.min(8, b.w * 0.7), 1.15, { bg: '#2a4650', fg: '#f2dfb2' });
  }
  const cols = Math.max(2, Math.floor(b.w / 4));
  for (let row = 0; row < 2; row++) {
    for (let c = 0; c < cols; c++) {
      const lx = (c - (cols - 1) / 2) * (b.w / (cols + 0.4));
      if (Math.abs(lx - doorX) < 1.4 && row === 0) continue;
      const ly = 2.9 + row * 2.2;
      if (ly > b.h - 1.2) continue;
      window(m, mats, b, lx, ly, front, 1.1, 1.35, rng() < 0.24);
    }
  }
  if (!opts.narrow) {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 2; i++) {
        const lz = (i - 0.5) * b.d * 0.46;
        sideWindow(m, mats, b, side * (b.w / 2 + 0.02), 3.3, lz, side, 1.1, 1.25);
        if (b.h > 8.2) sideWindow(m, mats, b, side * (b.w / 2 + 0.02), 5.7, lz, side, 1.0, 1.1);
      }
    }
    box(m, mats.woodDark, b, range(rng, -b.w * 0.2, b.w * 0.2), 1.1, -(b.d / 2 + 0.02), 1.4, 2.2, 0.14);
    backWindow(m, mats, b, 0, 3.2, 2.2, 1.1);
    pipes(m, mats, b, -b.w / 2 + 0.8, b.h + 0.2);
  }
  acUnit(m, mats, b, range(rng, -b.w * 0.3, b.w * 0.3), b.h - 1.1, 0.9);
  pipes(m, mats, b, range(rng, -b.w * 0.45, b.w * 0.45), b.h + 0.6);
  if (rng() < 0.7) laundry(m, mats, b, range(rng, -b.w * 0.25, b.w * 0.25), 4.7, rng);
  if (rng() < 0.55) antenna(m, mats, b, range(rng, -b.w * 0.25, b.w * 0.25), b.h + 1.4);
  if (rng() < 0.3 && !opts.narrow) balcony(m, mats, b, range(rng, -b.w * 0.22, b.w * 0.22), 3.9, 2.6);
  if (b.yaw === Math.PI && b.z > -56) awning(m, mats, b, b.w * 0.28, 3.2, 4.0, 2.0, mats.tarpBlue);
}

function marketHall(m, b, mats, collision, rng) {
  const { w, d, h } = b;
  box(m, mats.paleBlue, b, 0, h / 2, -d / 2 + 0.4, w, h, 0.8);
  for (const side of [-1, 1]) box(m, mats.paleBlue, b, side * (w / 2 - 0.4), h / 2, 0, 0.8, h, d);
  box(m, mats.concreteDark, b, 0, 0.25, 0, w, 0.5, d);
  gableRoof(m, mats.rust, b, w, d, h, 0.32, 1.4);
  for (let i = 0; i < 7; i++) {
    const lx = (i - 3) * (w / 8);
    box(m, mats.concrete, b, lx, h * 0.42, d / 2 - 0.5, 0.7, h * 0.84, 0.7);
    collision.addBoxAt(b.x + lx * Math.cos(b.yaw), b.z - lx * Math.sin(b.yaw), 0.7, 0.7, 0, h * 0.84, b.yaw, `market:column:${i}`, 'pillar');
  }
  collision.addBox(b.x, b.z - d / 2 + 0.4, w / 2, 0.4, 0, h, b.yaw, 'market:back-wall', 'building');
  for (const side of [-1, 1]) {
    collision.addBox(b.x + side * (w / 2 - 0.4) * Math.cos(b.yaw), b.z - side * (w / 2 - 0.4) * Math.sin(b.yaw), 0.4, d / 2, 0, h, b.yaw, 'market:side-wall', 'building');
  }
  awning(m, mats, b, 0, h * 0.72, 3.0, 4.0, mats.tarpBlue);
  for (let i = 0; i < 12; i++) {
    const lx = range(rng, -w * 0.46, w * 0.46);
    box(m, mats.glassLit, b, lx, h * 0.62, range(rng, -d * 0.35, d * 0.25), 0.34, 0.2, 0.34);
    box(m, mats.metalDark, b, lx, h * 0.72, 0, 0.03, 0.4, 0.03);
  }
  for (let i = 0; i < 9; i++) {
    const lx = (i % 3 - 1) * 12 + range(rng, -2, 2);
    const lz = -d * 0.2 + Math.floor(i / 3) * 6;
    box(m, mats.wood, b, lx, 0.9, lz, 4.4, 0.16, 1.7);
    box(m, mats.metalDark, b, lx, 0.45, lz, 4.0, 0.5, 1.4);
    for (let g = 0; g < 4; g++) box(m, [mats.tarpOrange, mats.paint, mats.cloth[0]][g % 3], b, lx - 1.5 + g, 1.05, lz, 0.6, 0.22, 0.8);
    collision.addBox(b.x + lx, b.z + lz, 2.2, 0.9, 0, 1.0, b.yaw, 'market:fish-table', 'prop');
  }
}

function terminalHall(m, b, mats, collision) {
  const { w, d, h } = b;
  box(m, mats.cream, b, 0, h / 2, 0, w, h, d);
  box(m, mats.concreteDark, b, 0, 0.3, 0, w + 0.2, 0.6, d + 0.2);
  gableRoof(m, mats.grey, b, w, d, h, 0.26, 1.6);
  const front = d / 2 + 0.03;
  for (let i = 0; i < 7; i++) {
    const lx = (i - 3) * (w / 8);
    box(m, mats.glass, b, lx, 3.3, front, w / 8 - 0.32, 5.0, 0.08);
    box(m, mats.metalDark, b, lx - w / 16, 3.3, front + 0.05, 0.12, 5.2, 0.12);
    box(m, mats.metalDark, b, lx + w / 16, 3.3, front + 0.05, 0.12, 5.2, 0.12);
  }
  box(m, mats.paint, b, 0, 6.4, front + 0.1, w, 0.5, 0.2);
  recessedDoor(m, mats, b, 0, 2.3, 3.0, 3.6, mats.glass);
  sign(m, b, 'SALT HARBOR FERRY CO.', 'TICKETS · DEPARTURES', 0, 7.8, 15, 1.9, { bg: '#14394a', fg: '#ffe6b3' });
  box(m, mats.paint, b, 0, 7.2, d / 2 + 3.4, w + 2, 0.22, 7.2);
  for (const lx of [-w / 2 + 2, 0, w / 2 - 2]) {
    box(m, mats.metal, b, lx, 3.6, d / 2 + 6.5, 0.22, 7.2, 0.22);
    collision.addBox(b.x + lx, b.z + d / 2 + 6.5, 0.16, 0.16, 0, 7.2, b.yaw, 'terminal:canopy-post', 'pillar');
  }
  box(m, mats.glassLit, b, -12, 1.3, d / 2 + 1.6, 3.2, 1.6, 2.2);
  box(m, mats.paint, b, -12, 2.2, d / 2 + 1.6, 3.5, 0.18, 2.5);
  acUnit(m, mats, b, 14, h - 1.2, 1.0);
  pipes(m, mats, b, w / 2 - 1, h + 0.8);
  collision.addBox(b.x, b.z, w / 2, d / 2, 0, h, b.yaw, 'building:terminal-hall', 'building');
}

function warehouse(m, b, mats, collision) {
  shell(m, b, mats, collision, { label: 'warehouse', roofPitch: 0.28 });
  const front = b.d / 2 + 0.03;
  box(m, mats.metalDark, b, 0, 2.5, front, 8.5, 5.0, 0.18);
  for (let i = 0; i < 9; i++) box(m, mats.metal, b, -3.8 + i * 0.95, 2.5, front + 0.1, 0.08, 4.8, 0.06);
  sign(m, b, b.sign ?? 'DOCK SUPPLY', b.sub ?? 'MARINE STORES', 0, 6.6, 11, 1.8, { bg: '#7a3627', fg: '#f5e3bb' });
  vents(m, mats, b, 6, b.h + 0.4);
  pipes(m, mats, b, -b.w / 2 + 1.4, b.h + 0.2);
  sideSign(m, b, 1, b.sign ?? 'HARBOUR FREIGHT', b.sub ?? 'CARGO · SALT HARBOR', 0, b.h * 0.66, 13, 2.1, { bg: '#233f48', fg: '#f1d9a8' });
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) sideWindow(m, mats, b, side * (b.w / 2 + 0.03), b.h * 0.55, (i - 1) * b.d * 0.3, side, 1.6, 1.0);
    box(m, mats.metalDark, b, side * (b.w / 2 + 0.02), 1.25, b.d * 0.2, 0.14, 2.5, 2.4);
    for (const lz of [-b.d / 2 + 0.2, b.d / 2 - 0.2]) {
      const pipe = new THREE.CylinderGeometry(0.11, 0.11, b.h + 0.4, 6);
      m.add(pipe, mats.metalDark, local(b, side * (b.w / 2 - 0.18), (b.h + 0.4) / 2, lz));
      pipe.dispose();
    }
  }
  box(m, mats.metal, b, b.w * 0.2, b.h + 0.8, -b.d * 0.15, 2.2, 1.4, 1.8);
  const tank = new THREE.CylinderGeometry(1.1, 1.1, 1.6, 10);
  m.add(tank, mats.metal, local(b, -b.w * 0.22, b.h + 0.9, b.d * 0.1));
  tank.dispose();
  box(m, mats.concreteDark, b, 0, 0.35, front + 0.9, 12, 0.7, 1.8);
}

function recessedDoor(m, mats, b, lx, width, height, dy, doorMat) {
  const front = b.d / 2 + 0.02;
  box(m, doorMat, b, lx, height / 2, front - 0.08, width, height, 0.16);
  box(m, mats.paint, b, lx - width / 2 - 0.1, height / 2, front + 0.02, 0.18, height + 0.2, 0.22);
  box(m, mats.paint, b, lx + width / 2 + 0.1, height / 2, front + 0.02, 0.18, height + 0.2, 0.22);
  box(m, mats.paint, b, lx, height + 0.12, front + 0.02, width + 0.4, 0.2, 0.22);
  box(m, mats.dark, b, lx, height * 0.55, front - 0.02, width * 0.06, height * 0.1, 0.05);
  if (dy > 3) box(m, mats.paint, b, lx, dy - 1.4, front + 0.06, width + 1.2, 0.14, 1.0);
}

function window(m, mats, b, lx, ly, front, w, h, lit) {
  box(m, lit ? mats.glassLit : mats.glass, b, lx, ly, front + 0.02, w, h, 0.06);
  box(m, mats.paint, b, lx - w / 2 - 0.08, ly, front + 0.06, 0.14, h + 0.25, 0.16);
  box(m, mats.paint, b, lx + w / 2 + 0.08, ly, front + 0.06, 0.14, h + 0.25, 0.16);
  box(m, mats.paint, b, lx, ly + h / 2 + 0.08, front + 0.06, w + 0.3, 0.14, 0.16);
  box(m, mats.paint, b, lx, ly - h / 2 - 0.08, front + 0.06, w + 0.3, 0.16, 0.22);
  box(m, mats.dark, b, lx, ly + h * 0.2, front + 0.12, w, 0.04, 0.04);
}

function backWindow(m, mats, b, lx, ly, w, h) {
  box(m, mats.glass, b, lx, ly, -(b.d / 2 + 0.02), w, h, 0.06);
  box(m, mats.paint, b, lx - w / 2 - 0.08, ly, -(b.d / 2 + 0.06), 0.14, h + 0.25, 0.16);
  box(m, mats.paint, b, lx + w / 2 + 0.08, ly, -(b.d / 2 + 0.06), 0.14, h + 0.25, 0.16);
  box(m, mats.paint, b, lx, ly + h / 2 + 0.08, -(b.d / 2 + 0.06), w + 0.3, 0.14, 0.16);
  box(m, mats.dark, b, lx, ly, -(b.d / 2 + 0.12), w, 0.04, 0.04);
}

function sideWindow(m, mats, b, lx, ly, lz, side, w, h) {
  box(m, mats.glass, b, lx, ly, lz, 0.06, h, w);
  box(m, mats.paint, b, lx + side * 0.02, ly + h / 2 + 0.08, lz, 0.14, 0.14, w + 0.3);
  box(m, mats.paint, b, lx + side * 0.02, ly - h / 2 - 0.08, lz, 0.16, 0.16, w + 0.3);
}

function awning(m, mats, b, lx, ly, width, depth, material = null) {
  const mat = material ?? mats.tarpBlue;
  const front = b.d / 2 + 0.1;
  box(m, mat, b, lx, ly, front + depth / 2, width, 0.1, depth, 0.18, 0);
  for (const side of [-1, 1]) box(m, mats.metalDark, b, lx + side * (width / 2 - 0.1), ly - 0.6, front + depth - 0.1, 0.05, 1.2, 0.05);
  box(m, mat, b, lx, ly - 0.14, front + depth, width, 0.26, 0.06);
}

function sideSign(m, b, side, title, subtitle, lz, y, width, height, style) {
  const mat = new THREE.MeshStandardMaterial({ map: createSignTexture(title, subtitle, style), roughness: 0.72, metalness: 0.05 });
  const geo = new THREE.PlaneGeometry(width, height);
  geo.rotateY((side * Math.PI) / 2);
  m.add(geo, mat, local(b, side * (b.w / 2 + 0.12), y, lz));
  geo.dispose();
}

function sign(m, b, title, subtitle, lx, ly, width, height, style) {
  const mat = new THREE.MeshStandardMaterial({ map: createSignTexture(title, subtitle, style), roughness: 0.72, metalness: 0.05 });
  const geo = new THREE.PlaneGeometry(width, height);
  const front = b.d / 2 + 0.09;
  m.add(geo, mat, local(b, lx, ly, front));
  geo.dispose();
  const back = new THREE.BoxGeometry(width + 0.24, height + 0.24, 0.14);
  m.add(back, SIGN_BACKING, local(b, lx, ly, front - 0.08));
  back.dispose();
}

function standingSign(m, mats, title, subtitle, x, z, yaw, w, h, style) {
  const mat = new THREE.MeshStandardMaterial({ map: createSignTexture(title, subtitle, style), roughness: 0.75 });
  const geo = new THREE.PlaneGeometry(w, h);
  m.add(geo, mat, new THREE.Matrix4().compose(
    new THREE.Vector3(x, 1.4, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
    new THREE.Vector3(1, 1, 1),
  ));
  geo.dispose();
  const back = new THREE.BoxGeometry(w + 0.2, h + 0.2, 0.12);
  m.add(back, mats.woodDark, new THREE.Matrix4().makeTranslation(x, 1.4, z));
  back.dispose();
}

function fence(m, mats, collision, x1, z1, x2, z2) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  const yaw = Math.atan2(x2 - x1, z2 - z1);
  const midX = (x1 + x2) / 2;
  const midZ = (z1 + z2) / 2;
  for (let i = 0; i < 2; i++) {
    const rail = new THREE.BoxGeometry(0.06, 0.06, len);
    m.add(rail, mats.metal, new THREE.Matrix4().compose(
      new THREE.Vector3(midX, 0.8 + i * 0.7, midZ),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
      new THREE.Vector3(1, 1, 1),
    ));
    rail.dispose();
  }
  for (let t = 0; t <= len; t += 2.4) {
    const x = THREE.MathUtils.lerp(x1, x2, t / len);
    const z = THREE.MathUtils.lerp(z1, z2, t / len);
    const post = new THREE.BoxGeometry(0.1, 1.7, 0.1);
    m.add(post, mats.metal, new THREE.Matrix4().makeTranslation(x, 0.85, z));
    post.dispose();
  }
  // Yard fences used to be decoration only; give the rails a real proxy.
  collision.addWall(x1, z1, x2, z2, 0.22, 0, 1.75, 'workshop:fence', 'railing');
}

function acUnit(m, mats, b, lx, ly, lz) {
  box(m, mats.metal, b, lx, ly, b.d / 2 + lz, 0.9, 0.7, 0.5);
  for (let i = 0; i < 4; i++) box(m, mats.metalDark, b, lx - 0.35 + i * 0.23, ly, b.d / 2 + lz + 0.26, 0.06, 0.42, 0.03);
}

function pipes(m, mats, b, lx, top) {
  const front = b.d / 2 + 0.15;
  const pipe = new THREE.CylinderGeometry(0.09, 0.09, top, 6);
  m.add(pipe, mats.metalDark, local(b, lx, top / 2, front));
  pipe.dispose();
  for (let y = 1.2; y < top; y += 1.8) box(m, mats.metalDark, b, lx, y, front, 0.24, 0.1, 0.24);
}

function laundry(m, mats, b, lx, ly, rng) {
  const front = b.d / 2 + 0.35;
  box(m, mats.metalDark, b, lx, ly + 0.18, front, 4.2, 0.04, 0.04);
  box(m, mats.metalDark, b, lx, ly - 0.5, front, 4.2, 0.04, 0.04);
  for (let i = 0; i < 5; i++) {
    const cloth = new THREE.PlaneGeometry(range(rng, 0.4, 0.7), range(rng, 0.5, 0.9));
    m.add(cloth, mats.cloth[i % mats.cloth.length], local(b, lx - 1.8 + i * 0.85, ly - 0.05, front + 0.02, 0, range(rng, -0.05, 0.05)));
    cloth.dispose();
  }
}

function antenna(m, mats, b, lx, top) {
  const mast = new THREE.CylinderGeometry(0.035, 0.05, 3.2, 5);
  m.add(mast, mats.metalDark, local(b, lx, top + 1.4, 0));
  mast.dispose();
  for (let i = 0; i < 3; i++) box(m, mats.metalDark, b, lx, top + 0.9 + i * 0.7, 0, 1.2 - i * 0.25, 0.03, 0.03);
}

function balcony(m, mats, b, lx, ly) {
  const front = b.d / 2 + 0.8;
  box(m, mats.concrete, b, lx, ly, front, 3.0, 0.16, 1.6);
  for (let i = 0; i < 7; i++) box(m, mats.metalDark, b, lx - 1.4 + i * 0.46, ly + 0.5, front + 0.72, 0.05, 0.9, 0.05);
  box(m, mats.metalDark, b, lx, ly + 0.92, front + 0.72, 3.0, 0.06, 0.06);
}

function vents(m, mats, b, lx, ly) {
  for (let i = 0; i < 3; i++) {
    const x = lx - 2.4 + i * 2.4;
    box(m, mats.metal, b, x, ly + 0.32, 0, 0.9, 0.55, 1.4);
    box(m, mats.metalDark, b, x, ly + 0.65, 0, 0.7, 0.18, 1.2);
  }
}

function courtyard(m, mats, collision, x, z) {
  for (const dx of [-4, 4]) {
    for (const dz of [-3, 3]) {
      const post = new THREE.CylinderGeometry(0.08, 0.08, 3.2, 6);
      m.add(post, mats.metalDark, new THREE.Matrix4().makeTranslation(x + dx, 1.6, z + dz));
      post.dispose();
    }
  }
  const canopy = new THREE.BoxGeometry(9, 0.1, 7);
  m.add(canopy, mats.tarpBlue, new THREE.Matrix4().makeTranslation(x, 3.2, z));
  canopy.dispose();
  const bench = new THREE.BoxGeometry(2.4, 0.4, 0.55);
  m.add(bench, mats.wood, new THREE.Matrix4().makeTranslation(x - 2.6, 0.35, z + 1.4));
  bench.dispose();
  collision.addBox(x - 2.6, z + 1.4, 1.2, 0.3, 0, 0.55, 0, 'courtyard:bench', 'prop');
  const tank = new THREE.CylinderGeometry(0.9, 0.9, 1.4, 10);
  m.add(tank, mats.metal, new THREE.Matrix4().makeTranslation(x + 3.2, 1.0, z - 1.8));
  tank.dispose();
  collision.addBox(x + 3.2, z - 1.8, 0.9, 0.9, 0, 1.7, 0, 'courtyard:water-tank', 'prop');
}

function stall(m, mats, x, z, yaw, canopy, rng) {
  const b = { x, z, yaw, d: 1, h: 2 };
  for (const dx of [-1.2, 1.2]) {
    for (const dz of [-1.0, 1.0]) {
      const post = new THREE.CylinderGeometry(0.05, 0.05, 2.3, 5);
      m.add(post, mats.metalDark, local({ x, z, yaw }, dx, 1.15, dz));
      post.dispose();
    }
  }
  const canopyGeo = new THREE.BoxGeometry(3.0, 0.08, 2.5);
  m.add(canopyGeo, canopy, local({ x, z, yaw }, 0, 2.35, 0, 0.12, 0));
  canopyGeo.dispose();
  box(m, mats.wood, b, 0, 0.9, 0, 2.4, 0.14, 1.4);
  box(m, mats.metalDark, b, 0, 0.45, 0, 2.2, 0.7, 1.2);
  for (let i = 0; i < 6; i++) {
    box(m, [mats.tarpOrange, mats.paint, mats.cloth[0], mats.cloth[2]][i % 4], b,
      range(rng, -0.9, 0.9), 1.08, range(rng, -0.4, 0.4), 0.45, 0.2, 0.35);
  }
  const board = new THREE.PlaneGeometry(0.8, 0.45);
  m.add(board, mats.paint, local({ x, z, yaw }, 0, 1.9, 1.25));
  board.dispose();
}