import { Chip, Grid2, Paper, Stack, Typography } from '@mui/material';
import { MetricCard, SectionCard, StatusCards, WorkflowList } from './shared.js';
import { useBranches, useDashboard } from '../lib/hooks.js';
import { cardSx, ui } from '../lib/ui-tokens.js';
import type { MetricTone } from '../lib/ui-tokens.js';

const modules = [
  { title: 'نقطة البيع POS', description: 'واجهة سريعة للكاشير، مناسبة للطلبات المباشرة والتيك أواي وزحمة الفترات.', status: 'جاهز للبدء' },
  { title: 'الخزنة والورديات', description: 'عهدة فعلية ومتوقعة، إغلاق وردية، وفروقات قابلة للتدقيق.', status: 'أولوية أولى' },
  { title: 'المخزون والوصفات', description: 'حركة مخزون مرتبطة بالبيع والوصفات حتى يبقى القرار اليومي أسرع.', status: 'تصميم معتمد' },
  { title: 'التأسيس قبل الافتتاح', description: 'فصل مالي واضح بين تجهيز المحل ومصروفات التشغيل بعد الافتتاح.', status: 'ضمن النواة' },
];

const workflowItems = [
  'فتح الوردية برصيد افتتاحي وتسجيل مسؤولية الكاشير.',
  'تنفيذ البيع وربط كل عملية تحصيل بوسيلة دفع واضحة.',
  'خصم الخامات وفق الوصفة الفعالة عند إقفال الطلب.',
  'إغلاق الوردية ومطابقة العهدة الفعلية مع المتوقعة.',
  'اعتماد المصروفات والحركات الحساسة مع Audit trail كامل.',
];

export function DashboardPage() {
  const { data: branches = [] } = useBranches();
  const branchId = branches[0]?.id;
  const { data: stats } = useDashboard(branchId);

  const quickStats: Array<{ label: string; value: string; note: string; progress: number; tone: MetricTone }> = [
    { label: 'مبيعات اليوم', value: `${(stats?.salesToday ?? 0).toLocaleString('en-US')} ج.م`, note: `${stats?.ordersCountToday ?? 0} فاتورة مغلقة اليوم`, progress: stats?.salesToday ? 86 : 0, tone: 'primary' },
    { label: 'العهدة المتوقعة', value: `${(stats?.expectedCash ?? 0).toLocaleString('en-US')} ج.م`, note: stats?.shiftOpen ? 'وردية مفتوحة' : 'لا توجد وردية نشطة', progress: stats?.shiftOpen ? 100 : 0, tone: 'success' },
    { label: 'تحصيل معلق', value: `${(stats?.pendingCollectionsTotal ?? 0).toLocaleString('en-US')} ج.م`, note: `${stats?.pendingCollectionsCount ?? 0} بانتظار اعتماد`, progress: stats?.pendingCollectionsCount ? 58 : 0, tone: 'warning' },
    { label: 'تنبيهات المخزون', value: `${stats?.lowStockCount ?? 0} أصناف`, note: 'خامات منخفضة', progress: stats?.lowStockCount ? 24 : 0, tone: 'warning' },
  ];

  return (
    <Stack spacing={2.5}>
      <Paper elevation={0} sx={{ ...cardSx, p: { xs: 2.5, md: 3.5 }, bgcolor: ui.primaryBg, border: `1px solid rgba(108, 92, 231, 0.2)` }}>
        <Stack spacing={2}>
          <Chip label="لوحة تشغيل مطعم" color="primary" sx={{ alignSelf: 'flex-start' }} />
          <Typography variant="h3" fontWeight={800} lineHeight={1.2} sx={{ color: ui.ink }}>متابعة حية للتشغيل اليومي: بيع، خزنة، مخزون، وتأسيس.</Typography>
          <Typography variant="h6" sx={{ color: ui.muted, maxWidth: 760, lineHeight: 1.9 }}>الأرقام أدناه تُقرأ مباشرة من قاعدة البيانات وليس من بيانات تجريبية.</Typography>
        </Stack>
      </Paper>

      <Grid2 container spacing={2}>
        {quickStats.map((stat) => (
          <Grid2 size={{ xs: 12, sm: 6, xl: 3 }} key={stat.label}>
            <MetricCard {...stat} />
          </Grid2>
        ))}
      </Grid2>

      <Grid2 container spacing={2}>
        <Grid2 size={{ xs: 12, xl: 8 }}>
          <SectionCard title="ماذا يغطي النظام" description="وحدات أساسية مترابطة لكن مستقلة محاسبيًا وتشغيليًا.">
            <StatusCards items={modules} />
          </SectionCard>
        </Grid2>
        <Grid2 size={{ xs: 12, xl: 4 }}>
          <SectionCard title="دورة العمل اليومية" description="ملخص سريع لتتابع التشغيل المتوقع.">
            <WorkflowList items={workflowItems} />
          </SectionCard>
        </Grid2>
      </Grid2>
    </Stack>
  );
}
