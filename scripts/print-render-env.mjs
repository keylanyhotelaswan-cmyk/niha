/**
 * يطبع متغيرات Render جاهزة للنسخ من .env المحلي.
 * الاستخدام: node scripts/print-render-env.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');

function parseEnv(content) {
  const map = new Map();
  for (const line of content.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i === -1) continue;
    map.set(line.slice(0, i).trim(), line.slice(i + 1));
  }
  return map;
}

const env = parseEnv(readFileSync(envPath, 'utf8'));
const ref = env.get('SUPABASE_PROJECT_REF') ?? 'tudmbyquvkbrixzojhhb';
const region = env.get('SUPABASE_DB_REGION') ?? 'eu-west-1';
const password = env.get('SUPABASE_DB_PASSWORD')?.trim();

let databaseUrl = env.get('DATABASE_URL')?.trim();
let directUrl = env.get('DIRECT_URL')?.trim();

if (password && (!databaseUrl || databaseUrl.includes('localhost'))) {
  const encoded = encodeURIComponent(password);
  const poolerHost = `aws-0-${region}.pooler.supabase.com`;
  databaseUrl = `postgresql://postgres.${ref}:${encoded}@${poolerHost}:6543/postgres?pgbouncer=true`;
  directUrl = `postgresql://postgres.${ref}:${encoded}@${poolerHost}:5432/postgres`;
}

if (!databaseUrl || !directUrl) {
  console.error('❌ ضع SUPABASE_DB_PASSWORD في .env ثم أعد التشغيل');
  process.exit(1);
}

const jwtSecret = env.get('JWT_SECRET')?.includes('change-in-production')
  ? randomBytes(32).toString('hex')
  : (env.get('JWT_SECRET') ?? randomBytes(32).toString('hex'));

const renderVars = {
  DATABASE_URL: databaseUrl,
  DIRECT_URL: directUrl,
  JWT_SECRET: jwtSecret,
  NODE_ENV: 'production',
  APP_URL: 'https://niha-omega.vercel.app',
  APP_URLS: 'https://niha-omega.vercel.app',
  JWT_EXPIRES_IN: '24h',
  DEFAULT_TIMEZONE: 'Africa/Cairo',
  DEFAULT_CURRENCY: 'EGP',
};

console.log('=== انسخ كل سطر في Render → Environment Variables ===\n');
for (const [key, value] of Object.entries(renderVars)) {
  console.log(`${key}=${value}`);
}
console.log('\n=== Build Command ===');
console.log('npm install && npm run build --workspace @niha/api && npm run prisma:generate --workspace @niha/api && npx prisma migrate deploy --schema apps/api/prisma/schema.prisma');
console.log('\n=== Start Command ===');
console.log('node apps/api/dist/main.js');
console.log('\n=== Health Check ===');
console.log('/api/health');
console.log('\n=== Service URL (بعد Deploy) ===');
console.log('https://niha-api.onrender.com/api/health');
