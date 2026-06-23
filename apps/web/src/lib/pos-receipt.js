export const AUTO_PRINT_KEY = 'niha-pos-auto-print';
export const PRINTER_NAME_KEY = 'niha-pos-printer-name';
export const DEFAULT_PRINTER_NAME = 'XP-K200L';
import { customerItemNote, kitchenItemNote, parseItemNote } from './pos-order-sauces.js';
import { getReceiptSettings, saveReceiptSettings as persistReceiptSettings, getReceiptPrintWidthPx, getReceiptPrintableWidthMm, } from './pos-receipt-settings.js';
export { buildCustomerReceiptHtml, buildKitchenReceiptHtml, buildCustomerReceiptHtml as buildReceiptHtml, buildReceiptCss, renderCustomerReceiptPng, renderKitchenReceiptPng, getReceiptLayout, } from './pos-receipt-render.js';
export { getReceiptSettings, saveReceiptSettings, resetReceiptSettings, getStoreBranding, sampleReceiptData, receiptLayoutFromSettings, DEFAULT_RECEIPT_SETTINGS, RECEIPT_SETTINGS_EVENT, RECEIPT_CSS_WIDTH_PX, getReceiptPrintWidthPx, getReceiptPrintableWidthMm, } from './pos-receipt-settings.js';
export function isAutoPrintEnabled() {
    return getReceiptSettings().autoPrint;
}
export function setAutoPrintEnabled(enabled) {
    localStorage.setItem(AUTO_PRINT_KEY, enabled ? 'true' : 'false');
    persistReceiptSettings({ ...getReceiptSettings(), autoPrint: enabled });
}
export function readSavedPrinterName() {
    try {
        const fromSettings = getReceiptSettings().printerName?.trim();
        if (fromSettings)
            return fromSettings;
        return localStorage.getItem(PRINTER_NAME_KEY)?.trim() || DEFAULT_PRINTER_NAME;
    }
    catch {
        return DEFAULT_PRINTER_NAME;
    }
}
export function savePrinterName(name) {
    try {
        const trimmed = name.trim();
        if (trimmed)
            localStorage.setItem(PRINTER_NAME_KEY, trimmed);
        else
            localStorage.removeItem(PRINTER_NAME_KEY);
        persistReceiptSettings({ ...getReceiptSettings(), printerName: trimmed || DEFAULT_PRINTER_NAME });
    }
    catch {
        /* ignore */
    }
}
export function kitchenFromReceipt(data) {
    return {
        orderNumber: data.orderNumber,
        cashierName: data.cashierName,
        orderType: data.orderType,
        ...(data.shiftNumber ? { shiftNumber: data.shiftNumber } : {}),
        ...(data.customerName ? { customerName: data.customerName } : {}),
        ...(data.customerPhone ? { customerPhone: data.customerPhone } : {}),
        ...(data.customerAddress ? { customerAddress: data.customerAddress } : {}),
        ...(data.captainName ? { captainName: data.captainName } : {}),
        items: data.items.map((i) => {
            const kitchenNote = kitchenItemNote(i.note ?? '', i.sauces ?? []);
            return {
                name: i.name,
                quantity: i.quantity,
                ...(kitchenNote ? { note: kitchenNote } : {}),
            };
        }),
        ...(data.note ? { note: data.note } : {}),
        createdAt: data.createdAt,
    };
}
export function buildReceiptFromSavedOrder(order, opts) {
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
        ...(order.ownerName?.trim() ? { customerName: order.ownerName.trim() } : {}),
        ...(order.customerPhone ? { customerPhone: order.customerPhone } : {}),
        ...(order.customerAddress ? { customerAddress: order.customerAddress } : {}),
        ...(order.captainName ? { captainName: order.captainName } : {}),
        cashierName: opts.cashierName,
        paymentMethod: opts.paymentMethodLabel,
        isPaid,
        items: order.items.map((i) => {
            const parsed = parseItemNote(i.note ?? '');
            const sauces = i.sauces?.length ? i.sauces : parsed.sauces;
            const userNote = i.sauces?.length ? (i.note ?? '').trim() : parsed.userNote;
            const customerNote = customerItemNote(userNote, sauces);
            return {
                name: i.name,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                lineTotal: i.unitPrice * i.quantity,
                ...(customerNote ? { note: customerNote } : {}),
                ...(sauces.length ? { sauces } : {}),
            };
        }),
        subtotal: subtotal || order.total + discount,
        discount,
        total: order.total,
        ...(order.orderNote.trim() ? { note: order.orderNote.trim() } : {}),
        createdAt: order.createdAt || new Date().toLocaleString('ar-EG'),
    };
}
function pngJobFromPayload(payload) {
    if (!payload.pngBase64)
        return null;
    const settings = getReceiptSettings();
    return {
        pngBase64: payload.pngBase64,
        pngHeightPx: payload.pngHeightPx ?? 800,
        pngWidthPx: payload.pngWidthPx ?? getReceiptPrintWidthPx(settings.paperWidthMm),
        paperWidthMm: payload.paperWidthMm ?? getReceiptPrintableWidthMm(settings.paperWidthMm),
        paperOrientation: 'portrait',
        paperSize: settings.paperSize,
        ...(payload.label ? { label: payload.label } : {}),
    };
}
export async function printPosReceipt(data, options) {
    const shouldPrint = options?.force || isAutoPrintEnabled();
    if (!shouldPrint)
        return { ok: false, skipped: true, message: 'الطباعة معطّلة' };
    const copies = options?.copies ?? getReceiptSettings().printCopies;
    const silent = options?.silent !== false;
    const settings = getReceiptSettings();
    const needKitchen = copies === 'kitchen' || copies === 'both';
    const needCustomer = copies === 'customer' || copies === 'both';
    if (silent && settings.printMode === 'escpos') {
        const { renderCustomerReceiptPng, renderKitchenReceiptPng, } = await import('./pos-receipt-render.js');
        const { bridgePrintEscPos } = await import('./pos-print-bridge.js');
        const { pickEscPosBridgeSettings } = await import('./pos-receipt-escpos.js');
        const kitchen = kitchenFromReceipt(data);
        const [kPng, cPng] = await Promise.all([
            needKitchen ? renderKitchenReceiptPng(kitchen, settings) : Promise.resolve(null),
            needCustomer ? renderCustomerReceiptPng(data, settings) : Promise.resolve(null),
        ]);
        const imageJobs = [];
        if (kPng)
            imageJobs.push({ pngBase64: kPng.base64 });
        if (cPng)
            imageJobs.push({ pngBase64: cPng.base64 });
        const escposResult = await bridgePrintEscPos(imageJobs, pickEscPosBridgeSettings());
        if (escposResult.ok) {
            return { ok: true, method: 'escpos', printer: escposResult.printer, copies };
        }
        if (escposResult.reason !== 'bridge-offline') {
            console.warn('[pos-print] ESC/POS image failed, falling back to PNG/PDF:', escposResult.message);
        }
        else {
            return { ok: false, message: escposResult.message, reason: escposResult.reason };
        }
    }
    const payloads = [];
    const { buildCustomerReceiptHtml, buildKitchenReceiptHtml, renderCustomerReceiptPng, renderKitchenReceiptPng, } = await import('./pos-receipt-render.js');
    const kitchen = kitchenFromReceipt(data);
    const [kPng, cPng] = await Promise.all([
        needKitchen ? renderKitchenReceiptPng(kitchen) : Promise.resolve(null),
        needCustomer ? renderCustomerReceiptPng(data) : Promise.resolve(null),
    ]);
    if (needKitchen) {
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
    if (needCustomer) {
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
        const jobs = payloads.map(pngJobFromPayload).filter((j) => j != null);
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
export function printHtmlViaBrowser(html) {
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
        }
        catch {
            /* ignore */
        }
        setTimeout(() => {
            try {
                document.body.removeChild(iframe);
            }
            catch {
                /* ignore */
            }
        }, 1500);
    };
    if (iframe.contentWindow?.document?.readyState === 'complete') {
        setTimeout(triggerPrint, 150);
    }
    else {
        iframe.onload = () => setTimeout(triggerPrint, 150);
        setTimeout(triggerPrint, 600);
    }
}
