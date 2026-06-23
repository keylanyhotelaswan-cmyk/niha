import { paymentMethodLabel } from './treasury-store.js';
export function formatShiftMoney(value) {
    return `${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;
}
export function formatShiftDuration(openedAt) {
    const start = new Date(openedAt);
    if (Number.isNaN(start.getTime()))
        return '—';
    const ms = Date.now() - start.getTime();
    const hours = Math.floor(ms / 3_600_000);
    const mins = Math.floor((ms % 3_600_000) / 60_000);
    if (hours >= 24) {
        const days = Math.floor(hours / 24);
        const remH = hours % 24;
        return `${days} يوم ${remH} س`;
    }
    if (hours > 0)
        return `${hours} س ${mins} د`;
    return `${mins} د`;
}
export function formatShiftOpenedAt(openedAt) {
    const d = new Date(openedAt);
    if (Number.isNaN(d.getTime()))
        return '—';
    return d.toLocaleString('ar-EG', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}
const COLLECTION_METHODS = ['CASH', 'INSTAPAY', 'WALLET', 'CARD'];
export function shiftCollectionRows(summary) {
    const net = summary?.netSalesByMethod;
    const expenses = summary?.expensesByPaymentMethod ?? {};
    const sales = summary?.salesByMethod ?? summary?.byPaymentMethod ?? {};
    return COLLECTION_METHODS.map((method) => {
        const netRow = net?.[method];
        if (netRow) {
            return {
                method,
                label: paymentMethodLabel(method),
                approved: netRow.approved,
                pending: netRow.pending,
                expense: netRow.expense,
                transferOut: netRow.transferOut ?? 0,
                transferIn: netRow.transferIn ?? 0,
                gross: netRow.gross,
                total: netRow.total,
            };
        }
        const row = sales[method];
        const approved = row?.approved ?? 0;
        const pending = row?.pending ?? 0;
        const expense = Number(expenses[method] ?? 0);
        const gross = approved + pending;
        let deduct = expense;
        const approvedNet = Math.max(0, approved - deduct);
        deduct = Math.max(0, deduct - approved);
        const pendingNet = Math.max(0, pending - deduct);
        return {
            method,
            label: paymentMethodLabel(method),
            approved: approvedNet,
            pending: pendingNet,
            expense,
            transferOut: 0,
            transferIn: 0,
            gross,
            total: approvedNet + pendingNet,
        };
    }).filter((r) => r.total > 0
        || r.gross > 0
        || r.expense > 0
        || r.transferOut > 0
        || r.transferIn > 0
        || r.method === 'CASH');
}
/** @deprecated استخدم ShiftSummaryPreviewDialog */
export function printShiftSummaryHtml(params) {
    void import('./shift-summary-print.js').then(({ openShiftSummaryPreviewWindow }) => {
        openShiftSummaryPreviewWindow(params);
    });
}
