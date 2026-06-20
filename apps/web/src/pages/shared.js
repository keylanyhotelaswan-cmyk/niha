import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Avatar, Box, Card, CardContent, Chip, Grid2, LinearProgress, Paper, Stack, Typography } from '@mui/material';
export function SectionCard({ title, description, action, children }) {
    return (_jsx(Paper, { elevation: 0, sx: { p: 2.5, borderRadius: 5, border: '1px solid rgba(117, 89, 77, 0.12)', background: 'linear-gradient(180deg, rgba(255,250,244,0.96), rgba(255,245,235,0.98))', boxShadow: '0 18px 38px rgba(47, 31, 24, 0.05)' }, children: _jsxs(Stack, { spacing: 2.5, children: [_jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "h5", fontWeight: 800, children: title }), description ? (_jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mt: 0.5 }, children: description })) : null] }), action] }), children] }) }));
}
export function MetricCard({ label, value, note, progress, tone }) {
    return (_jsx(Card, { elevation: 0, sx: { height: '100%', borderRadius: 5, border: '1px solid rgba(117, 89, 77, 0.12)', background: 'linear-gradient(180deg, rgba(255,251,246,0.98), rgba(252,243,232,0.98))' }, children: _jsx(CardContent, { children: _jsxs(Stack, { spacing: 1.4, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: label }), _jsx(Typography, { variant: "h4", fontWeight: 800, children: value }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: note }), _jsx(LinearProgress, { variant: "determinate", value: progress, sx: {
                            height: 8,
                            borderRadius: 999,
                            backgroundColor: 'rgba(148, 163, 184, 0.14)',
                            '& .MuiLinearProgress-bar': {
                                borderRadius: 999,
                                backgroundColor: tone,
                            },
                        } })] }) }) }));
}
export function WorkflowList({ items }) {
    return (_jsx(Stack, { spacing: 2, children: items.map((item, index) => (_jsxs(Stack, { direction: "row", spacing: 1.5, alignItems: "flex-start", children: [_jsx(Avatar, { sx: { width: 32, height: 32, bgcolor: 'rgba(185,56,23,0.12)', color: '#b93817', fontSize: 14 }, children: index + 1 }), _jsx(Typography, { variant: "body2", color: "text.secondary", lineHeight: 1.9, children: item })] }, item))) }));
}
export function StatusCards({ items }) {
    return (_jsx(Grid2, { container: true, spacing: 2, children: items.map((item) => (_jsx(Grid2, { size: { xs: 12, md: 6 }, children: _jsx(Card, { elevation: 0, sx: {
                    height: '100%',
                    borderRadius: 4,
                    border: '1px solid rgba(117, 89, 77, 0.12)',
                    background: 'linear-gradient(180deg, rgba(255,250,244,0.98), rgba(252,243,232,0.98))',
                }, children: _jsx(CardContent, { children: _jsxs(Stack, { spacing: 1.5, children: [_jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 1, children: [_jsx(Typography, { variant: "h6", fontWeight: 800, children: item.title }), _jsx(Chip, { label: item.status, size: "small", sx: {
                                            bgcolor: `${item.accent}14`,
                                            color: item.accent,
                                            fontWeight: 700,
                                        } })] }), _jsx(Typography, { variant: "body2", color: "text.secondary", lineHeight: 1.9, children: item.description })] }) }) }) }, item.title))) }));
}
