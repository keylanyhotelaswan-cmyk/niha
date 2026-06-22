import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography, } from '@mui/material';
import { formatShiftDuration, formatShiftMoney, formatShiftOpenedAt, } from '../../../lib/shift-summary-utils.js';
import { buildShiftSummaryThermalHtml, openShiftSummaryPreviewWindow, printShiftSummary, } from '../../../lib/shift-summary-print.js';
import { ShiftCollectionBreakdown } from './shift-collection-breakdown.js';
export function ShiftSummaryPreviewDialog({ open, onClose, params, onMessage, }) {
    const [printing, setPrinting] = useState(false);
    const summary = params?.summary ?? null;
    const expected = Number(summary?.expectedCash ?? 0);
    const thermalHtml = useMemo(() => (params ? buildShiftSummaryThermalHtml(params) : ''), [params]);
    useEffect(() => {
        if (!open)
            setPrinting(false);
    }, [open]);
    const handleThermalPrint = async () => {
        if (!params)
            return;
        setPrinting(true);
        try {
            const res = await printShiftSummary(params);
            if (res.ok) {
                onMessage?.(`تم إرسال الملخص للطابعة (${res.printer}).`);
                return;
            }
            const opened = openShiftSummaryPreviewWindow(params);
            onMessage?.(opened ? `${res.message} — افتح المعاينة واطبع يدوياً (Ctrl+P).` : res.message);
        }
        finally {
            setPrinting(false);
        }
    };
    const handleBrowserPreview = () => {
        if (!params)
            return;
        if (openShiftSummaryPreviewWindow(params)) {
            onMessage?.('تم فتح المعاينة — اضغط Ctrl+P للطباعة عندما تكون جاهزاً.');
        }
        else {
            onMessage?.('تعذّر فتح نافذة المعاينة — اسمح بالنوافذ المنبثقة.');
        }
    };
    if (!params)
        return null;
    return (_jsxs(Dialog, { open: open, onClose: onClose, fullWidth: true, maxWidth: "sm", children: [_jsxs(DialogTitle, { sx: { fontWeight: 800 }, children: ["\u0645\u0644\u062E\u0635 \u0627\u0644\u0648\u0631\u062F\u064A\u0629 ", params.shiftNumber ?? ''] }), _jsx(DialogContent, { children: _jsxs(Stack, { spacing: 2, children: [_jsxs(Typography, { variant: "body2", color: "text.secondary", children: [params.cashierName ? `الكاشير: ${params.cashierName}` : null, params.openedAt ? ` · فتح ${formatShiftOpenedAt(params.openedAt)} · ${formatShiftDuration(params.openedAt)}` : ''] }), _jsx(ShiftCollectionBreakdown, { summary: summary }), _jsxs(Stack, { spacing: 0.5, children: [_jsx(SummaryLine, { label: "\u0631\u0635\u064A\u062F \u0627\u0644\u0627\u0641\u062A\u062A\u0627\u062D", value: formatShiftMoney(Number(summary?.openingFloat ?? 0)) }), _jsx(SummaryLine, { label: "\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A", value: formatShiftMoney(Number(summary?.totalSales ?? summary?.salesTotal ?? 0)) }), _jsx(SummaryLine, { label: "\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u0648\u0631\u062F\u064A\u0629", value: formatShiftMoney(Number(summary?.expensesTotal ?? summary?.outgoing ?? 0)) }), _jsx(SummaryLine, { label: "\u0646\u0642\u062F\u064A \u0628\u0627\u0646\u062A\u0638\u0627\u0631 \u0627\u0639\u062A\u0645\u0627\u062F", value: formatShiftMoney(Number(summary?.pendingCashInCustody ?? summary?.pending ?? 0)) }), _jsx(SummaryLine, { label: "\u0637\u0644\u0628\u0627\u062A \u063A\u064A\u0631 \u0645\u062D\u0635\u0651\u0644\u0629", value: `${summary?.uncollectedCount ?? 0} · ${formatShiftMoney(Number(summary?.uncollectedTotal ?? 0))}` }), _jsx(SummaryLine, { label: "\u0627\u0644\u0646\u0642\u062F\u064A \u0641\u064A \u0627\u0644\u062F\u0631\u062C (\u0645\u062A\u0648\u0642\u0639)", value: formatShiftMoney(expected), bold: true })] }), (summary?.uncollectedOrders?.length ?? 0) > 0 ? (_jsxs(Stack, { spacing: 0.5, sx: { bgcolor: 'rgba(217,119,6,0.08)', p: 1.5, borderRadius: 2 }, children: [_jsx(Typography, { variant: "subtitle2", fontWeight: 800, color: "warning.dark", children: "\u062A\u0641\u0627\u0635\u064A\u0644 \u063A\u064A\u0631 \u0627\u0644\u0645\u062D\u0635\u0651\u0644" }), summary.uncollectedOrders.map((o) => (_jsxs(Stack, { direction: "row", justifyContent: "space-between", gap: 1, children: [_jsxs(Typography, { variant: "body2", children: ["#", o.orderNumber, o.customerName?.trim() ? ` · ${o.customerName.trim()}` : ''] }), _jsx(Typography, { variant: "body2", fontWeight: 700, children: formatShiftMoney(o.total) })] }, o.orderNumber)))] })) : null, _jsx(Alert, { severity: "info", sx: { borderRadius: 2 }, children: "\u0631\u0627\u062C\u0639 \u0627\u0644\u0645\u0644\u062E\u0635 \u062B\u0645 \u0627\u0636\u063A\u0637 \u00AB\u0637\u0628\u0627\u0639\u0629 \u0639\u0644\u0649 \u0627\u0644\u0637\u0627\u0628\u0639\u0629\u00BB. \u0644\u0646 \u062A\u064F\u0637\u0628\u0639 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B." }), _jsxs(Box, { sx: {
                                border: '1px dashed rgba(117,89,77,0.35)',
                                borderRadius: 2,
                                bgcolor: '#fafafa',
                                p: 1,
                                maxHeight: 280,
                                overflow: 'auto',
                            }, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", sx: { display: 'block', mb: 0.5, px: 0.5 }, children: "\u0634\u0643\u0644 \u0627\u0644\u0625\u064A\u0635\u0627\u0644 \u0639\u0644\u0649 \u0627\u0644\u0637\u0627\u0628\u0639\u0629 \u0627\u0644\u062D\u0631\u0627\u0631\u064A\u0629" }), _jsx(Box, { component: "iframe", title: "\u0645\u0639\u0627\u064A\u0646\u0629 \u0645\u0644\u062E\u0635 \u0627\u0644\u0648\u0631\u062F\u064A\u0629", srcDoc: thermalHtml, sx: {
                                        width: '100%',
                                        minHeight: 220,
                                        border: 'none',
                                        bgcolor: '#fff',
                                        transform: 'scale(0.92)',
                                        transformOrigin: 'top center',
                                    } })] })] }) }), _jsxs(DialogActions, { sx: { flexWrap: 'wrap', gap: 1, px: 2, pb: 2 }, children: [_jsx(Button, { onClick: onClose, children: "\u0625\u063A\u0644\u0627\u0642" }), _jsx(Button, { variant: "outlined", onClick: handleBrowserPreview, children: "\u0645\u0639\u0627\u064A\u0646\u0629 \u0641\u064A \u0646\u0627\u0641\u0630\u0629" }), _jsx(Button, { variant: "contained", disabled: printing, onClick: () => { void handleThermalPrint(); }, children: printing ? _jsx(CircularProgress, { size: 20, color: "inherit" }) : 'طباعة على الطابعة' })] })] }));
}
function SummaryLine({ label, value, bold }) {
    return (_jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "baseline", gap: 1, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: label }), _jsx(Typography, { variant: "body2", fontWeight: bold ? 800 : 700, children: value })] }));
}
