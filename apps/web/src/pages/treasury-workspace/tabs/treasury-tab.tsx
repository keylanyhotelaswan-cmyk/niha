import {
  Alert,
  Button,
  FormControlLabel,
  Grid2,
  MenuItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { MetricCard, SectionCard } from '../../shared.js';
import { PaymentMethodCards } from '../components/payment-method-cards.js';
import { useAuth } from '../../../lib/auth-context.js';
import { apiInternalSafeTransfer, apiProfitWithdrawal, apiUpdateSafeSplitSetting } from '../../../lib/api.js';
import { paymentMethodLabel } from '../../../lib/treasury-store.js';

type TreasuryTabProps = {
  workspace: any;
  branchId: string;
  cashBoxId: string;
  onRefresh: () => void;
  onMessage: (msg: string) => void;
};

type SafeType = 'PROFITS' | 'EXPENSES';
type PaymentMethodType = 'CASH' | 'CARD' | 'INSTAPAY' | 'WALLET' | 'MIXED';

const paymentMethodOptions: PaymentMethodType[] = ['CASH', 'INSTAPAY', 'WALLET', 'CARD'];

export function TreasuryTab({ workspace, branchId, cashBoxId, onRefresh, onMessage }: TreasuryTabProps) {
  const { accessToken } = useAuth();
  const [cumulative, setCumulative] = useState(false);
  const [expensesPercentage, setExpensesPercentage] = useState('50');
  const [fromSafeType, setFromSafeType] = useState<SafeType>('PROFITS');
  const [toSafeType, setToSafeType] = useState<SafeType>('EXPENSES');
  const [fromPaymentMethod, setFromPaymentMethod] = useState<PaymentMethodType>('CASH');
  const [toPaymentMethod, setToPaymentMethod] = useState<PaymentMethodType>('CASH');
  const [transferAmount, setTransferAmount] = useState('0');
  const [transferNote, setTransferNote] = useState('');
  const [profitWithdrawalMethod, setProfitWithdrawalMethod] = useState<PaymentMethodType>('CASH');
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
    if (!accessToken || !branchId) return;
    const value = Number(expensesPercentage);
    const res = await apiUpdateSafeSplitSetting({
      branchId,
      date: workspace?.context?.date,
      expensesPercentage: value,
    }, accessToken);
    if (res.ok) {
      onMessage('تم تحديث نسبة تقسيم الإيراد.');
      onRefresh();
    } else {
      onMessage(`فشل تحديث النسبة: ${res.body ?? res.error}`);
    }
  };

  const submitTransfer = async () => {
    if (!accessToken || !branchId || !cashBoxId) return;
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
    } else {
      onMessage(`فشل التحويل: ${res.body ?? res.error}`);
    }
  };

  const submitProfitWithdrawal = async () => {
    if (!accessToken || !branchId || !cashBoxId) return;
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
    } else {
      onMessage(`فشل سحب الأرباح: ${res.body ?? res.error}`);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="body2" color="text.secondary">
          {cumulative ? 'تراكمي من بداية النظام' : 'تحصيل اليوم فقط'}
        </Typography>
        <FormControlLabel
          control={<Switch checked={cumulative} onChange={(e) => setCumulative(e.target.checked)} />}
          label="عرض التراكمي"
        />
      </Stack>

      <SectionCard title={cumulative ? 'خزنة التحصيل (تراكمي معتمد)' : 'خزنة التحصيل اليوم'}>
        <PaymentMethodCards
          paymentMethods={paymentMethods}
          breakdown={breakdown}
          mode={cumulative ? 'cumulative' : 'today'}
        />
        {!cumulative ? (
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
            <Typography variant="body2" fontWeight={700}>
              في الخزنة: {inTreasuryTotal.toLocaleString('en-US')} ج.م
            </Typography>
            <Typography variant="body2" color="warning.main">
              بانتظار اعتماد: {Number(treasuryToday.pendingTotal ?? 0).toLocaleString('en-US')} ج.م
            </Typography>
            <Typography variant="body2" color="text.secondary">
              معتمد نهائي: {Number(treasuryToday.approvedTotal ?? 0).toLocaleString('en-US')} ج.م
            </Typography>
          </Stack>
        ) : null}
      </SectionCard>

      <SectionCard title={cumulative ? 'أرصدة الخزائن الفرعية (تراكمي)' : 'أرصدة الخزائن الفرعية اليوم'}>
        <Grid2 container spacing={2}>
          <Grid2 size={{ xs: 12, md: 4 }}>
            <MetricCard
              label="خزنة الأرباح"
              value={`${profitsSafe.toLocaleString('en-US')} ج.م`}
              note="إيراد مجمّد للأرباح الصافية"
              progress={totalSafe > 0 ? Math.min(100, (profitsSafe / totalSafe) * 100) : 0}
              tone="warning"
            />
          </Grid2>
          <Grid2 size={{ xs: 12, md: 4 }}>
            <MetricCard
              label="خزنة المصاريف"
              value={`${expensesSafe.toLocaleString('en-US')} ج.م`}
              note="مصدر الصرف للموردين والآجل والمصروفات"
              progress={totalSafe > 0 ? Math.min(100, (expensesSafe / totalSafe) * 100) : 0}
              tone="success"
            />
          </Grid2>
          <Grid2 size={{ xs: 12, md: 4 }}>
            <MetricCard
              label="إجمالي الخزائن"
              value={`${totalSafe.toLocaleString('en-US')} ج.م`}
              note={cumulative ? 'الرصيد التراكمي المعتمد' : 'حركات اليوم المعتمدة'}
              progress={totalSafe > 0 ? 100 : 0}
              tone="info"
            />
          </Grid2>
        </Grid2>
      </SectionCard>

      <SectionCard title="توزيع الخزنة حسب وسيلة الدفع">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>وسيلة الدفع</TableCell>
              <TableCell align="right">مصاريف</TableCell>
              <TableCell align="right">أرباح</TableCell>
              <TableCell align="right">الإجمالي</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paymentMethodOptions.map((method) => {
              const row = walletBalances[method] ?? { EXPENSES: 0, PROFITS: 0, total: 0 };
              return (
                <TableRow key={method} hover>
                  <TableCell>{paymentMethodLabel(method)}</TableCell>
                  <TableCell align="right">{Number(row.EXPENSES ?? 0).toLocaleString('en-US')} ج.م</TableCell>
                  <TableCell align="right">{Number(row.PROFITS ?? 0).toLocaleString('en-US')} ج.م</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>{Number(row.total ?? 0).toLocaleString('en-US')} ج.م</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </SectionCard>

      {!cumulative ? (
        <Grid2 container spacing={2}>
          <Grid2 size={{ xs: 12, lg: 5 }}>
            <SectionCard title="نسبة تقسيم إيراد اليوم">
              <Stack spacing={1.5}>
                <TextField
                  label="نسبة المصاريف %"
                  size="small"
                  type="number"
                  value={expensesPercentage}
                  onChange={(e) => setExpensesPercentage(e.target.value)}
                  inputProps={{ min: 0, max: 100, step: 1 }}
                  helperText={`الأرباح: ${Math.max(0, 100 - Number(expensesPercentage || 0)).toLocaleString('en-US')}%`}
                />
                <Button
                  variant="contained"
                  onClick={saveSplitSetting}
                  disabled={Number(expensesPercentage) < 0 || Number(expensesPercentage) > 100}
                >
                  حفظ النسبة
                </Button>
              </Stack>
            </SectionCard>
          </Grid2>
          <Grid2 size={{ xs: 12, lg: 7 }}>
            <SectionCard title="تحويل ذكي بين الخزائن ووسائل الدفع">
              <Grid2 container spacing={1.5}>
                <Grid2 size={{ xs: 12, md: 3 }}>
                  <TextField select fullWidth label="من خزنة" size="small" value={fromSafeType} onChange={(e) => {
                    const next = e.target.value as SafeType;
                    setFromSafeType(next);
                  }}>
                    <MenuItem value="PROFITS">خزنة الأرباح</MenuItem>
                    <MenuItem value="EXPENSES">خزنة المصاريف</MenuItem>
                  </TextField>
                </Grid2>
                <Grid2 size={{ xs: 12, md: 3 }}>
                  <TextField select fullWidth label="من وسيلة" size="small" value={fromPaymentMethod} onChange={(e) => setFromPaymentMethod(e.target.value as PaymentMethodType)}>
                    {paymentMethodOptions.map((method) => <MenuItem key={method} value={method}>{paymentMethodLabel(method)}</MenuItem>)}
                  </TextField>
                </Grid2>
                <Grid2 size={{ xs: 12, md: 3 }}>
                  <TextField select fullWidth label="إلى خزنة" size="small" value={toSafeType} onChange={(e) => setToSafeType(e.target.value as SafeType)}>
                    <MenuItem value="PROFITS">خزنة الأرباح</MenuItem>
                    <MenuItem value="EXPENSES">خزنة المصاريف</MenuItem>
                  </TextField>
                </Grid2>
                <Grid2 size={{ xs: 12, md: 3 }}>
                  <TextField select fullWidth label="إلى وسيلة" size="small" value={toPaymentMethod} onChange={(e) => setToPaymentMethod(e.target.value as PaymentMethodType)}>
                    {paymentMethodOptions.map((method) => <MenuItem key={method} value={method}>{paymentMethodLabel(method)}</MenuItem>)}
                  </TextField>
                </Grid2>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="المبلغ" size="small" type="number" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} />
                </Grid2>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="ملاحظة" size="small" value={transferNote} onChange={(e) => setTransferNote(e.target.value)} />
                </Grid2>
                <Grid2 size={{ xs: 12 }}>
                  <Button
                    variant="contained"
                    onClick={submitTransfer}
                    disabled={(fromSafeType === toSafeType && fromPaymentMethod === toPaymentMethod) || Number(transferAmount) <= 0}
                  >
                    تنفيذ التحويل
                  </Button>
                </Grid2>
              </Grid2>
            </SectionCard>
          </Grid2>
          <Grid2 size={{ xs: 12 }}>
            <SectionCard title="سحب أرباح">
              <Grid2 container spacing={1.5}>
                <Grid2 size={{ xs: 12, md: 4 }}>
                  <TextField select fullWidth label="وسيلة الدفع" size="small" value={profitWithdrawalMethod} onChange={(e) => setProfitWithdrawalMethod(e.target.value as PaymentMethodType)}>
                    {paymentMethodOptions.map((method) => <MenuItem key={method} value={method}>{paymentMethodLabel(method)}</MenuItem>)}
                  </TextField>
                </Grid2>
                <Grid2 size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label="المبلغ" size="small" type="number" value={profitWithdrawalAmount} onChange={(e) => setProfitWithdrawalAmount(e.target.value)} />
                </Grid2>
                <Grid2 size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label="ملاحظة" size="small" value={profitWithdrawalNote} onChange={(e) => setProfitWithdrawalNote(e.target.value)} />
                </Grid2>
                <Grid2 size={{ xs: 12 }}>
                  <Button variant="outlined" color="warning" onClick={submitProfitWithdrawal} disabled={Number(profitWithdrawalAmount) <= 0}>
                    تسجيل سحب أرباح
                  </Button>
                </Grid2>
              </Grid2>
            </SectionCard>
          </Grid2>
        </Grid2>
      ) : null}

      <SectionCard title="عهدة الكاشير (الدرج)">
        <MetricCard
          label="رصيد العهدة"
          value={`${physicalCash.toLocaleString('en-US')} ج.م`}
          note={cumulative ? 'تراكمي — حركات نقدية فقط' : 'رصيد افتتاح + تحصيل نقدي معلّق + إيداع − سحب/مصروف'}
          progress={physicalCash > 0 ? 72 : 0}
          tone="info"
        />
        <Alert severity="info" sx={{ mt: 1.5 }}>
          التحصيل النقدي يزيد العهدة. اعتماد الإدارة يخصم المبلغ من العهدة ويسجّله في الخزنة.
        </Alert>
      </SectionCard>
    </Stack>
  );
}
