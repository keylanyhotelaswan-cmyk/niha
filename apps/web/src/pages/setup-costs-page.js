import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Chip, Grid2, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { MetricCard, SectionCard, WorkflowList } from './shared.js';
import { useBranches, useSetupCategories, useSetupCosts } from '../lib/hooks.js';
const setupFlow = [
    'تسجيل بند تأسيسي مستقل مثل ديكور أو معدات مطبخ أو أعمال غاز.',
    'ربط البند بفئة تأسيس ومورد أو جهة منفذة إن وجدت.',
    'تسجيل دفعات كاملة أو جزئية مع تاريخ ووسيلة سداد.',
    'إظهار الفرق بين أصل التكلفة، ما سُدد، وما تبقى كالتزام.',
    'عرض تقارير منفصلة عن المصروفات التشغيلية اليومية.',
];
function itemStatus(contracted, paid) {
    if (paid >= contracted)
        return 'paid';
    if (paid > 0)
        return 'partially_paid';
    return 'planned';
}
export function SetupCostsPage() {
    const { data: branches = [] } = useBranches();
    const branchId = branches[0]?.id ?? '';
    const { data: categories = [] } = useSetupCategories();
    const { data: items = [] } = useSetupCosts(branchId);
    const [selectedCategory, setSelectedCategory] = useState('الكل');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedItemId, setSelectedItemId] = useState('');
    const mappedItems = useMemo(() => items.map((item) => ({
        id: item.id,
        title: item.title,
        category: item.category?.name ?? 'غير مصنف',
        vendor: item.vendorName ?? '—',
        contractedAmount: Number(item.contractedAmount),
        paidAmount: Number(item.paidAmount),
        status: itemStatus(Number(item.contractedAmount), Number(item.paidAmount)),
        incurredAt: new Date(item.incurredAt).toLocaleDateString('ar-EG'),
    })), [items]);
    const filteredItems = useMemo(() => {
        return mappedItems.filter((item) => {
            const categoryMatch = selectedCategory === 'الكل' || item.category === selectedCategory;
            const statusMatch = selectedStatus === 'all' || item.status === selectedStatus;
            return categoryMatch && statusMatch;
        });
    }, [mappedItems, selectedCategory, selectedStatus]);
    const selectedItem = filteredItems.find((item) => item.id === selectedItemId) ?? filteredItems[0];
    useEffect(() => {
        if (filteredItems[0] && !selectedItemId)
            setSelectedItemId(filteredItems[0].id);
    }, [filteredItems, selectedItemId]);
    const totals = useMemo(() => {
        return filteredItems.reduce((acc, item) => {
            acc.contracted += item.contractedAmount;
            acc.paid += item.paidAmount;
            return acc;
        }, { contracted: 0, paid: 0 });
    }, [filteredItems]);
    const remaining = totals.contracted - totals.paid;
    const categoryNames = categories.map((c) => c.name);
    const setupStats = [
        { label: 'إجمالي التأسيس', value: `${totals.contracted.toLocaleString('en-US')} ج.م`, note: 'قيمة البنود ضمن الفلاتر الحالية', progress: 100, tone: 'warning' },
        { label: 'المسدّد', value: `${totals.paid.toLocaleString('en-US')} ج.م`, note: 'دفعات فعلية مسجلة', progress: totals.contracted === 0 ? 0 : Math.round((totals.paid / totals.contracted) * 100), tone: 'success' },
        { label: 'المتبقي', value: `${remaining.toLocaleString('en-US')} ج.م`, note: 'التزامات لم تسدد بعد', progress: totals.contracted === 0 ? 0 : Math.round((remaining / totals.contracted) * 100), tone: 'primary' },
    ];
    return (_jsxs(Stack, { spacing: 2.5, children: [_jsx(Grid2, { container: true, spacing: 2, children: setupStats.map((stat) => (_jsx(Grid2, { size: { xs: 12, md: 4 }, children: _jsx(MetricCard, { ...stat }) }, stat.label))) }), _jsxs(Grid2, { container: true, spacing: 2, children: [_jsx(Grid2, { size: { xs: 12, lg: 7 }, children: _jsx(SectionCard, { title: "\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u062A\u0623\u0633\u064A\u0633 \u0642\u0628\u0644 \u0627\u0644\u0627\u0641\u062A\u062A\u0627\u062D", description: "\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u2014 \u0645\u0641\u0635\u0648\u0644\u0629 \u0639\u0646 \u0627\u0644\u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u064A\u0648\u0645\u064A.", action: _jsx(Chip, { label: "Separated From OPEX", color: "secondary" }), children: _jsx(Stack, { spacing: 1.5, children: _jsxs(Stack, { direction: { xs: 'column', md: 'row' }, spacing: 1.5, children: [_jsxs(TextField, { select: true, label: "\u0627\u0644\u0641\u0626\u0629", size: "small", value: selectedCategory, onChange: (e) => setSelectedCategory(e.target.value), sx: { minWidth: 220 }, children: [_jsx(MenuItem, { value: "\u0627\u0644\u0643\u0644", children: "\u0627\u0644\u0643\u0644" }), categoryNames.map((category) => (_jsx(MenuItem, { value: category, children: category }, category)))] }), _jsxs(TextField, { select: true, label: "\u0627\u0644\u062D\u0627\u0644\u0629", size: "small", value: selectedStatus, onChange: (e) => setSelectedStatus(e.target.value), sx: { minWidth: 180 }, children: [_jsx(MenuItem, { value: "all", children: "\u0643\u0644 \u0627\u0644\u062D\u0627\u0644\u0627\u062A" }), _jsx(MenuItem, { value: "planned", children: "\u0645\u062E\u0637\u0637" }), _jsx(MenuItem, { value: "partially_paid", children: "\u0645\u0633\u062F\u062F \u062C\u0632\u0626\u064A\u064B\u0627" }), _jsx(MenuItem, { value: "paid", children: "\u0645\u0633\u062F\u062F \u0628\u0627\u0644\u0643\u0627\u0645\u0644" })] })] }) }) }) }), _jsx(Grid2, { size: { xs: 12, lg: 5 }, children: _jsx(SectionCard, { title: "\u062F\u0648\u0631\u0629 \u0627\u0644\u062A\u0633\u062C\u064A\u0644", description: "\u062E\u0637\u0648\u0627\u062A \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629 \u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u062A\u0623\u0633\u064A\u0633.", children: _jsx(WorkflowList, { items: setupFlow }) }) })] }), _jsxs(SectionCard, { title: "\u0628\u0646\u0648\u062F \u0627\u0644\u062A\u0623\u0633\u064A\u0633", description: "\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0628\u0646\u0648\u062F \u0645\u0639 \u0627\u0644\u0627\u0644\u062A\u0632\u0627\u0645\u0627\u062A \u0648\u0627\u0644\u0645\u062F\u0641\u0648\u0639\u0627\u062A.", children: [filteredItems.length === 0 ? _jsx(Alert, { severity: "info", children: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u0646\u0648\u062F \u062A\u0623\u0633\u064A\u0633 \u0645\u0633\u062C\u0644\u0629 \u0628\u0639\u062F." }) : null, _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u0627\u0644\u0628\u0646\u062F" }), _jsx(TableCell, { children: "\u0627\u0644\u0641\u0626\u0629" }), _jsx(TableCell, { children: "\u0627\u0644\u0645\u0648\u0631\u062F" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u0645\u062A\u0639\u0627\u0642\u062F" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u0645\u0633\u062F\u062F" }), _jsx(TableCell, { children: "\u0627\u0644\u062D\u0627\u0644\u0629" })] }) }), _jsx(TableBody, { children: filteredItems.map((item) => (_jsxs(TableRow, { hover: true, selected: item.id === selectedItem?.id, onClick: () => setSelectedItemId(item.id), children: [_jsx(TableCell, { children: item.title }), _jsx(TableCell, { children: item.category }), _jsx(TableCell, { children: item.vendor }), _jsxs(TableCell, { align: "left", children: [item.contractedAmount.toLocaleString('en-US'), " \u062C.\u0645"] }), _jsxs(TableCell, { align: "left", children: [item.paidAmount.toLocaleString('en-US'), " \u062C.\u0645"] }), _jsx(TableCell, { children: _jsx(Chip, { size: "small", label: item.status }) })] }, item.id))) })] })] }), selectedItem ? (_jsxs(Paper, { elevation: 0, sx: { p: 2, borderRadius: 4 }, children: [_jsx(Typography, { variant: "h6", fontWeight: 800, children: selectedItem.title }), _jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["\u062A\u0627\u0631\u064A\u062E: ", selectedItem.incurredAt, " \u2014 \u0627\u0644\u0645\u062A\u0628\u0642\u064A: ", (selectedItem.contractedAmount - selectedItem.paidAmount).toLocaleString('en-US'), " \u062C.\u0645"] })] })) : null] }));
}
