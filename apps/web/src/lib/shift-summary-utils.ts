import { paymentMethodLabel } from './treasury-store.js';

export type ShiftSummaryLike = {
  openingFloat?: number;
  expectedCash?: number;
  totalSales?: number;
  salesTotal?: number;
  pending?: number;
  pendingCashInCustody?: number;
  incoming?: number;
  outgoing?: number;
  expensesTotal?: number;
  ordersCount?: number;
  transactionCount?: number;
  uncollectedCount?: number;
  uncollectedTotal?: number;
  suspendedCount?: number;
  uncollectedOrders?: Array<{ orderNumber: string; total: number; customerName?: string | null }>;
  byPaymentMethod?: Record<string, { approved: number; pending: number }>;
  salesByMethod?: Record<string, { approved: number; pending: number; total: number }>;
  expensesByPaymentMethod?: Record<string, number>;
  walletTransfers?: { transferOut: Record<string, number>; transferIn: Record<string, number> };
  netSalesByMethod?: Record<string, {
    approved: number;
    pending: number;
    expense: number;
    transferOut?: number;
    transferIn?: number;
    gross: number;
    total: number;
  }>;
};

export function formatShiftMoney(value: number) {
  return `${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;
}

export function formatShiftDuration(openedAt: string | Date) {
  const start = new Date(openedAt);
  if (Number.isNaN(start.getTime())) return '—';
  const ms = Date.now() - start.getTime();
  const hours = Math.floor(ms / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remH = hours % 24;
    return `${days} يوم ${remH} س`;
  }
  if (hours > 0) return `${hours} س ${mins} د`;
  return `${mins} د`;
}

export function formatShiftOpenedAt(openedAt: string | Date) {
  const d = new Date(openedAt);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ar-EG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const COLLECTION_METHODS = ['CASH', 'INSTAPAY', 'WALLET', 'CARD'] as const;

export function shiftCollectionRows(summary: ShiftSummaryLike | null | undefined) {
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
  }).filter((r) =>
    r.total > 0
    || r.gross > 0
    || r.expense > 0
    || r.transferOut > 0
    || r.transferIn > 0
    || r.method === 'CASH',
  );
}

/** @deprecated استخدم ShiftSummaryPreviewDialog */
export function printShiftSummaryHtml(params: {
  title?: string | undefined;
  shiftNumber?: string | undefined;
  cashierName?: string | undefined;
  openedAt?: string | Date | undefined;
  closedAt?: string | Date | undefined;
  summary: ShiftSummaryLike | null | undefined;
}) {
  void import('./shift-summary-print.js').then(({ openShiftSummaryPreviewWindow }) => {
    openShiftSummaryPreviewWindow(params);
  });
}
