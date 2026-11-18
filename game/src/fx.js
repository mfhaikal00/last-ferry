// Last Ferry — Salt Harbor.
// Transient effects: muzzle flashes, tracers, impact sparks, tyre smoke and a
// short damage tint. Everything is pooled by lifetime and never loads a file.

import * as THREE from '../vendor/three.module.min.js';
import { rngFor, range } from './random.js';

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.rng = rngFor('effects');
    this.glow = makeGlowTexture();
    this.spark = new THREE.SpriteMaterial({
      map: this.glow, color: 0xffb15a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.tracerMat = new THREE.LineBasicMaterial({ color: 0xffd58a, transparent: true, opacity: 0.8 });
    this.smokeMat = new THREE.SpriteMaterial({ map: this.glow, color: 0x8d8b84, transparent: true, opacity: 0.35, depthWrite: false });
  }

  flash(position) {
    const sprite = new THREE.Sprite(this.spark.clone());
    sprite.position.copy(position);
    sprite.scale.set(0.65, 0.65, 1);
    this.scene.add(sprite);
    this.items.push({ object: sprite, life: 0.07, max: 0.07, kind: 'flash' });
  }

  tracer(from, to) {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const line = new THREE.Line(geo, this.tracerMat.clone());
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

  smoke(position, amount = 1) {
    const sprite = new THREE.Sprite(this.smokeMat.clone());
    sprite.position.copy(position);
    sprite.scale.setScalar(range(this.rng, 0.5, 1.0));
    this.scene.add(sprite);
    this.items.push({ object: sprite, life: range(this.rng, 0.7, 1.3), max: 1.3, kind: 'smoke', vel: new THREE.Vector3(range(this.rng, -0.3, 0.3), 0.8, range(this.rng, -0.3, 0.3)) });
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.life -= dt;
      if (item.life <= 0) {
        this.scene.remove(item.object);
        if (item.object.geometry) item.object.geometry.dispose();
        if (item.object.material) item.object.material.dispose();
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

function makeGlowTexture() {
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