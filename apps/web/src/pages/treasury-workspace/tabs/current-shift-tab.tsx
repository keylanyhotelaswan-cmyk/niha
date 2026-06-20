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
import { apiCreateMovement, apiOpenShift } from '../../../lib/api.js';
import {
  isIncomingTransaction,
  mapMovementTypeToApi,
  paymentMethodLabel,
  safeTypeLabel,
  treasuryTypeLabel,
} from '../../../lib/treasury-store.js';
import { ShiftCloseDialog } from '../components/shift-close-dialog.js';
import { useShiftMutations } from '../../../lib/hooks.js';

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

  const expectedCash = Number(summary?.expectedCash ?? 0);
  const cashierName = shift?.openedBy?.fullName ?? '—';

  const treasuryStats = [
    { label: 'رصيد الافتتاح', value: `${Number(summary?.openingFloat ?? 0).toLocaleString('en-US')} ج.م`, note: shiftOpen ? 'وردية نشطة' : '—', progress: 100, tone: '#0f766e' },
    { label: 'عهدة الكاشير', value: `${expectedCash.toLocaleString('en-US')} ج.م`, note: 'نقدي في الدرج — يزيد بالتحصيل وينقص بالاعتماد', progress: 76, tone: '#155e75' },
    { label: 'مبيعات الوردية', value: `${Number(summary?.totalSales ?? 0).toLocaleString('en-US')} ج.م`, note: 'كل طرق الدفع', progress: 68, tone: '#7c3aed' },
    { label: 'بانتظار اعتماد', value: `${Number(summary?.pendingCashInCustody ?? summary?.pending ?? 0).toLocaleString('en-US')} ج.م`, note: 'نقدي في العهدة حتى تعتمده', progress: Number(summary?.pendingCashInCustody ?? 0) > 0 ? 58 : 0, tone: '#b45309' },
  ];

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

  const handleCloseShift = async (countedCash: number) => {
    if (!shift) return;
    try {
      await closeShift.mutateAsync({
        shiftId: shift.id,
        countedCash,
        note: 'إغلاق وردية من مساحة الخزنة',
      });
      onMessage('تم إغلاق الوردية.');
      onRefresh();
    } catch (e) {
      onMessage((e as Error).message ?? 'فشل إغلاق الوردية');
      throw e;
    }
  };

  return (
    <Stack spacing={2}>
      <SectionCard
        title="الوردية الحالية"
        action={<Chip label={shiftOpen ? 'مفتوحة' : 'مغلقة'} color={shiftOpen ? 'success' : 'default'} />}
      >
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            {shift
              ? `${shift.shiftNumber} · ${cashierName} · ${new Date(shift.openedAt).toLocaleString('ar-EG')}`
              : 'لا توجد وردية مفتوحة على هذه الخزنة'}
          </Typography>
        </Stack>
      </SectionCard>

      <Grid2 container spacing={2}>
        {treasuryStats.map((stat) => (
          <Grid2 size={{ xs: 12, sm: 6, xl: 3 }} key={stat.label}>
            <MetricCard {...stat} />
          </Grid2>
        ))}
      </Grid2>

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
              return (
                <TableRow key={tx.id} hover>
                  <TableCell>{new Date(tx.occurredAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                  <TableCell>{treasuryTypeLabel(tx.transactionType, tx.sourceType)}</TableCell>
                  <TableCell>{safeTypeLabel(tx.safeType)}</TableCell>
                  <TableCell>{tx.note}</TableCell>
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
      </SectionCard>

      <ShiftCloseDialog
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        onConfirm={handleCloseShift}
        summary={summary}
        shiftNumber={shift?.shiftNumber}
        cashierName={cashierName}
      />
    </Stack>
  );
}
