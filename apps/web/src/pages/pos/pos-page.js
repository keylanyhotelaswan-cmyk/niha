import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Fab, MenuItem, Paper, Snackbar, Stack, TextField, Typography, useMediaQuery, useTheme, } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildReceiptFromSavedOrder, printPosReceipt } from '../../lib/pos-receipt.js';
import { isPrintBridgeOnline } from '../../lib/pos-print-bridge.js';
import { ShiftCloseDialog } from '../treasury-workspace/components/shift-close-dialog.js';
import { ALL_CATEGORIES } from './constants.js';
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
    const [shiftOrdersTab, setShiftOrdersTab] = useState('uncollected');
    const [shiftOpenDialog, setShiftOpenDialog] = useState(false);
    const [shiftCloseDialog, setShiftCloseDialog] = useState(false);
    const [openingFloat, setOpeningFloat] = useState('0');
    const [collectOpen, setCollectOpen] = useState(false);
    const [collectOrder, setCollectOrder] = useState(null);
    const [collectPayment, setCollectPayment] = useState('cash');
    const [collectBusy, setCollectBusy] = useState(false);
    const [printSetupOpen, setPrintSetupOpen] = useState(false);
    const [expenseOpen, setExpenseOpen] = useState(false);
    const [expenseKind, setExpenseKind] = useState('GENERAL');
    const [expenseAmount, setExpenseAmount] = useState('0');
    const [expenseNote, setExpenseNote] = useState('');
    const [expenseStockItemId, setExpenseStockItemId] = useState('');
    const [expenseQty, setExpenseQty] = useState('0');
    const [expenseUnitPrice, setExpenseUnitPrice] = useState('0');
    const { data: stockItems = [] } = usePosExpenseStock(workspace.effectiveBranchId, expenseOpen && expenseKind === 'ITEM');
    useEffect(() => {
        if (order.autoPrint)
            isPrintBridgeOnline();
    }, [order.autoPrint]);
    const cartQtyMap = useMemo(() => {
        const m = new Map();
        order.cartItems.forEach((i) => m.set(i.productId, i.quantity));
        return m;
    }, [order.cartItems]);
    const notify = (msg) => setSnack(msg);
    const paymentLabel = (id) => catalog.paymentMethods.find((m) => m.id === id)?.label ?? id;
    const handlePrintResult = (printRes) => {
        if (printRes.ok) {
            const label = printRes.copies === 'customer' ? 'نسخة الزبون' : 'نسخة الشيف + الزبون';
            const via = printRes.method === 'bridge' ? 'Print Bridge' : 'QZ';
            notify(`تمت الطباعة الصامتة (${label}) عبر ${via}`);
            return;
        }
        notify(printRes.message ?? 'فشل الطباعة');
        if (printRes.reason && canUsePrint)
            setPrintSetupOpen(true);
    };
    const runCollect = async (withPrint) => {
        if (!collectOrder || collectBusy)
            return;
        setCollectBusy(true);
        const order = collectOrder;
        const res = await workspace.collectOrder(order, collectPayment);
        if (!res.ok) {
            setCollectBusy(false);
            notify(res.body ?? res.error ?? 'فشل التحصيل');
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
    return (_jsxs(Stack, { spacing: 2.5, children: [_jsx(Snackbar, { open: Boolean(snack), autoHideDuration: 4000, onClose: () => setSnack(''), anchorOrigin: { vertical: 'bottom', horizontal: 'center' }, children: _jsx(Alert, { severity: "success", variant: "filled", onClose: () => setSnack(''), sx: { width: '100%' }, children: snack }) }), !workspace.shiftOpen && workspace.contextReady ? (_jsx(Alert, { severity: "warning", sx: { borderRadius: 3 }, action: _jsx(Button, { color: "inherit", size: "small", onClick: () => setShiftOpenDialog(true), children: "\u0641\u062A\u062D \u0648\u0631\u062F\u064A\u0629" }), children: "\u0627\u0644\u0648\u0631\u062F\u064A\u0629 \u0645\u063A\u0644\u0642\u0629 \u2014 \u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u0633\u062C\u064A\u0644 \u0637\u0644\u0628\u0627\u062A \u0623\u0648 \u0645\u0635\u0631\u0648\u0641\u0627\u062A \u062D\u062A\u0649 \u062A\u0641\u062A\u062D \u0627\u0644\u0648\u0631\u062F\u064A\u0629." })) : null, workspace.posContextError ? (_jsx(Alert, { severity: "error", sx: { borderRadius: 3 }, action: _jsx(Button, { size: "small", onClick: () => workspace.refetchPosContext(), children: "\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629" }), children: workspace.posContextErrorDetail?.message ?? 'فشل تحميل سياق نقطة البيع' })) : null, _jsxs(Paper, { elevation: 0, sx: {
                    p: { xs: 2, md: 2.5 },
                    borderRadius: 5,
                    color: '#fff7ed',
                    background: 'linear-gradient(135deg, #2f1f24 0%, #5a2718 45%, #b93817 100%)',
                    position: 'relative',
                    overflow: 'hidden',
                }, children: [_jsx(Box, { sx: { position: 'absolute', inset: 0, background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.12), transparent 40%)' } }), _jsxs(Stack, { direction: { xs: 'column', md: 'row' }, justifyContent: "space-between", alignItems: { md: 'center' }, gap: 2, sx: { position: 'relative' }, children: [_jsxs(Box, { children: [_jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", flexWrap: "wrap", useFlexGap: true, children: [_jsx(Typography, { variant: "h5", fontWeight: 800, children: "\u0646\u0642\u0637\u0629 \u0627\u0644\u0628\u064A\u0639" }), window.electronAPI?.isDesktop ? (_jsx(Chip, { label: desktopVersion ? `Niha Desktop v${desktopVersion}` : 'Niha Desktop', size: "small", sx: { bgcolor: 'rgba(255,247,237,0.18)', color: '#fff7ed', fontWeight: 700 } })) : null, desktopUpdateLabel ? (_jsx(Chip, { label: desktopUpdateLabel, size: "small", color: "warning", sx: { fontWeight: 700 } })) : null, _jsx(Typography, { variant: "caption", sx: { bgcolor: workspace.shiftOpen ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)', px: 1, py: 0.25, borderRadius: 2, fontWeight: 700 }, children: workspace.shiftOpen ? 'وردية مفتوحة' : 'وردية مغلقة' })] }), _jsx(Typography, { variant: "body2", sx: { opacity: 0.88, mt: 0.5 }, children: shiftStatusText }), _jsxs(Typography, { variant: "caption", sx: { opacity: 0.75 }, children: [workspace.posContext?.branch?.name ?? '—', " \u00B7 ", workspace.posContext?.cashBox?.name ?? '—'] })] }), _jsxs(Stack, { direction: "row", spacing: 1, flexWrap: "wrap", useFlexGap: true, children: [canUsePrint ? (_jsx(Button, { variant: "outlined", size: "small", sx: { color: '#fff7ed', borderColor: 'rgba(255,247,237,0.4)' }, onClick: () => setPrintSetupOpen(true), children: "\u0637\u0627\u0628\u0639\u0629" })) : null, canManagePrint ? (_jsx(Button, { variant: "outlined", size: "small", sx: { color: '#fff7ed', borderColor: 'rgba(255,247,237,0.4)' }, onClick: () => navigate('/settings/receipt'), children: "\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629" })) : null, canTreasury ? (_jsx(Button, { variant: "outlined", size: "small", sx: { color: '#fff7ed', borderColor: 'rgba(255,247,237,0.4)' }, onClick: () => navigate(`/shifts?from=${localTodayKey()}&to=${localTodayKey()}`), children: canManagePrint ? 'الخزنة والورديات' : 'ورديتي اليوم' })) : null, canManagePrint ? (_jsxs(Button, { variant: "outlined", size: "small", sx: { color: '#fff7ed', borderColor: 'rgba(255,247,237,0.4)' }, onClick: () => order.toggleAutoPrint(!order.autoPrint), children: ["\u0637\u0628\u0627\u0639\u0629 \u062A\u0644\u0642\u0627\u0626\u064A\u0629: ", order.autoPrint ? 'مفعّلة' : 'معطّلة'] })) : null, workspace.shiftOpen ? (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "outlined", size: "small", sx: { color: '#fff7ed', borderColor: 'rgba(255,247,237,0.4)' }, onClick: () => setExpenseOpen(true), children: "\u0645\u0635\u0631\u0648\u0641" }), _jsx(Button, { variant: "outlined", size: "small", sx: { color: '#fff7ed', borderColor: 'rgba(255,247,237,0.4)' }, onClick: () => setShiftCloseDialog(true), children: "\u0625\u063A\u0644\u0627\u0642 \u0648\u0631\u062F\u064A\u0629" })] })) : (_jsx(Button, { variant: "contained", size: "small", sx: { bgcolor: '#fff7ed', color: '#5a2718', fontWeight: 800 }, onClick: () => setShiftOpenDialog(true), children: "\u0641\u062A\u062D \u0648\u0631\u062F\u064A\u0629" })), _jsx(Button, { variant: "contained", size: "large", disabled: !workspace.shiftOpen, onClick: () => { if (ensureShift())
                                            order.openNewOrder(); }, sx: { bgcolor: '#fff7ed', color: '#5a2718', fontWeight: 800, px: 3 }, children: "+ \u0637\u0644\u0628 \u062C\u062F\u064A\u062F" })] })] })] }), _jsx(PosKpiGrid, { shiftOpen: workspace.shiftOpen, posSummary: workspace.posSummary, uncollectedCount: workspace.uncollectedOrders.length, uncollectedAmount: workspace.uncollectedAmount, suspendedCount: workspace.suspendedOrders.length }), _jsx(SuspendedSection, { orders: workspace.suspendedOrders, loading: workspace.suspendedPending, onResume: async (o) => {
                    const res = await order.resumeSuspended(o);
                    if (res.ok)
                        notify(`تم استرجاع ${o.code}`);
                    else
                        notify(res.body ?? res.error ?? 'فشل الاسترجاع');
                } }), _jsx(ShiftOrdersSection, { shiftOpen: workspace.shiftOpen, orders: workspace.shiftClosedOrders, uncollected: workspace.uncollectedOrders, collected: workspace.collectedOrders, loading: workspace.shiftOrdersPending, error: workspace.shiftOrdersError, tab: shiftOrdersTab, onTabChange: setShiftOrdersTab, onCollect: (o) => { setCollectOrder(o); setCollectPayment(o.paymentMethod); setCollectOpen(true); }, onRetry: () => workspace.refreshAll() }), _jsx(Fab, { color: "primary", variant: "extended", disabled: !workspace.shiftOpen, onClick: () => { if (ensureShift())
                    order.openNewOrder(); }, sx: { position: 'fixed', bottom: 24, left: 24, fontWeight: 800, zIndex: 10 }, children: "+ \u0637\u0644\u0628 \u062C\u062F\u064A\u062F" }), _jsx(OrderModal, { open: order.modalOpen, fullScreen: fullScreenModal, operatorName: workspace.operatorName, orderType: order.orderType, currentOrderCode: order.currentOrderCode, collectionStatus: order.collectionStatus, productSearch: order.productSearch, onProductSearch: order.setProductSearch, orderOwnerName: order.orderOwnerName, onOrderOwnerName: order.setOrderOwnerName, customerPhone: order.customerPhone, onCustomerPhone: order.setCustomerPhone, customerAddress: order.customerAddress, onCustomerAddress: order.setCustomerAddress, captainName: order.captainName, onCaptainName: order.setCaptainName, onOrderTypeChange: order.setOrderTypeAndDefaults, categories: catalog.categories, activeCategory: catalog.activeCategory, onCategoryChange: catalog.setActiveCategory, allCategoriesKey: ALL_CATEGORIES, products: catalog.products, cartItems: order.cartItems, cartQtyMap: cartQtyMap, onAddProduct: order.addProduct, onUpdateQty: order.updateQuantity, onUpdateNote: order.updateNote, paymentMethods: catalog.paymentMethods, paymentMethod: order.paymentMethod, onPaymentMethod: order.setPaymentMethod, onCollectionStatus: order.setCollectionStatus, discountAmount: order.discountAmount, onDiscountAmount: order.setDiscountAmount, orderNote: order.orderNote, onOrderNote: order.setOrderNote, subtotal: order.subtotal, discount: order.discount, total: order.total, onClose: () => order.closeModal(), onSuspend: async () => {
                    const res = await order.suspendOrder();
                    if (res.ok)
                        notify('تم تعليق الطلب.');
                    else
                        notify(res.body ?? res.error ?? 'فشل التعليق');
                }, onCloseOrder: async () => {
                    const res = await order.closeOrder();
                    if (res.ok) {
                        notify(`تم إغلاق ${res.orderCode} — ${res.note}`);
                    }
                    else
                        notify(res.body ?? res.error ?? 'فشل إغلاق الطلب');
                }, onClearCart: () => { order.resetOrder(); notify('تم إفراغ السلة.'); } }), _jsxs(Dialog, { open: collectOpen, onClose: () => setCollectOpen(false), fullWidth: true, maxWidth: "xs", children: [_jsx(DialogTitle, { children: "\u062A\u0633\u062C\u064A\u0644 \u062A\u062D\u0635\u064A\u0644 \u0641\u064A \u0627\u0644\u062F\u0631\u062C" }), _jsx(DialogContent, { children: _jsxs(Stack, { spacing: 2, sx: { pt: 1 }, children: [_jsx(TextField, { label: "\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628", value: collectOrder?.code ?? '', InputProps: { readOnly: true } }), _jsx(TextField, { label: "\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A", value: collectOrder ? formatCurrency(collectOrder.total) : '', InputProps: { readOnly: true } }), _jsx(TextField, { select: true, label: "\u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u062F\u0641\u0639", value: collectPayment, onChange: (e) => setCollectPayment(e.target.value), children: catalog.paymentMethods.map((m) => _jsx(MenuItem, { value: m.id, children: m.label }, m.id)) })] }) }), _jsxs(DialogActions, { sx: { flexWrap: 'wrap', gap: 1, px: 2, pb: 2 }, children: [_jsx(Button, { onClick: () => setCollectOpen(false), disabled: collectBusy, children: "\u0625\u0644\u063A\u0627\u0621" }), _jsx(Button, { variant: "outlined", disabled: collectBusy, onClick: () => runCollect(false), children: "\u062A\u062D\u0635\u064A\u0644 \u0641\u0642\u0637" }), canUsePrint ? (_jsx(Button, { variant: "contained", disabled: collectBusy, onClick: () => runCollect(true), children: "\u062A\u062D\u0635\u064A\u0644 \u0648\u0637\u0628\u0627\u0639\u0629" })) : null] })] }), canUsePrint ? (_jsx(PrintSetupDialog, { open: printSetupOpen, onClose: () => setPrintSetupOpen(false) })) : null, _jsxs(Dialog, { open: expenseOpen, onClose: () => setExpenseOpen(false), fullWidth: true, maxWidth: "sm", children: [_jsx(DialogTitle, { children: "\u062A\u0633\u062C\u064A\u0644 \u0645\u0635\u0631\u0648\u0641 \u0645\u0646 \u0627\u0644\u0648\u0631\u062F\u064A\u0629" }), _jsx(DialogContent, { children: _jsxs(Stack, { spacing: 2, sx: { pt: 1 }, children: [_jsx(Alert, { severity: "info", sx: { borderRadius: 2 }, children: "\u064A\u064F\u062E\u0635\u0645 \u0645\u0646 \u0639\u0647\u062F\u0629 \u0627\u0644\u0643\u0627\u0634\u064A\u0631 (\u0627\u0644\u062F\u0631\u062C) \u0648\u0644\u064A\u0633 \u0645\u0646 \u062E\u0632\u0646\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u0629." }), _jsxs(TextField, { select: true, label: "\u0646\u0648\u0639 \u0627\u0644\u0645\u0635\u0631\u0648\u0641", value: expenseKind, onChange: (e) => setExpenseKind(e.target.value), children: [_jsx(MenuItem, { value: "GENERAL", children: "\u0645\u0635\u0631\u0648\u0641 \u0639\u0627\u0645" }), _jsx(MenuItem, { value: "ITEM", children: "\u0634\u0631\u0627\u0621 \u062E\u0627\u0645\u0627\u062A" })] }), expenseKind === 'ITEM' ? (_jsxs(_Fragment, { children: [_jsx(TextField, { select: true, label: "\u0627\u0644\u0635\u0646\u0641", value: expenseStockItemId, onChange: (e) => {
                                                const id = e.target.value;
                                                setExpenseStockItemId(id);
                                                const item = stockItems.find((s) => s.id === id);
                                                if (item)
                                                    setExpenseUnitPrice(String(Number(item.averageCost ?? 0)));
                                            }, children: stockItems.map((item) => (_jsx(MenuItem, { value: item.id, children: item.name }, item.id))) }), _jsx(TextField, { label: "\u0627\u0644\u0643\u0645\u064A\u0629", type: "number", value: expenseQty, onChange: (e) => setExpenseQty(e.target.value) }), _jsx(TextField, { label: "\u0633\u0639\u0631 \u0627\u0644\u0648\u062D\u062F\u0629", type: "number", value: expenseUnitPrice, onChange: (e) => setExpenseUnitPrice(e.target.value) })] })) : (_jsx(TextField, { label: "\u0627\u0644\u0645\u0628\u0644\u063A", type: "number", value: expenseAmount, onChange: (e) => setExpenseAmount(e.target.value) })), _jsx(TextField, { label: "\u0627\u0644\u0628\u064A\u0627\u0646", value: expenseNote, onChange: (e) => setExpenseNote(e.target.value) })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setExpenseOpen(false), children: "\u0625\u0644\u063A\u0627\u0621" }), _jsx(Button, { variant: "contained", disabled: !workspace.shiftOpen, onClick: async () => {
                                    const res = await workspace.createExpense(expenseKind === 'ITEM'
                                        ? { kind: 'ITEM', stockItemId: expenseStockItemId, quantity: Number(expenseQty) || 0, unitPrice: Number(expenseUnitPrice) || 0, note: expenseNote }
                                        : { kind: 'GENERAL', amount: Number(expenseAmount) || 0, note: expenseNote });
                                    if (res.ok) {
                                        setExpenseOpen(false);
                                        setExpenseAmount('0');
                                        setExpenseNote('');
                                        notify('تم تسجيل المصروف.');
                                    }
                                    else
                                        notify(res.body ?? res.error ?? 'فشل تسجيل المصروف');
                                }, children: "\u062D\u0641\u0638" })] })] }), _jsxs(Dialog, { open: shiftOpenDialog, onClose: () => setShiftOpenDialog(false), fullWidth: true, maxWidth: "xs", children: [_jsx(DialogTitle, { children: "\u0641\u062A\u062D \u0648\u0631\u062F\u064A\u0629" }), _jsx(DialogContent, { children: _jsxs(Stack, { spacing: 2, sx: { pt: 1 }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u0627\u0641\u062A\u062D \u0627\u0644\u0648\u0631\u062F\u064A\u0629 \u0642\u0628\u0644 \u0627\u0644\u0628\u064A\u0639. \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u0639\u0644\u0651\u0642\u0629 \u062A\u0628\u0642\u0649 \u0645\u062D\u0641\u0648\u0638\u0629." }), _jsx(TextField, { label: "\u0639\u0647\u062F\u0629 \u0627\u0644\u0641\u062A\u062D (\u0646\u0642\u062F\u064A)", type: "number", value: openingFloat, onChange: (e) => setOpeningFloat(e.target.value) })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setShiftOpenDialog(false), children: "\u0625\u0644\u063A\u0627\u0621" }), _jsx(Button, { variant: "contained", onClick: async () => {
                                    const res = await workspace.openShift(Number(openingFloat) || 0);
                                    if (res.ok) {
                                        setShiftOpenDialog(false);
                                        setOpeningFloat('0');
                                        notify(res.data?.created ? 'تم فتح وردية جديدة.' : 'الوردية مفتوحة.');
                                    }
                                    else
                                        notify(res.body ?? res.error ?? 'فشل فتح الوردية');
                                }, children: "\u0641\u062A\u062D" })] })] }), workspace.shift ? (_jsx(ShiftCloseDialog, { open: shiftCloseDialog, onClose: () => setShiftCloseDialog(false), shiftNumber: workspace.shift.shiftNumber, cashierName: workspace.shiftOperatorName, summary: workspace.closeShiftSummary, onConfirm: async (counted) => {
                    const res = await workspace.closeShiftSession(counted);
                    if (!res.ok) {
                        notify(res.error ?? 'فشل الإغلاق');
                        throw new Error(res.error ?? 'فشل الإغلاق');
                    }
                    setShiftCloseDialog(false);
                    notify('تم إغلاق الوردية.');
                } })) : null] }));
}
