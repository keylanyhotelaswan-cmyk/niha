import { Avatar, Box, Card, CardContent, Chip, Grid2, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export function SectionCard({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 5, border: '1px solid rgba(117, 89, 77, 0.12)', background: 'linear-gradient(180deg, rgba(255,250,244,0.96), rgba(255,245,235,0.98))', boxShadow: '0 18px 38px rgba(47, 31, 24, 0.05)' }}>
      <Stack spacing={2.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
          <Box>
            <Typography variant="h5" fontWeight={800}>
              {title}
            </Typography>
            {description ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
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

export function MetricCard({ label, value, note, progress, tone }: { label: string; value: string; note: string; progress: number; tone: string }) {
  return (
    <Card elevation={0} sx={{ height: '100%', borderRadius: 5, border: '1px solid rgba(117, 89, 77, 0.12)', background: 'linear-gradient(180deg, rgba(255,251,246,0.98), rgba(252,243,232,0.98))' }}>
      <CardContent>
        <Stack spacing={1.4}>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h4" fontWeight={800}>
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {note}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 8,
              borderRadius: 999,
              backgroundColor: 'rgba(148, 163, 184, 0.14)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 999,
                backgroundColor: tone,
              },
            }}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}

export function WorkflowList({ items }: { items: string[] }) {
  return (
    <Stack spacing={2}>
      {items.map((item, index) => (
        <Stack key={item} direction="row" spacing={1.5} alignItems="flex-start">
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(185,56,23,0.12)', color: '#b93817', fontSize: 14 }}>
            {index + 1}
          </Avatar>
          <Typography variant="body2" color="text.secondary" lineHeight={1.9}>
            {item}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

export function StatusCards({ items }: { items: Array<{ title: string; description: string; status: string; accent: string }> }) {
  return (
    <Grid2 container spacing={2}>
      {items.map((item) => (
        <Grid2 size={{ xs: 12, md: 6 }} key={item.title}>
          <Card
            elevation={0}
            sx={{
              height: '100%',
              borderRadius: 4,
              border: '1px solid rgba(117, 89, 77, 0.12)',
              background: 'linear-gradient(180deg, rgba(255,250,244,0.98), rgba(252,243,232,0.98))',
            }}
          >
            <CardContent>
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                  <Typography variant="h6" fontWeight={800}>
                    {item.title}
                  </Typography>
                  <Chip
                    label={item.status}
                    size="small"
                    sx={{
                      bgcolor: `${item.accent}14`,
                      color: item.accent,
                      fontWeight: 700,
                    }}
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary" lineHeight={1.9}>
                  {item.description}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid2>
      ))}
    </Grid2>
  );
}