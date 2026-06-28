import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid2,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { PageToolbar } from '../../components/page-toolbar.js';
import { MetricCard, SectionCard } from '../shared.js';
import { cardSx, sectionSx, sidebarSx, tabsSx, ui, type MetricTone } from '../../lib/ui-tokens.js';

const paletteSwatches = [
  { label: 'Primary', color: ui.primary },
  { label: 'Primary Dark', color: ui.primaryDark },
  { label: 'Primary Soft', color: ui.primarySoft },
  { label: 'Surface Muted', color: ui.surfaceMuted },
  { label: 'Ink', color: ui.ink },
  { label: 'Muted', color: ui.muted },
  { label: 'Success', color: ui.successSolid },
  { label: 'Warning', color: ui.warnSolid },
  { label: 'Info', color: ui.infoSolid },
  { label: 'Danger', color: ui.dangerSolid },
  { label: 'Sidebar Active', color: ui.sidebarActive },
];

const buttonColors = ['primary', 'secondary', 'success', 'error', 'warning', 'info'] as const;
const buttonVariants = ['contained', 'outlined', 'text'] as const;
const chipColors = ['default', 'primary', 'success', 'warning', 'error', 'info'] as const;
const metricTones: MetricTone[] = ['default', 'primary', 'success', 'warning', 'info'];

function Swatch({ label, color }: { label: string; color: string }) {
  return (
    <Stack spacing={0.75} alignItems="center">
      <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: color, border: `1px solid ${ui.border}` }} />
      <Typography variant="caption" textAlign="center" sx={{ maxWidth: 72 }}>{label}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{color}</Typography>
    </Stack>
  );
}

export function ThemeGalleryPage() {
  const [tab, setTab] = useState(0);

  return (
    <Stack spacing={2.5}>
      <PageToolbar
        title="دليل الألوان والثيم"
        subtitle="مرجع بصري لمكوّنات NIHA — للتحقق من تناسق الألوان على الخلفية البيضاء."
      />

      <Alert severity="info">
        هذه الصفحة للمعاينة فقط. التعديلات المركزية في <strong>ui-tokens.ts</strong> و <strong>theme.ts</strong>.
      </Alert>

      <SectionCard title="لوحة الألوان" compact>
        <Stack direction="row" flexWrap="wrap" gap={2} useFlexGap>
          {paletteSwatches.map((s) => (
            <Swatch key={s.label} label={s.label} color={s.color} />
          ))}
        </Stack>
      </SectionCard>

      <SectionCard title="الأزرار" compact>
        <Stack spacing={2}>
          {buttonVariants.map((variant) => (
            <Box key={variant}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>{variant}</Typography>
              <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap>
                {buttonColors.map((color) => (
                  <Button key={`${variant}-${color}`} variant={variant} color={color} size="small">
                    {color}
                  </Button>
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      </SectionCard>

      <SectionCard title="Chips" compact>
        <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap>
          {chipColors.map((color) => (
            <Chip
              key={color}
              label={color}
              {...(color === 'default' ? {} : { color })}
            />
          ))}
        </Stack>
      </SectionCard>

      <SectionCard title="Alerts" compact>
        <Stack spacing={1.5}>
          <Alert severity="success">عملية ناجحة — تحصيل معتمد.</Alert>
          <Alert severity="warning">تحذير — رصيد منخفض في خزينة المصروفات.</Alert>
          <Alert severity="error">خطأ — تعذّر حفظ البيانات.</Alert>
          <Alert severity="info">معلومة — الوردية مفتوحة منذ 3 ساعات.</Alert>
        </Stack>
      </SectionCard>

      <SectionCard title="Tabs" compact>
        <Paper elevation={0} sx={{ ...cardSx, px: 2, pt: 1, pb: 0.5 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={tabsSx}>
            <Tab label="الوردية الحالية" />
            <Tab label="اعتماد الخزنة" />
            <Tab label="الخزنة" />
            <Tab label="سجل الورديات" />
          </Tabs>
        </Paper>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          التبويب النشط: {tab + 1} — يجب أن يظهر بخلفية بنفسجية ونص أبيض.
        </Typography>
      </SectionCard>

      <SectionCard title="MetricCard" compact>
        <Grid2 container spacing={1.5}>
          {metricTones.map((tone) => (
            <Grid2 key={tone} size={{ xs: 6, md: 4, lg: 2 }}>
              <MetricCard label={tone} value="12,450 ج.م" note="مثال KPI" tone={tone} />
            </Grid2>
          ))}
        </Grid2>
      </SectionCard>

      <SectionCard title="Typography" compact>
        <Stack spacing={1}>
          <Typography variant="h4">Heading 4 — عنوان رئيسي</Typography>
          <Typography variant="h5">Heading 5 — عنوان صفحة</Typography>
          <Typography variant="h6">Heading 6 — عنوان بطاقة</Typography>
          <Typography variant="subtitle1">Subtitle 1 — نص فرعي بارز</Typography>
          <Typography variant="subtitle2">Subtitle 2 — تسمية صغيرة</Typography>
          <Typography variant="body1">Body 1 — نص أساسي للقراءة.</Typography>
          <Typography variant="body2">Body 2 — نص ثانوي أو توضيحي.</Typography>
          <Typography variant="caption">Caption — تفاصيل صغيرة</Typography>
          <Typography variant="overline">Overline — NIHA</Typography>
        </Stack>
      </SectionCard>

      <SectionCard title="Surfaces" compact>
        <Grid2 container spacing={2}>
          <Grid2 size={{ xs: 12, md: 4 }}>
            <Paper elevation={0} sx={{ ...cardSx, p: 2 }}>
              <Typography variant="subtitle2">cardSx</Typography>
              <Typography variant="body2" color="text.secondary">بطاقة عائمة بحد خفيف وظل.</Typography>
            </Paper>
          </Grid2>
          <Grid2 size={{ xs: 12, md: 4 }}>
            <Paper elevation={0} sx={{ ...sectionSx, p: 2 }}>
              <Typography variant="subtitle2">sectionSx</Typography>
              <Typography variant="body2" color="text.secondary">قسم داخلي أخف.</Typography>
            </Paper>
          </Grid2>
          <Grid2 size={{ xs: 12, md: 4 }}>
            <Paper elevation={0} sx={{ ...sidebarSx, p: 2 }}>
              <Typography variant="subtitle2">sidebarSx</Typography>
              <Typography variant="body2" color="text.secondary">نمط القائمة الجانبية.</Typography>
            </Paper>
          </Grid2>
        </Grid2>
      </SectionCard>
    </Stack>
  );
}
