import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import { paymentMethodLabel } from '../../../lib/treasury-store.js';

type ShiftCloseDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (countedCash: number) => Promise<void>;
  summary: {
    byPaymentMethod?: Record<string, { approved: number; pending: number }>;
    expectedCash?: number;
    openingFloat?: number;
    totalSales?: number;
    pending?: number;
  } | null;
  shiftNumber?: string;
  cashierName?: string;
};

export function ShiftCloseDialog({
  open,
  onClose,
  onConfirm,
  summary,
  shiftNumber,
  cashierName,
}: ShiftCloseDialogProps) {
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
    if (submitting) return;
    setSubmitting(true);
    try {
      await onConfirm(actual);
      handleClose();
    } catch {
      /* keep dialog open; caller shows error */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>إغلاق وردية {shiftNumber ?? ''}</DialogTitle>
      <DialogContent>
        <Stepper activeStep={step} sx={{ mb: 2 }}>
          <Step><StepLabel>ملخص التحصيل</StepLabel></Step>
          <Step><StepLabel>عد العهدة</StepLabel></Step>
          <Step><StepLabel>تأكيد</StepLabel></Step>
        </Stepper>

        {step === 0 ? (
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">الكاشير: {cashierName ?? '—'}</Typography>
            <Typography>رصيد افتتاح: {Number(summary?.openingFloat ?? 0).toLocaleString('en-US')} ج.م</Typography>
            <Typography>إجمالي مبيعات: {Number(summary?.totalSales ?? (summary as any)?.salesTotal ?? 0).toLocaleString('en-US')} ج.م</Typography>
            <Typography>معلق اعتماد: {Number(summary?.pending ?? (summary as any)?.pendingCashInCustody ?? 0).toLocaleString('en-US')} ج.م</Typography>
            {Object.entries(summary?.byPaymentMethod ?? {}).map(([method, vals]) => (
              <Typography key={method} variant="body2">
                {paymentMethodLabel(method)}: معتمد {vals.approved.toLocaleString('en-US')} / معلق {vals.pending.toLocaleString('en-US')}
              </Typography>
            ))}
            <Typography fontWeight={800}>عهدة متوقعة: {expected.toLocaleString('en-US')} ج.م</Typography>
          </Stack>
        ) : null}

        {step === 1 ? (
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="العهدة الفعلية (عدّ النقد)"
              type="number"
              value={countedCash}
              onChange={(e) => setCountedCash(e.target.value)}
            />
            <Alert severity={variance === 0 ? 'success' : 'warning'}>
              {variance === 0
                ? 'العهدة مطابقة للمتوقع.'
                : `فرق العهدة: ${variance.toLocaleString('en-US')} ج.م`}
            </Alert>
          </Stack>
        ) : null}

        {step === 2 ? (
          <Stack spacing={1}>
            <Typography>عهدة متوقعة: {expected.toLocaleString('en-US')} ج.م</Typography>
            <Typography>عهدة فعلية: {actual.toLocaleString('en-US')} ج.م</Typography>
            <Typography fontWeight={800}>فرق: {variance.toLocaleString('en-US')} ج.م</Typography>
            <Typography variant="body2" color="text.secondary">بعد التأكيد ستُغلق الوردية ولا يمكن إضافة حركات عليها.</Typography>
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>إلغاء</Button>
        {step > 0 ? <Button onClick={() => setStep((s) => s - 1)}>رجوع</Button> : null}
        {step < 2 ? (
          <Button variant="contained" onClick={() => setStep((s) => s + 1)}>التالي</Button>
        ) : (
          <Button variant="contained" disabled={submitting} onClick={handleConfirm}>
            تأكيد الإغلاق
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
