import { Alert, Grid2, Paper, Stack, Typography } from '@mui/material';
import { MetricCard } from '../shared.js';
import { cardSx, ui } from '../../lib/ui-tokens.js';
import { paymentMethodLabel } from '../../lib/treasury-store.js';

const WALLET_METHODS = ['CASH', 'INSTAPAY', 'WALLET', 'CARD'] as const;

function fmt(n: number) {
  return `${n.toLocaleString('en-US')} ج.م`;
}

type ExpensesTreasuryPanelProps = {
  treasury?: {
    expensesSafe?: number;
    profitsSafe?: number;
    walletBalances?: Record<string, { EXPENSES?: number; PROFITS?: number; total?: number }>;
  };
  payAmount?: number;
  payMethodType?: string | undefined;
  compact?: boolean;
};

export function ExpensesTreasuryPanel({ treasury, payAmount = 0, payMethodType, compact }: ExpensesTreasuryPanelProps) {
  const expensesSafe = Number(treasury?.expensesSafe ?? 0);
  const walletBalances = treasury?.walletBalances ?? {};

  const selectedAvailable = payMethodType
    ? Number(walletBalances[payMethodType]?.EXPENSES ?? 0)
    : expensesSafe;

  const afterPay = payAmount > 0 ? selectedAvailable - payAmount : selectedAvailable;
  const insufficient = payAmount > 0 && afterPay < -0.01;

  return (
    <Stack spacing={1.5}>
      <Grid2 container spacing={1.5}>
        <Grid2 size={{ xs: 12, sm: compact ? 12 : 4 }}>
          <MetricCard
            label="إجمالي خزينة المصروفات"
            value={fmt(expensesSafe)}
            note="EXPENSES · المصدر لدفعات الموردين"
          />
        </Grid2>
        {!compact ? (
          <>
            <Grid2 size={{ xs: 6, sm: 4 }}>
              <MetricCard
                label={payMethodType ? `متاح (${paymentMethodLabel(payMethodType)})` : 'المتاح للدفع'}
                value={fmt(selectedAvailable)}
                note="حسب وسيلة الدفع المختارة"
              />
            </Grid2>
            <Grid2 size={{ xs: 6, sm: 4 }}>
              <MetricCard
                label={payAmount > 0 ? 'بعد الدفعة' : '—'}
                value={payAmount > 0 ? fmt(Math.max(0, afterPay)) : '—'}
                {...(payAmount > 0 ? { note: insufficient ? 'رصيد غير كافٍ' : 'تقديري' } : {})}
              />
            </Grid2>
          </>
        ) : null}
      </Grid2>

      {insufficient ? (
        <Alert severity="error">
          رصيد خزينة المصروفات ({paymentMethodLabel(payMethodType!)}) غير كافٍ للدفعة. المتاح: {fmt(selectedAvailable)} — المطلوب: {fmt(payAmount)}
        </Alert>
      ) : null}

      <Paper elevation={0} sx={{ ...cardSx, p: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
          رصيد المصروفات حسب الوسيلة
        </Typography>
        <Grid2 container spacing={1}>
          {WALLET_METHODS.map((method) => {
            const bal = Number(walletBalances[method]?.EXPENSES ?? 0);
            const isSelected = payMethodType === method;
            return (
              <Grid2 key={method} size={{ xs: 6, sm: 3 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.25,
                    border: `1px solid ${isSelected ? ui.primary : ui.border}`,
                    bgcolor: isSelected ? ui.skyLight : ui.paper,
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="caption" color="text.secondary">{paymentMethodLabel(method)}</Typography>
                  <Typography fontWeight={800} color={bal <= 0 ? 'text.secondary' : ui.ink}>
                    {fmt(bal)}
                  </Typography>
                </Paper>
              </Grid2>
            );
          })}
        </Grid2>
      </Paper>
    </Stack>
  );
}
