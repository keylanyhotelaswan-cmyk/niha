import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Alert, Button, Chip, CircularProgress, MenuItem, Paper, Stack, Tab, Tabs, TextField, Typography, } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context.js';
import { useBranches, useCashBoxes, useTreasuryWorkspace } from '../../lib/hooks.js';
import { formatDateRangeLabelAr, isTodayRange, localTodayKey, } from '../../lib/date-utils.js';
import { formatShiftDuration, formatShiftOpenedAt } from '../../lib/shift-summary-utils.js';
import { isCashierTreasuryView, canManageTreasury, hasPermission } from '../../lib/permissions.js';
import { readPosBranchId } from '../../lib/pos-store.js';
import { PageToolbar } from '../../components/page-toolbar.js';
import { cardSx, tabsSx } from '../../lib/ui-tokens.js';
import { CurrentShiftTab } from './tabs/current-shift-tab.js';
import { ApprovalsTab } from './tabs/approvals-tab.js';
import { TreasuryTab } from './tabs/treasury-tab.js';
import { ShiftHistoryTab } from './tabs/shift-history-tab.js';
function sectionsForTab(tabKey) {
    if (tabKey === 'approvals')
        return ['approvals'];
    if (tabKey === 'treasury')
        return ['treasury'];
    if (tabKey === 'history')
        return ['history'];
    return ['current'];
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
    const { data: branches = [] } = useBranches();
    const [branchId, setBranchId] = useState('');
    const { data: cashBoxes = [] } = useCashBoxes(branchId);
    const [cashBoxId, setCashBoxId] = useState('');
    const [fromDate, setFromDate] = useState(() => (cashierView ? '' : readDateParam(searchParams, 'from')));
    const [toDate, setToDate] = useState(() => (cashierView ? '' : readDateParam(searchParams, 'to')));
    const [tab, setTab] = useState(0);
    const [actionMessage, setActionMessage] = useState('');
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
        if (cashBoxes.length && !cashBoxId)
            setCashBoxId(cashBoxes[0].id);
    }, [cashBoxes, cashBoxId]);
    const visibleTabs = useMemo(() => {
        if (cashierView) {
            return [{ key: 'current', label: 'ورديتي المفتوحة' }];
        }
        const tabs = [
            { key: 'current', label: 'الوردية الحالية' },
        ];
        if (hasPermission(permissions, 'orders.approve_collection') || canManageTreasury(permissions)) {
            tabs.push({ key: 'approvals', label: 'اعتماد الخزنة' });
        }
        if (canManageTreasury(permissions))
            tabs.push({ key: 'treasury', label: 'الخزنة' });
        tabs.push({ key: 'history', label: 'سجل الورديات' });
        return tabs;
    }, [cashierView, permissions]);
    const safeTab = tab < visibleTabs.length ? tab : 0;
    const activeTabKey = visibleTabs[safeTab]?.key ?? 'current';
    const { data: workspace, refetch, isLoading, isFetching, isError, error } = useTreasuryWorkspace(branchId, cashBoxId, cashierView ? undefined : fromDate, cashierView ? undefined : toDate, sectionsForTab(activeTabKey));
    const openShift = workspace?.currentShift?.shift;
    const openShiftSummary = workspace?.currentShift?.summary;
    useEffect(() => {
        if (tab >= visibleTabs.length)
            setTab(0);
    }, [tab, visibleTabs.length]);
    const onRefresh = () => { void refetch(); };
    const onMessage = (msg) => setActionMessage(msg);
    const setTodayRange = () => {
        const today = localTodayKey();
        setFromDate(today);
        setToDate(today);
    };
    return (_jsxs(Stack, { spacing: 2.5, children: [_jsx(PageToolbar, { title: cashierView ? 'ورديتي المفتوحة' : 'الخزنة والورديات', subtitle: cashierView
                    ? 'ملخص الوردية الحالية من لحظة الفتح — عهدة، تحصيل، ومصروفات.'
                    : 'الوردية الحالية وسجلها — التحصيل والخزنة للمدير.' }), actionMessage ? _jsx(Alert, { severity: "info", onClose: () => setActionMessage(''), children: actionMessage }) : null, isError ? _jsx(Alert, { severity: "error", children: error?.message ?? 'فشل تحميل البيانات' }) : null, cashierView ? (_jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", flexWrap: "wrap", useFlexGap: true, children: [openShift ? (_jsx(Chip, { size: "small", color: "success", label: `${openShift.shiftNumber} · ${formatShiftOpenedAt(openShift.openedAt)} · ${formatShiftDuration(openShift.openedAt)}` })) : (_jsx(Chip, { size: "small", color: "default", label: "\u0644\u0627 \u0648\u0631\u062F\u064A\u0629 \u0645\u0641\u062A\u0648\u062D\u0629" })), openShiftSummary ? (_jsx(Chip, { size: "small", variant: "outlined", label: `عهدة ${Number(openShiftSummary.expectedCash ?? 0).toLocaleString('en-US')} ج.م` })) : null, _jsxs(Typography, { variant: "body2", color: "text.secondary", children: [workspace?.context?.branch?.name ?? '—', " \u00B7 ", workspace?.context?.cashBox?.name ?? '—'] }), isFetching ? _jsx(CircularProgress, { size: 16 }) : null] })) : (_jsxs(Stack, { direction: { xs: 'column', md: 'row' }, spacing: 1.5, alignItems: { md: 'flex-start' }, children: [_jsx(TextField, { select: true, label: "\u0627\u0644\u0641\u0631\u0639", size: "small", value: branchId, onChange: (e) => setBranchId(e.target.value), sx: { minWidth: 200 }, children: branches.map((b) => _jsx(MenuItem, { value: b.id, children: b.name }, b.id)) }), _jsx(TextField, { select: true, label: "\u0627\u0644\u062E\u0632\u0646\u0629", size: "small", value: cashBoxId, onChange: (e) => setCashBoxId(e.target.value), sx: { minWidth: 200 }, children: cashBoxes.map((cb) => _jsx(MenuItem, { value: cb.id, children: cb.name }, cb.id)) }), _jsx(TextField, { label: "\u0645\u0646 \u062A\u0627\u0631\u064A\u062E", type: "date", size: "small", value: fromDate, onChange: (e) => {
                            const next = e.target.value;
                            setFromDate(next);
                            if (next > toDate)
                                setToDate(next);
                        }, InputLabelProps: { shrink: true }, sx: { minWidth: 160 } }), _jsx(TextField, { label: "\u0625\u0644\u0649 \u062A\u0627\u0631\u064A\u062E", type: "date", size: "small", value: toDate, onChange: (e) => {
                            const next = e.target.value;
                            setToDate(next);
                            if (next < fromDate)
                                setFromDate(next);
                        }, InputLabelProps: { shrink: true }, helperText: "\u0639\u0631\u0636 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0641\u062A\u0631\u0629 \u0627\u0644\u0645\u062D\u062F\u062F\u0629", sx: { minWidth: 160 } }), _jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", flexWrap: "wrap", useFlexGap: true, children: [_jsx(Button, { size: "small", variant: isTodayRange(fromDate, toDate) ? 'contained' : 'outlined', onClick: setTodayRange, children: "\u0627\u0644\u064A\u0648\u0645" }), _jsx(Chip, { size: "small", color: isTodayRange(fromDate, toDate) ? 'primary' : 'default', variant: isTodayRange(fromDate, toDate) ? 'filled' : 'outlined', label: formatDateRangeLabelAr(fromDate, toDate) }), isFetching ? _jsx(CircularProgress, { size: 18 }) : null] })] })), !cashierView ? (_jsx(Paper, { elevation: 0, sx: { ...cardSx, px: 2, pt: 1, pb: 0.5 }, children: _jsx(Tabs, { value: safeTab, onChange: (_, v) => setTab(v), variant: "scrollable", scrollButtons: "auto", sx: tabsSx, children: visibleTabs.map((t) => (_jsx(Tab, { label: t.label }, t.key))) }) })) : null, isLoading && !workspace ? (_jsx(Typography, { color: "text.secondary", children: "\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644..." })) : workspace ? (_jsxs(_Fragment, { children: [activeTabKey === 'current' ? (_jsx(CurrentShiftTab, { workspace: workspace, branchId: branchId, cashBoxId: cashBoxId, onRefresh: onRefresh, onMessage: onMessage })) : null, activeTabKey === 'approvals' ? (_jsx(ApprovalsTab, { workspace: workspace, onRefresh: onRefresh, onMessage: onMessage })) : null, activeTabKey === 'treasury' ? (_jsx(TreasuryTab, { workspace: workspace, branchId: branchId, cashBoxId: cashBoxId, onRefresh: onRefresh, onMessage: onMessage })) : null, activeTabKey === 'history' ? (_jsx(ShiftHistoryTab, { workspace: workspace, fromDate: fromDate, toDate: toDate })) : null] })) : null] }));
}
