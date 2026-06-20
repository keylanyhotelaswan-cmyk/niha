import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import PDFDocument from 'pdfkit';
import pdfPrinter from 'pdf-to-printer';

const { print } = pdfPrinter;

const MM_TO_PT = 72 / 25.4;
/** 576px @ 203 DPI = 80mm */
const DEFAULT_WIDTH_PX = 576;
const MIN_PAGE_HEIGHT_MM = 12;

function mmToPt(mm) {
  return Number(mm) * MM_TO_PT;
}

/**
 * لا نمرّر paperSize افتراضياً — اسم "80(72.1) x 297 mm" يجعل Windows يطبّع بالعرض
 * ويضع فاتورتين جنب بعض. نعتمد على أبعاد PDF فقط.
 * لتفعيل paperSize يدوياً: NIHA_USE_PAPER_SIZE=1 و NIHA_PAPER_SIZE=...
 */
function resolveThermalPaperSize(paperWidthMm, explicit) {
  if (process.env.NIHA_USE_PAPER_SIZE !== '1') return undefined;
  if (explicit?.trim()) return explicit.trim();
  const fromEnv = process.env.NIHA_PAPER_SIZE?.trim();
  return fromEnv || undefined;
}

export async function printPngBase64(
  printerName,
  base64,
  heightPx = 800,
  widthPx = DEFAULT_WIDTH_PX,
  paperWidthMm = 80,
  _orientation = 'portrait',
  paperSize = undefined,
) {
  if (!printerName?.trim()) throw new Error('printer-name-required');
  if (!base64?.trim()) throw new Error('png-required');

  const pngBuffer = Buffer.from(base64, 'base64');
  const imgWidthPx = Math.max(1, Number(widthPx) || DEFAULT_WIDTH_PX);
  const imgHeightPx = Math.max(1, Number(heightPx) || 800);
  const paperWmm = Math.max(40, Number(paperWidthMm) || 80);

  const contentHeightMm = Math.max(MIN_PAGE_HEIGHT_MM, (imgHeightPx / imgWidthPx) * paperWmm);
  const pageWidthPt = mmToPt(paperWmm);
  const contentHeightPt = mmToPt(contentHeightMm);
  const pageHeightPt = Math.max(contentHeightPt + 1, pageWidthPt + 1);

  if (process.env.NIHA_PRINT_DEBUG === '1') {
    console.log('[print-bridge] thermal portrait', {
      paperWmm,
      contentHeightMm: contentHeightMm.toFixed(1),
      pageWidthPt: pageWidthPt.toFixed(1),
      pageHeightPt: pageHeightPt.toFixed(1),
      imgWidthPx,
      imgHeightPx,
      aspect: (imgHeightPx / imgWidthPx).toFixed(2),
    });
    const dbgPath = path.join(os.tmpdir(), `niha-debug-${Date.now()}.png`);
    await fs.writeFile(dbgPath, pngBuffer).catch(() => {});
    console.log('[print-bridge] debug PNG saved:', dbgPath);
  }

  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tmpDir = os.tmpdir();
  const pngPath = path.join(tmpDir, `niha-${stamp}.png`);
  const pdfPath = path.join(tmpDir, `niha-${stamp}.pdf`);

  await fs.writeFile(pngPath, pngBuffer);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [pageWidthPt, pageHeightPt],
      margin: 0,
      autoFirstPage: true,
    });
    const stream = createWriteStream(pdfPath);
    doc.pipe(stream);
    doc.image(pngPath, 0, 0, { width: pageWidthPt, height: contentHeightPt });
    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.on('error', reject);
  });

  const printOptions = {
    printer: printerName.trim(),
    silent: true,
    scale: 'noscale',
  };

  const sizeName = resolveThermalPaperSize(paperWmm, paperSize);
  if (sizeName) {
    printOptions.paperSize = sizeName;
  }

  try {
    await print(pdfPath, printOptions);
  } finally {
    await fs.unlink(pngPath).catch(() => {});
    await fs.unlink(pdfPath).catch(() => {});
  }
}
