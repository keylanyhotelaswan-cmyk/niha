export function treasuryTypeLabel(type) {
    const labels = {
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
export function safeTypeLabel(type) {
    const labels = {
        PROFITS: 'خزنة الأرباح',
        EXPENSES: 'خزنة المصاريف',
    };
    return labels[type ?? ''] ?? '—';
}
export function isIncomingTransaction(type) {
    return ['SALE_RECEIPT', 'CASH_DEPOSIT', 'SHIFT_OPEN_FLOAT'].includes(type);
}
export function mapMovementTypeToApi(type) {
    if (type === 'CASH_WITHDRAWAL')
        return 'CASH_WITHDRAWAL';
    if (type === 'OPERATING_EXPENSE' || type === 'OPERATING_EXPENSE_PAYMENT')
        return 'OPERATING_EXPENSE';
    return 'CASH_DEPOSIT';
}
export function paymentMethodLabel(method) {
    const labels = {
        CASH: 'نقدي',
        INSTAPAY: 'انستاباي',
        WALLET: 'محفظة',
        CARD: 'بطاقة',
        MIXED: 'متعدد',
    };
    return labels[method] ?? method;
}
