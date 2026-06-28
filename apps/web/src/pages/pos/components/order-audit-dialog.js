import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography, } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { apiGetOrderAuditLogs } from '../../../lib/api.js';
import { describeAuditChanges, formatAuditTime, getAuditActionLabel, } from '../../../lib/audit-log-utils.js';
import { useAuth } from '../../../lib/auth-context.js';
import { ui } from '../../../lib/ui-tokens.js';
export function OrderAuditDialog({ open, orderId, orderCode, onClose }) {
    const { accessToken } = useAuth();
    const { data, isPending, isError } = useQuery({
        queryKey: ['order-audit-logs', orderId],
        queryFn: async () => {
            const res = await apiGetOrderAuditLogs(orderId, accessToken ?? undefined);
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return (res.data ?? []);
        },
        enabled: open && Boolean(orderId && accessToken),
        staleTime: 15000,
    });
    const logs = data ?? [];
    const amendments = logs.filter((e) => e.action !== 'CREATE');
    return (_jsxs(Dialog, { open: open, onClose: onClose, fullWidth: true, maxWidth: "sm", children: [_jsxs(DialogTitle, { sx: { fontWeight: 800 }, children: ["\u0633\u062C\u0644 \u0646\u0634\u0627\u0637 \u00B7 \u0637\u0644\u0628 ", orderCode] }), _jsx(DialogContent, { children: isPending ? (_jsx(Stack, { alignItems: "center", py: 3, children: _jsx(CircularProgress, { size: 28 }) })) : isError ? (_jsx(Alert, { severity: "error", children: "\u062A\u0639\u0630\u0651\u0631 \u062A\u062D\u0645\u064A\u0644 \u0633\u062C\u0644 \u0627\u0644\u0646\u0634\u0627\u0637." })) : logs.length === 0 ? (_jsx(Alert, { severity: "info", children: "\u0644\u0627 \u064A\u0648\u062C\u062F \u0633\u062C\u0644 \u0646\u0634\u0627\u0637 \u0644\u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628." })) : (_jsxs(Stack, { spacing: 1.25, children: [logs.map((entry) => {
                            const changes = describeAuditChanges(entry);
                            return (_jsxs(Stack, { spacing: 0.35, sx: { p: 1.25, borderRadius: 2, bgcolor: ui.surfaceMuted }, children: [_jsx(Typography, { variant: "body2", fontWeight: 800, children: getAuditActionLabel(entry.action) }), _jsxs(Typography, { variant: "caption", color: "text.secondary", children: [formatAuditTime(entry.createdAt), ' · ', entry.actorUser?.fullName?.trim() || entry.actorUser?.username || 'نظام'] }), changes.map((line, idx) => (_jsx(Typography, { variant: "body2", children: line }, idx)))] }, entry.id));
                        }), amendments.length === 0 && logs.some((e) => e.action === 'CREATE') ? (_jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u0644\u0645 \u064A\u064F\u0633\u062C\u064E\u0651\u0644 \u0623\u064A \u062A\u0639\u062F\u064A\u0644 \u0628\u0639\u062F \u0625\u0635\u062F\u0627\u0631 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629." })) : null] })) }), _jsx(DialogActions, { children: _jsx(Button, { onClick: onClose, children: "\u0625\u063A\u0644\u0627\u0642" }) })] }));
}
