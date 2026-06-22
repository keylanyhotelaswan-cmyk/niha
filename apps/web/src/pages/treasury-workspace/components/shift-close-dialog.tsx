import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import { apiShiftHandoffOptions } from '../../../lib/api.js';
import { useAuth } from '../../../lib/auth-context.js';
import { formatShiftMoney, formatShiftOpenedAt, type ShiftSummaryLike } from '../../../lib/shift-summary-utils.js';
import { ShiftCollectionBreakdown } from './shift-collection-breakdown.js';

export type ShiftClosePayload = {
  countedCash: number;
  note?: string;
  handoffMode?: 'successor' | 'existing';
  targetShiftId?: string;
  successorCashBoxId?: string;
  successorOpeningFloat?: number;
};

type ShiftCloseDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: ShiftClosePayload) => Promise<void>;
  summary: ShiftSummaryLike | null;
  shiftId?: string;
  shiftNumber?: string;
  cashierName?: string;
  openedAt?: string | Date;
  onOpenSummaryPreview?: () => void;
};

type HandoffOptionsData = {
  shift: { id: string; shiftNumber: string; cashBoxId: string; cashBoxName: string; cashierName: string };
  pending: { uncollectedCount: number; suspendedCount: number; openCount: number; total: number };
  openShifts: Array<{
    id: string;
    shiftNumber: string;
    cashierName: string;
    cashBoxId: string;
    cashBoxName: string;
    openedAt: string;
  }>;
  cashBoxes: Array<{ id: string; name: string; code: string }>;
};

export function ShiftCloseDialog({
  open,
  onClose,
  onConfirm,
  summary,
  shiftId,
  shiftNumber,
  cashierName,
  openedAt,
  onOpenSummaryPreview,
}: ShiftCloseDialogProps) {
  const { accessToken } = useAuth();
  const [step, setStep] = useState(0);
  const [countedCash, setCountedCash] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const [handoffOptions, setHandoffOptions] = useState<HandoffOptionsData | null>(null);
  const [handoffLoading, setHandoffLoading] = useState(false);
  const [handoffMode, setHandoffMode] = useState<'successor' | 'existing'>('successor');
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
        } else {
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
    if (submitting) return;
    if (needsHandoff && handoffMode === 'existing' && !targetShiftId) return;

    setSubmitting(true);
    try {
      const payload: ShiftClosePayload = { countedCash: actual };
      if (needsHandoff) {
        payload.handoffMode = handoffMode;
        if (handoffMode === 'existing' && targetShiftId) {
          payload.targetShiftId = targetShiftId;
        }
        if (handoffMode === 'successor') {
          const boxId = successorCashBoxId || handoffOptions?.shift.cashBoxId;
          if (boxId) payload.successorCashBoxId = boxId;
          payload.successorOpeningFloat = actual;
        }
      }
      await onConfirm(payload);
      handleClose();
    } catch {
      /* keep dialog open; caller shows error */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{needsHandoff ? `تسليم وإغلاق وردية ${shiftNumber ?? ''}` : `إغلاق وردية ${shiftNumber ?? ''}`}</DialogTitle>
      <DialogContent>
        <Stepper activeStep={step} sx={{ mb: 2 }}>
          {steps.map((label) => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>

        {step === 0 ? (
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              الكاشير: {cashierName ?? '—'}
              {openedAt ? ` · فتح ${formatShiftOpenedAt(openedAt)}` : ''}
            </Typography>
            <Typography>رصيد افتتاح: {formatShiftMoney(Number(summary?.openingFloat ?? 0))}</Typography>
            <Typography>إجمالي مبيعات: {formatShiftMoney(Number(summary?.totalSales ?? summary?.salesTotal ?? 0))}</Typography>
            <Typography>مصروفات الوردية: {formatShiftMoney(Number(summary?.expensesTotal ?? summary?.outgoing ?? 0))}</Typography>
            <Typography>معلق اعتماد: {formatShiftMoney(Number(summary?.pending ?? summary?.pendingCashInCustody ?? 0))}</Typography>
            {needsHandoff ? (
              <Alert severity="warning">
                {pending.uncollectedCount} طلب لم يُحصّل
                {pending.suspendedCount ? ` · ${pending.suspendedCount} معلّق` : ''}
                {pending.openCount ? ` · ${pending.openCount} مفتوح` : ''}
                {' '}— سيتم نقلها للوردية المستلمة ولن تضيع بعد الإغلاق.
              </Alert>
            ) : null}
            <ShiftCollectionBreakdown summary={summary} compact />
            <Typography fontWeight={800}>عهدة متوقعة (نقدي في الدرج): {formatShiftMoney(expected)}</Typography>
            {onOpenSummaryPreview ? (
              <Button size="small" variant="outlined" onClick={onOpenSummaryPreview} sx={{ alignSelf: 'flex-start' }}>
                عرض ملخص للطباعة
              </Button>
            ) : null}
          </Stack>
        ) : null}

        {step === countStep ? (
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="العهدة الفعلية (عدّ النقد)"
              type="number"
              value={countedCash}
              onChange={(e) => setCountedCash(e.target.value)}
              helperText={needsHandoff ? 'ستُسجَّل كرصيد افتتاح للوردية الجديدة عند التسليم' : undefined}
            />
            <Alert severity={variance === 0 ? 'success' : 'warning'}>
              {variance === 0
                ? 'العهدة مطابقة للمتوقع.'
                : `فرق العهدة: ${variance.toLocaleString('en-US')} ج.م`}
            </Alert>
          </Stack>
        ) : null}

        {step === handoffStep ? (
          <Stack spacing={2}>
            {handoffLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <>
                <Alert severity="info">
                  {pending.total} عنصر سيُنقل للوردية المستلمة ({formatShiftMoney(Number(summary?.uncollectedTotal ?? 0))} غير محصّل).
                </Alert>
                <FormControl>
                  <RadioGroup
                    value={handoffMode}
                    onChange={(e) => setHandoffMode(e.target.value as 'successor' | 'existing')}
                  >
                    <FormControlLabel
                      value="successor"
                      control={<Radio />}
                      label="وردية جديدة — أسلّم العهدة والطلبات (نفس الخزنة أو خزنة أخرى)"
                    />
                    <FormControlLabel
                      value="existing"
                      control={<Radio />}
                      disabled={!handoffOptions?.openShifts.length}
                      label={`وردية مفتوحة أخرى${handoffOptions?.openShifts.length ? '' : ' (لا توجد حالياً)'}`}
                    />
                  </RadioGroup>
                </FormControl>

                {handoffMode === 'successor' ? (
                  <TextField
                    select
                    fullWidth
                    label="خزنة الوردية الجديدة"
                    value={successorCashBoxId || handoffOptions?.shift.cashBoxId || ''}
                    onChange={(e) => setSuccessorCashBoxId(e.target.value)}
                  >
                    {(handoffOptions?.cashBoxes ?? []).map((box) => (
                      <MenuItem key={box.id} value={box.id}>{box.name}</MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <TextField
                    select
                    fullWidth
                    label="وردية المستلم"
                    value={targetShiftId}
                    onChange={(e) => setTargetShiftId(e.target.value)}
                  >
                    <MenuItem value="">اختر وردية...</MenuItem>
                    {(handoffOptions?.openShifts ?? []).map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.shiftNumber} · {s.cashierName} · {s.cashBoxName}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              </>
            )}
          </Stack>
        ) : null}

        {step === confirmStep ? (
          <Stack spacing={1}>
            <Typography>عهدة متوقعة: {formatShiftMoney(expected)}</Typography>
            <Typography>عهدة فعلية: {formatShiftMoney(actual)}</Typography>
            <Typography fontWeight={800}>فرق: {formatShiftMoney(variance)}</Typography>
            {needsHandoff ? (
              <Typography variant="body2" color="primary.main" fontWeight={700}>
                التسليم إلى: {selectedTargetLabel}
              </Typography>
            ) : null}
            <Typography variant="body2" color="text.secondary">
              {needsHandoff
                ? 'بعد التأكيد: تُغلق ورديتك، تُنقل الطلبات غير المحصّلة، وتُفتح وردية جديدة بالعهدة إن اخترت ذلك.'
                : 'بعد التأكيد ستُغلق الوردية ولا يمكن إضافة حركات عليها.'}
            </Typography>
            {onOpenSummaryPreview ? (
              <Button size="small" variant="outlined" onClick={onOpenSummaryPreview} sx={{ alignSelf: 'flex-start', mt: 1 }}>
                عرض ملخص للطباعة
              </Button>
            ) : null}
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>إلغاء</Button>
        {step > 0 ? <Button onClick={() => setStep((s) => s - 1)}>رجوع</Button> : null}
        {step < confirmStep ? (
          <Button
            variant="contained"
            disabled={step === handoffStep && (!canAdvanceFromHandoff || handoffLoading)}
            onClick={() => setStep((s) => s + 1)}
          >
            التالي
          </Button>
        ) : (
          <Button variant="contained" disabled={submitting} onClick={handleConfirm}>
            {needsHandoff ? 'تأكيد التسليم والإغلاق' : 'تأكيد الإغلاق'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
