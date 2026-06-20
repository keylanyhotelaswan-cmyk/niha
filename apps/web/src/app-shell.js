import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Avatar, Box, Chip, Container, Divider, Drawer, IconButton, List, ListItemButton, ListItemText, Paper, Stack, Button, Typography, useMediaQuery, } from '@mui/material';
import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './lib/auth-context.js';
const navigation = [
    { label: 'نقطة البيع', path: '/pos', hint: 'البيع والطلبات المعلقة', permission: 'pos.use' },
    { label: 'الخزنة والورديات', path: '/shifts', hint: 'العهدة والتحصيل والاعتماد', permission: 'treasury.manage' },
    { label: 'الإعدادات', path: '/settings', hint: 'الفاتورة، الطباعة، والنظام', matchPrefix: true, permissionAny: ['treasury.manage', 'users.manage'] },
    { label: 'إدارة المستخدمين', path: '/settings/users', hint: 'أدرّ مستخدمي النظام', permission: 'users.manage' },
    { label: 'الكتالوج', path: '/catalog', hint: 'الفئات والمنتجات والأسعار', permission: 'inventory.manage' },
    { label: 'المخزون والوصفات', path: '/inventory', hint: 'الخامات والحركة والتكلفة والوصفات', permission: 'inventory.manage' },
    { label: 'مصروفات التأسيس', path: '/setup-costs', hint: 'المدفوعات والالتزامات', permission: 'setup_costs.manage' },
    { label: 'التقارير', path: '/reports', hint: 'المراجعة التشغيلية والمالية', permission: 'reports.view' },
];
function ShellSidebar({ onNavigate }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, isAuthenticated, permissions } = useAuth();
    return (_jsx(Paper, { elevation: 0, sx: {
            p: 2.5,
            borderRadius: 6,
            border: '1px solid rgba(185, 56, 23, 0.10)',
            background: 'linear-gradient(180deg, rgba(255,248,239,0.98), rgba(250,239,226,0.98))',
            height: '100%',
            boxShadow: '0 18px 42px rgba(47, 31, 24, 0.08)',
        }, children: _jsxs(Stack, { spacing: 3, children: [_jsxs(Stack, { spacing: 1, children: [_jsx(Chip, { label: "Niha Kitchen Ops", color: "primary", sx: { alignSelf: 'flex-start', fontWeight: 700 } }), _jsx(Typography, { variant: "h5", fontWeight: 800, lineHeight: 1.15, children: "\u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u0645\u0637\u0639\u0645" }), _jsx(Typography, { variant: "body2", color: "text.secondary", lineHeight: 1.8, children: "\u0648\u0635\u0648\u0644 \u0633\u0631\u064A\u0639 \u0625\u0644\u0649 \u0627\u0644\u0628\u064A\u0639\u060C \u0627\u0644\u062E\u0632\u0646\u0629\u060C \u0627\u0644\u0645\u062E\u0632\u0648\u0646\u060C \u0648\u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631." })] }), _jsx(Paper, { elevation: 0, sx: {
                        p: 2,
                        borderRadius: 4,
                        background: 'linear-gradient(135deg, rgba(185,56,23,0.14), rgba(217,119,6,0.16), rgba(47,31,24,0.08))',
                        border: '1px solid rgba(185, 56, 23, 0.10)',
                    }, children: _jsxs(Stack, { spacing: 1, children: [_jsx(Typography, { variant: "subtitle2", color: "text.secondary", children: "\u0627\u0644\u064A\u0648\u0645" }), _jsx(Typography, { variant: "h6", fontWeight: 800, children: "\u0641\u0631\u0639 \u0648\u0627\u062D\u062F \u0646\u0634\u0637 \u0645\u0639 \u062A\u0634\u063A\u064A\u0644 \u0645\u0628\u0627\u0634\u0631 \u0644\u0644\u0643\u0627\u0634\u064A\u0631 \u0648\u0627\u0644\u062E\u0632\u0646\u0629." })] }) }), _jsxs(Box, { children: [_jsx(Typography, { variant: "subtitle2", color: "text.secondary", sx: { mb: 1.5 }, children: "\u0627\u0644\u0648\u062D\u062F\u0627\u062A \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629" }), _jsx(List, { disablePadding: true, sx: { display: 'grid', gap: 1 }, children: navigation
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
                                        py: 1.25,
                                        borderRadius: 3,
                                        border: active ? '1px solid rgba(185, 56, 23, 0.24)' : '1px solid rgba(117, 89, 77, 0.12)',
                                        backgroundColor: active ? 'rgba(185, 56, 23, 0.08)' : 'rgba(255,250,244,0.82)',
                                    }, children: _jsx(ListItemText, { primary: item.label, secondary: item.hint, primaryTypographyProps: { fontWeight: 700 } }) }, item.path));
                            }) })] }), _jsx(Divider, { flexItem: true }), _jsxs(Stack, { direction: "row", spacing: 1.5, alignItems: "center", children: [_jsx(Avatar, { sx: { bgcolor: '#b93817', width: 42, height: 42 }, children: "N" }), _jsxs(Box, { children: [_jsx(Typography, { fontWeight: 800, children: "Niha Kitchen" }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u0643\u0627\u0634\u064A\u0631\u060C \u0627\u0644\u0637\u0644\u0628\u0627\u062A\u060C \u0627\u0644\u062D\u0631\u0643\u0629\u060C \u0648\u0627\u0644\u0645\u0637\u0628\u062E \u0645\u0646 \u0646\u0641\u0633 \u0627\u0644\u0648\u0627\u062C\u0647\u0629." })] })] }), _jsx(Box, { sx: { mt: 2 }, children: isAuthenticated && user ? (_jsxs(Button, { variant: "outlined", fullWidth: true, onClick: () => { logout(); navigate('/login'); }, children: ["\u062E\u0631\u0648\u062C (", user.fullName, ")"] })) : (_jsx(Button, { variant: "contained", fullWidth: true, onClick: () => { navigate('/login'); onNavigate?.(); }, children: "\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644" })) })] }) }));
}
export function AppShell() {
    const isDesktop = useMediaQuery('(min-width:1200px)');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, isAuthenticated } = useAuth();
    const pageTitle = useMemo(() => {
        if (location.pathname.startsWith('/settings/receipt'))
            return 'الفاتورة والطباعة';
        if (location.pathname.startsWith('/settings/users'))
            return 'إدارة المستخدمين';
        if (location.pathname.startsWith('/settings'))
            return 'الإعدادات';
        if (location.pathname.startsWith('/shifts'))
            return 'الخزنة والورديات';
        return navigation.find((item) => item.path === location.pathname)?.label ?? 'نقطة البيع';
    }, [location.pathname]);
    return (_jsxs(Box, { sx: { minHeight: '100vh', py: { xs: 2, md: 3 } }, children: [_jsx(Container, { maxWidth: "xl", children: _jsxs(Stack, { spacing: 2.5, children: [_jsxs(Paper, { elevation: 0, sx: {
                                p: { xs: 2, md: 2.5 },
                                borderRadius: 6,
                                color: '#fff7ed',
                                position: 'relative',
                                overflow: 'hidden',
                                background: 'linear-gradient(135deg, rgba(47,31,24,0.98) 0%, rgba(92,43,24,0.98) 35%, rgba(185,56,23,1) 70%, rgba(217,119,6,0.96) 100%)',
                            }, children: [_jsx(Box, { sx: {
                                        position: 'absolute',
                                        inset: 0,
                                        opacity: 0.55,
                                        background: 'radial-gradient(circle at 12% 18%, rgba(255,255,255,0.16), transparent 18%), radial-gradient(circle at 86% 20%, rgba(255,255,255,0.12), transparent 20%), linear-gradient(120deg, transparent 0%, transparent 60%, rgba(255,255,255,0.08) 60%, rgba(255,255,255,0.08) 66%, transparent 66%)',
                                    } }), _jsxs(Stack, { direction: { xs: 'column', md: 'row' }, justifyContent: "space-between", spacing: 2, alignItems: { md: 'center' }, children: [_jsxs(Stack, { spacing: 1, sx: { position: 'relative' }, children: [_jsx(Chip, { label: "Workspace", sx: { alignSelf: 'flex-start', bgcolor: 'rgba(255,247,237,0.14)', color: '#fff7ed' } }), _jsx(Typography, { variant: "h4", fontWeight: 800, children: pageTitle }), _jsx(Typography, { variant: "body1", sx: { color: 'rgba(255,247,237,0.82)', maxWidth: 760 }, children: "\u0634\u0627\u0634\u0629 \u062A\u0634\u063A\u064A\u0644 \u0639\u0645\u0644\u064A\u0629 \u0628\u062F\u0648\u0646 \u0639\u0646\u0627\u0635\u0631 \u0632\u0627\u0626\u062F\u0629." })] }), _jsxs(Stack, { direction: "row", spacing: 2, alignItems: "center", children: [!isDesktop ? (_jsx(IconButton, { onClick: () => setDrawerOpen(true), sx: { color: 'common.white', alignSelf: 'flex-start' }, children: _jsx(Typography, { variant: "body2", fontWeight: 800, children: "\u0627\u0644\u0642\u0627\u0626\u0645\u0629" }) })) : null, _jsx(Stack, { direction: "row", spacing: 1, alignItems: "center", children: isAuthenticated && user ? (_jsxs(_Fragment, { children: [_jsx(Typography, { variant: "body2", sx: { color: 'rgba(255,247,237,0.92)' }, children: user.fullName }), _jsx(Button, { variant: "outlined", size: "small", sx: { color: 'rgba(255,247,237,0.92)', borderColor: 'rgba(255,247,237,0.18)' }, onClick: () => {
                                                                    logout();
                                                                    navigate('/login');
                                                                }, children: "\u062E\u0631\u0648\u062C" })] })) : (_jsx(Button, { variant: "contained", size: "small", color: "secondary", onClick: () => navigate('/login'), children: "\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644" })) })] })] })] }), _jsxs(Box, { sx: { display: 'grid', gap: 20, gridTemplateColumns: { xs: '1fr', xl: '320px minmax(0, 1fr)' } }, children: [isDesktop ? _jsx(ShellSidebar, {}) : null, _jsx(Box, { children: _jsx(Outlet, {}) })] })] }) }), _jsx(Drawer, { anchor: "right", open: !isDesktop && drawerOpen, onClose: () => setDrawerOpen(false), children: _jsx(Box, { sx: { width: 320, p: 2 }, children: _jsx(ShellSidebar, { onNavigate: () => setDrawerOpen(false) }) }) }), _jsx(Box, { sx: { position: 'fixed', top: 16, right: 16, zIndex: 1400 }, children: isAuthenticated && user ? (_jsx(Button, { variant: "contained", color: "secondary", onClick: () => {
                        logout();
                        navigate('/login');
                    }, children: "\u062E\u0631\u0648\u062C" })) : (_jsx(Button, { variant: "contained", color: "primary", onClick: () => navigate('/login'), children: "\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644" })) })] }));
}
