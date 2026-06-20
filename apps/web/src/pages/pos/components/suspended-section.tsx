import { Alert, Box, Chip, Grid2, Stack, Typography } from '@mui/material';
import type { SavedOrder } from '../../../lib/pos-store.js';
import { OrderSummaryCard } from './order-summary-card.js';

type SuspendedSectionProps = {
  orders: SavedOrder[];
  loading: boolean;
  onResume: (order: SavedOrder) => void;
};

export function SuspendedSection({ orders, loading, onResume }: SuspendedSectionProps) {
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="h6" fontWeight={800}>طلبات معلّقة (سلة)</Typography>
        {orders.length > 0 ? <Chip label={`${orders.length} طلب`} color="warning" size="small" /> : null}
      </Stack>
      {loading && orders.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 3 }}>جاري تحميل الطلبات المعلّقة...</Alert>
      ) : orders.length === 0 ? (
        <Alert severity="success" sx={{ borderRadius: 3 }}>لا توجد طلبات معلّقة — ابدأ طلب جديد.</Alert>
      ) : (
        <Grid2 container spacing={1.5}>
          {orders.map((order) => (
            <Grid2 key={order.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <OrderSummaryCard
                order={order}
                variant="suspended"
                actionLabel="استرجاع ومتابعة"
                onAction={() => onResume(order)}
              />
            </Grid2>
          ))}
        </Grid2>
      )}
    </Box>
  );
}
