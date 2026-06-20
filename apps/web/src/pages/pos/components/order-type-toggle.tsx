import { Button, Stack } from '@mui/material';
import type { OrderType } from '../../../lib/pos-store.js';

export function OrderTypeToggle({ value, onChange }: { value: OrderType; onChange: (t: OrderType) => void }) {
  return (
    <Stack direction="row" spacing={0.5} sx={{ bgcolor: 'rgba(47,31,24,0.06)', borderRadius: 3, p: 0.5 }}>
      <Button
        size="small"
        fullWidth
        variant={value === 'eat-in' ? 'contained' : 'text'}
        onClick={() => onChange('eat-in')}
        sx={{ borderRadius: 2.5, fontWeight: 700 }}
      >
        صالة
      </Button>
      <Button
        size="small"
        fullWidth
        variant={value === 'takeaway' ? 'contained' : 'text'}
        onClick={() => onChange('takeaway')}
        sx={{ borderRadius: 2.5, fontWeight: 700 }}
      >
        تيك أواي
      </Button>
    </Stack>
  );
}
