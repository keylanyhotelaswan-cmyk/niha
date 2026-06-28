import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Button, Grid, Paper, Stack, Typography, } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context.js';
import { getReceiptSettings } from '../../lib/pos-receipt-settings.js';
import { localTodayKey } from '../../lib/date-utils.js';
import { cardSx } from '../../lib/ui-tokens.js';
export function SettingsHubPage() {
    const { permissions } = useAuth();
    const granted = permissions?.map((p) => p.code) ?? [];
    const receipt = getReceiptSettings();
    const cards = [
        {
            title: 'الخزنة والورديات',
            description: 'الوردية الحالية، اعتماد التحصيل، الخزنة، وسجل ورديات اليوم.',
            path: `/shifts?from=${localTodayKey()}&to=${localTodayKey()}`,
            permission: 'treasury.manage',
            meta: `اليوم · ${localTodayKey()}`,
        },
        {
            title: 'دليل الألوان والثيم',
            description: 'مرجع بصري للألوان، الأزرار، التبويبات، وبطاقات KPI — للتحقق من التناسق.',
            path: '/settings/theme',
            permission: 'treasury.manage',
            meta: 'Buffet · أبيض + بنفسجي',
        },
        {
            title: 'الفاتورة والطباعة',
            description: 'شكل الفاتورة، الهوامش، الخط، الإطار، الطابعة، ونسخ الطباعة (شيف / زبون).',
            path: '/settings/receipt',
            permission: 'treasury.manage',
            meta: `${receipt.paperWidthMm}mm · بالطول · هامش ${receipt.marginMm}mm · ${receipt.paperSize}`,
        },
        {
            title: 'سجل النشاط',
            description: 'سجل عام لكل الحركات — إنشاء وتعديل وإلغاء الفواتير وغيرها.',
            path: '/settings/audit-log',
            permission: 'treasury.manage',
        },
        {
            title: 'العملاء',
            description: 'سجل الزبائن، البحث بالهاتف، وتمييز العملاء الدائمين.',
            path: '/customers',
            permissionAny: ['customers.read', 'treasury.manage', 'pos.use'],
        },
        {
            title: 'المستخدمين والصلاحيات',
            description: 'إضافة مستخدمين، الأدوار، وحذف الحسابات.',
            path: '/settings/users',
            permission: 'users.manage',
        },
    ];
    const visible = cards.filter((c) => {
        const granted = permissions?.map((p) => p.code) ?? [];
        if (c.permissionAny?.length)
            return c.permissionAny.some((code) => granted.includes(code));
        if (!c.permission)
            return true;
        return granted.includes(c.permission);
    });
    return (_jsxs(Stack, { spacing: 2, children: [_jsx(Typography, { variant: "body1", color: "text.secondary", children: "\u0627\u062E\u062A\u0631 \u0627\u0644\u0642\u0633\u0645 \u0627\u0644\u0644\u064A \u0639\u0627\u064A\u0632 \u062A\u0639\u062F\u0651\u0644\u0647:" }), _jsx(Grid, { container: true, spacing: 2, children: visible.map((card) => (_jsx(Grid, { item: true, xs: 12, md: 6, children: _jsxs(Paper, { sx: {
                            ...cardSx,
                            p: 2.5,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1.5,
                        }, children: [_jsx(Typography, { variant: "h6", fontWeight: 800, children: card.title }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { flex: 1 }, children: card.description }), card.meta ? (_jsxs(Typography, { variant: "caption", color: "text.secondary", children: ["\u0627\u0644\u062D\u0627\u0644\u064A: ", card.meta] })) : null, _jsx(Box, { children: _jsx(Button, { component: RouterLink, to: card.path, variant: "contained", children: "\u0641\u062A\u062D" }) })] }) }, card.path))) })] }));
}
