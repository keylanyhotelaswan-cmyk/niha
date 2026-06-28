import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Card, CardContent, Grid2, Paper, Stack, Typography } from '@mui/material';
import { cardSx, metricToneSx, ui } from '../lib/ui-tokens.js';
export function SectionCard({ title, description, action, children, compact, }) {
    return (_jsx(Paper, { elevation: 0, sx: { ...cardSx, p: compact ? 2 : 2.25 }, children: _jsxs(Stack, { spacing: compact ? 1.5 : 2, children: [_jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 1, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "h6", children: title }), description ? (_jsx(Typography, { variant: "body2", sx: { mt: 0.25 }, children: description })) : null] }), action] }), children] }) }));
}
export function MetricCard({ label, value, note, tone = 'default', }) {
    const isHexTone = typeof tone === 'string' && tone.startsWith('#');
    const toneStyle = isHexTone ? null : metricToneSx(tone);
    const valueColor = isHexTone ? tone : toneStyle.color;
    const labelColor = isHexTone ? ui.muted : toneStyle.color;
    const bgcolor = isHexTone ? ui.paper : toneStyle.bgcolor;
    return (_jsx(Card, { elevation: 0, sx: {
            height: '100%',
            ...cardSx,
            bgcolor,
            boxShadow: tone === 'default' || isHexTone ? ui.shadowSm : 'none',
            ...(isHexTone ? { borderLeft: `3px solid ${tone}` } : {}),
        }, children: _jsx(CardContent, { sx: { py: 2, '&:last-child': { pb: 2 } }, children: _jsxs(Stack, { spacing: 0.75, children: [_jsx(Typography, { variant: "body2", sx: { color: isHexTone ? ui.muted : labelColor, opacity: isHexTone ? 1 : 0.85 }, children: label }), _jsx(Typography, { variant: "h5", fontWeight: 700, letterSpacing: "-0.02em", sx: { color: valueColor }, children: value }), note ? (_jsx(Typography, { variant: "caption", sx: { color: isHexTone ? 'text.secondary' : labelColor, opacity: isHexTone ? 1 : 0.75 }, children: note })) : null] }) }) }));
}
export function WorkflowList({ items }) {
    return (_jsx(Stack, { spacing: 1.5, component: "ol", sx: { m: 0, pl: 2.5 }, children: items.map((item) => (_jsx(Typography, { component: "li", variant: "body2", children: item }, item))) }));
}
export function StatusCards({ items, }) {
    return (_jsx(Grid2, { container: true, spacing: 1.5, children: items.map((item) => (_jsx(Grid2, { size: { xs: 12, sm: 6 }, children: _jsxs(Paper, { elevation: 0, sx: { p: 2, ...cardSx }, children: [_jsx(Typography, { variant: "subtitle2", children: item.title }), _jsx(Typography, { variant: "body2", sx: { mt: 0.5 }, children: item.description })] }) }, item.title))) }));
}
