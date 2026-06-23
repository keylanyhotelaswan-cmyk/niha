const COLLECTION_METHODS = ['CASH', 'INSTAPAY', 'WALLET', 'CARD'] as const;

export type CollectionMethodRow = {
  approved: number;
  pending: number;
  expense: number;
  transferOut: number;
  transferIn: number;
  gross: number;
  total: number;
};

export type ShiftWalletTransfers = {
  transferOut: Record<string, number>;
  transferIn: Record<string, number>;
};

export function aggregateExpensesByPaymentMethod(
  expenses: Array<{ amount: unknown; paymentMethod?: string | null }>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const expense of expenses) {
    const method = expense.paymentMethod ?? 'CASH';
    out[method] = (out[method] ?? 0) + Number(expense.amount);
  }
  return out;
}

export function aggregateShiftWalletTransfers(
  txs: Array<{ amount: unknown; paymentMethod: string; sourceType?: string | null }>,
): ShiftWalletTransfers {
  const transferOut: Record<string, number> = {};
  const transferIn: Record<string, number> = {};
  for (const tx of txs) {
    const amount = Number(tx.amount);
    if (tx.sourceType === 'SHIFT_WALLET_TRANSFER_OUT') {
      transferOut[tx.paymentMethod] = (transferOut[tx.paymentMethod] ?? 0) + amount;
    } else if (tx.sourceType === 'SHIFT_WALLET_TRANSFER_IN') {
      transferIn[tx.paymentMethod] = (transferIn[tx.paymentMethod] ?? 0) + amount;
    }
  }
  return { transferOut, transferIn };
}

export function netCollectionByMethod(
  salesByMethod: Record<string, { approved: number; pending: number; total?: number }>,
  expensesByPaymentMethod: Record<string, number>,
  walletTransfers?: ShiftWalletTransfers,
): Record<string, CollectionMethodRow> {
  const result: Record<string, CollectionMethodRow> = {};
  for (const method of COLLECTION_METHODS) {
    const sales = salesByMethod[method] ?? { approved: 0, pending: 0 };
    const expense = expensesByPaymentMethod[method] ?? 0;
    const transferOut = walletTransfers?.transferOut[method] ?? 0;
    const transferIn = walletTransfers?.transferIn[method] ?? 0;
    const gross = sales.approved + sales.pending;
    let deduct = expense;
    const approvedNet = Math.max(0, sales.approved - deduct);
    deduct = Math.max(0, deduct - sales.approved);
    const pendingNet = Math.max(0, sales.pending - deduct);
    const afterExpense = approvedNet + pendingNet;
    result[method] = {
      approved: approvedNet,
      pending: pendingNet,
      expense,
      transferOut,
      transferIn,
      gross,
      total: afterExpense - transferOut + transferIn,
    };
  }
  return result;
}
