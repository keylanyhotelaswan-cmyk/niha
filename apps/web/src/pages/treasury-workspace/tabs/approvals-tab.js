import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Button, Checkbox, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography, } from '@mui/material';
import { useMemo, useState } from 'react';
import { SectionCard } from '../../shared.js';
import { useAuth } from '../../../lib/auth-context.js';
import { apiApproveTransaction, apiBatchApproveTransactions, apiRejectTransaction } from '../../../lib/api.js';
import { PaymentMethodCards } from '../components/payment-method-cards.js';
export function ApprovalsTab({ workspace, onRefresh, onMessage }) {
    const { accessToken } = useAuth();
    const pending = workspace?.pendingCollections ?? [];
    const paymentMethods = workspace?.context?.paymentMethods ?? [];
    const treasuryToday = workspace?.treasuryToday ?? {};
    const [selected, setSelected] = useState(new Set());
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
    };
    const rejectOne = async (id) => {
        if (!accessToken)
            return;
        const reason = window.prompt('سبب الرفض (اختياري):') ?? '';
        const res = await apiRejectTransaction(id, reason.trim() || undefined, accessToken);
        if (res.ok) {
            onMessage('تم رفض التحصيل — الطلب عاد لغير محصل في نقطة البيع.');
            onRefresh();
        }
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
    };
    const inTreasuryTotal = Number(treasuryToday.approvedTotal ?? 0) + Number(treasuryToday.pendingTotal ?? 0);
    return (_jsxs(Stack, { spacing: 2, children: [_jsxs(SectionCard, { title: "\u0645\u0644\u062E\u0635 \u0627\u0644\u062E\u0632\u0646\u0629 \u0627\u0644\u064A\u0648\u0645", children: [_jsx(Typography, { variant: "caption", color: "text.secondary", display: "block", sx: { mb: 1 }, children: "\u0627\u0644\u062A\u062D\u0635\u064A\u0644 \u064A\u064F\u0633\u0644\u064E\u0651\u0645 \u0645\u0646 \u0627\u0644\u0643\u0627\u0634\u064A\u0631 \u0644\u0644\u0625\u062F\u0627\u0631\u0629 \u2014 \u064A\u064F\u062E\u0635\u0645 \u0645\u0646 \u0639\u0647\u062F\u0629 \u0627\u0644\u062F\u0631\u062C \u0648\u064A\u064F\u0633\u062C\u064E\u0651\u0644 \u0641\u064A \u0627\u0644\u062E\u0632\u0646\u0629. \u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F \u062A\u0623\u0643\u064A\u062F \u0646\u0647\u0627\u0626\u064A \u0639\u0644\u0649 \u0627\u0644\u0645\u0628\u0644\u063A." }), _jsx(PaymentMethodCards, { paymentMethods: paymentMethods, breakdown: treasuryToday.byPaymentMethod ?? {}, mode: "today" }), _jsxs(Stack, { direction: "row", spacing: 2, flexWrap: "wrap", useFlexGap: true, sx: { mt: 2 }, children: [_jsxs(Typography, { variant: "body2", fontWeight: 700, children: ["\u0641\u064A \u0627\u0644\u062E\u0632\u0646\u0629: ", inTreasuryTotal.toLocaleString('en-US'), " \u062C.\u0645"] }), _jsxs(Typography, { variant: "body2", color: "warning.main", children: ["\u0628\u0627\u0646\u062A\u0638\u0627\u0631 \u0627\u0639\u062A\u0645\u0627\u062F: ", Number(treasuryToday.pendingTotal ?? 0).toLocaleString('en-US'), " \u062C.\u0645"] }), _jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["\u0645\u0639\u062A\u0645\u062F \u0646\u0647\u0627\u0626\u064A: ", Number(treasuryToday.approvedTotal ?? 0).toLocaleString('en-US'), " \u062C.\u0645"] })] })] }), _jsx(SectionCard, { title: "\u0628\u0627\u0646\u062A\u0638\u0627\u0631 \u0627\u0639\u062A\u0645\u0627\u062F\u0643 \u0627\u0644\u0646\u0647\u0627\u0626\u064A", action: _jsxs(Button, { size: "small", variant: "contained", disabled: selected.size === 0, onClick: approveBatch, children: ["\u0627\u0639\u062A\u0645\u0627\u062F \u0627\u0644\u0645\u062D\u062F\u062F (", selected.size, ")"] }), children: pending.length === 0 ? (_jsx(Alert, { severity: "success", children: "\u0644\u0627 \u062A\u0648\u062C\u062F \u062A\u062D\u0635\u064A\u0644\u0627\u062A \u0628\u0627\u0646\u062A\u0638\u0627\u0631 \u0627\u0639\u062A\u0645\u0627\u062F\u0643 \u0627\u0644\u0646\u0647\u0627\u0626\u064A \u0627\u0644\u064A\u0648\u0645." })) : (_jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { padding: "checkbox", children: _jsx(Checkbox, { checked: selected.size === allIds.length && allIds.length > 0, indeterminate: selected.size > 0 && selected.size < allIds.length, onChange: toggleAll }) }), _jsx(TableCell, { children: "\u0627\u0644\u0637\u0644\u0628" }), _jsx(TableCell, { children: "\u0627\u0644\u0643\u0627\u0634\u064A\u0631" }), _jsx(TableCell, { children: "\u0627\u0644\u062F\u0641\u0639" }), _jsx(TableCell, { children: "\u0627\u0644\u0648\u0642\u062A" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u0645\u0628\u0644\u063A" }), _jsx(TableCell, {})] }) }), _jsx(TableBody, { children: pending.map((row) => (_jsxs(TableRow, { hover: true, children: [_jsx(TableCell, { padding: "checkbox", children: _jsx(Checkbox, { checked: selected.has(row.id), onChange: () => toggleOne(row.id) }) }), _jsxs(TableCell, { children: [_jsx(Typography, { fontWeight: 700, children: row.orderNumber }), row.customerName ? _jsx(Typography, { variant: "caption", children: row.customerName }) : null] }), _jsx(TableCell, { children: row.cashierName }), _jsx(TableCell, { children: row.paymentMethodName }), _jsx(TableCell, { children: new Date(row.occurredAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) }), _jsxs(TableCell, { align: "left", sx: { fontWeight: 800 }, children: [Number(row.amount).toLocaleString('en-US'), " \u062C.\u0645"] }), _jsx(TableCell, { children: _jsxs(Stack, { direction: "row", spacing: 0.5, children: [_jsx(Button, { size: "small", onClick: () => approveOne(row.id), children: "\u0627\u0639\u062A\u0645\u0627\u062F" }), _jsx(Button, { size: "small", color: "error", onClick: () => rejectOne(row.id), children: "\u0631\u0641\u0636" })] }) })] }, row.id))) })] })) }), workspace?.collectorSummary?.collectors?.length ? (_jsx(SectionCard, { title: "\u062A\u062D\u0635\u064A\u0644 \u0645\u0639\u062A\u0645\u062F \u0627\u0644\u064A\u0648\u0645 (\u0644\u0643\u0644 \u0643\u0627\u0634\u064A\u0631)", children: _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u0627\u0644\u0643\u0627\u0634\u064A\u0631" }), _jsx(TableCell, { align: "right", children: "\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A" })] }) }), _jsx(TableBody, { children: workspace.collectorSummary.collectors.map((row) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: row.fullName }), _jsxs(TableCell, { align: "right", sx: { fontWeight: 800 }, children: [Number(row.total).toLocaleString('en-US'), " \u062C.\u0645"] })] }, row.userId))) })] }) })) : null] }));
}
