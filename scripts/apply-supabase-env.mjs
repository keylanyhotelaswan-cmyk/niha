/**
 * يحدّث DATABASE_URL و DIRECT_URL للربط مع Supabase السحابي.
 * 1) من Supabase: Project Settings → Database → Reset database password
 * 2) ضع كلمة المرور في .env: SUPABASE_DB_PASSWORD=...
 * 3) شغّل: npm run setup:supabase-db
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');
const apiEnvPath = join(root, 'apps', 'api', '.env');

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

function serializeEnv(map, original) {
  const lines = original.split(/\r?\n/);
  const seen = new Set();
  const out = [];

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) {
      out.push(line);
      continue;
    }
    const i = line.indexOf('=');
    if (i === -1) {
      out.push(line);
      continue;
    }
    const key = line.slice(0, i).trim();
    if (map.has(key)) {
      out.push(`${key}=${map.get(key)}`);
      seen.add(key);
    } else {
      out.push(line);
    }
  }

  for (const [key, value] of map) {
    if (!seen.has(key) && !original.includes(`${key}=`)) {
      out.push(`${key}=${value}`);
    }
  }

  return out.join('\n').replace(/\n?$/, '\n');
}

const envContent = readFileSync(envPath, 'utf8');
const env = parseEnv(envContent);

const ref = env.get('SUPABASE_PROJECT_REF') ?? 'tudmbyquvkbrixzojhhb';
const region = env.get('SUPABASE_DB_REGION') ?? 'eu-west-1';
const password = env.get('SUPABASE_DB_PASSWORD')?.trim();

if (!password) {
  console.error('❌ ضع كلمة مرور Database في .env تحت SUPABASE_DB_PASSWORD');
  console.error('   Supabase → Project Settings → Database → Reset database password');
  process.exit(1);
}

const encoded = encodeURIComponent(password);
const poolerHost = `aws-0-${region}.pooler.supabase.com`;
const databaseUrl = `postgresql://postgres.${ref}:${encoded}@${poolerHost}:6543/postgres?pgbouncer=true`;
const directUrl = `postgresql://postgres.${ref}:${encoded}@${poolerHost}:5432/postgres`;

env.set('DATABASE_URL', databaseUrl);
env.set('DIRECT_URL', directUrl);
env.set('SUPABASE_URL', env.get('SUPABASE_URL') ?? `https://${ref}.supabase.co`);

const newRoot = serializeEnv(env, envContent);
writeFileSync(envPath, newRoot, 'utf8');

let apiContent = readFileSync(apiEnvPath, 'utf8');
const apiEnv = parseEnv(apiContent);
apiEnv.set('DATABASE_URL', databaseUrl);
apiEnv.set('DIRECT_URL', directUrl);
writeFileSync(apiEnvPath, serializeEnv(apiEnv, apiContent), 'utf8');

console.log('✅ تم تحديث DATABASE_URL و DIRECT_URL لـ Supabase السحابي');
console.log(`   Project: ${ref} (${region})`);
console.log('   الخطوة التالية:');
console.log('   cd apps/api && npx prisma db push && npm run prisma:seed --workspace @niha/api');
