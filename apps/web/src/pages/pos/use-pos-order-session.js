import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiCreateOpenOrder, apiPlaceOrder, apiResumeOrder, apiSuspendOrder, } from '../../lib/api.js';
import { invalidatePosQueries } from '../../lib/hooks.js';
import { isAutoPrintEnabled, printPosReceipt, setAutoPrintEnabled, } from '../../lib/pos-receipt.js';
import { createOrderCode, defaultOwnerName, mapOrderTypeToApi, mapPaymentMethodCode, } from '../../lib/pos-store.js';
import { ALL_CATEGORIES } from './constants.js';
import { getStoreBranding } from '../../lib/pos-receipt.js';
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
    const [orderOwnerName, setOrderOwnerName] = useState(defaultOwnerName('eat-in'));
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [captainName, setCaptainName] = useState('');
    const [collectionStatus, setCollectionStatus] = useState('approved');
    const [cartItems, setCartItems] = useState([]);
    const [openOrderId, setOpenOrderId] = useState(null);
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
        setOrderOwnerName(defaultOwnerName(nextType));
        setCustomerPhone('');
        setCustomerAddress('');
        setCaptainName('');
        setCartItems([]);
        setOpenOrderId(null);
    };
    const ensureShift = () => {
        if (!shiftOpen)
            return false;
        return true;
    };
    const openNewOrder = () => {
        if (!ensureShift())
            return false;
        resetOrder('eat-in');
        setProductSearch('');
        catalog.setActiveCategory(ALL_CATEGORIES);
        setModalOpen(true);
        return true;
    };
    const closeModal = async () => {
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
        setOrderOwnerName((cur) => {
            if (!cur.trim() || cur === defaultOwnerName('eat-in') || cur === defaultOwnerName('takeaway')) {
                return defaultOwnerName(next);
            }
            return cur;
        });
    };
    const addProduct = (product) => {
        if (!product.isAvailable)
            return;
        setCartItems((cur) => {
            const ex = cur.find((i) => i.productId === product.id);
            if (ex)
                return cur.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            return [...cur, { productId: product.id, name: product.name, unitPrice: product.salePrice, quantity: 1, note: '' }];
        });
    };
    const updateQuantity = (productId, qty) => {
        setCartItems((cur) => {
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
        const itemsPayload = cartItems.map((i) => {
            const base = { productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice };
            return i.note ? { ...base, note: i.note } : base;
        });
        let orderId = openOrderId;
        if (!orderId) {
            const openRes = await apiCreateOpenOrder({
                branchId: effectiveBranchId,
                ...(cashBoxId ? { cashBoxId } : {}),
                ...(shift?.id ? { shiftId: shift.id } : {}),
                items: itemsPayload,
                orderType: mapOrderTypeToApi(orderType),
                discountAmount: Number(discountAmount) || 0,
                ...(orderNote ? { orderNote } : {}),
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
        const pmCode = mapPaymentMethodCode(paymentMethod);
        const res = await apiPlaceOrder({
            branchId: effectiveBranchId,
            ...(shift?.id ? { shiftId: shift.id } : {}),
            ...(cashBoxId ? { cashBoxId } : {}),
            items: cartItems.map((i) => {
                const base = { productId: i.productId, productName: i.name, quantity: i.quantity, unitPrice: i.unitPrice };
                return i.note ? { ...base, note: i.note } : base;
            }),
            total,
            discountAmount: Number(discountAmount) || 0,
            paymentMethod: pmCode,
            orderType: mapOrderTypeToApi(orderType),
            ...(orderNote ? { orderNote } : {}),
            ...(orderOwnerName.trim() ? { orderOwnerName: orderOwnerName.trim() } : {}),
            ...(customerPhone.trim() ? { customerPhone: customerPhone.trim() } : {}),
            ...(customerAddress.trim() ? { customerAddress: customerAddress.trim() } : {}),
            ...(captainName.trim() ? { captainName: captainName.trim() } : {}),
            collectionStatus: mapCollectionApi(collectionStatus),
        }, accessToken);
        if (!res.ok)
            return res;
        const apiOrder = res.data;
        const orderCode = apiOrder?.orderNumber ?? currentOrderCode;
        const pmLabel = catalog.paymentMethods.find((m) => m.id === paymentMethod)?.label ?? paymentMethod;
        const note = collectionStatus === 'uncollected' ? 'لم يُحصّل — في تبويب غير محصل' : 'تم التحصيل في الدرج';
        const closedOrderType = orderType;
        const shiftIdForRefresh = shift?.id;
        const brand = getStoreBranding();
        const printPayload = workspace.printingEnabled && isAutoPrintEnabled()
            ? {
                storeName: brand.storeName,
                storeSubtitle: brand.storeSubtitle,
                storeFooter: brand.storeFooter,
                storePhone: brand.storePhone,
                orderNumber: orderCode,
                shiftNumber: shift?.shiftNumber != null ? String(shift.shiftNumber) : '1',
                orderType: orderType === 'eat-in' ? 'محلي' : 'تيك أواي',
                customerName: orderOwnerName.trim() || defaultOwnerName(orderType),
                ...(customerPhone.trim() ? { customerPhone: customerPhone.trim() } : {}),
                ...(customerAddress.trim() ? { customerAddress: customerAddress.trim() } : {}),
                ...(captainName.trim() ? { captainName: captainName.trim() } : {}),
                cashierName: shiftOperatorName,
                paymentMethod: pmLabel,
                isPaid: collectionStatus !== 'uncollected',
                items: cartItems.map((i) => ({
                    name: i.name,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                    lineTotal: i.unitPrice * i.quantity,
                    ...(i.note ? { note: i.note } : {}),
                })),
                subtotal,
                discount,
                total,
                ...(orderNote.trim() ? { note: orderNote.trim() } : {}),
                createdAt: new Date().toLocaleString('ar-EG'),
            }
            : null;
        resetOrder(closedOrderType);
        setModalOpen(false);
        void (async () => {
            if (printPayload) {
                const printRes = await printPosReceipt(printPayload, { force: true, silent: true, copies: 'both' });
                if (!printRes.ok && !printRes.skipped) {
                    catalog.onNotify?.(`تم إغلاق ${orderCode} — فشل الطباعة: ${printRes.message}`);
                }
            }
            await refreshAfterOrder(shiftIdForRefresh);
        })();
        return { ok: true, orderCode, note };
    };
    const resumeSuspended = async (order) => {
        if (!accessToken || !ensureShift())
            return { ok: false };
        const res = await apiResumeOrder(order.id, accessToken);
        if (!res.ok)
            return res;
        setCurrentOrderCode(order.code);
        setOrderType(order.orderType);
        setPaymentMethod(order.paymentMethod);
        setDiscountAmount(order.discountAmount);
        setOrderNote(order.orderNote);
        setOrderOwnerName(order.ownerName);
        setCustomerPhone(order.customerPhone ?? '');
        setCustomerAddress(order.customerAddress ?? '');
        setCaptainName(order.captainName ?? '');
        setCollectionStatus(order.collectionStatus);
        setCartItems(order.items);
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
        addProduct,
        updateQuantity,
        updateNote,
        openNewOrder,
        closeModal,
        suspendOrder,
        closeOrder,
        resumeSuspended,
        resetOrder,
    };
}
