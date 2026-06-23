import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography, } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { apiGetProductionPlan, apiSaveProductionPlan } from '../../../lib/api.js';
import { formatDateLabelAr, localTodayKey } from '../../../lib/date-utils.js';
export function ProductionPlanDialog({ open, branchId, accessToken, onClose, onSaved }) {
    const [rows, setRows] = useState([]);
    const [dateKey, setDateKey] = useState(localTodayKey());
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        if (!open || !branchId || !accessToken)
            return;
        const today = localTodayKey();
        setDateKey(today);
        setLoading(true);
        setError('');
        void apiGetProductionPlan(branchId, today, accessToken).then((res) => {
            if (!res.ok) {
                setError(res.body ?? res.error ?? 'فشل التحميل');
                setRows([]);
                setLoading(false);
                return;
            }
            const data = res.data;
            setDateKey(data.dateKey);
            setRows(data.items.map((item) => ({
                productId: item.productId,
                name: item.name,
                categoryName: item.categoryName,
                soldQuantity: item.soldQuantity,
                plannedQuantity: item.plannedQuantity,
                draft: item.plannedQuantity != null ? String(item.plannedQuantity) : '',
            })));
            setLoading(false);
        });
    }, [open, branchId, accessToken]);
    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q)
            return rows;
        return rows.filter((r) => r.name.toLowerCase().includes(q) || r.categoryName.toLowerCase().includes(q));
    }, [rows, search]);
    const plannedCount = rows.filter((r) => r.draft.trim() !== '').length;
    const save = async () => {
        if (!accessToken)
            return;
        setSaving(true);
        setError('');
        const items = rows
            .filter((r) => r.draft.trim() !== '' || r.plannedQuantity != null)
            .map((r) => ({
            productId: r.productId,
            plannedQuantity: r.draft.trim() === '' ? null : Number(r.draft) || 0,
        }));
        const res = await apiSaveProductionPlan({ branchId, dateKey, items }, accessToken);
        setSaving(false);
        if (!res.ok) {
            setError(res.body ?? res.error ?? 'فشل الحفظ');
            return;
        }
        onSaved?.();
        onClose();
    };
    return (_jsxs(Dialog, { open: open, onClose: saving ? undefined : onClose, fullWidth: true, maxWidth: "md", children: [_jsx(DialogTitle, { children: "\u062E\u0637\u0629 \u0627\u0644\u0625\u0646\u062A\u0627\u062C \u0627\u0644\u064A\u0648\u0645\u064A\u0629 (\u0627\u062E\u062A\u064A\u0627\u0631\u064A)" }), _jsx(DialogContent, { children: _jsxs(Stack, { spacing: 2, sx: { pt: 1 }, children: [_jsx(Alert, { severity: "info", sx: { borderRadius: 2 }, children: "\u062D\u062F\u0651\u062F \u0643\u0645 \u0642\u0637\u0639\u0629 \u062A\u062E\u0637\u0637 \u062A\u0639\u0645\u0644\u0647\u0627 \u0627\u0644\u064A\u0648\u0645 \u0644\u0643\u0644 \u0635\u0646\u0641. \u0627\u062A\u0631\u0643 \u0627\u0644\u062D\u0642\u0644 \u0641\u0627\u0631\u063A\u0627\u064B \u0644\u0644\u0623\u0635\u0646\u0627\u0641 \u0628\u062F\u0648\u0646 \u062E\u0637\u0629. \u00AB\u0645\u0628\u0627\u0639\u00BB = \u0645\u0646 \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u064A\u0648\u0645 \u0627\u0644\u0645\u063A\u0644\u0642\u0629." }), _jsxs(Typography, { variant: "body2", color: "text.secondary", children: [formatDateLabelAr(dateKey), " \u00B7 ", plannedCount, " \u0635\u0646\u0641 \u0628\u062E\u0637\u0629"] }), _jsx(TextField, { size: "small", placeholder: "\u0628\u062D\u062B \u0639\u0646 \u0635\u0646\u0641...", value: search, onChange: (e) => setSearch(e.target.value) }), error ? _jsx(Alert, { severity: "error", children: error }) : null, loading ? (_jsx(Stack, { alignItems: "center", py: 4, children: _jsx(CircularProgress, { size: 28 }) })) : (_jsx(Box, { sx: { maxHeight: '55vh', overflowY: 'auto' }, children: _jsx(Stack, { spacing: 1, children: visible.map((row) => {
                                    const planned = row.draft.trim() === '' ? null : Number(row.draft) || 0;
                                    const over = planned != null && planned > 0 && row.soldQuantity >= planned;
                                    return (_jsxs(Stack, { direction: { xs: 'column', sm: 'row' }, spacing: 1, alignItems: { sm: 'center' }, sx: {
                                            p: 1.25,
                                            borderRadius: 2.5,
                                            border: '1px solid rgba(117,89,77,0.12)',
                                            bgcolor: over ? 'rgba(239,68,68,0.06)' : 'rgba(255,250,244,0.95)',
                                        }, children: [_jsxs(Box, { sx: { flex: 1, minWidth: 0 }, children: [_jsx(Typography, { fontWeight: 700, noWrap: true, children: row.name }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: row.categoryName })] }), _jsx(Chip, { size: "small", label: `مباع ${row.soldQuantity}`, color: over ? 'error' : 'default', variant: "outlined" }), _jsx(TextField, { size: "small", type: "number", label: "\u0627\u0644\u0645\u062E\u0637\u0637", placeholder: "\u2014", value: row.draft, onChange: (e) => {
                                                    const v = e.target.value;
                                                    setRows((cur) => cur.map((r) => r.productId === row.productId ? { ...r, draft: v } : r));
                                                }, sx: { width: 110 }, inputProps: { min: 0 } })] }, row.productId));
                                }) }) }))] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: onClose, disabled: saving, children: "\u0625\u0644\u063A\u0627\u0621" }), _jsx(Button, { variant: "contained", disabled: saving || loading, onClick: () => void save(), children: saving ? 'جاري الحفظ…' : 'حفظ الخطة' })] })] }));
}
