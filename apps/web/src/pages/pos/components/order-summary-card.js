import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { getCollectionStatusLabel } from '../../../lib/pos-store.js';
import { collectionTone, formatCurrency } from '../utils.js';
export function OrderSummaryCard({ order, variant, onAction, actionLabel }) {
    const tone = collectionTone(order.collectionStatus);
    const accent = variant === 'suspended' ? '#d97706' : '#0f766e';
    return (_jsx(Card, { elevation: 0, sx: {
            borderRadius: 4,
            border: `1px solid ${variant === 'suspended' ? 'rgba(217,119,6,0.22)' : 'rgba(15,118,110,0.18)'}`,
            background: variant === 'suspended'
                ? 'linear-gradient(145deg, rgba(255,251,246,1), rgba(254,243,199,0.45))'
                : 'linear-gradient(145deg, rgba(255,251,246,1), rgba(204,251,241,0.35))',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 28px rgba(47,31,24,0.08)' },
        }, children: _jsx(CardContent, { sx: { p: 2 }, children: _jsxs(Stack, { spacing: 1.25, children: [_jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 1, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "caption", sx: { color: accent, fontWeight: 800 }, children: variant === 'suspended' ? 'معلّق (سلة)' : 'مغلق' }), _jsxs(Typography, { fontWeight: 800, fontSize: "1.05rem", children: ["\u0637\u0644\u0628 \u0631\u0642\u0645 ", order.code] }), _jsxs(Typography, { variant: "body2", color: "text.secondary", children: [order.ownerName || 'بدون اسم', " \u00B7 ", order.orderType === 'eat-in' ? 'صالة' : 'تيك أواي'] }), order.orderType === 'takeaway' ? (_jsx(Chip, { size: "small", label: "\u062A\u064A\u0643 \u0623\u0648\u0627\u064A", sx: { mt: 0.5, fontWeight: 700, bgcolor: 'rgba(185,28,28,0.10)', color: '#b91c1c' } })) : null, order.customerPhone ? (_jsxs(Typography, { variant: "caption", color: "text.secondary", display: "block", children: ["\u0647\u0627\u062A\u0641: ", order.customerPhone] })) : null, order.customerAddress ? (_jsxs(Typography, { variant: "caption", color: "text.secondary", display: "block", children: ["\u0639\u0646\u0648\u0627\u0646: ", order.customerAddress] })) : null, order.captainName ? (_jsxs(Typography, { variant: "caption", color: "text.secondary", display: "block", children: ["\u0643\u0627\u0628\u062A\u0646: ", order.captainName] })) : null] }), _jsx(Typography, { fontWeight: 800, color: "primary.main", children: formatCurrency(order.total) })] }), _jsxs(Stack, { direction: "row", spacing: 0.75, flexWrap: "wrap", useFlexGap: true, children: [_jsx(Chip, { size: "small", label: `${order.itemsCount} صنف`, variant: "outlined" }), _jsx(Chip, { size: "small", label: getCollectionStatusLabel(order.collectionStatus), sx: { bgcolor: tone.bg, color: tone.color, fontWeight: 700 } })] }), onAction && actionLabel ? (_jsx(Button, { size: "small", variant: "outlined", fullWidth: true, onClick: onAction, sx: { borderRadius: 2.5, fontWeight: 700 }, children: actionLabel })) : null] }) }) }));
}
