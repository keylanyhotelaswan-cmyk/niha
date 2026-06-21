import {
  Alert,
  Box,
  Button,
  Chip,
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
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SavedOrder } from '../../lib/pos-store.js';
import { buildReceiptFromSavedOrder, printPosReceipt } from '../../lib/pos-receipt.js';
import { isPrintBridgeOnline } from '../../lib/pos-print-bridge.js';
import { ShiftCloseDialog } from '../treasury-workspace/components/shift-close-dialog.js';
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
  const [collectOpen, setCollectOpen] = useState(false);
  const [collectOrder, setCollectOrder] = useState<SavedOrder | null>(null);
  const [collectPayment, setCollectPayment] = useState('cash');
  const [collectBusy, setCollectBusy] = useState(false);
  const [printSetupOpen, setPrintSetupOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseKind, setExpenseKind] = useState<'GENERAL' | 'ITEM'>('GENERAL');
  const [expenseAmount, setExpenseAmount] = useState('0');
  const [expenseNote, setExpenseNote] = useState('');
  const [expenseStockItemId, setExpenseStockItemId] = useState('');
  const [expenseQty, setExpenseQty] = useState('0');
  const [expenseUnitPrice, setExpenseUnitPrice] = useState('0');

  const { data: stockItems = [] } = usePosExpenseStock(workspace.effectiveBranchId, expenseOpen && expenseKind === 'ITEM');

  useEffect(() => {
    if (order.autoPrint) isPrintBridgeOnline();
  }, [order.autoPrint]);

  const cartQtyMap = useMemo(() => {
    const m = new Map<string, number>();
    order.cartItems.forEach((i) => m.set(i.productId, i.quantity));
    return m;
  }, [order.cartItems]);

  const notify = (msg: string) => setSnack(msg);

  const paymentLabel = (id: string) => catalog.paymentMethods.find((m) => m.id === id)?.label ?? id;

  const handlePrintResult = (printRes: { ok: boolean; message?: string; reason?: string; copies?: string; method?: string }) => {
    if (printRes.ok) {
      const label = printRes.copies === 'customer' ? 'نسخة الزبون' : 'نسخة الشيف + الزبون';
      const via = printRes.method === 'bridge' ? 'Print Bridge' : 'QZ';
      notify(`تمت الطباعة الصامتة (${label}) عبر ${via}`);
      return;
    }
    notify(printRes.message ?? 'فشل الطباعة');
    if (printRes.reason && canUsePrint) setPrintSetupOpen(true);
  };

  const runCollect = async (withPrint: boolean) => {
    if (!collectOrder || collectBusy) return;
    setCollectBusy(true);
    const order = collectOrder;
    const res = await workspace.collectOrder(order, collectPayment);
    if (!res.ok) {
      setCollectBusy(false);
      notify((res as any).body ?? (res as any).error ?? 'فشل التحصيل');
      return;
    }
    setCollectOpen(false);
    notify(`تم تحصيل ${order.code} في الدرج`);
    if (withPrint && canUsePrint) {
      const brand = getStoreBranding();
      const receipt = buildReceiptFromSavedOrder(order, {
        storeName: brand.storeName,
        storeSubtitle: brand.storeSubtitle,
        storeFooter: brand.storeFooter,
        storePhone: brand.storePhone,
        cashierName: workspace.shiftOperatorName,
        paymentMethodLabel: paymentLabel(collectPayment),
        shiftNumber: workspace.shift?.shiftNumber != null ? String(workspace.shift.shiftNumber) : '1',
        isPaid: true,
      });
      const printRes = await printPosReceipt(receipt, { force: true, silent: true, copies: 'customer' });
      handlePrintResult(printRes);
    }
    setCollectBusy(false);
    setCollectOrder(null);
  };

  const ensureShift = () => {
    if (!workspace.shiftOpen) {
      notify('الوردية مغلقة — افتح الوردية أولاً.');
      setShiftOpenDialog(true);
      return false;
    }
    return true;
  };

  const shiftStatusText = workspace.shiftOpen
    ? `وردية ${workspace.shift?.shiftNumber ?? '—'} · ${workspace.shiftOperatorName}`
    : 'الوردية مغلقة — افتح وردية للبيع';

  return (
    <Stack spacing={2.5}>
      <Snackbar open={Boolean(snack)} autoHideDuration={4000} onClose={() => setSnack('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setSnack('')} sx={{ width: '100%' }}>{snack}</Alert>
      </Snackbar>

      {!workspace.shiftOpen && workspace.contextReady ? (
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
              <Typography variant="caption" sx={{ bgcolor: workspace.shiftOpen ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)', px: 1, py: 0.25, borderRadius: 2, fontWeight: 700 }}>
                {workspace.shiftOpen ? 'وردية مفتوحة' : 'وردية مغلقة'}
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
                onClick={() => navigate(`/shifts?from=${localTodayKey()}&to=${localTodayKey()}`)}
              >
                {canManagePrint ? 'الخزنة والورديات' : 'ورديتي اليوم'}
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
                <Button variant="outlined" size="small" sx={{ color: '#fff7ed', borderColor: 'rgba(255,247,237,0.4)' }} onClick={() => setShiftCloseDialog(true)}>إغلاق وردية</Button>
              </>
            ) : (
              <Button variant="contained" size="small" sx={{ bgcolor: '#fff7ed', color: '#5a2718', fontWeight: 800 }} onClick={() => setShiftOpenDialog(true)}>فتح وردية</Button>
            )}
            <Button
              variant="contained"
              size="large"
              disabled={!workspace.shiftOpen}
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
        onCollect={(o) => { setCollectOrder(o); setCollectPayment(o.paymentMethod); setCollectOpen(true); }}
        onRetry={() => workspace.refreshAll()}
      />

      <Fab
        color="primary"
        variant="extended"
        disabled={!workspace.shiftOpen}
        onClick={() => { if (ensureShift()) order.openNewOrder(); }}
        sx={{ position: 'fixed', bottom: 24, left: 24, fontWeight: 800, zIndex: 10 }}
      >
        + طلب جديد
      </Fab>

      <OrderModal
        open={order.modalOpen}
        fullScreen={fullScreenModal}
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
        subtotal={order.subtotal}
        discount={order.discount}
        total={order.total}
        onClose={() => order.closeModal()}
        onSuspend={async () => {
          const res = await order.suspendOrder();
          if (res.ok) notify('تم تعليق الطلب.');
          else notify((res as any).body ?? (res as any).error ?? 'فشل التعليق');
        }}
        onCloseOrder={async () => {
          const res = await order.closeOrder();
          if (res.ok) {
            notify(`تم إغلاق ${(res as any).orderCode} — ${(res as any).note}`);
          } else notify((res as any).body ?? (res as any).error ?? 'فشل إغلاق الطلب');
        }}
        onClearCart={() => { order.resetOrder(); notify('تم إفراغ السلة.'); }}
      />

      <Dialog open={collectOpen} onClose={() => setCollectOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>تسجيل تحصيل في الدرج</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="رقم الطلب" value={collectOrder?.code ?? ''} InputProps={{ readOnly: true }} />
            <TextField label="الإجمالي" value={collectOrder ? formatCurrency(collectOrder.total) : ''} InputProps={{ readOnly: true }} />
            <TextField select label="طريقة الدفع" value={collectPayment} onChange={(e) => setCollectPayment(e.target.value)}>
              {catalog.paymentMethods.map((m) => <MenuItem key={m.id} value={m.id}>{m.label}</MenuItem>)}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1, px: 2, pb: 2 }}>
          <Button onClick={() => setCollectOpen(false)} disabled={collectBusy}>إلغاء</Button>
          <Button variant="outlined" disabled={collectBusy} onClick={() => runCollect(false)}>
            تحصيل فقط
          </Button>
          {canUsePrint ? (
            <Button variant="contained" disabled={collectBusy} onClick={() => runCollect(true)}>
              تحصيل وطباعة
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
              افتح الوردية قبل البيع. الطلبات المعلّقة تبقى محفوظة.
            </Typography>
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
              notify((res.data as any)?.created ? 'تم فتح وردية جديدة.' : 'الوردية مفتوحة.');
            } else notify((res as any).body ?? (res as any).error ?? 'فشل فتح الوردية');
          }}>فتح</Button>
        </DialogActions>
      </Dialog>

      {workspace.shift ? (
        <ShiftCloseDialog
          open={shiftCloseDialog}
          onClose={() => setShiftCloseDialog(false)}
          shiftNumber={workspace.shift.shiftNumber}
          cashierName={workspace.shiftOperatorName}
          summary={workspace.closeShiftSummary}
          onConfirm={async (counted) => {
            const res = await workspace.closeShiftSession(counted);
            if (!res.ok) {
              notify(res.error ?? 'فشل الإغلاق');
              throw new Error(res.error ?? 'فشل الإغلاق');
            }
            setShiftCloseDialog(false);
            notify('تم إغلاق الوردية.');
          }}
        />
      ) : null}
    </Stack>
  );
}
