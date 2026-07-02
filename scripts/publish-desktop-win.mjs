/**
 * Windows desktop publish — loads GH_TOKEN from repo .env then uploads to GitHub Releases.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireGhToken } from './load-dotenv.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const desktopDir = join(root, 'apps/desktop');

requireGhToken(root);

console.log('🚀 Publishing desktop — GH_TOKEN loaded from .env');

const result = spawnSync(
  'npx',
  ['electron-builder', '--win', '--config', 'electron-builder.config.cjs', '--publish', 'always'],
  {
    cwd: desktopDir,
    stdio: 'inherit',
    env: { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false' },
    shell: true,
  },
);

process.exit(result.status ?? 1);
