import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { ui } from '../lib/ui-tokens.js';

export function PageToolbar({
  title,
  subtitle,
  meta,
  actions,
}: {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Box sx={{ mb: 0.5 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { md: 'center' },
          gap: 2,
        }}
      >
        <Box>
          <Typography component="h1" variant="h5" sx={{ m: 0, fontWeight: 700, color: ui.ink, letterSpacing: '-0.02em' }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" sx={{ mt: 0.5, color: ui.muted, lineHeight: 1.5 }}>
              {subtitle}
            </Typography>
          ) : null}
          {meta}
        </Box>
        {actions ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            {actions}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
