import html2canvasPkg from 'html2canvas';
import {
  getReceiptCssWidthPx,
  getReceiptPrintWidthPx,
  getReceiptPrintableWidthMm,
  getReceiptSettings,
  receiptLayoutFromSettings,
  scaledFont,
  type ReceiptSettings,
} from './pos-receipt-settings.js';
import { formatReceiptItemName } from './pos-order-sauces.js';

const html2canvas = (html2canvasPkg as unknown as typeof html2canvasPkg & ((el: HTMLElement, opts?: object) => Promise<HTMLCanvasElement>));
const capture = typeof html2canvas === 'function'
  ? html2canvas
  : (html2canvas as { default: (el: HTMLElement, opts?: object) => Promise<HTMLCanvasElement> }).default;

export { RECEIPT_DPI } from './pos-receipt-settings.js';

export function getReceiptLayout(settings = getReceiptSettings()) {
  return receiptLayoutFromSettings(settings);
}

export const RECEIPT_WIDTH_PX = getReceiptLayout().widthPx;
export const RECEIPT_PAPER_MM = getReceiptLayout().paperMm;
export const RECEIPT_MARGIN_MM = getReceiptLayout().marginMm;
export const RECEIPT_PRINTABLE_MM = getReceiptLayout().printableMm;

function resolveRenderWidth(settings: ReceiptSettings, forPrint: boolean) {
  return forPrint
    ? getReceiptPrintWidthPx(settings.paperWidthMm)
    : getReceiptCssWidthPx(settings.paperWidthMm);
}

/** Aronium-style thermal slip — portrait 80mm */
export function buildReceiptCss(settings: ReceiptSettings, renderWidthPx?: number) {
  const W = renderWidthPx ?? getReceiptPrintWidthPx(settings.paperWidthMm);
  const padMm = settings.marginMm;
  const paperMm = settings.paperWidthMm;
  const fs = (n: number) => scaledFont(n, settings);

  return `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{
    width:${W}px;max-width:${W}px;min-width:0;
    margin:0;padding:0;background:#fff;color:#000;
    font-family:'Segoe UI',Tahoma,Arial,sans-serif;
    font-weight:600;
    direction:rtl;overflow:visible;
    -webkit-print-color-adjust:exact;print-color-adjust:exact;
  }
  .receipt{width:100%;max-width:${W}px;margin:0 auto;padding:${padMm}mm;background:#fff;overflow:visible}
  .slip{width:100%;overflow:visible}

  .rule{border:none;border-top:2px solid #000;margin:8px 0;height:0;width:100%}
  .rule-thin{border-top-width:1px;border-top-style:dashed;border-color:#444;margin:6px 0}

  /* ── kitchen (Aronium) ── */
  .k-num{
    text-align:center;font-size:${fs(settings.fontKitchenNum)}px;
    font-weight:900;line-height:1;letter-spacing:1px;
    margin:4px 0 10px;word-break:break-all;
  }
  .k-label{
    text-align:center;font-size:${fs(settings.fontBody + 6)}px;
    font-weight:800;margin-bottom:6px;
  }
  .k-date{text-align:center;font-size:${fs(settings.fontBody)}px;margin-bottom:4px;color:#000;font-weight:700}
  .k-type{text-align:center;font-size:${fs(settings.fontBody + 2)}px;font-weight:700;margin:6px 0}
  .k-item{
    font-size:${fs(settings.fontKitchenItem)}px;font-weight:800;
    line-height:1.45;padding:6px 0;
    border-bottom:1px dashed #999;word-wrap:break-word;
  }
  .k-item:last-child{border-bottom:none}
  .k-note{font-size:${fs(settings.fontBody - 1)}px;text-align:center;color:#333;margin:4px 0}

  /* ── customer ── */
  .brand{text-align:center;padding:2px 0 8px}
  .brand-name{font-size:${fs(settings.fontStoreName)}px;font-weight:900;line-height:1.2;word-wrap:break-word}
  .brand-sub{font-size:${fs(settings.fontBody)}px;margin-top:4px;color:#000;font-weight:700}

  .meta{font-size:${fs(settings.fontBody - 1)}px;line-height:1.6;font-weight:700}
  .meta-line{margin:3px 0;text-align:center;word-wrap:break-word;word-break:break-word;overflow-wrap:anywhere;white-space:normal;max-width:100%}
  .meta-address{text-align:right;padding:4px 2px;font-weight:600;line-height:1.45}

  .items{width:100%;border-collapse:collapse;table-layout:fixed;font-size:${fs(settings.fontBody)}px;margin:4px 0}
  .items td{padding:5px 0;vertical-align:top;line-height:1.35;word-wrap:break-word}
  .items .qty{width:12%;font-weight:800;text-align:center}
  .items .name{width:53%;font-weight:600;padding-right:4px;overflow-wrap:anywhere;word-break:break-word}
  .items .price{width:35%;font-weight:700;text-align:left;direction:ltr;white-space:nowrap}

  .total-box{
    border:3px solid #000;text-align:center;
    font-size:${fs(settings.fontBody + 4)}px;font-weight:900;
    padding:8px 6px;margin:8px 0;line-height:1.3;
  }
  .total-box .amt{direction:ltr;display:inline-block;margin-right:6px}

  .pay-row{
    display:flex;justify-content:space-between;align-items:center;gap:10px;
    font-size:${fs(settings.fontBody)}px;font-weight:600;margin:3px 0;
    min-width:0;width:100%;
  }
  .pay-row .label{flex:0 0 auto;font-weight:800;min-width:0}
  .pay-row .val{flex:1 1 auto;text-align:left;direction:rtl;font-weight:800;min-width:0;word-wrap:break-word}
  .pay-row .amt{flex:0 0 auto;direction:ltr;white-space:nowrap}

  .pay-box{
    border:2px solid #000;margin:8px 0;padding:8px 10px;
    font-size:${fs(settings.fontBody)}px;line-height:1.45;
  }
  .pay-box .pay-row{margin:5px 0}
  .pay-box .pay-row:first-child{margin-top:0}
  .pay-box .pay-row:last-child{margin-bottom:0}
  .pay-status-paid{font-weight:900}
  .pay-status-unpaid{font-weight:900}

  .foot{text-align:center;font-size:${fs(settings.fontBody - 1)}px;line-height:1.45;margin-top:6px;color:#111;word-wrap:break-word}
  .foot-phone{font-weight:800;font-size:${fs(settings.fontBody + 1)}px;margin-top:4px;direction:ltr}

  @media print{
    @page{size:${paperMm}mm auto;margin:0}
    html,body,.receipt{width:${paperMm}mm;max-width:${paperMm}mm;padding:0;overflow:hidden}
    .receipt{padding:${padMm}mm}
  }
`;
}

export function formatMoney(value: number) {
  return `${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;
}

export function formatReceiptDate(isoOrStr?: string) {
  const d = isoOrStr ? new Date(isoOrStr) : new Date();
  if (Number.isNaN(d.getTime())) return isoOrStr ?? '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy}  ${hh}:${mi}`;
}

function padInvoiceNumber(orderNumber: string) {
  const digits = orderNumber.replace(/\D/g, '');
  return (digits || orderNumber).padStart(6, '0').slice(-6);
}

/** تنسيق Aronium: 2606-049 */
function kitchenDisplayNumber(orderNumber: string) {
  const m = orderNumber.match(/(\d{6})-(\d+)$/i);
  if (m) {
    const ym = m[1];
    if (!ym) return padInvoiceNumber(orderNumber);
    const seq = String(Number(m[2])).padStart(3, '0');
    return `${ym.slice(2)}-${seq}`;
  }
  return padInvoiceNumber(orderNumber);
}

function formatOrderTypeLabel(orderType: string) {
  if (orderType.includes('تيك') || orderType.toLowerCase().includes('takeaway')) return 'تيك أواي';
  if (orderType.includes('توصيل') || orderType.toLowerCase().includes('delivery')) return 'توصيل';
  return 'محلي';
}

/** يظهر نوع الطلب في الفاتورة فقط للتيك أواي والتوصيل */
function shouldShowOrderTypeLabel(orderType: string) {
  const label = formatOrderTypeLabel(orderType);
  return label !== 'محلي';
}

/** تسمية طريقة الدفع للفاتورة */
export function formatReceiptPaymentMethod(method: string): string {
  const raw = method.trim();
  if (!raw) return '—';
  const m = raw.toLowerCase();
  if (/cash|نقد|كاش/.test(m)) return 'نقدي';
  if (/insta|انست/.test(m)) return 'انستاباي';
  if (/wallet|محفظ/.test(m)) return 'محفظة';
  if (/card|فيز|visa|master|بطاق|شبك/.test(m)) return 'بطاقة';
  if (/mixed|مخت/.test(m)) return 'مختلط';
  return raw;
}

export function formatReceiptPaymentStatus(isPaid: boolean): string {
  return isPaid ? 'مدفوع' : 'غير مدفوع';
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapReceiptDocument(body: string, settings: ReceiptSettings, forPrint = true) {
  const W = resolveRenderWidth(settings, forPrint);
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=${W},initial-scale=1"><style>${buildReceiptCss(settings, W)}</style></head><body>${body}</body></html>`;
}

export type CustomerReceiptInput = {
  storeName: string;
  storeSubtitle?: string;
  storeFooter?: string;
  storePhone?: string;
  orderNumber: string;
  cashierName: string;
  paymentMethod: string;
  isPaid?: boolean;
  orderType: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  captainName?: string;
  items: Array<{ name: string; quantity: number; unitPrice: number; lineTotal: number; note?: string; sauces?: string[] }>;
  discount: number;
  total: number;
  note?: string;
  createdAt: string;
};

export type KitchenReceiptInput = {
  orderNumber: string;
  shiftNumber?: string;
  cashierName: string;
  orderType: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  captainName?: string;
  items: Array<{ name: string; quantity: number; note?: string }>;
  note?: string;
  createdAt: string;
};

export function buildCustomerReceiptHtml(data: CustomerReceiptInput, settings = getReceiptSettings(), forPrint = true): string {
  const invoiceNo = padInvoiceNumber(data.orderNumber);
  const subtitle = data.storeSubtitle ?? settings.storeSubtitle;

  const itemRows = data.items.map((item) => {
    const displayName = formatReceiptItemName(item.name, item.note ?? '', item.sauces, { includeSauces: false });
    return `<tr>
      <td class="qty">${item.quantity}×</td>
      <td class="name">${escapeHtml(displayName)}</td>
      <td class="price">${formatMoney(item.lineTotal)}</td>
    </tr>`;
  }).join('');

  const pmLabel = formatReceiptPaymentMethod(data.paymentMethod);
  const paid = data.isPaid !== false;
  const statusLabel = formatReceiptPaymentStatus(paid);

  const body = `
    <div class="receipt"><div class="slip">
      <header class="brand">
        <div class="brand-name">${escapeHtml(data.storeName)}</div>
        ${subtitle ? `<div class="brand-sub">${escapeHtml(subtitle)}</div>` : ''}
      </header>
      <hr class="rule">
      <section class="meta">
        <div class="meta-line">فاتورة #${invoiceNo}</div>
        <div class="meta-line">${formatReceiptDate(data.createdAt)}</div>
        <div class="meta-line">كاشير: ${escapeHtml(data.cashierName)}${shouldShowOrderTypeLabel(data.orderType) ? ` · ${formatOrderTypeLabel(data.orderType)}` : ''}</div>
        ${data.customerName ? `<div class="meta-line">العميل: ${escapeHtml(data.customerName)}</div>` : ''}
        ${data.customerPhone ? `<div class="meta-line" style="direction:ltr">${escapeHtml(data.customerPhone)}</div>` : ''}
        ${data.customerAddress ? `<div class="meta-line meta-address">العنوان: ${escapeHtml(data.customerAddress.trim())}</div>` : ''}
        ${data.captainName ? `<div class="meta-line">كابتن: ${escapeHtml(data.captainName)}</div>` : ''}
      </section>
      <hr class="rule rule-thin">
      <table class="items"><tbody>${itemRows}</tbody></table>
      <hr class="rule rule-thin">
      ${data.discount > 0 ? `<div class="pay-row"><span>خصم</span><span class="amt">${formatMoney(data.discount)}</span></div>` : ''}
      <div class="total-box">الإجمالي <span class="amt">${formatMoney(data.total)}</span></div>
      <div class="pay-box">
        <div class="pay-row"><span class="label">الحالة</span><span class="val ${paid ? 'pay-status-paid' : 'pay-status-unpaid'}">${statusLabel}</span></div>
        <div class="pay-row"><span class="label">الدفع</span><span class="val">${escapeHtml(pmLabel)}</span></div>
      </div>
      ${data.note ? `<div class="meta-line" style="margin-top:6px">ملاحظة: ${escapeHtml(data.note)}</div>` : ''}
      <hr class="rule">
      <footer class="foot">
        ${data.storeFooter ? `<div>${escapeHtml(data.storeFooter)}</div>` : ''}
        ${data.storePhone ? `<div class="foot-phone">${escapeHtml(data.storePhone)}</div>` : ''}
        <div style="margin-top:6px">شكراً لزيارتكم</div>
      </footer>
    </div></div>`;

  return wrapReceiptDocument(body, settings, forPrint);
}

export function buildKitchenReceiptHtml(data: KitchenReceiptInput, settings = getReceiptSettings(), forPrint = true): string {
  const orderNo = kitchenDisplayNumber(data.orderNumber);
  const items = data.items.map((item) => {
    const note = item.note?.trim();
    const displayName = note ? `${item.name} (${note})` : item.name;
    return `<div class="k-item">${item.quantity} &nbsp; ${escapeHtml(displayName)}</div>`;
  }).join('');

  const body = `
    <div class="receipt"><div class="slip">
      <div class="k-num">${escapeHtml(orderNo)}</div>
      <div class="k-label">مطبخ</div>
      <div class="k-date">${formatReceiptDate(data.createdAt)}</div>
      ${shouldShowOrderTypeLabel(data.orderType) ? `<div class="k-type">${formatOrderTypeLabel(data.orderType)}</div>` : ''}
      ${data.customerName ? `<div class="k-note">العميل: ${escapeHtml(data.customerName)}</div>` : ''}
      ${data.customerPhone ? `<div class="k-note" style="direction:ltr">${escapeHtml(data.customerPhone)}</div>` : ''}
      ${data.customerAddress ? `<div class="k-note meta-address">العنوان: ${escapeHtml(data.customerAddress.trim())}</div>` : ''}
      ${data.captainName ? `<div class="k-note">كابتن: ${escapeHtml(data.captainName)}</div>` : ''}
      <hr class="rule">
      ${items}
      ${data.note ? `<div class="k-note" style="margin-top:8px">ملاحظة: ${escapeHtml(data.note)}</div>` : ''}
      <hr class="rule">
    </div></div>`;

  return wrapReceiptDocument(body, settings, forPrint);
}

function normalizeCanvasToWidth(source: HTMLCanvasElement, targetWidth: number): HTMLCanvasElement {
  if (source.width === targetWidth) return source;
  const targetHeight = Math.max(1, Math.round((source.height * targetWidth) / source.width));
  const out = document.createElement('canvas');
  out.width = targetWidth;
  out.height = targetHeight;
  const ctx = out.getContext('2d');
  if (!ctx) return source;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.imageSmoothingEnabled = source.width > targetWidth;
  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
  return out;
}

export async function renderHtmlToPng(
  fullHtml: string,
  settings = getReceiptSettings(),
): Promise<{ base64: string; heightPx: number; widthPx: number; paperWidthMm: number } | null> {
  const cssWidthPx = getReceiptCssWidthPx(settings.paperWidthMm);
  const printWidthPx = getReceiptPrintWidthPx(settings.paperWidthMm);
  const printableWidthMm = getReceiptPrintableWidthMm(settings.paperWidthMm);
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'receipt-render');
  iframe.style.cssText = `position:fixed;left:-9999px;top:0;width:${cssWidthPx}px;max-width:${cssWidthPx}px;height:auto;border:0;visibility:hidden;overflow:visible;`;
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return null;
  }

  doc.open();
  doc.write(fullHtml);
  doc.close();

  await new Promise<void>((resolve) => {
    const done = () => resolve();
    if (iframe.contentWindow?.document?.readyState === 'complete') {
      requestAnimationFrame(() => setTimeout(done, 80));
      return;
    }
    iframe.onload = () => requestAnimationFrame(() => setTimeout(done, 80));
    setTimeout(done, 200);
  });

  const slipEl = doc.querySelector('.slip') as HTMLElement | null;
  const target = slipEl ?? doc.querySelector('.receipt') ?? doc.body;
  if (!target) {
    document.body.removeChild(iframe);
    return null;
  }

  const contentHeight = Math.max(target.scrollHeight, target.offsetHeight, 120);
  const heightPad = 48;
  iframe.style.height = `${contentHeight + heightPad}px`;

  const captureScale = 1;
  try {
    const rawCanvas = await capture(target, {
      backgroundColor: '#ffffff',
      scale: captureScale,
      width: cssWidthPx,
      windowWidth: cssWidthPx,
      height: contentHeight + heightPad,
      windowHeight: contentHeight + heightPad,
      scrollX: 0,
      scrollY: 0,
      useCORS: true,
      logging: false,
    });

    const canvas = normalizeCanvasToWidth(rawCanvas, printWidthPx);
    const base64 = canvas.toDataURL('image/png').split(',')[1] ?? '';
    if (!base64) return null;

    return {
      base64,
      heightPx: canvas.height,
      widthPx: printWidthPx,
      paperWidthMm: printableWidthMm,
    };
  } finally {
    document.body.removeChild(iframe);
  }
}

export async function renderCustomerReceiptPng(data: CustomerReceiptInput, settings = getReceiptSettings()) {
  return renderHtmlToPng(buildCustomerReceiptHtml(data, settings, false), settings);
}

export async function renderKitchenReceiptPng(data: KitchenReceiptInput, settings = getReceiptSettings()) {
  return renderHtmlToPng(buildKitchenReceiptHtml(data, settings, false), settings);
}

/** @deprecated */
export function formatReceiptDateTime(isoOrStr?: string) {
  return formatReceiptDate(isoOrStr);
}

/** @deprecated */
export function formatKitchenDateTime(isoOrStr?: string) {
  return formatReceiptDate(isoOrStr);
}
