/**
 * Last Ferry — packs the static game into a make.fun entry.
 *
 * Copies game/ and screenshots/ into the output directory (MAKEFUN_OUTPUT_DIR,
 * or out), then renders dossier.json with the vendored kit library. The
 * directory is rebuilt from scratch on every run so stale files never leak
 * into the entry.
 */

import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier, readGameTree } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const targetDir = process.env.MAKEFUN_OUTPUT_DIR ?? 'out';

// Caps mirroring the scorer's gate.json. text_max_bytes trims the dossier;
// everything else only rejects an entry the gate would already reject.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
} as const;

/** Stages game/ and screenshots/ into a freshly emptied output directory. */
const stageEntry = (dir: string): void => {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  cpSync(join(repoRoot, 'game'), join(dir, 'game'), { recursive: true });
  cpSync(join(repoRoot, 'screenshots'), join(dir, 'screenshots'), { recursive: true });
};

/** Writes the dossier and returns the bytes it wrote, for the summary. */
const writeDossier = (dir: string): Uint8Array => {
  const dossier = buildDossier(dir, DOSSIER_CAPS);
  writeFileSync(join(dir, 'dossier.json'), dossier);
  return dossier;
};

const report = (dir: string): void => {
  const tree = readGameTree(join(dir, 'game'));
  const shots = readdirSync(join(dir, 'screenshots')).length;
  const dirs = tree.directories.length;
  console.log(
    `last-ferry: ${tree.files.length} files (+${dirs} dirs), ` +
      `${tree.totalBytes} bytes in game/, ${shots} screenshots, dossier in ${dir}`,
  );
};

stageEntry(targetDir);
writeDossier(targetDir);
report(targetDir);