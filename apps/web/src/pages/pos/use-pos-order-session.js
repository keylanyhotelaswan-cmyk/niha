import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiCreateOpenOrder, apiPlaceOrder, apiAmendOrder, apiResumeOrder, apiSuspendOrder, } from '../../lib/api.js';
import { invalidatePosQueries, patchShiftOrderAdded, patchShiftOrderUpdated, refetchPosOrderData } from '../../lib/hooks.js';
import { enqueuePosPrint } from '../../lib/pos-print-queue.js';
import { isAutoPrintEnabled, setAutoPrintEnabled, } from '../../lib/pos-receipt.js';
import { createOrderCode, defaultOwnerName, mapOrderTypeToApi, mapPaymentMethodCode, validateTakeawayOrderFields, } from '../../lib/pos-store.js';
import { itemNoteForApi } from '../../lib/pos-order-sauces.js';
import { ALL_CATEGORIES } from './constants.js';
import { getStoreBranding } from '../../lib/pos-receipt.js';
import { planQuantityChangeAlert, planSoldAdjustment } from './production-plan-utils.js';
export function usePosOrderSession(workspace, catalog) {
    const queryClient = useQueryClient();
    const { accessToken, effectiveBranchId, shift, shiftOpen, cashBoxId, shiftOperatorName, refreshAfterOrder, refetchSuspended, } = workspace;
    const [modalOpen, setModalOpen] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [currentOrderCode, setCurrentOrderCode] = useState(createOrderCode());
    const [orderType, setOrderType] = useState('eat-in');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [discountAmount, setDiscountAmount] = useState('0');
    const [orderNote, setOrderNote] = useState('');
    const [orderOwnerName, setOrderOwnerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [captainName, setCaptainName] = useState('');
    const [collectionStatus, setCollectionStatus] = useState('approved');
    const [cartItems, setCartItems] = useState([]);
    const [openOrderId, setOpenOrderId] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [editingOrderId, setEditingOrderId] = useState(null);
    const [editBaselineQty, setEditBaselineQty] = useState(() => new Map());
    const [autoPrint, setAutoPrint] = useState(() => isAutoPrintEnabled());
    const pendingRef = useRef({ openOrderId: null, cartItems: [], accessToken: null });
    useEffect(() => {
        pendingRef.current = { openOrderId, cartItems, accessToken };
    }, [openOrderId, cartItems, accessToken]);
    useEffect(() => {
        return () => {
            const { openOrderId: id, cartItems: items, accessToken: token } = pendingRef.current;
            if (id && items.length > 0 && token) {
                apiSuspendOrder(id, 'تعليق تلقائي عند مغادرة نقطة البيع', token).finally(() => {
                    invalidatePosQueries(queryClient);
                });
            }
        };
    }, [queryClient]);
    const subtotal = useMemo(() => cartItems.reduce((t, i) => t + i.unitPrice * i.quantity, 0), [cartItems]);
    const discount = Math.max(0, Number(discountAmount) || 0);
    const total = Math.max(0, subtotal - discount);
    const resetOrder = (nextType = orderType) => {
        setCurrentOrderCode(createOrderCode());
        setOrderType(nextType);
        setPaymentMethod('cash');
        setCollectionStatus('approved');
        setDiscountAmount('0');
        setOrderNote('');
        setOrderOwnerName('');
        setCustomerPhone('');
        setCustomerAddress('');
        setCaptainName('');
        setCartItems([]);
        setOpenOrderId(null);
        setEditBaselineQty(new Map());
    };
    const toggleItemSauce = (productId, sauceName) => {
        setCartItems((cur) => cur.map((i) => {
            if (i.productId !== productId)
                return i;
            const sauces = i.sauces ?? [];
            const next = sauces.includes(sauceName)
                ? sauces.filter((s) => s !== sauceName)
                : [...sauces, sauceName];
            return { ...i, sauces: next };
        }));
    };
    const mapItemApiNote = (item) => {
        const note = itemNoteForApi(item);
        return note ? { note } : {};
    };
    const ensureShift = () => {
        if (!shiftOpen)
            return false;
        return true;
    };
    const openNewOrder = () => {
        if (!ensureShift())
            return false;
        setEditMode(false);
        setEditingOrderId(null);
        resetOrder('eat-in');
        setProductSearch('');
        catalog.setActiveCategory(ALL_CATEGORIES);
        setModalOpen(true);
        return true;
    };
    const closeModal = async () => {
        if (editMode) {
            setEditMode(false);
            setEditingOrderId(null);
            setModalOpen(false);
            resetOrder();
            return;
        }
        if (openOrderId && cartItems.length > 0 && accessToken) {
            const res = await apiSuspendOrder(openOrderId, 'إعادة تعليق تلقائي', accessToken);
            if (res.ok) {
                invalidatePosQueries(queryClient);
                refetchSuspended();
            }
        }
        setOpenOrderId(null);
        setModalOpen(false);
    };
    const setOrderTypeAndDefaults = (next) => {
        setOrderType(next);
    };
    const validateTakeawayCustomer = () => {
        const check = validateTakeawayOrderFields(orderType, orderOwnerName, customerPhone);
        if (!check.ok)
            return { ok: false, error: check.error };
        return { ok: true };
    };
    const applyCustomerSuggestion = (customer) => {
        setCustomerPhone(customer.phone);
        if (customer.name?.trim())
            setOrderOwnerName(customer.name.trim());
        if (customer.address?.trim())
            setCustomerAddress(customer.address.trim());
    };
    const notifyPlanChange = (product, prevQty, nextQty) => {
        const plan = product.dailyPlan ?? catalog.getProductDailyPlan?.(product.id);
        if (!plan)
            return;
        const adj = planSoldAdjustment(editMode, editBaselineQty.get(product.id) ?? 0);
        const msg = planQuantityChangeAlert(product.name, plan, prevQty, nextQty, adj);
        if (msg)
            catalog.onNotify?.(msg);
    };
    const addProduct = (product) => {
        if (!product.isAvailable)
            return;
        setCartItems((cur) => {
            const prevQty = cur.find((i) => i.productId === product.id)?.quantity ?? 0;
            const nextQty = prevQty + 1;
            notifyPlanChange(product, prevQty, nextQty);
            const ex = cur.find((i) => i.productId === product.id);
            if (ex)
                return cur.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            return [...cur, { productId: product.id, name: product.name, unitPrice: product.salePrice, quantity: 1, note: '', sauces: [] }];
        });
    };
    const updateQuantity = (productId, qty, productMeta) => {
        setCartItems((cur) => {
            const prevQty = cur.find((i) => i.productId === productId)?.quantity ?? 0;
            if (productMeta && qty > 0 && qty !== prevQty) {
                notifyPlanChange({ id: productId, ...productMeta }, prevQty, qty);
            }
            if (qty <= 0)
                return cur.filter((i) => i.productId !== productId);
            return cur.map((i) => i.productId === productId ? { ...i, quantity: qty } : i);
        });
    };
    const updateNote = (productId, note) => {
        setCartItems((cur) => cur.map((i) => i.productId === productId ? { ...i, note } : i));
    };
    const mapCollectionApi = (s) => s === 'uncollected' ? 'UNCOLLECTED' : 'APPROVED';
    const suspendOrder = async () => {
        if (!ensureShift() || !accessToken || cartItems.length === 0)
            return { ok: false };
        const takeawayCheck = validateTakeawayCustomer();
        if (!takeawayCheck.ok)
            return takeawayCheck;
        const itemsPayload = cartItems.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            ...mapItemApiNote(i),
        }));
        let orderId = openOrderId;
        if (!orderId) {
            const openRes = await apiCreateOpenOrder({
                branchId: effectiveBranchId,
                ...(cashBoxId ? { cashBoxId } : {}),
                ...(shift?.id ? { shiftId: shift.id } : {}),
                items: itemsPayload,
                orderType: mapOrderTypeToApi(orderType),
                discountAmount: Number(discountAmount) || 0,
                ...(orderNote.trim() ? { orderNote: orderNote.trim() } : {}),
                ...(orderOwnerName.trim() ? { orderOwnerName: orderOwnerName.trim() } : {}),
                ...(customerPhone.trim() ? { customerPhone: customerPhone.trim() } : {}),
                ...(customerAddress.trim() ? { customerAddress: customerAddress.trim() } : {}),
                ...(captainName.trim() ? { captainName: captainName.trim() } : {}),
            }, accessToken);
            if (!openRes.ok)
                return { ok: false, error: openRes.body ?? openRes.error };
            orderId = openRes.data?.id;
            const assignedNumber = openRes.data?.orderNumber;
            if (assignedNumber)
                setCurrentOrderCode(String(assignedNumber));
        }
        if (!orderId)
            return { ok: false, error: 'فشل إنشاء الطلب' };
        const suspendRes = await apiSuspendOrder(orderId, 'تعليق من نقطة البيع', accessToken);
        if (suspendRes.ok) {
            resetOrder(orderType);
            setModalOpen(false);
            invalidatePosQueries(queryClient);
            refetchSuspended();
        }
        return suspendRes;
    };
    const closeOrder = async () => {
        if (!ensureShift() || !accessToken || cartItems.length === 0)
            return { ok: false };
        const takeawayCheck = validateTakeawayCustomer();
        if (!takeawayCheck.ok)
            return takeawayCheck;
        const pmCode = mapPaymentMethodCode(paymentMethod);
        const noteText = orderNote.trim();
        const closedOrderType = orderType;
        const orderCodeSnapshot = currentOrderCode;
        const shiftIdForRefresh = shift?.id;
        const brand = getStoreBranding();
        const pmLabel = catalog.paymentMethods.find((m) => m.id === paymentMethod)?.label ?? paymentMethod;
        const statusNote = collectionStatus === 'uncollected' ? 'لم يُحصّل — في تبويب غير محصل' : 'تم التحصيل في الدرج';
        const itemsSnapshot = cartItems.map((i) => ({
            productId: i.productId,
            productName: i.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            ...mapItemApiNote(i),
        }));
        const printPayload = workspace.printingEnabled && isAutoPrintEnabled()
            ? {
                storeName: brand.storeName,
                storeSubtitle: brand.storeSubtitle,
                storeFooter: brand.storeFooter,
                storePhone: brand.storePhone,
                orderNumber: orderCodeSnapshot,
                shiftNumber: shift?.shiftNumber != null ? String(shift.shiftNumber) : '1',
                orderType: orderType === 'eat-in' ? 'محلي' : 'تيك أواي',
                ...(orderOwnerName.trim() ? { customerName: orderOwnerName.trim() } : {}),
                ...(customerPhone.trim() ? { customerPhone: customerPhone.trim() } : {}),
                ...(customerAddress.trim() ? { customerAddress: customerAddress.trim() } : {}),
                ...(captainName.trim() ? { captainName: captainName.trim() } : {}),
                cashierName: shiftOperatorName,
                paymentMethod: pmLabel,
                isPaid: collectionStatus !== 'uncollected',
                items: cartItems.map((i) => {
                    const note = i.note.trim();
                    return {
                        name: i.name,
                        quantity: i.quantity,
                        unitPrice: i.unitPrice,
                        lineTotal: i.unitPrice * i.quantity,
                        ...(note ? { note } : {}),
                        ...(i.sauces?.length ? { sauces: i.sauces } : {}),
                    };
                }),
                subtotal,
                discount,
                total,
                ...(noteText ? { note: noteText } : {}),
                createdAt: new Date().toLocaleString('ar-EG'),
            }
            : null;
        resetOrder(closedOrderType);
        setModalOpen(false);
        if (printPayload) {
            void enqueuePosPrint({ ...printPayload, orderNumber: orderCodeSnapshot }, { force: true, silent: true, copies: 'both' }, (printRes) => {
                if (!printRes.ok && !printRes.skipped) {
                    catalog.onNotify?.(`تم إغلاق ${orderCodeSnapshot} — فشل الطباعة: ${printRes.message}`);
                }
            });
        }
        void (async () => {
            const res = await apiPlaceOrder({
                branchId: effectiveBranchId,
                ...(shift?.id ? { shiftId: shift.id } : {}),
                ...(cashBoxId ? { cashBoxId } : {}),
                items: itemsSnapshot,
                total,
                discountAmount: Number(discountAmount) || 0,
                paymentMethod: pmCode,
                orderType: mapOrderTypeToApi(orderType),
                ...(noteText ? { orderNote: noteText } : {}),
                ...(orderOwnerName.trim() ? { orderOwnerName: orderOwnerName.trim() } : {}),
                ...(customerPhone.trim() ? { customerPhone: customerPhone.trim() } : {}),
                ...(customerAddress.trim() ? { customerAddress: customerAddress.trim() } : {}),
                ...(captainName.trim() ? { captainName: captainName.trim() } : {}),
                collectionStatus: mapCollectionApi(collectionStatus),
            }, accessToken);
            if (!res.ok) {
                catalog.onNotify?.(res.body ?? res.error ?? 'فشل إغلاق الطلب');
                void queryClient.invalidateQueries({ queryKey: ['orders-shift-uncollected', shiftIdForRefresh] });
                void queryClient.invalidateQueries({ queryKey: ['orders-shift-collected', shiftIdForRefresh] });
                void refetchPosOrderData(queryClient, shiftIdForRefresh);
                return;
            }
            const apiOrder = res.data;
            const orderCode = apiOrder?.orderNumber ?? orderCodeSnapshot;
            catalog.onNotify?.(`تم إغلاق ${orderCode} — ${statusNote}`);
            if (shiftIdForRefresh && apiOrder?.id) {
                patchShiftOrderAdded(queryClient, shiftIdForRefresh, apiOrder);
            }
            void refetchPosOrderData(queryClient, shiftIdForRefresh);
        })();
        return { ok: true, orderCode: orderCodeSnapshot, note: statusNote };
    };
    const openEditOrder = (order) => {
        if (!ensureShift())
            return false;
        setEditMode(true);
        setEditingOrderId(order.id);
        setEditBaselineQty(new Map(order.items.map((i) => [i.productId, i.quantity])));
        setCurrentOrderCode(order.code);
        setOrderType(order.orderType);
        setPaymentMethod(order.paymentMethod);
        setDiscountAmount(order.discountAmount);
        setOrderNote(order.orderNote);
        setOrderOwnerName(order.ownerName && order.ownerName !== defaultOwnerName(order.orderType) ? order.ownerName : '');
        setCustomerPhone(order.customerPhone ?? '');
        setCustomerAddress(order.customerAddress ?? '');
        setCaptainName(order.captainName ?? '');
        setCollectionStatus(order.collectionStatus);
        setCartItems(order.items.map((i) => ({ ...i, sauces: i.sauces ?? [] })));
        setOpenOrderId(null);
        setProductSearch('');
        catalog.setActiveCategory(ALL_CATEGORIES);
        setModalOpen(true);
        return true;
    };
    const saveEditedOrder = async () => {
        if (!editMode || !editingOrderId || !accessToken)
            return { ok: false, error: 'غير مسجل' };
        if (cartItems.length === 0)
            return { ok: false, error: 'أضف صنفاً واحداً على الأقل' };
        const takeawayCheck = validateTakeawayCustomer();
        if (!takeawayCheck.ok)
            return takeawayCheck;
        const orderId = editingOrderId;
        const shiftIdForRefresh = shift?.id;
        const amendDto = {
            customerName: orderOwnerName.trim() || defaultOwnerName(orderType),
            customerPhone: customerPhone.trim(),
            customerAddress: customerAddress.trim(),
            captainName: captainName.trim(),
            note: orderNote.trim(),
            discountAmount: Number(discountAmount) || 0,
            items: cartItems.map((item) => {
                const note = itemNoteForApi(item);
                return {
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    ...(note ? { note } : {}),
                };
            }),
        };
        const localPatch = {
            totalAmount: total,
            discountAmount: amendDto.discountAmount,
            customerName: amendDto.customerName,
            customerPhone: amendDto.customerPhone,
            customerAddress: amendDto.customerAddress,
            captainName: amendDto.captainName,
            note: amendDto.note,
            _count: { items: cartItems.length },
        };
        if (shiftIdForRefresh) {
            patchShiftOrderUpdated(queryClient, shiftIdForRefresh, orderId, localPatch);
        }
        setEditMode(false);
        setEditingOrderId(null);
        setModalOpen(false);
        resetOrder();
        void (async () => {
            const res = await apiAmendOrder(orderId, amendDto, accessToken);
            if (res.ok) {
                if (shiftIdForRefresh && res.data) {
                    patchShiftOrderUpdated(queryClient, shiftIdForRefresh, orderId, res.data);
                }
                void refetchPosOrderData(queryClient, shiftIdForRefresh);
            }
            else {
                catalog.onNotify?.(res.body
                    ?? res.error
                    ?? 'فشل حفظ التعديل');
                void refetchPosOrderData(queryClient, shiftIdForRefresh);
            }
        })();
        return { ok: true };
    };
    const resumeSuspended = async (order) => {
        if (!accessToken || !ensureShift())
            return { ok: false };
        const res = await apiResumeOrder(order.id, accessToken);
        if (!res.ok)
            return res;
        setEditMode(false);
        setEditingOrderId(null);
        setCurrentOrderCode(order.code);
        setOrderType(order.orderType);
        setPaymentMethod(order.paymentMethod);
        setDiscountAmount(order.discountAmount);
        setOrderNote(order.orderNote);
        setOrderOwnerName(order.ownerName && order.ownerName !== defaultOwnerName(order.orderType) ? order.ownerName : '');
        setCustomerPhone(order.customerPhone ?? '');
        setCustomerAddress(order.customerAddress ?? '');
        setCaptainName(order.captainName ?? '');
        setCollectionStatus(order.collectionStatus);
        setCartItems(order.items.map((i) => ({ ...i, sauces: i.sauces ?? [] })));
        setOpenOrderId(order.id);
        refetchSuspended();
        setModalOpen(true);
        return { ok: true };
    };
    const toggleAutoPrint = (enabled) => {
        setAutoPrint(enabled);
        setAutoPrintEnabled(enabled);
    };
    return {
        modalOpen,
        productSearch,
        setProductSearch,
        currentOrderCode,
        orderType,
        paymentMethod,
        setPaymentMethod,
        discountAmount,
        setDiscountAmount,
        toggleItemSauce,
        orderNote,
        setOrderNote,
        orderOwnerName,
        setOrderOwnerName,
        customerPhone,
        setCustomerPhone,
        customerAddress,
        setCustomerAddress,
        captainName,
        setCaptainName,
        collectionStatus,
        setCollectionStatus,
        cartItems,
        subtotal,
        discount,
        total,
        autoPrint,
        toggleAutoPrint,
        setOrderTypeAndDefaults,
        validateTakeawayCustomer,
        applyCustomerSuggestion,
        addProduct,
        updateQuantity,
        updateNote,
        openNewOrder,
        openEditOrder,
        closeModal,
        suspendOrder,
        closeOrder,
        saveEditedOrder,
        resumeSuspended,
        resetOrder,
        editMode,
        editBaselineQty,
    };
}
