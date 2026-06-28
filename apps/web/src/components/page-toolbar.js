import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Typography } from '@mui/material';
import { ui } from '../lib/ui-tokens.js';
export function PageToolbar({ title, subtitle, meta, actions, }) {
    return (_jsx(Box, { sx: { mb: 0.5 }, children: _jsxs(Box, { sx: {
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                justifyContent: 'space-between',
                alignItems: { md: 'center' },
                gap: 2,
            }, children: [_jsxs(Box, { children: [_jsx(Typography, { component: "h1", variant: "h5", sx: { m: 0, fontWeight: 700, color: ui.ink, letterSpacing: '-0.02em' }, children: title }), subtitle ? (_jsx(Typography, { variant: "body2", sx: { mt: 0.5, color: ui.muted, lineHeight: 1.5 }, children: subtitle })) : null, meta] }), actions ? (_jsx(Box, { sx: { display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }, children: actions })) : null] }) }));
}
