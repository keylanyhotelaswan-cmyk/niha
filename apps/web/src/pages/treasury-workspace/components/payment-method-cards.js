import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Grid2, Paper, Stack, Typography } from '@mui/material';
import { paymentMethodLabel } from '../../../lib/treasury-store.js';
import { cardSx } from '../../../lib/ui-tokens.js';
export function PaymentMethodCards({ paymentMethods, breakdown, mode = 'today', }) {
    return (_jsxs(Grid2, { container: true, spacing: 1.5, children: [paymentMethods.map((pm) => {
                const entry = breakdown[pm.type] ?? breakdown[pm.code];
                const approved = typeof entry === 'number' ? entry : Number(entry?.approved ?? 0);
                const pending = typeof entry === 'number' ? 0 : Number(entry?.pending ?? 0);
                const inTreasury = mode === 'today' ? approved + pending : approved;
                return (_jsx(Grid2, { size: { xs: 12, sm: 6, md: 4 }, children: _jsx(Paper, { elevation: 0, sx: { ...cardSx, p: 2 }, children: _jsxs(Stack, { spacing: 0.75, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", children: pm.name }), _jsxs(Typography, { variant: "h6", fontWeight: 800, children: [inTreasury.toLocaleString('en-US'), " \u062C.\u0645"] }), mode === 'today' && pending > 0 ? (_jsxs(Typography, { variant: "caption", color: "warning.main", children: ["\u0628\u0627\u0646\u062A\u0638\u0627\u0631 \u0627\u0639\u062A\u0645\u0627\u062F: ", pending.toLocaleString('en-US'), " \u062C.\u0645"] })) : null, mode === 'today' && approved > 0 ? (_jsxs(Typography, { variant: "caption", color: "text.secondary", children: ["\u0645\u0639\u062A\u0645\u062F \u0646\u0647\u0627\u0626\u064A: ", approved.toLocaleString('en-US'), " \u062C.\u0645"] })) : null, mode === 'today' && inTreasury > 0 ? (_jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u0641\u064A \u0627\u0644\u062E\u0632\u0646\u0629 (\u0648\u064F\u0633\u0650\u0651\u0644 \u0645\u0646 \u0627\u0644\u0643\u0627\u0634\u064A\u0631)" })) : null, _jsx(Typography, { variant: "caption", color: "text.secondary", children: paymentMethodLabel(pm.type) })] }) }) }, pm.code));
            }), paymentMethods.length === 0 ? (_jsx(Grid2, { size: 12, children: _jsx(Box, { sx: { py: 2, textAlign: 'center', color: 'text.secondary' }, children: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0637\u0631\u0642 \u062F\u0641\u0639 \u0646\u0634\u0637\u0629." }) })) : null] }));
}
