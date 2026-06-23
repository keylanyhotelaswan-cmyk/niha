import { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } from 'node-thermal-printer';
import { resolvePrinterName } from './print.mjs';
import { createWindowsPrinterDriver, warmPrinterDriverCache } from './printer-driver.mjs';

const JOB_GAP_MS = 350;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function line(width = 42) {
  return '-'.repeat(width);
}

function formatMoney(value) {
  const n = Number(value) || 0;
  return `${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;
}

function shouldShowOrderType(orderType) {
  const t = String(orderType ?? '');
  return t.includes('تيك') || t.includes('takeaway') || t.includes('توصيل') || t.includes('delivery');
}

function formatOrderType(orderType) {
  const t = String(orderType ?? '');
  if (t.includes('تيك') || t.toLowerCase().includes('takeaway')) return 'تيك أواي';
  if (t.includes('توصيل') || t.toLowerCase().includes('delivery')) return 'توصيل';
  return 'محلي';
}

function formatPaymentStatus(isPaid) {
  return isPaid !== false ? 'مدفوع' : 'غير مدفوع';
}

async function createPrinter(printerName, settings = {}) {
  await warmPrinterDriverCache();
  const resolved = await resolvePrinterName(printerName);
  const width = Number(settings.paperWidthMm) >= 78 ? 42 : 32;
  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: `printer:${resolved}`,
    driver: createWindowsPrinterDriver(),
    characterSet: CharacterSet.WPC1256_ARABIC,
    width,
    removeSpecialCharacters: false,
    breakLine: BreakLine.WORD,
    options: { timeout: 10000 },
  });

  try {
    const connected = await printer.isPrinterConnected();
    if (!connected) {
      throw new Error(`تعذّر الاتصال بالطابعة «${resolved}» — تأكد من USB والتعريف`);
    }
  } catch {
    // isPrinterConnected may fail on some drivers — proceed to printDirect
  }

  return { printer, resolved, width };
}

async function flushPrinter(printer) {
  printer.cut({ verticalTabAmount: 3 });
  await printer.execute();
}

async function printKitchenSlip(printer, data, settings, width) {
  const orderNo = String(data.displayOrderNumber ?? data.orderNumber ?? '—');
  const kitchenNumScale = Math.min(2, Math.max(1, Math.round((Number(settings.fontKitchenNum) || 72) / 36)));

  printer.alignCenter();
  printer.setTextSize(kitchenNumScale, kitchenNumScale);
  printer.bold(true);
  printer.println(orderNo);
  printer.bold(false);
  printer.setTextNormal();
  printer.println('مطبخ');
  printer.println(String(data.createdAt ?? '').trim() || new Date().toLocaleString('ar-EG'));

  if (shouldShowOrderType(data.orderType)) {
    printer.println(formatOrderType(data.orderType));
  }

  printer.alignRight();
  if (data.customerName?.trim()) printer.println(`العميل: ${data.customerName.trim()}`);
  if (data.customerPhone?.trim()) {
    printer.alignLeft();
    printer.println(data.customerPhone.trim());
    printer.alignRight();
  }
  if (data.customerAddress?.trim()) printer.println(`العنوان: ${data.customerAddress.trim()}`);
  if (data.captainName?.trim()) printer.println(`كابتن: ${data.captainName.trim()}`);

  printer.alignCenter();
  printer.println(line(width));

  printer.alignRight();
  printer.bold(true);
  for (const item of data.items ?? []) {
    const note = item.note?.trim();
    const label = note ? `${item.name} (${note})` : item.name;
    printer.println(`${item.quantity}  ${label}`);
  }
  printer.bold(false);

  if (data.note?.trim()) {
    printer.alignCenter();
    printer.println(line(width));
    printer.alignRight();
    printer.println(`ملاحظة: ${data.note.trim()}`);
  }

  printer.alignCenter();
  printer.println(line(width));
  printer.newLine();
}

async function printCustomerSlip(printer, data, settings, width) {
  const invoiceNo = String(data.displayOrderNumber ?? data.orderNumber ?? '—');
  const paid = data.isPaid !== false;

  printer.alignCenter();
  printer.bold(true);
  printer.setTextSize(1, 1);
  printer.println(String(data.storeName ?? '').trim() || 'Niha');
  printer.bold(false);
  if (data.storeSubtitle?.trim()) printer.println(data.storeSubtitle.trim());

  printer.println(line(width));
  printer.alignRight();
  printer.println(`فاتورة #${invoiceNo}`);
  printer.println(String(data.createdAt ?? '').trim());
  printer.println(`كاشير: ${data.cashierName ?? '—'}${shouldShowOrderType(data.orderType) ? ` · ${formatOrderType(data.orderType)}` : ''}`);
  if (data.customerName?.trim()) printer.println(`العميل: ${data.customerName.trim()}`);
  if (data.customerPhone?.trim()) {
    printer.alignLeft();
    printer.println(data.customerPhone.trim());
    printer.alignRight();
  }
  if (data.customerAddress?.trim()) printer.println(`العنوان: ${data.customerAddress.trim()}`);
  if (data.captainName?.trim()) printer.println(`كابتن: ${data.captainName.trim()}`);

  printer.alignCenter();
  printer.println(line(width));

  printer.alignRight();
  for (const item of data.items ?? []) {
    const total = item.lineTotal ?? item.unitPrice * item.quantity;
    printer.println(`${item.quantity}× ${item.name}`);
    printer.alignLeft();
    printer.println(formatMoney(total));
    printer.alignRight();
  }

  printer.alignCenter();
  printer.println(line(width));
  printer.alignRight();
  if (Number(data.discount) > 0) {
    printer.println(`خصم: ${formatMoney(data.discount)}`);
  }
  printer.bold(true);
  printer.println(`الإجمالي: ${formatMoney(data.total)}`);
  printer.bold(false);
  printer.println(`الحالة: ${formatPaymentStatus(paid)}`);
  printer.println(`الدفع: ${data.paymentMethod ?? '—'}`);
  if (data.note?.trim()) printer.println(`ملاحظة: ${data.note.trim()}`);

  printer.alignCenter();
  printer.println(line(width));
  if (data.storeFooter?.trim()) printer.println(data.storeFooter.trim());
  if (data.storePhone?.trim()) printer.println(data.storePhone.trim());
  printer.println('شكراً لزيارتكم');
  printer.newLine();
}

/**
 * @param {string} printerName
 * @param {Array<{ type: 'kitchen' | 'customer'; data: Record<string, unknown> }>} jobs
 * @param {Record<string, unknown>} [settings]
 */
export async function printEscPosJobs(printerName, jobs, settings = {}) {
  if (!jobs?.length) throw new Error('لا توجد مهام طباعة');

  let resolvedPrinter = '';
  for (let i = 0; i < jobs.length; i += 1) {
    const job = jobs[i];
    const { printer, resolved, width } = await createPrinter(
      i === 0 ? printerName : resolvedPrinter || printerName,
      settings,
    );
    resolvedPrinter = resolved;

    if (job.type === 'kitchen') {
      await printKitchenSlip(printer, job.data ?? {}, settings, width);
    } else if (job.type === 'customer') {
      await printCustomerSlip(printer, job.data ?? {}, settings, width);
    } else {
      throw new Error(`نوع طباعة غير معروف: ${job.type}`);
    }

    await flushPrinter(printer);
    if (i < jobs.length - 1) await sleep(JOB_GAP_MS);
  }

  return { printer: resolvedPrinter, count: jobs.length };
}
