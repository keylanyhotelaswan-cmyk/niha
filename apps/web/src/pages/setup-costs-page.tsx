import { Alert, Chip, Grid2, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { MetricCard, SectionCard, WorkflowList } from './shared.js';
import { useBranches, useSetupCategories, useSetupCosts } from '../lib/hooks.js';

const setupFlow = [
  'تسجيل بند تأسيسي مستقل مثل ديكور أو معدات مطبخ أو أعمال غاز.',
  'ربط البند بفئة تأسيس ومورد أو جهة منفذة إن وجدت.',
  'تسجيل دفعات كاملة أو جزئية مع تاريخ ووسيلة سداد.',
  'إظهار الفرق بين أصل التكلفة، ما سُدد، وما تبقى كالتزام.',
  'عرض تقارير منفصلة عن المصروفات التشغيلية اليومية.',
];

function itemStatus(contracted: number, paid: number) {
  if (paid >= contracted) return 'paid';
  if (paid > 0) return 'partially_paid';
  return 'planned';
}

export function SetupCostsPage() {
  const { data: branches = [] } = useBranches();
  const branchId = branches[0]?.id ?? '';
  const { data: categories = [] } = useSetupCategories();
  const { data: items = [] } = useSetupCosts(branchId);

  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'planned' | 'partially_paid' | 'paid'>('all');
  const [selectedItemId, setSelectedItemId] = useState('');

  const mappedItems = useMemo(() => items.map((item: any) => ({
    id: item.id,
    title: item.title,
    category: item.category?.name ?? 'غير مصنف',
    vendor: item.vendorName ?? '—',
    contractedAmount: Number(item.contractedAmount),
    paidAmount: Number(item.paidAmount),
    status: itemStatus(Number(item.contractedAmount), Number(item.paidAmount)),
    incurredAt: new Date(item.incurredAt).toLocaleDateString('ar-EG'),
  })), [items]);

  const filteredItems = useMemo(() => {
    return mappedItems.filter((item) => {
      const categoryMatch = selectedCategory === 'الكل' || item.category === selectedCategory;
      const statusMatch = selectedStatus === 'all' || item.status === selectedStatus;
      return categoryMatch && statusMatch;
    });
  }, [mappedItems, selectedCategory, selectedStatus]);

  const selectedItem = filteredItems.find((item) => item.id === selectedItemId) ?? filteredItems[0];

  useEffect(() => {
    if (filteredItems[0] && !selectedItemId) setSelectedItemId(filteredItems[0].id);
  }, [filteredItems, selectedItemId]);

  const totals = useMemo(() => {
    return filteredItems.reduce(
      (acc, item) => {
        acc.contracted += item.contractedAmount;
        acc.paid += item.paidAmount;
        return acc;
      },
      { contracted: 0, paid: 0 },
    );
  }, [filteredItems]);

  const remaining = totals.contracted - totals.paid;
  const categoryNames = categories.map((c: any) => c.name);

  const setupStats = [
    { label: 'إجمالي التأسيس', value: `${totals.contracted.toLocaleString('en-US')} ج.م`, note: 'قيمة البنود ضمن الفلاتر الحالية', progress: 100, tone: '#be123c' },
    { label: 'المسدّد', value: `${totals.paid.toLocaleString('en-US')} ج.م`, note: 'دفعات فعلية مسجلة', progress: totals.contracted === 0 ? 0 : Math.round((totals.paid / totals.contracted) * 100), tone: '#0f766e' },
    { label: 'المتبقي', value: `${remaining.toLocaleString('en-US')} ج.م`, note: 'التزامات لم تسدد بعد', progress: totals.contracted === 0 ? 0 : Math.round((remaining / totals.contracted) * 100), tone: '#b45309' },
  ];

  return (
    <Stack spacing={2.5}>
      <Grid2 container spacing={2}>
        {setupStats.map((stat) => (
          <Grid2 size={{ xs: 12, md: 4 }} key={stat.label}>
            <MetricCard {...stat} />
          </Grid2>
        ))}
      </Grid2>

      <Grid2 container spacing={2}>
        <Grid2 size={{ xs: 12, lg: 7 }}>
          <SectionCard title="مصروفات التأسيس قبل الافتتاح" description="بيانات من قاعدة البيانات — مفصولة عن التشغيل اليومي." action={<Chip label="Separated From OPEX" color="secondary" />}>
            <Stack spacing={1.5}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                <TextField select label="الفئة" size="small" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} sx={{ minWidth: 220 }}>
                  <MenuItem value="الكل">الكل</MenuItem>
                  {categoryNames.map((category) => (
                    <MenuItem key={category} value={category}>{category}</MenuItem>
                  ))}
                </TextField>
                <TextField select label="الحالة" size="small" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as typeof selectedStatus)} sx={{ minWidth: 180 }}>
                  <MenuItem value="all">كل الحالات</MenuItem>
                  <MenuItem value="planned">مخطط</MenuItem>
                  <MenuItem value="partially_paid">مسدد جزئيًا</MenuItem>
                  <MenuItem value="paid">مسدد بالكامل</MenuItem>
                </TextField>
              </Stack>
            </Stack>
          </SectionCard>
        </Grid2>
        <Grid2 size={{ xs: 12, lg: 5 }}>
          <SectionCard title="دورة التسجيل" description="خطوات العمل المعتمدة لمصروفات التأسيس.">
            <WorkflowList items={setupFlow} />
          </SectionCard>
        </Grid2>
      </Grid2>

      <SectionCard title="بنود التأسيس" description="قائمة البنود مع الالتزامات والمدفوعات.">
        {filteredItems.length === 0 ? <Alert severity="info">لا توجد بنود تأسيس مسجلة بعد.</Alert> : null}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>البند</TableCell>
              <TableCell>الفئة</TableCell>
              <TableCell>المورد</TableCell>
              <TableCell align="left">المتعاقد</TableCell>
              <TableCell align="left">المسدد</TableCell>
              <TableCell>الحالة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow key={item.id} hover selected={item.id === selectedItem?.id} onClick={() => setSelectedItemId(item.id)}>
                <TableCell>{item.title}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell>{item.vendor}</TableCell>
                <TableCell align="left">{item.contractedAmount.toLocaleString('en-US')} ج.م</TableCell>
                <TableCell align="left">{item.paidAmount.toLocaleString('en-US')} ج.م</TableCell>
                <TableCell><Chip size="small" label={item.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>

      {selectedItem ? (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 4 }}>
          <Typography variant="h6" fontWeight={800}>{selectedItem.title}</Typography>
          <Typography variant="body2" color="text.secondary">تاريخ: {selectedItem.incurredAt} — المتبقي: {(selectedItem.contractedAmount - selectedItem.paidAmount).toLocaleString('en-US')} ج.م</Typography>
        </Paper>
      ) : null}
    </Stack>
  );
}
