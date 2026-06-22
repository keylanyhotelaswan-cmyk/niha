import {
  Alert,
  Button,
  Chip,
  Grid2,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { MetricCard, SectionCard } from '../../shared.js';
import { useAuth } from '../../../lib/auth-context.js';
import { apiCreateMovement, apiGetOrder, apiOpenShift } from '../../../lib/api.js';
import {
  isIncomingTransaction,
  mapMovementTypeToApi,
  paymentMethodLabel,
  safeTypeLabel,
  treasuryTypeLabel,
} from '../../../lib/treasury-store.js';
import { formatShiftDuration, formatShiftOpenedAt } from '../../../lib/shift-summary-utils.js';
import { ShiftCloseDialog } from '../components/shift-close-dialog.js';
import { ShiftCollectionBreakdown } from '../components/shift-collection-breakdown.js';
import { ShiftSummaryPreviewDialog } from '../components/shift-summary-preview-dialog.js';
import type { ShiftSummaryPrintParams } from '../../../lib/shift-summary-print.js';
import { useShiftMutations } from '../../../lib/hooks.js';
import { OrderSummaryDialog } from '../../pos/components/order-summary-dialog.js';
import { mapApiOrderToSavedOrder } from '../../../lib/pos-store.js';
import type { SavedOrder } from '../../../lib/pos-store.js';

const manualMovementOptions = [
  { value: 'CASH_DEPOSIT', label: 'إيداع نقدي' },
  { value: 'CASH_WITHDRAWAL', label: 'سحب من الخزنة' },
  { value: 'OPERATING_EXPENSE', label: 'مصروف تشغيلي' },
];
const paymentMethodOptions = ['CASH', 'INSTAPAY', 'WALLET', 'CARD'] as const;

type CurrentShiftTabProps = {
  workspace: any;
  branchId: string;
  cashBoxId: string;
  onRefresh: () => void;
  onMessage: (msg: string) => void;
};

export function CurrentShiftTab({ workspace, branchId, cashBoxId, onRefresh, onMessage }: CurrentShiftTabProps) {
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
  const [movementSafeType, setMovementSafeType] = useState<'PROFITS' | 'EXPENSES'>('EXPENSES');
  const [movementPaymentMethod, setMovementPaymentMethod] = useState<(typeof paymentMethodOptions)[number]>('CASH');
  const [movementAmount, setMovementAmount] = useState('0');
  const [movementNote, setMovementNote] = useState('');
  const [closeOpen, setCloseOpen] = useState(false);
  const [orderDialog, setOrderDialog] = useState<SavedOrder | null>(null);
  const [orderLoadingId, setOrderLoadingId] = useState<string | null>(null);
  const [summaryPreviewOpen, setSummaryPreviewOpen] = useState(false);

  const expectedCash = Number(summary?.expectedCash ?? 0);
  const cashierName = shift?.openedBy?.fullName ?? '—';

  const summaryPreviewParams: ShiftSummaryPrintParams | null = summary ? {
    shiftNumber: shift?.shiftNumber,
    cashierName,
    openedAt: shift?.openedAt,
    summary,
  } : null;

  const openSummaryPreview = () => {
    if (!summary) return;
    setSummaryPreviewOpen(true);
  };

  const treasuryStats = [
    { label: 'رصيد الافتتاح', value: `${Number(summary?.openingFloat ?? 0).toLocaleString('en-US')} ج.م`, note: shiftOpen ? 'من فتح الوردية' : '—', progress: 100, tone: '#0f766e' },
    { label: 'عهدة الكاشير', value: `${expectedCash.toLocaleString('en-US')} ج.م`, note: 'نقدي في الدرج الآن', progress: 76, tone: '#155e75' },
    { label: 'مبيعات الوردية', value: `${Number(summary?.totalSales ?? 0).toLocaleString('en-US')} ج.م`, note: summary?.ordersCount != null ? `${summary.ordersCount} طلب مغلق` : 'كل طرق الدفع', progress: 68, tone: '#7c3aed' },
    { label: 'مصروفات الوردية', value: `${Number(summary?.expensesTotal ?? summary?.outgoing ?? 0).toLocaleString('en-US')} ج.م`, note: 'تُخصم من عهدة الكاشير', progress: 52, tone: '#b45309' },
    { label: 'بانتظار اعتماد', value: `${Number(summary?.pendingCashInCustody ?? summary?.pending ?? 0).toLocaleString('en-US')} ج.م`, note: 'نقدي في العهدة حتى تعتمده', progress: Number(summary?.pendingCashInCustody ?? 0) > 0 ? 58 : 0, tone: '#be123c' },
  ];

  const openOrderFromTx = async (tx: { orderId?: string | null; paymentMethod?: string }) => {
    if (!tx.orderId || !accessToken) return;
    setOrderLoadingId(tx.orderId);
    try {
      const res = await apiGetOrder(tx.orderId, accessToken);
      if (!res.ok || !res.data) {
        onMessage(res.body ?? res.error ?? 'فشل تحميل الفاتورة');
        return;
      }
      setOrderDialog(mapApiOrderToSavedOrder(res.data as Parameters<typeof mapApiOrderToSavedOrder>[0], 'closed'));
    } finally {
      setOrderLoadingId(null);
    }
  };

  const toggleShift = async () => {
    if (!accessToken || !branchId || !cashBoxId) return;
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
    } else {
      onMessage(`فشل فتح الوردية: ${res.body ?? res.error}`);
    }
  };

  const addMovement = async () => {
    const amount = Number(movementAmount);
    if (!shiftOpen || !shift || amount <= 0 || !movementNote.trim() || !accessToken) return;
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
    } else {
      onMessage(`فشل: ${res.body ?? res.error}`);
    }
  };

  const handleCloseShift = async (payload: {
    countedCash: number;
    handoffMode?: 'successor' | 'existing';
    targetShiftId?: string;
    successorCashBoxId?: string;
    successorOpeningFloat?: number;
  }) => {
    if (!shift) return;
    try {
      const result = await closeShift.mutateAsync({
        shiftId: shift.id,
        countedCash: payload.countedCash,
        note: 'إغلاق وردية من مساحة الخزنة',
        ...(payload.handoffMode ? { handoffMode: payload.handoffMode } : {}),
        ...(payload.targetShiftId ? { targetShiftId: payload.targetShiftId } : {}),
        ...(payload.successorCashBoxId ? { successorCashBoxId: payload.successorCashBoxId } : {}),
        ...(payload.successorOpeningFloat != null ? { successorOpeningFloat: payload.successorOpeningFloat } : {}),
      });
      const handoff = (result as any)?.handoff;
      if (handoff?.transferredCount > 0) {
        onMessage(`تم التسليم: ${handoff.transferredCount} طلب → وردية ${handoff.targetShiftNumber ?? 'المستلمة'}.`);
      } else {
        onMessage('تم إغلاق الوردية.');
      }
      onRefresh();
    } catch (e) {
      onMessage((e as Error).message ?? 'فشل إغلاق الوردية');
      throw e;
    }
  };

  return (
    <Stack spacing={2}>
      <SectionCard
        title="الوردية المفتوحة"
        action={(
          <Stack direction="row" spacing={1} alignItems="center">
            {shiftOpen ? (
              <Button size="small" variant="outlined" onClick={openSummaryPreview}>
                ملخص الوردية
              </Button>
            ) : null}
            <Chip label={shiftOpen ? 'مفتوحة' : 'مغلقة'} color={shiftOpen ? 'success' : 'default'} />
          </Stack>
        )}
      >
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            {shift
              ? `${shift.shiftNumber} · ${cashierName} · فتح ${formatShiftOpenedAt(shift.openedAt)} · مدة ${formatShiftDuration(shift.openedAt)}`
              : 'لا توجد وردية مفتوحة على هذه الخزنة'}
          </Typography>
          {shiftOpen ? (
            <Typography variant="caption" color="text.secondary">
              الملخص يشمل كل حركات الوردية من لحظة الفتح حتى الإغلاق — بدون تقسيم يومي.
            </Typography>
          ) : null}
        </Stack>
      </SectionCard>

      <Grid2 container spacing={2}>
        {treasuryStats.map((stat) => (
          <Grid2 size={{ xs: 12, sm: 6, md: 4 }} key={stat.label}>
            <MetricCard {...stat} />
          </Grid2>
        ))}
      </Grid2>

      {shiftOpen && summary ? (
        <SectionCard title="تحصيل الوردية حسب طريقة الدفع">
          <ShiftCollectionBreakdown summary={summary} />
        </SectionCard>
      ) : null}

      {perms.canManageShift ? (
        <Grid2 container spacing={2}>
          <Grid2 size={{ xs: 12, lg: 5 }}>
            <SectionCard title="إدارة الوردية">
              <Stack spacing={1.5}>
                {!shiftOpen ? (
                  <TextField
                    label="رصيد الافتتاح"
                    size="small"
                    type="number"
                    value={openingFloat}
                    onChange={(e) => setOpeningFloat(e.target.value)}
                  />
                ) : null}
                <Button variant={shiftOpen ? 'outlined' : 'contained'} onClick={toggleShift}>
                  {shiftOpen ? 'إغلاق الوردية' : 'فتح وردية'}
                </Button>
              </Stack>
            </SectionCard>
          </Grid2>
          <Grid2 size={{ xs: 12, lg: 7 }}>
            <SectionCard title="حركات يدوية">
              <Grid2 container spacing={1.5}>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <TextField select fullWidth label="نوع الحركة" size="small" value={movementType} onChange={(e) => setMovementType(e.target.value)}>
                    {manualMovementOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                  </TextField>
                </Grid2>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label="الخزنة"
                    size="small"
                    value={movementType === 'OPERATING_EXPENSE' ? 'EXPENSES' : movementSafeType}
                    onChange={(e) => setMovementSafeType(e.target.value as 'PROFITS' | 'EXPENSES')}
                    disabled={movementType === 'OPERATING_EXPENSE'}
                  >
                    <MenuItem value="EXPENSES">خزنة المصاريف</MenuItem>
                    <MenuItem value="PROFITS">خزنة الأرباح</MenuItem>
                  </TextField>
                </Grid2>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label="وسيلة الدفع"
                    size="small"
                    value={movementPaymentMethod}
                    onChange={(e) => setMovementPaymentMethod(e.target.value as (typeof paymentMethodOptions)[number])}
                  >
                    {paymentMethodOptions.map((method) => <MenuItem key={method} value={method}>{paymentMethodLabel(method)}</MenuItem>)}
                  </TextField>
                </Grid2>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="المبلغ" size="small" type="number" value={movementAmount} onChange={(e) => setMovementAmount(e.target.value)} />
                </Grid2>
                <Grid2 size={{ xs: 12 }}>
                  <TextField fullWidth label="ملاحظة" size="small" value={movementNote} onChange={(e) => setMovementNote(e.target.value)} />
                </Grid2>
                <Grid2 size={{ xs: 12 }}>
                  <Button variant="contained" onClick={addMovement} disabled={!shiftOpen || Number(movementAmount) <= 0 || !movementNote.trim()}>
                    إضافة حركة
                  </Button>
                </Grid2>
              </Grid2>
              {!shiftOpen ? <Alert severity="info" sx={{ mt: 1 }}>افتح وردية لإضافة حركات.</Alert> : null}
            </SectionCard>
          </Grid2>
        </Grid2>
      ) : null}

      <SectionCard title="سجل حركات الوردية">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>الوقت</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>الخزنة</TableCell>
              <TableCell>الملاحظة</TableCell>
              <TableCell>الدفع</TableCell>
              <TableCell align="left">المبلغ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((tx: any) => {
              const incoming = isIncomingTransaction(tx.transactionType);
              const hasOrder = Boolean(tx.orderId);
              return (
                <TableRow
                  key={tx.id}
                  hover={hasOrder}
                  {...(hasOrder ? {
                    onClick: () => { void openOrderFromTx(tx); },
                    sx: { cursor: orderLoadingId === tx.orderId ? 'wait' : 'pointer' },
                  } : {})}
                >
                  <TableCell>{new Date(tx.occurredAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                  <TableCell>{treasuryTypeLabel(tx.transactionType, tx.sourceType)}</TableCell>
                  <TableCell>{safeTypeLabel(tx.safeType)}</TableCell>
                  <TableCell>
                    {hasOrder ? (
                      <Typography
                        component="span"
                        variant="body2"
                        sx={{ color: 'primary.main', fontWeight: 700, textDecoration: 'underline' }}
                      >
                        {tx.orderNumber ? `فاتورة ${tx.orderNumber}` : tx.note}
                      </Typography>
                    ) : (
                      tx.note
                    )}
                  </TableCell>
                  <TableCell>{paymentMethodLabel(tx.paymentMethod)}</TableCell>
                  <TableCell align="left" sx={{ color: incoming ? '#0f766e' : '#b45309', fontWeight: 700 }}>
                    {incoming ? '+' : '-'} {Number(tx.amount).toLocaleString('en-US')} ج.م
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {transactions.length === 0 ? <Alert severity="info" sx={{ mt: 1 }}>لا توجد حركات.</Alert> : null}
        {transactions.some((tx: any) => tx.orderId) ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            اضغط على رقم الفاتورة لعرض تفاصيل الطلب.
          </Typography>
        ) : null}
      </SectionCard>

      <OrderSummaryDialog
        open={Boolean(orderDialog)}
        order={orderDialog}
        onClose={() => setOrderDialog(null)}
      />

      <ShiftSummaryPreviewDialog
        open={summaryPreviewOpen}
        onClose={() => setSummaryPreviewOpen(false)}
        params={summaryPreviewParams}
        onMessage={onMessage}
      />

      <ShiftCloseDialog
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        onConfirm={handleCloseShift}
        shiftId={shift?.id}
        summary={summary}
        shiftNumber={shift?.shiftNumber}
        cashierName={cashierName}
        openedAt={shift?.openedAt}
        onOpenSummaryPreview={openSummaryPreview}
      />
    </Stack>
  );
}
