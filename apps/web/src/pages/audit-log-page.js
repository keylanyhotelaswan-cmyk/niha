import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Button, Chip, CircularProgress, MenuItem, Paper, Stack, TextField, Typography, } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { apiListAuditLogs } from '../lib/api.js';
import { AUDIT_ACTION_LABELS, describeAuditChanges, formatAuditTime, getAuditActionLabel, getAuditEntityLabel, } from '../lib/audit-log-utils.js';
import { useAuth } from '../lib/auth-context.js';
import { localTodayKey } from '../lib/date-utils.js';
import { useBranches } from '../lib/hooks.js';
import { ui } from '../lib/ui-tokens.js';
export function AuditLogPage() {
    const { accessToken } = useAuth();
    const { data: branches = [] } = useBranches();
    const [branchId, setBranchId] = useState('');
    const [entityType, setEntityType] = useState('');
    const [action, setAction] = useState('');
    const [from, setFrom] = useState(localTodayKey());
    const [to, setTo] = useState(localTodayKey());
    const queryKey = useMemo(() => ['audit-logs', branchId, entityType, action, from, to], [branchId, entityType, action, from, to]);
    const { data, isPending, isError, refetch, isFetching } = useQuery({
        queryKey,
        queryFn: async () => {
            const params = new URLSearchParams();
            if (branchId)
                params.set('branchId', branchId);
            if (entityType)
                params.set('entityType', entityType);
            if (action)
                params.set('action', action);
            if (from)
                params.set('from', from);
            if (to)
                params.set('to', to);
            params.set('limit', '200');
            const res = await apiListAuditLogs(params.toString(), accessToken ?? undefined);
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return (res.data ?? []);
        },
        enabled: Boolean(accessToken),
        staleTime: 10000,
    });
    const logs = data ?? [];
    return (_jsxs(Stack, { spacing: 2, children: [_jsx(Typography, { variant: "body1", color: "text.secondary", children: "\u0633\u062C\u0644 \u0639\u0627\u0645 \u0644\u0643\u0644 \u0627\u0644\u062D\u0631\u0643\u0627\u062A \u0639\u0644\u0649 \u0627\u0644\u0646\u0638\u0627\u0645 \u2014 \u0625\u0646\u0634\u0627\u0621\u060C \u062A\u0639\u062F\u064A\u0644\u060C \u0625\u0644\u063A\u0627\u0621\u060C \u0648\u062A\u062D\u0635\u064A\u0644 \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631." }), _jsx(Paper, { sx: { p: 2, borderRadius: 3 }, children: _jsxs(Stack, { direction: { xs: 'column', md: 'row' }, spacing: 1.5, flexWrap: "wrap", useFlexGap: true, children: [_jsxs(TextField, { select: true, label: "\u0627\u0644\u0641\u0631\u0639", size: "small", value: branchId, onChange: (e) => setBranchId(e.target.value), sx: { minWidth: 160 }, children: [_jsx(MenuItem, { value: "", children: "\u0643\u0644 \u0627\u0644\u0641\u0631\u0648\u0639" }), branches.map((b) => (_jsx(MenuItem, { value: b.id, children: b.name }, b.id)))] }), _jsxs(TextField, { select: true, label: "\u0646\u0648\u0639 \u0627\u0644\u0633\u062C\u0644", size: "small", value: entityType, onChange: (e) => setEntityType(e.target.value), sx: { minWidth: 140 }, children: [_jsx(MenuItem, { value: "", children: "\u0627\u0644\u0643\u0644" }), _jsx(MenuItem, { value: "ORDER", children: "\u0641\u0648\u0627\u062A\u064A\u0631 / \u0637\u0644\u0628\u0627\u062A" })] }), _jsxs(TextField, { select: true, label: "\u0627\u0644\u0625\u062C\u0631\u0627\u0621", size: "small", value: action, onChange: (e) => setAction(e.target.value), sx: { minWidth: 130 }, children: [_jsx(MenuItem, { value: "", children: "\u0627\u0644\u0643\u0644" }), Object.entries(AUDIT_ACTION_LABELS).map(([code, label]) => (_jsx(MenuItem, { value: code, children: label }, code)))] }), _jsx(TextField, { label: "\u0645\u0646", type: "date", size: "small", value: from, onChange: (e) => setFrom(e.target.value), InputLabelProps: { shrink: true } }), _jsx(TextField, { label: "\u0625\u0644\u0649", type: "date", size: "small", value: to, onChange: (e) => setTo(e.target.value), InputLabelProps: { shrink: true } }), _jsx(Button, { variant: "outlined", onClick: () => refetch(), disabled: isFetching, children: isFetching ? 'جاري التحديث…' : 'تحديث' })] }) }), isPending ? (_jsx(Stack, { alignItems: "center", py: 4, children: _jsx(CircularProgress, {}) })) : isError ? (_jsx(Alert, { severity: "error", children: "\u062A\u0639\u0630\u0651\u0631 \u062A\u062D\u0645\u064A\u0644 \u0633\u062C\u0644 \u0627\u0644\u0646\u0634\u0627\u0637." })) : logs.length === 0 ? (_jsx(Alert, { severity: "info", children: "\u0644\u0627 \u062A\u0648\u062C\u062F \u062D\u0631\u0643\u0627\u062A \u0641\u064A \u0627\u0644\u0641\u062A\u0631\u0629 \u0627\u0644\u0645\u062D\u062F\u062F\u0629." })) : (_jsx(Stack, { spacing: 1, children: logs.map((entry) => {
                    const changes = describeAuditChanges(entry);
                    const orderNumber = String(entry.afterData?.orderNumber ?? entry.beforeData?.orderNumber ?? '');
                    return (_jsx(Paper, { sx: { p: 1.5, borderRadius: 2.5, border: `1px solid ${ui.border}` }, children: _jsxs(Stack, { spacing: 0.75, children: [_jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 1, flexWrap: "wrap", children: [_jsxs(Stack, { direction: "row", spacing: 0.75, flexWrap: "wrap", useFlexGap: true, alignItems: "center", children: [_jsx(Typography, { fontWeight: 800, children: getAuditActionLabel(entry.action) }), _jsx(Chip, { size: "small", label: getAuditEntityLabel(entry.entityType), variant: "outlined" }), orderNumber ? (_jsx(Chip, { size: "small", label: `طلب ${orderNumber}`, color: "primary", variant: "outlined" })) : null] }), _jsx(Typography, { variant: "caption", color: "text.secondary", sx: { whiteSpace: 'nowrap' }, children: formatAuditTime(entry.createdAt) })] }), _jsxs(Typography, { variant: "caption", color: "text.secondary", children: [entry.actorUser?.fullName?.trim() || entry.actorUser?.username || 'نظام', entry.branch?.name ? ` · ${entry.branch.name}` : ''] }), changes.map((line, idx) => (_jsx(Typography, { variant: "body2", children: line }, idx)))] }) }, entry.id));
                }) })), logs.length >= 200 ? (_jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u064A\u064F\u0639\u0631\u0636 \u0623\u062D\u062F\u062B 200 \u062D\u0631\u0643\u0629 \u2014 \u0636\u064A\u0651\u0642 \u0646\u0637\u0627\u0642 \u0627\u0644\u062A\u0627\u0631\u064A\u062E \u0623\u0648 \u0627\u0644\u0641\u0631\u0639 \u0644\u0646\u062A\u0627\u0626\u062C \u0623\u062F\u0642." })) : null] }));
}
