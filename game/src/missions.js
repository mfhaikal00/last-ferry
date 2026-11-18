// Last Ferry — mission and combat.
// The Last Ferry state machine owns the objective loop, the truck takeover,
// Dara's radio call, the wanted escalation, checkpoint retry and the reward card.
// Dock Trouble adds three armed thugs at the east quay with a hit-scan rifle.

import * as THREE from '../vendor/three.module.min.js';
import { NODES, POI, distance2D, rngFor } from './core.js';
import { walkHeightAt } from './world.js';
import { Actor } from './npc.js';

const STAGES = {
  findTruck: 'find_truck',
  crossBridge: 'cross_bridge',
  ferryLane: 'ferry_lane',
  returnWorkshop: 'return_workshop',
  dockTrouble: 'dock_trouble',
  freeRoam: 'free_roam',
};

const OBJECTIVES = {
  find_truck: ['Take the impounded tow truck', 'Impound lot · Fish Market', NODES.slot_tow_truck_A.x, NODES.slot_tow_truck_A.z],
  cross_bridge: ['Cross the bridge checkpoint', 'Canal Bend → Bridge', NODES.checkpoint_bridge_01.x, NODES.checkpoint_bridge_01.z],
  ferry_lane: ['Park in the ferry lane', 'Ferry Terminal · Pier 4', NODES.lane_ferry_dest.x, NODES.lane_ferry_dest.z],
  return_workshop: ['Return Tirta to the workshop', 'West Junction → Shop Street', POI.workshop.x, POI.workshop.z],
  free_roam: ['Free roam Salt Harbor', 'East quay · dock trouble reported', 168, 30],
  dock_trouble: ['Clear the east quay', 'East Quay · gangsters', 168, 30],
};

export class MissionDirector {
  constructor(context) {
    this.scene = context.scene;
    this.player = context.player;
    this.fleet = context.fleet;
    this.police = context.police;
    this.npc = context.npc;
    this.hud = context.hud;
    this.audio = context.audio;
    this.combat = context.combat;
    this.money = 120;
    this.stage = STAGES.findTruck;
    this.events = [];
    this.time = 0;
    this.stageTime = 0;
    this.completed = false;
    this.dockPaid = false;
    this.marker = createMarker(this.scene);
    this.objective = null;
    this.setObjective(...OBJECTIVES.find_truck);
    this.hud.setMission('Last Ferry', 'The impound lot is behind the Fish Market.');
    this.api = {
      nodes: NODES,
      stage: this.stage,
      objective: this.objective,
      events: this.events,
      startTruckRun: () => this.replay(),
      onTruckTakeover: (handler) => this.events.push({ type: 'listener', handler }),
    };
    window.LastFerryMission = this.api;
    window.LastFerryNodes = NODES;
  }

  setObjective(text, area, x, z) {
    this.objective = { text, area, x, z };
    this.marker.position.set(x, walkHeightAt(x, z, 4), z);
    this.marker.visible = true;
    this.hud.setObjective(text, area);
  }

  onEnterVehicle(vehicle) {
    if (vehicle.key === 'tow' && this.stage === STAGES.findTruck) this.truckTakeover();
  }

  truckTakeover() {
    if (this.stage !== STAGES.findTruck) return;
    const event = {
      type: 'truck_takeover', vehicle: 'tow', label: 'Tirta',
      node: 'slot_tow_truck_A', time: this.time, area: 'Parking Lot',
    };
    this.events.push(event);
    window.dispatchEvent(new CustomEvent('lastferry:truck-takeover', { detail: event }));
    this.stage = STAGES.crossBridge;
    this.stageTime = 0;
    this.npc.daraRadioCall();
    this.police.setWanted(1, true);
    this.audio?.radioChatter();
    this.hud.setDialogue('DARA', 'Bagas! That truck is impounded. Stop the truck. I am calling it in.', 5.2);
    this.hud.showToast('Wanted level 1 · Patrol Unit 7 dispatched');
    this.hud.setMission('Last Ferry', 'Dara has called the harbour patrol.');
    this.setObjective(...OBJECTIVES.cross_bridge);
    this.hud.setWanted(1);
    this.saveEvent('truck_takeover');
  }

  onBridgeCheckpoint() {
    if (this.stage !== STAGES.crossBridge) return;
    this.stage = STAGES.ferryLane;
    this.stageTime = 0;
    this.audio?.radioChatter();
    this.hud.setDialogue('DISPATCH', 'Unit 7, he is over the bridge. Cut him off on Waterfront Road.', 4.5);
    this.setObjective(...OBJECTIVES.ferry_lane);
  }

  onFerryLane() {
    if (this.stage !== STAGES.ferryLane) return;
    this.stage = STAGES.returnWorkshop;
    this.stageTime = 0;
    this.hud.setDialogue('IDRIS', 'Tirta, you are in the lane. The last ferry is held at Pier 4. Park her and see me.', 5.2);
    this.setObjective(...OBJECTIVES.return_workshop);
  }

  onWorkshopReturn() {
    if (this.stage !== STAGES.returnWorkshop) return;
    this.stage = STAGES.freeRoam;
    this.completed = true;
    this.money += 850;
    this.police.setWanted(0, false);
    this.hud.setWanted(0);
    this.hud.setMoney(this.money);
    if (this.combat) this.combat.available = true;
    this.audio?.success();
    this.hud.showMissionComplete({
      title: 'LAST FERRY',
      detail: `Tirta is home. Dara keeps the report quiet. Cash: $${this.money}.`,
      money: this.money,
      reward: 850,
    });
    this.hud.setMission('Last Ferry', 'The run is done. Salt Harbor is yours.');
    this.setObjective(...OBJECTIVES.free_roam);
    this.saveEvent('mission_complete');
  }

  update(dt, input) {
    this.time += dt;
    this.stageTime += dt;
    this.marker.children[0].rotation.z += dt * 0.7;

    const onTruck = this.fleet.driven?.key === 'tow';
    if (this.stage === STAGES.findTruck) {
      if (onTruck) this.truckTakeover();
    } else if (this.stage === STAGES.crossBridge) {
      if (onTruck && this.player.y > 1.4 && distance2D(this.player.x, this.player.z, NODES.checkpoint_bridge_01.x, NODES.checkpoint_bridge_01.z) < 11) {
        this.onBridgeCheckpoint();
      }
    } else if (this.stage === STAGES.ferryLane) {
      if (onTruck && this.player.z > 95.5 && distance2D(this.player.x, this.player.z, NODES.lane_ferry_dest.x, NODES.lane_ferry_dest.z) < 8.5) {
        this.onFerryLane();
      }
    } else if (this.stage === STAGES.returnWorkshop) {
      if (onTruck && distance2D(this.player.x, this.player.z, POI.workshop.x, POI.workshop.z) < 16) this.onWorkshopReturn();
    } else if (this.stage === STAGES.freeRoam) {
      if (this.combat && !this.combat.active && this.combat.available && distance2D(this.player.x, this.player.z, 168, 30) < 22) {
        this.stage = STAGES.dockTrouble;
        this.dockPaid = false;
        this.combat.start();
        this.hud.setMission('Dock Trouble', 'Three dock thugs are moving cargo at the east quay.');
        this.setObjective(...OBJECTIVES.dock_trouble);
      }
    } else if (this.stage === STAGES.dockTrouble) {
      if (this.combat?.cleared && !this.dockPaid) {
        this.dockPaid = true;
        this.stage = STAGES.freeRoam;
        this.money += 500;
        this.hud.setMoney(this.money);
        this.hud.showToast('East quay cleared · +$500');
        this.setObjective(...OBJECTIVES.free_roam);
      }
    }
    if (input?.consume('KeyM') && this.stage === STAGES.freeRoam) this.replay();
    this.api.stage = this.stage;
    this.api.objective = this.objective;
  }

  restore(data) {
    this.money = data.money ?? this.money;
    this.hud.setMoney(this.money);
    this.stage = data.stage ?? STAGES.findTruck;
    this.setObjective(...(OBJECTIVES[this.stage] ?? OBJECTIVES.find_truck));
    this.hud.setMission(this.stage === 'dock_trouble' ? 'Dock Trouble' : 'Last Ferry', 'Saved run restored.');
    if (this.combat) {
      this.combat.cleared = !!data.combatCleared;
      this.combat.available = this.stage === 'free_roam' && !this.combat.cleared;
    }
  }

  // Retry from the current objective without replaying the whole story: clear
  // stars and capture progress, put the player back on the route, rebuild the
  // thug squad and keep the mission card off the screen.
  checkpointRetry() {
    if (this.fleet.driven) this.fleet.exit(this.player);
    this.player.health = 100;
    this.player.setEquipped(false);
    this.hud.setHealth(100);
    this.hud.setAmmo(this.player.ammo, this.player.reserve, false);
    this.hud.setCrosshair(false);
    this.hud.setWanted(0);
    this.police.reset();
    this.combat?.reset();
    this.dockPaid = false;
    const retryInTruck = (x, z, yaw, startY = 0) => {
      const tow = this.fleet.towTruck;
      tow.x = x;
      tow.z = z;
      tow.yaw = yaw;
      tow.y = walkHeightAt(x, z, startY, true);
      tow.speed = 0;
      tow.heightVel = 0;
      tow.collisionHold = 0;
      tow.applyTransform();
      this.fleet.enter(tow, this.player);
    };
    if (this.stage === STAGES.crossBridge) {
      retryInTruck(NODES.junction_patrol_entry.x, NODES.junction_patrol_entry.z, NODES.junction_patrol_entry.yaw);
      this.police.setWanted(1, true);
      this.hud.setWanted(1);
    } else if (this.stage === STAGES.ferryLane) {
      retryInTruck(NODES.checkpoint_bridge_01.x, NODES.checkpoint_bridge_01.z, NODES.checkpoint_bridge_01.yaw, 4);
      this.police.setWanted(1, true);
      this.hud.setWanted(1);
    } else if (this.stage === STAGES.returnWorkshop) {
      retryInTruck(NODES.lane_ferry_dest.x, NODES.lane_ferry_dest.z, NODES.lane_ferry_dest.yaw);
      this.police.setWanted(1, true);
      this.hud.setWanted(1);
    } else if (this.stage === STAGES.dockTrouble) {
      this.player.teleport(154, 38, 2.27);
      this.combat.available = true;
      this.combat.start();
    } else {
      this.player.teleport(NODES.spawn_player_01.x, NODES.spawn_player_01.z, NODES.spawn_player_01.yaw);
    }
    this.hud.showToast('Checkpoint retry');
  }

  replay() {
    this.stage = STAGES.findTruck;
    this.completed = false;
    this.dockPaid = false;
    this.police.reset();
    this.hud.setWanted(0);
    const tow = this.fleet.towTruck;
    tow.x = NODES.slot_tow_truck_A.x;
    tow.z = NODES.slot_tow_truck_A.z;
    tow.yaw = NODES.slot_tow_truck_A.yaw;
    tow.y = 0.16;
    tow.speed = 0;
    tow.heightVel = 0;
    tow.applyTransform();
    if (this.fleet.driven === tow) this.fleet.exit(this.player);
    this.player.teleport(NODES.spawn_player_01.x, NODES.spawn_player_01.z, NODES.spawn_player_01.yaw);
    this.setObjective(...OBJECTIVES.find_truck);
    this.hud.setMission('Last Ferry', 'The impound lot is behind the Fish Market.');
    this.hud.setDialogue('BAGAS', 'One more run before the last ferry.', 3.4);
    this.combat?.reset();
  }

  saveEvent(type) {
    try {
      const key = 'lastFerry.events.v1';
      const list = JSON.parse(localStorage.getItem(key) ?? '[]');
      list.push({ type, at: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(list.slice(-20)));
    } catch { /* storage may be unavailable */ }
  }
}

function createMarker(scene) {
  const group = new THREE.Group();
  group.name = 'mission_marker';
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.3, 1.9, 32),
    new THREE.MeshBasicMaterial({ color: 0xffc25c, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.22;
  group.add(ring);
  group.visible = false;
  scene.add(group);
  return group;
}

// --- Dock Trouble -----------------------------------------------------------

const THUG_SPOTS = [[160, 30, 2.2], [166, 24, 2.4], [173, 33, 2.0]];

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
    this.thugs = THUG_SPOTS.map(([x, z, yaw], index) => {
      const actor = new Actor(this.scene, this.assets, 'gangster', {
        name: `npc_dock_thug_${index}`, x, z, yaw, clip: 'Idle', label: 'Dock Thug',
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
      thug.actor.play('Idle', { fade: 0.1 });
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
    if (this.rng() < Math.min(0.62, 0.18 + dist / 90)) {
      this.player.health = Math.max(0, this.player.health - 7);
      this.hud.setHealth(this.player.health);
      this.hud.damageFlash();
      if (this.player.health <= 0) this.playerDown();
    }
  }

  playerShot(origin, direction, muzzle) {
    let best = null;
    for (const thug of this.thugs) {
      if (!thug.alive) continue;
      for (const [height, radius, damage] of [[1.62, 0.36, 100], [1.12, 0.52, 38], [0.62, 0.5, 22]]) {
        const centre = new THREE.Vector3(thug.actor.x, thug.actor.y + height, thug.actor.z);
        const t = centre.clone().sub(origin).dot(direction);
        if (t < 0 || t > 90) continue;
        const closest = origin.clone().addScaledVector(direction, t);
        if (closest.distanceTo(centre) > radius) continue;
        if (!best || t < best.t) best = { t, thug, damage, point: closest };
      }
    }
    if (!best) {
      this.fx?.impact(origin.clone().addScaledVector(direction, 90), null, 0xcac0a4);
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
    this.police?.reset();
    this.hud.setWanted(0);
    for (const thug of this.thugs) {
      thug.alive = true;
      thug.health = 100;
      thug.actor.alive = true;
      thug.actor.root.visible = true;
      thug.actor.play('Idle', { fade: 0.1 });
    }
    this.active = true;
    this.cleared = false;
    this.hud.showToast('Back at the workshop · the quay is still hostile');
  }
}