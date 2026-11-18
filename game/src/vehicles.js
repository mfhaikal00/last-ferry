// Last Ferry — vehicles and traffic.
// Player driving uses a bicycle steering model with a swept body, a two-axis
// suspension, and a collision response that scrubs speed along the hit normal
// instead of freezing the car. Traffic follows sampled lanes; the fleet owns the
// tow truck, Unit 7, three moving civilians and three parked cars.

import * as THREE from '../vendor/three.module.min.js';
import { TRAFFIC_LOOPS, VEHICLES, WORLD, clamp, damp, dampAngle, distance2D } from './core.js';
import { bridgeHeightAt, walkHeightAt } from './world.js';

const RIGHT_LANE = 2.2;

function laneOffset(tx, tz, amount) {
  const len = Math.hypot(tx, tz) || 1;
  return { x: (-tz / len) * amount, z: (tx / len) * amount };
}

class RoadPath {
  constructor(points, offset = 0, closed = true) {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)), closed, 'catmullrom', 0.15);
    this.length = curve.getLength();
    this.count = Math.max(8, Math.ceil(this.length / 3));
    this.points = [];
    for (let i = 0; i < this.count; i++) {
      const t = i / this.count;
      const p = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      const off = laneOffset(tangent.x, tangent.z, offset);
      const x = p.x + off.x;
      const z = p.z + off.z;
      this.points.push({ x, z, y: bridgeHeightAt(x, z), tx: tangent.x, tz: tangent.z, s: t * this.length });
    }
    this.closed = closed;
  }

  sample(s) {
    const len = this.length;
    const t = this.closed ? ((s % len) + len) % len : clamp(s, 0, len);
    const idx = (t / len) * this.count;
    const i0 = Math.floor(idx) % this.count;
    const i1 = (i0 + 1) % this.count;
    const f = idx - Math.floor(idx);
    const a = this.points[i0];
    const b = this.points[i1];
    return {
      x: THREE.MathUtils.lerp(a.x, b.x, f),
      z: THREE.MathUtils.lerp(a.z, b.z, f),
      y: THREE.MathUtils.lerp(a.y, b.y, f),
      yaw: Math.atan2(b.x - a.x, b.z - a.z),
      s: t,
    };
  }

  nearestS(x, z) {
    let best = Infinity;
    let s = 0;
    for (const p of this.points) {
      const d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < best) { best = d; s = p.s; }
    }
    return s;
  }
}

export class Vehicle {
  constructor(scene, collision, assets, key, options = {}) {
    this.scene = scene;
    this.collision = collision;
    this.key = key;
    this.label = options.label ?? VEHICLES[key]?.label ?? 'Vehicle';
    const visual = assets.cloneVehicle(key === 'police' ? 'patrol' : key);
    visual.rotation.y += VEHICLES[key]?.flip ? Math.PI : 0;
    this.root = new THREE.Group();
    this.root.name = `vehicle_${key}`;
    this.root.rotation.order = 'YXZ';
    this.root.add(visual);
    scene.add(this.root);
    this.root.traverse((node) => {
      if (!node.isMesh) return;
      for (const mat of Array.isArray(node.material) ? node.material : [node.material]) {
        if (!mat || mat.name === 'Glass' || mat.name === 'CabinDark') continue;
        mat.metalness = Math.min(mat.metalness ?? 0, 0.28);
        mat.roughness = Math.max(0.42, mat.roughness ?? 0.5);
        mat.envMapIntensity = 1.0;
      }
    });

    const cfg = VEHICLES[key] ?? VEHICLES.civilian;
    this.length = cfg.length;
    this.width = cfg.width;
    this.halfLength = cfg.length / 2;
    this.halfWidth = cfg.width / 2;
    this.wheelBase = cfg.length * 0.58;
    this.maxSteer = 0.62;
    this.y = WORLD.roadY;
    this.x = options.x ?? 0;
    this.z = options.z ?? 0;
    this.yaw = options.yaw ?? 0;
    this.speed = 0;
    this.maxSpeed = key === 'tow' ? 18 : key === 'police' ? 23 : 21;
    this.reverseMax = 7;
    this.accel = key === 'tow' ? 6.5 : 10;
    this.impact = 0;
    this.collisionHold = 0;
    this.stuckTime = 0;
    this.reverseTime = 0;
    this.heightVel = 0;
    this.driver = null;
    this.wanted = false;
    this.obb = { x: this.x, z: this.z, hx: this.width / 2, hz: this.length / 2, yaw: this.yaw, cos: Math.cos(this.yaw), sin: Math.sin(this.yaw), radius: 0 };
    this.obb.radius = Math.hypot(this.obb.hx, this.obb.hz);
    this.headlights = createHeadlights(this);
    this.root.add(this.headlights);
    this.applyTransform();
    if (key === 'police') this.addLightBar();
    if (key === 'tow') this.addTowBeacon();
    this.settle();
  }

  addTowBeacon() {
    const group = new THREE.Group();
    group.name = 'tow_beacon';
    const amber = new THREE.MeshStandardMaterial({ color: 0xd77a22, emissive: 0xff8a1f, emissiveIntensity: 1.8, roughness: 0.4 });
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.2, 8), amber);
    beacon.position.set(0, 2.45, -0.25);
    group.add(beacon);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.26), new THREE.MeshStandardMaterial({ color: 0x2a2c2b, roughness: 0.7 }));
    base.position.set(0, 2.33, -0.25);
    group.add(base);
    this.root.add(group);
    this.towBeacon = beacon;
  }

  addLightBar() {
    const red = new THREE.MeshStandardMaterial({ color: 0x8b1c1c, emissive: 0xff2418, emissiveIntensity: 0.4, roughness: 0.4 });
    const blue = new THREE.MeshStandardMaterial({ color: 0x1c3c8b, emissive: 0x2a6cff, emissiveIntensity: 0.4, roughness: 0.4 });
    const group = new THREE.Group();
    group.name = 'patrol_roof_light';
    for (const [x, mat] of [[-0.5, red], [0.5, blue]]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.28), mat);
      bar.position.set(x, 1.62, -0.1);
      bar.castShadow = true;
      group.add(bar);
    }
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 0.34), new THREE.MeshStandardMaterial({ color: 0x1a1d1e, roughness: 0.7 }));
    base.position.set(0, 1.52, -0.1);
    group.add(base);
    this.root.add(group);
    this.sirenMaterials = [red, blue];
  }

  applyTransform() {
    this.root.position.set(this.x, this.y, this.z);
    this.root.rotation.y = this.yaw;
    this.obb.x = this.x;
    this.obb.z = this.z;
    this.obb.yaw = this.yaw;
    this.obb.cos = Math.cos(this.yaw);
    this.obb.sin = Math.sin(this.yaw);
  }

  syncObb() {
    this.obb.x = this.x;
    this.obb.z = this.z;
    this.obb.yaw = this.yaw;
    this.obb.cos = Math.cos(this.yaw);
    this.obb.sin = Math.sin(this.yaw);
  }

  wheelHeights() {
    const s = Math.sin(this.yaw);
    const c = Math.cos(this.yaw);
    const hx = this.halfWidth;
    const hz = this.halfLength;
    return {
      front: walkHeightAt(this.x + s * hz, this.z + c * hz, this.y, true),
      back: walkHeightAt(this.x - s * hz, this.z - c * hz, this.y, true),
      left: walkHeightAt(this.x + c * hx, this.z - s * hx, this.y, true),
      right: walkHeightAt(this.x - c * hx, this.z + s * hx, this.y, true),
    };
  }

  settle() {
    const w = this.wheelHeights();
    this.y = (w.front + w.back + w.left + w.right) / 4;
    this.heightVel = 0;
    this.applyTransform();
  }

  updateHeight(dt = 1 / 60) {
    const w = this.wheelHeights();
    const target = (w.front + w.back + w.left + w.right) / 4;
    // Spring-damper suspension: kerbs and bridge ramps load one corner, the body
    // answers over a few frames instead of snapping.
    this.heightVel += (target - this.y) * 95 * dt;
    this.heightVel *= Math.exp(-11 * dt);
    this.y += this.heightVel * dt;
    if (Math.abs(this.y - target) < 0.002 && Math.abs(this.heightVel) < 0.02) {
      this.y = target;
      this.heightVel = 0;
    }
    const pitch = -Math.atan2(w.front - w.back, this.length);
    const roll = Math.atan2(w.left - w.right, this.width);
    this.root.rotation.x = damp(this.root.rotation.x, pitch, 12, dt);
    this.root.rotation.z = damp(this.root.rotation.z, roll, 12, dt);
  }

  throttleInput(input, allowControl) {
    if (!allowControl) return { throttle: 0, steer: 0, brake: false };
    return {
      throttle: (input.isDown('KeyW') || input.isDown('ArrowUp') ? 1 : 0) - (input.isDown('KeyS') || input.isDown('ArrowDown') ? 1 : 0),
      steer: (input.isDown('KeyA') || input.isDown('ArrowLeft') ? 1 : 0) - (input.isDown('KeyD') || input.isDown('ArrowRight') ? 1 : 0),
      brake: input.isDown('Space'),
    };
  }

  update(dt, input, allowControl, sirenTime = 0) {
    if (this.collisionHold > 0) this.collisionHold = Math.max(0, this.collisionHold - dt);
    const { throttle, steer, brake } = this.throttleInput(input, allowControl && this.collisionHold <= 0);

    if (throttle > 0) this.speed += this.accel * dt;
    else if (throttle < 0) {
      if (this.speed > 0.4) this.speed -= this.accel * 1.8 * dt;
      else this.speed -= this.accel * 0.7 * dt;
    } else {
      this.speed = damp(this.speed, 0, 0.85, dt);
    }
    if (brake) this.speed = damp(this.speed, 0, 8, dt);
    this.speed = clamp(this.speed, -this.reverseMax, this.maxSpeed);
    if (Math.abs(this.speed) < 0.03 && throttle === 0) this.speed = 0;

    const speedRatio = Math.abs(this.speed) / this.maxSpeed;
    const steerAngle = this.maxSteer * steer * (1 - 0.55 * speedRatio);
    if (Math.abs(this.speed) > 0.05) {
      this.yaw += (this.speed / this.wheelBase) * Math.tan(steerAngle) * dt;
    }

    this.sweep(dt);
    this.updateHeight(dt);
    this.applyTransform();
    this.updateLights(dt, sirenTime);
  }

  // Move in short steps so a fast car cannot jump through a corner; on contact
  // the body is pushed out and only the normal component of travel is lost.
  sweep(dt) {
    const dist = this.speed * dt;
    const steps = Math.max(1, Math.min(8, Math.ceil(Math.abs(dist) / 0.3)));
    const stepDist = dist / steps;
    for (let i = 0; i < steps; i++) {
      this.x += Math.sin(this.yaw) * stepDist;
      this.z += Math.cos(this.yaw) * stepDist;
      this.syncObb();
      const hit = this.collision.resolveVehicle(this.obb, this.y);
      if (!hit) continue;
      this.x = this.obb.x;
      this.z = this.obb.z;
      const fx = Math.sin(this.yaw);
      const fz = Math.cos(this.yaw);
      const normalDot = Math.abs(fx * hit.nx + fz * hit.nz);
      this.impact = Math.max(this.impact, Math.abs(this.speed) * normalDot);
      this.speed *= Math.max(0.18, 1 - normalDot * 0.72);
      this.heightVel -= Math.min(1.4, Math.abs(this.speed) * normalDot * 0.16);
      if (normalDot > 0.7 && Math.abs(this.speed) > 5) this.collisionHold = 0.06;
      break;
    }
    this.impact = damp(this.impact, 0, 3, dt);
  }

  driveTo(dt, tx, tz, targetSpeed, brakeAt = 1.5) {
    if (this.collisionHold > 0) this.collisionHold = Math.max(0, this.collisionHold - dt);
    if (this.reverseTime > 0) {
      this.reverseTime -= dt;
      this.speed = damp(this.speed, -4, 5, dt);
      this.x += Math.sin(this.yaw) * this.speed * dt;
      this.z += Math.cos(this.yaw) * this.speed * dt;
      this.syncObb();
      this.collision.resolveVehicle(this.obb, this.y);
      this.x = this.obb.x;
      this.z = this.obb.z;
      this.updateHeight(dt);
      this.applyTransform();
      this.updateLights(dt, 0, false);
      return;
    }
    const dx = tx - this.x;
    const dz = tz - this.z;
    const dist = Math.hypot(dx, dz);
    const diff = angleDiff(this.yaw, Math.atan2(dx, dz));
    this.yaw += clamp(diff, -1.8 * dt, 1.8 * dt);
    const wanted = dist < brakeAt * 3 ? Math.min(targetSpeed, dist * 0.8) : targetSpeed;
    this.speed += (wanted > this.speed ? this.accel : -this.accel * 1.6) * dt;
    this.speed = clamp(this.speed, -4, this.maxSpeed);
    let bumped = false;
    const distStep = this.speed * dt;
    const steps = Math.max(1, Math.min(8, Math.ceil(Math.abs(distStep) / 0.3)));
    for (let i = 0; i < steps; i++) {
      this.x += Math.sin(this.yaw) * (distStep / steps);
      this.z += Math.cos(this.yaw) * (distStep / steps);
      this.syncObb();
      const hit = this.collision.resolveVehicle(this.obb, this.y);
      if (!hit) continue;
      this.x = this.obb.x;
      this.z = this.obb.z;
      this.speed *= 0.25;
      this.collisionHold = 0.08;
      bumped = true;
      break;
    }
    this.stuckTime = bumped ? this.stuckTime + dt : Math.max(0, this.stuckTime - dt * 2);
    if (this.stuckTime > 0.22) {
      // Back out of a corner rather than grinding against it forever.
      this.stuckTime = 0;
      this.reverseTime = 0.8;
      this.collisionHold = 0;
      this.speed = 0;
    }
    this.updateHeight(dt);
    this.applyTransform();
    this.updateLights(dt, 0, false);
  }

  updateLights(dt, sirenTime, braking = false) {
    if (this.sirenMaterials) {
      const pulse = (Math.sin(sirenTime * 10) + 1) / 2;
      this.sirenMaterials[0].emissiveIntensity = this.wanted ? 0.2 + pulse * 2.4 : 0.15;
      this.sirenMaterials[1].emissiveIntensity = this.wanted ? 0.2 + (1 - pulse) * 2.4 : 0.15;
    }
    if (this.headlights) this.headlights.visible = this.speed > 0.4 || this.wanted || braking;
  }

  applyCamera(camera, dt, orbit = 0, pitch = 0.22, distance = 8.2) {
    const target = new THREE.Vector3(this.x, this.y + 1.6, this.z);
    const camYaw = this.yaw + Math.PI + orbit;
    const dir = new THREE.Vector3(
      Math.sin(camYaw) * Math.cos(pitch),
      Math.sin(pitch) + 0.5 / distance,
      Math.cos(camYaw) * Math.cos(pitch),
    ).normalize();
    const hit = this.collision.raycast(target, dir, distance);
    const desired = target.clone().add(dir.multiplyScalar(hit ? Math.max(2.2, hit.distance - 0.4) : distance));
    desired.y = Math.max(desired.y, walkHeightAt(desired.x, desired.z, desired.y) + 0.5);
    camera.position.lerp(desired, 1 - Math.exp(-10 * dt));
    camera.lookAt(target);
  }

  get forward() { return { x: Math.sin(this.yaw), z: Math.cos(this.yaw) }; }
}

function angleDiff(a, b) {
  let d = (b - a + Math.PI * 3) % (Math.PI * 2) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function createHeadlights(vehicle) {
  const group = new THREE.Group();
  group.name = 'headlights';
  const mat = new THREE.MeshStandardMaterial({ color: 0xfff2c9, emissive: 0xffe0a0, emissiveIntensity: 1.4 });
  for (const side of [-1, 1]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.08), mat);
    lamp.position.set(side * (vehicle.width / 2 - 0.35), 0.62, vehicle.length / 2 - 0.05);
    group.add(lamp);
  }
  return group;
}

export class TrafficCar {
  constructor(scene, collision, assets, path, s, key = 'civilian', color = null) {
    this.path = path;
    this.vehicle = new Vehicle(scene, collision, assets, key, { label: 'Civilian Car' });
    this.vehicle.root.name = 'traffic_civilian';
    this.s = s;
    this.cruise = 8.5;
    this.blocked = 0;
    this.hitCooldown = 0;
    this.tint(color);
    this.sync();
  }

  tint(color) {
    if (!color) return;
    this.vehicle.root.traverse((node) => {
      if (!node.isMesh) return;
      const mats = (Array.isArray(node.material) ? node.material : [node.material]).map((mat) => {
        if (!mat || mat.name === 'Glass' || mat.name === 'CabinDark') return mat;
        const copy = mat.clone();
        copy.color = new THREE.Color(color);
        copy.roughness = 0.5;
        copy.metalness = 0.2;
        return copy;
      });
      node.material = mats.length === 1 ? mats[0] : mats;
    });
  }

  update(dt, player) {
    if (this.vehicle.driver || this.stolen) return;
    if (this.hitCooldown > 0) { this.hitCooldown -= dt; return; }
    const targetSpeed = this.cruise * (this.blocked > 0 ? 0.25 : 1);
    this.blocked = Math.max(0, this.blocked - dt);
    this.s += targetSpeed * dt;
    this.sync();
    if (player && !player.driving && distance2D(player.x, player.z, this.vehicle.x, this.vehicle.z) < 7) this.blocked = 0.7;
  }

  sync() {
    const p = this.path.sample(this.s);
    this.vehicle.x = p.x;
    this.vehicle.z = p.z;
    this.vehicle.y = p.y;
    this.vehicle.yaw = p.yaw;
    this.vehicle.speed = this.cruise;
    this.vehicle.applyTransform();
    this.vehicle.root.rotation.set(0, p.yaw, 0);
  }
}

export class VehicleFleet {
  constructor(scene, collision, assets) {
    this.scene = scene;
    this.collision = collision;
    this.assets = assets;
    this.vehicles = [];
    this.traffic = [];
    this.driven = null;
    this.paths = {
      harbour: new RoadPath(TRAFFIC_LOOPS.harbourLoop.points, RIGHT_LANE, true),
      harbourReverse: new RoadPath([...TRAFFIC_LOOPS.harbourLoop.points].reverse(), RIGHT_LANE, true),
      patrol: new RoadPath([[172, 41], [160, 42], [150, 44], [147, 44], [147, 64], [146, 78], [150, 86], [140, 86], [120, 86], [96, 86]], 1.4, false),
    };
    this.towTruck = new Vehicle(scene, collision, assets, 'tow', { x: 98, z: -38, yaw: Math.PI / 2, label: 'Tirta' });
    this.towTruck.root.name = 'vehicle_tow_tirta';
    this.patrol = new Vehicle(scene, collision, assets, 'police', { x: 173, z: 41, yaw: -Math.PI / 2, label: 'Unit 7' });
    this.patrol.root.name = 'vehicle_patrol_unit7';
    this.patrol.role = 'patrol';
    this.patrol.state = 'standby';
    this.patrol.autopilot = false;
    this.vehicles.push(this.towTruck, this.patrol);

    const tints = [0x3f6b8f, 0x9a4b3f, 0x53765a];
    for (const [i, start] of [0, 140, 320].entries()) {
      const path = i === 2 ? this.paths.harbourReverse : this.paths.harbour;
      const traffic = new TrafficCar(scene, collision, assets, path, start, 'civilian', tints[i]);
      traffic.vehicle.root.name = `traffic_civilian_${i}`;
      this.traffic.push(traffic);
      this.vehicles.push(traffic.vehicle);
    }

    this.civilianParked = [
      new Vehicle(scene, collision, assets, 'civilian', { x: 139, z: 4, yaw: Math.PI / 2, label: 'Civilian Car' }),
      new Vehicle(scene, collision, assets, 'civilian', { x: -160, z: -13, yaw: Math.PI, label: 'Civilian Car' }),
      new Vehicle(scene, collision, assets, 'civilian', { x: 122, z: -30, yaw: Math.PI / 2, label: 'Civilian Car' }),
    ];
    this.civilianParked[0].root.name = 'vehicle_civilian_chase_1';
    this.civilianParked[1].root.name = 'vehicle_civilian_chase_2';
    this.civilianParked[2].root.name = 'vehicle_civilian_market_lot';
    this.vehicles.push(...this.civilianParked);
  }

  nearestVehicle(player) {
    let best = null;
    for (const vehicle of this.vehicles) {
      if (vehicle === this.patrol && this.patrol.state === 'chase') continue;
      const d = distance2D(player.x, player.z, vehicle.x, vehicle.z);
      const reach = vehicle.key === 'tow' ? 4.2 : 3.2;
      if (d < reach && (!best || d < best.d)) best = { vehicle, d };
    }
    return best?.vehicle ?? null;
  }

  enter(vehicle, player) {
    for (const car of this.traffic) if (car.vehicle === vehicle) car.stolen = true;
    this.driven = vehicle;
    vehicle.driver = player;
    vehicle.speed = 0;
    vehicle.heightVel = 0;
    player.setDriving(true);
    player.vehicle = vehicle;
    player.position.set(vehicle.x, vehicle.y, vehicle.z);
    player.yaw = vehicle.yaw;
    player.cameraReady = false;
    player.ammo = Math.min(player.ammo, 30);
  }

  exit(player) {
    const vehicle = this.driven;
    if (!vehicle) return;
    const side = vehicle.width / 2 + 0.9;
    const end = vehicle.length / 2 + 1.0;
    const rx = Math.cos(vehicle.yaw);
    const rz = -Math.sin(vehicle.yaw);
    const fx = Math.sin(vehicle.yaw);
    const fz = Math.cos(vehicle.yaw);
    const candidates = [
      { x: vehicle.x + rx * side, z: vehicle.z + rz * side },
      { x: vehicle.x - rx * side, z: vehicle.z - rz * side },
      { x: vehicle.x + fx * end, z: vehicle.z + fz * end },
      { x: vehicle.x - fx * end, z: vehicle.z - fz * end },
    ];
    let spot = candidates[0];
    for (const candidate of candidates) {
      const place = { ...candidate };
      this.collision.resolveCircle(place, 0.45, vehicle.y);
      if (Math.hypot(place.x - candidate.x, place.z - candidate.z) < 0.04) { spot = place; break; }
    }
    vehicle.driver = null;
    vehicle.speed = 0;
    vehicle.heightVel = 0;
    player.setDriving(false);
    player.teleport(spot.x, spot.z, vehicle.yaw, vehicle.y);
    player.cameraYaw = vehicle.yaw + Math.PI;
    player.cameraPitch = 0.22;
    player.cameraReady = false;
    player.vehicle = null;
    this.driven = null;
  }

  update(dt, player, input, allowControl = true) {
    for (const car of this.traffic) car.update(dt, player);
    if (this.driven) {
      this.driven.update(dt, input, allowControl && !this.driven.autopilot, 0);
    } else {
      this.towTruck.updateHeight(dt);
      this.towTruck.applyTransform();
    }
    for (const vehicle of this.civilianParked) {
      vehicle.updateHeight(dt);
      vehicle.applyTransform();
    }
    this.resolveVehicleCollisions();
  }

  resolveVehicleCollisions() {
    for (let i = 0; i < this.vehicles.length; i++) {
      const a = this.vehicles[i];
      for (let j = i + 1; j < this.vehicles.length; j++) {
        const b = this.vehicles[j];
        const aDriven = a === this.driven;
        const bDriven = b === this.driven;
        if (!aDriven && !bDriven) continue;
        const overlap = CollisionWorldObb(a.obb, b.obb);
        if (!overlap) continue;
        const driven = aDriven ? a : b;
        const other = aDriven ? b : a;
        const sign = aDriven ? 1 : -1;
        driven.x += overlap.nx * overlap.depth * sign;
        driven.z += overlap.nz * overlap.depth * sign;
        driven.speed *= 0.25;
        driven.collisionHold = 0.12;
        driven.updateHeight();
        driven.applyTransform();
        if (other === this.patrol) {
          other.collisionHold = 0.5;
        } else {
          const traffic = this.traffic.find((car) => car.vehicle === other);
          if (traffic) {
            traffic.hitCooldown = 1.8;
            other.speed = 0;
          }
        }
      }
    }
  }

  resolvePlayer(player) {
    if (player.driving) return;
    for (const vehicle of this.vehicles) {
      const dx = player.position.x - vehicle.x;
      const dz = player.position.z - vehicle.z;
      const reach = Math.hypot(vehicle.width, vehicle.length) / 2 + 0.6;
      if (dx * dx + dz * dz > reach * reach) continue;
      const cos = Math.cos(vehicle.yaw);
      const sin = Math.sin(vehicle.yaw);
      const lx = dx * cos - dz * sin;
      const lz = dx * sin + dz * cos;
      const cx = clamp(lx, -vehicle.width / 2, vehicle.width / 2);
      const cz = clamp(lz, -vehicle.length / 2, vehicle.length / 2);
      let nx = lx - cx;
      let nz = lz - cz;
      let dist = Math.hypot(nx, nz);
      if (dist >= 0.45) continue;
      let push;
      if (dist < 1e-4) {
        const ox = vehicle.width / 2 - Math.abs(lx);
        const oz = vehicle.length / 2 - Math.abs(lz);
        if (ox < oz) { nx = Math.sign(lx) || 1; nz = 0; push = ox + 0.45; }
        else { nx = 0; nz = Math.sign(lz) || 1; push = oz + 0.45; }
      } else {
        push = 0.45 - dist;
        nx /= dist;
        nz /= dist;
      }
      player.position.x += (nx * cos + nz * sin) * push;
      player.position.z += (-nx * sin + nz * cos) * push;
    }
  }

  getVehicleByKey(key) {
    return this.vehicles.find((vehicle) => vehicle.key === key);
  }
}

// Local SAT import avoids a circular dependency on the collision module.
function CollisionWorldObb(a, b) {
  const axes = [[a.cos, -a.sin], [a.sin, a.cos], [b.cos, -b.sin], [b.sin, b.cos]];
  let depth = Infinity;
  let axis = null;
  for (const [ax, az] of axes) {
    const projA = Math.abs(a.hx * (a.cos * ax - a.sin * az)) + Math.abs(a.hz * (a.sin * ax + a.cos * az));
    const projB = Math.abs(b.hx * (b.cos * ax - b.sin * az)) + Math.abs(b.hz * (b.sin * ax + b.cos * az));
    const dist = Math.abs((b.x - a.x) * ax + (b.z - a.z) * az);
    const overlap = projA + projB - dist;
    if (overlap <= 0) return null;
    if (overlap < depth) {
      depth = overlap;
      const dir = (b.x - a.x) * ax + (b.z - a.z) * az >= 0 ? -1 : 1;
      axis = [ax * dir, az * dir];
    }
  }
  return { depth, nx: axis[0], nz: axis[1] };
}