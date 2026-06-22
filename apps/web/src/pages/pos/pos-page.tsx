import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { SavedOrder } from '../../lib/pos-store.js';
import { buildReceiptFromSavedOrder, printPosReceipt, type PrintCopies } from '../../lib/pos-receipt.js';
import { isPrintBridgeOnline } from '../../lib/pos-print-bridge.js';
import { getReceiptSettings } from '../../lib/pos-receipt-settings.js';
import { OrderAuditDialog } from './components/order-audit-dialog.js';
import { OrderSummaryDialog } from './components/order-summary-dialog.js';
import { OrderEditDialog, type OrderAmendPayload } from './components/order-edit-dialog.js';
import { itemNoteForApi } from '../../lib/pos-order-sauces.js';
import { apiAmendOrder, apiCancelClosedOrder, apiPendingCashHandoff, apiRequestCancelOrder, apiUncollectOrder, apiWithdrawCancelRequest } from '../../lib/api.js';
import { parseApiErrorBody } from '../../lib/api-client.js';
import { patchShiftOrderRemoved, patchShiftOrderUncollected } from '../../lib/hooks.js';
import { ShiftCloseDialog } from '../treasury-workspace/components/shift-close-dialog.js';
import { ShiftSummaryPreviewDialog } from '../treasury-workspace/components/shift-summary-preview-dialog.js';
import type { ShiftSummaryPrintParams } from '../../lib/shift-summary-print.js';
import { formatShiftDuration, formatShiftOpenedAt } from '../../lib/shift-summary-utils.js';
import { ALL_CATEGORIES, type PaymentMethodOption } from './constants.js';
import { getStoreBranding } from '../../lib/pos-receipt.js';
import { OrderModal } from './components/order-modal.js';
import { PosKpiGrid } from './components/pos-kpi-grid.js';
import { PrintSetupDialog } from './components/print-setup-dialog.js';
import { ShiftOrdersSection } from './components/shift-orders-section.js';
import { SuspendedSection } from './components/suspended-section.js';
import { usePosCatalog } from './use-pos-catalog.js';
import { usePosOrderSession } from './use-pos-order-session.js';
import { usePosExpenseStock, usePosWorkspace } from './use-pos-workspace.js';
import { formatCurrency } from './utils.js';
import { localTodayKey } from '../../lib/date-utils.js';
import { useAuth } from '../../lib/auth-context.js';
import { canManagePosPrinting, hasPermission } from '../../lib/permissions.js';
import { useDesktopUpdate } from '../../hooks/use-desktop-update.js';
import { useDesktopVersion } from '../../hooks/use-desktop-version.js';

export function PosPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const fullScreenModal = useMediaQuery(theme.breakpoints.down('md'));
  const { permissions } = useAuth();
  const { label: desktopUpdateLabel } = useDesktopUpdate();
  const desktopVersion = useDesktopVersion();
  const workspace = usePosWorkspace();
  const canManagePrint = canManagePosPrinting(permissions);
  const canUsePrint = workspace.printingEnabled;
  const canTreasury = hasPermission(permissions, 'shifts.access');
  const catalog = usePosCatalog(workspace.effectiveBranchId, workspace.accessToken);
  const [snack, setSnack] = useState('');
  const order = usePosOrderSession(workspace, {
    paymentMethods: catalog.paymentMethods,
    setActiveCategory: catalog.setActiveCategory,
    onNotify: (msg) => setSnack(msg),
  });

  const [shiftOrdersTab, setShiftOrdersTab] = useState<'uncollected' | 'collected'>('uncollected');
  const [shiftOpenDialog, setShiftOpenDialog] = useState(false);
  const [shiftCloseDialog, setShiftCloseDialog] = useState(false);
  const [openingFloat, setOpeningFloat] = useState('0');
  const [pendingCashHandoff, setPendingCashHandoff] = useState<{
    handedByName: string | null;
    cashAmount: number;
    fromShiftNumber: string;
    uncollectedCount: number;
  } | null>(null);
  const [collectOpen, setCollectOpen] = useState(false);
  const [collectOrder, setCollectOrder] = useState<SavedOrder | null>(null);
  const [collectPayment, setCollectPayment] = useState('cash');
  const [collectBusy, setCollectBusy] = useState(false);
  const [collectError, setCollectError] = useState('');
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const collectInFlight = useRef(false);
  const queryClient = useQueryClient();
  const [printSetupOpen, setPrintSetupOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseKind, setExpenseKind] = useState<'GENERAL' | 'ITEM'>('GENERAL');
  const [expenseAmount, setExpenseAmount] = useState('0');
  const [expenseNote, setExpenseNote] = useState('');
  const [expenseStockItemId, setExpenseStockItemId] = useState('');
  const [expenseQty, setExpenseQty] = useState('0');
  const [expenseUnitPrice, setExpenseUnitPrice] = useState('0');
  const [auditOrder, setAuditOrder] = useState<SavedOrder | null>(null);
  const [summaryOrder, setSummaryOrder] = useState<SavedOrder | null>(null);
  const [editOrder, setEditOrder] = useState<SavedOrder | null>(null);
  const [summaryPreviewOpen, setSummaryPreviewOpen] = useState(false);
  const deliveryDrivers = getReceiptSettings().deliveryDrivers;

  const { data: stockItems = [] } = usePosExpenseStock(workspace.effectiveBranchId, expenseOpen && expenseKind === 'ITEM');

  useEffect(() => {
    if (workspace.shiftOpen && canUsePrint) {
      void isPrintBridgeOnline();
    }
  }, [workspace.shiftOpen, canUsePrint]);

  useEffect(() => {
    if (!shiftOpenDialog || !workspace.accessToken || !workspace.resolvedCashBoxId) {
      setPendingCashHandoff(null);
      return;
    }
    void apiPendingCashHandoff(workspace.resolvedCashBoxId, workspace.accessToken).then((res) => {
      if (res.ok && res.data) {
        setPendingCashHandoff({
          handedByName: res.data.handedByName,
          cashAmount: res.data.cashAmount,
          fromShiftNumber: res.data.fromShiftNumber,
          uncollectedCount: res.data.uncollectedCount,
        });
        setOpeningFloat(String(res.data.cashAmount));
      } else {
        setPendingCashHandoff(null);
      }
    });
  }, [shiftOpenDialog, workspace.accessToken, workspace.resolvedCashBoxId]);

  const cartQtyMap = useMemo(() => {
    const m = new Map<string, number>();
    order.cartItems.forEach((i) => m.set(i.productId, i.quantity));
    return m;
  }, [order.cartItems]);

  const notify = (msg: string) => setSnack(msg);

  const shiftSummaryPreviewParams: ShiftSummaryPrintParams | null = workspace.shiftOpen && workspace.posSummary ? {
    shiftNumber: workspace.shift?.shiftNumber,
    cashierName: workspace.shiftOperatorName,
    openedAt: workspace.shift?.openedAt,
    summary: {
      ...workspace.posSummary,
      uncollectedCount: workspace.posSummary.uncollectedCount ?? workspace.uncollectedOrders.length,
      uncollectedTotal: workspace.posSummary.uncollectedTotal ?? workspace.uncollectedAmount,
      uncollectedOrders: workspace.posSummary.uncollectedOrders ?? workspace.uncollectedOrders.map((o) => ({
        orderNumber: o.code,
        total: o.total,
        customerName: o.ownerName || null,
      })),
    },
  } : null;

  const openShiftSummaryPreview = () => {
    if (!shiftSummaryPreviewParams) return;
    setSummaryPreviewOpen(true);
  };

  const paymentLabel = (id: string) => catalog.paymentMethods.find((m) => m.id === id)?.label ?? id;

  const handlePrintResult = (printRes: { ok: boolean; message?: string; reason?: string; copies?: string; method?: string }) => {
    if (printRes.ok) {
      const label = printRes.copies === 'customer' ? 'نسخة الزبون' : printRes.copies === 'kitchen' ? 'نسخة المطبخ' : 'نسخة الشيف + الزبون';
      const via = printRes.method === 'bridge' ? 'Print Bridge' : 'QZ';
      notify(`تمت الطباعة الصامتة (${label}) عبر ${via}`);
      return;
    }
    notify(printRes.message ?? 'فشل الطباعة');
    if (printRes.reason && canUsePrint) setPrintSetupOpen(true);
  };

  const handleReprint = async (savedOrder: SavedOrder, copies: PrintCopies) => {
    if (!canUsePrint) return;
    const brand = getStoreBranding();
    const receipt = buildReceiptFromSavedOrder(savedOrder, {
      storeName: brand.storeName,
      storeSubtitle: brand.storeSubtitle,
      storeFooter: brand.storeFooter,
      storePhone: brand.storePhone,
      cashierName: workspace.shiftOperatorName,
      paymentMethodLabel: paymentLabel(savedOrder.paymentMethod),
      shiftNumber: workspace.shift?.shiftNumber != null ? String(workspace.shift.shiftNumber) : '1',
      isPaid: savedOrder.collectionStatus !== 'uncollected',
    });
    const printRes = await printPosReceipt(receipt, { force: true, silent: true, copies });
    handlePrintResult(printRes);
  };

  const handleAmendOrder = async (payload: OrderAmendPayload) => {
    if (!editOrder || !workspace.accessToken) {
      return { ok: false, error: 'غير مسجل' };
    }
    const res = await apiAmendOrder(editOrder.id, {
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      customerAddress: payload.customerAddress,
      captainName: payload.captainName,
      note: payload.note,
      items: payload.items.map((item) => {
        const note = itemNoteForApi(item);
        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          ...(note ? { note } : {}),
        };
      }),
    }, workspace.accessToken);
    if (!res.ok) {
      return { ok: false, error: parseApiErrorBody(res.body, res.error ?? 'فشل حفظ التعديل') };
    }
    await workspace.refreshAfterOrder();
    notify(`تم تعديل طلب ${editOrder.code}`);
    return { ok: true };
  };

  const handleUncollect = async (order: SavedOrder) => {
    const token = workspace.accessToken;
    if (!token) return;
    const shiftId = workspace.effectiveShiftId;
    if (shiftId) patchShiftOrderUncollected(queryClient, shiftId, order.id);
    notify(`تم إرجاع ${order.code} إلى غير مدفوع`);
    void (async () => {
      const res = await apiUncollectOrder(order.id, token);
      if (!res.ok) {
        notify(parseApiErrorBody(res.body, res.error ?? 'فشل التراجع'));
        void workspace.refreshAfterOrder(shiftId);
      } else {
        void workspace.refreshAfterOrder(shiftId);
      }
    })();
  };

  const handleCancel = async (order: SavedOrder, reason: string) => {
    const token = workspace.accessToken;
    if (!token) return;
    const shiftId = workspace.effectiveShiftId;
    if (shiftId) patchShiftOrderRemoved(queryClient, shiftId, order.id);
    notify(`تم إلغاء ${order.code}`);
    void (async () => {
      const res = await apiCancelClosedOrder(order.id, reason || undefined, token);
      if (!res.ok) {
        notify(parseApiErrorBody(res.body, res.error ?? 'فشل الإلغاء'));
        void workspace.refreshAfterOrder(shiftId);
      } else {
        void workspace.refreshAfterOrder(shiftId);
      }
    })();
  };

  const handleRequestCancel = async (order: SavedOrder, reason: string) => {
    const token = workspace.accessToken;
    if (!token) return;
    notify(`تم إرسال طلب إلغاء ${order.code} للمدير`);
    void (async () => {
      const res = await apiRequestCancelOrder(order.id, reason || undefined, token);
      if (!res.ok) {
        notify(parseApiErrorBody(res.body, res.error ?? 'فشل طلب الإلغاء'));
      }
      void workspace.refreshAfterOrder(workspace.effectiveShiftId);
    })();
  };

  const handleWithdrawCancel = async (order: SavedOrder) => {
    const token = workspace.accessToken;
    if (!token) return;
    notify(`تم سحب طلب إلغاء ${order.code}`);
    void (async () => {
      const res = await apiWithdrawCancelRequest(order.id, token);
      if (!res.ok) {
        notify(parseApiErrorBody(res.body, res.error ?? 'فشل سحب الطلب'));
      }
      void workspace.refreshAfterOrder(workspace.effectiveShiftId);
    })();
  };

  const runCollect = async (withPrint: boolean) => {
    if (!collectOrder || collectInFlight.current) return;
    collectInFlight.current = true;
    setCollectBusy(true);
    setCollectError('');
    const order = collectOrder;
    const payment = collectPayment;
    setPendingOrderId(order.id);
    try {
      const res = await workspace.collectOrder(order, payment);
      if (!res.ok) {
        setCollectError(parseApiErrorBody((res as any).body, (res as any).error ?? 'فشل التحصيل'));
        notify(parseApiErrorBody((res as any).body, (res as any).error ?? 'فشل التحصيل'));
        return;
      }
      setCollectOpen(false);
      setCollectOrder(null);
      notify(`تم تحصيل ${order.code} في الدرج`);
      if (withPrint && canUsePrint) {
        const brand = getStoreBranding();
        const receipt = buildReceiptFromSavedOrder(order, {
          storeName: brand.storeName,
          storeSubtitle: brand.storeSubtitle,
          storeFooter: brand.storeFooter,
          storePhone: brand.storePhone,
          cashierName: workspace.shiftOperatorName,
          paymentMethodLabel: paymentLabel(payment),
          shiftNumber: workspace.shift?.shiftNumber != null ? String(workspace.shift.shiftNumber) : '1',
          isPaid: true,
        });
        const printRes = await printPosReceipt(receipt, { force: true, silent: true, copies: 'customer' });
        handlePrintResult(printRes);
      }
    } finally {
      collectInFlight.current = false;
      setCollectBusy(false);
      setPendingOrderId(null);
    }
  };

  const shiftKnown = !workspace.shiftStatusPending;
  const shiftLikelyOpen = workspace.shiftOpen || (workspace.shiftStatusPending && workspace.cachedShiftOpen);

  const ensureShift = () => {
    if (workspace.shiftStatusPending && workspace.cachedShiftOpen) return true;
    if (!workspace.shiftOpen) {
      notify('الوردية مغلقة — افتح الوردية أولاً.');
      setShiftOpenDialog(true);
      return false;
    }
    return true;
  };

  const shiftStatusText = workspace.shiftStatusPending
    ? (workspace.cachedShiftOpen ? 'جاري التحقق من الوردية…' : 'جاري تحميل نقطة البيع…')
    : workspace.shiftOpen
      ? `وردية ${workspace.shift?.shiftNumber ?? '—'} · ${workspace.shiftOperatorName}${workspace.shift?.openedAt ? ` · من ${formatShiftOpenedAt(workspace.shift.openedAt)} (${formatShiftDuration(workspace.shift.openedAt)})` : ''}`
      : 'الوردية مغلقة — افتح وردية للبيع';

  const shiftChipLabel = workspace.shiftStatusPending
    ? (workspace.cachedShiftOpen ? 'جاري التحقق…' : 'جاري التحميل…')
    : workspace.shiftOpen
      ? 'وردية مفتوحة'
      : 'وردية مغلقة';

  return (
    <Stack spacing={2.5}>
      <Snackbar open={Boolean(snack)} autoHideDuration={4000} onClose={() => setSnack('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setSnack('')} sx={{ width: '100%' }}>{snack}</Alert>
      </Snackbar>

      {shiftKnown && !workspace.shiftOpen && workspace.contextReady ? (
        <Alert severity="warning" sx={{ borderRadius: 3 }} action={
          <Button color="inherit" size="small" onClick={() => setShiftOpenDialog(true)}>فتح وردية</Button>
        }>
          الوردية مغلقة — لا يمكن تسجيل طلبات أو مصروفات حتى تفتح الوردية.
        </Alert>
      ) : null}

      {workspace.posContextError ? (
        <Alert severity="error" sx={{ borderRadius: 3 }} action={
          <Button size="small" onClick={() => workspace.refetchPosContext()}>إعادة المحاولة</Button>
        }>
          {workspace.posContextErrorDetail?.message ?? 'فشل تحميل سياق نقطة البيع'}
        </Alert>
      ) : null}

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 2.5 },
          borderRadius: 5,
          color: '#fff7ed',
          background: 'linear-gradient(135deg, #2f1f24 0%, #5a2718 45%, #b93817 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.12), transparent 40%)' }} />
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} gap={2} sx={{ position: 'relative' }}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h5" fontWeight={800}>نقطة البيع</Typography>
              {window.electronAPI?.isDesktop ? (
                <Chip
                  label={desktopVersion ? `Niha Desktop v${desktopVersion}` : 'Niha Desktop'}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,247,237,0.18)', color: '#fff7ed', fontWeight: 700 }}
                />
              ) : null}
              {desktopUpdateLabel ? (
                <Chip label={desktopUpdateLabel} size="small" color="warning" sx={{ fontWeight: 700 }} />
              ) : null}
              <Typography variant="caption" sx={{ bgcolor: shiftLikelyOpen ? 'rgba(34,197,94,0.25)' : workspace.shiftStatusPending ? 'rgba(251,191,36,0.35)' : 'rgba(239,68,68,0.25)', px: 1, py: 0.25, borderRadius: 2, fontWeight: 700 }}>
                {shiftChipLabel}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ opacity: 0.88, mt: 0.5 }}>{shiftStatusText}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.75 }}>
              {workspace.posContext?.branch?.name ?? '—'} · {workspace.posContext?.cashBox?.name ?? '—'}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {canUsePrint ? (
              <Button variant="outlined" size="small" sx={{ color: '#fff7ed', borderColor: 'rgba(255,247,237,0.4)' }} onClick={() => setPrintSetupOpen(true)}>
                طابعة
              </Button>
            ) : null}
            {canManagePrint ? (
              <Button variant="outlined" size="small" sx={{ color: '#fff7ed', borderColor: 'rgba(255,247,237,0.4)' }} onClick={() => navigate('/settings/receipt')}>
                إعدادات الفاتورة
              </Button>
            ) : null}
            {canTreasury ? (
              <Button
                variant="outlined"
                size="small"
                sx={{ color: '#fff7ed', borderColor: 'rgba(255,247,237,0.4)' }}
                onClick={() => navigate('/shifts')}
              >
                {canManagePrint ? 'الخزنة والورديات' : 'ورديتي المفتوحة'}
              </Button>
            ) : null}
            {workspace.shiftOpen && workspace.posSummary ? (
              <Button
                variant="outlined"
                size="small"
                sx={{ color: '#fff7ed', borderColor: 'rgba(255,247,237,0.4)' }}
                onClick={openShiftSummaryPreview}
              >
                ملخص الوردية
              </Button>
            ) : null}
            {canManagePrint ? (
              <Button variant="outlined" size="small" sx={{ color: '#fff7ed', borderColor: 'rgba(255,247,237,0.4)' }} onClick={() => order.toggleAutoPrint(!order.autoPrint)}>
                طباعة تلقائية: {order.autoPrint ? 'مفعّلة' : 'معطّلة'}
              </Button>
            ) : null}
            {workspace.shiftOpen ? (
              <>
                <Button variant="outlined" size="small" sx={{ color: '#fff7ed', borderColor: 'rgba(255,247,237,0.4)' }} onClick={() => setExpenseOpen(true)}>مصروف</Button>
                <Button variant="outlined" size="small" sx={{ color: '#fff7ed', borderColor: 'rgba(255,247,237,0.4)' }} onClick={() => setShiftCloseDialog(true)}>
                  {(workspace.uncollectedOrders?.length ?? 0) + (workspace.posSummary?.suspendedCount ?? 0) > 0 ? 'تسليم وردية' : 'إغلاق وردية'}
                </Button>
              </>
            ) : (
              <Button variant="contained" size="small" sx={{ bgcolor: '#fff7ed', color: '#5a2718', fontWeight: 800 }} onClick={() => setShiftOpenDialog(true)}>فتح وردية</Button>
            )}
            <Button
              variant="contained"
              size="large"
              disabled={!shiftLikelyOpen}
              onClick={() => { if (ensureShift()) order.openNewOrder(); }}
              sx={{ bgcolor: '#fff7ed', color: '#5a2718', fontWeight: 800, px: 3 }}
            >
              + طلب جديد
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <PosKpiGrid
        shiftOpen={workspace.shiftOpen}
        posSummary={workspace.posSummary}
        uncollectedCount={workspace.uncollectedOrders.length}
        uncollectedAmount={workspace.uncollectedAmount}
        suspendedCount={workspace.suspendedOrders.length}
        shiftNumber={workspace.shift?.shiftNumber}
        cashierName={workspace.shiftOperatorName}
        openedAt={workspace.shift?.openedAt}
        onOpenSummaryPreview={openShiftSummaryPreview}
      />

      <SuspendedSection
        orders={workspace.suspendedOrders}
        loading={workspace.suspendedPending}
        onResume={async (o) => {
          const res = await order.resumeSuspended(o);
          if (res.ok) notify(`تم استرجاع ${o.code}`);
          else notify((res as any).body ?? (res as any).error ?? 'فشل الاسترجاع');
        }}
      />

      <ShiftOrdersSection
        shiftOpen={workspace.shiftOpen}
        orders={workspace.shiftClosedOrders}
        uncollected={workspace.uncollectedOrders}
        collected={workspace.collectedOrders}
        loading={workspace.shiftOrdersPending}
        error={workspace.shiftOrdersError}
        tab={shiftOrdersTab}
        onTabChange={setShiftOrdersTab}
        onCollect={(o) => { setCollectOrder(o); setCollectPayment(o.paymentMethod); setCollectError(''); setCollectOpen(true); }}
        onRetry={() => workspace.refreshAll()}
        showReprint={canUsePrint}
        onReprint={handleReprint}
        onViewAudit={(o) => setAuditOrder(o)}
        onViewSummary={(o) => setSummaryOrder(o)}
        onEdit={(o) => setEditOrder(o)}
        onUncollect={handleUncollect}
        onCancel={handleCancel}
        onRequestCancel={handleRequestCancel}
        onWithdrawCancel={handleWithdrawCancel}
        pendingOrderId={pendingOrderId}
      />

      <Fab
        color="primary"
        variant="extended"
        disabled={!shiftLikelyOpen}
        onClick={() => { if (ensureShift()) order.openNewOrder(); }}
        sx={{ position: 'fixed', bottom: 24, left: 24, fontWeight: 800, zIndex: 10 }}
      >
        + طلب جديد
      </Fab>

      <OrderModal
        open={order.modalOpen}
        fullScreen={fullScreenModal}
        branchId={workspace.effectiveBranchId}
        operatorName={workspace.operatorName}
        orderType={order.orderType}
        currentOrderCode={order.currentOrderCode}
        collectionStatus={order.collectionStatus}
        productSearch={order.productSearch}
        onProductSearch={order.setProductSearch}
        orderOwnerName={order.orderOwnerName}
        onOrderOwnerName={order.setOrderOwnerName}
        customerPhone={order.customerPhone}
        onCustomerPhone={order.setCustomerPhone}
        onSelectCustomer={order.applyCustomerSuggestion}
        customerAddress={order.customerAddress}
        onCustomerAddress={order.setCustomerAddress}
        captainName={order.captainName}
        onCaptainName={order.setCaptainName}
        onOrderTypeChange={order.setOrderTypeAndDefaults}
        categories={catalog.categories}
        activeCategory={catalog.activeCategory}
        onCategoryChange={catalog.setActiveCategory}
        allCategoriesKey={ALL_CATEGORIES}
        products={catalog.products}
        catalogPending={catalog.catalogPending}
        cartItems={order.cartItems}
        cartQtyMap={cartQtyMap}
        onAddProduct={order.addProduct}
        onUpdateQty={order.updateQuantity}
        onUpdateNote={order.updateNote}
        paymentMethods={catalog.paymentMethods}
        paymentMethod={order.paymentMethod}
        onPaymentMethod={order.setPaymentMethod}
        onCollectionStatus={order.setCollectionStatus}
        discountAmount={order.discountAmount}
        onDiscountAmount={order.setDiscountAmount}
        orderNote={order.orderNote}
        onOrderNote={order.setOrderNote}
        sauces={catalog.sauces}
        onToggleItemSauce={order.toggleItemSauce}
        subtotal={order.subtotal}
        discount={order.discount}
        total={order.total}
        onClose={() => order.closeModal()}
        deliveryDrivers={deliveryDrivers}
        validateTakeawayCustomer={order.validateTakeawayCustomer}
        onSuspend={async () => {
          const res = await order.suspendOrder();
          if (res?.ok) notify('تم تعليق الطلب.');
          if (!res?.ok) {
            const err = (res as { error?: string; body?: string })?.error ?? (res as { body?: string })?.body;
            return { ok: false as const, ...(err ? { error: err } : {}) };
          }
          return { ok: true as const };
        }}
        onCloseOrder={() => { void order.closeOrder(); }}
        onClearCart={() => { order.resetOrder(); notify('تم إفراغ السلة.'); }}
      />

      {auditOrder ? (
        <OrderAuditDialog
          open={Boolean(auditOrder)}
          orderId={auditOrder.id}
          orderCode={auditOrder.code}
          onClose={() => setAuditOrder(null)}
        />
      ) : null}

      <OrderSummaryDialog
        open={Boolean(summaryOrder)}
        order={summaryOrder}
        {...(() => {
          if (!summaryOrder) return {};
          const label = catalog.paymentMethods.find((m) => m.id === summaryOrder.paymentMethod)?.label;
          return label ? { paymentMethodLabel: label } : {};
        })()}
        onClose={() => setSummaryOrder(null)}
      />

      <OrderEditDialog
        open={Boolean(editOrder)}
        branchId={workspace.effectiveBranchId}
        order={editOrder}
        products={catalog.products}
        sauces={catalog.sauces}
        deliveryDrivers={deliveryDrivers}
        onClose={() => setEditOrder(null)}
        onSave={handleAmendOrder}
      />

      <Dialog open={collectOpen} onClose={collectBusy ? undefined : () => { setCollectOpen(false); setCollectError(''); }} fullWidth maxWidth="xs">
        <DialogTitle>تسجيل تحصيل في الدرج</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {collectError ? <Alert severity="error">{collectError}</Alert> : null}
            <TextField label="رقم الطلب" value={collectOrder?.code ?? ''} InputProps={{ readOnly: true }} />
            <TextField label="الإجمالي" value={collectOrder ? formatCurrency(collectOrder.total) : ''} InputProps={{ readOnly: true }} />
            <TextField select label="طريقة الدفع" value={collectPayment} onChange={(e) => setCollectPayment(e.target.value)} disabled={collectBusy}>
              {catalog.paymentMethods.map((m) => <MenuItem key={m.id} value={m.id}>{m.label}</MenuItem>)}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1, px: 2, pb: 2 }}>
          <Button onClick={() => { setCollectOpen(false); setCollectError(''); }} disabled={collectBusy}>إلغاء</Button>
          <Button variant="outlined" disabled={collectBusy} {...(collectBusy ? { startIcon: <CircularProgress size={16} /> } : {})} onClick={() => void runCollect(false)}>
            {collectBusy ? 'جاري التحصيل…' : 'تحصيل فقط'}
          </Button>
          {canUsePrint ? (
            <Button variant="contained" disabled={collectBusy} {...(collectBusy ? { startIcon: <CircularProgress size={16} color="inherit" /> } : {})} onClick={() => void runCollect(true)}>
              {collectBusy ? 'جاري التحصيل…' : 'تحصيل وطباعة'}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      {canUsePrint ? (
        <PrintSetupDialog open={printSetupOpen} onClose={() => setPrintSetupOpen(false)} />
      ) : null}

      <Dialog open={expenseOpen} onClose={() => setExpenseOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>تسجيل مصروف من الوردية</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>يُخصم من عهدة الكاشير (الدرج) وليس من خزنة الإدارة.</Alert>
            <TextField select label="نوع المصروف" value={expenseKind} onChange={(e) => setExpenseKind(e.target.value as 'GENERAL' | 'ITEM')}>
              <MenuItem value="GENERAL">مصروف عام</MenuItem>
              <MenuItem value="ITEM">شراء خامات</MenuItem>
            </TextField>
            {expenseKind === 'ITEM' ? (
              <>
                <TextField select label="الصنف" value={expenseStockItemId} onChange={(e) => {
                  const id = e.target.value;
                  setExpenseStockItemId(id);
                  const item = stockItems.find((s: any) => s.id === id);
                  if (item) setExpenseUnitPrice(String(Number(item.averageCost ?? 0)));
                }}>
                  {stockItems.map((item: any) => (
                    <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                  ))}
                </TextField>
                <TextField label="الكمية" type="number" value={expenseQty} onChange={(e) => setExpenseQty(e.target.value)} />
                <TextField label="سعر الوحدة" type="number" value={expenseUnitPrice} onChange={(e) => setExpenseUnitPrice(e.target.value)} />
              </>
            ) : (
              <TextField label="المبلغ" type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} />
            )}
            <TextField label="البيان" value={expenseNote} onChange={(e) => setExpenseNote(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExpenseOpen(false)}>إلغاء</Button>
          <Button variant="contained" disabled={!workspace.shiftOpen} onClick={async () => {
            const res = await workspace.createExpense(
              expenseKind === 'ITEM'
                ? { kind: 'ITEM', stockItemId: expenseStockItemId, quantity: Number(expenseQty) || 0, unitPrice: Number(expenseUnitPrice) || 0, note: expenseNote }
                : { kind: 'GENERAL', amount: Number(expenseAmount) || 0, note: expenseNote },
            );
            if (res.ok) {
              setExpenseOpen(false);
              setExpenseAmount('0');
              setExpenseNote('');
              notify('تم تسجيل المصروف.');
            } else notify((res as any).body ?? (res as any).error ?? 'فشل تسجيل المصروف');
          }}>حفظ</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={shiftOpenDialog} onClose={() => setShiftOpenDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle>فتح وردية</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              افتح الوردية قبل البيع. الطلبات غير المحصّلة على الخزنة تبقى كتذكير.
            </Typography>
            {pendingCashHandoff ? (
              <Alert severity="info">
                {pendingCashHandoff.handedByName ?? 'الكاشير السابق'} سلّمك{' '}
                {Number(pendingCashHandoff.cashAmount).toLocaleString('en-US')} ج.م نقدية
                {' '}(من وردية {pendingCashHandoff.fromShiftNumber})
                {pendingCashHandoff.uncollectedCount
                  ? ` · ${pendingCashHandoff.uncollectedCount} طلب غير محصّل على الخزنة`
                  : ''}
              </Alert>
            ) : null}
            <TextField label="عهدة الفتح (نقدي)" type="number" value={openingFloat} onChange={(e) => setOpeningFloat(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShiftOpenDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={async () => {
            const res = await workspace.openShift(Number(openingFloat) || 0);
            if (res.ok) {
              setShiftOpenDialog(false);
              setOpeningFloat('0');
              setPendingCashHandoff(null);
              const handoffMsg = (res as { handoffMessage?: string }).handoffMessage;
              if (handoffMsg) {
                notify(handoffMsg);
              } else {
                notify((res.data as { created?: boolean })?.created ? 'تم فتح وردية جديدة.' : 'الوردية مفتوحة.');
              }
            } else notify((res as { body?: string; error?: string }).body ?? (res as { error?: string }).error ?? 'فشل فتح الوردية');
          }}>فتح</Button>
        </DialogActions>
      </Dialog>

      {workspace.shift ? (
        <ShiftCloseDialog
          open={shiftCloseDialog}
          onClose={() => setShiftCloseDialog(false)}
          shiftId={workspace.shift.id}
          shiftNumber={workspace.shift.shiftNumber}
          cashierName={workspace.shiftOperatorName}
          openedAt={workspace.shift.openedAt}
          summary={workspace.closeShiftSummary}
          onOpenSummaryPreview={openShiftSummaryPreview}
          onConfirm={async (payload) => {
            const res = await workspace.closeShiftSession(payload);
            if (!res.ok) {
              notify(res.error ?? 'فشل الإغلاق');
              throw new Error(res.error ?? 'فشل الإغلاق');
            }
            setShiftCloseDialog(false);
            notify(res.message ?? 'تم إغلاق الوردية.');
          }}
        />
      ) : null}

      <ShiftSummaryPreviewDialog
        open={summaryPreviewOpen}
        onClose={() => setSummaryPreviewOpen(false)}
        params={shiftSummaryPreviewParams}
        onMessage={notify}
      />
    </Stack>
  );
}
