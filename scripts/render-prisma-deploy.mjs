/**
 * Render build helper: sync Prisma migration history with an existing Supabase schema.
 */
import { execSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const schema = join(root, 'apps', 'api', 'prisma', 'schema.prisma');
const migrationsDir = join(root, 'apps', 'api', 'prisma', 'migrations');

function prismaCmd(args, { capture = false } = {}) {
  const cmd = `npx prisma ${args.join(' ')} --schema "${schema.replace(/\\/g, '/')}"`;
  return execSync(cmd, {
    cwd: root,
    stdio: capture ? 'pipe' : 'inherit',
    encoding: 'utf8',
    env: process.env,
  });
}

function commandOutput(error) {
  return `${error?.stdout ?? ''}\n${error?.stderr ?? ''}\n${error?.message ?? ''}`;
}

function listMigrationNames() {
  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function resolveMigration(name) {
  try {
    prismaCmd(['migrate', 'resolve', '--applied', name], { capture: true });
    console.log(`↪ marked applied: ${name}`);
  } catch (error) {
    const output = commandOutput(error);
    if (output.includes('P3008')) return;
    throw error;
  }
}

function resolveKnownFailures(output) {
  for (const match of output.matchAll(/The `([^`]+)` migration/g)) {
    if (match[1]) resolveMigration(match[1]);
  }
  for (const match of output.matchAll(/Migration name: ([^\s]+)/g)) {
    if (match[1]) resolveMigration(match[1]);
  }
}

function markAllMigrationsApplied() {
  console.log('↪ syncing migration history with existing database schema');
  for (const name of listMigrationNames()) {
    resolveMigration(name);
  }
}

function deployMigrations() {
  try {
    prismaCmd(['migrate', 'deploy'], { capture: true });
    console.log('✅ prisma migrate deploy completed');
    return;
  } catch (error) {
    const output = commandOutput(error);
    const recoverable =
      output.includes('P3009') ||
      output.includes('P3018') ||
      output.includes('already exists') ||
      output.includes('failed migrations');

    if (!recoverable) {
      console.error(output);
      throw error;
    }

    resolveKnownFailures(output);
    markAllMigrationsApplied();

    prismaCmd(['migrate', 'deploy'], { capture: true });
    console.log('✅ prisma migrate deploy completed after migration sync');
  }
}

deployMigrations();
