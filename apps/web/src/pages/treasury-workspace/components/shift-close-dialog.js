import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, MenuItem, Radio, RadioGroup, Stack, Step, StepLabel, Stepper, TextField, Typography, } from '@mui/material';
import { apiShiftHandoffOptions } from '../../../lib/api.js';
import { useAuth } from '../../../lib/auth-context.js';
import { formatShiftMoney, formatShiftOpenedAt } from '../../../lib/shift-summary-utils.js';
import { ShiftCollectionBreakdown } from './shift-collection-breakdown.js';
const STEPS = ['ملخص التحصيل', 'عد العهدة', 'تسليم العهدة', 'تأكيد'];
export function ShiftCloseDialog({ open, onClose, onConfirm, summary, shiftId, shiftNumber, cashierName, openedAt, onOpenSummaryPreview, }) {
    const { accessToken } = useAuth();
    const [step, setStep] = useState(0);
    const [countedCash, setCountedCash] = useState('0');
    const [submitting, setSubmitting] = useState(false);
    const [handoffOptions, setHandoffOptions] = useState(null);
    const [handoffLoading, setHandoffLoading] = useState(false);
    const [handoffMode, setHandoffMode] = useState('defer');
    const [targetShiftId, setTargetShiftId] = useState('');
    const [successorCashBoxId, setSuccessorCashBoxId] = useState('');
    const expected = Number(summary?.expectedCash ?? 0);
    const actual = Number(countedCash) || 0;
    const variance = actual - expected;
    const pending = handoffOptions?.pending ?? {
        uncollectedCount: Number(summary?.uncollectedCount ?? 0),
        suspendedCount: Number(summary?.suspendedCount ?? 0),
        openCount: 0,
        total: Number(summary?.uncollectedCount ?? 0) + Number(summary?.suspendedCount ?? 0),
    };
    const hasPendingOrders = pending.total > 0;
    const confirmStep = STEPS.length - 1;
    const handoffStep = 2;
    const countStep = 1;
    const canOpenSuccessor = handoffOptions?.canOpenSuccessor !== false && !handoffOptions?.hasOpenShiftOnCashBox;
    const reset = () => {
        setStep(0);
        setCountedCash(String(expected));
        setSubmitting(false);
        setHandoffMode('defer');
        setTargetShiftId('');
        setSuccessorCashBoxId('');
    };
    useEffect(() => {
        if (open) {
            setCountedCash(String(expected));
            setStep(0);
            setHandoffMode('defer');
        }
    }, [open, expected]);
    useEffect(() => {
        if (!open || !shiftId || !accessToken) {
            setHandoffOptions(null);
            return;
        }
        setHandoffLoading(true);
        void apiShiftHandoffOptions(shiftId, accessToken)
            .then((res) => {
            if (res.ok && res.data) {
                setHandoffOptions(res.data);
                setSuccessorCashBoxId(res.data.shift.cashBoxId);
                if (res.data.hasOpenShiftOnCashBox && handoffMode === 'successor') {
                    setHandoffMode('defer');
                }
            }
            else {
                setHandoffOptions(null);
            }
        })
            .finally(() => setHandoffLoading(false));
    }, [open, shiftId, accessToken]);
    const selectedTargetLabel = useMemo(() => {
        if (handoffMode === 'defer') {
            return `تسليم ${formatShiftMoney(actual)} للكاشير التالي على ${handoffOptions?.shift.cashBoxName ?? 'نفس الخزنة'}`;
        }
        if (handoffMode === 'treasury') {
            return `تسليم ${formatShiftMoney(actual)} للإدارة (الخزنة الرئيسية)`;
        }
        if (handoffMode === 'successor') {
            const box = handoffOptions?.cashBoxes.find((c) => c.id === successorCashBoxId);
            return `وردية جديدة على ${box?.name ?? 'نفس الخزنة'} · عهدة ${formatShiftMoney(actual)}`;
        }
        const target = handoffOptions?.openShifts.find((s) => s.id === targetShiftId);
        return target
            ? `نقل الطلبات إلى وردية ${target.shiftNumber} · ${target.cashierName}`
            : '—';
    }, [handoffMode, handoffOptions, successorCashBoxId, targetShiftId, actual]);
    const handleClose = () => {
        reset();
        onClose();
    };
    const canAdvanceFromHandoff = handoffMode === 'defer'
        || handoffMode === 'treasury'
        || handoffMode === 'successor'
        || (handoffMode === 'existing' && Boolean(targetShiftId));
    const handleConfirm = async () => {
        if (submitting)
            return;
        if (handoffMode === 'existing' && !targetShiftId)
            return;
        setSubmitting(true);
        try {
            const payload = {
                countedCash: actual,
                handoffMode,
            };
            if (handoffMode === 'existing' && targetShiftId) {
                payload.targetShiftId = targetShiftId;
            }
            if (handoffMode === 'successor') {
                const boxId = successorCashBoxId || handoffOptions?.shift.cashBoxId;
                if (boxId)
                    payload.successorCashBoxId = boxId;
                payload.successorOpeningFloat = actual;
            }
            await onConfirm(payload);
            handleClose();
        }
        catch {
            /* keep dialog open; caller shows error */
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs(Dialog, { open: open, onClose: handleClose, fullWidth: true, maxWidth: "sm", children: [_jsx(DialogTitle, { children: `تسليم وإغلاق وردية ${shiftNumber ?? ''}` }), _jsxs(DialogContent, { children: [_jsx(Stepper, { activeStep: step, sx: { mb: 2 }, children: STEPS.map((label) => (_jsx(Step, { children: _jsx(StepLabel, { children: label }) }, label))) }), step === 0 ? (_jsxs(Stack, { spacing: 1.5, children: [_jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["\u0627\u0644\u0643\u0627\u0634\u064A\u0631: ", cashierName ?? '—', openedAt ? ` · فتح ${formatShiftOpenedAt(openedAt)}` : ''] }), _jsxs(Typography, { children: ["\u0631\u0635\u064A\u062F \u0627\u0641\u062A\u062A\u0627\u062D: ", formatShiftMoney(Number(summary?.openingFloat ?? 0))] }), _jsxs(Typography, { children: ["\u0625\u062C\u0645\u0627\u0644\u064A \u0645\u0628\u064A\u0639\u0627\u062A: ", formatShiftMoney(Number(summary?.totalSales ?? summary?.salesTotal ?? 0))] }), _jsxs(Typography, { children: ["\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u0648\u0631\u062F\u064A\u0629: ", formatShiftMoney(Number(summary?.expensesTotal ?? summary?.outgoing ?? 0))] }), _jsxs(Typography, { children: ["\u0645\u0639\u0644\u0642 \u0627\u0639\u062A\u0645\u0627\u062F: ", formatShiftMoney(Number(summary?.pending ?? summary?.pendingCashInCustody ?? 0))] }), hasPendingOrders ? (_jsxs(Alert, { severity: "info", children: [pending.uncollectedCount, " \u0637\u0644\u0628 \u0644\u0645 \u064A\u064F\u062D\u0635\u0651\u0644", pending.suspendedCount ? ` · ${pending.suspendedCount} معلّق` : '', pending.openCount ? ` · ${pending.openCount} مفتوح` : '', ' ', "\u2014 \u0633\u062A\u0628\u0642\u0649 \u0639\u0644\u0649 \u0627\u0644\u062E\u0632\u0646\u0629 \u0643\u062A\u0630\u0643\u064A\u0631 \u0644\u0644\u0643\u0627\u0634\u064A\u0631 \u0627\u0644\u062A\u0627\u0644\u064A (\u0628\u062F\u0648\u0646 \u0641\u062A\u062D \u0648\u0631\u062F\u064A\u0629 \u062C\u062F\u064A\u062F\u0629)."] })) : null, _jsx(ShiftCollectionBreakdown, { summary: summary, compact: true }), _jsxs(Typography, { fontWeight: 800, children: ["\u0639\u0647\u062F\u0629 \u0645\u062A\u0648\u0642\u0639\u0629 (\u0646\u0642\u062F\u064A \u0641\u064A \u0627\u0644\u062F\u0631\u062C): ", formatShiftMoney(expected)] }), onOpenSummaryPreview ? (_jsx(Button, { size: "small", variant: "outlined", onClick: onOpenSummaryPreview, sx: { alignSelf: 'flex-start' }, children: "\u0639\u0631\u0636 \u0645\u0644\u062E\u0635 \u0644\u0644\u0637\u0628\u0627\u0639\u0629" })) : null] })) : null, step === countStep ? (_jsxs(Stack, { spacing: 2, children: [_jsx(TextField, { fullWidth: true, label: "\u0627\u0644\u0639\u0647\u062F\u0629 \u0627\u0644\u0641\u0639\u0644\u064A\u0629 (\u0639\u062F\u0651 \u0627\u0644\u0646\u0642\u062F)", type: "number", value: countedCash, onChange: (e) => setCountedCash(e.target.value), helperText: "\u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0630\u064A \u062A\u0633\u0644\u0651\u0645\u0647 \u0644\u0644\u0643\u0627\u0634\u064A\u0631 \u0627\u0644\u062A\u0627\u0644\u064A \u0623\u0648 \u0644\u0644\u0625\u062F\u0627\u0631\u0629" }), _jsx(Alert, { severity: variance === 0 ? 'success' : 'warning', children: variance === 0
                                    ? 'العهدة مطابقة للمتوقع.'
                                    : `فرق العهدة: ${variance.toLocaleString('en-US')} ج.م` })] })) : null, step === handoffStep ? (_jsx(Stack, { spacing: 2, children: handoffLoading ? (_jsx(Box, { sx: { display: 'flex', justifyContent: 'center', py: 2 }, children: _jsx(CircularProgress, { size: 28 }) })) : (_jsxs(_Fragment, { children: [handoffOptions?.hasOpenShiftOnCashBox ? (_jsx(Alert, { severity: "warning", children: "\u062A\u0648\u062C\u062F \u0648\u0631\u062F\u064A\u0629 \u0645\u0641\u062A\u0648\u062D\u0629 \u0639\u0644\u0649 \u0647\u0630\u0647 \u0627\u0644\u062E\u0632\u0646\u0629 \u2014 \u0644\u0646 \u062A\u064F\u0641\u062A\u062D \u0648\u0631\u062F\u064A\u0629 \u062C\u062F\u064A\u062F\u0629. \u0633\u0644\u0651\u0645 \u0627\u0644\u0639\u0647\u062F\u0629 \u0644\u0644\u0643\u0627\u0634\u064A\u0631 \u0627\u0644\u062A\u0627\u0644\u064A \u0623\u0648 \u0644\u0644\u0625\u062F\u0627\u0631\u0629." })) : null, _jsx(FormControl, { children: _jsxs(RadioGroup, { value: handoffMode, onChange: (e) => setHandoffMode(e.target.value), children: [_jsx(FormControlLabel, { value: "defer", control: _jsx(Radio, {}), label: `تسليم للكاشير التالي — ${formatShiftMoney(actual)} تُستلم عند فتح الوردية القادمة` }), _jsx(FormControlLabel, { value: "treasury", control: _jsx(Radio, {}), label: "\u062A\u0633\u0644\u064A\u0645 \u0644\u0644\u0625\u062F\u0627\u0631\u0629 \u2014 \u0625\u064A\u062F\u0627\u0639 \u0627\u0644\u0639\u0647\u062F\u0629 \u0641\u064A \u0627\u0644\u062E\u0632\u0646\u0629 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629" }), _jsx(FormControlLabel, { value: "existing", control: _jsx(Radio, {}), disabled: !handoffOptions?.openShifts.length, label: `نقل الطلبات لوردية مفتوحة${handoffOptions?.openShifts.length ? '' : ' (لا توجد حالياً)'}` }), canOpenSuccessor ? (_jsx(FormControlLabel, { value: "successor", control: _jsx(Radio, {}), label: "\u0641\u062A\u062D \u0648\u0631\u062F\u064A\u0629 \u062C\u062F\u064A\u062F\u0629 \u2014 \u062A\u0633\u0644\u064A\u0645 \u0627\u0644\u0639\u0647\u062F\u0629 \u0645\u0628\u0627\u0634\u0631\u0629 (\u0644\u0627 \u062A\u0648\u062C\u062F \u0648\u0631\u062F\u064A\u0629 \u0645\u0641\u062A\u0648\u062D\u0629 \u0639\u0644\u0649 \u0627\u0644\u062E\u0632\u0646\u0629)" })) : null] }) }), handoffMode === 'successor' ? (_jsx(TextField, { select: true, fullWidth: true, label: "\u062E\u0632\u0646\u0629 \u0627\u0644\u0648\u0631\u062F\u064A\u0629 \u0627\u0644\u062C\u062F\u064A\u062F\u0629", value: successorCashBoxId || handoffOptions?.shift.cashBoxId || '', onChange: (e) => setSuccessorCashBoxId(e.target.value), children: (handoffOptions?.cashBoxes ?? []).map((box) => (_jsx(MenuItem, { value: box.id, children: box.name }, box.id))) })) : null, handoffMode === 'existing' ? (_jsxs(TextField, { select: true, fullWidth: true, label: "\u0648\u0631\u062F\u064A\u0629 \u0627\u0644\u0645\u0633\u062A\u0644\u0645 (\u0644\u0646\u0642\u0644 \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0641\u0642\u0637)", value: targetShiftId, onChange: (e) => setTargetShiftId(e.target.value), children: [_jsx(MenuItem, { value: "", children: "\u0627\u062E\u062A\u0631 \u0648\u0631\u062F\u064A\u0629..." }), (handoffOptions?.openShifts ?? []).map((s) => (_jsxs(MenuItem, { value: s.id, children: [s.shiftNumber, " \u00B7 ", s.cashierName, " \u00B7 ", s.cashBoxName] }, s.id)))] })) : null] })) })) : null, step === confirmStep ? (_jsxs(Stack, { spacing: 1, children: [_jsxs(Typography, { children: ["\u0639\u0647\u062F\u0629 \u0645\u062A\u0648\u0642\u0639\u0629: ", formatShiftMoney(expected)] }), _jsxs(Typography, { children: ["\u0639\u0647\u062F\u0629 \u0641\u0639\u0644\u064A\u0629: ", formatShiftMoney(actual)] }), _jsxs(Typography, { fontWeight: 800, children: ["\u0641\u0631\u0642: ", formatShiftMoney(variance)] }), _jsx(Typography, { variant: "body2", color: "primary.main", fontWeight: 700, children: selectedTargetLabel }), _jsxs(Typography, { variant: "body2", color: "text.secondary", children: [handoffMode === 'defer'
                                        ? 'بعد التأكيد: تُغلق ورديتك. عند فتح الكاشير التالي وردية على نفس الخزنة ستظهر رسالة باسمك ومبلغ العهدة.'
                                        : handoffMode === 'treasury'
                                            ? 'بعد التأكيد: تُغلق الوردية ويُسجَّل إيداع العهدة للإدارة.'
                                            : handoffMode === 'existing'
                                                ? 'بعد التأكيد: تُغلق ورديتك وتُنقل الطلبات غير المكتملة للوردية المختارة.'
                                                : 'بعد التأكيد: تُغلق ورديتك وتُفتح وردية جديدة بالعهدة.', hasPendingOrders && handoffMode !== 'existing'
                                        ? ' الطلبات غير المحصّلة تبقى على الخزنة كتذكير.'
                                        : ''] }), onOpenSummaryPreview ? (_jsx(Button, { size: "small", variant: "outlined", onClick: onOpenSummaryPreview, sx: { alignSelf: 'flex-start', mt: 1 }, children: "\u0639\u0631\u0636 \u0645\u0644\u062E\u0635 \u0644\u0644\u0637\u0628\u0627\u0639\u0629" })) : null] })) : null] }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: handleClose, children: "\u0625\u0644\u063A\u0627\u0621" }), step > 0 ? _jsx(Button, { onClick: () => setStep((s) => s - 1), children: "\u0631\u062C\u0648\u0639" }) : null, step < confirmStep ? (_jsx(Button, { variant: "contained", disabled: step === handoffStep && (!canAdvanceFromHandoff || handoffLoading), onClick: () => setStep((s) => s + 1), children: "\u0627\u0644\u062A\u0627\u0644\u064A" })) : (_jsx(Button, { variant: "contained", disabled: submitting, onClick: handleConfirm, children: "\u062A\u0623\u0643\u064A\u062F \u0627\u0644\u062A\u0633\u0644\u064A\u0645 \u0648\u0627\u0644\u0625\u063A\u0644\u0627\u0642" }))] })] }));
}
