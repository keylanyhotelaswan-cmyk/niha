import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Alert, Box, Button, Chip, MenuItem, Paper, Stack, Tab, Tabs, TextField, Typography, } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context.js';
import { useBranches, useCashBoxes, useTreasuryWorkspace } from '../../lib/hooks.js';
import { formatDateRangeLabelAr, isTodayRange, localTodayKey, } from '../../lib/date-utils.js';
import { isCashierTreasuryView } from '../../lib/permissions.js';
import { readPosBranchId } from '../../lib/pos-store.js';
import { CurrentShiftTab } from './tabs/current-shift-tab.js';
import { ApprovalsTab } from './tabs/approvals-tab.js';
import { TreasuryTab } from './tabs/treasury-tab.js';
import { ShiftHistoryTab } from './tabs/shift-history-tab.js';
function sectionsForTab(tabKey) {
    const base = ['current'];
    if (tabKey === 'approvals')
        return [...base, 'approvals'];
    if (tabKey === 'treasury')
        return [...base, 'treasury'];
    if (tabKey === 'history')
        return [...base, 'history'];
    return base;
}
function readDateParam(searchParams, key) {
    const direct = searchParams.get(key);
    if (direct)
        return direct;
    const legacy = searchParams.get('date');
    if (legacy)
        return legacy;
    return localTodayKey();
}
export function TreasuryWorkspacePage() {
    const [searchParams] = useSearchParams();
    const { permissions } = useAuth();
    const cashierView = isCashierTreasuryView(permissions);
    const todayKey = localTodayKey();
    const { data: branches = [] } = useBranches();
    const [branchId, setBranchId] = useState('');
    const { data: cashBoxes = [] } = useCashBoxes(branchId);
    const [cashBoxId, setCashBoxId] = useState('');
    const [fromDate, setFromDate] = useState(() => (cashierView ? todayKey : readDateParam(searchParams, 'from')));
    const [toDate, setToDate] = useState(() => (cashierView ? todayKey : readDateParam(searchParams, 'to')));
    const [tab, setTab] = useState(0);
    const [actionMessage, setActionMessage] = useState('');
    const [loadedSections, setLoadedSections] = useState(['current']);
    useEffect(() => {
        if (!branches.length)
            return;
        if (cashierView) {
            const posBranch = readPosBranchId();
            const id = posBranch && branches.some((b) => b.id === posBranch) ? posBranch : branches[0].id;
            setBranchId(id);
            return;
        }
        if (!branchId)
            setBranchId(branches[0].id);
    }, [branches, branchId, cashierView]);
    useEffect(() => {
        if (cashierView) {
            setFromDate(todayKey);
            setToDate(todayKey);
        }
    }, [cashierView, todayKey]);
    useEffect(() => {
        if (cashBoxes.length && !cashBoxId)
            setCashBoxId(cashBoxes[0].id);
    }, [cashBoxes, cashBoxId]);
    const { data: workspace, refetch, isLoading, isError, error } = useTreasuryWorkspace(branchId, cashBoxId, fromDate, toDate, loadedSections);
    const perms = workspace?.permissions ?? {};
    const visibleTabs = useMemo(() => {
        if (cashierView) {
            return [{ key: 'current', label: 'ورديتي اليوم' }];
        }
        const tabs = [
            { key: 'current', label: 'الوردية الحالية' },
        ];
        if (perms.canViewApprovals)
            tabs.push({ key: 'approvals', label: 'اعتماد الخزنة' });
        if (perms.canViewTreasury)
            tabs.push({ key: 'treasury', label: 'الخزنة' });
        tabs.push({ key: 'history', label: 'سجل الورديات' });
        return tabs;
    }, [cashierView, perms.canViewApprovals, perms.canViewTreasury]);
    const activeKey = visibleTabs[tab]?.key ?? 'current';
    useEffect(() => {
        const needed = sectionsForTab(activeKey);
        setLoadedSections((prev) => {
            const merged = [...new Set([...prev, ...needed])];
            if (merged.length === prev.length && merged.every((s, i) => s === prev[i]))
                return prev;
            return merged;
        });
    }, [activeKey]);
    const onRefresh = () => refetch();
    const onMessage = (msg) => setActionMessage(msg);
    const setTodayRange = () => {
        const today = localTodayKey();
        setFromDate(today);
        setToDate(today);
    };
    return (_jsxs(Stack, { spacing: 2.5, children: [_jsxs(Paper, { elevation: 0, sx: { p: 2.5, borderRadius: 5, background: 'linear-gradient(135deg, #2f1f24, #5a2718)', color: '#fff7ed' }, children: [_jsx(Typography, { variant: "h5", fontWeight: 800, children: cashierView ? 'ورديتي اليوم' : 'الخزنة والورديات' }), _jsx(Typography, { variant: "body2", sx: { opacity: 0.85, mt: 0.5 }, children: cashierView
                            ? 'عهدة الكاشير وتحصيلات اليوم — عرض فقط.'
                            : 'الوردية الحالية وسجلها — التحصيل والخزنة للمدير.' })] }), actionMessage ? _jsx(Alert, { severity: "info", onClose: () => setActionMessage(''), children: actionMessage }) : null, isError ? _jsx(Alert, { severity: "error", children: error?.message ?? 'فشل تحميل البيانات' }) : null, cashierView ? (_jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", flexWrap: "wrap", useFlexGap: true, children: [_jsx(Chip, { size: "small", color: "primary", label: `اليوم · ${formatDateRangeLabelAr(todayKey, todayKey)}` }), _jsxs(Typography, { variant: "body2", color: "text.secondary", children: [workspace?.context?.branch?.name ?? '—', " \u00B7 ", workspace?.context?.cashBox?.name ?? '—'] })] })) : (_jsxs(Stack, { direction: { xs: 'column', md: 'row' }, spacing: 1.5, alignItems: { md: 'flex-start' }, children: [_jsx(TextField, { select: true, label: "\u0627\u0644\u0641\u0631\u0639", size: "small", value: branchId, onChange: (e) => setBranchId(e.target.value), sx: { minWidth: 200 }, children: branches.map((b) => _jsx(MenuItem, { value: b.id, children: b.name }, b.id)) }), _jsx(TextField, { select: true, label: "\u0627\u0644\u062E\u0632\u0646\u0629", size: "small", value: cashBoxId, onChange: (e) => setCashBoxId(e.target.value), sx: { minWidth: 200 }, children: cashBoxes.map((cb) => _jsx(MenuItem, { value: cb.id, children: cb.name }, cb.id)) }), _jsx(TextField, { label: "\u0645\u0646 \u062A\u0627\u0631\u064A\u062E", type: "date", size: "small", value: fromDate, onChange: (e) => {
                            const next = e.target.value;
                            setFromDate(next);
                            if (next > toDate)
                                setToDate(next);
                        }, InputLabelProps: { shrink: true }, sx: { minWidth: 160 } }), _jsx(TextField, { label: "\u0625\u0644\u0649 \u062A\u0627\u0631\u064A\u062E", type: "date", size: "small", value: toDate, onChange: (e) => {
                            const next = e.target.value;
                            setToDate(next);
                            if (next < fromDate)
                                setFromDate(next);
                        }, InputLabelProps: { shrink: true }, helperText: "\u0639\u0631\u0636 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0641\u062A\u0631\u0629 \u0627\u0644\u0645\u062D\u062F\u062F\u0629", sx: { minWidth: 160 } }), _jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", flexWrap: "wrap", useFlexGap: true, children: [_jsx(Button, { size: "small", variant: isTodayRange(fromDate, toDate) ? 'contained' : 'outlined', onClick: setTodayRange, children: "\u0627\u0644\u064A\u0648\u0645" }), _jsx(Chip, { size: "small", color: isTodayRange(fromDate, toDate) ? 'primary' : 'default', variant: isTodayRange(fromDate, toDate) ? 'filled' : 'outlined', label: formatDateRangeLabelAr(fromDate, toDate) })] })] })), !cashierView ? (_jsx(Box, { sx: { borderBottom: 1, borderColor: 'divider' }, children: _jsx(Tabs, { value: tab, onChange: (_, v) => setTab(v), variant: "scrollable", scrollButtons: "auto", children: visibleTabs.map((t) => (_jsx(Tab, { label: t.label }, t.key))) }) })) : null, isLoading && !workspace ? (_jsx(Typography, { color: "text.secondary", children: "\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644..." })) : workspace ? (_jsxs(_Fragment, { children: [activeKey === 'current' ? (_jsx(CurrentShiftTab, { workspace: workspace, branchId: branchId, cashBoxId: cashBoxId, onRefresh: onRefresh, onMessage: onMessage })) : null, activeKey === 'approvals' ? (_jsx(ApprovalsTab, { workspace: workspace, onRefresh: onRefresh, onMessage: onMessage })) : null, activeKey === 'treasury' ? (_jsx(TreasuryTab, { workspace: workspace, branchId: branchId, cashBoxId: cashBoxId, onRefresh: onRefresh, onMessage: onMessage })) : null, activeKey === 'history' ? (_jsx(ShiftHistoryTab, { workspace: workspace, fromDate: fromDate, toDate: toDate })) : null] })) : null] }));
}
