import { Alert, Box, Button, Chip, Grid2, Pagination, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { isShiftOrderUncollected, type SavedOrder } from '../../../lib/pos-store.js';
import { OrderSummaryCard } from './order-summary-card.js';

export const ORDERS_PAGE_SIZE = 10;

type ShiftOrdersSectionProps = {
  shiftOpen: boolean;
  orders: SavedOrder[];
  uncollected: SavedOrder[];
  collected: SavedOrder[];
  loading: boolean;
  error: boolean;
  tab: 'uncollected' | 'collected';
  onTabChange: (tab: 'uncollected' | 'collected') => void;
  onCollect: (order: SavedOrder) => void;
  onRetry: () => void;
  onReprint?: (order: SavedOrder, copies: import('../../../lib/pos-receipt.js').PrintCopies) => void;
  onViewAudit?: (order: SavedOrder) => void;
  onViewSummary?: (order: SavedOrder) => void;
  onEdit?: (order: SavedOrder) => void;
  onUncollect?: (order: SavedOrder) => Promise<void>;
  onCancel?: (order: SavedOrder, reason: string) => Promise<void>;
  onRequestCancel?: (order: SavedOrder, reason: string) => Promise<void>;
  onWithdrawCancel?: (order: SavedOrder) => Promise<void>;
  showReprint?: boolean;
  pendingOrderId?: string | null;
  hasMoreCollected?: boolean;
  collectedLoadingMore?: boolean;
  onLoadMoreCollected?: () => void;
};

function buildCardProps(
  order: SavedOrder,
  props: ShiftOrdersSectionProps,
) {
  const common = {
    order,
    variant: 'closed' as const,
    ...(props.showReprint && props.onReprint ? { showReprint: true, onReprint: (copies: import('../../../lib/pos-receipt.js').PrintCopies) => props.onReprint!(order, copies) } : {}),
    ...(props.onViewAudit ? { onViewAudit: () => props.onViewAudit!(order) } : {}),
    ...(props.onViewSummary ? { onViewSummary: () => props.onViewSummary!(order) } : {}),
    ...(props.onEdit ? { onEdit: () => props.onEdit!(order) } : {}),
    ...(props.onUncollect && props.onCancel && props.onRequestCancel && props.onWithdrawCancel
      ? { onUncollect: props.onUncollect, onCancel: props.onCancel, onRequestCancel: props.onRequestCancel, onWithdrawCancel: props.onWithdrawCancel }
      : {}),
  };

  if (isShiftOrderUncollected(order)) {
    return {
      ...common,
      actionLabel: 'تحصيل الآن',
      actionBusy: props.pendingOrderId === order.id,
      onAction: () => props.onCollect(order),
    };
  }
  return common;
}

export function ShiftOrdersSection(props: ShiftOrdersSectionProps) {
  const [page, setPage] = useState(1);
  const visible = props.tab === 'uncollected' ? props.uncollected : props.collected;
  const totalCount = props.orders.length;

  useEffect(() => {
    setPage(1);
  }, [props.tab]);

  const loadedPages = Math.max(1, Math.ceil(visible.length / ORDERS_PAGE_SIZE));
  const showMorePagesHint = props.tab === 'collected' && props.hasMoreCollected;
  const totalPages = showMorePagesHint ? loadedPages + 1 : loadedPages;

  useEffect(() => {
    if (page > loadedPages && page < totalPages && props.tab === 'collected') {
      if (props.hasMoreCollected && !props.collectedLoadingMore) {
        props.onLoadMoreCollected?.();
      }
    }
  }, [page, loadedPages, totalPages, props.tab, props.hasMoreCollected, props.collectedLoadingMore, props.onLoadMoreCollected]);

  useEffect(() => {
    if (page > loadedPages && !props.hasMoreCollected) {
      setPage(loadedPages);
    }
  }, [page, loadedPages, props.hasMoreCollected]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * ORDERS_PAGE_SIZE;
    return visible.slice(start, start + ORDERS_PAGE_SIZE);
  }, [visible, page]);

  const rangeLabel = visible.length
    ? `${(page - 1) * ORDERS_PAGE_SIZE + 1}–${Math.min(page * ORDERS_PAGE_SIZE, visible.length)} من ${visible.length}${showMorePagesHint ? '+' : ''}`
    : '';

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h6" fontWeight={800}>طلبات الوردية (مغلقة)</Typography>
        <Chip label={`${totalCount} طلب`} size="small" variant="outlined" />
      </Stack>
      <Tabs
        value={props.tab}
        onChange={(_, v) => props.onTabChange(v)}
        sx={{ mb: 1.5, minHeight: 40, '& .MuiTab-root': { minHeight: 40, fontWeight: 700 } }}
      >
        <Tab value="uncollected" label={`غير محصل (${props.uncollected.length})`} />
        <Tab value="collected" label={`محصل (${props.collected.length}${props.hasMoreCollected ? '+' : ''})`} />
      </Tabs>

      {!props.shiftOpen && totalCount === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 3 }}>افتح وردية لعرض طلباتها هنا.</Alert>
      ) : props.loading && totalCount === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 3 }}>جاري تحميل طلبات الوردية...</Alert>
      ) : props.error && totalCount === 0 ? (
        <Alert severity="warning" sx={{ borderRadius: 3 }} action={
          <Button size="small" onClick={props.onRetry}>إعادة المحاولة</Button>
        }>
          تعذّر تحميل الطلبات — تأكد أن السيرفر يعمل ثم أعد المحاولة.
        </Alert>
      ) : visible.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 3 }}>
          {props.tab === 'uncollected' ? 'لا توجد طلبات غير محصلة في هذه الوردية.' : 'لا توجد طلبات محصلة في هذه الوردية.'}
        </Alert>
      ) : (
        <>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              {rangeLabel}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {ORDERS_PAGE_SIZE} كروت في الصفحة
            </Typography>
          </Stack>

          <Grid2 container spacing={1.5}>
            {pageItems.map((order) => (
              <Grid2 key={order.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                <OrderSummaryCard {...buildCardProps(order, props)} />
              </Grid2>
            ))}
          </Grid2>

          {props.collectedLoadingMore && page > loadedPages ? (
            <Alert severity="info" sx={{ mt: 1.5, borderRadius: 2 }}>جاري تحميل الصفحة…</Alert>
          ) : null}

          {totalPages > 1 ? (
            <Stack alignItems="center" sx={{ mt: 2 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
                shape="rounded"
                siblingCount={1}
                boundaryCount={1}
                disabled={Boolean(props.collectedLoadingMore && page > loadedPages)}
              />
            </Stack>
          ) : null}
        </>
      )}
    </Box>
  );
}
