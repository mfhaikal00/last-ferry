// Last Ferry — Salt Harbor.
// Vehicles: player-driven arcade handling, road-following traffic, and the
// single patrol car that serves standby, pursuit and return. Static collisions
// use OBB-vs-proxy SAT, vehicle collisions use OBB-vs-OBB, and the body sits on
// the sampled road height so the wheels stay on the road across the bridge.

import * as THREE from '../vendor/three.module.min.js';
import { TRAFFIC_LOOPS, VEHICLES, WORLD } from './config.js';
import { bridgeHeightAt, walkHeightAt } from './roads.js';
import { clamp, damp, dampAngle, distance2D } from './random.js';

const RIGHT_LANE = 2.2;

function laneOffset(tx, tz, amount) {
  const len = Math.hypot(tx, tz) || 1;
  return { x: (-tz / len) * amount, z: (tx / len) * amount };
}

class RoadPath {
  constructor(points, offset = 0, closed = true) {
    const vecs = points.map(([x, z]) => new THREE.Vector3(x, 0, z));
    const curve = new THREE.CatmullRomCurve3(vecs, closed, 'catmullrom', 0.15);
    const length = curve.getLength();
    const count = Math.max(8, Math.ceil(length / 3));
    this.points = [];
    this.length = length;
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const p = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      const off = laneOffset(tangent.x, tangent.z, offset);
      const x = p.x + off.x;
      const z = p.z + off.z;
      const y = bridgeHeightAt(x, z);
      this.points.push({ x, z, y, tx: tangent.x, tz: tangent.z, s: (i / count) * length });
    }
    this.closed = closed;
    this.count = count;
  }

  sample(s) {
    const len = this.length;
    let t = this.closed ? ((s % len) + len) % len : clamp(s, 0, len);
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

  nearest(x, z) {
    let best = null;
    for (const p of this.points) {
      const d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (!best || d < best.d) best = { d, p };
    }
    return best ? best.p : null;
  }

  nearestS(x, z) {
    let best = Infinity;
    let s = 0;
    for (const p of this.points) {
      const d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < best) {
        best = d;
        s = p.s;
      }
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
    const templateKey = key === 'police' ? 'patrol' : key;
    const flip = VEHICLES[key]?.flip ? Math.PI : 0;
    const visual = assets.cloneVehicle(templateKey);
    visual.rotation.y += flip;
    this.root = new THREE.Group();
    this.root.name = this.root.name || `vehicle_${key}`;
    this.root.rotation.order = 'YXZ';
    this.root.add(visual);
    scene.add(this.root);
    this.root.traverse((node) => {
      if (!node.isMesh) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      for (const mat of mats) {
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
    this.y = WORLD.roadY;
    this.x = options.x ?? 0;
    this.z = options.z ?? 0;
    this.yaw = options.yaw ?? 0;
    this.speed = 0;
    this.vx = 0;
    this.vz = 0;
    this.maxSpeed = key === 'tow' ? 18 : key === 'police' ? 23 : 21;
    this.accel = key === 'tow' ? 6.5 : 10;
    this.impact = 0;
    this.collisionHold = 0;
    this.driver = null;
    this.obb = { x: this.x, z: this.z, hx: this.width / 2, hz: this.length / 2, yaw: this.yaw, cos: Math.cos(this.yaw), sin: Math.sin(this.yaw), radius: 0 };
    this.obb.radius = Math.hypot(this.obb.hx, this.obb.hz);
    this.wheels = [];
    this.lights = null;
    this.wanted = false;
    this.headlights = createHeadlights(this);
    this.root.add(this.headlights);
    this.applyTransform();
    if (key === 'police') this.addLightBar();
    if (key === 'tow') this.addTowDetails();
  }

  addTowDetails() {
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
    const group = new THREE.Group();
    group.name = 'patrol_roof_light';
    const red = new THREE.MeshStandardMaterial({ color: 0x8b1c1c, emissive: 0xff2418, emissiveIntensity: 0.4, roughness: 0.4 });
    const blue = new THREE.MeshStandardMaterial({ color: 0x1c3c8b, emissive: 0x2a6cff, emissiveIntensity: 0.4, roughness: 0.4 });
    for (const [x, mat] of [[-0.5, red], [0.5, blue]]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.28), mat);
      bar.position.set(x, 1.62, -0.1);
      bar.castShadow = true;
      group.add(bar);
    }
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 0.34), new THREE.MeshStandardMaterial({ color: 0x1a1d1e, roughness: 0.7 }));
    base.position.set(0, 1.52, -0.1);
    group.add(base);
    // The model is scaled to a 4.95 m car, so the roof height is about 1.5 m.
    this.root.add(group);
    this.lightBar = group;
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

  updateHeight(dt = 1 / 60) {
    const front = walkHeightAt(this.x + Math.sin(this.yaw) * this.halfLength, this.z + Math.cos(this.yaw) * this.halfLength, this.y, true);
    const back = walkHeightAt(this.x - Math.sin(this.yaw) * this.halfLength, this.z - Math.cos(this.yaw) * this.halfLength, this.y, true);
    const left = walkHeightAt(this.x + Math.cos(this.yaw) * this.halfWidth, this.z - Math.sin(this.yaw) * this.halfWidth, this.y, true);
    const right = walkHeightAt(this.x - Math.cos(this.yaw) * this.halfWidth, this.z + Math.sin(this.yaw) * this.halfWidth, this.y, true);
    const target = (front + back + left + right) / 4;
    this.y = damp(this.y, target, 18, dt);
    const pitch = -Math.atan2(front - back, this.length);
    const roll = Math.atan2(left - right, this.width);
    this.root.rotation.x = damp(this.root.rotation.x, pitch, 10, dt);
    this.root.rotation.z = damp(this.root.rotation.z, roll, 10, dt);
  }

  update(dt, input, allowControl, sirenTime = 0) {
    if (this.collisionHold > 0) this.collisionHold -= dt;
    const locked = this.collisionHold > 0;
    const throttle = allowControl && !locked ? ((input.isDown('KeyW') || input.isDown('ArrowUp') ? 1 : 0) - (input.isDown('KeyS') || input.isDown('ArrowDown') ? 1 : 0)) : 0;
    const steer = allowControl && !locked ? ((input.isDown('KeyA') || input.isDown('ArrowLeft') ? 1 : 0) - (input.isDown('KeyD') || input.isDown('ArrowRight') ? 1 : 0)) : 0;
    const brake = allowControl && !locked && input.isDown('Space');
    this.speed += throttle * this.accel * dt;
    if (brake) this.speed = damp(this.speed, 0, 7, dt);
    this.speed -= this.speed * 0.45 * dt;
    this.speed = clamp(this.speed, -7, this.maxSpeed);
    if (Math.abs(this.speed) < 0.04 && throttle === 0) this.speed = 0;
    const turn = steer * clamp(Math.abs(this.speed) / 6, 0, 1) * 1.35 * Math.sign(this.speed || 1);
    this.yaw += turn * dt;

    const fx = Math.sin(this.yaw);
    const fz = Math.cos(this.yaw);
    this.x += fx * this.speed * dt;
    this.z += fz * this.speed * dt;

    this.syncObb();
    const hit = this.collision.resolveVehicle(this.obb, this.y);
    if (hit) {
      this.x = this.obb.x;
      this.z = this.obb.z;
      if (Math.abs(this.speed) > 5) this.impact = Math.abs(this.speed);
      this.speed = 0;
      this.collisionHold = 0.3;
    }
    this.updateHeight(dt);
    this.applyTransform();
    this.updateLights(dt, sirenTime, brake);
  }

  driveTo(dt, tx, tz, targetSpeed, brakeAt = 1.5) {
    if (this.collisionHold > 0) {
      this.collisionHold -= dt;
      this.speed = damp(this.speed, 0, 20, dt);
      this.x += Math.sin(this.yaw) * this.speed * dt;
      this.z += Math.cos(this.yaw) * this.speed * dt;
      this.syncObb();
      this.collision.resolveVehicle(this.obb, this.y);
      this.x = this.obb.x;
      this.z = this.obb.z;
      this.updateHeight(dt);
      this.applyTransform();
      return;
    }
    const dx = tx - this.x;
    const dz = tz - this.z;
    const dist = Math.hypot(dx, dz);
    const desiredYaw = Math.atan2(dx, dz);
    const diff = angleDiff(this.yaw, desiredYaw);
    this.yaw += clamp(diff, -1.8 * dt, 1.8 * dt);
    const speedTarget = dist < brakeAt * 3 ? Math.min(targetSpeed, dist * 0.8) : targetSpeed;
    const accel = speedTarget > this.speed ? this.accel : -this.accel * 1.6;
    this.speed += accel * dt;
    this.speed = clamp(this.speed, -4, this.maxSpeed);
    const fx = Math.sin(this.yaw);
    const fz = Math.cos(this.yaw);
    this.x += fx * this.speed * dt;
    this.z += fz * this.speed * dt;
    this.syncObb();
    const hit = this.collision.resolveVehicle(this.obb, this.y);
    if (hit) {
      this.x = this.obb.x;
      this.z = this.obb.z;
      this.speed = 0;
      this.collisionHold = 0.25;
    }
    this.updateHeight(dt);
    this.applyTransform();
    this.updateLights(dt, 0, false);
  }

  updateLights(dt, sirenTime, braking) {
    if (this.lightBar) {
      const pulse = (Math.sin(sirenTime * 10) + 1) / 2;
      this.sirenMaterials[0].emissiveIntensity = this.wanted ? 0.2 + pulse * 2.4 : 0.15;
      this.sirenMaterials[1].emissiveIntensity = this.wanted ? 0.2 + (1 - pulse) * 2.4 : 0.15;
    }
    if (this.headlights) {
      this.headlights.visible = this.speed > 0.4 || this.wanted;
    }
  }

  applyCamera(camera, dt, orbit = 0, pitch = 0.22, distance = 8.2) {
    const target = new THREE.Vector3(this.x, this.y + 1.6, this.z);
    const camYaw = this.yaw + Math.PI + orbit;
    const offset = new THREE.Vector3(
      Math.sin(camYaw) * Math.cos(pitch) * distance,
      Math.sin(pitch) * distance + 0.5,
      Math.cos(camYaw) * Math.cos(pitch) * distance,
    );
    const dir = offset.clone().normalize();
    const hit = this.collision.raycast(target, dir, distance);
    const length = hit ? Math.max(2.2, hit.distance - 0.4) : distance;
    const desired = target.clone().add(dir.multiplyScalar(length));
    const ground = walkHeightAt(desired.x, desired.z, desired.y);
    desired.y = Math.max(desired.y, ground + 0.5);
    camera.position.lerp(desired, 1 - Math.exp(-10 * dt));
    camera.lookAt(target);
  }

  get forward() {
    return { x: Math.sin(this.yaw), z: Math.cos(this.yaw) };
  }
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
  const half = vehicle.width / 2 - 0.35;
  for (const side of [-1, 1]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.08), mat);
    lamp.position.set(side * half, 0.62, vehicle.length / 2 - 0.05);
    group.add(lamp);
  }
  return group;
}

export class TrafficCar {
  constructor(scene, collision, assets, path, s, key = 'civilian', color = null) {
    this.path = path;
    this.vehicle = new Vehicle(scene, collision, assets, key, { x: 0, z: 0, yaw: 0, label: 'Civilian Car' });
    this.vehicle.root.name = 'traffic_civilian';
    this.s = s;
    this.cruise = 8.5;
    this.blocked = 0;
    this.hitCooldown = 0;
    this.tint(color);
    this.sync(0);
  }

  tint(color) {
    if (!color) return;
    this.vehicle.root.traverse((node) => {
      if (!node.isMesh) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      node.material = mats.map((mat) => {
        if (!mat) return mat;
        if (mat.name === 'Glass' || mat.name === 'CabinDark') return mat;
        const copy = mat.clone();
        copy.color = new THREE.Color(color);
        copy.roughness = 0.5;
        copy.metalness = 0.2;
        return copy;
      });
      if (node.material.length === 1) node.material = node.material[0];
    });
  }

  update(dt, player, vehicles) {
    if (this.vehicle.driver || this.stolen) return;
    if (this.hitCooldown > 0) { this.hitCooldown -= dt; return; }
    const targetSpeed = this.cruise * (this.blocked > 0 ? 0.25 : 1);
    this.blocked = Math.max(0, this.blocked - dt);
    this.s += targetSpeed * dt;
    this.sync(dt);
    // Brake for the player crossing the road.
    if (player && !player.driving && distance2D(player.x, player.z, this.vehicle.x, this.vehicle.z) < 7) {
      this.blocked = 0.7;
    }
  }

  sync(dt) {
    const p = this.path.sample(this.s);
    this.vehicle.x = p.x;
    this.vehicle.z = p.z;
    const targetYaw = p.yaw;
    this.vehicle.yaw = targetYaw;
    this.vehicle.y = p.y;
    this.vehicle.applyTransform();
    this.vehicle.root.rotation.set(0, targetYaw, 0);
    this.vehicle.speed = this.cruise;
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
    const offsets = [0, 140, 320];
    for (let i = 0; i < 3; i++) {
      const path = i === 2 ? this.paths.harbourReverse : this.paths.harbour;
      const traffic = new TrafficCar(scene, collision, assets, path, offsets[i], 'civilian', tints[i]);
      traffic.vehicle.root.name = `traffic_civilian_${i}`;
      this.traffic.push(traffic);
      this.vehicles.push(traffic.vehicle);
    }
    // Two parked civilian cars complete the chase-scene budget.
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
    player.setDriving(true);
    player.vehicle = vehicle;
    player.ammo = Math.min(player.ammo, 30);
  }

  exit(player) {
    const vehicle = this.driven;
    if (!vehicle) return;
    const leftX = Math.cos(vehicle.yaw);
    const leftZ = -Math.sin(vehicle.yaw);
    const place = {
      x: vehicle.x + leftX * (vehicle.width / 2 + 1.2),
      z: vehicle.z + leftZ * (vehicle.width / 2 + 1.2),
    };
    this.collision.resolveCircle(place, 0.45, vehicle.y);
    vehicle.driver = null;
    player.setDriving(false);
    player.teleport(place.x, place.z, vehicle.yaw, vehicle.y);
    player.vehicle = null;
    vehicle.speed = 0;
    this.driven = null;
  }

  update(dt, player, input, allowControl = true) {
    for (const car of this.traffic) car.update(dt, player, this.vehicles);
    if (this.driven) {
      this.driven.update(dt, input, allowControl && !this.driven.autopilot, 0);
    } else {
      // Parked vehicles settle on the road surface.
      this.towTruck.updateHeight();
      this.towTruck.applyTransform();
    }
    for (const vehicle of this.civilianParked) vehicle.updateHeight();
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
        const overlap = this.collision.constructor.obbOverlap(a.obb, b.obb);
        if (!overlap) continue;
        const driven = aDriven ? a : b;
        const other = aDriven ? b : a;
        const sign = aDriven ? 1 : -1;
        // obbOverlap normal points from the second body toward the first.
        driven.x += overlap.nx * overlap.depth * sign;
        driven.z += overlap.nz * overlap.depth * sign;
        driven.speed = 0;
        driven.collisionHold = 0.3;
        driven.updateHeight();
        driven.applyTransform();
        if (other === this.patrol) {
          other.collisionHold = 0.7;
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

  // Keep the walking player out of vehicle bodies.
  resolvePlayer(player) {
    if (player.driving) return;
    for (const vehicle of this.vehicles) {
      const dx = player.position.x - vehicle.x;
      const dz = player.position.z - vehicle.z;
      const reach = Math.hypot(vehicle.width, vehicle.length) / 2 + 0.6;
      if (dx * dx + dz * dz > reach * reach) continue;
      const lx = dx * Math.cos(vehicle.yaw) - dz * Math.sin(vehicle.yaw);
      const lz = dx * Math.sin(vehicle.yaw) + dz * Math.cos(vehicle.yaw);
      const cx = clamp(lx, -vehicle.width / 2, vehicle.width / 2);
      const cz = clamp(lz, -vehicle.length / 2, vehicle.length / 2);
      let nx = lx - cx;
      let nz = lz - cz;
      let dist = Math.hypot(nx, nz);
      if (dist >= 0.45) continue;
      if (dist < 1e-4) {
        const ox = vehicle.width / 2 - Math.abs(lx);
        const oz = vehicle.length / 2 - Math.abs(lz);
        if (ox < oz) { nx = Math.sign(lx) || 1; nz = 0; dist = 0; } else { nx = 0; nz = Math.sign(lz) || 1; dist = 0; }
        const push = (ox < oz ? ox : oz) + 0.45;
        player.position.x += (nx * Math.cos(vehicle.yaw) + nz * Math.sin(vehicle.yaw)) * push;
        player.position.z += (-nx * Math.sin(vehicle.yaw) + nz * Math.cos(vehicle.yaw)) * push;
      } else {
        const push = 0.45 - dist;
        player.position.x += (nx / dist * Math.cos(vehicle.yaw) + nz / dist * Math.sin(vehicle.yaw)) * push;
        player.position.z += (-nx / dist * Math.sin(vehicle.yaw) + nz / dist * Math.cos(vehicle.yaw)) * push;
      }
    }
  }

  getVehicleByKey(key) {
    return this.vehicles.find((v) => v.key === key);
  }
}