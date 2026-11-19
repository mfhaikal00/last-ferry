# Last Ferry

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/mfhaikal00/last-ferry/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/mfhaikal00/last-ferry/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An open-world crime game in the harbour city of **Salt Harbor**. Bagas, a workshop mechanic, takes the impounded tow truck **Tirta**, crosses the canal bridge while Dara calls in the harbour patrol, and reaches the last ferry at Pier 4 before the tide turns.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. Everything the game needs is under `game/`; there is no CDN, no build step and no network request at runtime. `game/index.html` is a plain static page.

If port 8080 is busy, use `node serve.ts --port 8090`.

## Controls

| Input | Action |
| --- | --- |
| `W A S D` | Move on foot / drive |
| Mouse | Look / steer the camera |
| `Shift` | Sprint |
| `Space` | Jump / handbrake |
| `E` | Enter or exit a vehicle |
| `T` | Hook or release a car with the tow truck |
| `R` | Equip or unequip the rifle |
| `F` | Reload |
| `J` / `K` | Punch / kick |
| Left click | Fire the rifle, or punch when unarmed |
| `Esc` | Pause |
| `M` | Replay the run after completing it |

The game starts with a title menu, supports Continue from a browser save, and runs offline in desktop Chrome. The cover screenshot is the bridge chase: Unit 7 behind Tirta, wanted level one, the ferry-lane objective and the Salt Harbor minimap.

## The world

- **Workshop → Shop Street → Fish Market → Canal Bend → Bridge → Waterfront Road → Ferry Terminal → back to the Workshop.**
- Named data nodes: `spawn_player_01`, `slot_tow_truck_A`, `pos_guard_harbor`, `junction_patrol_entry`, `lane_ferry_dest`, `checkpoint_bridge_01`, plus a `weaponRack_workshop` node.
- Two-way road loop with kerbs, sidewalks, crossings, a raised bridge, a canal and a pedestrian alley beneath the bridge end.
- Composite buildings with pitched roofs, awnings, framed windows, AC units, laundry, pipes, antennas and signs. No bare boxes.
- Traffic, pedestrians, a single patrol car with a roof-light marker and siren, one-star wanted response, Dara's radio call and Idris on the pier.
- Mission **Last Ferry** with a recorded `truck_takeover` event, a **Dock Trouble** combat follow-up, cash rewards and a browser save.
- Player capsule and swept collision against labelled proxies; vehicle OBB collisions; water, quay and map boundaries; the rifle is parented to `mixamorig:RightHand`.

## Files

- `game/index.html` — HUD, menus, title screen and the game canvas.
- `game/src/main.js` — boot, loop, interaction routing and screenshot stages.
- `game/src/core.js` — world constants, deterministic random, save, input and procedural audio.
- `game/src/world.js` — collision proxies, road maths, terrain, sea, sky, bridge and terminal.
- `game/src/buildings.js`, `props.js`, `assets.js` — building generator, street dressing, GLB/texture pipeline.
- `game/src/player.js`, `vehicles.js`, `police.js`, `npc.js`, `missions.js` — actors, driving, patrol, story and combat.
- `game/src/hud.js` — HUD, minimap and menus.
- `game/assets/` — the project owner's optimised character, vehicle, rifle and ferry GLBs.
- `game/vendor/` — three.js and the minified glTF/meshopt addons, vendored for offline play.
- `main.ts` — copies `game/` and `screenshots/` to `/output` and writes the make.fun dossier.
- `screenshots/` — four real renders of the game: chase, market, terminal and east quay.

## Build and submission

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

The output directory holds `game/`, `screenshots/` and `dossier.json`, byte-identical across runs. The project is entered at **mfhaikal00/last-ferry** with an OSI-approved MIT license. The city, characters, vehicles, story, sounds and textures are original to this project; the provided character and vehicle GLBs are the project owner's assets.

<sub>Built for [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>