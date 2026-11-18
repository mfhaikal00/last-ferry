// Last Ferry — Salt Harbor.
// Screenshot staging. Each shot is a legal state of the running game placed on
// the map, then rendered through a fixed cinematic camera. Nothing is drawn or
// composited outside the canvas.

import * as THREE from '../vendor/three.module.min.js';
import { NODES } from './config.js';

export function setupShot(name, ctx) {
  const { player, fleet, police, npc, hud, mission, combat } = ctx;
  const cameraPos = new THREE.Vector3();
  const lookAt = new THREE.Vector3();
  const hooks = [];
  hud.hideDialogue();
  hud.setInteract('');
  hud.setHealth(100);
  hud.setMoney(245);
  hud.setAmmo(player.ammo, player.reserve, false);
  hud.setCrosshair(false);
  hud.setSpeed(0, false);
  fleet.driven = null;
  player.setDriving(false);
  player.setEquipped(false);
  police.setWanted(0, false);

  if (name === 'cover') {
    const tow = fleet.towTruck;
    tow.x = 100;
    tow.z = 87;
    tow.y = 2.5;
    tow.yaw = -Math.PI / 2;
    tow.speed = 11;
    tow.applyTransform();
    tow.root.rotation.set(0, tow.yaw, 0);
    player.setDriving(true);
    player.root.visible = false;
    player.position.set(tow.x, tow.y, tow.z);
    player.yaw = tow.yaw;
    fleet.driven = tow;

    const patrol = police.patrol;
    patrol.x = 114;
    patrol.z = 82.8;
    patrol.y = 2.5;
    patrol.yaw = -Math.PI / 2;
    patrol.wanted = true;
    patrol.applyTransform();
    patrol.root.rotation.set(0, patrol.yaw, 0);
    police.setWanted(1, true);
    police.sirenTime = 0.3;
    patrol.state = 'chase';

    mission.stage = 'ferry_lane';
    mission.setObjective('Park in the ferry lane', 'Ferry Terminal · Pier 4', NODES.lane_ferry_dest.x, NODES.lane_ferry_dest.z);
    hud.setWanted(1);
    hud.setMission('Last Ferry', 'Unit 7 is closing.');
    hud.setSpeed(58, true);
    hud.setDialogue('DARA', 'Unit 7, he is on the bridge. Do not let him reach the ferry.', 6);
    hud.setCrosshair(false);
    cameraPos.set(126, 6.2, 90);
    lookAt.set(102, 2.4, 86);

    const oncoming = fleet.traffic[0].vehicle;
    oncoming.x = 84;
    oncoming.z = 90.6;
    oncoming.y = 2.5;
    oncoming.yaw = Math.PI / 2;
    oncoming.speed = 6;
    oncoming.applyTransform();
    oncoming.root.rotation.set(0, oncoming.yaw, 0);
    oncoming.headlights.visible = true;
    hooks.push((dt) => {
      police.sirenTime += dt;
      patrol.updateLights(dt, police.sirenTime, false);
      if (tow.speed > 0) tow.speed = 11;
    });
  } else if (name === 'market') {
    player.teleport(94.5, -43, 1.45, 0.16);
    player.setDriving(false);
    player.setEquipped(false);
    player.root.visible = true;
    player.yaw = 1.45;
    player.root.rotation.y = player.yaw;
    player.cameraYaw = player.yaw + Math.PI;
    mission.stage = 'find_truck';
    mission.setObjective('Take the impounded tow truck', 'Impound lot · Fish Market', NODES.slot_tow_truck_A.x, NODES.slot_tow_truck_A.z);
    hud.setWanted(0);
    hud.setMission('Last Ferry', 'Dara is watching from the lot edge.');
    hud.setInteract('Enter Tirta · Tow Truck');
    hud.setCrosshair(false);
    hud.setSpeed(0, false);
    cameraPos.set(83, 3.4, -30);
    lookAt.set(97, 1.0, -41);
    player.setState('Walking', 0);
    if (player.activeAction) player.activeAction.setEffectiveTimeScale(0.1);
    hooks.push((dt) => {
      player.mixer.update(dt);
      player.updateRifleAim();
    });
  } else if (name === 'terminal') {
    const tow = fleet.towTruck;
    tow.x = -110;
    tow.z = 101;
    tow.y = 0.16;
    tow.yaw = Math.PI / 2;
    tow.speed = 0;
    tow.applyTransform();
    tow.root.rotation.set(0, tow.yaw, 0);
    player.setDriving(true);
    player.root.visible = false;
    player.position.set(tow.x, tow.y, tow.z);
    player.yaw = tow.yaw;
    fleet.driven = tow;
    police.setWanted(1, true);
    police.patrol.x = 24;
    police.patrol.z = 86;
    police.patrol.y = 2.5;
    police.patrol.yaw = Math.PI / 2;
    police.patrol.applyTransform();
    police.patrol.state = 'chase';
    mission.stage = 'ferry_lane';
    mission.setObjective('Park in the ferry lane', 'Ferry Terminal · Pier 4', NODES.lane_ferry_dest.x, NODES.lane_ferry_dest.z);
    hud.setWanted(1);
    hud.setMission('Last Ferry', 'The ferry is holding at Pier 4.');
    hud.setSpeed(0, true);
    hud.setDialogue('IDRIS', 'Tirta, you are in the lane. The last ferry is holding for you.', 6);
    hud.setCrosshair(false);
    cameraPos.set(-124, 4.6, 93);
    lookAt.set(-108, 0.9, 119);
    hooks.push((dt) => {
      police.sirenTime += dt;
      police.patrol.updateLights(dt, police.sirenTime, false);
    });
  } else if (name === 'combat') {
    player.teleport(154, 38, 2.27, 0.16);
    player.root.visible = true;
    player.setEquipped(true);
    player.yaw = 2.27;
    player.root.rotation.y = player.yaw;
    player.health = 72;
    combat.start();
    combat.available = false;
    mission.stage = 'dock_trouble';
    mission.setObjective('Clear the east quay', 'East Quay · gangsters', 168, 30);
    hud.setMission('Dock Trouble', 'Armed thugs at the east quay.');
    hud.setWanted(0);
    hud.setHealth(72);
    hud.setAmmo(24, 90, true);
    hud.setCrosshair(true);
    hud.setDialogue('DISPATCH', 'Bagas, three thugs are moving cargo at the east quay. Clear them out.', 7);
    hud.setSpeed(0, false);
    // A single staged shot at the nearest thug, so the screenshot shows the
    // rifle and its effects actually firing rather than a static stand-off.
    player.updateRifleAim();
    player.root.updateWorldMatrix(true, true);
    // Anchor the staged shot at the chest-forward point so the flash and tracer
    // sit in front of the rifle rather than at a stale bone matrix.
    const muzzle = new THREE.Vector3(
      player.x + Math.sin(player.yaw) * 1.1,
      player.position.y + 1.08,
      player.z + Math.cos(player.yaw) * 1.1,
    );
    const target = new THREE.Vector3(160, 1.2, 30);
    combat.thugs[0].actor.play('Firing_Rifle', { once: true, restart: true });
    if (ctx.effects) {
      ctx.effects.flash(muzzle);
      ctx.effects.tracer(muzzle, target);
      ctx.effects.impact(target, null, 0xd86a4a);
      const items = ctx.effects.items;
      if (items[0]) { items[0].life = 60; items[0].max = 60; }
      if (items[1]) { items[1].life = 60; items[1].max = 60; }
    }
    cameraPos.set(150, 3.2, 43.5);
    lookAt.set(165, 1.4, 30);
    hooks.push((dt) => {
      player.mixer.update(dt);
      player.updateRifleAim();
      for (const thug of combat.thugs) thug.actor.update(dt, player);
    });
  }
  if (name !== 'cover') police.setWanted(name === 'terminal' ? 1 : 0, name === 'terminal');
  hud.setMoney(245);
  return {
    name,
    cameraPos,
    lookAt,
    hooks,
    update(dt) {
      for (const hook of hooks) hook(dt);
      npc.update(dt, player);
    },
  };
}

export const SHOT_NAMES = ['cover', 'market', 'terminal', 'combat'];