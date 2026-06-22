import { getReceiptCssWidthPx, getReceiptSettings } from './pos-receipt-settings.js';
import { buildReceiptCss, renderHtmlToPng } from './pos-receipt-render.js';
import {
  formatShiftDuration,
  formatShiftMoney,
  formatShiftOpenedAt,
  shiftCollectionRows,
  type ShiftSummaryLike,
} from './shift-summary-utils.js';

export type ShiftSummaryPrintParams = {
  title?: string | undefined;
  shiftNumber?: string | undefined;
  cashierName?: string | undefined;
  openedAt?: string | Date | undefined;
  closedAt?: string | Date | undefined;
  summary: ShiftSummaryLike | null | undefined;
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** نفس عرض CSS للفاتورة (280px) — لا نستخدم 576px وإلا يُقصّ النص */
function wrapThermalDocument(body: string) {
  const settings = getReceiptSettings();
  const W = getReceiptCssWidthPx(settings.paperWidthMm);
  const extraCss = `
    .shift-slip{padding-top:10px;padding-bottom:12px}
    .shift-slip .brand{padding-top:6px}
    .shift-slip .meta-line{line-height:1.45;padding:2px 4px}
    .shift-slip .pay-box .pay-row{margin:4px 0}
    .shift-slip .pay-row .label{max-width:58%;overflow-wrap:anywhere;word-break:break-word}
    .shift-slip .pay-row .amt{white-space:nowrap;font-size:0.95em}
  `;
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=${W},initial-scale=1"><style>${buildReceiptCss(settings, W)}${extraCss}</style></head><body>${body}</body></html>`;
}

function metaLine(text: string) {
  return `<div class="meta-line">${escapeHtml(text)}</div>`;
}

function buildUncollectedSection(summary: ShiftSummaryLike | null | undefined) {
  const count = Number(summary?.uncollectedCount ?? 0);
  const total = Number(summary?.uncollectedTotal ?? 0);
  const orders = summary?.uncollectedOrders ?? [];
  if (count <= 0 && total <= 0) return '';

  const header = metaLine(`غير محصّل: ${count} طلب · ${formatShiftMoney(total)}`);
  const lines = orders.slice(0, 20).map((o) => {
    const name = o.customerName?.trim();
    const label = name ? `#${o.orderNumber} · ${name}` : `#${o.orderNumber}`;
    return metaLine(`${label} — ${formatShiftMoney(o.total)}`);
  }).join('');
  const more = count > orders.length
    ? metaLine(`... و${count - orders.length} طلب آخر`)
    : '';

  return `<hr class="rule rule-thin">${header}${lines}${more}`;
}

function payRow(label: string, value: string) {
  return `<div class="pay-row"><span class="label">${escapeHtml(label)}</span><span class="amt">${escapeHtml(value)}</span></div>`;
}

export function buildShiftSummaryThermalHtml(params: ShiftSummaryPrintParams) {
  const { summary } = params;
  const rows = shiftCollectionRows(summary);
  const salesTotal = Number(summary?.totalSales ?? summary?.salesTotal ?? 0);
  const expenses = Number(summary?.expensesTotal ?? summary?.outgoing ?? 0);
  const expected = Number(summary?.expectedCash ?? 0);
  const opening = Number(summary?.openingFloat ?? 0);
  const pendingCash = Number(summary?.pendingCashInCustody ?? summary?.pending ?? 0);
  const title = params.title ?? 'ملخص الوردية';

  const collectionLines = rows
    .filter((r) => r.total > 0 || r.method === 'CASH')
    .map((r) => {
      const lines = [payRow(r.label, formatShiftMoney(r.total))];
      if (r.approved > 0 && r.pending > 0) {
        lines.push(`<div class="meta-line" style="font-size:0.9em;color:#333">معتمد ${escapeHtml(formatShiftMoney(r.approved))}</div>`);
      }
      if (r.pending > 0) {
        lines.push(`<div class="meta-line" style="font-size:0.9em;color:#333">معلق ${escapeHtml(formatShiftMoney(r.pending))}</div>`);
      }
      return lines.join('');
    })
    .join('');

  const body = `
    <div class="receipt"><div class="slip shift-slip">
      <header class="brand">
        <div class="brand-name">${escapeHtml(title)}</div>
        ${params.shiftNumber ? `<div class="brand-sub">${escapeHtml(params.shiftNumber)}</div>` : ''}
      </header>
      <section class="meta">
        ${metaLine(new Date().toLocaleString('ar-EG'))}
        ${params.cashierName ? metaLine(`كاشير: ${params.cashierName}`) : ''}
        ${params.openedAt ? metaLine(`فتح: ${formatShiftOpenedAt(params.openedAt)}`) : ''}
        ${params.openedAt ? metaLine(`مدة: ${formatShiftDuration(params.openedAt)}`) : ''}
        ${params.closedAt ? metaLine(`إغلاق: ${new Date(params.closedAt).toLocaleString('ar-EG')}`) : ''}
        ${summary?.ordersCount != null ? metaLine(`طلبات مغلقة: ${summary.ordersCount}`) : ''}
      </section>
      <hr class="rule rule-thin">
      <div class="pay-box">
        ${payRow('رصيد الافتتاح', formatShiftMoney(opening))}
        ${payRow('إجمالي المبيعات', formatShiftMoney(salesTotal))}
        ${collectionLines}
        ${payRow('مصروفات', formatShiftMoney(expenses))}
        ${payRow('نقدي معلق', formatShiftMoney(pendingCash))}
      </div>
      ${buildUncollectedSection(summary)}
      <div class="total-box">النقدي في الدرج <span class="amt">${formatShiftMoney(expected)}</span></div>
      <footer class="foot"><div>Niha</div></footer>
    </div></div>`;

  return wrapThermalDocument(body);
}

export type ShiftSummaryPrintResult =
  | { ok: true; method: 'bridge' | 'qz'; printer: string }
  | { ok: false; message: string; reason?: string };

export async function printShiftSummary(params: ShiftSummaryPrintParams): Promise<ShiftSummaryPrintResult> {
  const html = buildShiftSummaryThermalHtml(params);
  const settings = getReceiptSettings();
  const png = await renderHtmlToPng(html, settings);
  if (!png?.base64) {
    return { ok: false, message: 'فشل تجهيز ملخص الوردية للطباعة', reason: 'render-failed' };
  }

  const job = {
    pngBase64: png.base64,
    pngHeightPx: png.heightPx,
    pngWidthPx: png.widthPx,
    paperWidthMm: png.paperWidthMm,
    label: 'shift-summary',
  };

  const { bridgePrintJobs } = await import('./pos-print-bridge.js');
  const bridgeResult = await bridgePrintJobs([job]);
  if (bridgeResult.ok) {
    return { ok: true, method: 'bridge', printer: bridgeResult.printer };
  }

  if (bridgeResult.reason !== 'bridge-offline') {
    return { ok: false, message: bridgeResult.message, reason: bridgeResult.reason };
  }

  const { silentPrintReceipts } = await import('./pos-qz-print.js');
  const qzResult = await silentPrintReceipts([{ html, pngBase64: png.base64, pngHeightPx: png.heightPx }]);
  if (qzResult.ok) {
    return { ok: true, method: 'qz', printer: qzResult.printer };
  }

  return { ok: false, message: qzResult.message, reason: qzResult.reason };
}

/** فتح معاينة في نافذة — بدون طباعة تلقائية */
export function openShiftSummaryPreviewWindow(params: ShiftSummaryPrintParams) {
  const html = buildShiftSummaryThermalHtml(params);
  const w = window.open('', '_blank', 'width=420,height=720');
  if (!w) return false;
  w.document.write(`${html}<script>document.title='ملخص الوردية';</script>`);
  w.document.close();
  return true;
}
