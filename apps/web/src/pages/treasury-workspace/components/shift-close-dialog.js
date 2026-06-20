import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Step, StepLabel, Stepper, TextField, Typography, Alert, } from '@mui/material';
import { paymentMethodLabel } from '../../../lib/treasury-store.js';
export function ShiftCloseDialog({ open, onClose, onConfirm, summary, shiftNumber, cashierName, }) {
    const [step, setStep] = useState(0);
    const [countedCash, setCountedCash] = useState('0');
    const [submitting, setSubmitting] = useState(false);
    const expected = Number(summary?.expectedCash ?? 0);
    const actual = Number(countedCash) || 0;
    const variance = actual - expected;
    const reset = () => {
        setStep(0);
        setCountedCash(String(expected));
        setSubmitting(false);
    };
    useEffect(() => {
        if (open) {
            setCountedCash(String(expected));
            setStep(0);
        }
    }, [open, expected]);
    const handleClose = () => {
        reset();
        onClose();
    };
    const handleConfirm = async () => {
        if (submitting)
            return;
        setSubmitting(true);
        try {
            await onConfirm(actual);
            handleClose();
        }
        catch {
            /* keep dialog open; caller shows error */
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs(Dialog, { open: open, onClose: handleClose, fullWidth: true, maxWidth: "sm", children: [_jsxs(DialogTitle, { children: ["\u0625\u063A\u0644\u0627\u0642 \u0648\u0631\u062F\u064A\u0629 ", shiftNumber ?? ''] }), _jsxs(DialogContent, { children: [_jsxs(Stepper, { activeStep: step, sx: { mb: 2 }, children: [_jsx(Step, { children: _jsx(StepLabel, { children: "\u0645\u0644\u062E\u0635 \u0627\u0644\u062A\u062D\u0635\u064A\u0644" }) }), _jsx(Step, { children: _jsx(StepLabel, { children: "\u0639\u062F \u0627\u0644\u0639\u0647\u062F\u0629" }) }), _jsx(Step, { children: _jsx(StepLabel, { children: "\u062A\u0623\u0643\u064A\u062F" }) })] }), step === 0 ? (_jsxs(Stack, { spacing: 1, children: [_jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["\u0627\u0644\u0643\u0627\u0634\u064A\u0631: ", cashierName ?? '—'] }), _jsxs(Typography, { children: ["\u0631\u0635\u064A\u062F \u0627\u0641\u062A\u062A\u0627\u062D: ", Number(summary?.openingFloat ?? 0).toLocaleString('en-US'), " \u062C.\u0645"] }), _jsxs(Typography, { children: ["\u0625\u062C\u0645\u0627\u0644\u064A \u0645\u0628\u064A\u0639\u0627\u062A: ", Number(summary?.totalSales ?? summary?.salesTotal ?? 0).toLocaleString('en-US'), " \u062C.\u0645"] }), _jsxs(Typography, { children: ["\u0645\u0639\u0644\u0642 \u0627\u0639\u062A\u0645\u0627\u062F: ", Number(summary?.pending ?? summary?.pendingCashInCustody ?? 0).toLocaleString('en-US'), " \u062C.\u0645"] }), Object.entries(summary?.byPaymentMethod ?? {}).map(([method, vals]) => (_jsxs(Typography, { variant: "body2", children: [paymentMethodLabel(method), ": \u0645\u0639\u062A\u0645\u062F ", vals.approved.toLocaleString('en-US'), " / \u0645\u0639\u0644\u0642 ", vals.pending.toLocaleString('en-US')] }, method))), _jsxs(Typography, { fontWeight: 800, children: ["\u0639\u0647\u062F\u0629 \u0645\u062A\u0648\u0642\u0639\u0629: ", expected.toLocaleString('en-US'), " \u062C.\u0645"] })] })) : null, step === 1 ? (_jsxs(Stack, { spacing: 2, children: [_jsx(TextField, { fullWidth: true, label: "\u0627\u0644\u0639\u0647\u062F\u0629 \u0627\u0644\u0641\u0639\u0644\u064A\u0629 (\u0639\u062F\u0651 \u0627\u0644\u0646\u0642\u062F)", type: "number", value: countedCash, onChange: (e) => setCountedCash(e.target.value) }), _jsx(Alert, { severity: variance === 0 ? 'success' : 'warning', children: variance === 0
                                    ? 'العهدة مطابقة للمتوقع.'
                                    : `فرق العهدة: ${variance.toLocaleString('en-US')} ج.م` })] })) : null, step === 2 ? (_jsxs(Stack, { spacing: 1, children: [_jsxs(Typography, { children: ["\u0639\u0647\u062F\u0629 \u0645\u062A\u0648\u0642\u0639\u0629: ", expected.toLocaleString('en-US'), " \u062C.\u0645"] }), _jsxs(Typography, { children: ["\u0639\u0647\u062F\u0629 \u0641\u0639\u0644\u064A\u0629: ", actual.toLocaleString('en-US'), " \u062C.\u0645"] }), _jsxs(Typography, { fontWeight: 800, children: ["\u0641\u0631\u0642: ", variance.toLocaleString('en-US'), " \u062C.\u0645"] }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u0628\u0639\u062F \u0627\u0644\u062A\u0623\u0643\u064A\u062F \u0633\u062A\u064F\u063A\u0644\u0642 \u0627\u0644\u0648\u0631\u062F\u064A\u0629 \u0648\u0644\u0627 \u064A\u0645\u0643\u0646 \u0625\u0636\u0627\u0641\u0629 \u062D\u0631\u0643\u0627\u062A \u0639\u0644\u064A\u0647\u0627." })] })) : null] }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: handleClose, children: "\u0625\u0644\u063A\u0627\u0621" }), step > 0 ? _jsx(Button, { onClick: () => setStep((s) => s - 1), children: "\u0631\u062C\u0648\u0639" }) : null, step < 2 ? (_jsx(Button, { variant: "contained", onClick: () => setStep((s) => s + 1), children: "\u0627\u0644\u062A\u0627\u0644\u064A" })) : (_jsx(Button, { variant: "contained", disabled: submitting, onClick: handleConfirm, children: "\u062A\u0623\u0643\u064A\u062F \u0627\u0644\u0625\u063A\u0644\u0627\u0642" }))] })] }));
}
