import { kitchenFromReceipt } from './pos-receipt.js';
import { getReceiptSettings } from './pos-receipt-settings.js';
function padInvoiceNumber(orderNumber) {
    const digits = orderNumber.replace(/\D/g, '');
    return (digits || orderNumber).padStart(6, '0').slice(-6);
}
function kitchenDisplayNumber(orderNumber) {
    const m = orderNumber.match(/(\d{6})-(\d+)$/i);
    if (m) {
        const ym = m[1];
        if (!ym)
            return padInvoiceNumber(orderNumber);
        const seq = String(Number(m[2])).padStart(3, '0');
        return `${ym.slice(2)}-${seq}`;
    }
    return padInvoiceNumber(orderNumber);
}
export function buildEscPosJobs(data, copies) {
    const jobs = [];
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
