import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Grid2, Paper, Typography } from '@mui/material';
import { formatCurrency } from '../utils.js';
export function PosKpiGrid({ shiftOpen, posSummary, uncollectedCount, uncollectedAmount, suspendedCount }) {
    const stats = [
        {
            label: 'مبيعات الوردية',
            value: shiftOpen && posSummary ? formatCurrency(posSummary.salesTotal ?? 0) : '—',
            tone: '#0f766e',
            note: shiftOpen && posSummary ? `${posSummary.ordersCount ?? 0} طلب مغلق` : 'لا وردية نشطة',
        },
        {
            label: 'تم التحصيل (نقدي)',
            value: shiftOpen && posSummary ? formatCurrency(posSummary.pendingCashInCustody ?? 0) : '—',
            tone: '#1d4ed8',
            note: 'في عهدة الكاشير — يُخصم عند اعتماد الإدارة',
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
            note: shiftOpen && posSummary ? `فتح ${formatCurrency(posSummary.openingFloat ?? 0)}` : undefined,
        },
        {
            label: 'طلبات معلّقة',
            value: String(suspendedCount),
            tone: '#be123c',
            note: 'سلة غير مكتملة',
        },
    ];
    return (_jsx(Grid2, { container: true, spacing: 1.5, children: stats.map((stat) => (_jsx(Grid2, { size: { xs: 6, md: 4, lg: 2 }, children: _jsxs(Paper, { elevation: 0, sx: { p: 1.75, borderRadius: 4, border: '1px solid rgba(117,89,77,0.12)', bgcolor: 'rgba(255,250,244,0.95)' }, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", children: stat.label }), _jsx(Typography, { variant: "h5", fontWeight: 800, sx: { color: stat.tone }, children: stat.value }), stat.note ? _jsx(Typography, { variant: "caption", color: "text.secondary", children: stat.note }) : null] }) }, stat.label))) }));
}
