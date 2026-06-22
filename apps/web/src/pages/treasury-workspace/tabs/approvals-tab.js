import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, } from '@mui/material';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SectionCard } from '../../shared.js';
import { useAuth } from '../../../lib/auth-context.js';
import { apiApproveOrderCancellation, apiApproveTransaction, apiBatchApproveTransactions, apiListPendingCancellations, apiRejectOrderCancellation, apiRejectTransaction, } from '../../../lib/api.js';
import { parseApiErrorBody } from '../../../lib/api-client.js';
import { PaymentMethodCards } from '../components/payment-method-cards.js';
export function ApprovalsTab({ workspace, onRefresh, onMessage }) {
    const { accessToken } = useAuth();
    const pending = workspace?.pendingCollections ?? [];
    const paymentMethods = workspace?.context?.paymentMethods ?? [];
    const treasuryToday = workspace?.treasuryToday ?? {};
    const [selected, setSelected] = useState(new Set());
    const [rejectId, setRejectId] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectBusy, setRejectBusy] = useState(false);
    const branchId = workspace?.context?.branch?.id ?? '';
    const { data: pendingCancellations = [], refetch: refetchCancellations } = useQuery({
        queryKey: ['pending-cancellations', branchId],
        queryFn: async () => {
            const res = await apiListPendingCancellations(branchId, undefined, accessToken ?? undefined);
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return Array.isArray(res.data) ? res.data : [];
        },
        enabled: Boolean(accessToken && branchId),
        staleTime: 15000,
    });
    const approveCancel = async (orderId) => {
        if (!accessToken)
            return;
        const res = await apiApproveOrderCancellation(orderId, accessToken);
        if (res.ok) {
            onMessage('تم اعتماد إلغاء الفاتورة.');
            onRefresh();
            refetchCancellations();
        }
        else {
            onMessage(parseApiErrorBody(res.body, 'فشل اعتماد الإلغاء'));
        }
    };
    const rejectCancel = async (orderId) => {
        if (!accessToken)
            return;
        const res = await apiRejectOrderCancellation(orderId, undefined, accessToken);
        if (res.ok) {
            onMessage('تم رفض طلب الإلغاء — الفاتورة كما هي.');
            onRefresh();
            refetchCancellations();
        }
        else {
            onMessage(parseApiErrorBody(res.body, 'فشل رفض الإلغاء'));
        }
    };
    const allIds = useMemo(() => pending.map((p) => p.id), [pending]);
    const toggleAll = () => {
        if (selected.size === allIds.length)
            setSelected(new Set());
        else
            setSelected(new Set(allIds));
    };
    const toggleOne = (id) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id))
                next.delete(id);
            else
                next.add(id);
            return next;
        });
    };
    const approveOne = async (id) => {
        if (!accessToken)
            return;
        const res = await apiApproveTransaction(id, accessToken);
        if (res.ok) {
            onMessage('تم الاعتماد النهائي.');
            onRefresh();
        }
        else {
            onMessage(parseApiErrorBody(res.body, 'فشل الاعتماد — تحقق من الصلاحيات'));
        }
    };
    const confirmReject = async () => {
        if (!accessToken || !rejectId)
            return;
        setRejectBusy(true);
        const res = await apiRejectTransaction(rejectId, rejectReason.trim() || undefined, accessToken);
        setRejectBusy(false);
        if (res.ok) {
            setRejectId(null);
            setRejectReason('');
            onMessage('تم إرجاع الطلب لـ«غير محصل» في نقطة البيع — نفس الفاتورة بدون تكرار. يمكن للكاشير إعادة التحصيل أو إلغاء الفاتورة.');
            onRefresh();
        }
        else {
            onMessage(parseApiErrorBody(res.body, 'فشل الرفض — تحقق من الصلاحيات'));
        }
    };
    const rejectOne = (id) => {
        setRejectId(id);
        setRejectReason('');
    };
    const approveBatch = async () => {
        if (!accessToken || selected.size === 0)
            return;
        const count = selected.size;
        const res = await apiBatchApproveTransactions([...selected], accessToken);
        if (res.ok) {
            setSelected(new Set());
            onMessage(`تم اعتماد ${count} تحصيل نهائياً.`);
            onRefresh();
        }
        else {
            onMessage(parseApiErrorBody(res.body, 'فشل اعتماد الدفعة'));
        }
    };
    const inTreasuryTotal = Number(treasuryToday.approvedTotal ?? 0) + Number(treasuryToday.pendingTotal ?? 0);
    return (_jsxs(_Fragment, { children: [_jsxs(Stack, { spacing: 2, children: [_jsxs(SectionCard, { title: "\u0645\u0644\u062E\u0635 \u0627\u0644\u062E\u0632\u0646\u0629 \u0627\u0644\u064A\u0648\u0645", children: [_jsx(Typography, { variant: "caption", color: "text.secondary", display: "block", sx: { mb: 1 }, children: "\u0627\u0644\u062A\u062D\u0635\u064A\u0644 \u064A\u064F\u0633\u0644\u064E\u0651\u0645 \u0645\u0646 \u0627\u0644\u0643\u0627\u0634\u064A\u0631 \u0644\u0644\u0625\u062F\u0627\u0631\u0629 \u2014 \u064A\u064F\u062E\u0635\u0645 \u0645\u0646 \u0639\u0647\u062F\u0629 \u0627\u0644\u062F\u0631\u062C \u0648\u064A\u064F\u0633\u062C\u064E\u0651\u0644 \u0641\u064A \u0627\u0644\u062E\u0632\u0646\u0629. \u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F \u062A\u0623\u0643\u064A\u062F \u0646\u0647\u0627\u0626\u064A \u0639\u0644\u0649 \u0627\u0644\u0645\u0628\u0644\u063A." }), _jsx(PaymentMethodCards, { paymentMethods: paymentMethods, breakdown: treasuryToday.byPaymentMethod ?? {}, mode: "today" }), _jsxs(Stack, { direction: "row", spacing: 2, flexWrap: "wrap", useFlexGap: true, sx: { mt: 2 }, children: [_jsxs(Typography, { variant: "body2", fontWeight: 700, children: ["\u0641\u064A \u0627\u0644\u062E\u0632\u0646\u0629: ", inTreasuryTotal.toLocaleString('en-US'), " \u062C.\u0645"] }), _jsxs(Typography, { variant: "body2", color: "warning.main", children: ["\u0628\u0627\u0646\u062A\u0638\u0627\u0631 \u0627\u0639\u062A\u0645\u0627\u062F: ", Number(treasuryToday.pendingTotal ?? 0).toLocaleString('en-US'), " \u062C.\u0645"] }), _jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["\u0645\u0639\u062A\u0645\u062F \u0646\u0647\u0627\u0626\u064A: ", Number(treasuryToday.approvedTotal ?? 0).toLocaleString('en-US'), " \u062C.\u0645"] })] })] }), _jsx(SectionCard, { title: "\u0628\u0627\u0646\u062A\u0638\u0627\u0631 \u0627\u0639\u062A\u0645\u0627\u062F\u0643 \u0627\u0644\u0646\u0647\u0627\u0626\u064A", action: _jsxs(Button, { size: "small", variant: "contained", disabled: selected.size === 0, onClick: approveBatch, children: ["\u0627\u0639\u062A\u0645\u0627\u062F \u0627\u0644\u0645\u062D\u062F\u062F (", selected.size, ")"] }), children: pending.length === 0 ? (_jsx(Alert, { severity: "success", children: "\u0644\u0627 \u062A\u0648\u062C\u062F \u062A\u062D\u0635\u064A\u0644\u0627\u062A \u0628\u0627\u0646\u062A\u0638\u0627\u0631 \u0627\u0639\u062A\u0645\u0627\u062F\u0643 \u0627\u0644\u0646\u0647\u0627\u0626\u064A \u0627\u0644\u064A\u0648\u0645." })) : (_jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { padding: "checkbox", children: _jsx(Checkbox, { checked: selected.size === allIds.length && allIds.length > 0, indeterminate: selected.size > 0 && selected.size < allIds.length, onChange: toggleAll }) }), _jsx(TableCell, { children: "\u0627\u0644\u0637\u0644\u0628" }), _jsx(TableCell, { children: "\u0627\u0644\u0643\u0627\u0634\u064A\u0631" }), _jsx(TableCell, { children: "\u0627\u0644\u062F\u0641\u0639" }), _jsx(TableCell, { children: "\u0627\u0644\u0648\u0642\u062A" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u0645\u0628\u0644\u063A" }), _jsx(TableCell, {})] }) }), _jsx(TableBody, { children: pending.map((row) => (_jsxs(TableRow, { hover: true, children: [_jsx(TableCell, { padding: "checkbox", children: _jsx(Checkbox, { checked: selected.has(row.id), onChange: () => toggleOne(row.id) }) }), _jsxs(TableCell, { children: [_jsx(Typography, { fontWeight: 700, children: row.orderNumber }), row.customerName ? _jsx(Typography, { variant: "caption", children: row.customerName }) : null] }), _jsx(TableCell, { children: row.cashierName }), _jsx(TableCell, { children: row.paymentMethodName }), _jsx(TableCell, { children: new Date(row.occurredAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) }), _jsxs(TableCell, { align: "left", sx: { fontWeight: 800 }, children: [Number(row.amount).toLocaleString('en-US'), " \u062C.\u0645"] }), _jsx(TableCell, { children: _jsxs(Stack, { direction: "row", spacing: 0.5, children: [_jsx(Button, { size: "small", onClick: () => approveOne(row.id), children: "\u0627\u0639\u062A\u0645\u0627\u062F" }), _jsx(Button, { size: "small", color: "warning", onClick: () => rejectOne(row.id), children: "\u0625\u0631\u062C\u0627\u0639 \u063A\u064A\u0631 \u0645\u062D\u0635\u0644" })] }) })] }, row.id))) })] })) }), _jsx(SectionCard, { title: "\u0637\u0644\u0628\u0627\u062A \u0625\u0644\u063A\u0627\u0621 \u0641\u0648\u0627\u062A\u064A\u0631", children: pendingCancellations.length === 0 ? (_jsx(Alert, { severity: "info", children: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0637\u0644\u0628\u0627\u062A \u0625\u0644\u063A\u0627\u0621 \u0628\u0627\u0646\u062A\u0638\u0627\u0631\u0643." })) : (_jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u0627\u0644\u0637\u0644\u0628" }), _jsx(TableCell, { children: "\u0627\u0644\u0633\u0628\u0628" }), _jsx(TableCell, { children: "\u0627\u0644\u0645\u0628\u0644\u063A" }), _jsx(TableCell, {})] }) }), _jsx(TableBody, { children: pendingCancellations.map((row) => (_jsxs(TableRow, { hover: true, children: [_jsxs(TableCell, { children: [_jsx(Typography, { fontWeight: 700, children: row.orderNumber }), row.customerName ? _jsx(Typography, { variant: "caption", children: row.customerName }) : null] }), _jsx(TableCell, { children: row.cancellationReason ?? '—' }), _jsxs(TableCell, { sx: { fontWeight: 800 }, children: [Number(row.totalAmount).toLocaleString('en-US'), " \u062C.\u0645"] }), _jsx(TableCell, { children: _jsxs(Stack, { direction: "row", spacing: 0.5, children: [_jsx(Button, { size: "small", color: "error", onClick: () => approveCancel(row.id), children: "\u0627\u0639\u062A\u0645\u0627\u062F \u0627\u0644\u0625\u0644\u063A\u0627\u0621" }), _jsx(Button, { size: "small", onClick: () => rejectCancel(row.id), children: "\u0631\u0641\u0636" })] }) })] }, row.id))) })] })) }), workspace?.collectorSummary?.collectors?.length ? (_jsx(SectionCard, { title: "\u062A\u062D\u0635\u064A\u0644 \u0645\u0639\u062A\u0645\u062F \u0627\u0644\u064A\u0648\u0645 (\u0644\u0643\u0644 \u0643\u0627\u0634\u064A\u0631)", children: _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u0627\u0644\u0643\u0627\u0634\u064A\u0631" }), _jsx(TableCell, { align: "right", children: "\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A" })] }) }), _jsx(TableBody, { children: workspace.collectorSummary.collectors.map((row) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: row.fullName }), _jsxs(TableCell, { align: "right", sx: { fontWeight: 800 }, children: [Number(row.total).toLocaleString('en-US'), " \u062C.\u0645"] })] }, row.userId))) })] }) })) : null] }), _jsxs(Dialog, { open: Boolean(rejectId), onClose: () => !rejectBusy && setRejectId(null), fullWidth: true, maxWidth: "xs", children: [_jsx(DialogTitle, { children: "\u0625\u0631\u062C\u0627\u0639 \u0644\u063A\u064A\u0631 \u0645\u062D\u0635\u0644" }), _jsxs(DialogContent, { children: [_jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 1.5 }, children: "\u0644\u0646 \u062A\u064F\u0646\u0634\u0623 \u0641\u0627\u062A\u0648\u0631\u0629 \u062C\u062F\u064A\u062F\u0629 \u2014 \u0646\u0641\u0633 \u0627\u0644\u0637\u0644\u0628 \u064A\u0639\u0648\u062F \u0644\u062A\u0628\u0648\u064A\u0628 \u00AB\u063A\u064A\u0631 \u0645\u062D\u0635\u0644\u00BB \u0641\u064A \u0646\u0642\u0637\u0629 \u0627\u0644\u0628\u064A\u0639. \u064A\u0645\u0643\u0646 \u0644\u0644\u0643\u0627\u0634\u064A\u0631 \u0628\u0639\u062F\u0647\u0627 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u062A\u062D\u0635\u064A\u0644 \u0623\u0648 \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629." }), _jsx(TextField, { autoFocus: true, fullWidth: true, multiline: true, minRows: 2, label: "\u0633\u0628\u0628 (\u0627\u062E\u062A\u064A\u0627\u0631\u064A)", value: rejectReason, onChange: (e) => setRejectReason(e.target.value) })] }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setRejectId(null), disabled: rejectBusy, children: "\u0625\u0644\u063A\u0627\u0621" }), _jsx(Button, { color: "warning", variant: "contained", onClick: confirmReject, disabled: rejectBusy, children: "\u062A\u0623\u0643\u064A\u062F \u0627\u0644\u0625\u0631\u062C\u0627\u0639" })] })] })] }));
}
