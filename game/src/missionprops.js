// Last Ferry — the world-space mission beacon and the physical signs at the
// interaction points, so an objective can be found without the minimap.
import * as THREE from '../vendor/three.module.min.js';
import { clearOfOtherRoads, walkHeightAt } from './world.js';
import { createSignTexture } from './assets.js';

// The six places the player is asked to find, with the face that looks at the
// approach. Each is checked against every road and collision box before it is
// placed, then again against the signs already placed.
const SIGN_SPOTS = [
  { title: 'DEBT · PAY HERE', sub: 'FISH MARKET COLLECTOR', x: 100, z: -80.4, yaw: 0, w: 3.4, bg: '#3b2a16' },
  { title: 'DEBT · PAY HERE', sub: 'ALLEY OFFICE', x: 56.9, z: 40, yaw: Math.PI / 2, w: 2.6, bg: '#3b2a16' },
  { title: 'DEBT · PAY HERE', sub: 'PIER 4 COLLECTOR', x: -110.6, z: 114.5, yaw: Math.PI, w: 2.8, bg: '#3b2a16' },
  { title: 'LAST FERRY · BOARDING', sub: 'PIER 4 · TICKETS', x: -118.5, z: 110.5, yaw: Math.PI, w: 3.2, bg: '#173a48' },
  { title: 'EAST QUAY · GANGSTERS', sub: 'BERTH 9 · NO ENTRY', x: 153.5, z: 36.5, yaw: 0, w: 3.4, bg: '#3d1d1a' },
  { title: 'FERRY TERMINAL', sub: 'APRON · PIER 4', x: -128.5, z: 86.8, yaw: 0, w: 3.4, bg: '#1b4658' },
];

const SIGN_LIFT = 2.05;
const SIGN_HEIGHT = 1.05;
const SIGN_MARGIN = 0.2;

/** Distance from a point to a rotated collision box's footprint. */
function boxGap(x, z, box) {
  const dx = x - box.x;
  const dz = z - box.z;
  const lx = dx * box.cos - dz * box.sin;
  const lz = dx * box.sin + dz * box.cos;
  const gx = Math.max(Math.abs(lx) - box.hx, 0);
  const gz = Math.max(Math.abs(lz) - box.hz, 0);
  return Math.hypot(gx, gz);
}

function spotClear(spot, groundY, collision, placed) {
  for (let i = -2; i <= 2; i++) {
    const t = (i / 4) * spot.w;
    const px = spot.x + Math.cos(spot.yaw) * t;
    const pz = spot.z - Math.sin(spot.yaw) * t;
    if (!clearOfOtherRoads(px, pz, '', 0.9)) return false;
  }
  for (const box of collision.boxes) {
    if (box.y0 > groundY + SIGN_LIFT + SIGN_HEIGHT || box.y1 <= groundY + 0.08) continue;
    if (Math.hypot(box.x - spot.x, box.z - spot.z) > box.radius + spot.w / 2 + 3) continue;
    for (let i = -2; i <= 2; i++) {
      const t = (i / 4) * spot.w;
      const px = spot.x + Math.cos(spot.yaw) * t;
      const pz = spot.z - Math.sin(spot.yaw) * t;
      if (boxGap(px, pz, box) < SIGN_MARGIN) return false;
    }
  }
  return placed.every((other) => Math.hypot(other.x - spot.x, other.z - spot.z) > Math.max(other.w, spot.w) / 2 + 1.2);
}

/** A readable post sign for each interaction point. */
export function buildMissionSigns(scene, collision, materials) {
  const group = new THREE.Group();
  group.name = 'mission_signs';
  const postMaterial = new THREE.MeshStandardMaterial({
    map: materials.metal?.map ?? null,
    color: 0x6d7774,
    roughness: 0.55,
    metalness: 0.35,
  });
  const placed = [];
  for (const raw of SIGN_SPOTS) {
    const spot = { ...raw };
    const groundY = walkHeightAt(spot.x, spot.z, 4);
    if (!spotClear(spot, groundY, collision, placed)) {
      // Nudge off the obstruction rather than clip it; the spots above are
      // already clear, this only guards a future world edit.
      let found = false;
      for (const [dx, dz] of [[0, 1.6], [0, -1.6], [1.6, 0], [-1.6, 0], [1.6, 1.6], [-1.6, 1.6], [1.6, -1.6], [-1.6, -1.6]]) {
        const test = { ...spot, x: spot.x + dx, z: spot.z + dz };
        if (spotClear(test, walkHeightAt(test.x, test.z, 4), collision, placed)) {
          spot.x = test.x;
          spot.z = test.z;
          found = true;
          break;
        }
      }
      if (!found) continue;
    }
    const y = walkHeightAt(spot.x, spot.z, 4);
    const texture = createSignTexture(spot.title, spot.sub, { bg: spot.bg, fg: '#ffe3a8', wide: true });
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(spot.w, SIGN_HEIGHT),
      new THREE.MeshStandardMaterial({
        map: texture,
        emissive: 0xffffff,
        emissiveMap: texture,
        emissiveIntensity: 0.55,
        roughness: 0.55,
        side: THREE.DoubleSide,
      }),
    );
    panel.name = `sign:mission:${raw.title.toLowerCase().replace(/[^a-z]+/g, '-')}`;
    panel.position.set(spot.x, y + SIGN_LIFT, spot.z);
    panel.rotation.y = spot.yaw;
    panel.castShadow = true;
    group.add(panel);

    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, SIGN_LIFT - SIGN_HEIGHT / 2, 0.12), postMaterial);
    post.position.set(spot.x, y + (SIGN_LIFT - SIGN_HEIGHT / 2) / 2, spot.z);
    post.castShadow = true;
    group.add(post);

    collision.addBox(spot.x, spot.z, spot.w / 2, 0.15, y, y + SIGN_LIFT + SIGN_HEIGHT / 2, spot.yaw, panel.name, 'sign');
    placed.push({ title: spot.title, x: spot.x, z: spot.z, y, yaw: spot.yaw, w: spot.w });
  }
  group.userData.signs = placed;
  scene.add(group);
  return group;
}

/** A camera-facing chevron that pulses above the active objective. */
export function createBeacon(scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const glow = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
  glow.addColorStop(0, 'rgba(255,226,150,0.55)');
  glow.addColorStop(1, 'rgba(255,190,80,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 128, 128);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(38,24,8,0.85)';
  ctx.lineWidth = 9;
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.moveTo(24, 40);
  ctx.lineTo(64, 72);
  ctx.lineTo(104, 40);
  ctx.lineTo(104, 62);
  ctx.lineTo(64, 94);
  ctx.lineTo(24, 62);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.92,
    depthTest: false,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  });
  const beacon = new THREE.Sprite(material);
  beacon.name = 'mission_beacon';
  beacon.renderOrder = 20;
  beacon.scale.set(3.4, 3.4, 1);
  beacon.visible = false;
  beacon.onBeforeRender = () => {
    const pulse = 1 + Math.sin(performance.now() * 0.0022) * 0.09;
    beacon.scale.set(3.4 * pulse, 3.4 * pulse, 1);
    material.opacity = 0.8 + Math.sin(performance.now() * 0.0022) * 0.14;
  };
  scene.add(beacon);
  return beacon;
}