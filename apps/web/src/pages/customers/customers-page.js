import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Box, Button, Chip, CircularProgress, Drawer, FormControlLabel, IconButton, Paper, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Typography, } from '@mui/material';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CustomerPhoneField } from '../../components/customer-phone-field.js';
import { formatCustomerPhoneDisplay } from '../../lib/customer-phone.js';
import { useBranches, useCustomerDetail, useCustomers } from '../../lib/hooks.js';
import { apiUpdateCustomer } from '../../lib/api.js';
import { useAuth } from '../../lib/auth-context.js';
import { formatCurrency } from '../pos/utils.js';
function formatWhen(iso) {
    if (!iso)
        return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return '—';
    return d.toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
}
export function CustomersPage() {
    const { accessToken } = useAuth();
    const queryClient = useQueryClient();
    const { data: branches = [] } = useBranches();
    const [branchId, setBranchId] = useState('');
    const [q, setQ] = useState('');
    const [filter, setFilter] = useState('all');
    const [selectedId, setSelectedId] = useState(null);
    const [editName, setEditName] = useState('');
    const [editAddress, setEditAddress] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [editRegular, setEditRegular] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const effectiveBranchId = branchId || branches[0]?.id || '';
    const { data, isLoading, isError, error } = useCustomers(effectiveBranchId, q.trim() || undefined, filter === 'regular');
    const { data: detail, isLoading: detailLoading } = useCustomerDetail(selectedId ?? undefined);
    const items = data?.items ?? [];
    const openDetail = (id) => {
        setSelectedId(id);
        setMessage('');
    };
    useEffect(() => {
        if (!detail)
            return;
        setEditName(detail.name ?? '');
        setEditAddress(detail.address ?? '');
        setEditNotes(detail.notes ?? '');
        setEditRegular(!!detail.isRegular);
    }, [detail]);
    const saveCustomer = async () => {
        if (!selectedId || !accessToken)
            return;
        setSaving(true);
        setMessage('');
        const res = await apiUpdateCustomer(selectedId, {
            name: editName.trim(),
            address: editAddress.trim(),
            notes: editNotes.trim(),
            isRegular: editRegular,
        }, accessToken);
        setSaving(false);
        if (!res.ok) {
            setMessage(res.body ?? res.error ?? 'فشل الحفظ');
            return;
        }
        setMessage('تم حفظ بيانات العميل');
        void queryClient.invalidateQueries({ queryKey: ['customers'] });
        void queryClient.invalidateQueries({ queryKey: ['customer', selectedId] });
    };
    return (_jsxs(Stack, { spacing: 2, children: [_jsxs(Stack, { direction: { xs: 'column', md: 'row' }, spacing: 1.5, alignItems: { md: 'center' }, children: [_jsx(Typography, { variant: "h5", fontWeight: 800, sx: { flex: 1 }, children: "\u0627\u0644\u0639\u0645\u0644\u0627\u0621" }), branches.length > 1 ? (_jsx(TextField, { select: true, size: "small", label: "\u0627\u0644\u0641\u0631\u0639", value: effectiveBranchId, onChange: (e) => setBranchId(e.target.value), SelectProps: { native: true }, sx: { minWidth: 180 }, children: branches.map((b) => (_jsx("option", { value: b.id, children: b.name }, b.id))) })) : null] }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u0633\u062C\u0644 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0645\u0646 \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0633\u0627\u0628\u0642\u0629 \u2014 \u0627\u0628\u062D\u062B \u0628\u0627\u0644\u0647\u0627\u062A\u0641 \u0623\u0648 \u0627\u0644\u0627\u0633\u0645\u060C \u0648\u0639\u0644\u0651\u0645 \u00AB\u0639\u0645\u064A\u0644 \u062F\u0627\u0626\u0645\u00BB \u0644\u0644\u0632\u0628\u0627\u0626\u0646 \u0627\u0644\u0645\u0639\u062A\u0627\u062F\u064A\u0646." }), _jsx(Paper, { sx: { p: 2, borderRadius: 3 }, children: _jsxs(Stack, { direction: { xs: 'column', sm: 'row' }, spacing: 1.5, alignItems: { sm: 'center' }, children: [_jsx(Box, { sx: { flex: 1, minWidth: 200 }, children: _jsx(CustomerPhoneField, { branchId: effectiveBranchId, value: q, onChange: setQ, label: "\u0628\u062D\u062B (\u0647\u0627\u062A\u0641 \u0623\u0648 \u0627\u0633\u0645)", placeholder: "\u0627\u0643\u062A\u0628 3 \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644...", onSelectCustomer: (c) => {
                                    setQ(c.phone);
                                    openDetail(c.id);
                                } }) }), _jsxs(ToggleButtonGroup, { size: "small", exclusive: true, value: filter, onChange: (_e, v) => { if (v)
                                setFilter(v); }, children: [_jsx(ToggleButton, { value: "all", children: "\u0627\u0644\u0643\u0644" }), _jsx(ToggleButton, { value: "regular", children: "\u0639\u0645\u0644\u0627\u0621 \u062F\u0627\u0626\u0645\u0648\u0646" })] })] }) }), isError ? _jsx(Alert, { severity: "error", children: String(error) }) : null, _jsx(Paper, { sx: { borderRadius: 3, overflow: 'hidden' }, children: isLoading ? (_jsx(Stack, { alignItems: "center", py: 4, children: _jsx(CircularProgress, {}) })) : (_jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u0627\u0644\u0647\u0627\u062A\u0641" }), _jsx(TableCell, { children: "\u0627\u0644\u0627\u0633\u0645" }), _jsx(TableCell, { children: "\u0627\u0644\u0639\u0646\u0648\u0627\u0646" }), _jsx(TableCell, { align: "center", children: "\u0637\u0644\u0628\u0627\u062A" }), _jsx(TableCell, { children: "\u0622\u062E\u0631 \u0632\u064A\u0627\u0631\u0629" }), _jsx(TableCell, { align: "center", children: "\u062F\u0627\u0626\u0645" })] }) }), _jsx(TableBody, { children: items.length === 0 ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 6, align: "center", sx: { py: 4, color: 'text.secondary' }, children: "\u0644\u0627 \u064A\u0648\u062C\u062F \u0639\u0645\u0644\u0627\u0621 \u0645\u0637\u0627\u0628\u0642\u0648\u0646 \u2014 \u0633\u064A\u064F\u0633\u062C\u0651\u0644\u0648\u0646 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0639\u0646\u062F \u0625\u063A\u0644\u0627\u0642 \u0637\u0644\u0628 \u0628\u0631\u0642\u0645 \u0647\u0627\u062A\u0641." }) })) : items.map((row) => (_jsxs(TableRow, { hover: true, sx: { cursor: 'pointer' }, onClick: () => openDetail(row.id), selected: row.id === selectedId, children: [_jsx(TableCell, { dir: "ltr", children: formatCustomerPhoneDisplay(row.phone) }), _jsx(TableCell, { children: row.name ?? '—' }), _jsx(TableCell, { sx: { maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: row.address ?? '—' }), _jsx(TableCell, { align: "center", children: row.orderCount }), _jsx(TableCell, { children: formatWhen(row.lastOrderAt) }), _jsx(TableCell, { align: "center", children: row.isRegular ? _jsx(Chip, { label: "\u062F\u0627\u0626\u0645", size: "small", color: "primary" }) : '—' })] }, row.id))) })] })) }), _jsx(Drawer, { anchor: "left", open: !!selectedId, onClose: () => setSelectedId(null), PaperProps: { sx: { width: { xs: '100%', sm: 420 }, p: 2.5 } }, children: detailLoading || !detail ? (_jsx(Stack, { alignItems: "center", py: 6, children: _jsx(CircularProgress, {}) })) : (_jsxs(Stack, { spacing: 2, children: [_jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", children: [_jsx(Typography, { variant: "h6", fontWeight: 800, children: "\u0645\u0644\u0641 \u0627\u0644\u0639\u0645\u064A\u0644" }), _jsx(IconButton, { onClick: () => setSelectedId(null), "aria-label": "\u0625\u063A\u0644\u0627\u0642", children: "\u2715" })] }), _jsxs(Paper, { variant: "outlined", sx: { p: 1.5, borderRadius: 2, bgcolor: 'rgba(185,56,23,0.04)' }, children: [_jsx(Typography, { dir: "ltr", fontWeight: 800, fontSize: "1.1rem", children: formatCustomerPhoneDisplay(detail.phone) }), _jsxs(Stack, { direction: "row", spacing: 2, mt: 1, flexWrap: "wrap", children: [_jsxs(Typography, { variant: "body2", children: [detail.orderCount, " \u0637\u0644\u0628"] }), _jsxs(Typography, { variant: "body2", children: ["\u0625\u062C\u0645\u0627\u0644\u064A ", formatCurrency(Number(detail.totalSpent))] }), _jsxs(Typography, { variant: "body2", children: ["\u0622\u062E\u0631 \u0632\u064A\u0627\u0631\u0629: ", formatWhen(detail.lastOrderAt)] })] })] }), _jsx(TextField, { label: "\u0627\u0644\u0627\u0633\u0645", fullWidth: true, size: "small", value: editName, onChange: (e) => setEditName(e.target.value) }), _jsx(TextField, { label: "\u0627\u0644\u0639\u0646\u0648\u0627\u0646", fullWidth: true, size: "small", multiline: true, minRows: 2, value: editAddress, onChange: (e) => setEditAddress(e.target.value) }), _jsx(TextField, { label: "\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u062F\u0627\u062E\u0644\u064A\u0629", fullWidth: true, size: "small", multiline: true, minRows: 2, value: editNotes, onChange: (e) => setEditNotes(e.target.value), placeholder: "\u062A\u0641\u0636\u064A\u0644\u0627\u062A\u060C \u0645\u0646\u0637\u0642\u0629\u060C \u062A\u0646\u0628\u064A\u0647\u0627\u062A..." }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: editRegular, onChange: (e) => setEditRegular(e.target.checked) }), label: "\u0639\u0645\u064A\u0644 \u062F\u0627\u0626\u0645 \u0639\u0646\u062F\u064A (\u064A\u0638\u0647\u0631 \u0645\u0645\u064A\u0632\u0627\u064B \u0641\u064A \u0646\u0642\u0637\u0629 \u0627\u0644\u0628\u064A\u0639)" }), message ? _jsx(Alert, { severity: message.includes('فشل') ? 'error' : 'success', children: message }) : null, _jsx(Button, { variant: "contained", disabled: saving, onClick: () => void saveCustomer(), children: saving ? 'جاري الحفظ…' : 'حفظ' }), _jsx(Typography, { variant: "subtitle2", fontWeight: 800, children: "\u0622\u062E\u0631 \u0627\u0644\u0637\u0644\u0628\u0627\u062A" }), detail.orders?.length ? (_jsx(Stack, { spacing: 0.75, children: detail.orders.map((o) => (_jsxs(Paper, { variant: "outlined", sx: { p: 1.25, borderRadius: 2 }, children: [_jsxs(Stack, { direction: "row", justifyContent: "space-between", children: [_jsxs(Typography, { fontWeight: 700, children: ["#", o.orderNumber] }), _jsx(Typography, { fontWeight: 700, children: formatCurrency(Number(o.totalAmount)) })] }), _jsxs(Typography, { variant: "caption", color: "text.secondary", children: [formatWhen(o.closedAt ?? o.openedAt), " \u00B7 ", o.orderType === 'TAKEAWAY' ? 'تيك أواي' : o.orderType === 'DINE_IN' ? 'صالة' : o.orderType] })] }, o.id))) })) : (_jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0637\u0644\u0628\u0627\u062A \u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0639\u062F." }))] })) })] }));
}
