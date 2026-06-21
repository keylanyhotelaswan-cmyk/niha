import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startPrintBridge, stopPrintBridge, waitForPrintBridge } from '../apps/desktop/electron/bridge-lifecycle.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const webDist = join(repoRoot, 'apps/web/dist');
const unpackedExe = join(repoRoot, 'dist/desktop/win-unpacked/Niha.exe');
const setupExe = join(repoRoot, 'dist/desktop/Niha Setup 0.1.0.exe');
const apiHealthUrl =
  process.env.NIHA_API_HEALTH_URL ?? 'https://niha-jxjq.onrender.com/api/health';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchWithRetry(url, { attempts = 4, timeoutMs = 25000 } = {}) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      return res;
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }
  throw lastError;
}

async function verifyApiHealth() {
  const res = await fetchWithRetry(apiHealthUrl);
  const data = await res.json();
  assert(res.ok && data?.status === 'ok', `API health failed: ${apiHealthUrl}`);
  console.log('✅ Cloud API health OK');
}

async function verifyPrintBridge() {
  startPrintBridge();
  const ready = await waitForPrintBridge(15000);
  assert(ready, 'Print Bridge did not start on 127.0.0.1:9321');

  const port = process.env.NIHA_PRINT_PORT ?? '9321';
  const printersRes = await fetch(`http://127.0.0.1:${port}/printers`, {
    signal: AbortSignal.timeout(10000),
  });
  const printersData = await printersRes.json();
  assert(printersRes.ok && printersData?.ok, 'Print Bridge /printers failed');

  const names = (printersData.printers ?? []).map((p) => p.name ?? p);
  console.log(`✅ Print Bridge OK — ${names.length} printer(s) detected`);
  if (names.length) {
    console.log('   ', names.join(', '));
  }

  const testPrinter = process.env.NIHA_TEST_PRINTER?.trim();
  if (testPrinter) {
    const testPng =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const printRes = await fetch(`http://127.0.0.1:${port}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        printer: testPrinter,
        jobs: [{ pngBase64: testPng, pngWidthPx: 576, pngHeightPx: 32, paperWidthMm: 80 }],
      }),
      signal: AbortSignal.timeout(60000),
    });
    const printData = await printRes.json();
    if (printRes.ok && printData?.ok) {
      console.log(`✅ Silent print test OK → ${testPrinter}`);
    } else {
      console.warn(`⚠️ Silent print test failed → ${testPrinter}: ${printData?.message ?? printRes.status}`);
      console.warn('   Bridge/API path OK — check printer power, USB, and driver if hardware did not print.');
    }
  } else {
    console.log('ℹ️ Set NIHA_TEST_PRINTER=XP-80C to attempt a physical silent print test');
  }

  stopPrintBridge();
}

async function main() {
  assert(existsSync(webDist), `Missing web build: ${webDist} — run npm run build:desktop`);
  console.log('✅ Desktop web build present');

  if (existsSync(unpackedExe)) {
    console.log('✅ Packaged app present:', unpackedExe);
  } else {
    console.log('ℹ️ Unpacked app not built — run npm run pack:desktop:dir');
  }

  if (existsSync(setupExe)) {
    console.log('✅ NSIS installer present:', setupExe);
  }

  await verifyPrintBridge();
  await verifyApiHealth();
  console.log('\nDesktop hybrid stack verified.');
}

main().catch((err) => {
  console.error('❌', err.message ?? err);
  process.exit(1);
});
