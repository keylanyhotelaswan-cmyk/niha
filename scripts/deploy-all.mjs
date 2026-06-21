/**
 * Deploy everything in one step:
 * 1) Bump desktop patch version (optional --no-bump)
 * 2) git commit + push → Vercel + Render
 * 3) npm run release:desktop → GitHub Releases + cashier auto-update
 *
 * Requires GH_TOKEN once in .env
 *
 * Usage:
 *   npm run deploy:all
 *   npm run deploy:all -- --message "fix receipt print"
 *   npm run deploy:all -- --no-bump
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireGhToken } from './load-dotenv.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const desktopPkgPath = join(root, 'apps/desktop/package.json');
const GITHUB_TOKEN_PATTERN = /ghp_[A-Za-z0-9_]{20,}/;

function assertNoSecretsInFile(relativePath) {
  const full = join(root, relativePath);
  if (!existsSync(full)) return;
  const content = readFileSync(full, 'utf8');
  if (GITHUB_TOKEN_PATTERN.test(content)) {
    console.error(`❌ GitHub token detected in ${relativePath}`);
    console.error('   Put GH_TOKEN only in .env (gitignored). Never commit tokens to .env.example.');
    process.exit(1);
  }
}

function assertSafeToCommit() {
  assertNoSecretsInFile('.env.example');

  const dirty = capture('git', ['status', '--porcelain']);
  for (const line of dirty.split('\n')) {
    if (!line.trim()) continue;
    const file = line.slice(3).trim();
    if (file === '.env') {
      console.error('❌ Refusing to commit .env — keep tokens local only.');
      process.exit(1);
    }
    assertNoSecretsInFile(file);
  }
}

function run(cmd, args = []) {
  const result = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function capture(cmd, args = []) {
  const result = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result.stdout.trim();
}

function runNpm(script) {
  execSync(script, { cwd: root, stdio: 'inherit', shell: true, env: process.env });
}

function parseArgs() {
  const args = process.argv.slice(2);
  const messageIdx = args.indexOf('--message');
  return {
    noBump: args.includes('--no-bump'),
    message: messageIdx !== -1 ? args[messageIdx + 1] : null,
  };
}

function readDesktopVersion() {
  const pkg = JSON.parse(readFileSync(desktopPkgPath, 'utf8'));
  return pkg.version;
}

function bumpDesktopPatchVersion() {
  const pkg = JSON.parse(readFileSync(desktopPkgPath, 'utf8'));
  const parts = pkg.version.split('.').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    throw new Error(`Invalid desktop version: ${pkg.version}`);
  }
  parts[2] += 1;
  pkg.version = parts.join('.');
  writeFileSync(desktopPkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  return pkg.version;
}

function main() {
  const { noBump, message } = parseArgs();

  requireGhToken(root);

  const branch = capture('git', ['branch', '--show-current']);
  if (!branch) {
    console.error('❌ Could not detect git branch.');
    process.exit(1);
  }

  let version = readDesktopVersion();
  if (!noBump) {
    version = bumpDesktopPatchVersion();
    console.log(`📦 Desktop version → v${version}`);
  } else {
    console.log(`📦 Desktop version (unchanged) → v${version}`);
  }

  const dirty = capture('git', ['status', '--porcelain']);
  const commitMessage = message?.trim()
    ? `${message.trim()} (desktop v${version})`
    : `release: desktop v${version}`;

  if (dirty) {
    console.log('📝 Committing local changes...');
    assertSafeToCommit();
    run('git', ['add', '-A']);
    run('git', ['commit', '-m', commitMessage]);
  } else if (!noBump) {
    console.log('📝 Committing version bump...');
    run('git', ['add', 'apps/desktop/package.json']);
    run('git', ['commit', '-m', commitMessage]);
  } else {
    console.log('ℹ️  No file changes to commit — continuing with push + desktop release.');
  }

  console.log(`⬆️  Pushing to origin/${branch} (Vercel + Render)...`);
  run('git', ['push', 'origin', branch]);

  console.log('🖥️  Publishing desktop release (GitHub + auto-update)...');
  runNpm('node scripts/release-desktop.mjs');

  console.log('');
  console.log('✅ Done');
  console.log(`   • Web/API: deploying from GitHub → Vercel + Render`);
  console.log(`   • Desktop: v${version} → GitHub Releases → cashier PCs auto-update`);
}

main();
