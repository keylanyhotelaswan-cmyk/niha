import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Grid2, Paper, Stack, Typography } from '@mui/material';
import { MetricCard } from '../shared.js';
import { cardSx, ui } from '../../lib/ui-tokens.js';
import { paymentMethodLabel } from '../../lib/treasury-store.js';
const WALLET_METHODS = ['CASH', 'INSTAPAY', 'WALLET', 'CARD'];
function fmt(n) {
    return `${n.toLocaleString('en-US')} ج.م`;
}
export function ExpensesTreasuryPanel({ treasury, payAmount = 0, payMethodType, compact }) {
    const expensesSafe = Number(treasury?.expensesSafe ?? 0);
    const walletBalances = treasury?.walletBalances ?? {};
    const selectedAvailable = payMethodType
        ? Number(walletBalances[payMethodType]?.EXPENSES ?? 0)
        : expensesSafe;
    const afterPay = payAmount > 0 ? selectedAvailable - payAmount : selectedAvailable;
    const insufficient = payAmount > 0 && afterPay < -0.01;
    return (_jsxs(Stack, { spacing: 1.5, children: [_jsxs(Grid2, { container: true, spacing: 1.5, children: [_jsx(Grid2, { size: { xs: 12, sm: compact ? 12 : 4 }, children: _jsx(MetricCard, { label: "\u0625\u062C\u0645\u0627\u0644\u064A \u062E\u0632\u064A\u0646\u0629 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A", value: fmt(expensesSafe), note: "EXPENSES \u00B7 \u0627\u0644\u0645\u0635\u062F\u0631 \u0644\u062F\u0641\u0639\u0627\u062A \u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646" }) }), !compact ? (_jsxs(_Fragment, { children: [_jsx(Grid2, { size: { xs: 6, sm: 4 }, children: _jsx(MetricCard, { label: payMethodType ? `متاح (${paymentMethodLabel(payMethodType)})` : 'المتاح للدفع', value: fmt(selectedAvailable), note: "\u062D\u0633\u0628 \u0648\u0633\u064A\u0644\u0629 \u0627\u0644\u062F\u0641\u0639 \u0627\u0644\u0645\u062E\u062A\u0627\u0631\u0629" }) }), _jsx(Grid2, { size: { xs: 6, sm: 4 }, children: _jsx(MetricCard, { label: payAmount > 0 ? 'بعد الدفعة' : '—', value: payAmount > 0 ? fmt(Math.max(0, afterPay)) : '—', ...(payAmount > 0 ? { note: insufficient ? 'رصيد غير كافٍ' : 'تقديري' } : {}) }) })] })) : null] }), insufficient ? (_jsxs(Alert, { severity: "error", children: ["\u0631\u0635\u064A\u062F \u062E\u0632\u064A\u0646\u0629 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A (", paymentMethodLabel(payMethodType), ") \u063A\u064A\u0631 \u0643\u0627\u0641\u064D \u0644\u0644\u062F\u0641\u0639\u0629. \u0627\u0644\u0645\u062A\u0627\u062D: ", fmt(selectedAvailable), " \u2014 \u0627\u0644\u0645\u0637\u0644\u0648\u0628: ", fmt(payAmount)] })) : null, _jsxs(Paper, { elevation: 0, sx: { ...cardSx, p: 1.5 }, children: [_jsx(Typography, { variant: "subtitle2", fontWeight: 700, sx: { mb: 1 }, children: "\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u062D\u0633\u0628 \u0627\u0644\u0648\u0633\u064A\u0644\u0629" }), _jsx(Grid2, { container: true, spacing: 1, children: WALLET_METHODS.map((method) => {
                            const bal = Number(walletBalances[method]?.EXPENSES ?? 0);
                            const isSelected = payMethodType === method;
                            return (_jsx(Grid2, { size: { xs: 6, sm: 3 }, children: _jsxs(Paper, { elevation: 0, sx: {
                                        p: 1.25,
                                        border: `1px solid ${isSelected ? ui.primary : ui.border}`,
                                        bgcolor: isSelected ? ui.skyLight : ui.paper,
                                        borderRadius: 2,
                                    }, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", children: paymentMethodLabel(method) }), _jsx(Typography, { fontWeight: 800, color: bal <= 0 ? 'text.secondary' : ui.ink, children: fmt(bal) })] }) }, method));
                        }) })] })] }));
}
