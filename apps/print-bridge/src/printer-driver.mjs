import { listPrinters } from './printers.mjs';
import { sendRawToPrinter } from './win-raw-print.mjs';

/** @type {string[]} */
let cachedNames = [];
let cacheAt = 0;
const CACHE_MS = 30_000;

async function refreshCache() {
  const now = Date.now();
  if (cachedNames.length && now - cacheAt < CACHE_MS) return cachedNames;
  cachedNames = await listPrinters();
  cacheAt = now;
  return cachedNames;
}

export async function warmPrinterDriverCache() {
  return refreshCache();
}

/**
 * Driver compatible with node-thermal-printer Windows interface.
 * getPrinters/getPrinter are sync — uses a warmed cache.
 */
export function createWindowsPrinterDriver() {
  return {
    getPrinters() {
      return cachedNames.map((name) => ({ name, attributes: ['RAW-ONLY'] }));
    },
    getPrinter(name) {
      const found = cachedNames.find((p) => p === name);
      if (!found) return null;
      return { name: found, status: 'IDLE' };
    },
    printDirect({ data, printer, success, error }) {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
      sendRawToPrinter(printer, buf)
        .then(() => success?.('ok'))
        .catch((err) => error?.(err instanceof Error ? err : new Error(String(err))));
    },
  };
}
