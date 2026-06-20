import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Button, Chip, Container, Divider, Drawer, IconButton, List, ListItemButton, ListItemText, Paper, Stack, Typography, useMediaQuery, } from '@mui/material';
import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context.js';
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
    return (_jsx(Paper, { elevation: 0, sx: {
            p: 2.5,
            borderRadius: 4,
            border: '1px solid rgba(185, 56, 23, 0.14)',
            background: 'linear-gradient(180deg, rgba(255,248,239,0.98), rgba(250,239,226,0.98))',
            height: '100%',
            minHeight: { xs: 'auto', md: 'calc(100vh - 48px)' },
        }, children: _jsxs(Stack, { spacing: 2.5, sx: { height: '100%' }, children: [_jsxs(Stack, { spacing: 1, children: [_jsx(Chip, { label: "Niha Settings", color: "primary", sx: { alignSelf: 'flex-start', fontWeight: 700 } }), _jsx(Typography, { variant: "h5", fontWeight: 800, children: "\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A" }), _jsx(Typography, { variant: "body2", color: "text.secondary", lineHeight: 1.7, children: "\u0635\u0641\u062D\u0629 \u0645\u0633\u062A\u0642\u0644\u0629 \u0644\u062A\u062E\u0635\u064A\u0635 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0648\u0627\u0644\u0637\u0628\u0627\u0639\u0629 \u0648\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0646\u0638\u0627\u0645." })] }), _jsx(List, { disablePadding: true, sx: { display: 'grid', gap: 1, flex: 1 }, children: visibleNav.map((item) => {
                        const active = item.end
                            ? location.pathname === item.path
                            : location.pathname.startsWith(item.path);
                        return (_jsx(ListItemButton, { component: NavLink, to: item.path, ...(item.end !== undefined ? { end: item.end } : {}), onClick: onNavigate, sx: {
                                px: 1.5,
                                py: 1.25,
                                borderRadius: 3,
                                border: active ? '1px solid rgba(185, 56, 23, 0.35)' : '1px solid rgba(117, 89, 77, 0.12)',
                                bgcolor: active ? 'rgba(185, 56, 23, 0.10)' : 'rgba(255,250,244,0.82)',
                            }, children: _jsx(ListItemText, { primary: item.label, secondary: item.hint, primaryTypographyProps: { fontWeight: 800 } }) }, item.path));
                    }) }), _jsx(Divider, {}), _jsxs(Stack, { spacing: 1, children: [_jsx(Button, { variant: "contained", fullWidth: true, onClick: () => { navigate('/pos'); onNavigate?.(); }, children: "\u2190 \u0627\u0644\u0639\u0648\u062F\u0629 \u0644\u0646\u0642\u0637\u0629 \u0627\u0644\u0628\u064A\u0639" }), user ? (_jsxs(Button, { variant: "outlined", fullWidth: true, onClick: () => { logout(); navigate('/login'); }, children: ["\u062E\u0631\u0648\u062C (", user.fullName, ")"] })) : null] })] }) }));
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
    return (_jsxs(Box, { sx: {
            minHeight: '100vh',
            py: { xs: 2, md: 3 },
            background: 'linear-gradient(180deg, #fff8ef 0%, #faf3ea 100%)',
        }, children: [_jsx(Container, { maxWidth: "xl", children: _jsxs(Stack, { spacing: 2, children: [_jsx(Paper, { elevation: 0, sx: {
                                p: { xs: 2, md: 2.5 },
                                borderRadius: 4,
                                color: '#fff7ed',
                                background: 'linear-gradient(135deg, #2f1f18 0%, #5c2b18 40%, #b93817 100%)',
                            }, children: _jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, children: [_jsxs(Stack, { spacing: 0.5, children: [_jsx(Typography, { variant: "overline", sx: { opacity: 0.85 }, children: "Niha \u00B7 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A" }), _jsx(Typography, { variant: "h4", fontWeight: 800, children: pageTitle })] }), !isDesktop ? (_jsx(IconButton, { onClick: () => setDrawerOpen(true), sx: { color: '#fff7ed' }, children: _jsx(Typography, { fontWeight: 800, children: "\u0627\u0644\u0642\u0627\u0626\u0645\u0629" }) })) : null] }) }), _jsxs(Box, { sx: {
                                display: 'grid',
                                gap: 2.5,
                                gridTemplateColumns: { xs: '1fr', md: '280px minmax(0, 1fr)' },
                                alignItems: 'start',
                            }, children: [isDesktop ? _jsx(SettingsSidebar, {}) : null, _jsx(Paper, { elevation: 0, sx: { p: { xs: 2, md: 3 }, borderRadius: 4, border: '1px solid rgba(185,56,23,0.10)' }, children: _jsx(Outlet, {}) })] })] }) }), _jsx(Drawer, { anchor: "right", open: !isDesktop && drawerOpen, onClose: () => setDrawerOpen(false), children: _jsx(Box, { sx: { width: 300, p: 2 }, children: _jsx(SettingsSidebar, { onNavigate: () => setDrawerOpen(false) }) }) })] }));
}
