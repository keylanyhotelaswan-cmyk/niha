import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Grid2, Paper, Stack, Typography } from '@mui/material';
import { shiftCollectionRows, formatShiftMoney } from '../../../lib/shift-summary-utils.js';
export function ShiftCollectionBreakdown({ summary, compact }) {
    const rows = shiftCollectionRows(summary);
    const visible = compact
        ? rows.filter((r) => r.total > 0 || r.method === 'CASH')
        : rows;
    return (_jsx(Grid2, { container: true, spacing: 1.5, children: visible.map((row) => (_jsx(Grid2, { size: { xs: 6, sm: 3 }, children: _jsx(Paper, { variant: "outlined", sx: {
                    p: 1.5,
                    borderRadius: 2.5,
                    height: '100%',
                    bgcolor: row.method === 'CASH' ? 'rgba(15,118,110,0.06)' : 'rgba(255,250,244,0.95)',
                }, children: _jsxs(Stack, { spacing: 0.35, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", fontWeight: 700, children: row.label }), _jsx(Typography, { variant: "h6", fontWeight: 800, fontSize: "1.05rem", children: formatShiftMoney(row.total) }), !compact ? (_jsxs(Typography, { variant: "caption", color: "text.secondary", children: ["\u0645\u0639\u062A\u0645\u062F ", formatShiftMoney(row.approved), row.pending > 0 ? ` · معلق ${formatShiftMoney(row.pending)}` : '', row.expense > 0 ? ` · مصروف ${formatShiftMoney(row.expense)}` : '', row.transferOut > 0 ? ` · تحويل خارج ${formatShiftMoney(row.transferOut)}` : '', row.transferIn > 0 ? ` · تحويل داخل ${formatShiftMoney(row.transferIn)}` : ''] })) : row.pending > 0 || row.expense > 0 || row.transferOut > 0 || row.transferIn > 0 ? (_jsxs(Typography, { variant: "caption", color: row.expense > 0 ? 'text.secondary' : 'warning.main', children: [row.pending > 0 ? `معلق ${formatShiftMoney(row.pending)}` : '', row.pending > 0 && (row.expense > 0 || row.transferOut > 0 || row.transferIn > 0) ? ' · ' : '', row.expense > 0 ? `مصروف ${formatShiftMoney(row.expense)}` : '', row.expense > 0 && (row.transferOut > 0 || row.transferIn > 0) ? ' · ' : '', row.transferOut > 0 ? `خارج ${formatShiftMoney(row.transferOut)}` : '', row.transferOut > 0 && row.transferIn > 0 ? ' · ' : '', row.transferIn > 0 ? `داخل ${formatShiftMoney(row.transferIn)}` : ''] })) : null] }) }) }, row.method))) }));
}
