import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Button, FormControlLabel, Grid2, MenuItem, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, } from '@mui/material';
import { useEffect, useState } from 'react';
import { MetricCard, SectionCard } from '../../shared.js';
import { PaymentMethodCards } from '../components/payment-method-cards.js';
import { useAuth } from '../../../lib/auth-context.js';
import { apiInternalSafeTransfer, apiProfitWithdrawal, apiUpdateSafeSplitSetting } from '../../../lib/api.js';
import { paymentMethodLabel } from '../../../lib/treasury-store.js';
const paymentMethodOptions = ['CASH', 'INSTAPAY', 'WALLET', 'CARD'];
export function TreasuryTab({ workspace, branchId, cashBoxId, onRefresh, onMessage }) {
    const { accessToken } = useAuth();
    const [cumulative, setCumulative] = useState(false);
    const [expensesPercentage, setExpensesPercentage] = useState('50');
    const [fromSafeType, setFromSafeType] = useState('PROFITS');
    const [toSafeType, setToSafeType] = useState('EXPENSES');
    const [fromPaymentMethod, setFromPaymentMethod] = useState('CASH');
    const [toPaymentMethod, setToPaymentMethod] = useState('CASH');
    const [transferAmount, setTransferAmount] = useState('0');
    const [transferNote, setTransferNote] = useState('');
    const [profitWithdrawalMethod, setProfitWithdrawalMethod] = useState('CASH');
    const [profitWithdrawalAmount, setProfitWithdrawalAmount] = useState('0');
    const [profitWithdrawalNote, setProfitWithdrawalNote] = useState('');
    const paymentMethods = workspace?.context?.paymentMethods ?? [];
    const treasuryToday = workspace?.treasuryToday ?? {};
    const treasuryCumulative = workspace?.treasuryCumulative ?? {};
    const safeSplitSetting = workspace?.safeSplitSetting ?? {};
    const breakdown = cumulative
        ? treasuryCumulative.byPaymentMethod ?? {}
        : treasuryToday.byPaymentMethod ?? {};
    const physicalCash = cumulative
        ? Number(treasuryCumulative.physicalCash ?? 0)
        : Number(treasuryToday.physicalCash ?? 0);
    const inTreasuryTotal = Number(treasuryToday.approvedTotal ?? 0) + Number(treasuryToday.pendingTotal ?? 0);
    const selectedBalances = cumulative ? treasuryCumulative : treasuryToday;
    const profitsSafe = Number(selectedBalances.profitsSafe ?? 0);
    const expensesSafe = Number(selectedBalances.expensesSafe ?? 0);
    const totalSafe = Number(selectedBalances.totalSafe ?? profitsSafe + expensesSafe);
    const walletBalances = selectedBalances.walletBalances ?? {};
    useEffect(() => {
        setExpensesPercentage(String(Number(safeSplitSetting.expensesPercentage ?? 50)));
    }, [safeSplitSetting.expensesPercentage]);
    const saveSplitSetting = async () => {
        if (!accessToken || !branchId)
            return;
        const value = Number(expensesPercentage);
        const res = await apiUpdateSafeSplitSetting({
            branchId,
            date: workspace?.context?.date,
            expensesPercentage: value,
        }, accessToken);
        if (res.ok) {
            onMessage('تم تحديث نسبة تقسيم الإيراد.');
            onRefresh();
        }
        else {
            onMessage(`فشل تحديث النسبة: ${res.body ?? res.error}`);
        }
    };
    const submitTransfer = async () => {
        if (!accessToken || !branchId || !cashBoxId)
            return;
        const amount = Number(transferAmount);
        const note = transferNote.trim();
        const res = await apiInternalSafeTransfer({
            branchId,
            cashBoxId,
            fromSafeType,
            fromPaymentMethod,
            toSafeType,
            toPaymentMethod,
            amount,
            ...(note ? { note } : {}),
        }, accessToken);
        if (res.ok) {
            setTransferAmount('0');
            setTransferNote('');
            onMessage('تم تسجيل التحويل الداخلي بين الخزنتين.');
            onRefresh();
        }
        else {
            onMessage(`فشل التحويل: ${res.body ?? res.error}`);
        }
    };
    const submitProfitWithdrawal = async () => {
        if (!accessToken || !branchId || !cashBoxId)
            return;
        const amount = Number(profitWithdrawalAmount);
        const note = profitWithdrawalNote.trim();
        const res = await apiProfitWithdrawal({
            branchId,
            cashBoxId,
            paymentMethod: profitWithdrawalMethod,
            amount,
            ...(note ? { note } : {}),
        }, accessToken);
        if (res.ok) {
            setProfitWithdrawalAmount('0');
            setProfitWithdrawalNote('');
            onMessage('تم تسجيل سحب الأرباح.');
            onRefresh();
        }
        else {
            onMessage(`فشل سحب الأرباح: ${res.body ?? res.error}`);
        }
    };
    return (_jsxs(Stack, { spacing: 2, children: [_jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: cumulative ? 'تراكمي من بداية النظام' : 'تحصيل اليوم فقط' }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: cumulative, onChange: (e) => setCumulative(e.target.checked) }), label: "\u0639\u0631\u0636 \u0627\u0644\u062A\u0631\u0627\u0643\u0645\u064A" })] }), _jsxs(SectionCard, { title: cumulative ? 'خزنة التحصيل (تراكمي معتمد)' : 'خزنة التحصيل اليوم', children: [_jsx(PaymentMethodCards, { paymentMethods: paymentMethods, breakdown: breakdown, mode: cumulative ? 'cumulative' : 'today' }), !cumulative ? (_jsxs(Stack, { direction: "row", spacing: 2, flexWrap: "wrap", useFlexGap: true, sx: { mt: 2 }, children: [_jsxs(Typography, { variant: "body2", fontWeight: 700, children: ["\u0641\u064A \u0627\u0644\u062E\u0632\u0646\u0629: ", inTreasuryTotal.toLocaleString('en-US'), " \u062C.\u0645"] }), _jsxs(Typography, { variant: "body2", color: "warning.main", children: ["\u0628\u0627\u0646\u062A\u0638\u0627\u0631 \u0627\u0639\u062A\u0645\u0627\u062F: ", Number(treasuryToday.pendingTotal ?? 0).toLocaleString('en-US'), " \u062C.\u0645"] }), _jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["\u0645\u0639\u062A\u0645\u062F \u0646\u0647\u0627\u0626\u064A: ", Number(treasuryToday.approvedTotal ?? 0).toLocaleString('en-US'), " \u062C.\u0645"] })] })) : null] }), _jsx(SectionCard, { title: cumulative ? 'أرصدة الخزائن الفرعية (تراكمي)' : 'أرصدة الخزائن الفرعية اليوم', children: _jsxs(Grid2, { container: true, spacing: 2, children: [_jsx(Grid2, { size: { xs: 12, md: 4 }, children: _jsx(MetricCard, { label: "\u062E\u0632\u0646\u0629 \u0627\u0644\u0623\u0631\u0628\u0627\u062D", value: `${profitsSafe.toLocaleString('en-US')} ج.م`, note: "\u0625\u064A\u0631\u0627\u062F \u0645\u062C\u0645\u0651\u062F \u0644\u0644\u0623\u0631\u0628\u0627\u062D \u0627\u0644\u0635\u0627\u0641\u064A\u0629", progress: totalSafe > 0 ? Math.min(100, (profitsSafe / totalSafe) * 100) : 0, tone: "#7c2d12" }) }), _jsx(Grid2, { size: { xs: 12, md: 4 }, children: _jsx(MetricCard, { label: "\u062E\u0632\u0646\u0629 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641", value: `${expensesSafe.toLocaleString('en-US')} ج.م`, note: "\u0645\u0635\u062F\u0631 \u0627\u0644\u0635\u0631\u0641 \u0644\u0644\u0645\u0648\u0631\u062F\u064A\u0646 \u0648\u0627\u0644\u0622\u062C\u0644 \u0648\u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A", progress: totalSafe > 0 ? Math.min(100, (expensesSafe / totalSafe) * 100) : 0, tone: "#0f766e" }) }), _jsx(Grid2, { size: { xs: 12, md: 4 }, children: _jsx(MetricCard, { label: "\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u062E\u0632\u0627\u0626\u0646", value: `${totalSafe.toLocaleString('en-US')} ج.م`, note: cumulative ? 'الرصيد التراكمي المعتمد' : 'حركات اليوم المعتمدة', progress: totalSafe > 0 ? 100 : 0, tone: "#155e75" }) })] }) }), _jsx(SectionCard, { title: "\u062A\u0648\u0632\u064A\u0639 \u0627\u0644\u062E\u0632\u0646\u0629 \u062D\u0633\u0628 \u0648\u0633\u064A\u0644\u0629 \u0627\u0644\u062F\u0641\u0639", children: _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u0648\u0633\u064A\u0644\u0629 \u0627\u0644\u062F\u0641\u0639" }), _jsx(TableCell, { align: "right", children: "\u0645\u0635\u0627\u0631\u064A\u0641" }), _jsx(TableCell, { align: "right", children: "\u0623\u0631\u0628\u0627\u062D" }), _jsx(TableCell, { align: "right", children: "\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A" })] }) }), _jsx(TableBody, { children: paymentMethodOptions.map((method) => {
                                const row = walletBalances[method] ?? { EXPENSES: 0, PROFITS: 0, total: 0 };
                                return (_jsxs(TableRow, { hover: true, children: [_jsx(TableCell, { children: paymentMethodLabel(method) }), _jsxs(TableCell, { align: "right", children: [Number(row.EXPENSES ?? 0).toLocaleString('en-US'), " \u062C.\u0645"] }), _jsxs(TableCell, { align: "right", children: [Number(row.PROFITS ?? 0).toLocaleString('en-US'), " \u062C.\u0645"] }), _jsxs(TableCell, { align: "right", sx: { fontWeight: 800 }, children: [Number(row.total ?? 0).toLocaleString('en-US'), " \u062C.\u0645"] })] }, method));
                            }) })] }) }), !cumulative ? (_jsxs(Grid2, { container: true, spacing: 2, children: [_jsx(Grid2, { size: { xs: 12, lg: 5 }, children: _jsx(SectionCard, { title: "\u0646\u0633\u0628\u0629 \u062A\u0642\u0633\u064A\u0645 \u0625\u064A\u0631\u0627\u062F \u0627\u0644\u064A\u0648\u0645", children: _jsxs(Stack, { spacing: 1.5, children: [_jsx(TextField, { label: "\u0646\u0633\u0628\u0629 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 %", size: "small", type: "number", value: expensesPercentage, onChange: (e) => setExpensesPercentage(e.target.value), inputProps: { min: 0, max: 100, step: 1 }, helperText: `الأرباح: ${Math.max(0, 100 - Number(expensesPercentage || 0)).toLocaleString('en-US')}%` }), _jsx(Button, { variant: "contained", onClick: saveSplitSetting, disabled: Number(expensesPercentage) < 0 || Number(expensesPercentage) > 100, children: "\u062D\u0641\u0638 \u0627\u0644\u0646\u0633\u0628\u0629" })] }) }) }), _jsx(Grid2, { size: { xs: 12, lg: 7 }, children: _jsx(SectionCard, { title: "\u062A\u062D\u0648\u064A\u0644 \u0630\u0643\u064A \u0628\u064A\u0646 \u0627\u0644\u062E\u0632\u0627\u0626\u0646 \u0648\u0648\u0633\u0627\u0626\u0644 \u0627\u0644\u062F\u0641\u0639", children: _jsxs(Grid2, { container: true, spacing: 1.5, children: [_jsx(Grid2, { size: { xs: 12, md: 3 }, children: _jsxs(TextField, { select: true, fullWidth: true, label: "\u0645\u0646 \u062E\u0632\u0646\u0629", size: "small", value: fromSafeType, onChange: (e) => {
                                                const next = e.target.value;
                                                setFromSafeType(next);
                                            }, children: [_jsx(MenuItem, { value: "PROFITS", children: "\u062E\u0632\u0646\u0629 \u0627\u0644\u0623\u0631\u0628\u0627\u062D" }), _jsx(MenuItem, { value: "EXPENSES", children: "\u062E\u0632\u0646\u0629 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641" })] }) }), _jsx(Grid2, { size: { xs: 12, md: 3 }, children: _jsx(TextField, { select: true, fullWidth: true, label: "\u0645\u0646 \u0648\u0633\u064A\u0644\u0629", size: "small", value: fromPaymentMethod, onChange: (e) => setFromPaymentMethod(e.target.value), children: paymentMethodOptions.map((method) => _jsx(MenuItem, { value: method, children: paymentMethodLabel(method) }, method)) }) }), _jsx(Grid2, { size: { xs: 12, md: 3 }, children: _jsxs(TextField, { select: true, fullWidth: true, label: "\u0625\u0644\u0649 \u062E\u0632\u0646\u0629", size: "small", value: toSafeType, onChange: (e) => setToSafeType(e.target.value), children: [_jsx(MenuItem, { value: "PROFITS", children: "\u062E\u0632\u0646\u0629 \u0627\u0644\u0623\u0631\u0628\u0627\u062D" }), _jsx(MenuItem, { value: "EXPENSES", children: "\u062E\u0632\u0646\u0629 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641" })] }) }), _jsx(Grid2, { size: { xs: 12, md: 3 }, children: _jsx(TextField, { select: true, fullWidth: true, label: "\u0625\u0644\u0649 \u0648\u0633\u064A\u0644\u0629", size: "small", value: toPaymentMethod, onChange: (e) => setToPaymentMethod(e.target.value), children: paymentMethodOptions.map((method) => _jsx(MenuItem, { value: method, children: paymentMethodLabel(method) }, method)) }) }), _jsx(Grid2, { size: { xs: 12, md: 6 }, children: _jsx(TextField, { fullWidth: true, label: "\u0627\u0644\u0645\u0628\u0644\u063A", size: "small", type: "number", value: transferAmount, onChange: (e) => setTransferAmount(e.target.value) }) }), _jsx(Grid2, { size: { xs: 12, md: 6 }, children: _jsx(TextField, { fullWidth: true, label: "\u0645\u0644\u0627\u062D\u0638\u0629", size: "small", value: transferNote, onChange: (e) => setTransferNote(e.target.value) }) }), _jsx(Grid2, { size: { xs: 12 }, children: _jsx(Button, { variant: "contained", onClick: submitTransfer, disabled: (fromSafeType === toSafeType && fromPaymentMethod === toPaymentMethod) || Number(transferAmount) <= 0, children: "\u062A\u0646\u0641\u064A\u0630 \u0627\u0644\u062A\u062D\u0648\u064A\u0644" }) })] }) }) }), _jsx(Grid2, { size: { xs: 12 }, children: _jsx(SectionCard, { title: "\u0633\u062D\u0628 \u0623\u0631\u0628\u0627\u062D", children: _jsxs(Grid2, { container: true, spacing: 1.5, children: [_jsx(Grid2, { size: { xs: 12, md: 4 }, children: _jsx(TextField, { select: true, fullWidth: true, label: "\u0648\u0633\u064A\u0644\u0629 \u0627\u0644\u062F\u0641\u0639", size: "small", value: profitWithdrawalMethod, onChange: (e) => setProfitWithdrawalMethod(e.target.value), children: paymentMethodOptions.map((method) => _jsx(MenuItem, { value: method, children: paymentMethodLabel(method) }, method)) }) }), _jsx(Grid2, { size: { xs: 12, md: 4 }, children: _jsx(TextField, { fullWidth: true, label: "\u0627\u0644\u0645\u0628\u0644\u063A", size: "small", type: "number", value: profitWithdrawalAmount, onChange: (e) => setProfitWithdrawalAmount(e.target.value) }) }), _jsx(Grid2, { size: { xs: 12, md: 4 }, children: _jsx(TextField, { fullWidth: true, label: "\u0645\u0644\u0627\u062D\u0638\u0629", size: "small", value: profitWithdrawalNote, onChange: (e) => setProfitWithdrawalNote(e.target.value) }) }), _jsx(Grid2, { size: { xs: 12 }, children: _jsx(Button, { variant: "outlined", color: "warning", onClick: submitProfitWithdrawal, disabled: Number(profitWithdrawalAmount) <= 0, children: "\u062A\u0633\u062C\u064A\u0644 \u0633\u062D\u0628 \u0623\u0631\u0628\u0627\u062D" }) })] }) }) })] })) : null, _jsxs(SectionCard, { title: "\u0639\u0647\u062F\u0629 \u0627\u0644\u0643\u0627\u0634\u064A\u0631 (\u0627\u0644\u062F\u0631\u062C)", children: [_jsx(MetricCard, { label: "\u0631\u0635\u064A\u062F \u0627\u0644\u0639\u0647\u062F\u0629", value: `${physicalCash.toLocaleString('en-US')} ج.م`, note: cumulative ? 'تراكمي — حركات نقدية فقط' : 'رصيد افتتاح + تحصيل نقدي معلّق + إيداع − سحب/مصروف', progress: physicalCash > 0 ? 72 : 0, tone: "#155e75" }), _jsx(Alert, { severity: "info", sx: { mt: 1.5 }, children: "\u0627\u0644\u062A\u062D\u0635\u064A\u0644 \u0627\u0644\u0646\u0642\u062F\u064A \u064A\u0632\u064A\u062F \u0627\u0644\u0639\u0647\u062F\u0629. \u0627\u0639\u062A\u0645\u0627\u062F \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u064A\u062E\u0635\u0645 \u0627\u0644\u0645\u0628\u0644\u063A \u0645\u0646 \u0627\u0644\u0639\u0647\u062F\u0629 \u0648\u064A\u0633\u062C\u0651\u0644\u0647 \u0641\u064A \u0627\u0644\u062E\u0632\u0646\u0629." })] })] }));
}
