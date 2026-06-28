import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Avatar, Box, Container, Divider, Drawer, IconButton, List, ListItemButton, ListItemText, Paper, Stack, Button, Typography, useMediaQuery, } from '@mui/material';
import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './lib/auth-context.js';
import { sidebarSx, ui } from './lib/ui-tokens.js';
const navigation = [
    { label: 'نقطة البيع', path: '/pos', permission: 'pos.use' },
    { label: 'العملاء', path: '/customers', permissionAny: ['customers.read', 'treasury.manage', 'pos.use'] },
    { label: 'الخزنة والورديات', path: '/shifts', permission: 'treasury.manage' },
    { label: 'الإعدادات', path: '/settings', matchPrefix: true, permissionAny: ['treasury.manage', 'users.manage'] },
    { label: 'المستخدمين', path: '/settings/users', permission: 'users.manage' },
    { label: 'الكتالوج', path: '/catalog', permission: 'inventory.manage' },
    { label: 'المخزون', path: '/inventory', permission: 'inventory.manage' },
    { label: 'حسابات الموردين', path: '/vendor-accounts', permissionAny: ['vendor_accounts.view', 'vendor_accounts.manage', 'inventory.manage'] },
    { label: 'التأسيس', path: '/setup-costs', permission: 'setup_costs.manage' },
    { label: 'التقارير', path: '/reports', permission: 'reports.view' },
];
function ShellSidebar({ onNavigate }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, isAuthenticated, permissions } = useAuth();
    return (_jsx(Paper, { elevation: 0, sx: { ...sidebarSx, p: 2, height: '100%' }, children: _jsxs(Stack, { spacing: 2.5, children: [_jsxs(Stack, { spacing: 0.25, children: [_jsx(Typography, { variant: "overline", children: "NIHA" }), _jsx(Typography, { variant: "h6", children: "\u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u0645\u0637\u0639\u0645" })] }), _jsx(List, { disablePadding: true, sx: { display: 'grid', gap: 0.25 }, children: navigation
                        .filter((item) => {
                        const granted = permissions?.map((p) => p.code) ?? [];
                        const anyOf = item.permissionAny;
                        if (anyOf?.length)
                            return anyOf.some((c) => granted.includes(c));
                        if (!item.permission)
                            return true;
                        return granted.includes(item.permission);
                    })
                        .map((item) => {
                        const active = item.matchPrefix
                            ? item.path === '/settings'
                                ? location.pathname === '/settings' || location.pathname.startsWith('/settings/receipt')
                                : location.pathname.startsWith(item.path)
                            : location.pathname === item.path;
                        return (_jsx(ListItemButton, { component: NavLink, to: item.path, onClick: onNavigate, sx: {
                                px: 1.5,
                                py: 1,
                                borderRadius: `${ui.radiusSm}px`,
                                bgcolor: active ? ui.sidebarActive : 'transparent',
                                '&:hover': {
                                    bgcolor: active ? ui.sidebarActive : ui.sidebarHover,
                                },
                            }, children: _jsx(ListItemText, { primary: item.label, primaryTypographyProps: {
                                    fontWeight: active ? 700 : 500,
                                    fontSize: '0.9375rem',
                                    color: active ? ui.sidebarActiveText : ui.muted,
                                } }) }, item.path));
                    }) }), _jsx(Divider, {}), _jsxs(Stack, { direction: "row", spacing: 1.5, alignItems: "center", children: [_jsx(Avatar, { sx: { bgcolor: ui.primary, width: 32, height: 32, fontSize: 13 }, children: "N" }), _jsx(Typography, { variant: "body2", fontWeight: 600, noWrap: true, sx: { flex: 1 }, children: isAuthenticated && user ? user.fullName : 'Niha' })] }), isAuthenticated && user ? (_jsx(Button, { variant: "contained", color: "error", fullWidth: true, size: "small", onClick: () => {
                        logout();
                        navigate('/login');
                    }, sx: { borderRadius: `${ui.radiusPill}px` }, children: "\u062E\u0631\u0648\u062C" })) : (_jsx(Button, { variant: "contained", fullWidth: true, size: "small", onClick: () => { navigate('/login'); onNavigate?.(); }, children: "\u062F\u062E\u0648\u0644" }))] }) }));
}
export function AppShell() {
    const isDesktop = useMediaQuery('(min-width:1200px)');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, isAuthenticated } = useAuth();
    const pageTitle = useMemo(() => {
        if (location.pathname.startsWith('/settings/theme'))
            return 'دليل الألوان والثيم';
        if (location.pathname.startsWith('/settings/receipt'))
            return 'الفاتورة والطباعة';
        if (location.pathname.startsWith('/settings/users'))
            return 'المستخدمين';
        if (location.pathname.startsWith('/settings'))
            return 'الإعدادات';
        if (location.pathname.startsWith('/shifts'))
            return 'الخزنة والورديات';
        if (location.pathname.startsWith('/customers'))
            return 'العملاء';
        if (location.pathname.startsWith('/inventory'))
            return 'المخزون';
        if (location.pathname.startsWith('/vendor-accounts'))
            return 'حسابات الموردين';
        if (location.pathname.startsWith('/reports'))
            return 'التقارير';
        return navigation.find((item) => item.path === location.pathname)?.label ?? 'نقطة البيع';
    }, [location.pathname]);
    return (_jsxs(Box, { sx: { minHeight: '100vh', py: { xs: 2, md: 2.5 } }, children: [_jsx(Container, { maxWidth: "xl", children: _jsxs(Stack, { spacing: 2, children: [_jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", sx: { pb: 1 }, children: [_jsxs(Stack, { direction: "row", spacing: 1.5, alignItems: "center", children: [!isDesktop ? (_jsx(IconButton, { size: "small", onClick: () => setDrawerOpen(true), "aria-label": "\u0627\u0644\u0642\u0627\u0626\u0645\u0629", sx: { color: ui.ink }, children: _jsx(Typography, { variant: "body2", fontWeight: 600, children: "\u2630" }) })) : null, _jsx(Typography, { variant: "h5", children: pageTitle })] }), isAuthenticated && user ? (_jsxs(Stack, { direction: "row", spacing: 1.5, alignItems: "center", children: [_jsx(Typography, { variant: "body2", sx: { display: { xs: 'none', sm: 'block' } }, children: user.fullName }), _jsx(Button, { variant: "contained", color: "error", size: "small", onClick: () => { logout(); navigate('/login'); }, children: "\u062E\u0631\u0648\u062C" })] })) : (_jsx(Button, { variant: "contained", size: "small", onClick: () => navigate('/login'), children: "\u062F\u062E\u0648\u0644" }))] }), _jsxs(Box, { sx: { display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', xl: '220px minmax(0, 1fr)' } }, children: [isDesktop ? _jsx(ShellSidebar, {}) : null, _jsx(Box, { children: _jsx(Outlet, {}) })] })] }) }), _jsx(Drawer, { anchor: "right", open: !isDesktop && drawerOpen, onClose: () => setDrawerOpen(false), children: _jsx(Box, { sx: { width: 260, p: 2, bgcolor: ui.ivory }, children: _jsx(ShellSidebar, { onNavigate: () => setDrawerOpen(false) }) }) })] }));
}
