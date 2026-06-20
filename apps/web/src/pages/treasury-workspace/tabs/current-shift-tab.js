import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Button, Chip, Grid2, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, } from '@mui/material';
import { useState } from 'react';
import { MetricCard, SectionCard } from '../../shared.js';
import { useAuth } from '../../../lib/auth-context.js';
import { apiCreateMovement, apiOpenShift } from '../../../lib/api.js';
import { isIncomingTransaction, mapMovementTypeToApi, paymentMethodLabel, safeTypeLabel, treasuryTypeLabel, } from '../../../lib/treasury-store.js';
import { ShiftCloseDialog } from '../components/shift-close-dialog.js';
import { useShiftMutations } from '../../../lib/hooks.js';
const manualMovementOptions = [
    { value: 'CASH_DEPOSIT', label: 'إيداع نقدي' },
    { value: 'CASH_WITHDRAWAL', label: 'سحب من الخزنة' },
    { value: 'OPERATING_EXPENSE', label: 'مصروف تشغيلي' },
];
const paymentMethodOptions = ['CASH', 'INSTAPAY', 'WALLET', 'CARD'];
export function CurrentShiftTab({ workspace, branchId, cashBoxId, onRefresh, onMessage }) {
    const { accessToken } = useAuth();
    const { closeShift } = useShiftMutations();
    const perms = workspace?.permissions ?? {};
    const currentShift = workspace?.currentShift;
    const shift = currentShift?.shift;
    const summary = currentShift?.summary;
    const shiftOpen = currentShift?.shiftOpen ?? false;
    const transactions = workspace?.shiftTransactions ?? [];
    const [openingFloat, setOpeningFloat] = useState('0');
    const [movementType, setMovementType] = useState('CASH_DEPOSIT');
    const [movementSafeType, setMovementSafeType] = useState('EXPENSES');
    const [movementPaymentMethod, setMovementPaymentMethod] = useState('CASH');
    const [movementAmount, setMovementAmount] = useState('0');
    const [movementNote, setMovementNote] = useState('');
    const [closeOpen, setCloseOpen] = useState(false);
    const expectedCash = Number(summary?.expectedCash ?? 0);
    const cashierName = shift?.openedBy?.fullName ?? '—';
    const treasuryStats = [
        { label: 'رصيد الافتتاح', value: `${Number(summary?.openingFloat ?? 0).toLocaleString('en-US')} ج.م`, note: shiftOpen ? 'وردية نشطة' : '—', progress: 100, tone: '#0f766e' },
        { label: 'عهدة الكاشير', value: `${expectedCash.toLocaleString('en-US')} ج.م`, note: 'نقدي في الدرج — يزيد بالتحصيل وينقص بالاعتماد', progress: 76, tone: '#155e75' },
        { label: 'مبيعات الوردية', value: `${Number(summary?.totalSales ?? 0).toLocaleString('en-US')} ج.م`, note: 'كل طرق الدفع', progress: 68, tone: '#7c3aed' },
        { label: 'بانتظار اعتماد', value: `${Number(summary?.pendingCashInCustody ?? summary?.pending ?? 0).toLocaleString('en-US')} ج.م`, note: 'نقدي في العهدة حتى تعتمده', progress: Number(summary?.pendingCashInCustody ?? 0) > 0 ? 58 : 0, tone: '#b45309' },
    ];
    const toggleShift = async () => {
        if (!accessToken || !branchId || !cashBoxId)
            return;
        if (shiftOpen) {
            setCloseOpen(true);
            return;
        }
        const res = await apiOpenShift({
            branchId,
            cashBoxId,
            openingFloat: Number(openingFloat) || 0,
        }, accessToken);
        if (res.ok) {
            onMessage('تم فتح الوردية.');
            onRefresh();
        }
        else {
            onMessage(`فشل فتح الوردية: ${res.body ?? res.error}`);
        }
    };
    const addMovement = async () => {
        const amount = Number(movementAmount);
        if (!shiftOpen || !shift || amount <= 0 || !movementNote.trim() || !accessToken)
            return;
        const res = await apiCreateMovement({
            branchId,
            cashBoxId,
            shiftId: shift.id,
            movementType: mapMovementTypeToApi(movementType),
            safeType: movementType === 'OPERATING_EXPENSE' ? 'EXPENSES' : movementSafeType,
            paymentMethod: movementPaymentMethod,
            amount,
            note: movementNote.trim(),
        }, accessToken);
        if (res.ok) {
            setMovementAmount('0');
            setMovementNote('');
            onMessage('تمت إضافة الحركة.');
            onRefresh();
        }
        else {
            onMessage(`فشل: ${res.body ?? res.error}`);
        }
    };
    const handleCloseShift = async (countedCash) => {
        if (!shift)
            return;
        try {
            await closeShift.mutateAsync({
                shiftId: shift.id,
                countedCash,
                note: 'إغلاق وردية من مساحة الخزنة',
            });
            onMessage('تم إغلاق الوردية.');
            onRefresh();
        }
        catch (e) {
            onMessage(e.message ?? 'فشل إغلاق الوردية');
            throw e;
        }
    };
    return (_jsxs(Stack, { spacing: 2, children: [_jsx(SectionCard, { title: "\u0627\u0644\u0648\u0631\u062F\u064A\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629", action: _jsx(Chip, { label: shiftOpen ? 'مفتوحة' : 'مغلقة', color: shiftOpen ? 'success' : 'default' }), children: _jsx(Stack, { spacing: 1, children: _jsx(Typography, { variant: "body2", color: "text.secondary", children: shift
                            ? `${shift.shiftNumber} · ${cashierName} · ${new Date(shift.openedAt).toLocaleString('ar-EG')}`
                            : 'لا توجد وردية مفتوحة على هذه الخزنة' }) }) }), _jsx(Grid2, { container: true, spacing: 2, children: treasuryStats.map((stat) => (_jsx(Grid2, { size: { xs: 12, sm: 6, xl: 3 }, children: _jsx(MetricCard, { ...stat }) }, stat.label))) }), perms.canManageShift ? (_jsxs(Grid2, { container: true, spacing: 2, children: [_jsx(Grid2, { size: { xs: 12, lg: 5 }, children: _jsx(SectionCard, { title: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0648\u0631\u062F\u064A\u0629", children: _jsxs(Stack, { spacing: 1.5, children: [!shiftOpen ? (_jsx(TextField, { label: "\u0631\u0635\u064A\u062F \u0627\u0644\u0627\u0641\u062A\u062A\u0627\u062D", size: "small", type: "number", value: openingFloat, onChange: (e) => setOpeningFloat(e.target.value) })) : null, _jsx(Button, { variant: shiftOpen ? 'outlined' : 'contained', onClick: toggleShift, children: shiftOpen ? 'إغلاق الوردية' : 'فتح وردية' })] }) }) }), _jsx(Grid2, { size: { xs: 12, lg: 7 }, children: _jsxs(SectionCard, { title: "\u062D\u0631\u0643\u0627\u062A \u064A\u062F\u0648\u064A\u0629", children: [_jsxs(Grid2, { container: true, spacing: 1.5, children: [_jsx(Grid2, { size: { xs: 12, md: 6 }, children: _jsx(TextField, { select: true, fullWidth: true, label: "\u0646\u0648\u0639 \u0627\u0644\u062D\u0631\u0643\u0629", size: "small", value: movementType, onChange: (e) => setMovementType(e.target.value), children: manualMovementOptions.map((o) => _jsx(MenuItem, { value: o.value, children: o.label }, o.value)) }) }), _jsx(Grid2, { size: { xs: 12, md: 6 }, children: _jsxs(TextField, { select: true, fullWidth: true, label: "\u0627\u0644\u062E\u0632\u0646\u0629", size: "small", value: movementType === 'OPERATING_EXPENSE' ? 'EXPENSES' : movementSafeType, onChange: (e) => setMovementSafeType(e.target.value), disabled: movementType === 'OPERATING_EXPENSE', children: [_jsx(MenuItem, { value: "EXPENSES", children: "\u062E\u0632\u0646\u0629 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641" }), _jsx(MenuItem, { value: "PROFITS", children: "\u062E\u0632\u0646\u0629 \u0627\u0644\u0623\u0631\u0628\u0627\u062D" })] }) }), _jsx(Grid2, { size: { xs: 12, md: 6 }, children: _jsx(TextField, { select: true, fullWidth: true, label: "\u0648\u0633\u064A\u0644\u0629 \u0627\u0644\u062F\u0641\u0639", size: "small", value: movementPaymentMethod, onChange: (e) => setMovementPaymentMethod(e.target.value), children: paymentMethodOptions.map((method) => _jsx(MenuItem, { value: method, children: paymentMethodLabel(method) }, method)) }) }), _jsx(Grid2, { size: { xs: 12, md: 6 }, children: _jsx(TextField, { fullWidth: true, label: "\u0627\u0644\u0645\u0628\u0644\u063A", size: "small", type: "number", value: movementAmount, onChange: (e) => setMovementAmount(e.target.value) }) }), _jsx(Grid2, { size: { xs: 12 }, children: _jsx(TextField, { fullWidth: true, label: "\u0645\u0644\u0627\u062D\u0638\u0629", size: "small", value: movementNote, onChange: (e) => setMovementNote(e.target.value) }) }), _jsx(Grid2, { size: { xs: 12 }, children: _jsx(Button, { variant: "contained", onClick: addMovement, disabled: !shiftOpen || Number(movementAmount) <= 0 || !movementNote.trim(), children: "\u0625\u0636\u0627\u0641\u0629 \u062D\u0631\u0643\u0629" }) })] }), !shiftOpen ? _jsx(Alert, { severity: "info", sx: { mt: 1 }, children: "\u0627\u0641\u062A\u062D \u0648\u0631\u062F\u064A\u0629 \u0644\u0625\u0636\u0627\u0641\u0629 \u062D\u0631\u0643\u0627\u062A." }) : null] }) })] })) : null, _jsxs(SectionCard, { title: "\u0633\u062C\u0644 \u062D\u0631\u0643\u0627\u062A \u0627\u0644\u0648\u0631\u062F\u064A\u0629", children: [_jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u0627\u0644\u0648\u0642\u062A" }), _jsx(TableCell, { children: "\u0627\u0644\u0646\u0648\u0639" }), _jsx(TableCell, { children: "\u0627\u0644\u062E\u0632\u0646\u0629" }), _jsx(TableCell, { children: "\u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0629" }), _jsx(TableCell, { children: "\u0627\u0644\u062F\u0641\u0639" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u0645\u0628\u0644\u063A" })] }) }), _jsx(TableBody, { children: transactions.map((tx) => {
                                    const incoming = isIncomingTransaction(tx.transactionType);
                                    return (_jsxs(TableRow, { hover: true, children: [_jsx(TableCell, { children: new Date(tx.occurredAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) }), _jsx(TableCell, { children: treasuryTypeLabel(tx.transactionType, tx.sourceType) }), _jsx(TableCell, { children: safeTypeLabel(tx.safeType) }), _jsx(TableCell, { children: tx.note }), _jsx(TableCell, { children: paymentMethodLabel(tx.paymentMethod) }), _jsxs(TableCell, { align: "left", sx: { color: incoming ? '#0f766e' : '#b45309', fontWeight: 700 }, children: [incoming ? '+' : '-', " ", Number(tx.amount).toLocaleString('en-US'), " \u062C.\u0645"] })] }, tx.id));
                                }) })] }), transactions.length === 0 ? _jsx(Alert, { severity: "info", sx: { mt: 1 }, children: "\u0644\u0627 \u062A\u0648\u062C\u062F \u062D\u0631\u0643\u0627\u062A." }) : null] }), _jsx(ShiftCloseDialog, { open: closeOpen, onClose: () => setCloseOpen(false), onConfirm: handleCloseShift, summary: summary, shiftNumber: shift?.shiftNumber, cashierName: cashierName })] }));
}
