import { Alert, Box, Button, Chip, Grid2, Stack, Tab, Tabs, Typography } from '@mui/material';
import { isShiftOrderUncollected, type SavedOrder } from '../../../lib/pos-store.js';
import { OrderSummaryCard } from './order-summary-card.js';

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
};

export function ShiftOrdersSection({
  shiftOpen,
  orders,
  uncollected,
  collected,
  loading,
  error,
  tab,
  onTabChange,
  onCollect,
  onRetry,
}: ShiftOrdersSectionProps) {
  const visible = tab === 'uncollected' ? uncollected : collected;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h6" fontWeight={800}>طلبات الوردية (مغلقة)</Typography>
        <Chip label={`${orders.length} طلب`} size="small" variant="outlined" />
      </Stack>
      <Tabs
        value={tab}
        onChange={(_, v) => onTabChange(v)}
        sx={{ mb: 1.5, minHeight: 40, '& .MuiTab-root': { minHeight: 40, fontWeight: 700 } }}
      >
        <Tab value="uncollected" label={`غير محصل (${uncollected.length})`} />
        <Tab value="collected" label={`محصل (${collected.length})`} />
      </Tabs>

      {!shiftOpen && orders.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 3 }}>افتح وردية لعرض طلباتها هنا.</Alert>
      ) : loading && orders.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 3 }}>جاري تحميل طلبات الوردية...</Alert>
      ) : error && orders.length === 0 ? (
        <Alert severity="warning" sx={{ borderRadius: 3 }} action={
          <Button size="small" onClick={onRetry}>إعادة المحاولة</Button>
        }>
          تعذّر تحميل الطلبات — تأكد أن السيرفر يعمل ثم أعد المحاولة.
        </Alert>
      ) : visible.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 3 }}>
          {tab === 'uncollected' ? 'لا توجد طلبات غير محصلة في هذه الوردية.' : 'لا توجد طلبات محصلة في هذه الوردية.'}
        </Alert>
      ) : (
        <Grid2 container spacing={1.5}>
          {visible.map((order) => (
            <Grid2 key={order.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              {isShiftOrderUncollected(order) ? (
                <OrderSummaryCard
                  order={order}
                  variant="closed"
                  actionLabel="تحصيل الآن"
                  onAction={() => onCollect(order)}
                />
              ) : (
                <OrderSummaryCard order={order} variant="closed" />
              )}
            </Grid2>
          ))}
        </Grid2>
      )}
    </Box>
  );
}
