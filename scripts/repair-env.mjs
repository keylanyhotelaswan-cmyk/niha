/**
 * Repairs .env encoding (UTF-16 / BOM) and ensures GH_TOKEN placeholder exists.
 * Run: npm run fix:env
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');

if (!existsSync(envPath)) {
  console.error('❌ .env not found. Copy from .env.example first.');
  process.exit(1);
}

const raw = readFileSync(envPath);

function decodeEnv(buffer) {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.slice(2).toString('utf16le');
  }
  if (buffer.length >= 2 && buffer[1] === 0 && buffer[0] !== 0) {
    return buffer.toString('utf16le');
  }
  return buffer.toString('utf8');
}

let text = decodeEnv(raw).replace(/^\uFEFF/, '');

if (!text.includes('NODE_ENV=')) {
  console.error('❌ Could not decode .env — restore from backup or .env.example');
  process.exit(1);
}

if (!/^GH_TOKEN=/m.test(text)) {
  text = `${text.trimEnd()}\n\n# GitHub — for npm run deploy:all only (never commit this file)\nGH_TOKEN=\n`;
}

writeFileSync(envPath, text, { encoding: 'utf8' });
console.log('✅ .env repaired (UTF-8). Close the tab and reopen the file in Cursor.');
