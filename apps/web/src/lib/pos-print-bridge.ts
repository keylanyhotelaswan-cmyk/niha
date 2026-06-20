import { DEFAULT_PRINTER_NAME, readSavedPrinterName } from './pos-receipt.js';
import { getReceiptSettings, getReceiptPrintWidthPx } from './pos-receipt-settings.js';

export const PRINT_BRIDGE_URL = 'http://127.0.0.1:9321';

export type BridgePrintJob = {
  pngBase64: string;
  pngHeightPx: number;
  pngWidthPx?: number;
  paperWidthMm?: number;
  paperOrientation?: 'portrait' | 'landscape';
  paperSize?: string;
  label?: string;
};

export type BridgePrintResult =
  | { ok: true; printer: string; count: number }
  | { ok: false; reason: 'bridge-offline' | 'no-printer' | 'print-failed'; message: string };

export async function isPrintBridgeOnline(): Promise<boolean> {
  try {
    const res = await fetch(`${PRINT_BRIDGE_URL}/health`, { signal: AbortSignal.timeout(1200) });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data?.ok);
  } catch {
    return false;
  }
}

export async function listBridgePrinters(): Promise<string[]> {
  try {
    const res = await fetch(`${PRINT_BRIDGE_URL}/printers`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.printers) ? data.printers : [];
  } catch {
    return [];
  }
}

export async function bridgePrintJobs(jobs: BridgePrintJob[]): Promise<BridgePrintResult> {
  const printer = readSavedPrinterName() || DEFAULT_PRINTER_NAME;
  const defaults = getReceiptSettings();
  const valid = jobs.filter((j) => j.pngBase64?.trim());

  if (!valid.length) {
    return { ok: false, reason: 'print-failed', message: 'لا توجد صور للطباعة' };
  }

  const online = await isPrintBridgeOnline();
  if (!online) {
    return {
      ok: false,
      reason: 'bridge-offline',
      message: 'Niha Print Bridge غير شغّال — شغّله من: npm run dev:print-bridge',
    };
  }

  try {
    const res = await fetch(`${PRINT_BRIDGE_URL}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        printer,
        jobs: valid.map((j) => ({
          pngBase64: j.pngBase64,
          pngHeightPx: j.pngHeightPx,
          pngWidthPx: j.pngWidthPx ?? getReceiptPrintWidthPx(defaults.paperWidthMm),
          paperWidthMm: j.paperWidthMm ?? defaults.paperWidthMm,
          paperOrientation: 'portrait',
          paperSize: j.paperSize ?? defaults.paperSize,
        })),
      }),
      signal: AbortSignal.timeout(60000),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        reason: 'print-failed',
        message: data.message ?? `فشل الطباعة على «${printer}»`,
      };
    }

    return { ok: true, printer, count: data.count ?? valid.length };
  } catch (err) {
    return {
      ok: false,
      reason: 'print-failed',
      message: err instanceof Error ? err.message : `فشل الطباعة على «${printer}»`,
    };
  }
}
