import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Alert, Grid2, MenuItem, Stack, Tab, Tabs, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, } from '@mui/material';
import { useMemo, useState } from 'react';
import { MetricCard, SectionCard } from './shared.js';
import { useBranches, useBundleSuggestions, useProductDayMatrix, useReport, useWeekOverWeek, } from '../lib/hooks.js';
import { formatDateRangeLabelAr, localMonthStartKey, localTodayKey } from '../lib/date-utils.js';
import { DayOfWeekChart, HorizontalBarChart, ShiftSalesChart, WeeklySalesChart, } from './reports/reports-charts.js';
const reportGroups = [
    { key: 'operations', title: 'المبيعات والتشغيل' },
    { key: 'treasury', title: 'الخزنة' },
    { key: 'inventory', title: 'المخزون' },
    { key: 'setup', title: 'التأسيس' },
];
const DOW_LABELS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
function formatMoney(n) {
    return `${n.toLocaleString('en-US')} ج.م`;
}
function formatWeek(d) {
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
}
function CompactTable({ headers, rows }) {
    if (!rows.length) {
        return (_jsx(Typography, { variant: "body2", color: "text.secondary", sx: { py: 2 }, children: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0641\u064A \u0647\u0630\u0647 \u0627\u0644\u0641\u062A\u0631\u0629." }));
    }
    return (_jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsx(TableRow, { children: headers.map((h) => (_jsx(TableCell, { align: h === headers[0] ? 'inherit' : 'left', children: h }, h))) }) }), _jsx(TableBody, { children: rows.map((cells, i) => (_jsx(TableRow, { hover: true, children: cells.map((cell, j) => (_jsx(TableCell, { align: j === 0 ? 'inherit' : 'left', children: cell }, j))) }, i))) })] }));
}
export function ReportsPage() {
    const [selectedGroup, setSelectedGroup] = useState('operations');
    const [opsTab, setOpsTab] = useState('summary');
    const [fromDate, setFromDate] = useState(localMonthStartKey);
    const [toDate, setToDate] = useState(localTodayKey);
    const reportRange = useMemo(() => ({ from: fromDate, to: toDate }), [fromDate, toDate]);
    const { data: branches = [] } = useBranches();
    const [branchId, setBranchId] = useState();
    const effectiveBranchId = branchId ?? branches[0]?.id;
    const branchName = branches.find((b) => b.id === effectiveBranchId)?.name;
    const { data: reportData, isError: reportError, error: reportErr, isPending: reportPending } = useReport(selectedGroup, effectiveBranchId, { range: reportRange });
    const { data: dayMatrix, isError: matrixError } = useProductDayMatrix(selectedGroup === 'operations' && opsTab === 'insights' ? effectiveBranchId : undefined, reportRange);
    const { data: wowData, isError: wowError } = useWeekOverWeek(selectedGroup === 'operations' && opsTab === 'insights' ? effectiveBranchId : undefined);
    const { data: bundleData, isError: bundleError } = useBundleSuggestions(selectedGroup === 'operations' && opsTab === 'insights' ? effectiveBranchId : undefined, reportRange);
    const kpis = reportData?.kpis ?? [];
    const heatmapRows = useMemo(() => {
        const rows = dayMatrix?.rows ?? [];
        return rows
            .slice()
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 20)
            .map((row) => [
            row.productName,
            DOW_LABELS[row.dow] ?? '—',
            String(row.qtySold),
            formatMoney(row.revenue),
        ]);
    }, [dayMatrix]);
    const topItemsChart = useMemo(() => (reportData?.topSellingItems ?? []).map((r) => ({ name: r.name, value: r.revenue })), [reportData]);
    const cashiersChart = useMemo(() => (reportData?.salesByCashier ?? []).map((r) => ({ name: r.cashier, value: r.total })), [reportData]);
    const weeklyChart = useMemo(() => (wowData?.weekly ?? []).slice(0, 8).map((r) => ({
        label: formatWeek(r.weekStart),
        sales: r.grossSales,
        orders: r.orderCount,
    })), [wowData]);
    const dowChart = useMemo(() => {
        const totals = new Array(7).fill(0);
        for (const row of dayMatrix?.rows ?? []) {
            totals[row.dow] = (totals[row.dow] ?? 0) + row.revenue;
        }
        return DOW_LABELS.map((name, i) => ({ name, value: totals[i] ?? 0 }));
    }, [dayMatrix]);
    const shiftsChart = useMemo(() => (reportData?.shiftHistory ?? []).slice(0, 12).map((r) => ({
        label: r.shiftNumber,
        sales: r.totalSales,
    })), [reportData]);
    return (_jsxs(Stack, { spacing: 2, children: [_jsxs(SectionCard, { title: "\u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631", compact: true, children: [_jsxs(Stack, { direction: { xs: 'column', md: 'row' }, spacing: 1.5, flexWrap: "wrap", useFlexGap: true, children: [_jsx(TextField, { select: true, label: "\u0646\u0648\u0639 \u0627\u0644\u062A\u0642\u0631\u064A\u0631", size: "small", value: selectedGroup, onChange: (e) => {
                                    setSelectedGroup(e.target.value);
                                    setOpsTab('summary');
                                }, sx: { minWidth: 180 }, children: reportGroups.map((g) => (_jsx(MenuItem, { value: g.key, children: g.title }, g.key))) }), branches.length > 0 ? (_jsx(TextField, { select: true, label: "\u0627\u0644\u0641\u0631\u0639", size: "small", value: effectiveBranchId ?? '', onChange: (e) => setBranchId(e.target.value), sx: { minWidth: 180 }, children: branches.map((b) => (_jsx(MenuItem, { value: b.id, children: b.name }, b.id))) })) : null, _jsx(TextField, { label: "\u0645\u0646", type: "date", size: "small", value: fromDate, onChange: (e) => setFromDate(e.target.value), InputLabelProps: { shrink: true }, sx: { width: 150 } }), _jsx(TextField, { label: "\u0625\u0644\u0649", type: "date", size: "small", value: toDate, onChange: (e) => setToDate(e.target.value), InputLabelProps: { shrink: true }, sx: { width: 150 } })] }), branchName ? (_jsxs(Typography, { variant: "caption", color: "text.secondary", sx: { mt: 1, display: 'block' }, children: [formatDateRangeLabelAr(fromDate, toDate), " \u00B7 ", branchName] })) : null] }), reportError ? (_jsx(Alert, { severity: "error", variant: "outlined", children: "\u062A\u0639\u0630\u0651\u0631 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u062A\u0642\u0631\u064A\u0631." })) : null, reportPending && !reportData ? (_jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644\u2026" })) : null, kpis.length > 0 ? (_jsx(Grid2, { container: true, spacing: 1.5, children: kpis.map((kpi, index) => (_jsx(Grid2, { size: { xs: 12, sm: 4 }, children: _jsx(MetricCard, { label: kpi.label, value: `${Number(kpi.value).toLocaleString('en-US')}${selectedGroup === 'operations' && index === 2 ? '' : selectedGroup === 'inventory' && index === 2 ? '' : ' ج.م'}`, note: kpi.note }) }, kpi.label))) })) : null, selectedGroup === 'operations' ? (_jsxs(_Fragment, { children: [_jsxs(Tabs, { value: opsTab, onChange: (_, v) => setOpsTab(v), sx: { borderBottom: 1, borderColor: 'divider', minHeight: 40 }, children: [_jsx(Tab, { value: "summary", label: "\u0645\u0644\u062E\u0635" }), _jsx(Tab, { value: "shifts", label: "\u0627\u0644\u0648\u0631\u062F\u064A\u0627\u062A" }), _jsx(Tab, { value: "insights", label: "\u062A\u062D\u0644\u064A\u0644\u0627\u062A" })] }), opsTab === 'summary' ? (_jsxs(Stack, { spacing: 2, children: [_jsxs(Grid2, { container: true, spacing: 2, children: [_jsx(Grid2, { size: { xs: 12, lg: 6 }, children: _jsx(SectionCard, { title: "\u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A \u062D\u0633\u0628 \u0627\u0644\u0643\u0627\u0634\u064A\u0631", compact: true, children: _jsx(HorizontalBarChart, { data: cashiersChart }) }) }), _jsx(Grid2, { size: { xs: 12, lg: 6 }, children: _jsx(SectionCard, { title: "\u0623\u0639\u0644\u0649 \u0627\u0644\u0623\u0635\u0646\u0627\u0641", compact: true, children: _jsx(HorizontalBarChart, { data: topItemsChart }) }) })] }), _jsxs(Grid2, { container: true, spacing: 2, children: [_jsx(Grid2, { size: { xs: 12, md: 6 }, children: _jsx(SectionCard, { title: "\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0643\u0627\u0634\u064A\u0631\u064A\u0646", compact: true, children: _jsx(CompactTable, { headers: ['الكاشير', 'الفواتير', 'المبيعات'], rows: (reportData?.salesByCashier ?? []).map((r) => [
                                                    r.cashier,
                                                    String(r.invoices),
                                                    formatMoney(r.total),
                                                ]) }) }) }), _jsx(Grid2, { size: { xs: 12, md: 6 }, children: _jsx(SectionCard, { title: "\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0623\u0635\u0646\u0627\u0641", compact: true, children: _jsx(CompactTable, { headers: ['الصنف', 'الكمية', 'الإيراد'], rows: (reportData?.topSellingItems ?? []).map((r) => [
                                                    r.name,
                                                    String(r.quantity),
                                                    formatMoney(r.revenue),
                                                ]) }) }) })] })] })) : null, opsTab === 'shifts' ? (_jsxs(Stack, { spacing: 2, children: [_jsx(SectionCard, { title: "\u0645\u0628\u064A\u0639\u0627\u062A \u0627\u0644\u0648\u0631\u062F\u064A\u0627\u062A", description: "\u0622\u062E\u0631 12 \u0648\u0631\u062F\u064A\u0629 \u0645\u063A\u0644\u0642\u0629.", compact: true, children: _jsx(ShiftSalesChart, { data: shiftsChart }) }), _jsx(SectionCard, { title: "\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0648\u0631\u062F\u064A\u0627\u062A", description: "\u0633\u062C\u0644 \u062A\u0627\u0631\u064A\u062E\u064A \u2014 \u064A\u0634\u0645\u0644 \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0645\u062D\u0635\u0651\u0644\u0629 \u0627\u0644\u062A\u064A \u0644\u0627 \u062A\u0638\u0647\u0631 \u0641\u064A \u0646\u0642\u0637\u0629 \u0627\u0644\u0628\u064A\u0639.", compact: true, children: _jsx(CompactTable, { headers: ['الوردية', 'الكاشير', 'الإغلاق', 'فواتير', 'مبيعات'], rows: (reportData?.shiftHistory ?? []).map((r) => [
                                        r.shiftNumber,
                                        r.cashierName,
                                        r.closedAt ? new Date(r.closedAt).toLocaleDateString('ar-EG') : '—',
                                        String(r.ordersCount),
                                        formatMoney(r.totalSales),
                                    ]) }) })] })) : null, opsTab === 'insights' ? (_jsxs(Stack, { spacing: 2, children: [(matrixError || wowError || bundleError) ? (_jsx(Alert, { severity: "warning", variant: "outlined", children: "\u0627\u0644\u062A\u062D\u0644\u064A\u0644\u0627\u062A \u0627\u0644\u0645\u062A\u0642\u062F\u0645\u0629 \u062A\u062D\u062A\u0627\u062C \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0633\u064A\u0631\u0641\u0631. \u0627\u0644\u0645\u0644\u062E\u0635 \u0648\u0627\u0644\u0648\u0631\u062F\u064A\u0627\u062A \u0645\u062A\u0627\u062D\u064A\u0646 \u0641\u064A \u0627\u0644\u062A\u0628\u0648\u064A\u0628\u0627\u062A \u0627\u0644\u0623\u062E\u0631\u0649." })) : null, _jsxs(Grid2, { container: true, spacing: 2, children: [_jsx(Grid2, { size: { xs: 12, lg: 7 }, children: _jsx(SectionCard, { title: "\u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A \u0623\u0633\u0628\u0648\u0639 \u0628\u0623\u0633\u0628\u0648\u0639", compact: true, children: _jsx(WeeklySalesChart, { data: weeklyChart }) }) }), _jsx(Grid2, { size: { xs: 12, lg: 5 }, children: _jsx(SectionCard, { title: "\u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A \u062D\u0633\u0628 \u064A\u0648\u0645 \u0627\u0644\u0623\u0633\u0628\u0648\u0639", compact: true, children: _jsx(DayOfWeekChart, { data: dowChart }) }) })] }), _jsx(SectionCard, { title: "\u0623\u0641\u0636\u0644 \u0623\u064A\u0627\u0645 \u0627\u0644\u0628\u064A\u0639 \u0644\u0643\u0644 \u0635\u0646\u0641", description: "\u0623\u0642\u0648\u0649 20 \u0635\u0641 \u2014 \u0623\u064A \u064A\u0648\u0645 \u0628\u064A\u0628\u064A\u0639 \u0641\u064A\u0647 \u0627\u0644\u0635\u0646\u0641 \u0623\u0643\u062A\u0631.", compact: true, children: _jsx(CompactTable, { headers: ['الصنف', 'أقوى يوم', 'الكمية', 'الإيراد'], rows: heatmapRows }) }), _jsx(SectionCard, { title: "\u0623\u0635\u0646\u0627\u0641 \u062A\u064F\u0628\u0627\u0639 \u0645\u0639\u0627\u064B", compact: true, children: _jsx(CompactTable, { headers: ['صنف 1', 'صنف 2', 'مرات', 'سعر مقترح'], rows: (bundleData?.suggestions ?? []).slice(0, 10).map((r) => [
                                        r.productAName,
                                        r.productBName,
                                        String(r.pairOrders),
                                        r.suggestedPrice != null ? formatMoney(r.suggestedPrice) : '—',
                                    ]) }) })] })) : null] })) : null, selectedGroup === 'setup' && reportData?.setupByCategory ? (_jsx(SectionCard, { title: "\u0627\u0644\u062A\u0623\u0633\u064A\u0633 \u062D\u0633\u0628 \u0627\u0644\u0641\u0626\u0629", compact: true, children: _jsx(CompactTable, { headers: ['الفئة', 'المتعاقد', 'المسدد'], rows: reportData.setupByCategory.map((r) => [
                        r.category,
                        formatMoney(r.contracted),
                        formatMoney(r.paid),
                    ]) }) })) : null] }));
}
