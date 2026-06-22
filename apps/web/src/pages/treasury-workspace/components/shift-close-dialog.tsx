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

export type ShiftHandoffMode = 'defer' | 'treasury' | 'existing' | 'successor';

export type ShiftClosePayload = {
  countedCash: number;
  note?: string;
  handoffMode: ShiftHandoffMode;
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
  hasOpenShiftOnCashBox?: boolean;
  canOpenSuccessor?: boolean;
};

const STEPS = ['ملخص التحصيل', 'عد العهدة', 'تسليم العهدة', 'تأكيد'] as const;

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
  const [handoffMode, setHandoffMode] = useState<ShiftHandoffMode>('defer');
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
        } else {
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
    if (submitting) return;
    if (handoffMode === 'existing' && !targetShiftId) return;

    setSubmitting(true);
    try {
      const payload: ShiftClosePayload = {
        countedCash: actual,
        handoffMode,
      };
      if (handoffMode === 'existing' && targetShiftId) {
        payload.targetShiftId = targetShiftId;
      }
      if (handoffMode === 'successor') {
        const boxId = successorCashBoxId || handoffOptions?.shift.cashBoxId;
        if (boxId) payload.successorCashBoxId = boxId;
        payload.successorOpeningFloat = actual;
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
      <DialogTitle>{`تسليم وإغلاق وردية ${shiftNumber ?? ''}`}</DialogTitle>
      <DialogContent>
        <Stepper activeStep={step} sx={{ mb: 2 }}>
          {STEPS.map((label) => (
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
            {hasPendingOrders ? (
              <Alert severity="info">
                {pending.uncollectedCount} طلب لم يُحصّل
                {pending.suspendedCount ? ` · ${pending.suspendedCount} معلّق` : ''}
                {pending.openCount ? ` · ${pending.openCount} مفتوح` : ''}
                {' '}— ستبقى على الخزنة كتذكير للكاشير التالي (بدون فتح وردية جديدة).
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
              helperText="المبلغ الذي تسلّمه للكاشير التالي أو للإدارة"
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
                {handoffOptions?.hasOpenShiftOnCashBox ? (
                  <Alert severity="warning">
                    توجد وردية مفتوحة على هذه الخزنة — لن تُفتح وردية جديدة. سلّم العهدة للكاشير التالي أو للإدارة.
                  </Alert>
                ) : null}
                <FormControl>
                  <RadioGroup
                    value={handoffMode}
                    onChange={(e) => setHandoffMode(e.target.value as ShiftHandoffMode)}
                  >
                    <FormControlLabel
                      value="defer"
                      control={<Radio />}
                      label={`تسليم للكاشير التالي — ${formatShiftMoney(actual)} تُستلم عند فتح الوردية القادمة`}
                    />
                    <FormControlLabel
                      value="treasury"
                      control={<Radio />}
                      label="تسليم للإدارة — إيداع العهدة في الخزنة الرئيسية"
                    />
                    <FormControlLabel
                      value="existing"
                      control={<Radio />}
                      disabled={!handoffOptions?.openShifts.length}
                      label={`نقل الطلبات لوردية مفتوحة${handoffOptions?.openShifts.length ? '' : ' (لا توجد حالياً)'}`}
                    />
                    {canOpenSuccessor ? (
                      <FormControlLabel
                        value="successor"
                        control={<Radio />}
                        label="فتح وردية جديدة — تسليم العهدة مباشرة (لا توجد وردية مفتوحة على الخزنة)"
                      />
                    ) : null}
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
                ) : null}

                {handoffMode === 'existing' ? (
                  <TextField
                    select
                    fullWidth
                    label="وردية المستلم (لنقل الطلبات فقط)"
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
                ) : null}
              </>
            )}
          </Stack>
        ) : null}

        {step === confirmStep ? (
          <Stack spacing={1}>
            <Typography>عهدة متوقعة: {formatShiftMoney(expected)}</Typography>
            <Typography>عهدة فعلية: {formatShiftMoney(actual)}</Typography>
            <Typography fontWeight={800}>فرق: {formatShiftMoney(variance)}</Typography>
            <Typography variant="body2" color="primary.main" fontWeight={700}>
              {selectedTargetLabel}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {handoffMode === 'defer'
                ? 'بعد التأكيد: تُغلق ورديتك. عند فتح الكاشير التالي وردية على نفس الخزنة ستظهر رسالة باسمك ومبلغ العهدة.'
                : handoffMode === 'treasury'
                  ? 'بعد التأكيد: تُغلق الوردية ويُسجَّل إيداع العهدة للإدارة.'
                  : handoffMode === 'existing'
                    ? 'بعد التأكيد: تُغلق ورديتك وتُنقل الطلبات غير المكتملة للوردية المختارة.'
                    : 'بعد التأكيد: تُغلق ورديتك وتُفتح وردية جديدة بالعهدة.'}
              {hasPendingOrders && handoffMode !== 'existing'
                ? ' الطلبات غير المحصّلة تبقى على الخزنة كتذكير.'
                : ''}
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
            تأكيد التسليم والإغلاق
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
