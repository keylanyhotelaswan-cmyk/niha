import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Button, Container, Divider, Drawer, IconButton, List, ListItemButton, ListItemText, Paper, Stack, Typography, useMediaQuery, } from '@mui/material';
import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context.js';
import { cardSx, sidebarSx, ui } from '../../lib/ui-tokens.js';
const settingsNav = [
    { label: 'نظرة عامة', path: '/settings', hint: 'ملخص الإعدادات', end: true },
    { label: 'الفاتورة والطباعة', path: '/settings/receipt', hint: 'الشكل، الهوامش، الخط، الطابعة' },
    { label: 'المستخدمين', path: '/settings/users', hint: 'الحسابات والصلاحيات', permission: 'users.manage' },
];
function SettingsSidebar({ onNavigate }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { permissions, user, logout } = useAuth();
    const granted = permissions?.map((p) => p.code) ?? [];
    const visibleNav = settingsNav.filter((item) => !item.permission || granted.includes(item.permission));
    return (_jsx(Paper, { elevation: 0, sx: { ...sidebarSx, p: 2, height: '100%', minHeight: { xs: 'auto', md: 'calc(100vh - 48px)' } }, children: _jsxs(Stack, { spacing: 2.5, sx: { height: '100%' }, children: [_jsxs(Stack, { spacing: 0.25, children: [_jsx(Typography, { variant: "overline", children: "NIHA" }), _jsx(Typography, { variant: "h6", children: "\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A" }), _jsx(Typography, { variant: "body2", children: "\u062A\u062E\u0635\u064A\u0635 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0648\u0627\u0644\u0637\u0628\u0627\u0639\u0629 \u0648\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0646\u0638\u0627\u0645." })] }), _jsx(List, { disablePadding: true, sx: { display: 'grid', gap: 0.25, flex: 1 }, children: visibleNav.map((item) => {
                        const active = item.end
                            ? location.pathname === item.path
                            : location.pathname.startsWith(item.path);
                        return (_jsx(ListItemButton, { component: NavLink, to: item.path, ...(item.end !== undefined ? { end: item.end } : {}), onClick: onNavigate, sx: {
                                px: 1.5,
                                py: 1,
                                borderRadius: `${ui.radiusSm}px`,
                                bgcolor: active ? ui.sidebarActive : 'transparent',
                                '&:hover': {
                                    bgcolor: active ? ui.sidebarActive : ui.sidebarHover,
                                },
                            }, children: _jsx(ListItemText, { primary: item.label, secondary: item.hint, primaryTypographyProps: {
                                    fontWeight: active ? 700 : 500,
                                    fontSize: '0.9375rem',
                                    color: active ? ui.sidebarActiveText : ui.muted,
                                }, secondaryTypographyProps: { fontSize: '0.75rem' } }) }, item.path));
                    }) }), _jsx(Divider, {}), _jsxs(Stack, { spacing: 1, children: [_jsx(Button, { variant: "contained", fullWidth: true, size: "small", onClick: () => { navigate('/pos'); onNavigate?.(); }, children: "\u0627\u0644\u0639\u0648\u062F\u0629 \u0644\u0646\u0642\u0637\u0629 \u0627\u0644\u0628\u064A\u0639" }), user ? (_jsx(Button, { variant: "outlined", fullWidth: true, size: "small", onClick: () => { logout(); navigate('/login'); }, children: "\u062E\u0631\u0648\u062C" })) : null] })] }) }));
}
export function SettingsShell() {
    const isDesktop = useMediaQuery('(min-width: 960px)');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const location = useLocation();
    const pageTitle = useMemo(() => {
        if (location.pathname.startsWith('/settings/receipt'))
            return 'الفاتورة والطباعة';
        if (location.pathname.startsWith('/settings/users'))
            return 'المستخدمين';
        return 'نظرة عامة';
    }, [location.pathname]);
    return (_jsxs(Box, { sx: { minHeight: '100vh', py: { xs: 2, md: 2.5 }, bgcolor: ui.bg }, children: [_jsx(Container, { maxWidth: "xl", children: _jsxs(Stack, { spacing: 2, children: [_jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", sx: { pb: 1, borderBottom: `1px solid ${ui.border}` }, children: [_jsx(Typography, { variant: "h5", children: pageTitle }), !isDesktop ? (_jsx(IconButton, { size: "small", onClick: () => setDrawerOpen(true), "aria-label": "\u0627\u0644\u0642\u0627\u0626\u0645\u0629", children: _jsx(Typography, { variant: "body2", fontWeight: 600, children: "\u2630" }) })) : null] }), _jsxs(Box, { sx: {
                                display: 'grid',
                                gap: 2,
                                gridTemplateColumns: { xs: '1fr', md: '260px minmax(0, 1fr)' },
                                alignItems: 'start',
                            }, children: [isDesktop ? _jsx(SettingsSidebar, {}) : null, _jsx(Paper, { elevation: 0, sx: { ...cardSx, p: { xs: 2, md: 2.5 } }, children: _jsx(Outlet, {}) })] })] }) }), _jsx(Drawer, { anchor: "right", open: !isDesktop && drawerOpen, onClose: () => setDrawerOpen(false), children: _jsx(Box, { sx: { width: 280, p: 2, bgcolor: ui.ivory }, children: _jsx(SettingsSidebar, { onNavigate: () => setDrawerOpen(false) }) }) })] }));
}
