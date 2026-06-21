import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Loads key=value pairs from repo `.env` into process.env (without overwriting existing vars).
 * @param {string} [root]
 */
export function loadDotEnv(root = defaultRoot) {
  const envPath = join(root, '.env');
  if (!existsSync(envPath)) return false;

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const i = trimmed.indexOf('=');
    if (i === -1) continue;

    const key = trimmed.slice(0, i).trim();
    let value = trimmed.slice(i + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return true;
}

/**
 * @param {string} [root]
 */
export function requireGhToken(root = defaultRoot) {
  loadDotEnv(root);

  if (!process.env.GH_TOKEN?.trim()) {
    console.error('❌ GH_TOKEN غير موجود.');
    console.error('   ضعه مرة واحدة في ملف .env في جذر المشروع:');
    console.error('   GH_TOKEN=your-token-here');
    console.error('   File: .env in repo root (NOT .env.example)');
    process.exit(1);
  }
}
