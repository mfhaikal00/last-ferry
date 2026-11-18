// Last Ferry — people on the street.
// Shared mixamorig actors: Dara at the impound lot, Idris walking the terminal
// lane, citizens on the market and inner-lane loops, and the pier queue. Every
// actor plays clips from its own GLB and faces the player during a radio beat.

import * as THREE from '../vendor/three.module.min.js';
import { NODES, PED_PATHS, dampAngle } from './core.js';
import { createLabelTexture, findBone } from './assets.js';
import { walkHeightAt } from './world.js';

export class Actor {
  constructor(scene, assets, key, options = {}) {
    this.scene = scene;
    const character = assets.cloneCharacter(key);
    this.root = new THREE.Group();
    this.root.name = options.name ?? key;
    this.model = character.root;
    this.root.add(this.model);
    this.scale = character.scale;
    scene.add(this.root);
    this.mixer = new THREE.AnimationMixer(this.model);
    this.actions = new Map();
    for (const clip of character.animations) this.actions.set(clip.name, this.mixer.clipAction(clip));
    this.current = null;
    this.currentName = '';
    this.x = options.x ?? 0;
    this.z = options.z ?? 0;
    this.y = walkHeightAt(this.x, this.z, 0);
    this.yaw = options.yaw ?? 0;
    this.root.position.set(this.x, this.y, this.z);
    this.root.rotation.y = this.yaw;
    this.alive = true;
    this.hitRadius = 0.5;
    this.label = null;
    this.labelRange = options.labelRange ?? 18;
    this.attackTimer = 1.2;
    if (options.label) this.addLabel(options.label, options.sub ?? '');
    this.play(options.clip ?? this.firstIdle(), { fade: 0 });
  }

  firstIdle() {
    for (const name of ['woman_Idle', 'sipil_Neutral_Idle', 'Idle', 'Walking_police', 'Walking']) {
      if (this.actions.has(name)) return name;
    }
    return this.actions.keys().next().value;
  }

  addLabel(text, sub) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: createLabelTexture(text, sub), transparent: true, depthTest: false, depthWrite: false,
    }));
    sprite.scale.set(2.4, 0.75, 1);
    sprite.position.set(0, 2.35, 0);
    sprite.renderOrder = 20;
    sprite.visible = false;
    this.root.add(sprite);
    this.label = sprite;
  }

  play(name, options = {}) {
    const action = this.actions.get(name);
    if (!action) return null;
    if (this.currentName === name && !options.restart) {
      if (options.timeScale !== undefined) action.setEffectiveTimeScale(options.timeScale);
      return action;
    }
    action.reset();
    action.setLoop(options.once ? THREE.LoopOnce : THREE.LoopRepeat, options.once ? 1 : Infinity);
    action.clampWhenFinished = !!options.once;
    action.setEffectiveWeight(1);
    action.setEffectiveTimeScale(options.timeScale ?? 1);
    action.enabled = true;
    action.play();
    if (this.current && this.current !== action) this.current.crossFadeTo(action, options.fade ?? 0.2, false);
    this.current = action;
    this.currentName = name;
    return action;
  }

  attachRifle(assets) {
    if (!assets.rifle) return;
    const hand = findBone(this.model, 'RightHand');
    if (!hand) return;
    this.model.updateMatrixWorld(true);
    const scale = new THREE.Vector3();
    hand.getWorldScale(scale);
    const mount = new THREE.Group();
    mount.name = 'thug_weapon_mount';
    mount.scale.setScalar(1 / Math.max(0.0001, scale.x));
    hand.add(mount);
    const rifle = assets.rifle.scene.clone(true);
    rifle.visible = true;
    mount.add(rifle);
    this.weapon = { hand, rifle, mount };
    this.updateWeapon();
  }

  updateWeapon() {
    if (!this.weapon) return;
    this.weapon.hand.updateWorldMatrix(true, false);
    const boneQuat = new THREE.Quaternion();
    this.weapon.hand.getWorldQuaternion(boneQuat);
    const target = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.03, this.yaw, 0, 'YXZ'));
    this.weapon.rifle.quaternion.copy(boneQuat).invert().multiply(target);
  }

  update(dt, player = null) {
    this.mixer.update(dt);
    this.updateWeapon();
    if (!this.label) return;
    const near = player ? Math.hypot(player.x - this.x, player.z - this.z) < this.labelRange : false;
    this.label.visible = near;
    if (near) {
      const scale = THREE.MathUtils.clamp(Math.hypot(player.x - this.x, player.z - this.z) * 0.05, 1.7, 3.2);
      this.label.scale.set(scale, scale * 0.31, 1);
    }
  }

  faceTo(x, z, dt, rate = 6) {
    this.yaw = dampAngle(this.yaw, Math.atan2(x - this.x, z - this.z), rate, dt);
    this.root.rotation.y = this.yaw;
  }

  setPosition(x, z) {
    this.x = x;
    this.z = z;
    this.y = walkHeightAt(x, z, this.y);
    this.root.position.set(x, this.y, z);
  }

  die() {
    this.alive = false;
    for (const name of ['Dying', 'To_Dying', 'sipil_Hit_To_Body', 'Shove_Reaction']) {
      if (this.actions.has(name)) { this.play(name, { once: true, fade: 0.12 }); break; }
    }
  }

  chestPosition(out = new THREE.Vector3()) {
    return out.set(this.x, this.y + 1.2, this.z);
  }
}

export class PedWalker {
  constructor(actor, points, options = {}) {
    this.actor = actor;
    this.points = points;
    this.loop = options.loop ?? true;
    this.speed = options.speed ?? 1.25;
    this.distance = options.start ?? 0;
    this.total = 0;
    this.segments = [];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      this.segments.push({ a, b, len, start: this.total });
      this.total += len;
    }
    this.direction = 1;
    this.pause = 0;
    this.sync(0);
  }

  sync(dt) {
    if (this.pause > 0) { this.pause -= dt; return; }
    this.distance += this.speed * this.direction * dt;
    if (this.loop) this.distance = ((this.distance % this.total) + this.total) % this.total;
    else if (this.distance > this.total) { this.distance = this.total; this.direction = -1; }
    else if (this.distance < 0) { this.distance = 0; this.direction = 1; }
    let seg = this.segments[0];
    for (const s of this.segments) {
      if (this.distance <= s.start + s.len) { seg = s; break; }
    }
    const t = Math.min(1, (this.distance - seg.start) / seg.len);
    const x = THREE.MathUtils.lerp(seg.a[0], seg.b[0], t);
    const z = THREE.MathUtils.lerp(seg.a[1], seg.b[1], t);
    const yaw = Math.atan2((seg.b[0] - seg.a[0]) * this.direction, (seg.b[1] - seg.a[1]) * this.direction);
    this.actor.x = x;
    this.actor.z = z;
    this.actor.y = walkHeightAt(x, z, this.actor.y);
    this.actor.root.position.set(x, this.actor.y, z);
    this.actor.yaw = yaw;
    this.actor.root.rotation.y = yaw;
  }

  update(dt) { this.sync(dt); }
}

export class NpcDirector {
  constructor(scene, assets) {
    this.scene = scene;
    this.assets = assets;
    this.actors = [];
    this.walkers = [];
    this.citizens = [];

    this.dara = new Actor(scene, assets, 'dara', {
      name: 'npc_guard_dara',
      x: NODES.pos_guard_harbor.x,
      z: NODES.pos_guard_harbor.z,
      yaw: NODES.pos_guard_harbor.yaw,
      label: 'Dara',
      sub: 'Harbour Officer',
      labelRange: 30,
      clip: 'woman_Idle',
    });
    this.dara.root.add(makeRadio());
    dressOfficer(this.dara, 0xc8e838);
    this.actors.push(this.dara);

    this.idris = new Actor(scene, assets, 'police', {
      name: 'npc_pier_idris',
      x: -112, z: 106.5, yaw: Math.PI,
      label: 'Idris', sub: 'Pier Officer', labelRange: 42,
      clip: 'Walking_police',
    });
    this.idris.play('Walking_police', { timeScale: 1 });
    this.walkers.push(new PedWalker(this.idris, [[-112, 106.5], [-96, 106.5], [-96, 112.5], [-112, 112.5]], { speed: 0.95 }));
    this.actors.push(this.idris);

    const marketSit = new Actor(scene, assets, 'citizen', { x: 91, z: -47, yaw: -0.8, name: 'npc_citizen_market_sit', clip: 'sipil_Neutral_Idle', label: 'Citizen' });
    marketSit.play('sipil_Neutral_Idle', { timeScale: 0.9 });
    this.addCitizen(marketSit);

    const marketWalker = new Actor(scene, assets, 'citizen', { x: 80, z: -44, name: 'npc_citizen_market_walk', clip: 'Walking_walk', label: 'Citizen' });
    this.addCitizen(marketWalker);
    this.walkers.push(new PedWalker(marketWalker, PED_PATHS.marketWalk.points, { loop: true, speed: 1.15, start: 120 }));
    marketWalker.play('Walking_walk', { timeScale: 1.05 });

    const shopWalker = new Actor(scene, assets, 'citizen', { x: -60, z: -60, name: 'npc_citizen_shop_walk', clip: 'Walking_walk', label: 'Citizen' });
    this.addCitizen(shopWalker);
    this.walkers.push(new PedWalker(shopWalker, PED_PATHS.marketWalk.points, { loop: true, speed: 1.0, start: 420 }));
    shopWalker.play('Walking_walk', { timeScale: 0.95 });

    const terminalWalker = new Actor(scene, assets, 'citizen', { x: -120, z: 99, name: 'npc_citizen_terminal', clip: 'Walking_walk', label: 'Citizen' });
    this.addCitizen(terminalWalker);
    this.walkers.push(new PedWalker(terminalWalker, PED_PATHS.terminalWalk.points, { loop: true, speed: 0.9, start: 20 }));
    terminalWalker.play('Walking_walk', { timeScale: 0.9 });

    const queued = new Actor(scene, assets, 'citizen', { x: -90, z: 99, yaw: -Math.PI / 2, name: 'npc_citizen_ferry_queue', clip: 'sipil_Neutral_Idle', label: 'Citizen' });
    queued.play('sipil_Neutral_Idle', { timeScale: 0.8 });
    const suitcase = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.26, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x8a4a32, roughness: 0.9 }),
    );
    suitcase.position.set(0.38, 0.48, 0.1);
    suitcase.castShadow = true;
    queued.root.add(suitcase);
    this.addCitizen(queued);

    const innerWalker = new Actor(scene, assets, 'citizen', { x: -77, z: -20, name: 'npc_citizen_inner_walk', clip: 'Walking_walk', label: 'Citizen' });
    this.addCitizen(innerWalker);
    this.walkers.push(new PedWalker(innerWalker, PED_PATHS.innerLane.points, { loop: true, speed: 1.05, start: 40 }));
    innerWalker.play('Walking_walk', { timeScale: 1.0 });

    this.radioTimer = 0;
  }

  addCitizen(actor) {
    this.citizens.push(actor);
    this.actors.push(actor);
  }

  daraRadioCall() {
    this.radioTimer = 5.5;
    this.dara.play('woman_Idle', { restart: true, timeScale: 1.1 });
  }

  update(dt, player) {
    this.radioTimer = Math.max(0, this.radioTimer - dt);
    for (const walker of this.walkers) walker.update(dt);
    for (const actor of this.actors) {
      if (actor === this.dara && this.radioTimer > 0) this.dara.faceTo(player.x, player.z, dt, 2.4);
      actor.update(dt, player);
    }
  }

  setCitizenVisibility(visible) {
    for (const actor of this.citizens) actor.root.visible = visible;
  }
}

function dressOfficer(actor, colour) {
  const spine = findBone(actor.model, 'Spine2') ?? findBone(actor.model, 'Spine1');
  if (spine) {
    const group = new THREE.Group();
    group.name = 'harbour_officer_vest';
    group.scale.setScalar(1 / (actor.scale || 1));
    const vest = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.43, 0.62, 10, 1, true),
      new THREE.MeshStandardMaterial({ color: colour, roughness: 0.72, emissive: 0x3a4400, emissiveIntensity: 0.65 }),
    );
    vest.position.y = 0.12;
    vest.castShadow = true;
    group.add(vest);
    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.41, 0.42, 0.08, 10, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xcfd8d2, roughness: 0.55, metalness: 0.1 }),
    );
    stripe.position.y = 0.2;
    group.add(stripe);
    const badge = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.08, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xe0b04a, metalness: 0.4, roughness: 0.4 }),
    );
    badge.position.set(0.16, 0.26, 0.3);
    group.add(badge);
    spine.add(group);
  }
  const head = findBone(actor.model, 'Head');
  if (!head) return;
  const cap = new THREE.Group();
  cap.name = 'harbour_officer_cap';
  cap.scale.setScalar(1 / (actor.scale || 1));
  const crown = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.18, 0.1, 10),
    new THREE.MeshStandardMaterial({ color: 0x1d3242, roughness: 0.7 }),
  );
  crown.position.y = 0.08;
  crown.castShadow = true;
  cap.add(crown);
  const brim = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.02, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x14232f, roughness: 0.6 }),
  );
  brim.position.set(0, 0.02, 0.13);
  cap.add(brim);
  head.add(cap);
}

function makeRadio() {
  const group = new THREE.Group();
  group.name = 'dara_radio';
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.2, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x222a2b, roughness: 0.7 }),
  );
  body.position.set(0.24, 1.22, 0.2);
  group.add(body);
  const ant = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.16, 4),
    new THREE.MeshStandardMaterial({ color: 0x3d4544, roughness: 0.6 }),
  );
  ant.position.set(0.24, 1.4, 0.2);
  group.add(ant);
  return group;
}