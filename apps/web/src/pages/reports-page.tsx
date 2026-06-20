import { Chip, Grid2, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { MetricCard, SectionCard, StatusCards } from './shared.js';
import { useBranches, useReport } from '../lib/hooks.js';

type ReportGroup = 'operations' | 'treasury' | 'inventory' | 'setup';

const reportGroups = [
  { key: 'operations', title: 'تقارير تشغيلية', description: 'مبيعات يومية، حسب الكاشير، أعلى الأصناف.', status: 'Operational', accent: '#0f766e' },
  { key: 'treasury', title: 'تقارير خزنة', description: 'دفتر الحركات، عهدة متوقعة، فروقات.', status: 'Treasury', accent: '#155e75' },
  { key: 'inventory', title: 'تقارير مخزون', description: 'أرصدة وتنبيهات المخزون.', status: 'Inventory', accent: '#1d4ed8' },
  { key: 'setup', title: 'تقارير تأسيس', description: 'إجمالي التأسيس والمسدد والمتبقي.', status: 'Setup Costs', accent: '#be123c' },
];

export function ReportsPage() {
  const [selectedGroup, setSelectedGroup] = useState<ReportGroup>('operations');
  const { data: branches = [] } = useBranches();
  const branchId = branches[0]?.id;
  const { data: reportData } = useReport(selectedGroup, branchId);

  const currentGroup = useMemo(() => reportGroups.find((item) => item.key === selectedGroup) ?? reportGroups[0], [selectedGroup]);
  const kpis = reportData?.kpis ?? [];

  return (
    <Stack spacing={2.5}>
      <SectionCard title="التقارير والمراجعة" description="أرقام قابلة للتتبع من قاعدة البيانات." action={<Chip label="Live Data" color="primary" />}>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">كل رقم مرتبط بحركة أو فاتورة في النظام.</Typography>
          <TextField select label="مجموعة التقرير" size="small" value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value as ReportGroup)} sx={{ maxWidth: 260 }}>
            {reportGroups.map((group) => (
              <MenuItem key={group.key} value={group.key}>{group.title}</MenuItem>
            ))}
          </TextField>
        </Stack>
      </SectionCard>

      <SectionCard title="مجموعات التقارير">
        <StatusCards items={reportGroups.map(({ title, description, status, accent }) => ({ title, description, status, accent }))} />
      </SectionCard>

      <Grid2 container spacing={2}>
        {kpis.map((kpi: any, index: number) => (
          <Grid2 size={{ xs: 12, md: 4 }} key={`${selectedGroup}-${kpi.label}`}>
            <MetricCard
              label={kpi.label}
              value={`${Number(kpi.value).toLocaleString('en-US')}${selectedGroup === 'inventory' && index === 2 ? '' : selectedGroup === 'operations' && index === 2 ? '' : ' ج.م'}`}
              note={kpi.note}
              progress={index === 0 ? 84 : index === 1 ? 63 : 48}
              tone={currentGroup?.accent ?? '#0f766e'}
            />
          </Grid2>
        ))}
      </Grid2>

      {selectedGroup === 'operations' && reportData?.salesByCashier ? (
        <Grid2 container spacing={2}>
          <Grid2 size={{ xs: 12, md: 6 }}>
            <SectionCard title="أداء الكاشيرين">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>الكاشير</TableCell>
                    <TableCell align="left">الفواتير</TableCell>
                    <TableCell align="left">إجمالي المبيعات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.salesByCashier.map((row: any) => (
                    <TableRow key={row.cashier} hover>
                      <TableCell>{row.cashier}</TableCell>
                      <TableCell align="left">{row.invoices}</TableCell>
                      <TableCell align="left">{row.total.toLocaleString('en-US')} ج.م</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SectionCard>
          </Grid2>
          <Grid2 size={{ xs: 12, md: 6 }}>
            <SectionCard title="الأصناف الأعلى مبيعًا">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>الصنف</TableCell>
                    <TableCell align="left">الكمية</TableCell>
                    <TableCell align="left">الإيراد</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(reportData.topSellingItems ?? []).map((row: any) => (
                    <TableRow key={row.name} hover>
                      <TableCell>{row.name}</TableCell>
                      <TableCell align="left">{row.quantity}</TableCell>
                      <TableCell align="left">{row.revenue.toLocaleString('en-US')} ج.م</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SectionCard>
          </Grid2>
        </Grid2>
      ) : null}

      {selectedGroup === 'setup' && reportData?.setupByCategory ? (
        <SectionCard title="التأسيس حسب الفئة">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>الفئة</TableCell>
                <TableCell align="left">المتعاقد</TableCell>
                <TableCell align="left">المسدد</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData.setupByCategory.map((row: any) => (
                <TableRow key={row.category} hover>
                  <TableCell>{row.category}</TableCell>
                  <TableCell align="left">{row.contracted.toLocaleString('en-US')} ج.م</TableCell>
                  <TableCell align="left">{row.paid.toLocaleString('en-US')} ج.م</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      ) : null}
    </Stack>
  );
}
