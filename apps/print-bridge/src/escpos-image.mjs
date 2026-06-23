import { ThermalPrinter, PrinterTypes } from 'node-thermal-printer';
import { resolvePrinterName } from './print.mjs';
import { createWindowsPrinterDriver, warmPrinterDriverCache } from './printer-driver.mjs';

const JOB_GAP_MS = 350;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function createPrinter(printerName, settings = {}) {
  await warmPrinterDriverCache();
  const resolved = await resolvePrinterName(printerName);
  const width = Number(settings.paperWidthMm) >= 78 ? 42 : 32;
  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: `printer:${resolved}`,
    driver: createWindowsPrinterDriver(),
    width,
    removeSpecialCharacters: false,
    options: { timeout: 15000 },
  });
  return { printer, resolved };
}

/**
 * طباعة فاتورة كصورة PNG عبر أوامر ESC/POS raster — عربي صحيح بدون PDF.
 * @param {string} printerName
 * @param {Array<{ pngBase64: string }>} jobs
 * @param {Record<string, unknown>} [settings]
 */
export async function printEscPosImageJobs(printerName, jobs, settings = {}) {
  if (!jobs?.length) throw new Error('لا توجد مهام طباعة');

  let resolvedPrinter = '';
  for (let i = 0; i < jobs.length; i += 1) {
    const b64 = String(jobs[i]?.pngBase64 ?? '').trim();
    if (!b64) throw new Error('صورة الطباعة مطلوبة');

    const { printer, resolved } = await createPrinter(
      i === 0 ? printerName : resolvedPrinter || printerName,
      settings,
    );
    resolvedPrinter = resolved;

    const buffer = Buffer.from(b64, 'base64');
    printer.alignCenter();
    await printer.printImageBuffer(buffer);
    printer.cut({ verticalTabAmount: 3 });
    await printer.execute();

    if (i < jobs.length - 1) await sleep(JOB_GAP_MS);
  }

  return { printer: resolvedPrinter, count: jobs.length };
}
