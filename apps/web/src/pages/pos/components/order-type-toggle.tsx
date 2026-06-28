import { Button, Stack } from '@mui/material';
import type { OrderType } from '../../../lib/pos-store.js';
import { ui } from '../../../lib/ui-tokens.js';

export function OrderTypeToggle({ value, onChange, disabled }: { value: OrderType; onChange: (t: OrderType) => void; disabled?: boolean }) {
  return (
    <Stack direction="row" spacing={0.5} sx={{ bgcolor: ui.surfaceMuted, borderRadius: 3, p: 0.5, opacity: disabled ? 0.65 : 1 }}>
      <Button
        size="small"
        fullWidth
        disabled={Boolean(disabled)}
        variant={value === 'eat-in' ? 'contained' : 'text'}
        onClick={() => onChange('eat-in')}
        sx={{ borderRadius: 2.5, fontWeight: 700 }}
      >
        صالة
      </Button>
      <Button
        size="small"
        fullWidth
        disabled={Boolean(disabled)}
        variant={value === 'takeaway' ? 'contained' : 'text'}
        onClick={() => onChange('takeaway')}
        sx={{ borderRadius: 2.5, fontWeight: 700 }}
      >
        تيك أواي
      </Button>
    </Stack>
  );
}
