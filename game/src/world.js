// Last Ferry — Salt Harbor.
// Assembles Salt Harbor: terrain, roads, bridge, terminal, buildings, props,
// the moored ferry, the named gameplay nodes and the workshop weapon rack.

import * as THREE from '../vendor/three.module.min.js';
import { buildBridge, buildRoads, buildStreetFurniture, buildTerminal, buildTerrain, buildWater, createMaterials, Merger } from './city.js';
import { buildBuildings } from './buildings.js';
import { buildProps } from './props.js';
import { NODES, ROADS, WORLD } from './config.js';
import { walkHeightAt } from './roads.js';
import { createSignTexture, getTexture } from './textures.js';

export function buildWorld(scene, collision, assets) {
  const materials = createMaterials();
  const terrainMeshes = buildTerrain(scene, collision, materials);
  const roadData = buildRoads(scene, collision, materials);
  const bridgeMeshes = buildBridge(scene, collision, materials);
  const terminalMeshes = buildTerminal(scene, collision, materials);
  buildStreetFurniture(scene, collision, materials);
  const buildingData = buildBuildings(scene, collision, materials);
  const propData = buildProps(scene, collision, materials);

  // Map boundary, well outside the played area and hidden.
  const b = WORLD.bounds;
  collision.addWall(b.minX, b.minZ, b.maxX, b.minZ, 1, 0, 4, 'bounds:north', 'bounds');
  collision.addWall(b.minX, b.maxZ, b.maxX, b.maxZ, 1, 0, 4, 'bounds:south', 'bounds');
  collision.addWall(b.minX, b.minZ, b.minX, b.maxZ, 1, 0, 4, 'bounds:west', 'bounds');
  collision.addWall(b.maxX, b.minZ, b.maxX, b.maxZ, 1, 0, 4, 'bounds:east', 'bounds');

  // Parking lot for the impounded tow truck.
  buildParkingLot(scene, collision, materials);
  buildDockYard(scene, collision, materials);

  // Named gameplay nodes. They are real scene objects so other systems can bind
  // to them by name; their coordinates are also exported for the minimap.
  const nodeObjects = {};
  for (const [name, node] of Object.entries(NODES)) {
    const obj = new THREE.Object3D();
    obj.name = name;
    obj.position.set(node.x, walkHeightAt(node.x, node.z, 0), node.z);
    obj.rotation.y = node.yaw;
    obj.userData = { area: node.area, node: true };
    scene.add(obj);
    nodeObjects[name] = obj;
  }

  // The moored ferry. The hull is anchored in the harbour, broadside to the
  // terminal, with a coarse collision proxy.
  const ferry = assets.cloneFerry();
  ferry.root.position.set(-112, WORLD.seaLevel - 1.5, 138);
  ferry.root.rotation.y = Math.PI / 2;
  ferry.root.name = 'ferry_salt_harbor';
  scene.add(ferry.root);
  collision.addBox(-112, 138, 18, 7, WORLD.seaLevel - 2, 5.5, 0, 'ferry:hull', 'ferry');
  // Mooring lines from the hull to the quay.
  const lineMat = new THREE.MeshStandardMaterial({ color: 0x5a4a36, roughness: 0.9 });
  for (const x of [-128, -96]) {
    const geo = new THREE.CylinderGeometry(0.06, 0.06, 26, 5);
    const line = new THREE.Mesh(geo, lineMat);
    line.position.set(x + 6, 2.4, 123);
    line.rotation.x = Math.PI / 2.25;
    scene.add(line);
  }

  // Workshop weapon rack, a real named node with a display rifle.
  const rack = buildWeaponRack(assets, materials);
  rack.position.set(-157, 0, -83.5);
  rack.rotation.y = 0.35;
  scene.add(rack);
  collision.addBox(-157, -83.5, 1.6, 0.6, 0, 2.2, 0.35, 'weaponRack_workshop', 'prop');

  // Welcome sign at the west road, plus district signs used as landmarks.
  addDistrictSign(scene, collision, materials, 'SALT HARBOR', 'WORKSHOP · FISH MARKET · FERRY', -184, -70, Math.PI / 2, 6.2, 2.2);
  addDistrictSign(scene, collision, materials, 'CANAL BEND', 'BRIDGE AHEAD', 138, 20, -Math.PI / 2, 5.0, 1.8);
  addDistrictSign(scene, collision, materials, 'BRIDGE', 'SALT HARBOR', 166, 96, Math.PI, 5.0, 1.8);

  return {
    materials,
    ferry,
    nodes: nodeObjects,
    roadData,
    weaponRack: rack,
    buildingBlocks: buildingData.blocks,
    props: propData,
    meshes: { terrainMeshes, bridgeMeshes, terminalMeshes },
  };
}

function buildParkingLot(scene, collision, materials) {
  const m = new Merger();
  const lot = new THREE.BoxGeometry(48, 0.12, 26);
  m.add(lot, materials.asphalt, new THREE.Matrix4().makeTranslation(104, WORLD.roadY - 0.02, -37));
  lot.dispose();
  // Kerb around the lot, leaving the east driveway open.
  for (const [x, z, w, d] of [[80, -50, 0.4, 26], [80, -24, 0.4, 26], [104, -24, 48, 0.4], [104, -50, 48, 0.4]]) {
    const kerb = new THREE.BoxGeometry(w, 0.28, d);
    m.add(kerb, materials.concrete, new THREE.Matrix4().makeTranslation(x, 0.14, z));
    kerb.dispose();
  }
  // Bay lines and the tow slot marking.
  for (let i = 0; i < 5; i++) {
    const x = 84 + i * 7;
    addLine(m, materials.paint, x, 0.18, -45, 0.16, 8);
  }
  addLine(m, materials.yellow, 104, 0.18, -27.2, 20, 0.2);
  addLine(m, materials.yellow, 104, 0.18, -46.8, 20, 0.2);
  // Lot sign.
  const signMat = new THREE.MeshStandardMaterial({
    map: createSignTexture('IMPOUND LOT', 'VEHICLES RELEASE · 08:00', { bg: '#30484b', fg: '#f0ddaf' }),
    roughness: 0.7,
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.0), signMat);
  sign.position.set(79.4, 2.5, -37);
  sign.rotation.y = Math.PI / 2;
  scene.add(sign);
  collision.addBox(79.4, -37, 0.2, 2.3, 1.4, 3.6, 0, 'sign:impound-lot', 'sign');
  const post = new THREE.CylinderGeometry(0.08, 0.1, 2.6, 6);
  m.add(post, materials.metal, new THREE.Matrix4().makeTranslation(79.4, 1.3, -37));
  post.dispose();
  m.finish(scene);
}


function buildDockYard(scene, collision, materials) {
  const m = new Merger();
  const floor = new THREE.BoxGeometry(36, 0.16, 48);
  const yardMat = new THREE.MeshStandardMaterial({ map: getTexture('concrete'), color: 0x8f9691, roughness: 0.92 });
  m.add(floor, yardMat, new THREE.Matrix4().makeTranslation(172, 0.08, 30));
  floor.dispose();
  // Hazard kerb and painted bay edges.
  for (let i = 0; i < 14; i++) {
    const stripe = new THREE.BoxGeometry(0.7, 0.02, 3.2);
    m.add(stripe, i % 2 ? materials.paint : materials.yellow, new THREE.Matrix4().makeTranslation(152.5 + i * 1.1, 0.18, 7));
    stripe.dispose();
  }
  for (let i = 0; i < 5; i++) {
    const line = new THREE.BoxGeometry(0.14, 0.02, 38);
    m.add(line, materials.yellow, new THREE.Matrix4().makeTranslation(158 + i * 6, 0.18, 28));
    line.dispose();
  }
  // A gantry crane gives the yard a working silhouette.
  const gantry = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ map: getTexture('metal'), color: 0x8b9490, roughness: 0.55, metalness: 0.35 });
  const legA = new THREE.Mesh(new THREE.BoxGeometry(0.7, 9, 0.7), steel);
  legA.position.set(192, 4.5, 4);
  legA.castShadow = true;
  gantry.add(legA);
  const legB = legA.clone();
  legB.position.set(192, 4.5, 36);
  gantry.add(legB);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 47), steel);
  beam.position.set(192, 9, 20);
  beam.scale.z = 0.68;
  beam.castShadow = true;
  gantry.add(beam);
  const trolley = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 2.2), steel);
  trolley.position.set(192, 8.4, 22);
  gantry.add(trolley);
  const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 5.4, 5), materials.dark);
  hook.position.set(192, 5.2, 22);
  gantry.add(hook);
  scene.add(gantry);
  collision.addBox(192, 4, 0.5, 0.5, 0, 9, 0, 'dock:crane-leg', 'pillar');
  collision.addBox(192, 36, 0.5, 0.5, 0, 9, 0, 'dock:crane-leg', 'pillar');
  collision.addBox(192, 20, 0.5, 17, 8.2, 9.2, 0, 'dock:crane-beam', 'prop');

  // Background warehouse sign, readable from the combat sight line.
  const backSign = new THREE.Mesh(new THREE.PlaneGeometry(12, 2.4), new THREE.MeshStandardMaterial({
    map: createSignTexture('EAST QUAY', 'PATROL POST · BERTH 9', { bg: '#233f48', fg: '#f1d9a8', wide: true }), roughness: 0.7,
  }));
  backSign.position.set(174, 6.2, 8.2);
  scene.add(backSign);

  // Yard floodlights and a fence line.
  for (const [x, z] of [[154, 12], [190, 56], [190, 14]]) {
    const pole = new THREE.CylinderGeometry(0.09, 0.12, 8.5, 6);
    m.add(pole, materials.metal, new THREE.Matrix4().makeTranslation(x, 4.25, z));
    pole.dispose();
    const head = new THREE.BoxGeometry(0.8, 0.25, 0.5);
    m.add(head, materials.emissiveWarm, new THREE.Matrix4().makeTranslation(x, 8.4, z));
    head.dispose();
    collision.addBox(x, z, 0.15, 0.15, 0, 8.5, 0, 'dock:floodlight', 'pole');
  }
  // A freestanding EAST QUAY board.
  const signMat = new THREE.MeshStandardMaterial({
    map: createSignTexture('EAST QUAY', 'PATROL POST · CARGO', { bg: '#233f48', fg: '#f1d9a8' }),
    roughness: 0.7,
  });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.3), signMat);
  board.position.set(156, 2.7, 10);
  board.rotation.y = -Math.PI / 2;
  board.castShadow = true;
  scene.add(board);
  collision.addBox(156, 10, 0.2, 2.8, 1.5, 3.9, 0, 'sign:east-quay', 'sign');
  m.finish(scene, { castShadow: false, receiveShadow: true });
}

function addLine(m, material, x, y, z, w, d) {
  const geo = new THREE.BoxGeometry(w, 0.02, d);
  m.add(geo, material, new THREE.Matrix4().makeTranslation(x, y, z));
  geo.dispose();
}

function buildWeaponRack(assets, materials) {
  const group = new THREE.Group();
  group.name = 'weaponRack_workshop';
  const frameMat = new THREE.MeshStandardMaterial({ map: getTexture('metal'), color: 0x6d7572, roughness: 0.6, metalness: 0.3 });
  const woodMat = new THREE.MeshStandardMaterial({ map: getTexture('wood'), color: 0x9a7449, roughness: 0.9 });
  const frame = new THREE.Group();
  for (const x of [-1.4, 1.4]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.1, 0.12), frameMat);
    post.position.set(x, 1.05, 0);
    post.castShadow = true;
    frame.add(post);
  }
  for (const y of [0.7, 1.7]) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.1, 0.35), woodMat);
    shelf.position.set(0, y, 0);
    shelf.castShadow = true;
    frame.add(shelf);
  }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 2.1), new THREE.MeshStandardMaterial({
    map: createSignTexture('WEAPON RACK', 'WORKSHOP 02', { bg: '#27393c', fg: '#e7cf9c' }),
    roughness: 0.8,
  }));
  back.position.set(0, 1.3, -0.12);
  frame.add(back);
  group.add(frame);
  if (assets.rifle) {
    const display = assets.rifle.scene.clone(true);
    display.scale.setScalar(0.85);
    display.position.set(0, 1.78, 0.15);
    display.rotation.y = Math.PI / 2;
    group.add(display);
  }
  return group;
}

function addDistrictSign(scene, collision, materials, title, subtitle, x, z, yaw, w, h) {
  const mat = new THREE.MeshStandardMaterial({
    map: createSignTexture(title, subtitle, { bg: '#1b4658', fg: '#f6e2b7', wide: true }),
    roughness: 0.7,
  });
  const group = new THREE.Group();
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  sign.position.y = 3.4;
  group.add(sign);
  const postMat = new THREE.MeshStandardMaterial({ map: getTexture('metal'), color: 0x747d7a, roughness: 0.6, metalness: 0.3 });
  for (const dx of [-w / 2 + 0.4, w / 2 - 0.4]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.6, 6), postMat);
    post.position.set(dx, 1.8, -0.06);
    post.castShadow = true;
    group.add(post);
  }
  group.position.set(x, 0, z);
  group.rotation.y = yaw;
  scene.add(group);
  collision.addBox(x, z, w / 2, 0.2, 0, 3.8, yaw, `sign:${title.toLowerCase().replace(/\s/g, '-')}`, 'sign');
}