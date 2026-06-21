import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireGhToken } from './load-dotenv.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

requireGhToken(root);

console.log('📤 Publishing desktop build — GH_TOKEN loaded from .env');

execSync('npm run publish:win --workspace @niha/desktop', {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});
