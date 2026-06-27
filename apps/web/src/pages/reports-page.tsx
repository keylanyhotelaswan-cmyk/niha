import {
  Alert,
  Box,
  Chip,
  Grid2,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { MetricCard, SectionCard, StatusCards } from './shared.js';
import {
  useBranches,
  useBundleSuggestions,
  useProductDayMatrix,
  useReport,
  useWeekOverWeek,
} from '../lib/hooks.js';
import { formatDateRangeLabelAr, localMonthStartKey, localTodayKey } from '../lib/date-utils.js';

type ReportGroup = 'operations' | 'treasury' | 'inventory' | 'setup';

const reportGroups = [
  { key: 'operations', title: 'تقارير تشغيلية', description: 'مبيعات يومية، حسب الكاشير، أعلى الأصناف.', status: 'Operational', accent: '#0f766e' },
  { key: 'treasury', title: 'تقارير خزنة', description: 'دفتر الحركات، عهدة متوقعة، فروقات.', status: 'Treasury', accent: '#155e75' },
  { key: 'inventory', title: 'تقارير مخزون', description: 'أرصدة وتنبيهات المخزون.', status: 'Inventory', accent: '#1d4ed8' },
  { key: 'setup', title: 'تقارير تأسيس', description: 'إجمالي التأسيس والمسدد والمتبقي.', status: 'Setup Costs', accent: '#be123c' },
];

const DOW_LABELS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function formatPct(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function formatWeek(d: string | Date) {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ReportsPage() {
  const [selectedGroup, setSelectedGroup] = useState<ReportGroup>('operations');
  const [fromDate, setFromDate] = useState(localMonthStartKey);
  const [toDate, setToDate] = useState(localTodayKey);
  const reportRange = useMemo(() => ({ from: fromDate, to: toDate }), [fromDate, toDate]);

  const { data: branches = [] } = useBranches();
  const [branchId, setBranchId] = useState<string | undefined>();
  const effectiveBranchId = branchId ?? branches[0]?.id;
  const branchName = branches.find((b: any) => b.id === effectiveBranchId)?.name;

  const {
    data: reportData,
    isError: reportError,
    error: reportErr,
    isPending: reportPending,
  } = useReport(selectedGroup, effectiveBranchId, { range: reportRange });
  const {
    data: dayMatrix,
    isError: matrixError,
    error: matrixErr,
  } = useProductDayMatrix(selectedGroup === 'operations' ? effectiveBranchId : undefined, reportRange);
  const {
    data: wowData,
    isError: wowError,
    error: wowErr,
  } = useWeekOverWeek(selectedGroup === 'operations' ? effectiveBranchId : undefined);
  const {
    data: bundleData,
    isError: bundleError,
    error: bundleErr,
  } = useBundleSuggestions(selectedGroup === 'operations' ? effectiveBranchId : undefined, reportRange);

  const analyticsUnavailable = matrixError || wowError || bundleError;

  const currentGroup = useMemo(() => reportGroups.find((item) => item.key === selectedGroup) ?? reportGroups[0], [selectedGroup]);
  const kpis = reportData?.kpis ?? [];

  const matrixByDay = useMemo(() => {
    const map = new Map<number, any[]>();
    for (const row of dayMatrix?.rows ?? []) {
      const list = map.get(row.dow) ?? [];
      list.push(row);
      map.set(row.dow, list);
    }
    return map;
  }, [dayMatrix]);

  return (
    <Stack spacing={2.5}>
      <SectionCard title="التقارير والمراجعة" description="أرقام قابلة للتتبع من قاعدة البيانات." action={<Chip label="Live Data" color="primary" />}>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">كل رقم مرتبط بحركة أو فاتورة في النظام.</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField select label="مجموعة التقرير" size="small" value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value as ReportGroup)} sx={{ maxWidth: 260 }}>
              {reportGroups.map((group) => (
                <MenuItem key={group.key} value={group.key}>{group.title}</MenuItem>
              ))}
            </TextField>
            {branches.length > 0 ? (
              <TextField select label="الفرع" size="small" value={effectiveBranchId ?? ''} onChange={(e) => setBranchId(e.target.value)} sx={{ maxWidth: 260 }}>
                {branches.map((branch: any) => (
                  <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>
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
              sx={{ maxWidth: 160 }}
            />
            <TextField
              label="إلى"
              type="date"
              size="small"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ maxWidth: 160 }}
            />
          </Stack>
          {branchName ? (
            <Typography variant="caption" color="text.secondary">
              الفترة: {formatDateRangeLabelAr(fromDate, toDate)} · {branchName}
            </Typography>
          ) : null}
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

      {reportError ? (
        <Alert severity="error" sx={{ borderRadius: 3 }}>
          تعذّر تحميل التقرير: {reportErr instanceof Error ? reportErr.message : 'خطأ غير معروف'}
        </Alert>
      ) : null}

      {reportPending && !reportData ? (
        <Alert severity="info" sx={{ borderRadius: 3 }}>جاري تحميل التقرير…</Alert>
      ) : null}

      {selectedGroup === 'operations' && analyticsUnavailable ? (
        <Alert severity="warning" sx={{ borderRadius: 3 }}>
          تحليلات Heatmap / WoW / Bundles غير متاحة على السيرفر الحالي — يلزم تحديث API على Render (deploy).
          {matrixError ? ` Heatmap: ${matrixErr instanceof Error ? matrixErr.message : '404'}.` : ''}
        </Alert>
      ) : null}

      {selectedGroup === 'operations' && reportData?.dataSourceNote ? (
        <Alert severity="info" sx={{ borderRadius: 3 }}>
          {reportData.dataSourceNote}
        </Alert>
      ) : null}

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

      {selectedGroup === 'operations' && (reportData?.shiftHistory?.length ?? 0) > 0 ? (
        <SectionCard
          title="سجل الورديات المغلقة"
          description="ملخص كل وردية — يشمل الفواتير المحصّلة التي لا تظهر في نقطة البيع بعد الإغلاق."
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>الوردية</TableCell>
                <TableCell>الكاشير</TableCell>
                <TableCell>الإغلاق</TableCell>
                <TableCell align="left">الفواتير</TableCell>
                <TableCell align="left">المبيعات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData.shiftHistory.map((row: any) => (
                <TableRow key={row.shiftId} hover>
                  <TableCell>{row.shiftNumber}</TableCell>
                  <TableCell>{row.cashierName}</TableCell>
                  <TableCell>
                    {row.closedAt ? new Date(row.closedAt).toLocaleString('ar-EG') : '—'}
                  </TableCell>
                  <TableCell align="left">{row.ordersCount}</TableCell>
                  <TableCell align="left">{row.totalSales.toLocaleString('en-US')} ج.م</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      ) : null}

      {selectedGroup === 'operations' ? (
        <>
          <SectionCard
            title="الأصناف × أيام الأسبوع"
            description="آخر 365 يوم — سجل تاريخي (مستقل عن شاشة POS). مؤشر DSI: فوق 1.2 يعني يوم مفضل للصنف."
            action={
              dayMatrix?.ordersAnalyzed != null ? (
                <Chip size="small" label={`${dayMatrix.ordersAnalyzed} فاتورة مغلقة`} />
              ) : undefined
            }
          >
            <Stack spacing={2}>
              {[0, 1, 2, 3, 4, 5, 6].map((dow) => {
                const rows = matrixByDay.get(dow) ?? [];
                if (!rows.length) return null;
                return (
                  <Box key={dow}>
                    <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.5 }}>
                      {DOW_LABELS[dow]}
                    </Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>#</TableCell>
                          <TableCell>الصنف</TableCell>
                          <TableCell align="left">الكمية</TableCell>
                          <TableCell align="left">الإيراد</TableCell>
                          <TableCell align="left">DSI</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.map((row: any) => (
                          <TableRow key={`${dow}-${row.productId}`} hover>
                            <TableCell>{row.rankInDay}</TableCell>
                            <TableCell>{row.productName}</TableCell>
                            <TableCell align="left">{row.qtySold}</TableCell>
                            <TableCell align="left">{row.revenue.toLocaleString('en-US')} ج.م</TableCell>
                            <TableCell align="left">
                              {row.dayStrengthIndex != null ? (
                                <Chip
                                  size="small"
                                  label={row.dayStrengthIndex.toFixed(2)}
                                  color={row.dayStrengthIndex >= 1.2 ? 'success' : row.dayStrengthIndex <= 0.8 ? 'default' : 'primary'}
                                  variant="outlined"
                                />
                              ) : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                );
              })}
              {!dayMatrix?.rows?.length ? (
                <Typography variant="body2" color="text.secondary">
                  {dayMatrix?.ordersAnalyzed
                    ? `تم تحليل ${dayMatrix.ordersAnalyzed} فاتورة مغلقة — لا توجد أصناف كافية لعرض heatmap.`
                    : 'لا توجد بيانات كافية في الفترة المحددة.'}
                </Typography>
              ) : null}
            </Stack>
          </SectionCard>

          <Grid2 container spacing={2}>
            <Grid2 size={{ xs: 12, lg: 6 }}>
              <SectionCard
                title="مقارنة أسبوع بأسبوع (WoW)"
                action={
                  wowData?.ordersAnalyzed != null ? (
                    <Chip size="small" label={`${wowData.ordersAnalyzed} فاتورة`} />
                  ) : undefined
                }
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>الأسبوع</TableCell>
                      <TableCell align="left">المبيعات</TableCell>
                      <TableCell align="left">نمو المبيعات</TableCell>
                      <TableCell align="left">الفواتير</TableCell>
                      <TableCell align="left">نمو الفواتير</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(wowData?.weekly ?? []).map((row: any) => (
                      <TableRow key={String(row.weekStart)} hover>
                        <TableCell>{formatWeek(row.weekStart)}</TableCell>
                        <TableCell align="left">{row.grossSales.toLocaleString('en-US')} ج.م</TableCell>
                        <TableCell align="left">{formatPct(row.wowSalesPct)}</TableCell>
                        <TableCell align="left">{row.orderCount}</TableCell>
                        <TableCell align="left">{formatPct(row.wowOrdersPct)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </SectionCard>
            </Grid2>
            <Grid2 size={{ xs: 12, lg: 6 }}>
              <SectionCard title="اتجاه الأصناف — هذا الأسبوع vs السابق">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>الصنف</TableCell>
                      <TableCell align="left">الكمية</TableCell>
                      <TableCell align="left">السابق</TableCell>
                      <TableCell align="left">نمو</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(wowData?.productTrends ?? []).slice(0, 15).map((row: any) => (
                      <TableRow key={row.productId} hover>
                        <TableCell>{row.name}</TableCell>
                        <TableCell align="left">{row.qty}</TableCell>
                        <TableCell align="left">{row.prevQty ?? '—'}</TableCell>
                        <TableCell align="left">{formatPct(row.wowQtyPct)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </SectionCard>
            </Grid2>
          </Grid2>

          <SectionCard
            title="اقتراحات عروض (Bundling)"
            description="أصناف تُطلب معاً في نفس الفاتورة — آخر 365 يوم. السعر المقترح = 90% من مجموع السعرين."
            action={
              bundleData?.computedAt ? (
                <Stack direction="row" spacing={0.5}>
                  {bundleData.ordersAnalyzed != null ? (
                    <Chip size="small" label={`${bundleData.ordersAnalyzed} فاتورة`} />
                  ) : null}
                  <Chip size="small" label={`آخر تحديث: ${new Date(bundleData.computedAt).toLocaleString('ar-EG')}`} />
                </Stack>
              ) : bundleData?.ordersAnalyzed != null ? (
                <Chip size="small" label={`${bundleData.ordersAnalyzed} فاتورة مغلقة`} />
              ) : undefined
            }
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>الصنف أ</TableCell>
                  <TableCell>الصنف ب</TableCell>
                  <TableCell align="left">مرات معاً</TableCell>
                  <TableCell align="left">Lift</TableCell>
                  <TableCell align="left">Support</TableCell>
                  <TableCell align="left">سعر مقترح</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(bundleData?.suggestions ?? []).map((row: any) => (
                  <TableRow key={`${row.productAId}-${row.productBId}`} hover>
                    <TableCell>{row.productAName}</TableCell>
                    <TableCell>{row.productBName}</TableCell>
                    <TableCell align="left">{row.pairOrders}</TableCell>
                    <TableCell align="left">{row.lift.toFixed(2)}</TableCell>
                    <TableCell align="left">{(row.support * 100).toFixed(1)}%</TableCell>
                    <TableCell align="left">
                      {row.suggestedPrice != null ? `${row.suggestedPrice.toLocaleString('en-US')} ج.م` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!bundleData?.suggestions?.length ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {bundleData?.ordersAnalyzed
                  ? `تم تحليل ${bundleData.ordersAnalyzed} فاتورة مغلقة — لا توجد أزواج أصناف بمعايير كافية.`
                  : 'لا توجد اقتراحات كافية — يحتاج النظام المزيد من الفواتير المغلقة.'}
              </Typography>
            ) : null}
          </SectionCard>
        </>
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
