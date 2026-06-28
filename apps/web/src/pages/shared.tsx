import { Box, Card, CardContent, Grid2, Paper, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { cardSx, metricToneSx, ui, type MetricTone } from '../lib/ui-tokens.js';

export function SectionCard({
  title,
  description,
  action,
  children,
  compact,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <Paper elevation={0} sx={{ ...cardSx, p: compact ? 2 : 2.25 }}>
      <Stack spacing={compact ? 1.5 : 2}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
          <Box>
            <Typography variant="h6">{title}</Typography>
            {description ? (
              <Typography variant="body2" sx={{ mt: 0.25 }}>
                {description}
              </Typography>
            ) : null}
          </Box>
          {action}
        </Stack>
        {children}
      </Stack>
    </Paper>
  );
}

export function MetricCard({
  label,
  value,
  note,
  tone = 'default',
}: {
  label: string;
  value: string;
  note?: string;
  progress?: number;
  tone?: MetricTone | string;
}) {
  const isHexTone = typeof tone === 'string' && tone.startsWith('#');
  const toneStyle = isHexTone ? null : metricToneSx(tone as MetricTone);
  const valueColor = isHexTone ? tone : toneStyle!.color;
  const labelColor = isHexTone ? ui.muted : toneStyle!.color;
  const bgcolor = isHexTone ? ui.paper : toneStyle!.bgcolor;

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        ...cardSx,
        bgcolor,
        boxShadow: tone === 'default' || isHexTone ? ui.shadowSm : 'none',
        ...(isHexTone ? { borderLeft: `3px solid ${tone}` } : {}),
      }}
    >
      <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={0.75}>
          <Typography variant="body2" sx={{ color: isHexTone ? ui.muted : labelColor, opacity: isHexTone ? 1 : 0.85 }}>
            {label}
          </Typography>
          <Typography variant="h5" fontWeight={700} letterSpacing="-0.02em" sx={{ color: valueColor }}>
            {value}
          </Typography>
          {note ? (
            <Typography variant="caption" sx={{ color: isHexTone ? 'text.secondary' : labelColor, opacity: isHexTone ? 1 : 0.75 }}>
              {note}
            </Typography>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function WorkflowList({ items }: { items: string[] }) {
  return (
    <Stack spacing={1.5} component="ol" sx={{ m: 0, pl: 2.5 }}>
      {items.map((item) => (
        <Typography key={item} component="li" variant="body2">
          {item}
        </Typography>
      ))}
    </Stack>
  );
}

export function StatusCards({
  items,
}: {
  items: Array<{ title: string; description: string; status: string }>;
}) {
  return (
    <Grid2 container spacing={1.5}>
      {items.map((item) => (
        <Grid2 size={{ xs: 12, sm: 6 }} key={item.title}>
          <Paper elevation={0} sx={{ p: 2, ...cardSx }}>
            <Typography variant="subtitle2">{item.title}</Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {item.description}
            </Typography>
          </Paper>
        </Grid2>
      ))}
    </Grid2>
  );
}
