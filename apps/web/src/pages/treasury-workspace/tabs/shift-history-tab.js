import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, } from '@mui/material';
import { useState } from 'react';
import { SectionCard } from '../../shared.js';
import { useAuth } from '../../../lib/auth-context.js';
import { apiGet } from '../../../lib/api-client.js';
import { ShiftDetailDrawer } from '../components/shift-detail-drawer.js';
import { formatDateRangeLabelAr, isTodayRange } from '../../../lib/date-utils.js';
export function ShiftHistoryTab({ workspace, fromDate, toDate }) {
    const { accessToken } = useAuth();
    const shifts = workspace?.shiftsForDate ?? [];
    const fromKey = fromDate ?? workspace?.context?.fromDate ?? workspace?.context?.date ?? '';
    const toKey = toDate ?? workspace?.context?.toDate ?? workspace?.context?.date ?? '';
    const rangeLabel = fromKey && toKey ? formatDateRangeLabelAr(fromKey, toKey) : '';
    const sectionTitle = rangeLabel
        ? (isTodayRange(fromKey, toKey) ? 'ورديات اليوم' : `ورديات ${rangeLabel}`)
        : 'سجل الورديات';
    const sectionDesc = fromKey === toKey
        ? 'عرض ورديات اليوم المحدد فقط — اضغط على وردية لعرض التفاصيل والحركات.'
        : 'عرض ورديات الفترة المحددة — اضغط على وردية لعرض التفاصيل والحركات.';
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [detailTx, setDetailTx] = useState([]);
    const openDetail = async (entry) => {
        setSelectedEntry(entry);
        if (!accessToken || !entry?.shift?.id)
            return;
        const res = await apiGet(`/treasury/transactions?shiftId=${entry.shift.id}`, accessToken);
        if (res.ok)
            setDetailTx(res.data ?? []);
    };
    return (_jsxs(Stack, { spacing: 2, children: [_jsxs(SectionCard, { title: sectionTitle, description: sectionDesc, children: [_jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u0627\u0644\u0648\u0631\u062F\u064A\u0629" }), _jsx(TableCell, { children: "\u0627\u0644\u0643\u0627\u0634\u064A\u0631" }), _jsx(TableCell, { children: "\u0627\u0644\u062D\u0627\u0644\u0629" }), _jsx(TableCell, { children: "\u0645\u0628\u064A\u0639\u0627\u062A" }), _jsx(TableCell, { children: "\u0645\u0639\u0644\u0642" }), _jsx(TableCell, { align: "right", children: "\u0639\u0647\u062F\u0629 \u0645\u062A\u0648\u0642\u0639\u0629" }), _jsx(TableCell, { align: "right", children: "\u0641\u0631\u0642 \u0625\u063A\u0644\u0627\u0642" })] }) }), _jsx(TableBody, { children: shifts.map((entry) => (_jsxs(TableRow, { hover: true, sx: { cursor: 'pointer' }, onClick: () => openDetail(entry), children: [_jsx(TableCell, { children: entry.shift.shiftNumber }), _jsx(TableCell, { children: entry.shift.openedBy?.fullName ?? '—' }), _jsx(TableCell, { children: _jsx(Chip, { size: "small", label: entry.shift.status === 'OPEN' ? 'مفتوحة' : 'مغلقة', color: entry.shift.status === 'OPEN' ? 'success' : 'default' }) }), _jsx(TableCell, { children: Number(entry.totalSales ?? 0).toLocaleString('en-US') }), _jsx(TableCell, { children: Number(entry.pending ?? 0).toLocaleString('en-US') }), _jsxs(TableCell, { align: "right", children: [Number(entry.expectedCash ?? 0).toLocaleString('en-US'), " \u062C.\u0645"] }), _jsx(TableCell, { align: "right", children: entry.variance != null ? `${Number(entry.variance).toLocaleString('en-US')} ج.م` : '—' })] }, entry.shift.id))) })] }), shifts.length === 0 ? _jsx(Alert, { severity: "info", sx: { mt: 1 }, children: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0648\u0631\u062F\u064A\u0627\u062A \u0641\u064A \u0647\u0630\u0647 \u0627\u0644\u0641\u062A\u0631\u0629." }) : null] }), _jsx(ShiftDetailDrawer, { open: !!selectedEntry, onClose: () => setSelectedEntry(null), entry: selectedEntry, detailTransactions: detailTx })] }));
}
