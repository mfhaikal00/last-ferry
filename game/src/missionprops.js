// Last Ferry — the world-space mission beacon and the physical signs at the
// interaction points, so an objective can be found without the minimap.
import * as THREE from '../vendor/three.module.min.js';

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