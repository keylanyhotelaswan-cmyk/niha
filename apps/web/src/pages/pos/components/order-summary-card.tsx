import { Box, Button, Card, CardContent, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { memo } from 'react';
import { getCollectionStatusLabel, type SavedOrder } from '../../../lib/pos-store.js';
import { collectionTone, formatCurrency } from '../utils.js';
import { ReprintMenuButton } from './reprint-menu-button.js';
import { OrderStatusActions } from './order-status-actions.js';
import type { PrintCopies } from '../../../lib/pos-receipt.js';
import { cardSx, ui } from '../../../lib/ui-tokens.js';

type OrderSummaryCardProps = {
  order: SavedOrder;
  variant: 'suspended' | 'closed';
  onAction?: () => void;
  actionLabel?: string;
  onReprint?: (copies: PrintCopies) => void;
  onViewAudit?: () => void;
  onViewSummary?: () => void;
  onEdit?: () => void;
  showReprint?: boolean;
  onUncollect?: (order: SavedOrder) => Promise<void>;
  onCancel?: (order: SavedOrder, reason: string) => Promise<void>;
  onRequestCancel?: (order: SavedOrder, reason: string) => Promise<void>;
  onWithdrawCancel?: (order: SavedOrder) => Promise<void>;
  actionBusy?: boolean;
};

export const OrderSummaryCard = memo(function OrderSummaryCard({ order, variant, onAction, actionLabel, onReprint, onViewAudit, onViewSummary, onEdit, showReprint, onUncollect, onCancel, onRequestCancel, onWithdrawCancel, actionBusy }: OrderSummaryCardProps) {
  const cancelPending = Boolean(order.cancelRequestedAt);
  const tone = collectionTone(order.collectionStatus, cancelPending);
  const accent = variant === 'suspended' ? ui.warn : ui.navy;

  return (
    <Card
      elevation={0}
      sx={{
        ...cardSx,
        borderLeft: `3px solid ${accent}`,
        transition: 'border-color 0.15s ease',
        '&:hover': { borderColor: ui.borderStrong },
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Stack spacing={1.25}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
            <Box>
              <Typography variant="caption" sx={{ color: accent, fontWeight: 800 }}>
                {variant === 'suspended' ? 'معلّق (سلة)' : 'مغلق'}
              </Typography>
              <Typography fontWeight={800} fontSize="1.05rem">طلب رقم {order.code}</Typography>
              {order.createdByName || order.orderAt ? (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                  {order.createdByName ? `أنشأ: ${order.createdByName}` : null}
                  {order.createdByName && order.orderAt ? ' · ' : null}
                  {order.orderAt ? order.orderAt : null}
                </Typography>
              ) : null}
              <Typography variant="body2" color="text.secondary">
                {order.ownerName || 'بدون اسم'} · {order.orderType === 'eat-in' ? 'صالة' : 'تيك أواي'}
              </Typography>
              {order.orderType === 'takeaway' ? (
                <Chip size="small" label="تيك أواي" variant="outlined" sx={{ mt: 0.5 }} />
              ) : null}
              {order.customerPhone ? (
                <Typography variant="caption" color="text.secondary" display="block">هاتف: {order.customerPhone}</Typography>
              ) : null}
              {order.customerAddress ? (
                <Typography variant="caption" color="text.secondary" display="block">عنوان: {order.customerAddress}</Typography>
              ) : null}
              {order.captainName ? (
                <Typography variant="caption" color="text.secondary" display="block">كابتن: {order.captainName}</Typography>
              ) : null}
            </Box>
            <Typography fontWeight={800} color="primary.main">{formatCurrency(order.total)}</Typography>
          </Stack>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={`${order.itemsCount} صنف`} variant="outlined" />
            <Chip size="small" label={getCollectionStatusLabel(order.collectionStatus, cancelPending)} sx={{ bgcolor: tone.bg, color: tone.color, fontWeight: 700 }} />
          </Stack>
          {cancelPending && order.cancellationReason ? (
            <Typography variant="caption" color="error.main">سبب الإلغاء: {order.cancellationReason}</Typography>
          ) : null}
          {onAction && actionLabel ? (
            <Button
              size="small"
              variant="outlined"
              fullWidth
              disabled={Boolean(actionBusy)}
              {...(actionBusy ? { startIcon: <CircularProgress size={14} /> } : {})}
              onClick={onAction}
              sx={{ borderRadius: 2.5, fontWeight: 700 }}
            >
              {actionBusy ? 'جاري التحصيل…' : actionLabel}
            </Button>
          ) : null}
          {variant === 'closed' ? (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap alignItems="center">
              {onUncollect && onCancel && onRequestCancel && onWithdrawCancel ? (
                <OrderStatusActions
                  order={order}
                  onUncollect={onUncollect}
                  onCancel={onCancel}
                  onRequestCancel={onRequestCancel}
                  onWithdrawCancel={onWithdrawCancel}
                />
              ) : null}
              {onViewSummary ? (
                <Button size="small" variant="outlined" onClick={onViewSummary} sx={{ fontWeight: 700, borderRadius: 2.5 }}>
                  عرض الملخص
                </Button>
              ) : null}
              {onEdit ? (
                <Button size="small" variant="outlined" onClick={onEdit} sx={{ fontWeight: 700, borderRadius: 2.5 }}>
                  تعديل الفاتورة
                </Button>
              ) : null}
              {showReprint && onReprint ? (
                <ReprintMenuButton onReprint={onReprint} />
              ) : null}
              {onViewAudit ? (
                <Button size="small" variant="text" onClick={onViewAudit} sx={{ fontWeight: 700 }}>
                  سجل النشاط
                </Button>
              ) : null}
            </Stack>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
});
