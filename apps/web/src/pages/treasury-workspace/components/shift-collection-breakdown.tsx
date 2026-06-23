import { Grid2, Paper, Stack, Typography } from '@mui/material';
import { shiftCollectionRows, formatShiftMoney, type ShiftSummaryLike } from '../../../lib/shift-summary-utils.js';

type ShiftCollectionBreakdownProps = {
  summary: ShiftSummaryLike | null | undefined;
  compact?: boolean;
};

export function ShiftCollectionBreakdown({ summary, compact }: ShiftCollectionBreakdownProps) {
  const rows = shiftCollectionRows(summary);
  const visible = compact
    ? rows.filter((r) => r.total > 0 || r.method === 'CASH')
    : rows;

  return (
    <Grid2 container spacing={1.5}>
      {visible.map((row) => (
        <Grid2 key={row.method} size={{ xs: 6, sm: 3 }}>
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              borderRadius: 2.5,
              height: '100%',
              bgcolor: row.method === 'CASH' ? 'rgba(15,118,110,0.06)' : 'rgba(255,250,244,0.95)',
            }}
          >
            <Stack spacing={0.35}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                {row.label}
              </Typography>
              <Typography variant="h6" fontWeight={800} fontSize="1.05rem">
                {formatShiftMoney(row.total)}
              </Typography>
              {!compact ? (
                <Typography variant="caption" color="text.secondary">
                  معتمد {formatShiftMoney(row.approved)}
                  {row.pending > 0 ? ` · معلق ${formatShiftMoney(row.pending)}` : ''}
                  {row.expense > 0 ? ` · مصروف ${formatShiftMoney(row.expense)}` : ''}
                  {row.transferOut > 0 ? ` · تحويل خارج ${formatShiftMoney(row.transferOut)}` : ''}
                  {row.transferIn > 0 ? ` · تحويل داخل ${formatShiftMoney(row.transferIn)}` : ''}
                </Typography>
              ) : row.pending > 0 || row.expense > 0 || row.transferOut > 0 || row.transferIn > 0 ? (
                <Typography variant="caption" color={row.expense > 0 ? 'text.secondary' : 'warning.main'}>
                  {row.pending > 0 ? `معلق ${formatShiftMoney(row.pending)}` : ''}
                  {row.pending > 0 && (row.expense > 0 || row.transferOut > 0 || row.transferIn > 0) ? ' · ' : ''}
                  {row.expense > 0 ? `مصروف ${formatShiftMoney(row.expense)}` : ''}
                  {row.expense > 0 && (row.transferOut > 0 || row.transferIn > 0) ? ' · ' : ''}
                  {row.transferOut > 0 ? `خارج ${formatShiftMoney(row.transferOut)}` : ''}
                  {row.transferOut > 0 && row.transferIn > 0 ? ' · ' : ''}
                  {row.transferIn > 0 ? `داخل ${formatShiftMoney(row.transferIn)}` : ''}
                </Typography>
              ) : null}
            </Stack>
          </Paper>
        </Grid2>
      ))}
    </Grid2>
  );
}
