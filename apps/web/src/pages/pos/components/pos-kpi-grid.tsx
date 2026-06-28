import { Button, Grid2, Paper, Stack, Typography } from '@mui/material';
import { formatCurrency } from '../utils.js';
import { ShiftCollectionBreakdown } from '../../treasury-workspace/components/shift-collection-breakdown.js';
import { formatShiftDuration, shiftCollectionRows } from '../../../lib/shift-summary-utils.js';
import { MetricCard } from '../../shared.js';
import { cardSx } from '../../../lib/ui-tokens.js';
import type { MetricTone } from '../../../lib/ui-tokens.js';

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

  const stats: Array<{ label: string; value: string; note?: string; tone: MetricTone }> = [
    {
      label: 'مبيعات الوردية',
      value: shiftOpen && posSummary ? formatCurrency(posSummary.salesTotal ?? posSummary.totalSales ?? 0) : '—',
      note: shiftOpen && posSummary ? `${posSummary.ordersCount ?? 0} طلب مغلق` : 'لا وردية نشطة',
      tone: 'primary',
    },
    {
      label: 'تحصيل نقدي',
      value: shiftOpen && posSummary ? formatCurrency(cashCollected) : '—',
      note: cashRow && cashRow.pending > 0 ? `معلق ${formatCurrency(cashRow.pending)}` : 'إيصالات نقدية',
      tone: 'success',
    },
    {
      label: 'لم يُحصّل بعد',
      value: shiftOpen ? formatCurrency(uncollectedAmount) : '—',
      tone: uncollectedCount > 0 ? 'warning' : 'default',
      ...(shiftOpen ? { note: `${uncollectedCount} طلب في الدرج` } : {}),
    },
    {
      label: 'مصروفات الوردية',
      value: shiftOpen && posSummary ? formatCurrency(posSummary.expensesTotal ?? 0) : '—',
      note: shiftOpen && posSummary
        ? `عام ${formatCurrency(posSummary.expensesGeneral ?? 0)} · خامات ${formatCurrency(posSummary.expensesItems ?? 0)}`
        : 'تُخصم من عهدة الكاشير',
      tone: 'info',
    },
    {
      label: 'عهدة الكاشير',
      value: shiftOpen && posSummary ? formatCurrency(posSummary.expectedCash ?? 0) : '—',
      tone: 'default',
      ...(shiftOpen && posSummary
        ? { note: `فتح ${formatCurrency(posSummary.openingFloat ?? 0)}${openedAt ? ` · ${formatShiftDuration(openedAt)}` : ''}` }
        : {}),
    },
    {
      label: 'طلبات معلّقة',
      value: String(suspendedCount),
      note: 'سلة غير مكتملة',
      tone: suspendedCount > 0 ? 'warning' : 'default',
    },
  ];

  return (
    <Stack spacing={1.5}>
      <Grid2 container spacing={1.5}>
        {stats.map((stat) => (
          <Grid2 key={stat.label} size={{ xs: 6, md: 4, lg: 2 }}>
            <MetricCard label={stat.label} value={stat.value} {...(stat.note ? { note: stat.note } : {})} tone={stat.tone} />
          </Grid2>
        ))}
      </Grid2>

      {shiftOpen && posSummary ? (
        <Paper elevation={0} sx={{ ...cardSx, p: 2 }}>
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
