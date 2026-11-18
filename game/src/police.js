// Last Ferry — the harbour patrol.
// One patrol car serves standby, junction join, pursuit and return. Wanted level
// decays when the player has been out of sight; a close on-foot tail builds a
// capture meter that resets with the chase.

import { NODES, POI, distance2D } from './core.js';

export class PoliceDirector {
  constructor(fleet, player, audio, onCapture = null) {
    this.fleet = fleet;
    this.player = player;
    this.audio = audio;
    this.onCapture = onCapture;
    this.patrol = fleet.patrol;
    this.path = fleet.paths.harbour;
    this.s = this.path.nearestS(POI.patrolStandby.x, POI.patrolStandby.z);
    this.state = 'standby';
    this.wanted = 0;
    this.heat = 0;
    this.capture = 0;
    this.awayTime = 0;
    this.locked = false;
    this.sirenTime = 0;
    this.joinWaypoints = [[160, 42], [150, 44], [147, 44]];
    this.joinIndex = 0;
    this.onWanted = null;
  }

  setWanted(stars, locked = false) {
    const next = Math.max(0, Math.min(3, stars));
    this.wanted = next;
    this.locked = locked;
    this.patrol.wanted = next > 0;
    if (next > 0) {
      this.state = this.state === 'chase' ? 'chase' : 'join';
      this.joinIndex = 0;
      this.awayTime = 0;
      this.s = this.path.nearestS(this.patrol.x, this.patrol.z);
    } else {
      this.capture = 0;
      this.state = this.patrol.state === 'standby' ? 'standby' : 'return';
      this.audio?.setSiren(false, 0);
    }
    this.onWanted?.(this.wanted);
  }

  raise() {
    if (this.wanted < 3) this.setWanted(this.wanted + 1, this.locked);
  }

  clear() {
    this.setWanted(0, false);
    this.patrol.state = 'return';
  }

  // Full checkpoint reset: no stars, no capture progress, no stale chase state.
  reset() {
    this.wanted = 0;
    this.locked = false;
    this.capture = 0;
    this.heat = 0;
    this.awayTime = 0;
    this.state = 'standby';
    this.joinIndex = 0;
    this.sirenTime = 0;
    this.patrol.wanted = false;
    this.patrol.state = 'standby';
    this.patrol.speed = 0;
    this.patrol.collisionHold = 0;
    this.patrol.x = POI.patrolStandby.x;
    this.patrol.z = POI.patrolStandby.z;
    this.patrol.y = 0.16;
    this.patrol.yaw = -Math.PI / 2;
    this.patrol.applyTransform();
    this.patrol.root.rotation.set(0, this.patrol.yaw, 0);
    this.patrol.updateLights(0, 0, false);
    this.audio?.setSiren(false, 0);
    this.onWanted?.(0);
  }

  update(dt) {
    const patrol = this.patrol;
    this.sirenTime += dt;
    if (this.fleet.driven === patrol) {
      this.audio?.setSiren(false, 0);
      return;
    }
    if (patrol.collisionHold > 0) {
      patrol.collisionHold = Math.max(0, patrol.collisionHold - dt);
      patrol.speed = 0;
      patrol.updateLights(dt, this.sirenTime, false);
      return;
    }
    if (this.state === 'join') {
      const wp = this.joinWaypoints[this.joinIndex];
      patrol.driveTo(dt, wp[0], wp[1], 12, 1.2);
      if (distance2D(patrol.x, patrol.z, wp[0], wp[1]) < 3.2 && ++this.joinIndex >= this.joinWaypoints.length) {
        this.state = 'chase';
        this.s = this.path.nearestS(patrol.x, patrol.z);
      }
      patrol.state = 'chase';
      this.audio?.setSiren(this.wanted > 0, this.sirenVolume());
      return;
    }

    if (this.state === 'chase') {
      const targetS = this.path.nearestS(this.player.x, this.player.z);
      let diff = targetS - this.s;
      if (diff < -this.path.length / 2) diff += this.path.length;
      if (diff > this.path.length / 2) diff -= this.path.length;
      const playerDist = distance2D(patrol.x, patrol.z, this.player.x, this.player.z);
      const speed = playerDist < 8 ? 3 : 17;
      this.s += Math.sign(diff) * speed * dt;
      const p = this.path.sample(this.s);
      patrol.x = p.x;
      patrol.z = p.z;
      patrol.y = p.y;
      patrol.yaw = p.yaw;
      patrol.speed = speed;
      patrol.applyTransform();
      patrol.root.rotation.set(0, p.yaw, 0);
      patrol.updateLights(dt, this.sirenTime, false);
      patrol.state = 'chase';

      const seen = playerDist < 65;
      this.awayTime = seen ? 0 : this.awayTime + dt;
      if (!this.locked && this.wanted > 0 && this.awayTime > 16) {
        this.setWanted(this.wanted - 1, false);
        this.awayTime = 0;
        if (this.wanted === 0) this.state = 'return';
      }
      this.updateCapture(dt, playerDist);
      this.audio?.setSiren(this.wanted > 0, this.sirenVolume(playerDist));
      return;
    }

    if (this.state === 'return') {
      const homeS = this.path.nearestS(POI.patrolStandby.x, POI.patrolStandby.z);
      this.s += 10 * dt;
      const p = this.path.sample(this.s);
      patrol.x = p.x;
      patrol.z = p.z;
      patrol.y = p.y;
      patrol.yaw = p.yaw;
      patrol.speed = 10;
      patrol.applyTransform();
      patrol.root.rotation.set(0, p.yaw, 0);
      patrol.updateLights(dt, this.sirenTime, false);
      if (distance2D(patrol.x, patrol.z, 167, 42) < 6 || Math.abs(homeS - this.s) < 1) {
        patrol.x = POI.patrolStandby.x;
        patrol.z = POI.patrolStandby.z;
        patrol.yaw = -Math.PI / 2;
        patrol.y = 0.16;
        patrol.speed = 0;
        patrol.applyTransform();
        patrol.root.rotation.set(0, patrol.yaw, 0);
        patrol.wanted = false;
        patrol.state = 'standby';
        this.state = 'standby';
      }
      this.audio?.setSiren(false, 0);
      return;
    }

    if (distance2D(patrol.x, patrol.z, POI.patrolStandby.x, POI.patrolStandby.z) > 8) {
      this.state = 'return';
      return;
    }
    patrol.x = POI.patrolStandby.x;
    patrol.z = POI.patrolStandby.z;
    patrol.y = 0.16;
    patrol.yaw = -Math.PI / 2;
    patrol.speed = 0;
    patrol.applyTransform();
    patrol.root.rotation.set(0, patrol.yaw, 0);
    patrol.updateLights(dt, this.sirenTime, false);
    this.audio?.setSiren(false, 0);
  }

  updateCapture(dt, distance) {
    const close = this.wanted > 0 && !this.player.driving && this.player.health > 0 && distance < 6.5;
    this.capture = close ? Math.min(1, this.capture + dt / 5.5) : Math.max(0, this.capture - dt * 0.55);
    if (this.capture < 1) return;
    this.capture = 0;
    this.player.teleport(NODES.spawn_player_01.x, NODES.spawn_player_01.z, NODES.spawn_player_01.yaw);
    this.player.health = 100;
    this.setWanted(0, false);
    this.patrol.state = 'standby';
    this.onCapture?.();
  }

  sirenVolume(distance = distance2D(this.patrol.x, this.patrol.z, this.player.x, this.player.z)) {
    return Math.max(0, 1 - distance / 95) * 0.55;
  }
}