import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');

/** @type {import('node:child_process').ChildProcess | null} */
let bridgeProcess = null;

/**
 * @param {{ entry?: string, cwd?: string, port?: string }} [options]
 */
export function startPrintBridge(options = {}) {
  if (bridgeProcess) return bridgeProcess;

  const entry = options.entry ?? join(repoRoot, 'apps/print-bridge/src/server.mjs');
  const cwd = options.cwd ?? join(repoRoot, 'apps/print-bridge');
  const port = options.port ?? process.env.NIHA_PRINT_PORT ?? '9321';

  bridgeProcess = spawn(process.execPath, [entry], {
    cwd,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NIHA_PRINT_PORT: port,
    },
    stdio: 'inherit',
    windowsHide: true,
  });

  bridgeProcess.on('exit', () => {
    bridgeProcess = null;
  });

  return bridgeProcess;
}

export function stopPrintBridge() {
  if (!bridgeProcess) return;
  bridgeProcess.kill();
  bridgeProcess = null;
}

export async function waitForPrintBridge(timeoutMs = 15000, port = process.env.NIHA_PRINT_PORT ?? '9321') {
  const url = `http://127.0.0.1:${port}/health`;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(800) });
      if (res.ok) {
        const data = await res.json();
        if (data?.ok) return true;
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  return false;
}

export { repoRoot };
