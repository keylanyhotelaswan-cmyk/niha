import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, MenuItem, Radio, RadioGroup, Stack, Step, StepLabel, Stepper, TextField, Typography, } from '@mui/material';
import { apiShiftHandoffOptions } from '../../../lib/api.js';
import { useAuth } from '../../../lib/auth-context.js';
import { formatShiftMoney, formatShiftOpenedAt } from '../../../lib/shift-summary-utils.js';
import { ShiftCollectionBreakdown } from './shift-collection-breakdown.js';
export function ShiftCloseDialog({ open, onClose, onConfirm, summary, shiftId, shiftNumber, cashierName, openedAt, onOpenSummaryPreview, }) {
    const { accessToken } = useAuth();
    const [step, setStep] = useState(0);
    const [countedCash, setCountedCash] = useState('0');
    const [submitting, setSubmitting] = useState(false);
    const [handoffOptions, setHandoffOptions] = useState(null);
    const [handoffLoading, setHandoffLoading] = useState(false);
    const [handoffMode, setHandoffMode] = useState('successor');
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
    const needsHandoff = pending.total > 0;
    const steps = needsHandoff
        ? ['ملخص التحصيل', 'عد العهدة', 'تسليم الطلبات', 'تأكيد']
        : ['ملخص التحصيل', 'عد العهدة', 'تأكيد'];
    const confirmStep = steps.length - 1;
    const handoffStep = needsHandoff ? 2 : -1;
    const countStep = 1;
    const reset = () => {
        setStep(0);
        setCountedCash(String(expected));
        setSubmitting(false);
        setHandoffMode('successor');
        setTargetShiftId('');
        setSuccessorCashBoxId('');
    };
    useEffect(() => {
        if (open) {
            setCountedCash(String(expected));
            setStep(0);
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
            }
            else {
                setHandoffOptions(null);
            }
        })
            .finally(() => setHandoffLoading(false));
    }, [open, shiftId, accessToken]);
    const selectedTargetLabel = useMemo(() => {
        if (handoffMode === 'successor') {
            const box = handoffOptions?.cashBoxes.find((c) => c.id === successorCashBoxId);
            return `وردية جديدة على ${box?.name ?? 'نفس الخزنة'} · عهدة ${formatShiftMoney(actual)}`;
        }
        const target = handoffOptions?.openShifts.find((s) => s.id === targetShiftId);
        return target
            ? `وردية ${target.shiftNumber} · ${target.cashierName} · ${target.cashBoxName}`
            : '—';
    }, [handoffMode, handoffOptions, successorCashBoxId, targetShiftId, actual]);
    const handleClose = () => {
        reset();
        onClose();
    };
    const canAdvanceFromHandoff = handoffMode === 'successor'
        || (handoffMode === 'existing' && Boolean(targetShiftId));
    const handleConfirm = async () => {
        if (submitting)
            return;
        if (needsHandoff && handoffMode === 'existing' && !targetShiftId)
            return;
        setSubmitting(true);
        try {
            const payload = { countedCash: actual };
            if (needsHandoff) {
                payload.handoffMode = handoffMode;
                if (handoffMode === 'existing' && targetShiftId) {
                    payload.targetShiftId = targetShiftId;
                }
                if (handoffMode === 'successor') {
                    const boxId = successorCashBoxId || handoffOptions?.shift.cashBoxId;
                    if (boxId)
                        payload.successorCashBoxId = boxId;
                    payload.successorOpeningFloat = actual;
                }
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
    return (_jsxs(Dialog, { open: open, onClose: handleClose, fullWidth: true, maxWidth: "sm", children: [_jsx(DialogTitle, { children: needsHandoff ? `تسليم وإغلاق وردية ${shiftNumber ?? ''}` : `إغلاق وردية ${shiftNumber ?? ''}` }), _jsxs(DialogContent, { children: [_jsx(Stepper, { activeStep: step, sx: { mb: 2 }, children: steps.map((label) => (_jsx(Step, { children: _jsx(StepLabel, { children: label }) }, label))) }), step === 0 ? (_jsxs(Stack, { spacing: 1.5, children: [_jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["\u0627\u0644\u0643\u0627\u0634\u064A\u0631: ", cashierName ?? '—', openedAt ? ` · فتح ${formatShiftOpenedAt(openedAt)}` : ''] }), _jsxs(Typography, { children: ["\u0631\u0635\u064A\u062F \u0627\u0641\u062A\u062A\u0627\u062D: ", formatShiftMoney(Number(summary?.openingFloat ?? 0))] }), _jsxs(Typography, { children: ["\u0625\u062C\u0645\u0627\u0644\u064A \u0645\u0628\u064A\u0639\u0627\u062A: ", formatShiftMoney(Number(summary?.totalSales ?? summary?.salesTotal ?? 0))] }), _jsxs(Typography, { children: ["\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u0648\u0631\u062F\u064A\u0629: ", formatShiftMoney(Number(summary?.expensesTotal ?? summary?.outgoing ?? 0))] }), _jsxs(Typography, { children: ["\u0645\u0639\u0644\u0642 \u0627\u0639\u062A\u0645\u0627\u062F: ", formatShiftMoney(Number(summary?.pending ?? summary?.pendingCashInCustody ?? 0))] }), needsHandoff ? (_jsxs(Alert, { severity: "warning", children: [pending.uncollectedCount, " \u0637\u0644\u0628 \u0644\u0645 \u064A\u064F\u062D\u0635\u0651\u0644", pending.suspendedCount ? ` · ${pending.suspendedCount} معلّق` : '', pending.openCount ? ` · ${pending.openCount} مفتوح` : '', ' ', "\u2014 \u0633\u064A\u062A\u0645 \u0646\u0642\u0644\u0647\u0627 \u0644\u0644\u0648\u0631\u062F\u064A\u0629 \u0627\u0644\u0645\u0633\u062A\u0644\u0645\u0629 \u0648\u0644\u0646 \u062A\u0636\u064A\u0639 \u0628\u0639\u062F \u0627\u0644\u0625\u063A\u0644\u0627\u0642."] })) : null, _jsx(ShiftCollectionBreakdown, { summary: summary, compact: true }), _jsxs(Typography, { fontWeight: 800, children: ["\u0639\u0647\u062F\u0629 \u0645\u062A\u0648\u0642\u0639\u0629 (\u0646\u0642\u062F\u064A \u0641\u064A \u0627\u0644\u062F\u0631\u062C): ", formatShiftMoney(expected)] }), onOpenSummaryPreview ? (_jsx(Button, { size: "small", variant: "outlined", onClick: onOpenSummaryPreview, sx: { alignSelf: 'flex-start' }, children: "\u0639\u0631\u0636 \u0645\u0644\u062E\u0635 \u0644\u0644\u0637\u0628\u0627\u0639\u0629" })) : null] })) : null, step === countStep ? (_jsxs(Stack, { spacing: 2, children: [_jsx(TextField, { fullWidth: true, label: "\u0627\u0644\u0639\u0647\u062F\u0629 \u0627\u0644\u0641\u0639\u0644\u064A\u0629 (\u0639\u062F\u0651 \u0627\u0644\u0646\u0642\u062F)", type: "number", value: countedCash, onChange: (e) => setCountedCash(e.target.value), helperText: needsHandoff ? 'ستُسجَّل كرصيد افتتاح للوردية الجديدة عند التسليم' : undefined }), _jsx(Alert, { severity: variance === 0 ? 'success' : 'warning', children: variance === 0
                                    ? 'العهدة مطابقة للمتوقع.'
                                    : `فرق العهدة: ${variance.toLocaleString('en-US')} ج.م` })] })) : null, step === handoffStep ? (_jsx(Stack, { spacing: 2, children: handoffLoading ? (_jsx(Box, { sx: { display: 'flex', justifyContent: 'center', py: 2 }, children: _jsx(CircularProgress, { size: 28 }) })) : (_jsxs(_Fragment, { children: [_jsxs(Alert, { severity: "info", children: [pending.total, " \u0639\u0646\u0635\u0631 \u0633\u064A\u064F\u0646\u0642\u0644 \u0644\u0644\u0648\u0631\u062F\u064A\u0629 \u0627\u0644\u0645\u0633\u062A\u0644\u0645\u0629 (", formatShiftMoney(Number(summary?.uncollectedTotal ?? 0)), " \u063A\u064A\u0631 \u0645\u062D\u0635\u0651\u0644)."] }), _jsx(FormControl, { children: _jsxs(RadioGroup, { value: handoffMode, onChange: (e) => setHandoffMode(e.target.value), children: [_jsx(FormControlLabel, { value: "successor", control: _jsx(Radio, {}), label: "\u0648\u0631\u062F\u064A\u0629 \u062C\u062F\u064A\u062F\u0629 \u2014 \u0623\u0633\u0644\u0651\u0645 \u0627\u0644\u0639\u0647\u062F\u0629 \u0648\u0627\u0644\u0637\u0644\u0628\u0627\u062A (\u0646\u0641\u0633 \u0627\u0644\u062E\u0632\u0646\u0629 \u0623\u0648 \u062E\u0632\u0646\u0629 \u0623\u062E\u0631\u0649)" }), _jsx(FormControlLabel, { value: "existing", control: _jsx(Radio, {}), disabled: !handoffOptions?.openShifts.length, label: `وردية مفتوحة أخرى${handoffOptions?.openShifts.length ? '' : ' (لا توجد حالياً)'}` })] }) }), handoffMode === 'successor' ? (_jsx(TextField, { select: true, fullWidth: true, label: "\u062E\u0632\u0646\u0629 \u0627\u0644\u0648\u0631\u062F\u064A\u0629 \u0627\u0644\u062C\u062F\u064A\u062F\u0629", value: successorCashBoxId || handoffOptions?.shift.cashBoxId || '', onChange: (e) => setSuccessorCashBoxId(e.target.value), children: (handoffOptions?.cashBoxes ?? []).map((box) => (_jsx(MenuItem, { value: box.id, children: box.name }, box.id))) })) : (_jsxs(TextField, { select: true, fullWidth: true, label: "\u0648\u0631\u062F\u064A\u0629 \u0627\u0644\u0645\u0633\u062A\u0644\u0645", value: targetShiftId, onChange: (e) => setTargetShiftId(e.target.value), children: [_jsx(MenuItem, { value: "", children: "\u0627\u062E\u062A\u0631 \u0648\u0631\u062F\u064A\u0629..." }), (handoffOptions?.openShifts ?? []).map((s) => (_jsxs(MenuItem, { value: s.id, children: [s.shiftNumber, " \u00B7 ", s.cashierName, " \u00B7 ", s.cashBoxName] }, s.id)))] }))] })) })) : null, step === confirmStep ? (_jsxs(Stack, { spacing: 1, children: [_jsxs(Typography, { children: ["\u0639\u0647\u062F\u0629 \u0645\u062A\u0648\u0642\u0639\u0629: ", formatShiftMoney(expected)] }), _jsxs(Typography, { children: ["\u0639\u0647\u062F\u0629 \u0641\u0639\u0644\u064A\u0629: ", formatShiftMoney(actual)] }), _jsxs(Typography, { fontWeight: 800, children: ["\u0641\u0631\u0642: ", formatShiftMoney(variance)] }), needsHandoff ? (_jsxs(Typography, { variant: "body2", color: "primary.main", fontWeight: 700, children: ["\u0627\u0644\u062A\u0633\u0644\u064A\u0645 \u0625\u0644\u0649: ", selectedTargetLabel] })) : null, _jsx(Typography, { variant: "body2", color: "text.secondary", children: needsHandoff
                                    ? 'بعد التأكيد: تُغلق ورديتك، تُنقل الطلبات غير المحصّلة، وتُفتح وردية جديدة بالعهدة إن اخترت ذلك.'
                                    : 'بعد التأكيد ستُغلق الوردية ولا يمكن إضافة حركات عليها.' }), onOpenSummaryPreview ? (_jsx(Button, { size: "small", variant: "outlined", onClick: onOpenSummaryPreview, sx: { alignSelf: 'flex-start', mt: 1 }, children: "\u0639\u0631\u0636 \u0645\u0644\u062E\u0635 \u0644\u0644\u0637\u0628\u0627\u0639\u0629" })) : null] })) : null] }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: handleClose, children: "\u0625\u0644\u063A\u0627\u0621" }), step > 0 ? _jsx(Button, { onClick: () => setStep((s) => s - 1), children: "\u0631\u062C\u0648\u0639" }) : null, step < confirmStep ? (_jsx(Button, { variant: "contained", disabled: step === handoffStep && (!canAdvanceFromHandoff || handoffLoading), onClick: () => setStep((s) => s + 1), children: "\u0627\u0644\u062A\u0627\u0644\u064A" })) : (_jsx(Button, { variant: "contained", disabled: submitting, onClick: handleConfirm, children: needsHandoff ? 'تأكيد التسليم والإغلاق' : 'تأكيد الإغلاق' }))] })] }));
}
