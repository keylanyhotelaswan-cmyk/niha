import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context.js';
import { useBranches, useCashBoxes, useTreasuryWorkspace } from '../../lib/hooks.js';
import {
  formatDateRangeLabelAr,
  isTodayRange,
  localTodayKey,
} from '../../lib/date-utils.js';
import { isCashierTreasuryView } from '../../lib/permissions.js';
import { readPosBranchId } from '../../lib/pos-store.js';
import { CurrentShiftTab } from './tabs/current-shift-tab.js';
import { ApprovalsTab } from './tabs/approvals-tab.js';
import { TreasuryTab } from './tabs/treasury-tab.js';
import { ShiftHistoryTab } from './tabs/shift-history-tab.js';

function sectionsForTab(tabKey: string): string[] {
  const base: string[] = ['current'];
  if (tabKey === 'approvals') return [...base, 'approvals'];
  if (tabKey === 'treasury') return [...base, 'treasury'];
  if (tabKey === 'history') return [...base, 'history'];
  return base;
}

function readDateParam(searchParams: URLSearchParams, key: 'from' | 'to') {
  const direct = searchParams.get(key);
  if (direct) return direct;
  const legacy = searchParams.get('date');
  if (legacy) return legacy;
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
  const [loadedSections, setLoadedSections] = useState<string[]>(['current']);

  useEffect(() => {
    if (!branches.length) return;
    if (cashierView) {
      const posBranch = readPosBranchId();
      const id = posBranch && branches.some((b: any) => b.id === posBranch) ? posBranch : branches[0].id;
      setBranchId(id);
      return;
    }
    if (!branchId) setBranchId(branches[0].id);
  }, [branches, branchId, cashierView]);

  useEffect(() => {
    if (cashierView) {
      setFromDate(todayKey);
      setToDate(todayKey);
    }
  }, [cashierView, todayKey]);

  useEffect(() => {
    if (cashBoxes.length && !cashBoxId) setCashBoxId(cashBoxes[0].id);
  }, [cashBoxes, cashBoxId]);

  const { data: workspace, refetch, isLoading, isError, error } = useTreasuryWorkspace(
    branchId,
    cashBoxId,
    fromDate,
    toDate,
    loadedSections,
  );
  const perms = workspace?.permissions ?? {};

  const visibleTabs = useMemo(() => {
    if (cashierView) {
      return [{ key: 'current', label: 'ورديتي اليوم' }];
    }
    const tabs: { key: string; label: string }[] = [
      { key: 'current', label: 'الوردية الحالية' },
    ];
    if (perms.canViewApprovals) tabs.push({ key: 'approvals', label: 'اعتماد الخزنة' });
    if (perms.canViewTreasury) tabs.push({ key: 'treasury', label: 'الخزنة' });
    tabs.push({ key: 'history', label: 'سجل الورديات' });
    return tabs;
  }, [cashierView, perms.canViewApprovals, perms.canViewTreasury]);

  const activeKey = visibleTabs[tab]?.key ?? 'current';

  useEffect(() => {
    const needed = sectionsForTab(activeKey);
    setLoadedSections((prev) => {
      const merged = [...new Set([...prev, ...needed])];
      if (merged.length === prev.length && merged.every((s, i) => s === prev[i])) return prev;
      return merged;
    });
  }, [activeKey]);

  const onRefresh = () => refetch();
  const onMessage = (msg: string) => setActionMessage(msg);
  const setTodayRange = () => {
    const today = localTodayKey();
    setFromDate(today);
    setToDate(today);
  };

  return (
    <Stack spacing={2.5}>
      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 5, background: 'linear-gradient(135deg, #2f1f24, #5a2718)', color: '#fff7ed' }}>
        <Typography variant="h5" fontWeight={800}>
          {cashierView ? 'ورديتي اليوم' : 'الخزنة والورديات'}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
          {cashierView
            ? 'عهدة الكاشير وتحصيلات اليوم — عرض فقط.'
            : 'الوردية الحالية وسجلها — التحصيل والخزنة للمدير.'}
        </Typography>
      </Paper>

      {actionMessage ? <Alert severity="info" onClose={() => setActionMessage('')}>{actionMessage}</Alert> : null}
      {isError ? <Alert severity="error">{(error as Error)?.message ?? 'فشل تحميل البيانات'}</Alert> : null}

      {cashierView ? (
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip size="small" color="primary" label={`اليوم · ${formatDateRangeLabelAr(todayKey, todayKey)}`} />
          <Typography variant="body2" color="text.secondary">
            {workspace?.context?.branch?.name ?? '—'} · {workspace?.context?.cashBox?.name ?? '—'}
          </Typography>
        </Stack>
      ) : (
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'flex-start' }}>
        <TextField select label="الفرع" size="small" value={branchId} onChange={(e) => setBranchId(e.target.value)} sx={{ minWidth: 200 }}>
          {branches.map((b: any) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
        </TextField>
        <TextField select label="الخزنة" size="small" value={cashBoxId} onChange={(e) => setCashBoxId(e.target.value)} sx={{ minWidth: 200 }}>
          {cashBoxes.map((cb: any) => <MenuItem key={cb.id} value={cb.id}>{cb.name}</MenuItem>)}
        </TextField>
        <TextField
          label="من تاريخ"
          type="date"
          size="small"
          value={fromDate}
          onChange={(e) => {
            const next = e.target.value;
            setFromDate(next);
            if (next > toDate) setToDate(next);
          }}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 160 }}
        />
        <TextField
          label="إلى تاريخ"
          type="date"
          size="small"
          value={toDate}
          onChange={(e) => {
            const next = e.target.value;
            setToDate(next);
            if (next < fromDate) setFromDate(next);
          }}
          InputLabelProps={{ shrink: true }}
          helperText="عرض بيانات الفترة المحددة"
          sx={{ minWidth: 160 }}
        />
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Button
            size="small"
            variant={isTodayRange(fromDate, toDate) ? 'contained' : 'outlined'}
            onClick={setTodayRange}
          >
            اليوم
          </Button>
          <Chip
            size="small"
            color={isTodayRange(fromDate, toDate) ? 'primary' : 'default'}
            variant={isTodayRange(fromDate, toDate) ? 'filled' : 'outlined'}
            label={formatDateRangeLabelAr(fromDate, toDate)}
          />
        </Stack>
      </Stack>
      )}

      {!cashierView ? (
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          {visibleTabs.map((t) => (
            <Tab key={t.key} label={t.label} />
          ))}
        </Tabs>
      </Box>
      ) : null}

      {isLoading && !workspace ? (
        <Typography color="text.secondary">جاري التحميل...</Typography>
      ) : workspace ? (
        <>
          {activeKey === 'current' ? (
            <CurrentShiftTab workspace={workspace} branchId={branchId} cashBoxId={cashBoxId} onRefresh={onRefresh} onMessage={onMessage} />
          ) : null}
          {activeKey === 'approvals' ? (
            <ApprovalsTab workspace={workspace} onRefresh={onRefresh} onMessage={onMessage} />
          ) : null}
          {activeKey === 'treasury' ? (
            <TreasuryTab
              workspace={workspace}
              branchId={branchId}
              cashBoxId={cashBoxId}
              onRefresh={onRefresh}
              onMessage={onMessage}
            />
          ) : null}
          {activeKey === 'history' ? (
            <ShiftHistoryTab workspace={workspace} fromDate={fromDate} toDate={toDate} />
          ) : null}
        </>
      ) : null}
    </Stack>
  );
}
