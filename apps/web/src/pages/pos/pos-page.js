import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Fab, MenuItem, Snackbar, Stack, TextField, Typography, useMediaQuery, useTheme, } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { buildReceiptFromSavedOrder } from '../../lib/pos-receipt.js';
import { enqueuePosPrint, preloadPosPrintPipeline } from '../../lib/pos-print-queue.js';
import { fetchOrderDetailForPos } from '../../lib/pos-order-detail.js';
import { isPrintBridgeOnline } from '../../lib/pos-print-bridge.js';
import { getReceiptSettings } from '../../lib/pos-receipt-settings.js';
import { OrderAuditDialog } from './components/order-audit-dialog.js';
import { OrderSummaryDialog } from './components/order-summary-dialog.js';
import { apiCancelClosedOrder, apiPendingCashHandoff, apiRequestCancelOrder, apiUncollectOrder, apiWithdrawCancelRequest } from '../../lib/api.js';
import { parseApiErrorBody } from '../../lib/api-client.js';
import { patchShiftOrderRemoved, patchShiftOrderUncollected } from '../../lib/hooks.js';
import { ShiftCloseDialog } from '../treasury-workspace/components/shift-close-dialog.js';
import { ShiftSummaryPreviewDialog } from '../treasury-workspace/components/shift-summary-preview-dialog.js';
import { formatShiftDuration, formatShiftMoney, formatShiftOpenedAt } from '../../lib/shift-summary-utils.js';
import { ALL_CATEGORIES } from './constants.js';
import { getStoreBranding } from '../../lib/pos-receipt.js';
import { OrderModal } from './components/order-modal.js';
import { PosKpiGrid } from './components/pos-kpi-grid.js';
import { ProductionPlanDialog } from './components/production-plan-dialog.js';
import { PrintSetupDialog } from './components/print-setup-dialog.js';
import { ShiftOrdersSection } from './components/shift-orders-section.js';
import { SuspendedSection } from './components/suspended-section.js';
import { usePosCatalog } from './use-pos-catalog.js';
import { usePosOrderSession } from './use-pos-order-session.js';
import { PageToolbar } from '../../components/page-toolbar.js';
import { usePosExpenseStock, usePosWorkspace } from './use-pos-workspace.js';
import { formatCurrency } from './utils.js';
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
    const canOpenShiftWorkspace = canTreasury || hasPermission(permissions, 'pos.use');
    const catalog = usePosCatalog(workspace.effectiveBranchId, workspace.accessToken);
    const [snack, setSnack] = useState('');
    const [snackSeverity, setSnackSeverity] = useState('success');
    const productPlanMap = useMemo(() => {
        const m = new Map();
        catalog.products.forEach((p) => {
            if (p.dailyPlan)
                m.set(p.id, p.dailyPlan);
        });
        return m;
    }, [catalog.products]);
    const order = usePosOrderSession(workspace, {
        paymentMethods: catalog.paymentMethods,
        setActiveCategory: catalog.setActiveCategory,
        onNotify: (msg) => {
            setSnack(msg);
            if (msg.includes('أكبر من الخطة') || msg.includes('فوق الخطة'))
                setSnackSeverity('error');
            else if (msg.includes('قربت تخلص') || msg.includes('اكتملت'))
                setSnackSeverity('warning');
            else
                setSnackSeverity('info');
        },
        getProductDailyPlan: (id) => productPlanMap.get(id),
    });
    const [shiftOrdersTab, setShiftOrdersTab] = useState('uncollected');
    const [shiftOpenDialog, setShiftOpenDialog] = useState(false);
    const [shiftCloseDialog, setShiftCloseDialog] = useState(false);
    const [openingFloat, setOpeningFloat] = useState('0');
    const [pendingCashHandoff, setPendingCashHandoff] = useState(null);
    const [collectOpen, setCollectOpen] = useState(false);
    const [collectOrder, setCollectOrder] = useState(null);
    const [collectPayment, setCollectPayment] = useState('cash');
    const [collectError, setCollectError] = useState('');
    const [pendingOrderId, setPendingOrderId] = useState(null);
    const collectInFlight = useRef(false);
    const queryClient = useQueryClient();
    const [printSetupOpen, setPrintSetupOpen] = useState(false);
    const [expenseOpen, setExpenseOpen] = useState(false);
    const [expenseKind, setExpenseKind] = useState('GENERAL');
    const [expenseAmount, setExpenseAmount] = useState('0');
    const [expenseNote, setExpenseNote] = useState('');
    const [expenseStockItemId, setExpenseStockItemId] = useState('');
    const [expenseQty, setExpenseQty] = useState('0');
    const [expenseUnitPrice, setExpenseUnitPrice] = useState('0');
    const [expensePaymentMethod, setExpensePaymentMethod] = useState('CASH');
    const [transferOpen, setTransferOpen] = useState(false);
    const [transferFrom, setTransferFrom] = useState('INSTAPAY');
    const [transferTo, setTransferTo] = useState('CASH');
    const [transferAmount, setTransferAmount] = useState('0');
    const [transferNote, setTransferNote] = useState('');
    const [productionPlanOpen, setProductionPlanOpen] = useState(false);
    const [auditOrder, setAuditOrder] = useState(null);
    const [summaryOrder, setSummaryOrder] = useState(null);
    const [summaryPreviewOpen, setSummaryPreviewOpen] = useState(false);
    const deliveryDrivers = getReceiptSettings().deliveryDrivers;
    const { data: stockItems = [] } = usePosExpenseStock(workspace.effectiveBranchId, expenseOpen && expenseKind === 'ITEM');
    const transferAvailable = useMemo(() => {
        const net = workspace.displayPosSummary?.netSalesByMethod?.[transferFrom];
        return net?.total ?? 0;
    }, [workspace.displayPosSummary, transferFrom]);
    useEffect(() => {
        if (workspace.shiftOpen && canUsePrint) {
            preloadPosPrintPipeline();
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
            }
            else {
                setPendingCashHandoff(null);
            }
        });
    }, [shiftOpenDialog, workspace.accessToken, workspace.resolvedCashBoxId]);
    const cartQtyMap = useMemo(() => {
        const m = new Map();
        order.cartItems.forEach((i) => m.set(i.productId, i.quantity));
        return m;
    }, [order.cartItems]);
    const notify = (msg) => {
        setSnack(msg);
        setSnackSeverity('success');
    };
    const shiftSummaryPreviewParams = workspace.shiftOpen && workspace.displayPosSummary ? {
        shiftNumber: workspace.shift?.shiftNumber,
        cashierName: workspace.shiftOperatorName,
        openedAt: workspace.shift?.openedAt,
        summary: {
            ...workspace.displayPosSummary,
            uncollectedCount: workspace.displayPosSummary.uncollectedCount ?? workspace.uncollectedOrders.length,
            uncollectedTotal: workspace.displayPosSummary.uncollectedTotal ?? workspace.uncollectedAmount,
            uncollectedOrders: workspace.displayPosSummary.uncollectedOrders ?? workspace.uncollectedOrders.map((o) => ({
                orderNumber: o.code,
                total: o.total,
                customerName: o.ownerName || null,
            })),
        },
    } : null;
    const openShiftSummaryPreview = () => {
        if (!shiftSummaryPreviewParams)
            return;
        setSummaryPreviewOpen(true);
    };
    const paymentLabel = (id) => catalog.paymentMethods.find((m) => m.id === id)?.label ?? id;
    const handlePrintResult = (printRes) => {
        if (printRes.ok) {
            const label = printRes.copies === 'customer' ? 'نسخة الزبون' : printRes.copies === 'kitchen' ? 'نسخة المطبخ' : 'نسخة الشيف + الزبون';
            const via = printRes.method === 'escpos' ? 'ESC/POS' : printRes.method === 'bridge' ? 'Print Bridge' : 'QZ';
            notify(`تمت الطباعة الصامتة (${label}) عبر ${via}`);
            return;
        }
        notify(printRes.message ?? 'فشل الطباعة');
        if (printRes.reason && canUsePrint)
            setPrintSetupOpen(true);
    };
    const handleReprint = (savedOrder, copies) => {
        if (!canUsePrint)
            return;
        const printFromOrder = (orderForPrint) => {
            const brand = getStoreBranding();
            const receipt = buildReceiptFromSavedOrder(orderForPrint, {
                storeName: brand.storeName,
                storeSubtitle: brand.storeSubtitle,
                storeFooter: brand.storeFooter,
                storePhone: brand.storePhone,
                cashierName: workspace.shiftOperatorName,
                paymentMethodLabel: paymentLabel(savedOrder.paymentMethod),
                shiftNumber: workspace.shift?.shiftNumber != null ? String(workspace.shift.shiftNumber) : '1',
                isPaid: savedOrder.collectionStatus !== 'uncollected',
            });
            enqueuePosPrint(receipt, { force: true, silent: true, copies }, (printRes) => {
                handlePrintResult(printRes);
            });
        };
        const token = workspace.accessToken;
        const needsDetail = token && (!savedOrder.items.length || savedOrder.itemsCount > savedOrder.items.length);
        if (needsDetail) {
            void fetchOrderDetailForPos(savedOrder.id, token).then((detail) => {
                printFromOrder(detail ?? savedOrder);
            });
        }
        else {
            printFromOrder(savedOrder);
        }
    };
    const handleUncollect = async (order) => {
        const token = workspace.accessToken;
        if (!token)
            return;
        const shiftId = workspace.effectiveShiftId;
        if (shiftId)
            patchShiftOrderUncollected(queryClient, shiftId, order.id);
        notify(`تم إرجاع ${order.code} إلى غير مدفوع`);
        void (async () => {
            const res = await apiUncollectOrder(order.id, token);
            if (!res.ok) {
                notify(parseApiErrorBody(res.body, res.error ?? 'فشل التراجع'));
                void workspace.refreshAfterOrder(shiftId);
            }
            else {
                void workspace.refreshAfterOrder(shiftId);
            }
        })();
    };
    const handleCancel = async (order, reason) => {
        const token = workspace.accessToken;
        if (!token)
            return;
        const shiftId = workspace.effectiveShiftId;
        if (shiftId)
            patchShiftOrderRemoved(queryClient, shiftId, order.id);
        notify(`تم إلغاء ${order.code}`);
        void (async () => {
            const res = await apiCancelClosedOrder(order.id, reason || undefined, token);
            if (!res.ok) {
                notify(parseApiErrorBody(res.body, res.error ?? 'فشل الإلغاء'));
                void workspace.refreshAfterOrder(shiftId);
            }
            else {
                void workspace.refreshAfterOrder(shiftId);
            }
        })();
    };
    const handleRequestCancel = async (order, reason) => {
        const token = workspace.accessToken;
        if (!token)
            return;
        notify(`تم إرسال طلب إلغاء ${order.code} للمدير`);
        void (async () => {
            const res = await apiRequestCancelOrder(order.id, reason || undefined, token);
            if (!res.ok) {
                notify(parseApiErrorBody(res.body, res.error ?? 'فشل طلب الإلغاء'));
            }
            void workspace.refreshAfterOrder(workspace.effectiveShiftId);
        })();
    };
    const handleWithdrawCancel = async (order) => {
        const token = workspace.accessToken;
        if (!token)
            return;
        notify(`تم سحب طلب إلغاء ${order.code}`);
        void (async () => {
            const res = await apiWithdrawCancelRequest(order.id, token);
            if (!res.ok) {
                notify(parseApiErrorBody(res.body, res.error ?? 'فشل سحب الطلب'));
            }
            void workspace.refreshAfterOrder(workspace.effectiveShiftId);
        })();
    };
    useEffect(() => {
        if (collectOpen)
            preloadPosPrintPipeline();
    }, [collectOpen]);
    const runCollect = (withPrint) => {
        if (!collectOrder || collectInFlight.current)
            return;
        collectInFlight.current = true;
        const order = collectOrder;
        const payment = collectPayment;
        const shiftId = workspace.effectiveShiftId;
        setCollectOpen(false);
        setCollectOrder(null);
        setCollectError('');
        const res = workspace.collectOrder(order, payment, (message) => {
            notify(parseApiErrorBody(message, message));
            void workspace.refreshAfterOrder(shiftId);
        });
        if (!res.ok) {
            notify(res.error ?? 'فشل التحصيل');
            collectInFlight.current = false;
            return;
        }
        notify(`تم تحصيل ${order.code} في الدرج`);
        if (withPrint && canUsePrint) {
            const brand = getStoreBranding();
            const printFromOrder = (orderForPrint) => {
                const receipt = buildReceiptFromSavedOrder(orderForPrint, {
                    storeName: brand.storeName,
                    storeSubtitle: brand.storeSubtitle,
                    storeFooter: brand.storeFooter,
                    storePhone: brand.storePhone,
                    cashierName: workspace.shiftOperatorName,
                    paymentMethodLabel: paymentLabel(payment),
                    shiftNumber: workspace.shift?.shiftNumber != null ? String(workspace.shift.shiftNumber) : '1',
                    isPaid: true,
                });
                enqueuePosPrint(receipt, { force: true, silent: true, copies: 'customer' }, (printRes) => {
                    handlePrintResult(printRes);
                });
            };
            const needsDetail = !order.items.length || order.itemsCount > order.items.length;
            if (needsDetail && workspace.accessToken) {
                void fetchOrderDetailForPos(order.id, workspace.accessToken).then((detail) => {
                    printFromOrder(detail ?? order);
                });
            }
            else {
                printFromOrder(order);
            }
        }
        collectInFlight.current = false;
    };
    const shiftKnown = !workspace.shiftStatusPending;
    const shiftLikelyOpen = workspace.shiftOpen || (workspace.shiftStatusPending && workspace.cachedShiftOpen);
    const ensureShift = () => {
        if (workspace.shiftStatusPending && workspace.cachedShiftOpen)
            return true;
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
    return (_jsxs(Stack, { spacing: 2.5, children: [_jsx(Snackbar, { open: Boolean(snack), autoHideDuration: 5000, onClose: () => setSnack(''), anchorOrigin: { vertical: 'bottom', horizontal: 'center' }, children: _jsx(Alert, { severity: snackSeverity, variant: "filled", onClose: () => setSnack(''), sx: { width: '100%', maxWidth: 480 }, children: snack }) }), shiftKnown && !workspace.shiftOpen && workspace.contextReady ? (_jsx(Alert, { severity: "warning", sx: { borderRadius: 3 }, action: _jsx(Button, { color: "inherit", size: "small", onClick: () => setShiftOpenDialog(true), children: "\u0641\u062A\u062D \u0648\u0631\u062F\u064A\u0629" }), children: "\u0627\u0644\u0648\u0631\u062F\u064A\u0629 \u0645\u063A\u0644\u0642\u0629 \u2014 \u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u0633\u062C\u064A\u0644 \u0637\u0644\u0628\u0627\u062A \u0623\u0648 \u0645\u0635\u0631\u0648\u0641\u0627\u062A \u062D\u062A\u0649 \u062A\u0641\u062A\u062D \u0627\u0644\u0648\u0631\u062F\u064A\u0629." })) : null, workspace.posContextError ? (_jsx(Alert, { severity: "error", sx: { borderRadius: 3 }, action: _jsx(Button, { size: "small", onClick: () => workspace.refetchPosContext(), children: "\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629" }), children: workspace.posContextErrorDetail?.message ?? 'فشل تحميل سياق نقطة البيع' })) : null, _jsx(PageToolbar, { title: "\u0646\u0642\u0637\u0629 \u0627\u0644\u0628\u064A\u0639", subtitle: shiftStatusText, meta: _jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", flexWrap: "wrap", useFlexGap: true, sx: { mt: 1 }, children: [window.electronAPI?.isDesktop ? (_jsx(Chip, { label: desktopVersion ? `Desktop v${desktopVersion}` : 'Desktop', size: "small", variant: "outlined" })) : null, desktopUpdateLabel ? _jsx(Chip, { label: desktopUpdateLabel, size: "small", variant: "outlined" }) : null, _jsx(Chip, { label: shiftChipLabel, size: "small", variant: "outlined" }), _jsxs(Typography, { variant: "caption", color: "text.secondary", children: [workspace.posContext?.branch?.name ?? '—', " \u00B7 ", workspace.posContext?.cashBox?.name ?? '—'] })] }), actions: _jsxs(_Fragment, { children: [canUsePrint ? (_jsx(Button, { variant: "outlined", size: "small", onClick: () => setPrintSetupOpen(true), children: "\u0637\u0627\u0628\u0639\u0629" })) : null, canManagePrint ? (_jsx(Button, { variant: "outlined", size: "small", onClick: () => navigate('/settings/receipt'), children: "\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629" })) : null, canOpenShiftWorkspace && workspace.shiftOpen ? (_jsx(Button, { variant: "outlined", size: "small", onClick: () => navigate('/shifts'), children: canManagePrint ? 'الخزنة' : 'ورديتي' })) : null, workspace.shiftOpen && workspace.displayPosSummary ? (_jsx(Button, { variant: "outlined", size: "small", onClick: openShiftSummaryPreview, children: "\u0645\u0644\u062E\u0635 \u0627\u0644\u0648\u0631\u062F\u064A\u0629" })) : null, canManagePrint ? (_jsxs(Button, { variant: "outlined", size: "small", onClick: () => order.toggleAutoPrint(!order.autoPrint), children: ["\u0637\u0628\u0627\u0639\u0629: ", order.autoPrint ? 'مفعّلة' : 'معطّلة'] })) : null, workspace.shiftOpen ? (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "outlined", size: "small", onClick: () => setProductionPlanOpen(true), children: "\u062E\u0637\u0629 \u0627\u0644\u0625\u0646\u062A\u0627\u062C" }), _jsx(Button, { variant: "outlined", size: "small", onClick: () => setExpenseOpen(true), children: "\u0645\u0635\u0631\u0648\u0641" }), _jsx(Button, { variant: "outlined", size: "small", onClick: () => setTransferOpen(true), children: "\u062A\u062D\u0648\u064A\u0644" }), _jsx(Button, { variant: "outlined", size: "small", onClick: () => setShiftCloseDialog(true), children: (workspace.uncollectedOrders?.length ?? 0) + (workspace.posSummary?.suspendedCount ?? 0) > 0 ? 'تسليم وردية' : 'إغلاق وردية' })] })) : (_jsx(Button, { variant: "contained", size: "small", onClick: () => setShiftOpenDialog(true), children: "\u0641\u062A\u062D \u0648\u0631\u062F\u064A\u0629" })), _jsx(Button, { variant: "contained", size: "medium", disabled: !shiftLikelyOpen, onClick: () => { if (ensureShift())
                                order.openNewOrder(); }, children: "+ \u0637\u0644\u0628 \u062C\u062F\u064A\u062F" })] }) }), _jsx(PosKpiGrid, { shiftOpen: workspace.shiftOpen, posSummary: workspace.displayPosSummary, uncollectedCount: workspace.displayUncollectedCount, uncollectedAmount: workspace.displayUncollectedAmount, suspendedCount: workspace.suspendedOrders.length, shiftNumber: workspace.shift?.shiftNumber, cashierName: workspace.shiftOperatorName, openedAt: workspace.shift?.openedAt, onOpenSummaryPreview: openShiftSummaryPreview }), _jsx(SuspendedSection, { orders: workspace.suspendedOrders, loading: workspace.suspendedPending, onResume: async (o) => {
                    const res = await order.resumeSuspended(o);
                    if (res.ok)
                        notify(`تم استرجاع ${o.code}`);
                    else
                        notify(res.body ?? res.error ?? 'فشل الاسترجاع');
                } }), _jsx(ShiftOrdersSection, { shiftOpen: workspace.shiftOpen, orders: workspace.shiftClosedOrders, uncollected: workspace.uncollectedOrders, collected: workspace.collectedOrders, loading: workspace.shiftOrdersPending, error: workspace.shiftOrdersError, tab: shiftOrdersTab, onTabChange: setShiftOrdersTab, onCollect: (o) => { setCollectOrder(o); setCollectPayment(o.paymentMethod); setCollectError(''); setCollectOpen(true); }, onRetry: () => workspace.refreshAll(), showReprint: canUsePrint, onReprint: handleReprint, onViewAudit: (o) => setAuditOrder(o), onViewSummary: async (o) => {
                    const token = workspace.accessToken;
                    if (token && !o.items.length && o.itemsCount > 0) {
                        const detail = await fetchOrderDetailForPos(o.id, token);
                        setSummaryOrder(detail ?? o);
                        return;
                    }
                    setSummaryOrder(o);
                }, onEdit: async (o) => {
                    const token = workspace.accessToken;
                    if (token && !o.items.length && o.itemsCount > 0) {
                        const detail = await fetchOrderDetailForPos(o.id, token);
                        if (detail) {
                            order.openEditOrder(detail);
                            return;
                        }
                    }
                    order.openEditOrder(o);
                }, onUncollect: handleUncollect, onCancel: handleCancel, onRequestCancel: handleRequestCancel, onWithdrawCancel: handleWithdrawCancel, pendingOrderId: pendingOrderId, hasMoreCollected: workspace.hasMoreCollected, collectedLoadingMore: workspace.collectedLoadingMore, onLoadMoreCollected: () => workspace.fetchNextCollectedPage?.(), hasMoreUncollected: workspace.hasMoreUncollected, uncollectedLoadingMore: workspace.uncollectedLoadingMore, onLoadMoreUncollected: () => workspace.fetchNextUncollectedPage?.(), totalUncollectedCount: workspace.displayUncollectedCount, totalCollectedCount: workspace.displayCollectedCount }), _jsx(Fab, { color: "primary", variant: "extended", disabled: !shiftLikelyOpen, onClick: () => { if (ensureShift())
                    order.openNewOrder(); }, sx: { position: 'fixed', bottom: 24, left: 24, fontWeight: 800, zIndex: 10 }, children: "+ \u0637\u0644\u0628 \u062C\u062F\u064A\u062F" }), _jsx(OrderModal, { open: order.modalOpen, mode: order.editMode ? 'edit' : 'create', editBaselineQty: order.editBaselineQty, fullScreen: fullScreenModal, branchId: workspace.effectiveBranchId, operatorName: workspace.operatorName, orderType: order.orderType, currentOrderCode: order.currentOrderCode, collectionStatus: order.collectionStatus, productSearch: order.productSearch, onProductSearch: order.setProductSearch, orderOwnerName: order.orderOwnerName, onOrderOwnerName: order.setOrderOwnerName, customerPhone: order.customerPhone, onCustomerPhone: order.setCustomerPhone, onSelectCustomer: order.applyCustomerSuggestion, customerAddress: order.customerAddress, onCustomerAddress: order.setCustomerAddress, captainName: order.captainName, onCaptainName: order.setCaptainName, onOrderTypeChange: order.setOrderTypeAndDefaults, categories: catalog.categories, activeCategory: catalog.activeCategory, onCategoryChange: catalog.setActiveCategory, allCategoriesKey: ALL_CATEGORIES, products: catalog.products, catalogPending: catalog.catalogPending, cartItems: order.cartItems, cartQtyMap: cartQtyMap, onAddProduct: order.addProduct, onUpdateQty: order.updateQuantity, onUpdateNote: order.updateNote, paymentMethods: catalog.paymentMethods, paymentMethod: order.paymentMethod, onPaymentMethod: order.setPaymentMethod, onCollectionStatus: order.setCollectionStatus, discountAmount: order.discountAmount, onDiscountAmount: order.setDiscountAmount, orderNote: order.orderNote, onOrderNote: order.setOrderNote, sauces: catalog.sauces, paidSauceProductIds: catalog.paidSauceProductIds, onToggleItemSauce: order.toggleItemSauce, subtotal: order.subtotal, discount: order.discount, total: order.total, onClose: () => order.closeModal(), deliveryDrivers: deliveryDrivers, validateTakeawayCustomer: order.validateTakeawayCustomer, onSuspend: async () => {
                    const res = await order.suspendOrder();
                    if (res?.ok)
                        notify('تم تعليق الطلب.');
                    if (!res?.ok) {
                        const err = res?.error ?? res?.body;
                        return { ok: false, ...(err ? { error: err } : {}) };
                    }
                    return { ok: true };
                }, onCloseOrder: () => { void order.closeOrder(); }, onSaveEdit: async () => {
                    const res = await order.saveEditedOrder();
                    if (res.ok)
                        notify(`تم حفظ تعديلات الطلب.`);
                    else
                        notify(parseApiErrorBody(res.error, 'فشل حفظ التعديل'));
                    return res;
                }, onClearCart: () => { order.resetOrder(); notify('تم إفراغ السلة.'); } }), auditOrder ? (_jsx(OrderAuditDialog, { open: Boolean(auditOrder), orderId: auditOrder.id, orderCode: auditOrder.code, onClose: () => setAuditOrder(null) })) : null, _jsx(OrderSummaryDialog, { open: Boolean(summaryOrder), order: summaryOrder, ...(() => {
                    if (!summaryOrder)
                        return {};
                    const label = catalog.paymentMethods.find((m) => m.id === summaryOrder.paymentMethod)?.label;
                    return label ? { paymentMethodLabel: label } : {};
                })(), onClose: () => setSummaryOrder(null) }), _jsx(ProductionPlanDialog, { open: productionPlanOpen, branchId: workspace.effectiveBranchId, accessToken: workspace.accessToken, onClose: () => setProductionPlanOpen(false), onSaved: () => {
                    notify('تم حفظ خطة الإنتاج.');
                    void catalog.reload();
                } }), _jsxs(Dialog, { open: collectOpen, onClose: () => { setCollectOpen(false); setCollectError(''); }, fullWidth: true, maxWidth: "xs", children: [_jsx(DialogTitle, { children: "\u062A\u0633\u062C\u064A\u0644 \u062A\u062D\u0635\u064A\u0644 \u0641\u064A \u0627\u0644\u062F\u0631\u062C" }), _jsx(DialogContent, { children: _jsxs(Stack, { spacing: 2, sx: { pt: 1 }, children: [collectError ? _jsx(Alert, { severity: "error", children: collectError }) : null, _jsx(TextField, { label: "\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628", value: collectOrder?.code ?? '', InputProps: { readOnly: true } }), _jsx(TextField, { label: "\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A", value: collectOrder ? formatCurrency(collectOrder.total) : '', InputProps: { readOnly: true } }), _jsx(TextField, { select: true, label: "\u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u062F\u0641\u0639", value: collectPayment, onChange: (e) => setCollectPayment(e.target.value), children: catalog.paymentMethods.map((m) => _jsx(MenuItem, { value: m.id, children: m.label }, m.id)) })] }) }), _jsxs(DialogActions, { sx: { flexWrap: 'wrap', gap: 1, px: 2, pb: 2 }, children: [_jsx(Button, { onClick: () => { setCollectOpen(false); setCollectError(''); }, children: "\u0625\u0644\u063A\u0627\u0621" }), _jsx(Button, { variant: "outlined", onClick: () => runCollect(false), children: "\u062A\u062D\u0635\u064A\u0644 \u0641\u0642\u0637" }), canUsePrint ? (_jsx(Button, { variant: "contained", onClick: () => runCollect(true), children: "\u062A\u062D\u0635\u064A\u0644 \u0648\u0637\u0628\u0627\u0639\u0629" })) : null] })] }), canUsePrint ? (_jsx(PrintSetupDialog, { open: printSetupOpen, onClose: () => setPrintSetupOpen(false) })) : null, _jsxs(Dialog, { open: expenseOpen, onClose: () => setExpenseOpen(false), fullWidth: true, maxWidth: "sm", children: [_jsx(DialogTitle, { children: "\u062A\u0633\u062C\u064A\u0644 \u0645\u0635\u0631\u0648\u0641 \u0645\u0646 \u0627\u0644\u0648\u0631\u062F\u064A\u0629" }), _jsx(DialogContent, { children: _jsxs(Stack, { spacing: 2, sx: { pt: 1 }, children: [_jsx(Alert, { severity: "info", sx: { borderRadius: 2 }, children: "\u064A\u064F\u062E\u0635\u0645 \u0645\u0646 \u062D\u0633\u0627\u0628 \u0627\u0644\u062F\u0641\u0639 \u0627\u0644\u0645\u062E\u062A\u0627\u0631 (\u0646\u0642\u062F\u064A \u0645\u0646 \u0627\u0644\u062F\u0631\u062C\u060C \u0623\u0648 \u0627\u0646\u0633\u062A\u0627\u0628\u0627\u064A/\u0645\u062D\u0641\u0638\u0629 \u0645\u0646 \u0631\u0635\u064A\u062F \u0627\u0644\u0648\u0631\u062F\u064A\u0629)." }), _jsxs(TextField, { select: true, label: "\u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u062F\u0641\u0639", value: expensePaymentMethod, onChange: (e) => setExpensePaymentMethod(e.target.value), children: [_jsx(MenuItem, { value: "CASH", children: "\u0646\u0642\u062F\u064A (\u0627\u0644\u062F\u0631\u062C)" }), _jsx(MenuItem, { value: "INSTAPAY", children: "\u0627\u0646\u0633\u062A\u0627\u0628\u0627\u064A" }), _jsx(MenuItem, { value: "WALLET", children: "\u0645\u062D\u0641\u0638\u0629" })] }), _jsxs(TextField, { select: true, label: "\u0646\u0648\u0639 \u0627\u0644\u0645\u0635\u0631\u0648\u0641", value: expenseKind, onChange: (e) => setExpenseKind(e.target.value), children: [_jsx(MenuItem, { value: "GENERAL", children: "\u0645\u0635\u0631\u0648\u0641 \u0639\u0627\u0645" }), _jsx(MenuItem, { value: "ITEM", children: "\u0634\u0631\u0627\u0621 \u062E\u0627\u0645\u0627\u062A" })] }), expenseKind === 'ITEM' ? (_jsxs(_Fragment, { children: [_jsx(TextField, { select: true, label: "\u0627\u0644\u0635\u0646\u0641", value: expenseStockItemId, onChange: (e) => {
                                                const id = e.target.value;
                                                setExpenseStockItemId(id);
                                                const item = stockItems.find((s) => s.id === id);
                                                if (item)
                                                    setExpenseUnitPrice(String(Number(item.averageCost ?? 0)));
                                            }, children: stockItems.map((item) => (_jsx(MenuItem, { value: item.id, children: item.name }, item.id))) }), _jsx(TextField, { label: "\u0627\u0644\u0643\u0645\u064A\u0629", type: "number", value: expenseQty, onChange: (e) => setExpenseQty(e.target.value) }), _jsx(TextField, { label: "\u0633\u0639\u0631 \u0627\u0644\u0648\u062D\u062F\u0629", type: "number", value: expenseUnitPrice, onChange: (e) => setExpenseUnitPrice(e.target.value) })] })) : (_jsx(TextField, { label: "\u0627\u0644\u0645\u0628\u0644\u063A", type: "number", value: expenseAmount, onChange: (e) => setExpenseAmount(e.target.value) })), _jsx(TextField, { label: "\u0627\u0644\u0628\u064A\u0627\u0646", value: expenseNote, onChange: (e) => setExpenseNote(e.target.value) })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setExpenseOpen(false), children: "\u0625\u0644\u063A\u0627\u0621" }), _jsx(Button, { variant: "contained", disabled: !workspace.shiftOpen, onClick: async () => {
                                    const res = await workspace.createExpense(expenseKind === 'ITEM'
                                        ? { kind: 'ITEM', stockItemId: expenseStockItemId, quantity: Number(expenseQty) || 0, unitPrice: Number(expenseUnitPrice) || 0, note: expenseNote, paymentMethod: expensePaymentMethod }
                                        : { kind: 'GENERAL', amount: Number(expenseAmount) || 0, note: expenseNote, paymentMethod: expensePaymentMethod });
                                    if (res.ok) {
                                        setExpenseOpen(false);
                                        setExpenseAmount('0');
                                        setExpenseNote('');
                                        setExpensePaymentMethod('CASH');
                                        notify('تم تسجيل المصروف.');
                                    }
                                    else if (res.unauthorized) {
                                        notify('انتهت الجلسة. سجّل الدخول مرة أخرى.');
                                    }
                                    else {
                                        notify(parseApiErrorBody(res.body, res.error ?? 'فشل تسجيل المصروف'));
                                    }
                                }, children: "\u062D\u0641\u0638" })] })] }), _jsxs(Dialog, { open: transferOpen, onClose: () => setTransferOpen(false), fullWidth: true, maxWidth: "sm", children: [_jsx(DialogTitle, { children: "\u062A\u062D\u0648\u064A\u0644 \u0628\u064A\u0646 \u062D\u0633\u0627\u0628\u0627\u062A \u0627\u0644\u0648\u0631\u062F\u064A\u0629" }), _jsx(DialogContent, { children: _jsxs(Stack, { spacing: 2, sx: { pt: 1 }, children: [_jsx(Alert, { severity: "info", sx: { borderRadius: 2 }, children: "\u0644\u0648 \u0639\u0645\u064A\u0644 \u062F\u0641\u0639 \u0627\u0646\u0633\u062A\u0627\u0628\u0627\u064A \u0648\u062A\u0633\u0644\u0651\u0645 \u062A\u0645\u0646 \u062F\u0644\u064A\u0641\u0631\u064A \u0643\u0627\u0634 \u2014 \u062D\u0648\u0651\u0644 \u0645\u0646 \u0627\u0646\u0633\u062A\u0627\u0628\u0627\u064A \u0625\u0644\u0649 \u0646\u0642\u062F\u064A. \u0647\u0630\u0627 \u0644\u064A\u0633 \u0645\u0635\u0631\u0648\u0641\u0627\u064B." }), _jsxs(TextField, { select: true, label: "\u0645\u0646", value: transferFrom, onChange: (e) => setTransferFrom(e.target.value), children: [_jsx(MenuItem, { value: "CASH", children: "\u0646\u0642\u062F\u064A (\u0627\u0644\u062F\u0631\u062C)" }), _jsx(MenuItem, { value: "INSTAPAY", children: "\u0627\u0646\u0633\u062A\u0627\u0628\u0627\u064A" }), _jsx(MenuItem, { value: "WALLET", children: "\u0645\u062D\u0641\u0638\u0629" })] }), _jsxs(TextField, { select: true, label: "\u0625\u0644\u0649", value: transferTo, onChange: (e) => setTransferTo(e.target.value), children: [_jsx(MenuItem, { value: "CASH", children: "\u0646\u0642\u062F\u064A (\u0627\u0644\u062F\u0631\u062C)" }), _jsx(MenuItem, { value: "INSTAPAY", children: "\u0627\u0646\u0633\u062A\u0627\u0628\u0627\u064A" }), _jsx(MenuItem, { value: "WALLET", children: "\u0645\u062D\u0641\u0638\u0629" })] }), _jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["\u0627\u0644\u0645\u062A\u0627\u062D \u0641\u064A \u00AB\u0645\u0646\u00BB: ", formatShiftMoney(transferAvailable)] }), _jsx(TextField, { label: "\u0627\u0644\u0645\u0628\u0644\u063A", type: "number", value: transferAmount, onChange: (e) => setTransferAmount(e.target.value) }), _jsx(TextField, { label: "\u0627\u0644\u0628\u064A\u0627\u0646 (\u0627\u062E\u062A\u064A\u0627\u0631\u064A)", placeholder: "\u0645\u062B\u0627\u0644: \u062A\u0633\u0644\u064A\u0645 \u062A\u0645\u0646 \u062F\u0644\u064A\u0641\u0631\u064A \u0643\u0627\u0634", value: transferNote, onChange: (e) => setTransferNote(e.target.value) })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setTransferOpen(false), children: "\u0625\u0644\u063A\u0627\u0621" }), _jsx(Button, { variant: "contained", disabled: !workspace.shiftOpen || transferFrom === transferTo, onClick: async () => {
                                    const amount = Number(transferAmount) || 0;
                                    if (amount <= 0) {
                                        notify('أدخل مبلغاً أكبر من صفر');
                                        return;
                                    }
                                    const res = await workspace.transferWallet({
                                        fromPaymentMethod: transferFrom,
                                        toPaymentMethod: transferTo,
                                        amount,
                                        ...(transferNote.trim() ? { note: transferNote.trim() } : {}),
                                    });
                                    if (res.ok) {
                                        setTransferOpen(false);
                                        setTransferAmount('0');
                                        setTransferNote('');
                                        setTransferFrom('INSTAPAY');
                                        setTransferTo('CASH');
                                        notify('تم التحويل.');
                                    }
                                    else if (res.unauthorized) {
                                        notify('انتهت الجلسة. سجّل الدخول مرة أخرى.');
                                    }
                                    else {
                                        notify(parseApiErrorBody(res.body, res.error ?? 'فشل التحويل'));
                                    }
                                }, children: "\u062A\u062D\u0648\u064A\u0644" })] })] }), _jsxs(Dialog, { open: shiftOpenDialog, onClose: () => setShiftOpenDialog(false), fullWidth: true, maxWidth: "xs", children: [_jsx(DialogTitle, { children: "\u0641\u062A\u062D \u0648\u0631\u062F\u064A\u0629" }), _jsx(DialogContent, { children: _jsxs(Stack, { spacing: 2, sx: { pt: 1 }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u0627\u0641\u062A\u062D \u0627\u0644\u0648\u0631\u062F\u064A\u0629 \u0642\u0628\u0644 \u0627\u0644\u0628\u064A\u0639. \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u063A\u064A\u0631 \u0627\u0644\u0645\u062D\u0635\u0651\u0644\u0629 \u0639\u0644\u0649 \u0627\u0644\u062E\u0632\u0646\u0629 \u062A\u0628\u0642\u0649 \u0643\u062A\u0630\u0643\u064A\u0631." }), pendingCashHandoff ? (_jsxs(Alert, { severity: "info", children: [pendingCashHandoff.handedByName ?? 'الكاشير السابق', " \u0633\u0644\u0651\u0645\u0643", ' ', Number(pendingCashHandoff.cashAmount).toLocaleString('en-US'), " \u062C.\u0645 \u0646\u0642\u062F\u064A\u0629", ' ', "(\u0645\u0646 \u0648\u0631\u062F\u064A\u0629 ", pendingCashHandoff.fromShiftNumber, ")", pendingCashHandoff.uncollectedCount
                                            ? ` · ${pendingCashHandoff.uncollectedCount} طلب غير محصّل على الخزنة`
                                            : ''] })) : null, _jsx(TextField, { label: "\u0639\u0647\u062F\u0629 \u0627\u0644\u0641\u062A\u062D (\u0646\u0642\u062F\u064A)", type: "number", value: openingFloat, onChange: (e) => setOpeningFloat(e.target.value) })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setShiftOpenDialog(false), children: "\u0625\u0644\u063A\u0627\u0621" }), _jsx(Button, { variant: "contained", onClick: async () => {
                                    const res = await workspace.openShift(Number(openingFloat) || 0);
                                    if (res.ok) {
                                        setShiftOpenDialog(false);
                                        setOpeningFloat('0');
                                        setPendingCashHandoff(null);
                                        const handoffMsg = res.handoffMessage;
                                        if (handoffMsg) {
                                            notify(handoffMsg);
                                        }
                                        else {
                                            notify(res.data?.created ? 'تم فتح وردية جديدة.' : 'الوردية مفتوحة.');
                                        }
                                    }
                                    else
                                        notify(res.body ?? res.error ?? 'فشل فتح الوردية');
                                }, children: "\u0641\u062A\u062D" })] })] }), workspace.shift ? (_jsx(ShiftCloseDialog, { open: shiftCloseDialog, onClose: () => setShiftCloseDialog(false), shiftId: workspace.shift.id, shiftNumber: workspace.shift.shiftNumber, cashierName: workspace.shiftOperatorName, openedAt: workspace.shift.openedAt, summary: workspace.closeShiftSummary, onOpenSummaryPreview: openShiftSummaryPreview, onConfirm: async (payload) => {
                    const res = await workspace.closeShiftSession(payload);
                    if (!res.ok) {
                        notify(res.error ?? 'فشل الإغلاق');
                        throw new Error(res.error ?? 'فشل الإغلاق');
                    }
                    setShiftCloseDialog(false);
                    notify(res.message ?? 'تم إغلاق الوردية.');
                } })) : null, _jsx(ShiftSummaryPreviewDialog, { open: summaryPreviewOpen, onClose: () => setSummaryPreviewOpen(false), params: shiftSummaryPreviewParams, onMessage: notify })] }));
}
