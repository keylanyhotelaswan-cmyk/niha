import { Button, Grid2, Paper, Stack, Typography } from '@mui/material';
import { formatCurrency } from '../utils.js';
import { ShiftCollectionBreakdown } from '../../treasury-workspace/components/shift-collection-breakdown.js';
import { formatShiftDuration, shiftCollectionRows } from '../../../lib/shift-summary-utils.js';

type KpiGridProps = {
  shiftOpen: boolean;
  posSummary: any;
  uncollectedCount: number;
  uncollectedAmount: number;
  suspendedCount: number;
  shiftNumber?: string;
  cashierName?: string;
  openedAt?: string | Date;
  onOpenSummaryPreview?: () => void;
};

export function PosKpiGrid({
  shiftOpen,
  posSummary,
  uncollectedCount,
  uncollectedAmount,
  suspendedCount,
  openedAt,
  onOpenSummaryPreview,
}: KpiGridProps) {
  const cashRow = shiftOpen && posSummary ? shiftCollectionRows(posSummary).find((r) => r.method === 'CASH') : null;
  const cashCollected = cashRow?.total ?? 0;

  const stats = [
    {
      label: 'مبيعات الوردية',
      value: shiftOpen && posSummary ? formatCurrency(posSummary.salesTotal ?? posSummary.totalSales ?? 0) : '—',
      tone: '#0f766e',
      note: shiftOpen && posSummary ? `${posSummary.ordersCount ?? 0} طلب مغلق` : 'لا وردية نشطة',
    },
    {
      label: 'تحصيل نقدي',
      value: shiftOpen && posSummary ? formatCurrency(cashCollected) : '—',
      tone: '#1d4ed8',
      note: cashRow && cashRow.pending > 0 ? `معلق ${formatCurrency(cashRow.pending)}` : 'إيصالات نقدية',
    },
    {
      label: 'لم يُحصّل بعد',
      value: shiftOpen ? formatCurrency(uncollectedAmount) : '—',
      tone: '#d97706',
      note: shiftOpen ? `${uncollectedCount} طلب في الدرج` : undefined,
    },
    {
      label: 'مصروفات الوردية',
      value: shiftOpen && posSummary ? formatCurrency(posSummary.expensesTotal ?? 0) : '—',
      tone: '#b45309',
      note: shiftOpen && posSummary
        ? `عام ${formatCurrency(posSummary.expensesGeneral ?? 0)} · خامات ${formatCurrency(posSummary.expensesItems ?? 0)}`
        : 'تُخصم من عهدة الكاشير',
    },
    {
      label: 'عهدة الكاشير',
      value: shiftOpen && posSummary ? formatCurrency(posSummary.expectedCash ?? 0) : '—',
      tone: '#7c3aed',
      note: shiftOpen && posSummary
        ? `فتح ${formatCurrency(posSummary.openingFloat ?? 0)}${openedAt ? ` · ${formatShiftDuration(openedAt)}` : ''}`
        : undefined,
    },
    {
      label: 'طلبات معلّقة',
      value: String(suspendedCount),
      tone: '#be123c',
      note: 'سلة غير مكتملة',
    },
  ];

  return (
    <Stack spacing={1.5}>
      <Grid2 container spacing={1.5}>
        {stats.map((stat) => (
          <Grid2 key={stat.label} size={{ xs: 6, md: 4, lg: 2 }}>
            <Paper elevation={0} sx={{ p: 1.75, borderRadius: 4, border: '1px solid rgba(117,89,77,0.12)', bgcolor: 'rgba(255,250,244,0.95)' }}>
              <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
              <Typography variant="h5" fontWeight={800} sx={{ color: stat.tone }}>{stat.value}</Typography>
              {stat.note ? <Typography variant="caption" color="text.secondary">{stat.note}</Typography> : null}
            </Paper>
          </Grid2>
        ))}
      </Grid2>

      {shiftOpen && posSummary ? (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 4, border: '1px solid rgba(117,89,77,0.12)', bgcolor: 'rgba(255,250,244,0.95)' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={800}>تحصيل الوردية (من الفتح حتى الآن)</Typography>
            {onOpenSummaryPreview ? (
              <Button size="small" variant="outlined" onClick={onOpenSummaryPreview}>
                ملخص الوردية
              </Button>
            ) : null}
          </Stack>
          <ShiftCollectionBreakdown summary={posSummary} compact />
        </Paper>
      ) : null}
    </Stack>
  );
}
