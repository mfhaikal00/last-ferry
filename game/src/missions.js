// Mission "Last Ferry" for Salt Harbor. The state machine owns the named
// objectives, the truck-takeover event, the Dara radio beat, the wanted level
// and the reward loop. Its API is exposed for gameplay or save systems.

import * as THREE from '../vendor/three.module.min.js';
import { NODES, POI } from './config.js';
import { distance2D } from './random.js';
import { walkHeightAt } from './roads.js';

const STAGES = {
  findTruck: 'find_truck',
  crossBridge: 'cross_bridge',
  ferryLane: 'ferry_lane',
  returnWorkshop: 'return_workshop',
  dockTrouble: 'dock_trouble',
  freeRoam: 'free_roam',
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
    this.lastToast = 0;
    this.marker = createMarker(this.scene);
    this.objective = null;
    this.setObjective('Take the impounded tow truck', 'Impound lot · Fish Market', NODES.slot_tow_truck_A.x, NODES.slot_tow_truck_A.z);
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
    if (vehicle.key !== 'tow') return;
    if (this.stage === STAGES.findTruck) {
      this.truckTakeover();
    }
  }

  truckTakeover() {
    this.events.push({
      type: 'truck_takeover',
      vehicle: 'tow',
      label: 'Tirta',
      node: 'slot_tow_truck_A',
      time: this.time,
      area: 'Parking Lot',
    });
    window.dispatchEvent(new CustomEvent('lastferry:truck-takeover', { detail: this.events[this.events.length - 1] }));
    this.stage = STAGES.crossBridge;
    this.stageTime = 0;
    this.npc.daraRadioCall();
    this.police.setWanted(1, true);
    this.audio?.radioChatter();
    this.hud.setDialogue('DARA', 'Bagas! That truck is impounded. Stop the truck. I am calling it in.', 5.2);
    this.hud.showToast('Wanted level 1 · Patrol Unit 7 dispatched');
    this.hud.setMission('Last Ferry', 'Dara has called the harbour patrol.');
    this.setObjective('Cross the bridge checkpoint', 'Canal Bend → Bridge', NODES.checkpoint_bridge_01.x, NODES.checkpoint_bridge_01.z);
    this.hud.setWanted(1);
    this.saveEvent('truck_takeover');
  }

  onBridgeCheckpoint() {
    if (this.stage !== STAGES.crossBridge) return;
    this.stage = STAGES.ferryLane;
    this.stageTime = 0;
    this.audio?.radioChatter();
    this.hud.setDialogue('DISPATCH', 'Unit 7, he is over the bridge. Cut him off on Waterfront Road.', 4.5);
    this.setObjective('Park in the ferry lane', 'Ferry Terminal · Pier 4', NODES.lane_ferry_dest.x, NODES.lane_ferry_dest.z);
  }

  onFerryLane() {
    if (this.stage !== STAGES.ferryLane) return;
    this.stage = STAGES.returnWorkshop;
    this.stageTime = 0;
    this.hud.setDialogue('IDRIS', 'Tirta, you are in the lane. The last ferry is held at Pier 4. Park her and see me.', 5.2);
    this.setObjective('Return Tirta to the workshop', 'West Junction → Shop Street', POI.workshop.x, POI.workshop.z);
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
    this.setObjective('Free roam Salt Harbor', 'East quay · dock trouble reported', 168, 30);
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
      if (onTruck && distance2D(this.player.x, this.player.z, POI.workshop.x, POI.workshop.z) < 16) {
        this.onWorkshopReturn();
      }
    } else if (this.stage === STAGES.freeRoam) {
      if (this.combat && !this.combat.active && this.combat.available) {
        if (distance2D(this.player.x, this.player.z, 168, 30) < 22) {
          this.stage = STAGES.dockTrouble;
          this.combat.start();
          this.hud.setMission('Dock Trouble', 'Three dock thugs are moving cargo at the east quay.');
          this.setObjective('Clear the east quay', 'East Quay · gangsters', 168, 30);
        }
      }
    } else if (this.stage === STAGES.dockTrouble) {
      if (this.combat && this.combat.cleared) {
        this.stage = STAGES.freeRoam;
        this.money += 500;
        this.hud.setMoney(this.money);
        this.hud.showToast('East quay cleared · +$500');
        this.setObjective('Free roam Salt Harbor', 'The ferry sails at dusk', POI.ferryLane.x, POI.ferryLane.z);
      }
    }
    if (input?.consume('KeyM') && this.stage === STAGES.freeRoam) {
      this.replay();
    }
    this.api.stage = this.stage;
    this.api.objective = this.objective;
  }

  restore(data) {
    this.money = data.money ?? this.money;
    this.hud.setMoney(this.money);
    this.stage = data.stage ?? STAGES.findTruck;
    const objectives = {
      find_truck: ['Take the impounded tow truck', 'Impound lot · Fish Market', NODES.slot_tow_truck_A.x, NODES.slot_tow_truck_A.z],
      cross_bridge: ['Cross the bridge checkpoint', 'Canal Bend → Bridge', NODES.checkpoint_bridge_01.x, NODES.checkpoint_bridge_01.z],
      ferry_lane: ['Park in the ferry lane', 'Ferry Terminal · Pier 4', NODES.lane_ferry_dest.x, NODES.lane_ferry_dest.z],
      return_workshop: ['Return Tirta to the workshop', 'West Junction → Shop Street', POI.workshop.x, POI.workshop.z],
      free_roam: ['Free roam Salt Harbor', 'East quay · dock trouble reported', 168, 30],
      dock_trouble: ['Clear the east quay', 'East Quay · gangsters', 168, 30],
    };
    const objective = objectives[this.stage] ?? objectives.find_truck;
    this.setObjective(...objective);
    this.hud.setMission(this.stage === 'dock_trouble' ? 'Dock Trouble' : 'Last Ferry', 'Saved run restored.');
    if (this.combat) {
      this.combat.cleared = !!data.combatCleared;
      this.combat.available = this.stage === 'free_roam' && !this.combat.cleared;
    }
  }

  replay() {
    this.stage = STAGES.findTruck;
    this.completed = false;
    this.police.setWanted(0, false);
    this.hud.setWanted(0);
    this.fleet.towTruck.x = NODES.slot_tow_truck_A.x;
    this.fleet.towTruck.z = NODES.slot_tow_truck_A.z;
    this.fleet.towTruck.yaw = NODES.slot_tow_truck_A.yaw;
    this.fleet.towTruck.y = 0.16;
    this.fleet.towTruck.applyTransform();
    if (this.fleet.driven === this.fleet.towTruck) this.fleet.exit(this.player);
    this.player.teleport(NODES.spawn_player_01.x, NODES.spawn_player_01.z, NODES.spawn_player_01.yaw);
    this.setObjective('Take the impounded tow truck', 'Impound lot · Fish Market', NODES.slot_tow_truck_A.x, NODES.slot_tow_truck_A.z);
    this.hud.setMission('Last Ferry', 'The impound lot is behind the Fish Market.');
    this.hud.setDialogue('BAGAS', 'One more run before the last ferry.', 3.4);
    if (this.combat) this.combat.reset();
  }

  saveEvent(type) {
    try {
      const key = 'lastFerry.events.v1';
      const list = JSON.parse(localStorage.getItem(key) ?? '[]');
      list.push({ type, at: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(list.slice(-20)));
    } catch {
      // Storage can be unavailable in a private window; the in-memory event log remains.
    }
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