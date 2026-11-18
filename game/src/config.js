// Last Ferry — shared world constants for Salt Harbor.
// North is -Z. Units are metres. Every named node used by the mission, police and
// minimap systems lives here so the map data and the rendered world cannot drift.

export const TITLE = 'Last Ferry';
export const CITY = 'Salt Harbor';

export const WORLD = {
  bounds: { minX: -200, maxX: 196, minZ: -158, maxZ: 176 },
  seaLevel: -0.9,
  landY: 0,
  roadY: 0.16,
  sidewalkY: 0.3,
  paintY: 0.315,
  marketY: 0.12,
  pierY: 0.55,
  bridgeY: 2.5,
  fogNear: 60,
  fogFar: 340,
};

export const NODES = {
  spawn_player_01: { x: -146, z: -78, yaw: 1.18, area: 'Workshop' },
  slot_tow_truck_A: { x: 98, z: -38, yaw: Math.PI / 2, area: 'Parking Lot' },
  pos_guard_harbor: { x: 87, z: -36, yaw: -Math.PI / 2, area: 'Parking Lot' },
  junction_patrol_entry: { x: 147, z: 44, yaw: Math.PI, area: 'Canal Bend' },
  lane_ferry_dest: { x: -110, z: 101, yaw: Math.PI / 2, area: 'Ferry Lane' },
  checkpoint_bridge_01: { x: 96, z: 86, yaw: Math.PI / 2, area: 'Bridge' },
};

export const POI = {
  workshop: { x: -143, z: -80 },
  shopStreet: { x: -30, z: -70 },
  market: { x: 100, z: -92 },
  parkingLot: { x: 103, z: -37 },
  canalBend: { x: 147, z: 30 },
  bridge: { x: 96, z: 86 },
  waterfront: { x: -20, z: 92 },
  terminal: { x: -130, z: 80 },
  ferryLane: { x: -110, z: 101 },
  westJunction: { x: -172, z: 20 },
  alley: { x: 64, z: 40 },
  pier: { x: -106, z: 122 },
  patrolStandby: { x: 173, z: 41 },
};

// Road ribbons. `sidewalk` is the walkway width on each side.
export const ROADS = {
  shopStreet: {
    width: 10, sidewalk: 2.4, twoWay: true,
    points: [[-176, -70], [-120, -70], [-60, -70], [0, -70], [62, -69], [88, -67], [104, -60], [112, -52]],
  },
  marketLink: {
    width: 10, sidewalk: 2.4, twoWay: true,
    points: [[112, -52], [126, -46], [138, -32], [145, -12], [147, 14], [147, 36], [147, 54], [150, 66], [156, 76], [160, 82], [160, 86], [156, 86]],
  },
  bridge: {
    width: 13, sidewalk: 1.5, twoWay: true, bridge: true,
    points: [[156, 86], [146, 86], [138, 86], [122, 86], [96, 86], [72, 86], [58, 86], [50, 87], [38, 90], [28, 91]],
  },
  waterfront: {
    width: 11, sidewalk: 3.0, twoWay: true,
    points: [[28, 91], [-20, 92], [-60, 93], [-90, 94], [-118, 94], [-144, 94], [-160, 93], [-172, 90]],
  },
  westRoad: {
    width: 10, sidewalk: 2.4, twoWay: true,
    points: [[-172, 90], [-172, 48], [-172, 8], [-172, -34], [-172, -62], [-176, -70]],
  },
  terminalLoop: {
    width: 10, sidewalk: 2.6, twoWay: false,
    points: [[-150, 94], [-146, 100], [-136, 103], [-112, 104], [-94, 102], [-86, 98], [-84, 94]],
  },
  lotDrive: {
    width: 8, sidewalk: 1.6, twoWay: false,
    points: [[112, -38], [124, -38], [134, -36], [142, -32], [147, -24]],
  },
  patrolSide: {
    width: 7, sidewalk: 1.8, twoWay: false,
    points: [[147, 44], [158, 42], [170, 41], [190, 41]],
  },
};

// Bridge deck height as a function of X. The deck is flat across the canal and
// ramps down at both landings; the alley passes beneath the west deck.
export const BRIDGE = {
  z: 86,
  deckX0: 58,
  deckX1: 140,
  westRampX0: 40,
  eastRampX1: 156,
  halfWidth: 8.2,
  rampWidth: 8.5,
};

export const PED_PATHS = {
  alley: {
    loop: false,
    points: [[96, -48], [80, -47], [70, -42], [66, -24], [64, 6], [63, 34], [63, 58], [64, 74], [66, 84], [66, 94], [46, 98], [4, 99], [-46, 99], [-80, 98], [-104, 95]],
  },
  marketWalk: {
    loop: true,
    points: [[-150, -60], [-100, -60], [-40, -60], [20, -60], [62, -60], [80, -57], [94, -52], [100, -44], [96, -38], [80, -44], [68, -52], [20, -58], [-50, -58], [-120, -58], [-150, -60]],
  },
  terminalWalk: {
    loop: true,
    points: [[-148, 93], [-138, 99], [-118, 100], [-98, 99], [-86, 95], [-112, 92], [-140, 91], [-148, 93]],
  },
  innerLane: {
    loop: true,
    points: [[-77, -36], [-77, 44], [-36, 44], [-36, -36], [-77, -36]],
  },
};

export const TRAFFIC_LOOPS = {
  harbourLoop: {
    speed: 8.5,
    points: [[-158, -70], [-100, -70], [-40, -70], [20, -70], [62, -69], [88, -67], [104, -60], [112, -52], [126, -46], [138, -32], [145, -12], [147, 14], [147, 36], [147, 54], [150, 66], [156, 76], [160, 82], [160, 86], [156, 86], [146, 86], [138, 86], [122, 86], [96, 86], [72, 86], [58, 86], [50, 87], [38, 90], [28, 91], [-20, 92], [-60, 93], [-90, 94], [-118, 94], [-144, 94], [-160, 93], [-172, 90], [-172, 48], [-172, 8], [-172, -34], [-172, -62], [-166, -68], [-158, -70]],
  },
  marketLoop: {
    speed: 7.2,
    points: [[112, -52], [126, -46], [138, -32], [145, -12], [147, 14], [147, 36], [147, 54], [150, 66], [156, 76], [160, 82], [160, 86], [156, 86], [146, 86], [138, 86], [122, 86], [96, 86], [72, 86], [58, 86], [50, 87], [38, 90], [28, 91], [-20, 92], [-60, 93], [-90, 94], [-118, 94], [-144, 94], [-160, 93], [-172, 90], [-172, 48], [-172, 8], [-172, -34], [-172, -62], [-166, -68], [-158, -70], [-100, -70], [-40, -70], [20, -70], [62, -69], [88, -67], [104, -60], [112, -52]],
  },
};

export const PATROL_ROUTE = [[172, 41], [160, 42], [150, 44], [147, 44], [147, 54], [150, 66], [156, 76], [160, 82], [160, 86], [156, 86], [146, 86], [140, 86], [120, 86], [96, 86], [74, 86]];

export const CHARACTERS = {
  bagas: { file: 'player_bagas.glb', height: 1.82, label: 'Bagas' },
  dara: { file: 'guard_dara.glb', height: 1.74, label: 'Dara' },
  citizen: { file: 'npc_citizen.glb', height: 1.76, label: 'Citizen' },
  police: { file: 'npc_police.glb', height: 1.82, label: 'Police' },
  gangster: { file: 'enemy_gangster.glb', height: 1.84, label: 'Dock Thug' },
};

export const VEHICLES = {
  tow: { file: 'car_tow.glb', length: 6.2, width: 2.35, height: 2.55, label: 'Tirta' },
  police: { file: 'car_police.glb', length: 4.95, width: 1.95, height: 1.55, label: 'Unit 7', flip: true },
  civilian: { file: 'car_sport.glb', length: 4.55, width: 1.92, height: 1.42, label: 'Civilian Car', flip: true },
  ferry: { file: 'ferry.glb', length: 36, width: 13.7, height: 16.2, label: 'Ferry' },
  rifle: { file: 'rifle.glb', label: 'Rifle' },
};

export const WEAPON = {
  clip: 'Rifle_Walk',
  bone: 'RightHand',
  magazine: 30,
  damage: 34,
  range: 90,
};

export const PALETTE = {
  concrete: 0xd6cdbb,
  concreteDark: 0x9a9384,
  coral: 0xc9715c,
  teal: 0x4f8d8a,
  ochre: 0xd2a14a,
  blue: 0x2f6fb4,
  awningBlue: 0x2a5fa8,
  rust: 0x8a4a32,
  roofRust: 0x7a4632,
  roofTile: 0xa9543c,
  roofGrey: 0x8b8b82,
  wood: 0x8a6642,
  glass: 0x27464d,
  asphalt: 0x3a3b3c,
  sidewalk: 0xb9b0a0,
  paint: 0xe8e2d0,
  yellow: 0xe4b93a,
  ferryOrange: 0xd96a2b,
  water: 0x2d7488,
  palm: 0x3f7a43,
  neon: 0xffc861,
};

export const QUALITY = {
  shadowMap: 2048,
  pixelRatioLimit: 1.5,
  drawDistance: 320,
  trafficCars: 3,
  citizens: 4,
};