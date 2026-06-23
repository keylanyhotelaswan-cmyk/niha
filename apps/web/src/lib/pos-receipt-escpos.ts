import type { ReceiptData, PrintCopies } from './pos-receipt.js';
import { kitchenFromReceipt } from './pos-receipt.js';
import { getReceiptSettings } from './pos-receipt-settings.js';

function padInvoiceNumber(orderNumber: string) {
  const digits = orderNumber.replace(/\D/g, '');
  return (digits || orderNumber).padStart(6, '0').slice(-6);
}

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

export type EscPosPrintJob =
  | { type: 'kitchen'; data: ReturnType<typeof kitchenFromReceipt> & { displayOrderNumber: string } }
  | { type: 'customer'; data: ReceiptData & { displayOrderNumber: string } };

export function buildEscPosJobs(data: ReceiptData, copies: PrintCopies): EscPosPrintJob[] {
  const jobs: EscPosPrintJob[] = [];
  const needKitchen = copies === 'kitchen' || copies === 'both';
  const needCustomer = copies === 'customer' || copies === 'both';

  if (needKitchen) {
    const kitchen = kitchenFromReceipt(data);
    jobs.push({
      type: 'kitchen',
      data: { ...kitchen, displayOrderNumber: kitchenDisplayNumber(data.orderNumber) },
    });
  }

  if (needCustomer) {
    jobs.push({
      type: 'customer',
      data: {
        ...data,
        displayOrderNumber: padInvoiceNumber(data.orderNumber),
      },
    });
  }

  return jobs;
}

export function pickEscPosBridgeSettings() {
  const s = getReceiptSettings();
  return {
    paperWidthMm: s.paperWidthMm,
    fontKitchenNum: s.fontKitchenNum,
    fontKitchenItem: s.fontKitchenItem,
    fontBody: s.fontBody,
    fontStoreName: s.fontStoreName,
  };
}
