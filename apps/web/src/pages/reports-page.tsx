import {
  Alert,
  Grid2,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo, useState, type ReactNode } from 'react';
import { MetricCard, SectionCard } from './shared.js';
import {
  useBranches,
  useBundleSuggestions,
  useProductDayMatrix,
  useReport,
  useWeekOverWeek,
} from '../lib/hooks.js';
import { formatDateRangeLabelAr, localMonthStartKey, localTodayKey } from '../lib/date-utils.js';
import {
  DayOfWeekChart,
  HorizontalBarChart,
  ShiftSalesChart,
  WeeklySalesChart,
} from './reports/reports-charts.js';

type ReportGroup = 'operations' | 'treasury' | 'inventory' | 'setup';
type OpsTab = 'summary' | 'shifts' | 'insights';

const reportGroups: { key: ReportGroup; title: string }[] = [
  { key: 'operations', title: 'المبيعات والتشغيل' },
  { key: 'treasury', title: 'الخزنة' },
  { key: 'inventory', title: 'المخزون' },
  { key: 'setup', title: 'التأسيس' },
];

const DOW_LABELS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function formatMoney(n: number) {
  return `${n.toLocaleString('en-US')} ج.م`;
}

function formatWeek(d: string | Date) {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
}

function CompactTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  if (!rows.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        لا توجد بيانات في هذه الفترة.
      </Typography>
    );
  }
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          {headers.map((h) => (
            <TableCell key={h} align={h === headers[0] ? 'inherit' : 'left'}>
              {h}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((cells, i) => (
          <TableRow key={i} hover>
            {cells.map((cell, j) => (
              <TableCell key={j} align={j === 0 ? 'inherit' : 'left'}>
                {cell}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function ReportsPage() {
  const [selectedGroup, setSelectedGroup] = useState<ReportGroup>('operations');
  const [opsTab, setOpsTab] = useState<OpsTab>('summary');
  const [fromDate, setFromDate] = useState(localMonthStartKey);
  const [toDate, setToDate] = useState(localTodayKey);
  const reportRange = useMemo(() => ({ from: fromDate, to: toDate }), [fromDate, toDate]);

  const { data: branches = [] } = useBranches();
  const [branchId, setBranchId] = useState<string | undefined>();
  const effectiveBranchId = branchId ?? branches[0]?.id;
  const branchName = branches.find((b: any) => b.id === effectiveBranchId)?.name;

  const { data: reportData, isError: reportError, error: reportErr, isPending: reportPending } = useReport(
    selectedGroup,
    effectiveBranchId,
    { range: reportRange },
  );
  const { data: dayMatrix, isError: matrixError } = useProductDayMatrix(
    selectedGroup === 'operations' && opsTab === 'insights' ? effectiveBranchId : undefined,
    reportRange,
  );
  const { data: wowData, isError: wowError } = useWeekOverWeek(
    selectedGroup === 'operations' && opsTab === 'insights' ? effectiveBranchId : undefined,
  );
  const { data: bundleData, isError: bundleError } = useBundleSuggestions(
    selectedGroup === 'operations' && opsTab === 'insights' ? effectiveBranchId : undefined,
    reportRange,
  );

  const kpis = reportData?.kpis ?? [];

  const heatmapRows = useMemo(() => {
    const rows = dayMatrix?.rows ?? [];
    return rows
      .slice()
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 20)
      .map((row: any) => [
        row.productName,
        DOW_LABELS[row.dow] ?? '—',
        String(row.qtySold),
        formatMoney(row.revenue),
      ]);
  }, [dayMatrix]);

  const topItemsChart = useMemo(
    () => (reportData?.topSellingItems ?? []).map((r: any) => ({ name: r.name, value: r.revenue })),
    [reportData],
  );

  const cashiersChart = useMemo(
    () => (reportData?.salesByCashier ?? []).map((r: any) => ({ name: r.cashier, value: r.total })),
    [reportData],
  );

  const weeklyChart = useMemo(
    () =>
      (wowData?.weekly ?? []).slice(0, 8).map((r: any) => ({
        label: formatWeek(r.weekStart),
        sales: r.grossSales,
        orders: r.orderCount,
      })),
    [wowData],
  );

  const dowChart = useMemo(() => {
    const totals = new Array(7).fill(0);
    for (const row of dayMatrix?.rows ?? []) {
      totals[row.dow] = (totals[row.dow] ?? 0) + row.revenue;
    }
    return DOW_LABELS.map((name, i) => ({ name, value: totals[i] ?? 0 }));
  }, [dayMatrix]);

  const shiftsChart = useMemo(
    () =>
      (reportData?.shiftHistory ?? []).slice(0, 12).map((r: any) => ({
        label: r.shiftNumber,
        sales: r.totalSales,
      })),
    [reportData],
  );

  return (
    <Stack spacing={2}>
      {/* شريط الفلاتر */}
      <SectionCard title="التقارير" compact>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
          <TextField
            select
            label="نوع التقرير"
            size="small"
            value={selectedGroup}
            onChange={(e) => {
              setSelectedGroup(e.target.value as ReportGroup);
              setOpsTab('summary');
            }}
            sx={{ minWidth: 180 }}
          >
            {reportGroups.map((g) => (
              <MenuItem key={g.key} value={g.key}>{g.title}</MenuItem>
            ))}
          </TextField>
          {branches.length > 0 ? (
            <TextField
              select
              label="الفرع"
              size="small"
              value={effectiveBranchId ?? ''}
              onChange={(e) => setBranchId(e.target.value)}
              sx={{ minWidth: 180 }}
            >
              {branches.map((b: any) => (
                <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
              ))}
            </TextField>
          ) : null}
          <TextField
            label="من"
            type="date"
            size="small"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 150 }}
          />
          <TextField
            label="إلى"
            type="date"
            size="small"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 150 }}
          />
        </Stack>
        {branchName ? (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {formatDateRangeLabelAr(fromDate, toDate)} · {branchName}
          </Typography>
        ) : null}
      </SectionCard>

      {reportError ? (
        <Alert severity="error" variant="outlined">تعذّر تحميل التقرير.</Alert>
      ) : null}

      {reportPending && !reportData ? (
        <Typography variant="body2" color="text.secondary">جاري التحميل…</Typography>
      ) : null}

      {/* KPIs */}
      {kpis.length > 0 ? (
        <Grid2 container spacing={1.5}>
          {kpis.map((kpi: any, index: number) => (
            <Grid2 size={{ xs: 12, sm: 4 }} key={kpi.label}>
              <MetricCard
                label={kpi.label}
                value={`${Number(kpi.value).toLocaleString('en-US')}${
                  selectedGroup === 'operations' && index === 2 ? '' : selectedGroup === 'inventory' && index === 2 ? '' : ' ج.م'
                }`}
                note={kpi.note}
              />
            </Grid2>
          ))}
        </Grid2>
      ) : null}

      {/* تقارير التشغيل */}
      {selectedGroup === 'operations' ? (
        <>
          <Tabs
            value={opsTab}
            onChange={(_, v) => setOpsTab(v)}
            sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 40 }}
          >
            <Tab value="summary" label="ملخص" />
            <Tab value="shifts" label="الورديات" />
            <Tab value="insights" label="تحليلات" />
          </Tabs>

          {opsTab === 'summary' ? (
            <Stack spacing={2}>
              <Grid2 container spacing={2}>
                <Grid2 size={{ xs: 12, lg: 6 }}>
                  <SectionCard title="المبيعات حسب الكاشير" compact>
                    <HorizontalBarChart data={cashiersChart} />
                  </SectionCard>
                </Grid2>
                <Grid2 size={{ xs: 12, lg: 6 }}>
                  <SectionCard title="أعلى الأصناف" compact>
                    <HorizontalBarChart data={topItemsChart} />
                  </SectionCard>
                </Grid2>
              </Grid2>
              <Grid2 container spacing={2}>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <SectionCard title="تفاصيل الكاشيرين" compact>
                    <CompactTable
                      headers={['الكاشير', 'الفواتير', 'المبيعات']}
                      rows={(reportData?.salesByCashier ?? []).map((r: any) => [
                        r.cashier,
                        String(r.invoices),
                        formatMoney(r.total),
                      ])}
                    />
                  </SectionCard>
                </Grid2>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <SectionCard title="تفاصيل الأصناف" compact>
                    <CompactTable
                      headers={['الصنف', 'الكمية', 'الإيراد']}
                      rows={(reportData?.topSellingItems ?? []).map((r: any) => [
                        r.name,
                        String(r.quantity),
                        formatMoney(r.revenue),
                      ])}
                    />
                  </SectionCard>
                </Grid2>
              </Grid2>
            </Stack>
          ) : null}

          {opsTab === 'shifts' ? (
            <Stack spacing={2}>
              <SectionCard title="مبيعات الورديات" description="آخر 12 وردية مغلقة." compact>
                <ShiftSalesChart data={shiftsChart} />
              </SectionCard>
              <SectionCard
                title="تفاصيل الورديات"
                description="سجل تاريخي — يشمل الفواتير المحصّلة التي لا تظهر في نقطة البيع."
                compact
              >
                <CompactTable
                  headers={['الوردية', 'الكاشير', 'الإغلاق', 'فواتير', 'مبيعات']}
                  rows={(reportData?.shiftHistory ?? []).map((r: any) => [
                    r.shiftNumber,
                    r.cashierName,
                    r.closedAt ? new Date(r.closedAt).toLocaleDateString('ar-EG') : '—',
                    String(r.ordersCount),
                    formatMoney(r.totalSales),
                  ])}
                />
              </SectionCard>
            </Stack>
          ) : null}

          {opsTab === 'insights' ? (
            <Stack spacing={2}>
              {(matrixError || wowError || bundleError) ? (
                <Alert severity="warning" variant="outlined">
                  التحليلات المتقدمة تحتاج تحديث السيرفر. الملخص والورديات متاحين في التبويبات الأخرى.
                </Alert>
              ) : null}

              <Grid2 container spacing={2}>
                <Grid2 size={{ xs: 12, lg: 7 }}>
                  <SectionCard title="المبيعات أسبوع بأسبوع" compact>
                    <WeeklySalesChart data={weeklyChart} />
                  </SectionCard>
                </Grid2>
                <Grid2 size={{ xs: 12, lg: 5 }}>
                  <SectionCard title="المبيعات حسب يوم الأسبوع" compact>
                    <DayOfWeekChart data={dowChart} />
                  </SectionCard>
                </Grid2>
              </Grid2>

              <SectionCard
                title="أفضل أيام البيع لكل صنف"
                description="أقوى 20 صف — أي يوم بيبيع فيه الصنف أكتر."
                compact
              >
                <CompactTable
                  headers={['الصنف', 'أقوى يوم', 'الكمية', 'الإيراد']}
                  rows={heatmapRows}
                />
              </SectionCard>

              <SectionCard title="أصناف تُباع معاً" compact>
                <CompactTable
                  headers={['صنف 1', 'صنف 2', 'مرات', 'سعر مقترح']}
                  rows={(bundleData?.suggestions ?? []).slice(0, 10).map((r: any) => [
                    r.productAName,
                    r.productBName,
                    String(r.pairOrders),
                    r.suggestedPrice != null ? formatMoney(r.suggestedPrice) : '—',
                  ])}
                />
              </SectionCard>
            </Stack>
          ) : null}
        </>
      ) : null}

      {selectedGroup === 'setup' && reportData?.setupByCategory ? (
        <SectionCard title="التأسيس حسب الفئة" compact>
          <CompactTable
            headers={['الفئة', 'المتعاقد', 'المسدد']}
            rows={reportData.setupByCategory.map((r: any) => [
              r.category,
              formatMoney(r.contracted),
              formatMoney(r.paid),
            ])}
          />
        </SectionCard>
      ) : null}
    </Stack>
  );
}
