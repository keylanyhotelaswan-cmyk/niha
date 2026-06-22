import { Button, Menu, MenuItem } from '@mui/material';
import { useState } from 'react';
import type { PrintCopies } from '../../../lib/pos-receipt.js';

type ReprintMenuButtonProps = {
  disabled?: boolean;
  onReprint: (copies: PrintCopies) => void;
};

const OPTIONS: { copies: PrintCopies; label: string }[] = [
  { copies: 'kitchen', label: 'مطبخ فقط' },
  { copies: 'customer', label: 'صالة (زبون) فقط' },
  { copies: 'both', label: 'الاثنين معاً' },
];

export function ReprintMenuButton({ disabled, onReprint }: ReprintMenuButtonProps) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  return (
    <>
      <Button
        size="small"
        variant="text"
        disabled={Boolean(disabled)}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ borderRadius: 2.5, fontWeight: 700 }}
      >
        إعادة طباعة
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {OPTIONS.map((opt) => (
          <MenuItem
            key={opt.copies}
            onClick={() => {
              setAnchor(null);
              onReprint(opt.copies);
            }}
          >
            {opt.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
