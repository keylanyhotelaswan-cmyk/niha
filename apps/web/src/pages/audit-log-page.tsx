import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { apiListAuditLogs } from '../lib/api.js';
import {
  AUDIT_ACTION_LABELS,
  describeAuditChanges,
  formatAuditTime,
  getAuditActionLabel,
  getAuditEntityLabel,
} from '../lib/audit-log-utils.js';
import { useAuth } from '../lib/auth-context.js';
import { localTodayKey } from '../lib/date-utils.js';
import { useBranches } from '../lib/hooks.js';
import { ui } from '../lib/ui-tokens.js';

type AuditLogRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  actorUser?: { fullName?: string; username?: string } | null;
  branch?: { name?: string; code?: string } | null;
};

export function AuditLogPage() {
  const { accessToken } = useAuth();
  const { data: branches = [] } = useBranches();
  const [branchId, setBranchId] = useState('');
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState(localTodayKey());
  const [to, setTo] = useState(localTodayKey());

  const queryKey = useMemo(
    () => ['audit-logs', branchId, entityType, action, from, to],
    [branchId, entityType, action, from, to],
  );

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      if (entityType) params.set('entityType', entityType);
      if (action) params.set('action', action);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      params.set('limit', '200');
      const res = await apiListAuditLogs(params.toString(), accessToken ?? undefined);
      if (!res.ok) throw new Error(res.body ?? res.error);
      return (res.data ?? []) as AuditLogRow[];
    },
    enabled: Boolean(accessToken),
    staleTime: 10000,
  });

  const logs = data ?? [];

  return (
    <Stack spacing={2}>
      <Typography variant="body1" color="text.secondary">
        سجل عام لكل الحركات على النظام — إنشاء، تعديل، إلغاء، وتحصيل الفواتير.
      </Typography>

      <Paper sx={{ p: 2, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
          <TextField
            select
            label="الفرع"
            size="small"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">كل الفروع</MenuItem>
            {(branches as Array<{ id: string; name: string }>).map((b) => (
              <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="نوع السجل"
            size="small"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">الكل</MenuItem>
            <MenuItem value="ORDER">فواتير / طلبات</MenuItem>
          </TextField>
          <TextField
            select
            label="الإجراء"
            size="small"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            sx={{ minWidth: 130 }}
          >
            <MenuItem value="">الكل</MenuItem>
            {Object.entries(AUDIT_ACTION_LABELS).map(([code, label]) => (
              <MenuItem key={code} value={code}>{label}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="من"
            type="date"
            size="small"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="إلى"
            type="date"
            size="small"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Button variant="outlined" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? 'جاري التحديث…' : 'تحديث'}
          </Button>
        </Stack>
      </Paper>

      {isPending ? (
        <Stack alignItems="center" py={4}><CircularProgress /></Stack>
      ) : isError ? (
        <Alert severity="error">تعذّر تحميل سجل النشاط.</Alert>
      ) : logs.length === 0 ? (
        <Alert severity="info">لا توجد حركات في الفترة المحددة.</Alert>
      ) : (
        <Stack spacing={1}>
          {logs.map((entry) => {
            const changes = describeAuditChanges(entry);
            const orderNumber = String(entry.afterData?.orderNumber ?? entry.beforeData?.orderNumber ?? '');
            return (
              <Paper key={entry.id} sx={{ p: 1.5, borderRadius: 2.5, border: `1px solid ${ui.border}` }}>
                <Stack spacing={0.75}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1} flexWrap="wrap">
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
                      <Typography fontWeight={800}>{getAuditActionLabel(entry.action)}</Typography>
                      <Chip size="small" label={getAuditEntityLabel(entry.entityType)} variant="outlined" />
                      {orderNumber ? (
                        <Chip size="small" label={`طلب ${orderNumber}`} color="primary" variant="outlined" />
                      ) : null}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                      {formatAuditTime(entry.createdAt)}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {entry.actorUser?.fullName?.trim() || entry.actorUser?.username || 'نظام'}
                    {entry.branch?.name ? ` · ${entry.branch.name}` : ''}
                  </Typography>
                  {changes.map((line: string, idx: number) => (
                    <Typography key={idx} variant="body2">{line}</Typography>
                  ))}
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}

      {logs.length >= 200 ? (
        <Typography variant="caption" color="text.secondary">
          يُعرض أحدث 200 حركة — ضيّق نطاق التاريخ أو الفرع لنتائج أدق.
        </Typography>
      ) : null}
    </Stack>
  );
}
