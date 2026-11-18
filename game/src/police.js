// Last Ferry — Salt Harbor.
// Wanted level and the single patrol car. The car starts at the standby point,
// joins the loop through the patrol junction, then follows the road network
// after the player: one instance for standby, chase and return.

import { distance2D } from './random.js';

export class PoliceDirector {
  constructor(fleet, player, audio) {
    this.fleet = fleet;
    this.player = player;
    this.audio = audio;
    this.patrol = fleet.patrol;
    this.path = fleet.paths.harbour;
    this.s = this.path.nearestS(173, 41);
    this.state = 'standby';
    this.wanted = 0;
    this.heat = 0;
    this.awayTime = 0;
    this.locked = false;
    this.sirenTime = 0;
    this.joinWaypoints = [[160, 42], [150, 44], [147, 44]];
    this.joinIndex = 0;
    this.onWanted = null;
  }

  setWanted(stars, locked = false) {
    this.wanted = Math.max(0, Math.min(3, stars));
    this.locked = locked;
    this.patrol.wanted = this.wanted > 0;
    if (this.wanted > 0) {
      this.state = this.state === 'chase' ? 'chase' : 'join';
      this.joinIndex = 0;
      this.awayTime = 0;
      this.s = this.path.nearestS(this.patrol.x, this.patrol.z);
    } else {
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

  update(dt) {
    const patrol = this.patrol;
    this.sirenTime += dt;
    if (this.fleet.driven === patrol) {
      this.audio?.setSiren(false, 0);
      return;
    }
    if (patrol.collisionHold > 0) {
      patrol.collisionHold -= dt;
      patrol.speed = 0;
      patrol.updateLights(dt, this.sirenTime, false);
      return;
    }
    if (this.state === 'join') {
      const wp = this.joinWaypoints[this.joinIndex];
      patrol.driveTo(dt, wp[0], wp[1], 12, 1.2);
      if (distance2D(patrol.x, patrol.z, wp[0], wp[1]) < 3.2) {
        this.joinIndex++;
        if (this.joinIndex >= this.joinWaypoints.length) {
          this.state = 'chase';
          this.s = this.path.nearestS(patrol.x, patrol.z);
        }
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
      patrol.whitePulse = this.sirenTime;
      patrol.applyTransform();
      patrol.root.rotation.set(0, p.yaw, 0);
      patrol.updateLights(dt, this.sirenTime, false);
      patrol.state = 'chase';

      // Off-camera decay when the player has not been seen for a while.
      const seeing = playerDist < 65;
      this.awayTime = seeing ? 0 : this.awayTime + dt;
      if (!this.locked && this.wanted > 0 && this.awayTime > 16) {
        this.setWanted(this.wanted - 1, false);
        this.awayTime = 0;
        if (this.wanted === 0) this.state = 'return';
      }
      this.audio?.setSiren(this.wanted > 0, this.sirenVolume(playerDist));
      return;
    }

    if (this.state === 'return') {
      const homeS = this.path.nearestS(173, 41);
      const p = this.path.sample(this.s);
      this.s += 10 * dt;
      const pos = this.path.sample(this.s);
      patrol.x = pos.x;
      patrol.z = pos.z;
      patrol.y = pos.y;
      patrol.yaw = pos.yaw;
      patrol.speed = 10;
      patrol.applyTransform();
      patrol.root.rotation.set(0, pos.yaw, 0);
      patrol.updateLights(dt, this.sirenTime, false);
      if (distance2D(patrol.x, patrol.z, 167, 42) < 6 || Math.abs(homeS - this.s) < 1) {
        patrol.x = 173;
        patrol.z = 41;
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

    // Standby: parked at the junction with the roof lights dark.
    if (distance2D(patrol.x, patrol.z, 173, 41) > 8) {
      this.state = 'return';
      return;
    }
    patrol.x = 173;
    patrol.z = 41;
    patrol.y = 0.16;
    patrol.yaw = -Math.PI / 2;
    patrol.speed = 0;
    patrol.applyTransform();
    patrol.root.rotation.set(0, patrol.yaw, 0);
    patrol.updateLights(dt, this.sirenTime, false);
    this.audio?.setSiren(false, 0);
  }

  sirenVolume(distance = distance2D(this.patrol.x, this.patrol.z, this.player.x, this.player.z)) {
    return Math.max(0, 1 - distance / 95) * 0.55;
  }
}