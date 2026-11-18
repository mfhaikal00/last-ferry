// Last Ferry — entrypoint (Node 22, standard library only).
// The game in game/ is a static, offline three.js world. This program copies the
// game and its screenshots to /output (or MAKEFUN_OUTPUT_DIR) and writes the
// make.fun dossier with the kit's vendored library, exactly as the scorer reads it.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's caps: text size shapes the dossier bytes; the rest refuse an
// entry the gate would refuse (at most four screenshots, each 256 KiB; at most
// 993 files and 48 MiB in game/; no game path over 1000 UTF-8 bytes).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);