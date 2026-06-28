import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Chip, Grid2, Paper, Stack, Typography } from '@mui/material';
import { MetricCard, SectionCard, StatusCards, WorkflowList } from './shared.js';
import { useBranches, useDashboard } from '../lib/hooks.js';
import { cardSx, ui } from '../lib/ui-tokens.js';
const modules = [
    { title: 'نقطة البيع POS', description: 'واجهة سريعة للكاشير، مناسبة للطلبات المباشرة والتيك أواي وزحمة الفترات.', status: 'جاهز للبدء' },
    { title: 'الخزنة والورديات', description: 'عهدة فعلية ومتوقعة، إغلاق وردية، وفروقات قابلة للتدقيق.', status: 'أولوية أولى' },
    { title: 'المخزون والوصفات', description: 'حركة مخزون مرتبطة بالبيع والوصفات حتى يبقى القرار اليومي أسرع.', status: 'تصميم معتمد' },
    { title: 'التأسيس قبل الافتتاح', description: 'فصل مالي واضح بين تجهيز المحل ومصروفات التشغيل بعد الافتتاح.', status: 'ضمن النواة' },
];
const workflowItems = [
    'فتح الوردية برصيد افتتاحي وتسجيل مسؤولية الكاشير.',
    'تنفيذ البيع وربط كل عملية تحصيل بوسيلة دفع واضحة.',
    'خصم الخامات وفق الوصفة الفعالة عند إقفال الطلب.',
    'إغلاق الوردية ومطابقة العهدة الفعلية مع المتوقعة.',
    'اعتماد المصروفات والحركات الحساسة مع Audit trail كامل.',
];
export function DashboardPage() {
    const { data: branches = [] } = useBranches();
    const branchId = branches[0]?.id;
    const { data: stats } = useDashboard(branchId);
    const quickStats = [
        { label: 'مبيعات اليوم', value: `${(stats?.salesToday ?? 0).toLocaleString('en-US')} ج.م`, note: `${stats?.ordersCountToday ?? 0} فاتورة مغلقة اليوم`, progress: stats?.salesToday ? 86 : 0, tone: 'primary' },
        { label: 'العهدة المتوقعة', value: `${(stats?.expectedCash ?? 0).toLocaleString('en-US')} ج.م`, note: stats?.shiftOpen ? 'وردية مفتوحة' : 'لا توجد وردية نشطة', progress: stats?.shiftOpen ? 100 : 0, tone: 'success' },
        { label: 'تحصيل معلق', value: `${(stats?.pendingCollectionsTotal ?? 0).toLocaleString('en-US')} ج.م`, note: `${stats?.pendingCollectionsCount ?? 0} بانتظار اعتماد`, progress: stats?.pendingCollectionsCount ? 58 : 0, tone: 'warning' },
        { label: 'تنبيهات المخزون', value: `${stats?.lowStockCount ?? 0} أصناف`, note: 'خامات منخفضة', progress: stats?.lowStockCount ? 24 : 0, tone: 'warning' },
    ];
    return (_jsxs(Stack, { spacing: 2.5, children: [_jsx(Paper, { elevation: 0, sx: { ...cardSx, p: { xs: 2.5, md: 3.5 }, bgcolor: ui.primaryBg, border: `1px solid rgba(108, 92, 231, 0.2)` }, children: _jsxs(Stack, { spacing: 2, children: [_jsx(Chip, { label: "\u0644\u0648\u062D\u0629 \u062A\u0634\u063A\u064A\u0644 \u0645\u0637\u0639\u0645", color: "primary", sx: { alignSelf: 'flex-start' } }), _jsx(Typography, { variant: "h3", fontWeight: 800, lineHeight: 1.2, sx: { color: ui.ink }, children: "\u0645\u062A\u0627\u0628\u0639\u0629 \u062D\u064A\u0629 \u0644\u0644\u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u064A\u0648\u0645\u064A: \u0628\u064A\u0639\u060C \u062E\u0632\u0646\u0629\u060C \u0645\u062E\u0632\u0648\u0646\u060C \u0648\u062A\u0623\u0633\u064A\u0633." }), _jsx(Typography, { variant: "h6", sx: { color: ui.muted, maxWidth: 760, lineHeight: 1.9 }, children: "\u0627\u0644\u0623\u0631\u0642\u0627\u0645 \u0623\u062F\u0646\u0627\u0647 \u062A\u064F\u0642\u0631\u0623 \u0645\u0628\u0627\u0634\u0631\u0629 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0648\u0644\u064A\u0633 \u0645\u0646 \u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062C\u0631\u064A\u0628\u064A\u0629." })] }) }), _jsx(Grid2, { container: true, spacing: 2, children: quickStats.map((stat) => (_jsx(Grid2, { size: { xs: 12, sm: 6, xl: 3 }, children: _jsx(MetricCard, { ...stat }) }, stat.label))) }), _jsxs(Grid2, { container: true, spacing: 2, children: [_jsx(Grid2, { size: { xs: 12, xl: 8 }, children: _jsx(SectionCard, { title: "\u0645\u0627\u0630\u0627 \u064A\u063A\u0637\u064A \u0627\u0644\u0646\u0638\u0627\u0645", description: "\u0648\u062D\u062F\u0627\u062A \u0623\u0633\u0627\u0633\u064A\u0629 \u0645\u062A\u0631\u0627\u0628\u0637\u0629 \u0644\u0643\u0646 \u0645\u0633\u062A\u0642\u0644\u0629 \u0645\u062D\u0627\u0633\u0628\u064A\u064B\u0627 \u0648\u062A\u0634\u063A\u064A\u0644\u064A\u064B\u0627.", children: _jsx(StatusCards, { items: modules }) }) }), _jsx(Grid2, { size: { xs: 12, xl: 4 }, children: _jsx(SectionCard, { title: "\u062F\u0648\u0631\u0629 \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u064A\u0648\u0645\u064A\u0629", description: "\u0645\u0644\u062E\u0635 \u0633\u0631\u064A\u0639 \u0644\u062A\u062A\u0627\u0628\u0639 \u0627\u0644\u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u0645\u062A\u0648\u0642\u0639.", children: _jsx(WorkflowList, { items: workflowItems }) }) })] })] }));
}
