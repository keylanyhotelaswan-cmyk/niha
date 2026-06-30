import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { formatItemNote } from '../../../lib/pos-order-sauces.js';
import type { CartItem, CollectionStatus, OrderType } from '../../../lib/pos-store.js';
import { cartLineKey, getCollectionStatusLabel, validateTakeawayOrderFields } from '../../../lib/pos-store.js';
import type { PaymentMethodOption } from '../constants.js';
import { collectionTone, formatCurrency } from '../utils.js';
import { useEffect, useMemo, useState } from 'react';

type OrderConfirmDialogProps = {
  open: boolean;
  orderCode: string;
  orderType: OrderType;
  orderOwnerName: string;
  customerPhone: string;
  customerAddress: string;
  captainName: string;
  cartItems: CartItem[];
  paymentMethod: string;
  paymentMethods: PaymentMethodOption[];
  collectionStatus: CollectionStatus;
  discount: number;
  subtotal: number;
  total: number;
  orderNote: string;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
};

export function OrderConfirmDialog(props: OrderConfirmDialogProps) {
  const tone = collectionTone(props.collectionStatus);
  const paymentLabel = props.paymentMethods.find((m) => m.id === props.paymentMethod)?.label ?? props.paymentMethod;
  const [confirmError, setConfirmError] = useState('');

  const takeawayValidation = useMemo(
    () => validateTakeawayOrderFields(props.orderType, props.orderOwnerName, props.customerPhone),
    [props.orderType, props.orderOwnerName, props.customerPhone],
  );

  const handleConfirm = () => {
    if (props.orderType === 'takeaway' && !takeawayValidation.ok) {
      setConfirmError(takeawayValidation.error);
      return;
    }
    setConfirmError('');
    props.onConfirm();
  };

  useEffect(() => {
    if (props.open) setConfirmError('');
    if (props.open) {
      void import('../../../lib/pos-receipt-render.js');
      void import('../../../lib/pos-print-bridge.js');
    }
  }, [props.open]);

  return (
    <Dialog open={props.open} onClose={props.busy ? undefined : props.onCancel} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800 }}>مراجعة الطلب قبل التأكيد</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 0.5 }}>
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            راجع التفاصيل ثم أكّد للإغلاق{props.orderType === 'takeaway' ? ' والطباعة' : ''}.
          </Alert>

          {props.orderType === 'takeaway' && !takeawayValidation.ok ? (
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
                بيانات التيك أواي ناقصة — لا يمكن التأكيد
              </Typography>
              <Typography variant="body2">
                مطلوب: {takeawayValidation.missingLabels.join(' · ')}. اضغط «رجوع» وأكمل الحقول المعلّمة.
              </Typography>
            </Alert>
          ) : null}

          {confirmError ? (
            <Alert severity="error" sx={{ borderRadius: 2 }} onClose={() => setConfirmError('')}>
              {confirmError}
            </Alert>
          ) : null}

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={props.orderCode ? `طلب ${props.orderCode}` : 'طلب جديد'} size="small" />
            <Chip label={props.orderType === 'takeaway' ? 'تيك أواي' : 'صالة'} size="small" color={props.orderType === 'takeaway' ? 'warning' : 'default'} />
            <Chip label={getCollectionStatusLabel(props.collectionStatus)} size="small" sx={{ bgcolor: tone.bg, color: tone.color, fontWeight: 700 }} />
          </Stack>

          {props.orderType === 'takeaway' ? (
            <>
              <Typography variant="body2" color={props.orderOwnerName.trim() ? 'text.primary' : 'error.main'}>
                <strong>العميل:</strong> {props.orderOwnerName.trim() || '— ناقص'}
              </Typography>
              <Typography variant="body2" color={props.customerPhone.trim() ? 'text.primary' : 'error.main'}>
                <strong>هاتف:</strong> {props.customerPhone.trim() || '— ناقص'}
              </Typography>
            </>
          ) : (
            <>
              {props.orderOwnerName.trim() ? (
                <Typography variant="body2"><strong>العميل:</strong> {props.orderOwnerName.trim()}</Typography>
              ) : null}
              {props.customerPhone.trim() ? (
                <Typography variant="body2"><strong>هاتف:</strong> {props.customerPhone.trim()}</Typography>
              ) : null}
            </>
          )}
          {props.customerAddress.trim() ? (
            <Typography variant="body2"><strong>عنوان:</strong> {props.customerAddress.trim()}</Typography>
          ) : null}
          {props.captainName.trim() ? (
            <Typography variant="body2"><strong>دليفري:</strong> {props.captainName.trim()}</Typography>
          ) : null}

          <Divider />

          <Stack spacing={0.75}>
            {props.cartItems.map((item) => {
              const itemNote = formatItemNote(item.note, item.sauces ?? []);
              return (
              <Stack key={cartLineKey(item)} direction="row" justifyContent="space-between" gap={1}>
                <Typography variant="body2">
                  {item.quantity}× {item.name}
                  {itemNote ? ` (${itemNote})` : ''}
                </Typography>
                <Typography variant="body2" fontWeight={700}>{formatCurrency(item.unitPrice * item.quantity)}</Typography>
              </Stack>
              );
            })}
          </Stack>

          <Divider />

          <Stack spacing={0.5}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2">قبل الخصم</Typography>
              <Typography fontWeight={700}>{formatCurrency(props.subtotal)}</Typography>
            </Stack>
            {props.discount > 0 ? (
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">خصم</Typography>
                <Typography fontWeight={700}>{formatCurrency(props.discount)}</Typography>
              </Stack>
            ) : null}
            <Stack direction="row" justifyContent="space-between">
              <Typography fontWeight={800}>الإجمالي</Typography>
              <Typography fontWeight={800} color="primary.main">{formatCurrency(props.total)}</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">الدفع: {paymentLabel}</Typography>
            {props.orderNote.trim() ? (
              <Typography variant="body2" color="text.secondary">ملاحظة الطلب: {props.orderNote.trim()}</Typography>
            ) : null}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
        <Button onClick={props.onCancel} disabled={Boolean(props.busy)}>رجوع</Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={Boolean(props.busy) || (props.orderType === 'takeaway' && !takeawayValidation.ok)}
          {...(props.busy ? { startIcon: <CircularProgress size={16} color="inherit" /> } : {})}
          sx={{ fontWeight: 800, px: 3 }}
        >
          {props.busy ? 'جاري الإغلاق…' : `تأكيد وإغلاق · ${formatCurrency(props.total)}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
