export const AUTO_PRINT_KEY = 'niha-pos-auto-print';
export const PRINTER_NAME_KEY = 'niha-pos-printer-name';
export const DEFAULT_PRINTER_NAME = 'XP-80C (copy 3)';

export type ReceiptLine = {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  note?: string;
};

export type ReceiptData = {
  storeName: string;
  storeSubtitle?: string;
  storeFooter?: string;
  storePhone?: string;
  orderNumber: string;
  shiftNumber?: string;
  orderType: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  captainName?: string;
  cashierName: string;
  paymentMethod: string;
  isPaid?: boolean;
  items: ReceiptLine[];
  subtotal: number;
  discount: number;
  total: number;
  note?: string;
  createdAt: string;
};

export type KitchenReceiptData = {
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

import { getReceiptSettings, saveReceiptSettings as persistReceiptSettings } from './pos-receipt-settings.js';

export {
  buildCustomerReceiptHtml,
  buildKitchenReceiptHtml,
  buildCustomerReceiptHtml as buildReceiptHtml,
  buildReceiptCss,
  renderCustomerReceiptPng,
  renderKitchenReceiptPng,
  getReceiptLayout,
} from './pos-receipt-render.js';

export {
  getReceiptSettings,
  saveReceiptSettings,
  resetReceiptSettings,
  getStoreBranding,
  sampleReceiptData,
  receiptLayoutFromSettings,
  DEFAULT_RECEIPT_SETTINGS,
  RECEIPT_SETTINGS_EVENT,
  RECEIPT_CSS_WIDTH_PX,
  getReceiptPrintWidthPx,
  type ReceiptPrintCopies,
} from './pos-receipt-settings.js';

export type { ReceiptSettings };

export function isAutoPrintEnabled(): boolean {
  return getReceiptSettings().autoPrint;
}

export function setAutoPrintEnabled(enabled: boolean) {
  localStorage.setItem(AUTO_PRINT_KEY, enabled ? 'true' : 'false');
  persistReceiptSettings({ ...getReceiptSettings(), autoPrint: enabled });
}

export function readSavedPrinterName(): string {
  try {
    const fromSettings = getReceiptSettings().printerName?.trim();
    if (fromSettings) return fromSettings;
    return localStorage.getItem(PRINTER_NAME_KEY)?.trim() || DEFAULT_PRINTER_NAME;
  } catch {
    return DEFAULT_PRINTER_NAME;
  }
}

export function savePrinterName(name: string) {
  try {
    const trimmed = name.trim();
    if (trimmed) localStorage.setItem(PRINTER_NAME_KEY, trimmed);
    else localStorage.removeItem(PRINTER_NAME_KEY);
    persistReceiptSettings({ ...getReceiptSettings(), printerName: trimmed || DEFAULT_PRINTER_NAME });
  } catch {
    /* ignore */
  }
}

export function kitchenFromReceipt(data: ReceiptData): KitchenReceiptData {
  return {
    orderNumber: data.orderNumber,
    cashierName: data.cashierName,
    orderType: data.orderType,
    ...(data.shiftNumber ? { shiftNumber: data.shiftNumber } : {}),
    ...(data.customerName ? { customerName: data.customerName } : {}),
    ...(data.customerPhone ? { customerPhone: data.customerPhone } : {}),
    ...(data.customerAddress ? { customerAddress: data.customerAddress } : {}),
    ...(data.captainName ? { captainName: data.captainName } : {}),
    items: data.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      ...(i.note ? { note: i.note } : {}),
    })),
    ...(data.note ? { note: data.note } : {}),
    createdAt: data.createdAt,
  };
}

export type PrintCopies = 'customer' | 'kitchen' | 'both';

export function buildReceiptFromSavedOrder(
  order: {
    code: string;
    orderType: 'eat-in' | 'takeaway';
    total: number;
    ownerName: string;
    customerPhone?: string;
    customerAddress?: string;
    captainName?: string;
    discountAmount: string;
    orderNote: string;
    items: Array<{ name: string; unitPrice: number; quantity: number; note?: string }>;
    createdAt: string;
    collectionStatus?: 'approved' | 'uncollected' | 'pending_approval';
  },
  opts: {
    storeName: string;
    storeSubtitle?: string;
    storeFooter?: string;
    storePhone?: string;
    cashierName: string;
    paymentMethodLabel: string;
    shiftNumber?: string;
    isPaid?: boolean;
  },
): ReceiptData {
  const subtotal = order.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const discount = Math.max(0, Number(order.discountAmount) || 0);
  const isPaid = opts.isPaid ?? (order.collectionStatus !== 'uncollected');
  return {
    storeName: opts.storeName,
    ...(opts.storeSubtitle ? { storeSubtitle: opts.storeSubtitle } : {}),
    ...(opts.storeFooter ? { storeFooter: opts.storeFooter } : {}),
    ...(opts.storePhone ? { storePhone: opts.storePhone } : {}),
    orderNumber: order.code,
    ...(opts.shiftNumber ? { shiftNumber: opts.shiftNumber } : {}),
    orderType: order.orderType === 'eat-in' ? 'محلي' : 'تيك أواي',
    customerName: order.ownerName,
    ...(order.customerPhone ? { customerPhone: order.customerPhone } : {}),
    ...(order.customerAddress ? { customerAddress: order.customerAddress } : {}),
    ...(order.captainName ? { captainName: order.captainName } : {}),
    cashierName: opts.cashierName,
    paymentMethod: opts.paymentMethodLabel,
    isPaid,
    items: order.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.unitPrice * i.quantity,
      ...(i.note ? { note: i.note } : {}),
    })),
    subtotal: subtotal || order.total + discount,
    discount,
    total: order.total,
    ...(order.orderNote.trim() ? { note: order.orderNote.trim() } : {}),
    createdAt: order.createdAt || new Date().toLocaleString('ar-EG'),
  };
}

export type PrintReceiptResult =
  | { ok: true; method: 'bridge' | 'qz'; printer: string; copies: PrintCopies }
  | { ok: false; skipped?: boolean; message: string; reason?: string };

type PrintPayload = {
  html: string;
  pngBase64?: string;
  pngHeightPx?: number;
  pngWidthPx?: number;
  paperWidthMm?: number;
  label: string;
};

function pngJobFromPayload(payload: PrintPayload) {
  if (!payload.pngBase64) return null;
  const settings = getReceiptSettings();
  return {
    pngBase64: payload.pngBase64,
    pngHeightPx: payload.pngHeightPx ?? 800,
    pngWidthPx: payload.pngWidthPx ?? getReceiptPrintWidthPx(settings.paperWidthMm),
    paperWidthMm: payload.paperWidthMm ?? settings.paperWidthMm,
    paperOrientation: 'portrait',
    paperSize: settings.paperSize,
    ...(payload.label ? { label: payload.label } : {}),
  };
}

export async function printPosReceipt(
  data: ReceiptData,
  options?: { force?: boolean; silent?: boolean; copies?: PrintCopies },
): Promise<PrintReceiptResult> {
  const shouldPrint = options?.force || isAutoPrintEnabled();
  if (!shouldPrint) return { ok: false, skipped: true, message: 'الطباعة معطّلة' };

  const copies = options?.copies ?? getReceiptSettings().printCopies;
  const silent = options?.silent !== false;
  const payloads: PrintPayload[] = [];

  const {
    buildCustomerReceiptHtml,
    buildKitchenReceiptHtml,
    renderCustomerReceiptPng,
    renderKitchenReceiptPng,
  } = await import('./pos-receipt-render.js');

  if (copies === 'kitchen' || copies === 'both') {
    const kitchen = kitchenFromReceipt(data);
    const kPng = await renderKitchenReceiptPng(kitchen);
    payloads.push({
      html: buildKitchenReceiptHtml(kitchen),
      label: 'kitchen',
      ...(kPng ? {
        pngBase64: kPng.base64,
        pngHeightPx: kPng.heightPx,
        pngWidthPx: kPng.widthPx,
        paperWidthMm: kPng.paperWidthMm,
      } : {}),
    });
  }

  if (copies === 'customer' || copies === 'both') {
    const cPng = await renderCustomerReceiptPng(data);
    payloads.push({
      html: buildCustomerReceiptHtml(data),
      label: 'customer',
      ...(cPng ? {
        pngBase64: cPng.base64,
        pngHeightPx: cPng.heightPx,
        pngWidthPx: cPng.widthPx,
        paperWidthMm: cPng.paperWidthMm,
      } : {}),
    });
  }

  if (silent) {
    const jobs = payloads.map(pngJobFromPayload).filter((j): j is NonNullable<ReturnType<typeof pngJobFromPayload>> => j != null);
    const { bridgePrintJobs } = await import('./pos-print-bridge.js');
    const bridgeResult = await bridgePrintJobs(jobs);
    if (bridgeResult.ok) {
      return { ok: true, method: 'bridge', printer: bridgeResult.printer, copies };
    }

    if (bridgeResult.reason !== 'bridge-offline') {
      return { ok: false, message: bridgeResult.message, reason: bridgeResult.reason };
    }

    const { silentPrintReceipts } = await import('./pos-qz-print.js');
    const qzResult = await silentPrintReceipts(payloads.map(({ html, pngBase64, pngHeightPx }) => ({
      html,
      ...(pngBase64 ? { pngBase64, pngHeightPx } : {}),
    })));
    if (qzResult.ok) {
      return { ok: true, method: 'qz', printer: qzResult.printer, copies };
    }
    return { ok: false, message: qzResult.message, reason: qzResult.reason };
  }

  for (const payload of payloads) {
    printHtmlViaBrowser(payload.html);
  }
  return { ok: true, method: 'bridge', printer: readSavedPrinterName(), copies };
}

export function printHtmlViaBrowser(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'pos-receipt-print');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      /* ignore */
    }
    setTimeout(() => {
      try {
        document.body.removeChild(iframe);
      } catch {
        /* ignore */
      }
    }, 1500);
  };

  if (iframe.contentWindow?.document?.readyState === 'complete') {
    setTimeout(triggerPrint, 150);
  } else {
    iframe.onload = () => setTimeout(triggerPrint, 150);
    setTimeout(triggerPrint, 600);
  }
}
