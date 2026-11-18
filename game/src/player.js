// Last Ferry — Bagas on foot.
// Capsule movement against the collision world, a third-person boom camera, the
// rifle parented to mixamorig:RightHand, and a locomotion state machine whose
// one-shots always hand control back to the right movement clip.

import * as THREE from '../vendor/three.module.min.js';
import { findBone } from './assets.js';
import { NODES, WEAPON, WORLD, clamp, damp, dampAngle } from './core.js';
import { isWaterAt, walkHeightAt } from './world.js';

const WALK_SPEED = 3.4;
const RUN_SPEED = 6.6;
const ACCEL = 14;
const RADIUS = 0.4;

export class Player {
  constructor(scene, assets, collision) {
    this.scene = scene;
    this.collision = collision;
    this.assets = assets;
    this.root = new THREE.Group();
    this.root.name = 'player_bagas';
    scene.add(this.root);

    const character = assets.cloneCharacter('bagas');
    this.character = character;
    this.model = character.root;
    this.root.add(this.model);
    this.scale = character.scale;

    this.mixer = new THREE.AnimationMixer(this.model);
    this.actions = new Map();
    for (const clip of character.animations) {
      const action = this.mixer.clipAction(clip);
      action.enabled = false;
      this.actions.set(clip.name, action);
    }
    this.activeAction = null;
    this.activeName = '';
    this.oneShot = null;
    this.oneShotName = '';
    this.moveHint = null;

    this.position = new THREE.Vector3(
      NODES.spawn_player_01.x,
      walkHeightAt(NODES.spawn_player_01.x, NODES.spawn_player_01.z, 0),
      NODES.spawn_player_01.z,
    );
    this.root.position.copy(this.position);
    this.yaw = NODES.spawn_player_01.yaw;
    this.velocity = new THREE.Vector2();
    this.vertical = 0;
    this.grounded = true;
    this.health = 100;
    this.equipped = false;
    this.ammo = WEAPON.magazine;
    this.reserve = 90;
    this.fireCooldown = 0;
    this.reloadTimer = 0;
    this.cameraYaw = this.yaw + Math.PI;
    this.cameraPitch = 0.22;
    this.cameraDistance = 5.0;
    this.cameraPos = new THREE.Vector3();
    this.cameraTarget = new THREE.Vector3();
    this.cameraReady = false;
    this.driving = false;
    this.vehicle = null;
    this.stepDistance = 0;
    this.rifleMount = null;
    this.rifleObject = null;
    this.attachRifle();

    this.setState('Walking', 0);
    this.mixer.addEventListener('finished', (event) => {
      if (event.action !== this.oneShot) return;
      // Do not leave the clamped one-shot holding the skeleton: clear the state
      // name so the next locomotion set is not short-circuited, then blend out.
      this.oneShot = null;
      this.oneShotName = '';
      this.activeAction = event.action;
      this.activeName = null;
      this.refreshLocomotion(true);
    });
  }

  get x() { return this.position.x; }
  get z() { return this.position.z; }
  get y() { return this.position.y; }

  attachRifle() {
    if (!this.assets.rifle) return;
    const hand = findBone(this.model, WEAPON.bone);
    if (!hand) {
      console.warn('RightHand bone was not found on the player skeleton');
      return;
    }
    this.handBone = hand;
    const mount = new THREE.Group();
    mount.name = 'weapon_mount_right_hand';
    this.model.updateMatrixWorld(true);
    const handScale = new THREE.Vector3();
    hand.getWorldScale(handScale);
    mount.scale.setScalar(1 / Math.max(0.0001, handScale.x));
    mount.position.set(0.02, -0.03, 0.02);
    hand.add(mount);
    mount.updateMatrixWorld(true);
    this.rifleMount = mount;
    const rifle = this.assets.rifle.scene;
    rifle.visible = false;
    rifle.position.set(0, 0, 0);
    mount.add(rifle);
    this.rifleObject = rifle;
  }

  setEquipped(value) {
    this.equipped = value;
    if (this.rifleObject) this.rifleObject.visible = value && !this.driving;
    this.refreshLocomotion(true);
  }

  setDriving(value) {
    this.driving = value;
    this.model.visible = !value;
    if (this.rifleObject) this.rifleObject.visible = this.equipped && !value;
    this.velocity.set(0, 0);
    this.cancelOneShot();
    if (value) this.refreshLocomotion(true);
  }

  hasClip(name) { return this.actions.has(name); }

  cancelOneShot() {
    if (this.oneShot) {
      this.oneShot.fadeOut(0.1);
      this.oneShot = null;
      this.oneShotName = '';
      this.activeName = null;
    }
  }

  playOneShot(name, fade = 0.12) {
    const action = this.actions.get(name);
    if (!action) return false;
    if (this.oneShot && this.oneShot !== action) this.oneShot.fadeOut(fade);
    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.setEffectiveTimeScale(1);
    action.setEffectiveWeight(1);
    action.enabled = true;
    action.play();
    if (this.activeAction && this.activeAction !== action) this.activeAction.crossFadeTo(action, fade, false);
    this.oneShot = action;
    this.oneShotName = name;
    return true;
  }

  setState(name, fade = 0.2) {
    const action = this.actions.get(name) ?? this.actions.get('Walking');
    if (!action || this.activeName === name) return;
    action.reset();
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = false;
    action.setEffectiveTimeScale(1);
    action.setEffectiveWeight(1);
    action.enabled = true;
    action.play();
    if (this.activeAction && this.activeAction !== action) this.activeAction.crossFadeTo(action, fade, false);
    this.activeAction = action;
    this.activeName = name;
  }

  // Pure lateral or backwards input owns the clip even when sprinting, so the
  // strafe and reverse cycles actually play instead of a generic run.
  refreshLocomotion(force = false) {
    if (this.oneShot) return;
    const speed = Math.hypot(this.velocity.x, this.velocity.y);
    let name;
    if (this.driving) name = 'Driving';
    else if (this.equipped) name = 'Rifle_Walk';
    else if (this.moveHint === 'back') name = 'Walking_Backwards';
    else if (this.moveHint === 'left') name = 'Left_Strafe_Walk';
    else if (this.moveHint === 'right') name = 'Right_Strafe_Walking';
    else if (speed > 4.7) name = 'Fast_Run';
    else name = 'Walking';
    this.setState(name, force ? 0.12 : 0.2);
    if (!this.activeAction) return;
    if (name === 'Walking') this.activeAction.setEffectiveTimeScale(speed <= 0.35 ? 0.1 : 1.15 + speed * 0.05);
    else if (name === 'Fast_Run') this.activeAction.setEffectiveTimeScale(1.1 + speed * 0.04);
    else if (name === 'Rifle_Walk') this.activeAction.setEffectiveTimeScale(speed > 0.35 ? 1.1 : 0.12);
    else if (name === 'Walking_Backwards' || name.startsWith('Left_') || name.startsWith('Right_')) {
      this.activeAction.setEffectiveTimeScale(clamp(speed / WALK_SPEED, 0.75, 1.6));
    }
  }

  update(dt, input, camera, allowControl = true) {
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    if (this.reloadTimer > 0) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) this.finishReload();
    }
    if (this.driving) {
      this.root.visible = false;
      return;
    }
    this.root.visible = true;

    const look = input.takeLook();
    if (input.locked && allowControl) {
      this.cameraYaw -= look.dx * 0.0024;
      this.cameraPitch = clamp(this.cameraPitch + look.dy * 0.0021, -0.12, 1.05);
    }

    let forward = 0;
    let strafe = 0;
    if (allowControl) {
      forward = (input.isDown('KeyW') || input.isDown('ArrowUp') ? 1 : 0) - (input.isDown('KeyS') || input.isDown('ArrowDown') ? 1 : 0);
      strafe = (input.isDown('KeyD') || input.isDown('ArrowRight') ? 1 : 0) - (input.isDown('KeyA') || input.isDown('ArrowLeft') ? 1 : 0);
    }
    const fx = -Math.sin(this.cameraYaw);
    const fz = -Math.cos(this.cameraYaw);
    const rx = Math.cos(this.cameraYaw);
    const rz = -Math.sin(this.cameraYaw);
    let wishX = fx * forward + rx * strafe;
    let wishZ = fz * forward + rz * strafe;
    const wishLen = Math.hypot(wishX, wishZ);
    if (wishLen > 1) { wishX /= wishLen; wishZ /= wishLen; }

    this.moveHint = forward < 0 && strafe === 0 ? 'back'
      : forward === 0 && strafe > 0 ? 'right'
        : forward === 0 && strafe < 0 ? 'left' : null;

    const sprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    const speed = allowControl ? (sprint && !this.equipped ? RUN_SPEED : this.equipped ? 3.8 : WALK_SPEED) : 0;
    this.velocity.x = damp(this.velocity.x, wishX * speed, ACCEL, dt);
    this.velocity.y = damp(this.velocity.y, wishZ * speed, ACCEL, dt);

    this.sweep(dt);

    const ground = walkHeightAt(this.position.x, this.position.z, this.position.y);
    if (!this.grounded) {
      this.vertical -= 18 * dt;
      this.position.y += this.vertical * dt;
      if (this.position.y <= ground) {
        this.position.y = ground;
        this.vertical = 0;
        this.grounded = true;
      }
    } else if (allowControl && input.consume('Space')) {
      this.vertical = 4.6;
      this.grounded = false;
      this.playOneShot('Jumping', 0.1);
    } else if (ground <= this.position.y + 0.55) {
      this.position.y = damp(this.position.y, ground, 18, dt);
    }

    const px = this.position.x;
    const pz = this.position.z;
    const onBridgeDeck = this.position.y > 1.2 && Math.abs(pz - 86) < 12 && px > 38 && px < 158;
    if (isWaterAt(px, pz) && !onBridgeDeck) {
      // A last-resort guard for any gap the proxies miss: never stand in water.
      this.position.x -= this.velocity.x * dt;
      this.position.z -= this.velocity.y * dt;
      this.velocity.multiplyScalar(0.2);
      this.position.y = damp(this.position.y, walkHeightAt(this.position.x, this.position.z, this.position.y), 18, dt);
    }

    const moveSpeed = Math.hypot(this.velocity.x, this.velocity.y);
    if (allowControl && moveSpeed > 0.25) {
      this.yaw = dampAngle(this.yaw, Math.atan2(this.velocity.x, this.velocity.y), 10, dt);
    }
    if (this.equipped) this.yaw = dampAngle(this.yaw, this.cameraYaw + Math.PI, 8, dt);
    this.root.rotation.y = this.yaw;
    this.root.position.copy(this.position);

    this.stepDistance += moveSpeed * dt;
    if (this.stepDistance > (moveSpeed > 4.7 ? 2.2 : 1.8)) {
      this.stepDistance = 0;
      if (moveSpeed > 0.6) this.onFootstep?.();
    }

    this.refreshLocomotion();
    this.mixer.update(dt);
    this.updateRifleAim();
    this.updateCamera(dt, camera);
  }

  // Two-phase sweep keeps a 0.4 m capsule from skipping a railing on a slow
  // frame while still sliding along walls.
  sweep(dt) {
    const dx = this.velocity.x * dt;
    const dz = this.velocity.y * dt;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.28));
    for (let i = 0; i < steps; i++) {
      this.position.x += dx / steps;
      this.collision.resolveCircle(this.position, RADIUS, this.position.y);
      this.position.z += dz / steps;
      this.collision.resolveCircle(this.position, RADIUS, this.position.y);
    }
  }

  updateRifleAim() {
    if (!this.rifleObject || !this.handBone || !this.equipped || !this.rifleObject.visible) return;
    this.handBone.updateWorldMatrix(true, false);
    const boneQuat = new THREE.Quaternion();
    this.handBone.getWorldQuaternion(boneQuat);
    const target = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.04, this.yaw, 0, 'YXZ'));
    this.rifleObject.quaternion.copy(boneQuat).invert().multiply(target);
  }

  updateCamera(dt, camera) {
    const target = new THREE.Vector3(this.position.x, this.position.y + 1.48, this.position.z);
    const offset = new THREE.Vector3(
      Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance,
      Math.sin(this.cameraPitch) * this.cameraDistance + 0.2,
      Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance,
    );
    const dir = offset.clone().normalize();
    const hit = this.collision.raycast(target, dir, this.cameraDistance);
    const desired = target.clone().add(dir.multiplyScalar(hit ? Math.max(1.4, hit.distance - 0.35) : this.cameraDistance));
    desired.y = Math.max(desired.y, walkHeightAt(desired.x, desired.z, desired.y) + 0.45);
    if (!this.cameraReady) {
      this.cameraPos.copy(desired);
      this.cameraReady = true;
    } else {
      this.cameraPos.x = damp(this.cameraPos.x, desired.x, 18, dt);
      this.cameraPos.y = damp(this.cameraPos.y, desired.y, 18, dt);
      this.cameraPos.z = damp(this.cameraPos.z, desired.z, 18, dt);
    }
    camera.position.copy(this.cameraPos);
    this.cameraTarget.copy(target);
    camera.lookAt(target);
  }

  aimDirection(camera) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    return dir;
  }

  muzzleWorld(out = new THREE.Vector3()) {
    return this.rifleObject ? this.rifleObject.localToWorld(out.set(0, 0.01, 0.9)) : out.set(0, 0, 0);
  }

  canFire() {
    return this.equipped && !this.driving && this.fireCooldown <= 0 && this.reloadTimer <= 0 && this.ammo > 0;
  }

  fire() {
    if (!this.canFire()) return false;
    this.ammo--;
    this.fireCooldown = 0.12;
    this.cameraPitch = clamp(this.cameraPitch - 0.018, -0.12, 1.05);
    this.playOneShot('Firing_Rifle', 0.05);
    if (this.ammo === 0) this.reload();
    return true;
  }

  reload() {
    if (this.driving || this.reloadTimer > 0 || this.reserve <= 0) return;
    this.reloadTimer = 1.7;
    this.playOneShot('Reload', 0.15);
  }

  punch() {
    if (this.driving) return;
    this.playOneShot('Fist_Fight_A', 0.08);
  }

  kick() {
    if (this.driving) return;
    this.playOneShot('Quad_Punch', 0.08);
  }

  finishReload() {
    const take = Math.min(WEAPON.magazine - this.ammo, this.reserve);
    this.ammo += take;
    this.reserve -= take;
  }

  teleport(x, z, yaw = this.yaw, startY = 0) {
    this.cancelOneShot();
    this.position.set(x, walkHeightAt(x, z, startY), z);
    this.root.position.copy(this.position);
    this.yaw = yaw;
    this.cameraYaw = yaw + Math.PI;
    this.root.rotation.y = yaw;
    this.cameraReady = false;
    this.velocity.set(0, 0);
    this.vertical = 0;
    this.grounded = true;
    this.refreshLocomotion(true);
  }
}