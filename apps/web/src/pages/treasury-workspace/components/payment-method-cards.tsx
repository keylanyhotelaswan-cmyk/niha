import { Box, Grid2, Paper, Stack, Typography } from '@mui/material';
import { paymentMethodLabel } from '../../../lib/treasury-store.js';
import { cardSx, ui } from '../../../lib/ui-tokens.js';

type PaymentMethodRow = {
  code: string;
  name: string;
  type: string;
};

type Breakdown = Record<string, { approved?: number; pending?: number } | number>;

export function PaymentMethodCards({
  paymentMethods,
  breakdown,
  mode = 'today',
}: {
  paymentMethods: PaymentMethodRow[];
  breakdown: Breakdown;
  mode?: 'today' | 'cumulative';
}) {
  return (
    <Grid2 container spacing={1.5}>
      {paymentMethods.map((pm) => {
        const entry = breakdown[pm.type] ?? breakdown[pm.code];
        const approved = typeof entry === 'number' ? entry : Number(entry?.approved ?? 0);
        const pending = typeof entry === 'number' ? 0 : Number(entry?.pending ?? 0);
        const inTreasury = mode === 'today' ? approved + pending : approved;

        return (
          <Grid2 key={pm.code} size={{ xs: 12, sm: 6, md: 4 }}>
            <Paper elevation={0} sx={{ ...cardSx, p: 2 }}>
              <Stack spacing={0.75}>
                <Typography variant="caption" color="text.secondary">{pm.name}</Typography>
                <Typography variant="h6" fontWeight={800}>
                  {inTreasury.toLocaleString('en-US')} ج.م
                </Typography>
                {mode === 'today' && pending > 0 ? (
                  <Typography variant="caption" color="warning.main">
                    بانتظار اعتماد: {pending.toLocaleString('en-US')} ج.م
                  </Typography>
                ) : null}
                {mode === 'today' && approved > 0 ? (
                  <Typography variant="caption" color="text.secondary">
                    معتمد نهائي: {approved.toLocaleString('en-US')} ج.م
                  </Typography>
                ) : null}
                {mode === 'today' && inTreasury > 0 ? (
                  <Typography variant="caption" color="text.secondary">
                    في الخزنة (وُسِّل من الكاشير)
                  </Typography>
                ) : null}
                <Typography variant="caption" color="text.secondary">
                  {paymentMethodLabel(pm.type)}
                </Typography>
              </Stack>
            </Paper>
          </Grid2>
        );
      })}
      {paymentMethods.length === 0 ? (
        <Grid2 size={12}>
          <Box sx={{ py: 2, textAlign: 'center', color: 'text.secondary' }}>لا توجد طرق دفع نشطة.</Box>
        </Grid2>
      ) : null}
    </Grid2>
  );
}
