// Last Ferry — Salt Harbor.
// Boot, lighting, the game loop, interaction routing, save/restore and the
// screenshot stages. Systems live in their own modules: city, buildings, roads,
// player, vehicles, police, mission, combat, HUD, minimap, audio, effects.

import * as THREE from '../vendor/three.module.min.js';
import { AssetLibrary } from './assets.js';
import { AudioDirector } from './audio.js';
import { buildSky, buildWater } from './city.js';
import { CollisionWorld } from './collision.js';
import { CombatDirector } from './combat.js';
import { NODES, POI, QUALITY, ROADS, WORLD } from './config.js';
import { Effects } from './fx.js';
import { Hud } from './hud.js';
import { Input } from './input.js';
import { Minimap } from './minimap.js';
import { MissionDirector } from './missions.js';
import { NpcDirector } from './npc.js';
import { Player } from './player.js';
import { PoliceDirector } from './police.js';
import { SaveSystem } from './save.js';
import { setupShot, SHOT_NAMES } from './shots.js';
import { distance2D } from './random.js';
import { VehicleFleet } from './vehicles.js';
import { buildWorld } from './world.js';

const params = new URLSearchParams(location.search);
const debug = params.has('debug');
const perf = params.has('perf');
const requestedShot = params.get('shot');

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUALITY.pixelRatioLimit));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.98;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1a22);
scene.fog = new THREE.Fog(0xcdb9a2, 100, 430);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 900);
camera.position.set(-50, 40, 60);

const sunDir = buildSky(scene);
const waterMaterial = buildWater(scene, sunDir);

const hemi = new THREE.HemisphereLight(0xcfe4ee, 0x4c4a3a, 0.72);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffd2a3, 2.15);
sun.position.copy(sunDir).multiplyScalar(170);
sun.castShadow = true;
sun.shadow.mapSize.set(QUALITY.shadowMap, QUALITY.shadowMap);
sun.shadow.camera.left = -145;
sun.shadow.camera.right = 145;
sun.shadow.camera.top = 145;
sun.shadow.camera.bottom = -145;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 460;
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.03;
scene.add(sun);
scene.add(sun.target);
const fill = new THREE.DirectionalLight(0x8fb6c4, 0.45);
fill.position.set(80, 50, -120);
scene.add(fill);
const fillSouth = new THREE.DirectionalLight(0xa8c8d4, 0.72);
fillSouth.position.set(110, 45, 170);
scene.add(fillSouth);
const ambient = new THREE.AmbientLight(0x6f8b93, 0.34);
scene.add(ambient);

let collision;
let assets;
let player;
let fleet;
let npc;
let police;
let combat;
let missions;
let hud;
let minimap;
let input;
let audio;
let effects;
let save;
let shot = null;
let mode = 'loading';
let menuTime = 0;
let driveOrbit = 0;
let drivePitch = 0.24;
let minimapTimer = 0;
let saveTimer = 0;
let lastMissionStage = null;
let hadPointerLock = false;
let lastTime = performance.now();
let fpsFrames = 0;
let fpsTimer = 0;
let perfOverlay = null;

save = new SaveSystem();
audio = new AudioDirector();
input = new Input(canvas);
hud = new Hud({
  onStart: (continueRun) => startGame(continueRun),
  onResume: () => resumeGame(),
  onSave: () => {
    saveGame(true);
    hud.showToast('Game saved');
  },
  onQuit: () => showTitleMenu(),
  onMissionContinue: () => {
    input.requestLock();
  },
});

if (perf) {
  perfOverlay = document.createElement('div');
  perfOverlay.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:60;padding:6px 9px;background:rgba(0,0,0,0.65);color:#9fe3c8;font:11px monospace;letter-spacing:1px;border:1px solid rgba(255,255,255,0.15)';
  document.body.appendChild(perfOverlay);
}

document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvas;
  if (locked) hadPointerLock = true;
  else if (hadPointerLock && mode === 'playing') {
    hadPointerLock = false;
    pauseGame();
  }
});
canvas.addEventListener('click', () => {
  if (mode === 'playing' && !input.locked) input.requestLock();
});

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

boot();

async function boot() {
  try {
    hud.setLoading(0.04, 'Charting Salt Harbor');
    assets = new AssetLibrary();
    await assets.load((progress, key) => {
      hud.setLoading(0.05 + progress * 0.72, `Loading ${labelFor(key)}`);
    });
    if (debug) {
      console.table(assets.debugStats);
    }
    hud.setLoading(0.8, 'Building the harbour');
    collision = new CollisionWorld();
    const world = buildWorld(scene, collision, assets);
    collision.build();
    if (debug) {
      console.info('Collider stats', collision.stats());
    }
    hud.setLoading(0.9, 'Waking the city');
    player = new Player(scene, assets, collision);
    effects = new Effects(scene);
    fleet = new VehicleFleet(scene, collision, assets);
    npc = new NpcDirector(scene, assets);
    police = new PoliceDirector(fleet, player, audio);
    combat = new CombatDirector({
      scene, assets, player, police, hud, audio, effects, collision,
    });
    missions = new MissionDirector({
      scene, player, fleet, police, npc, hud, audio, combat,
    });
    minimap = new Minimap(hud.minimapCanvas, collision);
    hud.setMoney(missions.money);
    hud.setHealth(player.health);
    hud.setWanted(0);
    input.enabled = true;

    if (debug) {
      console.info('World nodes', Object.keys(world.nodes), 'blocks', world.buildingBlocks);
      window.__lastFerry = { player, fleet, police, combat, missions, collision, hud, minimap, assets, scene, camera, renderer, sun, THREE, input, audio, ROADS };
      window.__setFreeCam = (px, py, pz, tx, ty, tz) => { window.__freeCam = { px, py, pz, tx, ty, tz }; };
      window.__clearFreeCam = () => { window.__freeCam = null; };
    }

    if (requestedShot && SHOT_NAMES.includes(requestedShot)) {
      hud.finishLoading();
      hud.hideTitle();
      hud.setMoney(245);
      shot = setupShot(requestedShot, { player, fleet, police, npc, hud, mission: missions, combat, effects });
      mode = 'shot';
    } else {
      mode = 'title';
      hud.showTitle(!!save.read(), save.summary());
    }
    lastTime = performance.now();
    requestAnimationFrame(loop);
  } catch (error) {
    console.error(error);
    hud.setLoading(1, 'Could not start: ' + error.message);
    hud.loadText.style.color = '#ef8f7f';
  }
}

function labelFor(key) {
  const labels = {
    bagas: 'Bagas', dara: 'Dara', citizen: 'citizens', police: 'harbour police', gangster: 'dock crew',
    tow: 'the tow truck', patrol: 'Unit 7', civilian: 'traffic', ferry: 'the ferry', rifle: 'the rifle',
  };
  return labels[key] ?? key;
}

function startGame(continueRun) {
  audio.start();
  hud.hideTitle();
  hud.showPause(false);
  if (!continueRun && save.read() && missions.stage !== 'find_truck') resetGame();
  if (continueRun) continueGame();
  mode = 'playing';
  hadPointerLock = false;
  lastTime = performance.now();
  hud.setMoney(missions.money);
  hud.setHealth(player.health);
  hud.setWanted(police.wanted);
  hud.setAmmo(player.ammo, player.reserve, player.equipped);
  hud.setSpeed(0, false);
  lastMissionStage = missions.stage;
  hud.setMission('Last Ferry', 'The impound lot is behind the Fish Market.');
  hud.showToast('Salt Harbor · press E to take the truck');
  input.requestLock();
  window.focus();
}

function resetGame() {
  missions.replay();
  missions.money = 120;
  hud.setMoney(120);
  player.health = 100;
  hud.setHealth(100);
  fleet.driven = null;
  player.setDriving(false);
  combat.reset();
  police.setWanted(0, false);
  hud.setWanted(0);
}

function continueGame() {
  const data = save.read();
  if (!data) return;
  missions.money = data.money ?? missions.money;
  player.health = data.health ?? 100;
  player.teleport(data.player?.x ?? NODES.spawn_player_01.x, data.player?.z ?? NODES.spawn_player_01.z, data.player?.yaw ?? NODES.spawn_player_01.yaw);
  missions.restore(data);
  hud.setMoney(missions.money);
  hud.setHealth(player.health);
  police.setWanted(data.wanted ?? 0, data.stage !== 'free_roam' && (data.wanted ?? 0) > 0);
  hud.setWanted(police.wanted);
  if (data.equipped) player.setEquipped(true);
  player.ammo = data.ammo ?? player.ammo;
  player.reserve = data.reserve ?? player.reserve;
  if (data.driving) {
    const vehicle = fleet.vehicles.find((v) => v.root.name === data.driving.name) ?? fleet.towTruck;
    vehicle.x = data.driving.x;
    vehicle.z = data.driving.z;
    vehicle.y = data.driving.y ?? 0.16;
    vehicle.yaw = data.driving.yaw;
    vehicle.speed = 0;
    vehicle.applyTransform();
    fleet.enter(vehicle, player);
    driveOrbit = 0;
  }
  hud.setAmmo(player.ammo, player.reserve, player.equipped);
  hud.showToast('Saved run restored');
}

function pauseGame() {
  if (mode !== 'playing') return;
  mode = 'paused';
  hud.showPause(true);
  input.release();
  saveGame(false);
}

function resumeGame() {
  if (mode !== 'paused') return;
  hud.showPause(false);
  mode = 'playing';
  audio.start();
  input.requestLock();
}

function showTitleMenu() {
  mode = 'title';
  hud.showPause(false);
  hud.showTitle(!!save.read(), save.summary());
  input.release();
  menuTime = 0;
  if (fleet.driven) {
    fleet.exit(player);
  }
}

function saveGame(showToast) {
  if (mode === 'shot' || mode === 'loading') return;
  const driving = fleet.driven;
  const data = {
    stage: missions.stage,
    money: missions.money,
    wanted: police.wanted,
    health: player.health,
    district: hud.district.textContent,
    player: { x: player.x, z: player.z, yaw: player.yaw },
    equipped: player.equipped,
    ammo: player.ammo,
    reserve: player.reserve,
    combatCleared: combat.cleared,
    driving: driving
      ? { name: driving.root.name, x: driving.x, z: driving.z, y: driving.y, yaw: driving.yaw, key: driving.key }
      : null,
  };
  const ok = save.write(data);
  if (showToast) hud.showToast(ok ? 'Game saved' : 'Saved for this session only');
}

function nearestDistrict() {
  let best = 'Salt Harbor';
  let bestD = Infinity;
  for (const [name, poi] of Object.entries(POI)) {
    const d = distance2D(player.x, player.z, poi.x, poi.z);
    if (d < bestD) {
      bestD = d;
      best = name;
    }
  }
  const names = {
    workshop: 'Workshop', shopStreet: 'Shop Street', market: 'Fish Market', parkingLot: 'Parking Lot',
    canalBend: 'Canal Bend', bridge: 'Bridge', waterfront: 'Waterfront Road', terminal: 'Ferry Terminal',
    ferryLane: 'Ferry Lane', westJunction: 'West Junction', alley: 'Alley', pier: 'Pier', patrolStandby: 'East Junction',
  };
  return bestD < 85 ? names[best] : 'Salt Harbor';
}

function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, Math.max(0.0001, (now - lastTime) / 1000));
  lastTime = now;
  waterMaterial.uniforms.time.value += dt;

  if (perf) {
    fpsFrames++;
    fpsTimer += dt;
    if (fpsTimer >= 1) {
      const fps = fpsFrames / fpsTimer;
      fpsFrames = 0;
      fpsTimer = 0;
      const info = renderer.info.render;
      perfOverlay.textContent = `${fps.toFixed(0)} FPS · ${info.calls} calls · ${(info.triangles / 1000).toFixed(0)}k tris`;
      window.__lastFerryPerf = { fps: +fps.toFixed(1), calls: info.calls, triangles: info.triangles };
    }
  }

  if (mode === 'title') {
    menuTime += dt;
    const a = menuTime * 0.045;
    camera.position.set(-30 + Math.cos(a) * 185, 56 + Math.sin(a * 0.7) * 8, 40 + Math.sin(a) * 165);
    camera.lookAt(-40, 2, 30);
    camera.fov = 58;
    camera.updateProjectionMatrix();
    npc.update(Math.min(dt, 0.033), player);
    effects.update(dt);
    sun.target.position.set(-20, 0, 10);
    sun.position.set(-20 + sunDir.x * 170, sunDir.y * 170, 10 + sunDir.z * 170);
    renderer.render(scene, camera);
    input.endFrame();
    return;
  }

  if (mode === 'shot' && shot) {
    shot.update(dt);
    camera.position.copy(shot.cameraPos);
    camera.lookAt(shot.lookAt);
    if (window.__freeCam) {
      const f = window.__freeCam;
      camera.position.set(f.px, f.py, f.pz);
      camera.lookAt(f.tx, f.ty, f.tz);
    }
    camera.fov = 57;
    camera.updateProjectionMatrix();
    sun.target.position.set(shot.lookAt.x, 0, shot.lookAt.z);
    sun.position.set(shot.lookAt.x + sunDir.x * 170, sunDir.y * 170, shot.lookAt.z + sunDir.z * 170);
    effects.update(dt);
    drawMinimap(dt);
    hud.update(dt);
    renderer.render(scene, camera);
    input.endFrame();
    return;
  }

  if (mode === 'paused') {
    renderer.render(scene, camera);
    input.endFrame();
    return;
  }

  // Playing.
  if (!hud.missionCard.classList.contains('hidden')) {
    renderer.render(scene, camera);
    input.endFrame();
    return;
  }
  if (input.consume('Escape')) pauseGame();
  const driving = fleet.driven;
  if (input.consume('KeyE')) {
    if (driving) {
      fleet.exit(player);
      driveOrbit = 0;
      audio.ui();
    } else {
      const vehicle = fleet.nearestVehicle(player);
      if (vehicle) {
        fleet.enter(vehicle, player);
        missionOnEnter(vehicle);
        driveOrbit = 0;
        drivePitch = 0.26;
        audio.ui();
      }
    }
  }
  if (!fleet.driven && input.consume('KeyR')) {
    player.setEquipped(!player.equipped);
    hud.setAmmo(player.ammo, player.reserve, player.equipped);
    hud.setCrosshair(player.equipped);
    hud.showToast(player.equipped ? 'Rifle equipped · LMB fire, F reload' : 'Rifle stowed');
    audio.ui();
  }
  if (!fleet.driven && input.consume('KeyF') && player.equipped) {
    player.reload();
    hud.setAmmo(player.ammo, player.reserve, true);
  }

  if (fleet.driven) {
    const look = input.takeLook();
    if (input.locked) {
      driveOrbit -= look.dx * 0.0024;
      drivePitch = THREE.MathUtils.clamp(drivePitch + look.dy * 0.0015, 0.05, 0.85);
    }
    driveOrbit *= Math.exp(-1.1 * dt);
    fleet.driven.applyCamera(camera, dt, driveOrbit, drivePitch, 8.6);
    const speedRatio = Math.abs(fleet.driven.speed) / fleet.driven.maxSpeed;
    camera.fov += (60 + speedRatio * 9 - camera.fov) * Math.min(1, dt * 5);
    camera.updateProjectionMatrix();
  } else {
    if (player.equipped && input.consumeClick()) {
      fireRifle();
    }
    if (!player.equipped && input.consumeClick()) {
      player.punch();
    }
    if (input.consume('KeyJ')) player.punch();
    if (input.consume('KeyK')) player.kick();
    player.update(dt, input, camera, true);
    fleet.resolvePlayer(player);
  }

  fleet.update(dt, player, input, true);
  if (fleet.driven) {
    // While driving, the player's position follows the vehicle so missions,
    // police pursuit and the minimap all read the same location.
    player.position.set(fleet.driven.x, fleet.driven.y, fleet.driven.z);
    player.yaw = fleet.driven.yaw;
  }
  police.update(dt);
  npc.update(dt, player);
  combat.update(dt);
  missions.update(dt, input);
  if (lastMissionStage !== missions.stage) {
    lastMissionStage = missions.stage;
    saveGame(false);
  }
  effects.update(dt);

  const activePos = fleet.driven ?? player;
  sun.target.position.set(activePos.x, 0, activePos.z);
  sun.position.set(activePos.x + sunDir.x * 170, sunDir.y * 170, activePos.z + sunDir.z * 170);

  audio.setEngine(!!fleet.driven, fleet.driven ? Math.abs(fleet.driven.speed) / fleet.driven.maxSpeed : 0);

  const speed = fleet.driven ? Math.abs(fleet.driven.speed) * 3.6 : 0;
  hud.setSpeed(speed, !!fleet.driven);
  hud.setAmmo(player.ammo, player.reserve, player.equipped && !fleet.driven);
  hud.setHealth(player.health);
  hud.setMoney(missions.money);
  hud.setCrosshair(player.equipped && !fleet.driven);
  hud.setDistrict(nearestDistrict());

  if (fleet.driven) {
    hud.setInteract(`Exit ${fleet.driven.label}`);
  } else {
    const vehicle = fleet.nearestVehicle(player);
    hud.setInteract(vehicle ? `Enter ${vehicle.label}` : '');
  }

  saveTimer += dt;
  if (saveTimer > 12) {
    saveTimer = 0;
    saveGame(false);
  }
  drawMinimap(dt);
  hud.update(dt);
  renderer.render(scene, camera);
  input.endFrame();
}

function missionOnEnter(vehicle) {
  missions.onEnterVehicle(vehicle);
}

function fireRifle() {
  if (!player.canFire()) return;
  player.fire();
  hud.setAmmo(player.ammo, player.reserve, true);
  audio.gunshot(0.5, 1);
  const origin = new THREE.Vector3();
  camera.getWorldPosition(origin);
  const direction = player.aimDirection(camera);
  const muzzle = player.muzzleWorld();
  effects.flash(muzzle);
  combat.playerShot(origin, direction, muzzle);
  const wall = collision.raycast(origin, direction, 95);
  if (wall) {
    const point = origin.clone().addScaledVector(direction, wall.distance);
    effects.impact(point, null, 0xcabfa4);
  }
}

let minimapAccumulator = 0;
function drawMinimap(dt) {
  minimapAccumulator += dt;
  if (minimapAccumulator < 0.06) return;
  minimapAccumulator = 0;
  minimap.draw({
    player: { x: player.x, z: player.z, yaw: fleet.driven ? fleet.driven.yaw : player.yaw },
    vehicles: fleet.vehicles,
    objective: missions.objective,
  });
}