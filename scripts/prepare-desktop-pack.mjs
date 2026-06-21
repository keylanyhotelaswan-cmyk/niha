import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const staging = join(repoRoot, '.desktop-pack/print-bridge');
const source = join(repoRoot, 'apps/print-bridge');

if (existsSync(staging)) {
  rmSync(staging, { recursive: true, force: true });
}
mkdirSync(staging, { recursive: true });

cpSync(join(source, 'src'), join(staging, 'src'), { recursive: true });
cpSync(join(source, 'package.json'), join(staging, 'package.json'));

console.log('Installing print-bridge production deps into staging...');
execSync('npm install --omit=dev --no-package-lock', {
  cwd: staging,
  stdio: 'inherit',
});

console.log('✅ Desktop print-bridge staging ready at', staging);
