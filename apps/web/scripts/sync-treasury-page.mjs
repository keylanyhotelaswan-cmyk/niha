import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, '..');

const targets = [
  ['src/pages/treasury-workspace/treasury-workspace-page.tsx', 'src/pages/treasury-workspace/treasury-workspace-page.js'],
  ['src/pages/treasury-workspace/tabs/shift-history-tab.tsx', 'src/pages/treasury-workspace/tabs/shift-history-tab.js'],
];

for (const [inRel, outRel] of targets) {
  execSync(
    `npx esbuild "${path.join(root, inRel)}" --bundle=false --format=esm --jsx=automatic --outfile="${path.join(root, outRel)}"`,
    { cwd: root, stdio: 'inherit' },
  );
  console.log('synced', outRel);
}
