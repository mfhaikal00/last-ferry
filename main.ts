/**
 * Last Ferry — stages the static game and screenshots into a make.fun entry.
 *
 * MAKEFUN_OUTPUT_DIR (default "out") is emptied, receives game/ and screenshots/,
 * then dossier.json is rendered by the vendored kit. Caps mirror the scorer's
 * gate.json: only text_max_bytes changes the dossier, the rest only reject.
 */

import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier, readGameTree } from './vendor/makefun-game.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? 'out';

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
} as const;

/** Empties the entry directory, then copies the playable sources and stills. */
function stage(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const folder of ['game', 'screenshots']) {
    cpSync(join(root, folder), join(dir, folder), { recursive: true });
  }
}

/** Writes the dossier into the staged directory and hands back its bytes. */
function dossier(dir: string): Uint8Array {
  const bytes = buildDossier(dir, caps);
  writeFileSync(join(dir, 'dossier.json'), bytes);
  return bytes;
}

/** Prints the entry summary after staging. */
function summary(dir: string): void {
  const tree = readGameTree(join(dir, 'game'));
  const screenshots = readdirSync(join(dir, 'screenshots')).length;
  console.log(
    `last-ferry: ${tree.files.length} files (+${tree.directories.length} dirs), ` +
      `${tree.totalBytes} bytes in game/, ${screenshots} screenshots, dossier in ${dir}`,
  );
}

stage(outputDir);
dossier(outputDir);
summary(outputDir);