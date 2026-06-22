import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import type { SavedOrder } from '../../../lib/pos-store.js';

type OrderStatusActionsProps = {
  order: SavedOrder;
  onUncollect: (order: SavedOrder) => Promise<void>;
  onCancel: (order: SavedOrder, reason: string) => Promise<void>;
  onRequestCancel: (order: SavedOrder, reason: string) => Promise<void>;
  onWithdrawCancel: (order: SavedOrder) => Promise<void>;
};

type DialogMode = 'cancel' | 'request-cancel' | null;

export function OrderStatusActions({
  order,
  onUncollect,
  onCancel,
  onRequestCancel,
  onWithdrawCancel,
}: OrderStatusActionsProps) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [reason, setReason] = useState('');

  const cancelPending = Boolean(order.cancelRequestedAt);
  const canUncollect = order.collectionStatus === 'pending_approval' && !cancelPending;
  const canCancelNow =
    !cancelPending &&
    (order.collectionStatus === 'uncollected' || order.collectionStatus === 'pending_approval');
  const canRequestCancel = order.collectionStatus === 'approved' && !cancelPending;

  const hasActions = canUncollect || canCancelNow || canRequestCancel || cancelPending;
  if (!hasActions) return null;

  const closeDialog = () => {
    setDialogMode(null);
    setReason('');
  };

  const confirmDialog = () => {
    const trimmed = reason.trim();
    const mode = dialogMode;
    closeDialog();
    setAnchor(null);
    if (mode === 'request-cancel') void onRequestCancel(order, trimmed);
    else if (mode === 'cancel') void onCancel(order, trimmed);
  };

  return (
    <>
      <Button
        size="small"
        variant="text"
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ fontWeight: 700, borderRadius: 2.5 }}
      >
        حالة الطلب
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {canUncollect ? (
          <MenuItem onClick={() => { setAnchor(null); void onUncollect(order); }}>
            تراجع — غير مدفوع
          </MenuItem>
        ) : null}
        {canCancelNow ? (
          <MenuItem onClick={() => { setAnchor(null); setDialogMode('cancel'); setReason(''); }}>
            إلغاء الفاتورة
          </MenuItem>
        ) : null}
        {canRequestCancel ? (
          <MenuItem onClick={() => { setAnchor(null); setDialogMode('request-cancel'); setReason(''); }}>
            طلب إلغاء الفاتورة
          </MenuItem>
        ) : null}
        {cancelPending ? (
          <MenuItem onClick={() => { setAnchor(null); void onWithdrawCancel(order); }}>
            سحب طلب الإلغاء
          </MenuItem>
        ) : null}
      </Menu>

      <Dialog open={dialogMode !== null} onClose={closeDialog} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>
          {dialogMode === 'request-cancel' ? 'طلب إلغاء الفاتورة' : 'إلغاء الفاتورة'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              {dialogMode === 'request-cancel'
                ? 'سيُرسل الطلب للمدير. إذا لم يُعتمد يُحذف الطلب ويبقى كما هو.'
                : 'سيتم إلغاء الفاتورة وإرجاع المخزون.'}
            </Typography>
            <TextField
              fullWidth
              size="small"
              label="السبب (اختياري)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>رجوع</Button>
          <Button variant="contained" color="error" onClick={confirmDialog}>
            تأكيد
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
