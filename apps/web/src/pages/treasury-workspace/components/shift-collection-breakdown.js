import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Grid2, Paper, Stack, Typography } from '@mui/material';
import { shiftCollectionRows, formatShiftMoney } from '../../../lib/shift-summary-utils.js';
export function ShiftCollectionBreakdown({ summary, compact }) {
    const rows = shiftCollectionRows(summary);
    const visible = compact ? rows.filter((r) => r.total > 0) : rows;
    return (_jsx(Grid2, { container: true, spacing: 1.5, children: visible.map((row) => (_jsx(Grid2, { size: { xs: 6, sm: 3 }, children: _jsx(Paper, { variant: "outlined", sx: {
                    p: 1.5,
                    borderRadius: 2.5,
                    height: '100%',
                    bgcolor: row.method === 'CASH' ? 'rgba(15,118,110,0.06)' : 'rgba(255,250,244,0.95)',
                }, children: _jsxs(Stack, { spacing: 0.35, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", fontWeight: 700, children: row.label }), _jsx(Typography, { variant: "h6", fontWeight: 800, fontSize: "1.05rem", children: formatShiftMoney(row.total) }), !compact ? (_jsxs(Typography, { variant: "caption", color: "text.secondary", children: ["\u0645\u0639\u062A\u0645\u062F ", formatShiftMoney(row.approved), row.pending > 0 ? ` · معلق ${formatShiftMoney(row.pending)}` : ''] })) : row.pending > 0 ? (_jsxs(Typography, { variant: "caption", color: "warning.main", children: ["\u0645\u0639\u0644\u0642 ", formatShiftMoney(row.pending)] })) : null] }) }) }, row.method))) }));
}
