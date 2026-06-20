import { Box, Chip, Grid2, Paper, Stack, Typography } from '@mui/material';
import { MetricCard, SectionCard, StatusCards, WorkflowList } from './shared.js';
import { useBranches, useDashboard } from '../lib/hooks.js';

const modules = [
  { title: 'نقطة البيع POS', description: 'واجهة سريعة للكاشير، مناسبة للطلبات المباشرة والتيك أواي وزحمة الفترات.', status: 'جاهز للبدء', accent: '#b93817' },
  { title: 'الخزنة والورديات', description: 'عهدة فعلية ومتوقعة، إغلاق وردية، وفروقات قابلة للتدقيق.', status: 'أولوية أولى', accent: '#7c2d12' },
  { title: 'المخزون والوصفات', description: 'حركة مخزون مرتبطة بالبيع والوصفات حتى يبقى القرار اليومي أسرع.', status: 'تصميم معتمد', accent: '#d97706' },
  { title: 'التأسيس قبل الافتتاح', description: 'فصل مالي واضح بين تجهيز المحل ومصروفات التشغيل بعد الافتتاح.', status: 'ضمن النواة', accent: '#991b1b' },
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

  const quickStats = [
    { label: 'مبيعات اليوم', value: `${(stats?.salesToday ?? 0).toLocaleString('en-US')} ج.م`, note: `${stats?.ordersCountToday ?? 0} فاتورة مغلقة اليوم`, progress: stats?.salesToday ? 86 : 0, tone: '#b93817' },
    { label: 'العهدة المتوقعة', value: `${(stats?.expectedCash ?? 0).toLocaleString('en-US')} ج.م`, note: stats?.shiftOpen ? 'وردية مفتوحة' : 'لا توجد وردية نشطة', progress: stats?.shiftOpen ? 100 : 0, tone: '#7c2d12' },
    { label: 'تحصيل معلق', value: `${(stats?.pendingCollectionsTotal ?? 0).toLocaleString('en-US')} ج.م`, note: `${stats?.pendingCollectionsCount ?? 0} بانتظار اعتماد`, progress: stats?.pendingCollectionsCount ? 58 : 0, tone: '#b91c1c' },
    { label: 'تنبيهات المخزون', value: `${stats?.lowStockCount ?? 0} أصناف`, note: 'خامات منخفضة', progress: stats?.lowStockCount ? 24 : 0, tone: '#991b1b' },
  ];

  return (
    <Stack spacing={2.5}>
      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 }, borderRadius: 6, color: '#fff7ed', background: 'linear-gradient(135deg, rgba(47,31,24,0.98) 0%, rgba(90,39,20,0.98) 38%, rgba(185,56,23,1) 72%, rgba(217,119,6,0.96) 100%)', overflow: 'hidden', position: 'relative' }}>
        <Box sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 15% 20%, rgba(255,255,255,0.16), transparent 25%), radial-gradient(circle at 85% 25%, rgba(255,255,255,0.14), transparent 22%)' }} />
        <Stack spacing={2} sx={{ position: 'relative' }}>
          <Chip label="لوحة تشغيل مطعم" sx={{ alignSelf: 'flex-start', bgcolor: 'rgba(255,247,237,0.16)', color: '#fff7ed' }} />
          <Typography variant="h3" fontWeight={800} lineHeight={1.2}>متابعة حية للتشغيل اليومي: بيع، خزنة، مخزون، وتأسيس.</Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,247,237,0.82)', maxWidth: 760, lineHeight: 1.9 }}>الأرقام أدناه تُقرأ مباشرة من قاعدة البيانات وليس من بيانات تجريبية.</Typography>
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
