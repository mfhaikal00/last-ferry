/**
 * Last Ferry — assembles the browser game and its stills into a make.fun entry.
 *
 * The stage directory (MAKEFUN_OUTPUT_DIR, default "out") is replaced with
 * game/ and screenshots/, then vendor/makefun-game.ts renders dossier.json
 * against the same caps the scorer reads.
 */

import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier, readGameTree } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const stageDir = process.env.MAKEFUN_OUTPUT_DIR ?? 'out';

const limits = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
} as const;

const ENTRY_FOLDERS = ['game', 'screenshots'] as const;

/** Replaces the stage directory with a clean copy of every entry folder. */
function stage(): void {
  rmSync(stageDir, { recursive: true, force: true });
  mkdirSync(stageDir, { recursive: true });
  for (const folder of ENTRY_FOLDERS) {
    cpSync(join(repoRoot, folder), join(stageDir, folder), { recursive: true });
  }
  writeFileSync(join(stageDir, 'dossier.json'), buildDossier(stageDir, limits));
}

/** Prints what the entry contains once it has been staged. */
function report(): void {
  const tree = readGameTree(join(stageDir, 'game'));
  const shots = readdirSync(join(stageDir, 'screenshots')).length;
  console.log(
    `last-ferry: ${tree.files.length} files (+${tree.directories.length} dirs), ` +
      `${tree.totalBytes} bytes in game/, ${shots} screenshots, dossier in ${stageDir}`,
  );
}

stage();
report();