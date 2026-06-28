import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, Grid2, Paper, Stack, Typography } from '@mui/material';
import { formatCurrency } from '../utils.js';
import { ShiftCollectionBreakdown } from '../../treasury-workspace/components/shift-collection-breakdown.js';
import { formatShiftDuration, shiftCollectionRows } from '../../../lib/shift-summary-utils.js';
import { MetricCard } from '../../shared.js';
import { cardSx } from '../../../lib/ui-tokens.js';
export function PosKpiGrid({ shiftOpen, posSummary, uncollectedCount, uncollectedAmount, suspendedCount, openedAt, onOpenSummaryPreview, }) {
    const cashRow = shiftOpen && posSummary ? shiftCollectionRows(posSummary).find((r) => r.method === 'CASH') : null;
    const cashCollected = cashRow?.total ?? 0;
    const stats = [
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
    return (_jsxs(Stack, { spacing: 1.5, children: [_jsx(Grid2, { container: true, spacing: 1.5, children: stats.map((stat) => (_jsx(Grid2, { size: { xs: 6, md: 4, lg: 2 }, children: _jsx(MetricCard, { label: stat.label, value: stat.value, ...(stat.note ? { note: stat.note } : {}), tone: stat.tone }) }, stat.label))) }), shiftOpen && posSummary ? (_jsxs(Paper, { elevation: 0, sx: { ...cardSx, p: 2 }, children: [_jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", sx: { mb: 1.5 }, children: [_jsx(Typography, { variant: "subtitle2", fontWeight: 800, children: "\u062A\u062D\u0635\u064A\u0644 \u0627\u0644\u0648\u0631\u062F\u064A\u0629 (\u0645\u0646 \u0627\u0644\u0641\u062A\u062D \u062D\u062A\u0649 \u0627\u0644\u0622\u0646)" }), onOpenSummaryPreview ? (_jsx(Button, { size: "small", variant: "outlined", onClick: onOpenSummaryPreview, children: "\u0645\u0644\u062E\u0635 \u0627\u0644\u0648\u0631\u062F\u064A\u0629" })) : null] }), _jsx(ShiftCollectionBreakdown, { summary: posSummary, compact: true })] })) : null] }));
}
