export type TreasuryMovementType =
  | 'SALE_RECEIPT'
  | 'CASH_DEPOSIT'
  | 'CASH_WITHDRAWAL'
  | 'OPERATING_EXPENSE_PAYMENT'
  | 'SHIFT_OPEN_FLOAT'
  | 'VENDOR_PAYMENT'
  | 'SETUP_COST_PAYMENT'
  | 'INTERNAL_WALLET_TRANSFER'
  | 'PROFIT_WITHDRAWAL';

export type TreasuryTransactionView = {
  id: string;
  transactionType: TreasuryMovementType;
  amount: number;
  note: string | null;
  occurredAt: string;
  paymentMethod: string;
  safeType?: 'PROFITS' | 'EXPENSES';
  collectionStatus: string | null;
  approvalStatus: string | null;
  affectsCash: boolean;
  sourceType: string;
  sourceId: string;
};

export function treasuryTypeLabel(type: string, sourceType?: string): string {
  if (sourceType === 'PROFIT_WITHDRAWAL') return 'سحب أرباح';
  if (sourceType === 'INTERNAL_WALLET_TRANSFER_OUT') return 'تحويل ذكي - خروج';
  if (sourceType === 'INTERNAL_WALLET_TRANSFER_IN') return 'تحويل ذكي - دخول';

  const labels: Record<string, string> = {
    SALE_RECEIPT: 'تحصيل مبيعات',
    CASH_DEPOSIT: 'إيداع نقدي',
    CASH_WITHDRAWAL: 'سحب من الخزنة',
    OPERATING_EXPENSE_PAYMENT: 'مصروف تشغيلي',
    SHIFT_OPEN_FLOAT: 'رصيد افتتاح',
    VENDOR_PAYMENT: 'دفع مورد',
    SETUP_COST_PAYMENT: 'دفع تأسيس',
    INTERNAL_WALLET_TRANSFER: 'تحويل ذكي',
    PROFIT_WITHDRAWAL: 'سحب أرباح',
  };
  return labels[type] ?? type;
}

export function safeTypeLabel(type?: string): string {
  const labels: Record<string, string> = {
    PROFITS: 'خزنة الأرباح',
    EXPENSES: 'خزنة المصاريف',
  };
  return labels[type ?? ''] ?? '—';
}

export function isIncomingTransaction(type: string): boolean {
  return ['SALE_RECEIPT', 'CASH_DEPOSIT', 'SHIFT_OPEN_FLOAT'].includes(type);
}

export function mapMovementTypeToApi(type: string): 'CASH_DEPOSIT' | 'CASH_WITHDRAWAL' | 'OPERATING_EXPENSE' {
  if (type === 'CASH_WITHDRAWAL') return 'CASH_WITHDRAWAL';
  if (type === 'OPERATING_EXPENSE' || type === 'OPERATING_EXPENSE_PAYMENT') return 'OPERATING_EXPENSE';
  return 'CASH_DEPOSIT';
}

export function paymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    CASH: 'نقدي',
    INSTAPAY: 'انستاباي',
    WALLET: 'محفظة',
    CARD: 'بطاقة',
    MIXED: 'متعدد',
  };
  return labels[method] ?? method;
}
