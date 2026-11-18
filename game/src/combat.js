// Last Ferry — Salt Harbor.
// Dock Trouble: three armed thugs at the east quay. The rifle hit-scan runs
// against head and body spheres, the thugs answer fire, and the surviving count
// feeds the mission reward.

import * as THREE from '../vendor/three.module.min.js';
import { Actor } from './npc.js';
import { NODES } from './config.js';
import { distance2D, rngFor } from './random.js';

const THUG_POSITIONS = [
  [160, 30, 2.2],
  [166, 24, 2.4],
  [173, 33, 2.0],
];

export class CombatDirector {
  constructor(context) {
    this.scene = context.scene;
    this.assets = context.assets;
    this.player = context.player;
    this.police = context.police;
    this.hud = context.hud;
    this.audio = context.audio;
    this.fx = context.fx;
    this.collision = context.collision;
    this.rng = rngFor('dock-combat');
    this.active = false;
    this.cleared = false;
    this.available = false;
    this.thugs = THUG_POSITIONS.map(([x, z, yaw], index) => {
      const actor = new Actor(this.scene, this.assets, 'gangster', {
        name: `npc_dock_thug_${index}`,
        x, z, yaw,
        clip: 'Idle',
        label: 'Dock Thug',
      });
      actor.root.visible = false;
      actor.attachRifle(this.assets);
      return { actor, health: 100, alive: true, cooldown: 1 + index * 0.4, home: { x, z, yaw } };
    });
    this.shotCooldown = 0;
    this.messageTimer = 0;
  }

  start() {
    this.active = true;
    this.cleared = false;
    this.available = false;
    this.messageTimer = 0;
    for (const thug of this.thugs) {
      thug.health = 100;
      thug.alive = true;
      thug.cooldown = 0.8 + this.rng() * 0.8;
      thug.actor.root.visible = true;
      thug.actor.alive = true;
      thug.actor.x = thug.home.x;
      thug.actor.z = thug.home.z;
      thug.actor.y = 0.16;
      thug.actor.root.position.set(thug.home.x, 0.16, thug.home.z);
      thug.actor.root.rotation.y = thug.home.yaw;
      thug.actor.play('Idle', { fade: 0.1 });
    }
    this.hud.setDialogue('DISPATCH', 'Bagas, three thugs are moving cargo at the east quay. Clear them out.', 5.0);
    this.hud.setMission('Dock Trouble', 'Armed thugs at the east quay. Press R for the rifle.');
    this.hud.showToast('Dock Trouble · press R to equip the rifle');
  }

  reset() {
    this.active = false;
    this.cleared = false;
    this.available = false;
    for (const thug of this.thugs) {
      thug.alive = false;
      thug.actor.root.visible = false;
      thug.actor.alive = true;
    }
  }

  update(dt) {
    if (!this.active) return;
    this.shotCooldown = Math.max(0, this.shotCooldown - dt);
    let alive = 0;
    for (const thug of this.thugs) {
      if (!thug.alive) {
        thug.actor.update(dt, this.player);
        continue;
      }
      alive++;
      const actor = thug.actor;
      const dist = distance2D(actor.x, actor.z, this.player.x, this.player.z);
      actor.faceTo(this.player.x, this.player.z, dt, 4);
      actor.update(dt, this.player);
      if (dist < 42) {
        thug.cooldown -= dt;
        if (thug.cooldown <= 0 && this.player.health > 0) {
          thug.cooldown = 1.25 + this.rng() * 0.9;
          this.shootAtPlayer(thug, dist);
        }
      }
      if (dist < 4.2 && this.player.health > 0) {
        this.player.health -= 0.9 * dt;
        this.hud.setHealth(this.player.health);
        if (this.player.health <= 0) this.playerDown();
      }
    }
    if (alive === 0 && !this.cleared) {
      this.cleared = true;
      this.active = false;
      this.available = false;
      this.hud.showToast('East quay cleared');
      this.audio?.success();
    }
  }

  shootAtPlayer(thug, dist) {
    const actor = thug.actor;
    actor.play('Firing_Rifle', { once: true, fade: 0.05 });
    const from = new THREE.Vector3(actor.x, actor.y + 1.2, actor.z);
    const to = new THREE.Vector3(this.player.x, this.player.y + 1.2, this.player.z);
    this.fx?.flash(from);
    this.fx?.tracer(from, to);
    this.audio?.gunshot(0.35, Math.max(0, 1 - dist / 70));
    const chance = Math.min(0.62, 0.18 + dist / 90);
    if (this.rng() < chance) {
      this.player.health = Math.max(0, this.player.health - 7);
      this.hud.setHealth(this.player.health);
      this.hud.damageFlash();
      if (this.player.health <= 0) this.playerDown();
    }
  }

  // Called by the player when the rifle fires. Returns the hit point or null.
  playerShot(origin, direction, muzzle) {
    let best = null;
    for (const thug of this.thugs) {
      if (!thug.alive) continue;
      const actor = thug.actor;
      for (const [height, radius, damage] of [[1.62, 0.36, 100], [1.12, 0.52, 38], [0.62, 0.5, 22]]) {
        const centre = new THREE.Vector3(actor.x, actor.y + height, actor.z);
        const toCentre = centre.clone().sub(origin);
        const t = toCentre.dot(direction);
        if (t < 0 || t > 90) continue;
        const closest = origin.clone().addScaledVector(direction, t);
        const miss = closest.distanceTo(centre);
        if (miss > radius) continue;
        if (!best || t < best.t) best = { t, thug, damage, point: closest, radius };
      }
    }
    if (!best) {
      const point = origin.clone().addScaledVector(direction, 90);
      this.fx?.impact(point, null, 0xcac0a4);
    } else {
      best.thug.health -= best.damage;
      this.fx?.impact(best.point, null, 0xb33b2e);
      if (best.thug.health <= 0 && best.thug.alive) {
        best.thug.alive = false;
        best.thug.actor.die();
        this.audio?.thugDown();
      }
    }
    if (muzzle) this.fx?.tracer(muzzle, best ? best.point : origin.clone().addScaledVector(direction, 60));
    return best;
  }

  playerDown() {
    this.player.health = 100;
    this.hud.setHealth(100);
    this.hud.setDialogue('BAGAS', 'I need to patch up. Back to the workshop.', 3.4);
    this.player.teleport(NODES.spawn_player_01.x, NODES.spawn_player_01.z, NODES.spawn_player_01.yaw);
    this.police?.setWanted(0, false);
    for (const thug of this.thugs) {
      thug.alive = true;
      thug.health = 100;
      thug.actor.alive = true;
      thug.actor.root.visible = true;
      thug.actor.play('Idle', { fade: 0.1 });
    }
    this.active = true;
    this.hud.showToast('Back at the workshop · the quay is still hostile');
  }
}