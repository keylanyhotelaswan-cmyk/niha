import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid2,
  InputAdornment,
  MenuItem,
  Paper,
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
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PageToolbar } from '../components/page-toolbar.js';
import { apiPost, API_BASE, parseApiErrorBody } from '../lib/api-client.js';
import { useAuth } from '../lib/auth-context.js';
import {
  useBranches,
  useCashBoxes,
  usePaymentMethods,
  usePurchaseOrders,
  useVendorAccountsContext,
  useVendorInvoices,
  useVendorPayments,
  useVendorStatement,
  useVendors,
  useWarehouses,
} from '../lib/hooks.js';
import { localMonthStartKey, localTodayKey } from '../lib/date-utils.js';
import { MetricCard, SectionCard } from './shared.js';
import { cardSx, ui } from '../lib/ui-tokens.js';
import { ExpensesTreasuryPanel } from './vendor-accounts/expenses-treasury-panel.js';

const ENTRY_LABELS: Record<string, string> = {
  INVOICE: 'فاتورة شراء',
  PAYMENT: 'دفعة',
  ADJUSTMENT: 'تسوية',
  OPENING: 'رصيد افتتاحي',
  CREDIT_NOTE: 'إشعار دائن',
};

const INVOICE_STATUS: Record<string, { label: string; color: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
  DRAFT: { label: 'مسودة', color: 'default' },
  POSTED: { label: 'مرحّلة', color: 'info' },
  PARTIALLY_PAID: { label: 'مدفوعة جزئياً', color: 'warning' },
  PAID: { label: 'مدفوعة', color: 'success' },
  VOIDED: { label: 'ملغاة', color: 'error' },
};

const SCENARIOS = [
  { title: 'مورد جديد + رصيد افتتاحي', desc: 'أضف المورد برصيد مستحق سابق — يظهر في كشف الحساب كرصيد افتتاحي.' },
  { title: 'أمر شراء → استلام', desc: 'استلام البضاعة يزيد المخزون ويُنشئ فاتورة AP تلقائياً على المورد.' },
  { title: 'فاتورة يدوية', desc: 'مشتريات/خدمات بدون مخزون — قيد AP مباشر.' },
  { title: 'دفعة من خزينة المصروفات', desc: 'تُخصم من رصيد EXPENSES حسب الوسيلة (نقدي/انستاباي…) — يقل AP ويظهر في الخزينة.' },
  { title: 'سداد فاتورة محددة', desc: 'اربط الدفعة بفاتورة — يُحدَّث paidAmount وحالة الفاتورة.' },
  { title: 'تسوية / إشعار دائن', desc: 'تصحيح رصيد المورد (زيادة أو تخفيض) بدون حركة خزينة.' },
  { title: 'إلغاء فاتورة', desc: 'فقط للفواتير بدون مدفوعات — يعكس قيد AP.' },
];

const PO_STATUS: Record<string, string> = {
  DRAFT: 'مسودة',
  ORDERED: 'مُرسَل',
  RECEIVED: 'مُستلم',
  CANCELLED: 'ملغى',
};

function fmt(n: number) {
  return `${n.toLocaleString('en-US')} ج.م`;
}

function apiActionError(res: { ok: boolean; status?: number; body?: string; error?: string }, fallback: string) {
  if (res.status === 404) {
    return `مسار الـ API غير موجود (${API_BASE}). أعد تشغيل الـ API: npm run dev:api — وتجنّب dev:desktop:cloud محلياً.`;
  }
  return parseApiErrorBody(res.body, res.error ?? fallback);
}

export function VendorAccountsPage() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const { data: branches = [] } = useBranches();
  const [branchId, setBranchId] = useState('');
  const effectiveBranchId = branchId || branches[0]?.id || '';

  const { data: vendors = [], isLoading, isError, error } = useVendors(effectiveBranchId, true);
  const { data: paymentMethods = [] } = usePaymentMethods(effectiveBranchId);
  const { data: cashBoxes = [] } = useCashBoxes(effectiveBranchId);
  const { data: warehouses = [] } = useWarehouses(effectiveBranchId);
  const { data: allPurchaseOrders = [], refetch: refetchPOs } = usePurchaseOrders(effectiveBranchId);

  const [vendorSearch, setVendorSearch] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState(0);
  const [fromDate, setFromDate] = useState(localMonthStartKey);
  const [toDate, setToDate] = useState(localTodayKey);
  const [showFlow, setShowFlow] = useState(false);

  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethodId, setPayMethodId] = useState('');
  const [payCashBoxId, setPayCashBoxId] = useState('');
  const [payInvoiceId, setPayInvoiceId] = useState('');
  const [payReference, setPayReference] = useState('');
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState('');

  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invDesc, setInvDesc] = useState('');
  const [invAmount, setInvAmount] = useState('');
  const [invBusy, setInvBusy] = useState(false);
  const [invError, setInvError] = useState('');

  const [vendorOpen, setVendorOpen] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [vendorCode, setVendorCode] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [vendorOpening, setVendorOpening] = useState('');
  const [vendorBusy, setVendorBusy] = useState(false);
  const [vendorError, setVendorError] = useState('');

  const [poMsg, setPoMsg] = useState('');

  const [adjOpen, setAdjOpen] = useState(false);
  const [adjCredit, setAdjCredit] = useState('');
  const [adjDebit, setAdjDebit] = useState('');
  const [adjNote, setAdjNote] = useState('');
  const [adjBusy, setAdjBusy] = useState(false);
  const [adjError, setAdjError] = useState('');

  const { data: apContext, refetch: refetchContext } = useVendorAccountsContext(effectiveBranchId, payCashBoxId || undefined);

  useEffect(() => {
    if (cashBoxes.length && !payCashBoxId) setPayCashBoxId(cashBoxes[0].id);
  }, [cashBoxes, payCashBoxId]);

  useEffect(() => {
    if (paymentMethods.length && !payMethodId) {
      const def = paymentMethods.find((pm: any) => pm.isDefault) ?? paymentMethods[0];
      if (def) setPayMethodId(def.id);
    }
  }, [paymentMethods, payMethodId]);

  const filteredVendors = useMemo(() => {
    const q = vendorSearch.trim().toLowerCase();
    const list = [...vendors].sort((a: any, b: any) => Number(b.currentBalance ?? 0) - Number(a.currentBalance ?? 0));
    if (!q) return list;
    return list.filter((v: any) => v.name.toLowerCase().includes(q) || v.code.toLowerCase().includes(q));
  }, [vendors, vendorSearch]);

  const totalPayableClient = useMemo(
    () => vendors.reduce((sum: number, v: any) => sum + Math.max(0, Number(v.currentBalance ?? 0)), 0),
    [vendors],
  );
  const vendorsWithDebtClient = useMemo(
    () => vendors.filter((v: any) => Number(v.currentBalance ?? 0) > 0.01).length,
    [vendors],
  );
  const totalPayable = Number(apContext?.summary?.totalPayable ?? totalPayableClient);
  const vendorsWithDebt = Number(apContext?.summary?.vendorsWithDebt ?? vendorsWithDebtClient);
  const unpaidInvoicesGlobal = Number(apContext?.summary?.unpaidInvoices ?? 0);
  const paymentsThisMonth = Number(apContext?.summary?.paymentsThisMonth ?? 0);
  const recentPayments = apContext?.recentPayments ?? [];

  const selectedPayMethod = paymentMethods.find((pm: any) => pm.id === payMethodId);
  const selectedPayMethodType = selectedPayMethod?.type as string | undefined;
  const payAmountNum = Number(payAmount) || 0;
  const expensesAvailableForPay = selectedPayMethodType
    ? Number(apContext?.treasury?.walletBalances?.[selectedPayMethodType]?.EXPENSES ?? 0)
    : Number(apContext?.treasury?.expensesSafe ?? 0);
  const payInsufficient = payAmountNum > 0 && payAmountNum > expensesAvailableForPay + 0.01;

  const selectedVendor = vendors.find((v: any) => v.id === selectedVendorId);
  const { data: statement, isFetching: statementLoading } = useVendorStatement(
    selectedVendorId ?? undefined,
    fromDate,
    toDate,
  );
  const { data: vendorInvoices = [] } = useVendorInvoices(effectiveBranchId, selectedVendorId ?? undefined);
  const { data: vendorPayments = [] } = useVendorPayments(effectiveBranchId, selectedVendorId ?? undefined);

  const vendorPOs = useMemo(
    () => allPurchaseOrders.filter((po: any) => po.vendorId === selectedVendorId),
    [allPurchaseOrders, selectedVendorId],
  );

  const unpaidInvoices = useMemo(
    () => vendorInvoices.filter(
      (inv: any) => inv.status !== 'VOIDED' && inv.status !== 'DRAFT' && Number(inv.totalAmount) > Number(inv.paidAmount),
    ),
    [vendorInvoices],
  );

  const invalidateVendor = () => {
    void queryClient.invalidateQueries({ queryKey: ['vendors'] });
    void queryClient.invalidateQueries({ queryKey: ['vendor-statement'] });
    void queryClient.invalidateQueries({ queryKey: ['vendor-invoices'] });
    void queryClient.invalidateQueries({ queryKey: ['vendor-payments'] });
    void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    void queryClient.invalidateQueries({ queryKey: ['vendor-accounts-context'] });
    void refetchContext();
  };

  const openPayDialog = (invoiceId?: string, amount?: number) => {
    setPayInvoiceId(invoiceId ?? '');
    setPayAmount(amount != null ? String(amount) : '');
    setPayReference('');
    setPayError('');
    setPayOpen(true);
  };

  const submitPayment = async () => {
    if (!accessToken || !selectedVendorId || !payMethodId) return;
    setPayBusy(true);
    setPayError('');
    const res = await apiPost(
      '/vendor-payments',
      {
        branchId: effectiveBranchId,
        vendorId: selectedVendorId,
        paymentMethodId: payMethodId,
        amount: Number(payAmount),
        ...(payCashBoxId ? { cashBoxId: payCashBoxId } : {}),
        ...(payInvoiceId ? { vendorInvoiceId: payInvoiceId } : {}),
        ...(payReference ? { reference: payReference } : {}),
      },
      accessToken,
    );
    setPayBusy(false);
    if (!res.ok) {
      setPayError(apiActionError(res, 'فشل تسجيل الدفعة'));
      return;
    }
    setPayOpen(false);
    setPayAmount('');
    setPayInvoiceId('');
    setPayReference('');
    invalidateVendor();
  };

  const submitManualInvoice = async () => {
    if (!accessToken || !selectedVendorId || !invDesc.trim()) return;
    setInvBusy(true);
    setInvError('');
    const res = await apiPost(
      '/vendor-invoices',
      {
        branchId: effectiveBranchId,
        vendorId: selectedVendorId,
        post: true,
        lines: [{ description: invDesc.trim(), lineTotal: Number(invAmount) }],
      },
      accessToken,
    );
    setInvBusy(false);
    if (!res.ok) {
      setInvError(apiActionError(res, 'فشل إنشاء الفاتورة'));
      return;
    }
    setInvoiceOpen(false);
    setInvDesc('');
    setInvAmount('');
    invalidateVendor();
  };

  const submitVendor = async () => {
    if (!accessToken || !vendorName.trim() || !effectiveBranchId) return;
    setVendorBusy(true);
    setVendorError('');
    const res = await apiPost(
      '/vendors',
      {
        branchId: effectiveBranchId,
        name: vendorName.trim(),
        code: vendorCode.trim() || vendorName.trim().slice(0, 6).toUpperCase(),
        ...(vendorPhone.trim() ? { phone: vendorPhone.trim() } : {}),
        ...(vendorOpening ? { openingBalance: Number(vendorOpening) } : {}),
      },
      accessToken,
    );
    setVendorBusy(false);
    if (!res.ok) {
      setVendorError(apiActionError(res, 'فشل إضافة المورد'));
      return;
    }
    setVendorOpen(false);
    setVendorName('');
    setVendorCode('');
    setVendorPhone('');
    setVendorOpening('');
    invalidateVendor();
  };

  const voidInvoice = async (invoiceId: string) => {
    if (!accessToken || !window.confirm('إلغاء هذه الفاتورة؟')) return;
    const res = await apiPost(`/vendor-invoices/${invoiceId}/void`, {}, accessToken);
    if (!res.ok) {
      setInvError(apiActionError(res, 'فشل إلغاء الفاتورة'));
      return;
    }
    invalidateVendor();
  };

  const submitAdjustment = async () => {
    if (!accessToken || !selectedVendorId) return;
    const credit = Number(adjCredit) || 0;
    const debit = Number(adjDebit) || 0;
    if (credit <= 0 && debit <= 0) {
      setAdjError('أدخل مبلغ تسوية (دائن أو مدين)');
      return;
    }
    setAdjBusy(true);
    setAdjError('');
    const res = await apiPost(
      '/vendor-accounts/adjustments',
      {
        branchId: effectiveBranchId,
        vendorId: selectedVendorId,
        ...(credit > 0 ? { credit } : {}),
        ...(debit > 0 ? { debit } : {}),
        ...(adjNote.trim() ? { note: adjNote.trim() } : {}),
      },
      accessToken,
    );
    setAdjBusy(false);
    if (!res.ok) {
      setAdjError(apiActionError(res, 'فشل التسوية'));
      return;
    }
    setAdjOpen(false);
    setAdjCredit('');
    setAdjDebit('');
    setAdjNote('');
    invalidateVendor();
  };

  const receivePO = async (poId: string) => {
    if (!accessToken || !warehouses[0]) {
      setPoMsg('أضف مخزناً أولاً من صفحة المخزون.');
      return;
    }
    setPoMsg('');
    const res = await apiPost(`/purchase-orders/${poId}/receive`, { warehouseId: warehouses[0].id }, accessToken);
    if (!res.ok) {
      setPoMsg(apiActionError(res, 'فشل استلام البضاعة'));
      return;
    }
    setPoMsg('تم الاستلام — أُنشئت فاتورة شراء على حساب المورد تلقائياً.');
    invalidateVendor();
    void refetchPOs();
  };

  return (
    <Stack spacing={2}>
      <PageToolbar
        title="حسابات الموردين"
        subtitle="مركز واحد للموردين، فواتير الشراء، المدفوعات، وربط خزينة المصروفات — منفصل عن مبيعات POS."
      />

      <Alert
        severity="info"
        action={
          <Button color="inherit" size="small" onClick={() => setShowFlow((v) => !v)}>
            {showFlow ? 'إخفاء' : 'كيف يعمل؟'}
          </Button>
        }
      >
        <strong>مربوط بخزينة المصروفات (EXPENSES)</strong> — كل دفعة مورد تُسجَّل في دفتر AP + حركة خزينة مصروفات، بدون ربط بوردية POS.
      </Alert>

      {showFlow ? (
        <SectionCard title="جميع السيناريوهات" compact>
          <Grid2 container spacing={1.5}>
            {SCENARIOS.map((s) => (
              <Grid2 key={s.title} size={{ xs: 12, sm: 6, md: 4 }}>
                <Paper elevation={0} sx={{ ...cardSx, p: 1.5, height: '100%' }}>
                  <Typography fontWeight={700} variant="body2" sx={{ mb: 0.5 }}>{s.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{s.desc}</Typography>
                </Paper>
              </Grid2>
            ))}
          </Grid2>
        </SectionCard>
      ) : null}

      <SectionCard title="خزينة المصروفات — مصدر الدفع" compact>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
            <TextField
              select
              label="صندوق الخزينة"
              size="small"
              value={payCashBoxId}
              onChange={(e) => setPayCashBoxId(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              {cashBoxes.map((cb: any) => (
                <MenuItem key={cb.id} value={cb.id}>{cb.name}</MenuItem>
              ))}
            </TextField>
            <Typography variant="caption" color="text.secondary">
              الرصيد المعروض تراكمي (approved) — يُخصم منه عند كل دفعة مورد
            </Typography>
          </Stack>
          <ExpensesTreasuryPanel treasury={apContext?.treasury} />
        </Stack>
      </SectionCard>

      <Grid2 container spacing={1.5}>
        <Grid2 size={{ xs: 6, sm: 3 }}>
          <MetricCard label="مستحق للموردين (AP)" value={fmt(totalPayable)} note={`${vendorsWithDebt} مورد`} />
        </Grid2>
        <Grid2 size={{ xs: 6, sm: 3 }}>
          <MetricCard label="خزينة المصروفات" value={fmt(Number(apContext?.treasury?.expensesSafe ?? 0))} note="EXPENSES · متاح للصرف" />
        </Grid2>
        <Grid2 size={{ xs: 6, sm: 3 }}>
          <MetricCard label="فواتير غير مسددة" value={String(unpaidInvoicesGlobal)} note="كل الفروع" />
        </Grid2>
        <Grid2 size={{ xs: 6, sm: 3 }}>
          <MetricCard label="مدفوعات الشهر" value={fmt(paymentsThisMonth)} note={`${apContext?.summary?.paymentsCountThisMonth ?? 0} دفعة`} />
        </Grid2>
      </Grid2>

      {recentPayments.length ? (
        <SectionCard title="آخر مدفوعات الموردين" compact>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>التاريخ</TableCell>
                <TableCell>المورد</TableCell>
                <TableCell>الوسيلة</TableCell>
                <TableCell align="left">المبلغ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentPayments.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>{new Date(p.paidAt).toLocaleDateString('ar-EG')}</TableCell>
                  <TableCell>{p.vendorName}</TableCell>
                  <TableCell>{p.paymentMethod ?? '—'}</TableCell>
                  <TableCell align="left" sx={{ fontWeight: 700 }}>{fmt(Number(p.amount))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      ) : null}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center">
        {branches.length > 1 ? (
          <TextField select label="الفرع" size="small" value={effectiveBranchId} onChange={(e) => setBranchId(e.target.value)} sx={{ minWidth: 180 }}>
            {branches.map((b: any) => (
              <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
            ))}
          </TextField>
        ) : null}
        <Button variant="contained" onClick={() => setVendorOpen(true)}>+ مورد جديد</Button>
      </Stack>

      <Grid2 container spacing={2}>
        <Grid2 size={{ xs: 12, md: 4, lg: 3 }}>
          <SectionCard title="الموردون" compact>
            <TextField
              size="small"
              fullWidth
              placeholder="بحث بالاسم أو الكود…"
              value={vendorSearch}
              onChange={(e) => setVendorSearch(e.target.value)}
              sx={{ mb: 1.5 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Typography variant="body2" color="text.secondary">⌕</Typography>
                  </InputAdornment>
                ),
              }}
            />
            {isError ? (
              <Alert severity="error" sx={{ mb: 1 }}>
                {error instanceof Error ? error.message : 'تعذّر تحميل الموردين'}
              </Alert>
            ) : null}
            {isLoading ? (
              <Typography variant="body2" color="text.secondary">جاري التحميل…</Typography>
            ) : !filteredVendors.length ? (
              <Typography variant="body2" color="text.secondary">لا يوجد موردون. أضف مورداً جديداً.</Typography>
            ) : (
              <Stack spacing={0.75} sx={{ maxHeight: 520, overflow: 'auto' }}>
                {filteredVendors.map((v: any) => {
                  const bal = Number(v.currentBalance ?? 0);
                  return (
                    <Paper
                      key={v.id}
                      elevation={0}
                      onClick={() => { setSelectedVendorId(v.id); setDetailTab(0); }}
                      sx={{
                        ...cardSx,
                        p: 1.5,
                        cursor: 'pointer',
                        border: selectedVendorId === v.id ? `2px solid ${ui.primary}` : `1px solid ${ui.border}`,
                        bgcolor: selectedVendorId === v.id ? ui.primaryBg : ui.paper,
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                        <Box minWidth={0}>
                          <Typography fontWeight={700} noWrap>{v.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{v.code}{v.phone ? ` · ${v.phone}` : ''}</Typography>
                        </Box>
                        <Stack alignItems="flex-end" spacing={0.25}>
                          <Typography fontWeight={700} color={bal > 0 ? 'warning.main' : 'text.secondary'} sx={{ fontSize: '0.9rem' }}>
                            {fmt(bal)}
                          </Typography>
                          {bal > 0 ? <Chip size="small" label="مستحق" color="warning" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} /> : null}
                        </Stack>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </SectionCard>
        </Grid2>

        <Grid2 size={{ xs: 12, md: 8, lg: 9 }}>
          {!selectedVendor ? (
            <SectionCard title="مساحة العمل" compact>
              <Typography variant="body2" color="text.secondary">
                اختر مورداً من القائمة لعرض كشف حسابه، فواتيره، مدفوعاته، وأوامر الشراء.
              </Typography>
            </SectionCard>
          ) : (
            <Stack spacing={2}>
              <Paper elevation={0} sx={{ ...cardSx, px: 2, pt: 1 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1} sx={{ mb: 1 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={800}>{selectedVendor.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      الرصيد الحالي: <strong>{fmt(Number(selectedVendor.currentBalance ?? 0))}</strong>
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button size="small" variant="outlined" onClick={() => setInvoiceOpen(true)}>فاتورة يدوية</Button>
                    <Button size="small" variant="outlined" onClick={() => setAdjOpen(true)}>تسوية</Button>
                    <Button size="small" variant="contained" onClick={() => openPayDialog()}>تسجيل دفعة</Button>
                  </Stack>
                </Stack>
                <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)} variant="scrollable" scrollButtons="auto">
                  <Tab label="كشف حساب" />
                  <Tab label={`فواتير (${vendorInvoices.length})`} />
                  <Tab label={`مدفوعات (${vendorPayments.length})`} />
                  <Tab label={`أوامر شراء (${vendorPOs.length})`} />
                </Tabs>
              </Paper>

              {detailTab === 0 ? (
                <SectionCard title="كشف الحساب" compact>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
                    <TextField label="من" type="date" size="small" value={fromDate} onChange={(e) => setFromDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                    <TextField label="إلى" type="date" size="small" value={toDate} onChange={(e) => setToDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                  </Stack>
                  {statement?.summary ? (
                    <Grid2 container spacing={1.5} sx={{ mb: 2 }}>
                      <Grid2 size={{ xs: 6, sm: 3 }}><MetricCard label="رصيد افتتاحي" value={fmt(statement.summary.openingBalance)} /></Grid2>
                      <Grid2 size={{ xs: 6, sm: 3 }}><MetricCard label="مشتريات" value={fmt(statement.summary.purchases)} /></Grid2>
                      <Grid2 size={{ xs: 6, sm: 3 }}><MetricCard label="مدفوعات" value={fmt(statement.summary.payments)} /></Grid2>
                      <Grid2 size={{ xs: 6, sm: 3 }}><MetricCard label="الرصيد الحالي" value={fmt(statement.summary.closingBalance)} /></Grid2>
                    </Grid2>
                  ) : null}
                  {statementLoading ? (
                    <Typography variant="body2" color="text.secondary">جاري تحميل الحركات…</Typography>
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>التاريخ</TableCell>
                          <TableCell>النوع</TableCell>
                          <TableCell>مرجع</TableCell>
                          <TableCell align="left">مدين</TableCell>
                          <TableCell align="left">دائن</TableCell>
                          <TableCell align="left">الرصيد</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(statement?.lines ?? []).map((line: any) => (
                          <TableRow key={line.id}>
                            <TableCell>{new Date(line.date).toLocaleDateString('ar-EG')}</TableCell>
                            <TableCell>{ENTRY_LABELS[line.type] ?? line.type}</TableCell>
                            <TableCell>{line.reference ?? '—'}</TableCell>
                            <TableCell align="left">{line.debit > 0 ? fmt(line.debit) : '—'}</TableCell>
                            <TableCell align="left">{line.credit > 0 ? fmt(line.credit) : '—'}</TableCell>
                            <TableCell align="left" sx={{ fontWeight: 700 }}>{fmt(line.balanceAfter)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </SectionCard>
              ) : null}

              {detailTab === 1 ? (
                <SectionCard title="فواتير الشراء" compact>
                  {!vendorInvoices.length ? (
                    <Typography variant="body2" color="text.secondary">لا توجد فواتير. تُنشأ تلقائياً عند استلام أمر شراء.</Typography>
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>رقم الفاتورة</TableCell>
                          <TableCell>التاريخ</TableCell>
                          <TableCell>الحالة</TableCell>
                          <TableCell align="left">الإجمالي</TableCell>
                          <TableCell align="left">المدفوع</TableCell>
                          <TableCell align="left">المتبقي</TableCell>
                          <TableCell />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {vendorInvoices.map((inv: any) => {
                          const remaining = Number(inv.totalAmount) - Number(inv.paidAmount);
                          const st = INVOICE_STATUS[inv.status] ?? { label: inv.status, color: 'default' as const };
                          return (
                            <TableRow key={inv.id}>
                              <TableCell>{inv.invoiceNumber}</TableCell>
                              <TableCell>{new Date(inv.invoiceDate).toLocaleDateString('ar-EG')}</TableCell>
                              <TableCell><Chip size="small" label={st.label} color={st.color} variant="outlined" /></TableCell>
                              <TableCell align="left">{fmt(Number(inv.totalAmount))}</TableCell>
                              <TableCell align="left">{fmt(Number(inv.paidAmount))}</TableCell>
                              <TableCell align="left" sx={{ fontWeight: 700 }}>{remaining > 0.01 ? fmt(remaining) : '—'}</TableCell>
                              <TableCell align="left">
                                <Stack direction="row" spacing={0.5}>
                                  {remaining > 0.01 && inv.status !== 'VOIDED' ? (
                                    <Button size="small" onClick={() => openPayDialog(inv.id, remaining)}>سداد</Button>
                                  ) : null}
                                  {Number(inv.paidAmount) <= 0 && inv.status !== 'VOIDED' && inv.status !== 'DRAFT' ? (
                                    <Button size="small" color="error" onClick={() => void voidInvoice(inv.id)}>إلغاء</Button>
                                  ) : null}
                                </Stack>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </SectionCard>
              ) : null}

              {detailTab === 2 ? (
                <SectionCard title="مدفوعات المورد" compact>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    كل دفعة هنا تُسجَّل أيضاً في <strong>خزينة المصروفات</strong> (TreasuryTransaction · VENDOR_PAYMENT) — تظهر في صفحة الخزينة.
                  </Alert>
                  {!vendorPayments.length ? (
                    <Typography variant="body2" color="text.secondary">لا توجد مدفوعات بعد.</Typography>
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>التاريخ</TableCell>
                          <TableCell>المبلغ</TableCell>
                          <TableCell>الوسيلة</TableCell>
                          <TableCell>فاتورة</TableCell>
                          <TableCell>مرجع</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {vendorPayments.map((p: any) => (
                          <TableRow key={p.id}>
                            <TableCell>{new Date(p.paidAt).toLocaleDateString('ar-EG')}</TableCell>
                            <TableCell align="left" sx={{ fontWeight: 700 }}>{fmt(Number(p.amount))}</TableCell>
                            <TableCell>{p.paymentMethod?.name ?? p.paymentMethod?.type ?? '—'}</TableCell>
                            <TableCell>{p.vendorInvoice?.invoiceNumber ?? '—'}</TableCell>
                            <TableCell>{p.reference ?? '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </SectionCard>
              ) : null}

              {detailTab === 3 ? (
                <SectionCard title="أوامر الشراء" compact>
                  {poMsg ? <Alert severity={poMsg.includes('فشل') ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setPoMsg('')}>{poMsg}</Alert> : null}
                  {!vendorPOs.length ? (
                    <Typography variant="body2" color="text.secondary">
                      لا توجد أوامر شراء. أنشئ أمر شراء من صفحة المخزون → المشتريات.
                    </Typography>
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>رقم الأمر</TableCell>
                          <TableCell>الحالة</TableCell>
                          <TableCell align="left">الإجراء</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {vendorPOs.map((po: any) => (
                          <TableRow key={po.id}>
                            <TableCell>{po.orderNumber}</TableCell>
                            <TableCell><Chip size="small" label={PO_STATUS[po.status] ?? po.status} /></TableCell>
                            <TableCell align="left">
                              {po.status !== 'RECEIVED' && po.status !== 'CANCELLED' ? (
                                <Button size="small" variant="outlined" onClick={() => void receivePO(po.id)}>
                                  استلام → فاتورة AP
                                </Button>
                              ) : (
                                <Typography variant="caption" color="text.secondary">—</Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </SectionCard>
              ) : null}
            </Stack>
          )}
        </Grid2>
      </Grid2>

      <Dialog open={payOpen} onClose={() => setPayOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تسجيل دفعة — {selectedVendor?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <ExpensesTreasuryPanel
              treasury={apContext?.treasury}
              payAmount={payAmountNum}
              {...(selectedPayMethodType ? { payMethodType: selectedPayMethodType } : {})}
              compact
            />
            {payError ? <Alert severity="error">{payError}</Alert> : null}
            <TextField label="المبلغ" type="number" size="small" fullWidth value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            <TextField select label="وسيلة الدفع" size="small" fullWidth value={payMethodId} onChange={(e) => setPayMethodId(e.target.value)}>
              {paymentMethods.map((pm: any) => {
                const avail = Number(apContext?.treasury?.walletBalances?.[pm.type]?.EXPENSES ?? 0);
                return (
                  <MenuItem key={pm.id} value={pm.id}>
                    {pm.name ?? pm.type} · متاح {fmt(avail)}
                  </MenuItem>
                );
              })}
            </TextField>
            <TextField select label="صندوق / نقطة الخزينة" size="small" fullWidth value={payCashBoxId} onChange={(e) => setPayCashBoxId(e.target.value)}>
              {cashBoxes.map((cb: any) => (
                <MenuItem key={cb.id} value={cb.id}>{cb.name}</MenuItem>
              ))}
            </TextField>
            <TextField select label="ربط بفاتورة (اختياري)" size="small" fullWidth value={payInvoiceId} onChange={(e) => {
              const id = e.target.value;
              setPayInvoiceId(id);
              const inv = unpaidInvoices.find((i: any) => i.id === id);
              if (inv) setPayAmount(String(Number(inv.totalAmount) - Number(inv.paidAmount)));
            }}>
              <MenuItem value="">— بدون —</MenuItem>
              {unpaidInvoices.map((inv: any) => (
                <MenuItem key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} · متبقي {fmt(Number(inv.totalAmount) - Number(inv.paidAmount))}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="مرجع / ملاحظة" size="small" fullWidth value={payReference} onChange={(e) => setPayReference(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={payBusy || !payAmount || !payMethodId || payInsufficient}
            onClick={() => void submitPayment()}
          >
            {payBusy ? 'جاري الحفظ…' : payInsufficient ? 'رصيد غير كافٍ' : 'تسجيل الدفعة'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={invoiceOpen} onClose={() => setInvoiceOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>فاتورة يدوية — {selectedVendor?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {invError ? <Alert severity="error">{invError}</Alert> : null}
            <TextField label="الوصف" size="small" fullWidth value={invDesc} onChange={(e) => setInvDesc(e.target.value)} />
            <TextField label="المبلغ" type="number" size="small" fullWidth value={invAmount} onChange={(e) => setInvAmount(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInvoiceOpen(false)}>إلغاء</Button>
          <Button variant="contained" disabled={invBusy || !invDesc || !invAmount} onClick={() => void submitManualInvoice()}>
            {invBusy ? 'جاري الحفظ…' : 'حفظ وترحيل'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={adjOpen} onClose={() => setAdjOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>تسوية حساب — {selectedVendor?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="warning">التسوية تعدّل رصيد AP فقط — بدون حركة خزينة.</Alert>
            {adjError ? <Alert severity="error">{adjError}</Alert> : null}
            <TextField label="زيادة مستحق (دائن)" type="number" size="small" fullWidth value={adjCredit} onChange={(e) => setAdjCredit(e.target.value)} helperText="يزيد ما ندين به للمورد" />
            <TextField label="تخفيض مستحق (مدين)" type="number" size="small" fullWidth value={adjDebit} onChange={(e) => setAdjDebit(e.target.value)} helperText="إشعار دائن / خصم" />
            <TextField label="ملاحظة" size="small" fullWidth value={adjNote} onChange={(e) => setAdjNote(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjOpen(false)}>إلغاء</Button>
          <Button variant="contained" disabled={adjBusy} onClick={() => void submitAdjustment()}>
            {adjBusy ? 'جاري الحفظ…' : 'تسجيل التسوية'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={vendorOpen} onClose={() => setVendorOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>مورد جديد</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {vendorError ? <Alert severity="error">{vendorError}</Alert> : null}
            <TextField label="اسم المورد" size="small" fullWidth required value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
            <TextField label="الكود" size="small" fullWidth value={vendorCode} onChange={(e) => setVendorCode(e.target.value)} placeholder="يُولَّد تلقائياً إن تُرك فارغاً" />
            <TextField label="الهاتف" size="small" fullWidth value={vendorPhone} onChange={(e) => setVendorPhone(e.target.value)} />
            <TextField label="رصيد افتتاحي (اختياري)" type="number" size="small" fullWidth value={vendorOpening} onChange={(e) => setVendorOpening(e.target.value)} helperText="مبلغ مستحق للمورد قبل بدء النظام" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVendorOpen(false)}>إلغاء</Button>
          <Button variant="contained" disabled={vendorBusy || !vendorName.trim()} onClick={() => void submitVendor()}>
            {vendorBusy ? 'جاري الحفظ…' : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
