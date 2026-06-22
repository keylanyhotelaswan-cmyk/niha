import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import type { SavedOrder } from '../../../lib/pos-store.js';
import { getCollectionStatusLabel } from '../../../lib/pos-store.js';
import { formatItemNote } from '../../../lib/pos-order-sauces.js';
import { collectionTone, formatCurrency } from '../utils.js';

type OrderSummaryDialogProps = {
  open: boolean;
  order: SavedOrder | null;
  paymentMethodLabel?: string;
  onClose: () => void;
};

export function OrderSummaryDialog({ open, order, paymentMethodLabel, onClose }: OrderSummaryDialogProps) {
  if (!order) return null;

  const cancelPending = Boolean(order.cancelRequestedAt);
  const tone = collectionTone(order.collectionStatus, cancelPending);
  const subtotal = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discount = Number(order.discountAmount) || 0;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800 }}>ملخص الفاتورة · طلب {order.code}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 0.5 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`طلب ${order.code}`} size="small" />
            <Chip
              label={order.orderType === 'takeaway' ? 'تيك أواي' : 'صالة'}
              size="small"
              color={order.orderType === 'takeaway' ? 'warning' : 'default'}
            />
            <Chip
              label={getCollectionStatusLabel(order.collectionStatus, cancelPending)}
              size="small"
              sx={{ bgcolor: tone.bg, color: tone.color, fontWeight: 700 }}
            />
          </Stack>

          {order.ownerName.trim() ? (
            <Typography variant="body2"><strong>العميل:</strong> {order.ownerName.trim()}</Typography>
          ) : null}
          {order.customerPhone?.trim() ? (
            <Typography variant="body2"><strong>هاتف:</strong> {order.customerPhone.trim()}</Typography>
          ) : null}
          {order.customerAddress?.trim() ? (
            <Typography variant="body2"><strong>عنوان:</strong> {order.customerAddress.trim()}</Typography>
          ) : null}
          {order.captainName?.trim() ? (
            <Typography variant="body2"><strong>دليفري:</strong> {order.captainName.trim()}</Typography>
          ) : null}

          <Divider />

          <Stack spacing={0.75}>
            {order.items.map((item) => {
              const itemNote = formatItemNote(item.note, item.sauces ?? []);
              return (
              <Stack key={item.productId} direction="row" justifyContent="space-between" gap={1}>
                <Typography variant="body2">
                  {item.quantity}× {item.name}
                  {itemNote ? ` (${itemNote})` : ''}
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {formatCurrency(item.unitPrice * item.quantity)}
                </Typography>
              </Stack>
              );
            })}
          </Stack>

          <Divider />

          <Stack spacing={0.5}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2">قبل الخصم</Typography>
              <Typography fontWeight={700}>{formatCurrency(subtotal)}</Typography>
            </Stack>
            {discount > 0 ? (
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">خصم</Typography>
                <Typography fontWeight={700}>{formatCurrency(discount)}</Typography>
              </Stack>
            ) : null}
            <Stack direction="row" justifyContent="space-between">
              <Typography fontWeight={800}>الإجمالي</Typography>
              <Typography fontWeight={800} color="primary.main">{formatCurrency(order.total)}</Typography>
            </Stack>
            {paymentMethodLabel ? (
              <Typography variant="body2" color="text.secondary">الدفع: {paymentMethodLabel}</Typography>
            ) : null}
            {order.orderNote.trim() ? (
              <Typography variant="body2" color="text.secondary">ملاحظة: {order.orderNote.trim()}</Typography>
            ) : null}
            {order.createdAt ? (
              <Typography variant="caption" color="text.secondary">التاريخ: {order.createdAt}</Typography>
            ) : null}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2 }}>
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
}
