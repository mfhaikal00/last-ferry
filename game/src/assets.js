// Last Ferry — Salt Harbor.
// GLB loading and normalisation. The finished asset pack uses meshopt geometry
// compression and WebP textures, so the meshopt decoder and a raw GLTFLoader are
// vendored under game/vendor. Every template is scaled to metres and its feet or
// wheels are placed on y = 0 so placement in the world stays simple.

import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/gltf-loader.min.js';
import { MeshoptDecoder } from '../vendor/meshopt-decoder.min.js';
import { cloneSkeleton } from '../vendor/skeleton-utils.min.js';
import { CHARACTERS, VEHICLES } from './config.js';
import { rngFor } from './random.js';

const FILES = {
  bagas: 'player_bagas.glb',
  dara: 'guard_dara.glb',
  citizen: 'npc_citizen.glb',
  police: 'npc_police.glb',
  gangster: 'enemy_gangster.glb',
  tow: 'car_tow.glb',
  patrol: 'car_police.glb',
  civilian: 'car_sport.glb',
  ferry: 'ferry.glb',
  rifle: 'rifle.glb',
};

const CHARACTER_KEYS = ['bagas', 'dara', 'citizen', 'police', 'gangster'];
const VEHICLE_KEYS = ['tow', 'patrol', 'civilian', 'ferry'];

const CITIZEN_COLOURS = [0x2f7d74, 0x9c5b3a, 0x4c6397, 0x8d7a4c];

export class AssetLibrary {
  constructor() {
    this.templates = {};
    this.rifle = null;
    this.stats = [];
  }

  async load(onProgress = () => {}) {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const names = Object.keys(FILES);
    let done = 0;
    for (const key of names) {
      const gltf = await loader.loadAsync(`./assets/${FILES[key]}`);
      const template = this.prepare(key, gltf);
      this.templates[key] = template;
      this.stats.push(template.stats);
      done++;
      onProgress(done / names.length, key);
    }
    this.rifle = this.prepareRifle(this.templates.rifle);
    return this;
  }

  prepare(key, gltf) {
    const scene = gltf.scene;
    const isCharacter = CHARACTER_KEYS.includes(key);
    const isVehicle = VEHICLE_KEYS.includes(key);
    const cfg = isCharacter ? CHARACTERS[key] : VEHICLES[key === 'patrol' ? 'police' : key];
    let skins = 0;
    let textures = 0;
    let meshes = 0;
    let triangles = 0;
    const materials = new Set();

    scene.traverse((node) => {
      if (!node.isMesh) return;
      meshes++;
      node.castShadow = true;
      node.receiveShadow = true;
      if (node.isSkinnedMesh) {
        skins++;
        node.frustumCulled = false;
      }
      const pos = node.geometry.getAttribute('position');
      if (pos) triangles += (node.geometry.index ? node.geometry.index.count : pos.count) / 3;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      for (const mat of mats) {
        if (!mat) continue;
        materials.add(mat);
        for (const slot of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap']) {
          if (mat[slot]) textures++;
        }
      }
    });

    if (key === 'citizen') {
      this.applyCitizenColours(scene);
    }

    const initial = new THREE.Box3().setFromObject(scene);
    const initialSize = initial.getSize(new THREE.Vector3());
    let scale = 1;
    if (isCharacter && cfg) {
      scale = cfg.height / Math.max(0.01, initialSize.y);
    }
    if (isVehicle && cfg) {
      if (key === 'ferry') {
        // The ferry scan is diagonal in its own local frame; align the keel to Z.
        scene.rotation.y = -0.616;
        scene.updateMatrixWorld(true);
      }
      const oriented = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
      const longest = Math.max(oriented.x, oriented.z);
      scale = cfg.length / Math.max(0.01, longest);
      if (key !== 'ferry' && oriented.x > oriented.z) scene.rotation.y = -Math.PI / 2;
    }
    scene.scale.multiplyScalar(scale);
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene);
    const centre = box.getCenter(new THREE.Vector3());
    const rotated = isVehicle && key !== 'ferry' && initialSize.x > initialSize.z;
    if (rotated) {
      // The scene was rotated about y; re-centre using the rotation-aware box.
      scene.position.x -= centre.x;
      scene.position.z -= centre.z;
    } else {
      scene.position.x -= centre.x;
      scene.position.z -= centre.z;
    }
    scene.position.y -= box.min.y;

    const wrapper = new THREE.Group();
    wrapper.name = `template_${key}`;
    wrapper.add(scene);
    wrapper.updateMatrixWorld(true);
    const finalBox = new THREE.Box3().setFromObject(wrapper);
    const size = finalBox.getSize(new THREE.Vector3());

    return {
      key,
      scene: wrapper,
      animations: gltf.animations ?? [],
      scale,
      size,
      stats: {
        key,
        meshes,
        skins,
        animations: (gltf.animations ?? []).length,
        textures,
        materials: materials.size,
        triangles: Math.round(triangles),
        height: +size.y.toFixed(2),
        length: +Math.max(size.x, size.z).toFixed(2),
      },
    };
  }

  applyCitizenColours(scene) {
    const skin = new THREE.Color(0xc08a63);
    const shirt = new THREE.Color(0x2f7d74);
    const pants = new THREE.Color(0x3c4654);
    const shoes = new THREE.Color(0x272321);
    const box = new THREE.Box3().setFromObject(scene);
    const height = Math.max(0.01, box.max.y - box.min.y);
    scene.traverse((node) => {
      if (!node.isMesh) return;
      const pos = node.geometry.getAttribute('position');
      if (!pos) return;
      const colours = new Float32Array(pos.count * 3);
      const c = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        const y = (pos.getY(i) - box.min.y) / height;
        if (y > 0.84) c.copy(skin);
        else if (y > 0.52) c.copy(shirt);
        else if (y > 0.08) c.copy(pants);
        else c.copy(shoes);
        colours[i * 3] = c.r;
        colours[i * 3 + 1] = c.g;
        colours[i * 3 + 2] = c.b;
      }
      node.geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      node.material = mats.map((mat) => new THREE.MeshStandardMaterial({
        color: 0xffffff,
        vertexColors: true,
        roughness: 0.88,
        metalness: 0,
        name: 'citizen_flat',
      }));
      if (node.material.length === 1) node.material = node.material[0];
    });
  }

  prepareRifle(template) {
    if (!template) return null;
    const scene = template.scene;
    // Tripo rifle: long axis is X. Rotate so the stock-to-muzzle line is Z.
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    if (size.x > size.z) {
      scene.rotation.y = -Math.PI / 2;
      scene.updateMatrixWorld(true);
    }
    const box2 = new THREE.Box3().setFromObject(scene);
    const size2 = box2.getSize(new THREE.Vector3());
    const holder = new THREE.Group();
    const pivot = new THREE.Group();
    const target = 0.92;
    pivot.add(scene);
    const length = Math.max(size2.z, 0.01);
    pivot.scale.setScalar(target / length);
    holder.add(pivot);
    holder.updateMatrixWorld(true);
    const finalBox = new THREE.Box3().setFromObject(holder);
    const centre = finalBox.getCenter(new THREE.Vector3());
    pivot.position.y -= centre.y;
    pivot.position.x -= centre.x;
    pivot.position.z -= finalBox.min.z;
    holder.name = 'rifle_template';
    return { scene: holder, length: target };
  }

  cloneCharacter(key) {
    const template = this.templates[key];
    if (!template) return null;
    const root = cloneSkeleton(template.scene);
    root.name = `character_${key}`;
    root.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        if (node.isSkinnedMesh) node.frustumCulled = false;
      }
    });
    return {
      root,
      animations: template.animations,
      scale: template.scale,
    };
  }

  cloneVehicle(key) {
    const template = this.templates[key];
    if (!template) return null;
    const root = template.scene.clone(true);
    root.name = `vehicle_${key}`;
    root.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    return root;
  }

  cloneFerry() {
    const template = this.templates.ferry;
    const root = template.scene.clone(true);
    root.name = 'ferry_salt_harbor';
    // Re-skin the scan with a clean orange harbour livery. The real ferry
    // geometry stays; only the photogrammetry texture is replaced by vertex
    // colour bands, because the scan's albedo reads as a black wreck at sunset.
    const hullColour = new THREE.Color(0xc9632a);
    const cream = new THREE.Color(0xe8dcc6);
    const dark = new THREE.Color(0x2a2823);
    const windowBand = new THREE.Color(0x24444f);
    root.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
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
        if (h < 0.07) c.copy(dark);
        else if (h < 0.36) c.copy(hullColour);
        else if (h < 0.42) c.copy(cream);
        else if (h < 0.55) c.copy(windowBand);
        else c.copy(cream);
        const grain = (Math.sin(pos.getX(i) * 12.9898 + pos.getY(i) * 78.233 + pos.getZ(i) * 37.719) * 43758.5453) % 1;
        c.offsetHSL(0, 0, (grain - 0.5) * 0.035);
        colours[i * 3] = c.r;
        colours[i * 3 + 1] = c.g;
        colours[i * 3 + 2] = c.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      node.geometry = geo;
      node.material = new THREE.MeshStandardMaterial({
        vertexColors: true, color: 0xffffff, roughness: 0.72, metalness: 0.06,
        side: THREE.DoubleSide, shadowSide: THREE.DoubleSide,
      });
    });
    const orange = new THREE.MeshStandardMaterial({ color: 0xe9772c, emissive: 0x5c1f08, emissiveIntensity: 0.35, roughness: 0.66, metalness: 0.04 });
    const funnel = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.35, 3.3, 10), orange);
    funnel.position.set(0, 13.2, -2.2);
    funnel.castShadow = true;
    root.add(funnel);
    const funnelCap = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.45, 10), new THREE.MeshStandardMaterial({ color: 0x25211e, roughness: 0.8 }));
    funnelCap.position.set(0, 15.0, -2.2);
    root.add(funnelCap);
    return { root, size: template.size };
  }

  get debugStats() {
    return this.stats;
  }
}

export function findBone(root, fragment) {
  const needle = fragment.toLowerCase().replace(/[^a-z]/g, '');
  let found = null;
  root.traverse((node) => {
    if (found || !node.isBone) return;
    const name = node.name.toLowerCase().replace(/[^a-z]/g, '');
    if (name.endsWith(needle) || name.includes(needle)) found = node;
  });
  return found;
}