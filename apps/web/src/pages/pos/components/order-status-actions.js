import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Menu, MenuItem, Stack, TextField, Typography, } from '@mui/material';
import { useState } from 'react';
export function OrderStatusActions({ order, onUncollect, onCancel, onRequestCancel, onWithdrawCancel, }) {
    const [anchor, setAnchor] = useState(null);
    const [dialogMode, setDialogMode] = useState(null);
    const [reason, setReason] = useState('');
    const cancelPending = Boolean(order.cancelRequestedAt);
    const canUncollect = order.collectionStatus === 'pending_approval' && !cancelPending;
    const canCancelNow = !cancelPending &&
        (order.collectionStatus === 'uncollected' || order.collectionStatus === 'pending_approval');
    const canRequestCancel = order.collectionStatus === 'approved' && !cancelPending;
    const hasActions = canUncollect || canCancelNow || canRequestCancel || cancelPending;
    if (!hasActions)
        return null;
    const closeDialog = () => {
        setDialogMode(null);
        setReason('');
    };
    const confirmDialog = () => {
        const trimmed = reason.trim();
        const mode = dialogMode;
        closeDialog();
        setAnchor(null);
        if (mode === 'request-cancel')
            void onRequestCancel(order, trimmed);
        else if (mode === 'cancel')
            void onCancel(order, trimmed);
    };
    return (_jsxs(_Fragment, { children: [_jsx(Button, { size: "small", variant: "text", onClick: (e) => setAnchor(e.currentTarget), sx: { fontWeight: 700, borderRadius: 2.5 }, children: "\u062D\u0627\u0644\u0629 \u0627\u0644\u0637\u0644\u0628" }), _jsxs(Menu, { anchorEl: anchor, open: Boolean(anchor), onClose: () => setAnchor(null), children: [canUncollect ? (_jsx(MenuItem, { onClick: () => { setAnchor(null); void onUncollect(order); }, children: "\u062A\u0631\u0627\u062C\u0639 \u2014 \u063A\u064A\u0631 \u0645\u062F\u0641\u0648\u0639" })) : null, canCancelNow ? (_jsx(MenuItem, { onClick: () => { setAnchor(null); setDialogMode('cancel'); setReason(''); }, children: "\u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629" })) : null, canRequestCancel ? (_jsx(MenuItem, { onClick: () => { setAnchor(null); setDialogMode('request-cancel'); setReason(''); }, children: "\u0637\u0644\u0628 \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629" })) : null, cancelPending ? (_jsx(MenuItem, { onClick: () => { setAnchor(null); void onWithdrawCancel(order); }, children: "\u0633\u062D\u0628 \u0637\u0644\u0628 \u0627\u0644\u0625\u0644\u063A\u0627\u0621" })) : null] }), _jsxs(Dialog, { open: dialogMode !== null, onClose: closeDialog, fullWidth: true, maxWidth: "xs", children: [_jsx(DialogTitle, { sx: { fontWeight: 800 }, children: dialogMode === 'request-cancel' ? 'طلب إلغاء الفاتورة' : 'إلغاء الفاتورة' }), _jsx(DialogContent, { children: _jsxs(Stack, { spacing: 1.5, sx: { pt: 0.5 }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: dialogMode === 'request-cancel'
                                        ? 'سيُرسل الطلب للمدير. إذا لم يُعتمد يُحذف الطلب ويبقى كما هو.'
                                        : 'سيتم إلغاء الفاتورة وإرجاع المخزون.' }), _jsx(TextField, { fullWidth: true, size: "small", label: "\u0627\u0644\u0633\u0628\u0628 (\u0627\u062E\u062A\u064A\u0627\u0631\u064A)", value: reason, onChange: (e) => setReason(e.target.value), multiline: true, minRows: 2 })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: closeDialog, children: "\u0631\u062C\u0648\u0639" }), _jsx(Button, { variant: "contained", color: "error", onClick: confirmDialog, children: "\u062A\u0623\u0643\u064A\u062F" })] })] })] }));
}
