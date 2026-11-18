// Last Ferry — Salt Harbor.
// BAGAS: the on-foot character controller. A capsule footprint is moved and
// resolved against the static proxies, the third-person camera shortens against
// the same proxies, and the rifle is parented to mixamorig:RightHand with its
// barrel aligned to the character's forward axis.

import * as THREE from '../vendor/three.module.min.js';
import { findBone } from './assets.js';
import { NODES, WEAPON, WORLD } from './config.js';
import { walkHeightAt } from './roads.js';
import { clamp, damp, dampAngle } from './random.js';

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

    // Use the shared citizen body for the player: the supplied player mesh's
    // arm skin weights tear under the shared locomotion clips, while the
    // citizen body is clean and uses the same mixamorig skeleton. The red/black
    // mechanic palette is painted below so BAGAS keeps his identity.
    const character = assets.cloneCharacter('citizen');
    this.character = character;
    this.model = character.root;
    this.root.add(this.model);
    this.scale = character.scale;
    this.paintBagasBody();

    this.mixer = new THREE.AnimationMixer(this.model);
    this.actions = new Map();
    for (const clip of character.animations) {
      const action = this.mixer.clipAction(clip);
      action.enabled = false;
      this.actions.set(clip.name, action);
    }
    const alias = (names, source) => {
      const action = this.actions.get(source);
      if (action) for (const name of names) this.actions.set(name, action);
    };
    alias(['Walking', 'Fast_Run', 'Rifle_Walk'], 'Walking_walk');
    alias(['Firing_Rifle', 'Reload', 'Jumping'], 'sipil_Hit_To_Body');
    alias(['Driving'], 'sipil_Sitting_Pose');
    this.actions.set('Idle', this.actions.get('sipil_Neutral_Idle'));

    this.activeAction = null;
    this.activeName = '';
    this.oneShot = null;

    this.position = new THREE.Vector3(NODES.spawn_player_01.x, walkHeightAt(NODES.spawn_player_01.x, NODES.spawn_player_01.z, 0), NODES.spawn_player_01.z);
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
    this.lockedAim = false;
    this.stepDistance = 0;

    this.rifleMount = null;
    this.rifleObject = null;
    this.attachRifle();

    this.setState('Idle');
    this.mixer.addEventListener('finished', (event) => {
      if (this.oneShot && event.action === this.oneShot) {
        this.oneShot = null;
        this.refreshLocomotion(true);
      }
    });
  }

  get x() {
    return this.position.x;
  }

  get z() {
    return this.position.z;
  }

  get y() {
    return this.position.y;
  }

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
    if (value) this.refreshLocomotion(true);
  }

  setDriving(value) {
    this.driving = value;
    this.model.visible = !value;
    if (this.rifleObject) this.rifleObject.visible = this.equipped && !value;
    this.velocity.set(0, 0);
  }

  playOneShot(name, fade = 0.12) {
    const action = this.actions.get(name);
    if (!action) return;
    if (this.oneShot === action) return;
    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.setEffectiveTimeScale(1);
    action.setEffectiveWeight(1);
    action.enabled = true;
    action.play();
    if (this.activeAction && this.activeAction !== action) {
      this.activeAction.crossFadeTo(action, fade, false);
    }
    this.oneShot = action;
  }

  setState(name, fade = 0.2) {
    const action = this.actions.get(name);
    if (!action || this.activeName === name) return;
    action.reset();
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = false;
    action.setEffectiveTimeScale(1);
    action.setEffectiveWeight(1);
    action.enabled = true;
    action.play();
    if (this.activeAction && this.activeAction !== action) {
      this.activeAction.crossFadeTo(action, fade, false);
    }
    this.activeAction = action;
    this.activeName = name;
  }

  refreshLocomotion(force = false) {
    if (this.oneShot) return;
    const speed = Math.hypot(this.velocity.x, this.velocity.y);
    let name;
    if (this.driving) name = 'Driving';
    else if (this.equipped) name = 'Rifle_Walk';
    else if (speed > 4.7) name = 'Fast_Run';
    else if (speed > 0.35) name = 'Walking';
    else name = 'Idle';
    this.setState(name, force ? 0.12 : 0.2);
    if (this.activeAction) {
      if (name === 'Idle') this.activeAction.setEffectiveTimeScale(1);
      else if (name === 'Walking' && speed <= 0.35) this.activeAction.setEffectiveTimeScale(0.1);
      else if (name === 'Walking') this.activeAction.setEffectiveTimeScale(1.15 + speed * 0.05);
      else if (name === 'Fast_Run') this.activeAction.setEffectiveTimeScale(1.1 + speed * 0.04);
      else if (name === 'Rifle_Walk') this.activeAction.setEffectiveTimeScale(speed > 0.35 ? 1.1 : 0.12);
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
      this.updateCameraDriving(dt, camera);
      return;
    }
    this.root.visible = true;

    const look = input.takeLook();
    if (input.locked && allowControl) {
      this.cameraYaw -= look.dx * 0.0024;
      this.cameraPitch = clamp(this.cameraPitch + look.dy * 0.0021, -0.12, 1.05);
    }

    let wishX = 0;
    let wishZ = 0;
    if (allowControl) {
      const fx = -Math.sin(this.cameraYaw);
      const fz = -Math.cos(this.cameraYaw);
      const rx = Math.cos(this.cameraYaw);
      const rz = -Math.sin(this.cameraYaw);
      const forward = (input.isDown('KeyW') || input.isDown('ArrowUp') ? 1 : 0) - (input.isDown('KeyS') || input.isDown('ArrowDown') ? 1 : 0);
      const strafe = (input.isDown('KeyD') || input.isDown('ArrowRight') ? 1 : 0) - (input.isDown('KeyA') || input.isDown('ArrowLeft') ? 1 : 0);
      wishX = fx * forward + rx * strafe;
      wishZ = fz * forward + rz * strafe;
      const len = Math.hypot(wishX, wishZ);
      if (len > 1) {
        wishX /= len;
        wishZ /= len;
      }
      const sprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
      const speed = sprint && !this.equipped ? RUN_SPEED : this.equipped ? 3.8 : WALK_SPEED;
      this.velocity.x = damp(this.velocity.x, wishX * speed, ACCEL, dt);
      this.velocity.y = damp(this.velocity.y, wishZ * speed, ACCEL, dt);
    } else {
      this.velocity.x = damp(this.velocity.x, 0, 12, dt);
      this.velocity.y = damp(this.velocity.y, 0, 12, dt);
    }

    const speed = Math.hypot(this.velocity.x, this.velocity.y);
    // Move one axis at a time, resolving each step so corners slide instead of
    // trapping the capsule.
    this.position.x += this.velocity.x * dt;
    this.collision.resolveCircle(this.position, RADIUS, this.position.y);
    this.position.z += this.velocity.y * dt;
    this.collision.resolveCircle(this.position, RADIUS, this.position.y);

    const ground = walkHeightAt(this.position.x, this.position.z, this.position.y);
    if (!this.grounded) {
      this.vertical -= 18 * dt;
      this.position.y += this.vertical * dt;
      if (this.position.y <= ground) {
        this.position.y = ground;
        this.vertical = 0;
        this.grounded = true;
      }
    } else if (input.consume('Space') && allowControl) {
      this.vertical = 4.6;
      this.grounded = false;
      this.playOneShot('Jumping', 0.1);
    } else {
      if (ground <= this.position.y + 0.7) {
        this.position.y = damp(this.position.y, ground, 18, dt);
      }
    }

    if (allowControl && speed > 0.25) {
      const targetYaw = Math.atan2(this.velocity.x, this.velocity.y);
      this.yaw = dampAngle(this.yaw, targetYaw, 10, dt);
    }
    if (this.equipped) {
      const aimYaw = this.cameraYaw + Math.PI;
      this.yaw = dampAngle(this.yaw, aimYaw, 8, dt);
    }
    this.root.rotation.y = this.yaw;
    this.root.position.copy(this.position);

    this.stepDistance += speed * dt;
    if (this.stepDistance > (speed > 4.7 ? 2.2 : 1.8)) {
      this.stepDistance = 0;
      if (speed > 0.6 && this.onFootstep) this.onFootstep();
    }

    this.refreshLocomotion();
    this.mixer.update(dt);
    this.updateRifleAim();
    this.updateCamera(dt, camera);
  }

  paintBagasBody() {
    const skin = new THREE.Color(0xc08a63);
    const shirt = new THREE.Color(0xb8402f);
    const pants = new THREE.Color(0x222428);
    const shoes = new THREE.Color(0x1b1a19);
    this.model.traverse((node) => {
      if (!node.isMesh) return;
      const geo = node.geometry.clone();
      geo.computeBoundingBox();
      const minY = geo.boundingBox.min.y;
      const maxY = geo.boundingBox.max.y;
      const span = Math.max(0.001, maxY - minY);
      const pos = geo.attributes.position;
      const colours = new Float32Array(pos.count * 3);
      const c = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        const h = (pos.getY(i) - minY) / span;
        if (h > 0.84) c.copy(skin);
        else if (h > 0.52) c.copy(shirt);
        else if (h > 0.08) c.copy(pants);
        else c.copy(shoes);
        colours[i * 3] = c.r;
        colours[i * 3 + 1] = c.g;
        colours[i * 3 + 2] = c.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      node.geometry = geo;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      node.material = mats.map((mat) => {
        if (!mat) return mat;
        const copy = mat.clone();
        copy.vertexColors = true;
        copy.color.set(0xffffff);
        copy.roughness = 0.9;
        return copy;
      });
      if (node.material.length === 1) node.material = node.material[0];
    });
  }

  updateRifleAim() {
    if (!this.rifleObject || !this.handBone) return;
    if (!this.equipped || !this.rifleObject.visible) return;
    this.handBone.updateWorldMatrix(true, false);
    const boneQuat = new THREE.Quaternion();
    this.handBone.getWorldQuaternion(boneQuat);
    const target = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.04, this.yaw, 0, 'YXZ'));
    this.rifleObject.quaternion.copy(boneQuat).invert().multiply(target);
  }

  updateCamera(dt, camera) {
    const target = new THREE.Vector3(this.position.x, this.position.y + 1.48, this.position.z);
    const dist = this.cameraDistance;
    const pitch = this.cameraPitch;
    const offset = new THREE.Vector3(
      Math.sin(this.cameraYaw) * Math.cos(pitch) * dist,
      Math.sin(pitch) * dist + 0.2,
      Math.cos(this.cameraYaw) * Math.cos(pitch) * dist,
    );
    // Camera boom collision.
    const dir = offset.clone().normalize();
    const hit = this.collision.raycast(target, dir, dist);
    let finalDist = dist;
    if (hit) finalDist = Math.max(1.4, hit.distance - 0.35);
    const desired = target.clone().add(dir.multiplyScalar(finalDist));
    // Keep the camera above the pavement.
    const ground = walkHeightAt(desired.x, desired.z, desired.y);
    desired.y = Math.max(desired.y, ground + 0.45);
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

  updateCameraDriving(dt, camera) {
    // The vehicle system owns the driving camera; this is only a fallback.
    if (!this.vehicle) return;
    this.vehicle.applyCamera(camera, dt);
  }

  aimDirection(camera) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    return dir;
  }

  muzzleWorld(out = new THREE.Vector3()) {
    if (!this.rifleObject) return out.set(0, 0, 0);
    return this.rifleObject.localToWorld(out.set(0, 0.01, 0.9));
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

  finishReload() {
    const needed = WEAPON.magazine - this.ammo;
    const take = Math.min(needed, this.reserve);
    this.ammo += take;
    this.reserve -= take;
  }

  teleport(x, z, yaw = this.yaw, startY = 0) {
    this.position.set(x, walkHeightAt(x, z, startY), z);
    this.root.position.copy(this.position);
    this.yaw = yaw;
    this.cameraYaw = yaw + Math.PI;
    this.root.rotation.y = yaw;
    this.cameraReady = false;
    this.velocity.set(0, 0);
  }
}