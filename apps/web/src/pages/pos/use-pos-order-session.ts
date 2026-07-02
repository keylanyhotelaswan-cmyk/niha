import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  apiCreateOpenOrder,
  apiPlaceOrder,
  apiAmendOrder,
  apiResumeOrder,
  apiSuspendOrder,
} from '../../lib/api.js';
import { invalidatePosSuspendedOrders, patchShiftOrderAdded, patchShiftOrderUpdated, POS_QUERY_KEYS, refetchPosOrderData } from '../../lib/hooks.js';
import { enqueuePosPrint } from '../../lib/pos-print-queue.js';
import {
  isAutoPrintEnabled,
  setAutoPrintEnabled,
} from '../../lib/pos-receipt.js';
import {
  createOrderCode,
  defaultOwnerName,
  mapOrderTypeToApi,
  mapPaymentMethodCode,
  validateTakeawayOrderFields,
  cartLineKey,
  isMergeableCatalogCartLine,
  type CartItem,
  type CollectionStatus,
  type OrderType,
  type SavedOrder,
} from '../../lib/pos-store.js';
import { itemNoteForApi } from '../../lib/pos-order-sauces.js';
import { ALL_CATEGORIES, type PaymentMethodOption } from './constants.js';
import { getStoreBranding } from '../../lib/pos-receipt.js';
import type { DailyPlan } from './production-plan-utils.js';
import { planQuantityChangeAlert, planSoldAdjustment } from './production-plan-utils.js';
import type { usePosWorkspace } from './use-pos-workspace.js';

type Workspace = ReturnType<typeof usePosWorkspace>;

export function usePosOrderSession(workspace: Workspace, catalog: {
  paymentMethods: PaymentMethodOption[];
  setActiveCategory: (c: string) => void;
  onNotify?: (msg: string) => void;
  getProductDailyPlan?: (productId: string) => DailyPlan | undefined;
  reload?: () => void;
  customLineProductId?: string | null;
}) {
  const queryClient = useQueryClient();
  const {
    accessToken,
    effectiveBranchId,
    shift,
    shiftOpen,
    cashBoxId,
    shiftOperatorName,
    refreshAfterOrder,
    refetchSuspended,
  } = workspace;

  const [modalOpen, setModalOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [currentOrderCode, setCurrentOrderCode] = useState(createOrderCode());
  const [orderType, setOrderType] = useState<OrderType>('eat-in');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [orderNote, setOrderNote] = useState('');
  const [orderOwnerName, setOrderOwnerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [captainName, setCaptainName] = useState('');
  const [collectionStatus, setCollectionStatus] = useState<CollectionStatus>('approved');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editBaselineQty, setEditBaselineQty] = useState<Map<string, number>>(() => new Map());
  const [autoPrint, setAutoPrint] = useState(() => isAutoPrintEnabled());

  const pendingRef = useRef({ openOrderId: null as string | null, cartItems: [] as CartItem[], accessToken: null as string | null });
  const closeInFlight = useRef(false);

  useEffect(() => {
    pendingRef.current = { openOrderId, cartItems, accessToken };
  }, [openOrderId, cartItems, accessToken]);

  useEffect(() => {
    return () => {
      const { openOrderId: id, cartItems: items, accessToken: token } = pendingRef.current;
      if (id && items.length > 0 && token) {
        apiSuspendOrder(id, 'تعليق تلقائي عند مغادرة نقطة البيع', token).finally(() => {
          invalidatePosSuspendedOrders(queryClient, effectiveBranchId);
        });
      }
    };
  }, [queryClient, effectiveBranchId]);

  const subtotal = useMemo(() => cartItems.reduce((t, i) => t + i.unitPrice * i.quantity, 0), [cartItems]);
  const discount = Math.max(0, Number(discountAmount) || 0);
  const total = Math.max(0, subtotal - discount);

  const resetOrder = (nextType: OrderType = orderType) => {
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

  const toggleItemSauce = (lineKey: string, sauceName: string) => {
    setCartItems((cur) => cur.map((i) => {
      if (cartLineKey(i) !== lineKey) return i;
      const sauces = i.sauces ?? [];
      const next = sauces.includes(sauceName)
        ? sauces.filter((s) => s !== sauceName)
        : [...sauces, sauceName];
      return { ...i, sauces: next };
    }));
  };

  const mapItemApiNote = (item: CartItem) => {
    const customId = catalog.customLineProductId;
    if (customId && item.productId === customId) {
      const label = item.name.trim();
      const extra = item.note.trim();
      const note = extra ? `${label} · ${extra}` : label;
      return note ? { note } : {};
    }
    const note = itemNoteForApi(item);
    return note ? { note } : {};
  };

  const ensureShift = () => {
    if (!shiftOpen) return false;
    return true;
  };

  const openNewOrder = () => {
    if (!ensureShift()) return false;
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
        invalidatePosSuspendedOrders(queryClient, effectiveBranchId);
      }
    }
    setOpenOrderId(null);
    setModalOpen(false);
  };

  const setOrderTypeAndDefaults = (next: OrderType) => {
    setOrderType(next);
  };

  const validateTakeawayCustomer = (): { ok: true } | { ok: false; error: string } => {
    const check = validateTakeawayOrderFields(orderType, orderOwnerName, customerPhone);
    if (!check.ok) return { ok: false, error: check.error };
    return { ok: true };
  };

  const applyCustomerSuggestion = (customer: {
    phone: string;
    name?: string | null;
    address?: string | null;
  }) => {
    setCustomerPhone(customer.phone);
    if (customer.name?.trim()) setOrderOwnerName(customer.name.trim());
    if (customer.address?.trim()) setCustomerAddress(customer.address.trim());
  };

  const notifyPlanChange = (
    product: { id: string; name: string; dailyPlan?: DailyPlan },
    prevQty: number,
    nextQty: number,
  ) => {
    const plan = product.dailyPlan ?? catalog.getProductDailyPlan?.(product.id);
    if (!plan) return;
    const adj = planSoldAdjustment(editMode, editBaselineQty.get(product.id) ?? 0);
    const msg = planQuantityChangeAlert(product.name, plan, prevQty, nextQty, adj);
    if (msg) catalog.onNotify?.(msg);
  };

  const addProduct = (product: { id: string; name: string; salePrice: number; isAvailable?: boolean; dailyPlan?: DailyPlan }) => {
    if (!product.isAvailable) return;
    const customLineProductId = catalog.customLineProductId;
    setCartItems((cur) => {
      const matches = cur.filter((i) => isMergeableCatalogCartLine(i, product.id, customLineProductId));
      const prevQty = matches.reduce((sum, i) => sum + i.quantity, 0);
      const nextQty = prevQty + 1;
      notifyPlanChange(product, prevQty, nextQty);

      if (matches.length > 0) {
        const template = matches[0]!;
        const withoutDupes = cur.filter((i) => !isMergeableCatalogCartLine(i, product.id, customLineProductId));
        return [...withoutDupes, {
          productId: product.id,
          name: template.name || product.name,
          unitPrice: template.unitPrice ?? product.salePrice,
          quantity: nextQty,
          note: template.note ?? '',
          sauces: template.sauces ?? [],
        }];
      }

      return [...cur, {
        productId: product.id,
        name: product.name,
        unitPrice: product.salePrice,
        quantity: 1,
        note: '',
        sauces: [],
      }];
    });
  };

  const addCustomLine = (name: string, unitPrice: number) => {
    const customId = catalog.customLineProductId;
    if (!customId || !name.trim() || unitPrice < 0) return false;
    const lineId = `custom-${crypto.randomUUID()}`;
    setCartItems((cur) => [...cur, {
      lineId,
      productId: customId,
      name: name.trim(),
      unitPrice,
      quantity: 1,
      note: '',
      sauces: [],
    }]);
    return true;
  };

  const updateQuantity = (lineKey: string, qty: number, productMeta?: { name: string; dailyPlan?: DailyPlan }) => {
    setCartItems((cur) => {
      const prevQty = cur.find((i) => cartLineKey(i) === lineKey)?.quantity ?? 0;
      if (productMeta && qty > 0 && qty !== prevQty) {
        const item = cur.find((i) => cartLineKey(i) === lineKey);
        notifyPlanChange({ id: item?.productId ?? lineKey, ...productMeta }, prevQty, qty);
      }
      if (qty <= 0) return cur.filter((i) => cartLineKey(i) !== lineKey);
      return cur.map((i) => cartLineKey(i) === lineKey ? { ...i, quantity: qty } : i);
    });
  };

  const updateUnitPrice = (lineKey: string, unitPrice: number) => {
    if (!Number.isFinite(unitPrice) || unitPrice < 0) return;
    setCartItems((cur) => cur.map((i) => (
      cartLineKey(i) === lineKey ? { ...i, unitPrice } : i
    )));
  };

  const updateNote = (lineKey: string, note: string) => {
    setCartItems((cur) => cur.map((i) => cartLineKey(i) === lineKey ? { ...i, note } : i));
  };

  const mapCollectionApi = (s: CollectionStatus) => s === 'uncollected' ? 'UNCOLLECTED' as const : 'APPROVED' as const;

  const suspendOrder = async () => {
    if (!ensureShift() || !accessToken || cartItems.length === 0) return { ok: false };
    const takeawayCheck = validateTakeawayCustomer();
    if (!takeawayCheck.ok) return takeawayCheck;
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
      if (!openRes.ok) return { ok: false, error: openRes.body ?? openRes.error };
      orderId = (openRes.data as any)?.id;
      const assignedNumber = (openRes.data as any)?.orderNumber;
      if (assignedNumber) setCurrentOrderCode(String(assignedNumber));
    }
    if (!orderId) return { ok: false, error: 'فشل إنشاء الطلب' };

    const suspendRes = await apiSuspendOrder(orderId, 'تعليق من نقطة البيع', accessToken);
    if (suspendRes.ok) {
      resetOrder(orderType);
      setModalOpen(false);
      invalidatePosSuspendedOrders(queryClient, effectiveBranchId);
    }
    return suspendRes;
  };

  const closeOrder = async () => {
    if (closeInFlight.current) return { ok: false, error: 'جاري إغلاق الطلب…' };
    if (!ensureShift() || !accessToken || cartItems.length === 0) return { ok: false };
    const takeawayCheck = validateTakeawayCustomer();
    if (!takeawayCheck.ok) return takeawayCheck;

    closeInFlight.current = true;

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
      void enqueuePosPrint(
        { ...printPayload, orderNumber: orderCodeSnapshot },
        { force: true, silent: true, copies: 'both' },
        (printRes) => {
          if (!printRes.ok && !printRes.skipped) {
            catalog.onNotify?.(`تم إغلاق ${orderCodeSnapshot} — فشل الطباعة: ${printRes.message}`);
          }
        },
      );
    }

    void (async () => {
      const res = await apiPlaceOrder({
        branchId: effectiveBranchId,
        ...(shift?.id ? { shiftId: shift.id } : {}),
        ...(cashBoxId ? { cashBoxId } : {}),
        items: itemsSnapshot,
        total,
        discountAmount: Number(discountAmount) || 0,
        paymentMethod: pmCode as 'CASH' | 'CARD' | 'INSTAPAY' | 'WALLET' | 'MIXED',
        orderType: mapOrderTypeToApi(orderType),
        ...(noteText ? { orderNote: noteText } : {}),
        ...(orderOwnerName.trim() ? { orderOwnerName: orderOwnerName.trim() } : {}),
        ...(customerPhone.trim() ? { customerPhone: customerPhone.trim() } : {}),
        ...(customerAddress.trim() ? { customerAddress: customerAddress.trim() } : {}),
        ...(captainName.trim() ? { captainName: captainName.trim() } : {}),
        collectionStatus: mapCollectionApi(collectionStatus),
      }, accessToken);

      if (!res.ok) {
        catalog.onNotify?.((res as any).body ?? (res as any).error ?? 'فشل إغلاق الطلب');
        void queryClient.invalidateQueries({ queryKey: ['orders-shift-uncollected', shiftIdForRefresh] });
        void queryClient.invalidateQueries({ queryKey: ['orders-shift-collected', shiftIdForRefresh] });
        void queryClient.invalidateQueries({ queryKey: POS_QUERY_KEYS.shiftSummary(shiftIdForRefresh) });
        return;
      }

      const apiOrder = res.data as any;
      const orderCode = apiOrder?.orderNumber ?? orderCodeSnapshot;
      catalog.onNotify?.(`تم إغلاق ${orderCode} — ${statusNote}`);

      if (shiftIdForRefresh && apiOrder?.id) {
        patchShiftOrderAdded(queryClient, shiftIdForRefresh, apiOrder);
      }
      void queryClient.invalidateQueries({
        queryKey: POS_QUERY_KEYS.shiftSummary(shiftIdForRefresh),
      });
    })().finally(() => {
      closeInFlight.current = false;
    });

    return { ok: true, orderCode: orderCodeSnapshot, note: statusNote };
  };

  const openEditOrder = (order: SavedOrder) => {
    if (!ensureShift()) return false;
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
    if (!editMode || !editingOrderId || !accessToken) return { ok: false, error: 'غير مسجل' };
    if (cartItems.length === 0) return { ok: false, error: 'أضف صنفاً واحداً على الأقل' };
    const takeawayCheck = validateTakeawayCustomer();
    if (!takeawayCheck.ok) return takeawayCheck;

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
          patchShiftOrderUpdated(queryClient, shiftIdForRefresh, orderId, res.data as Record<string, unknown>);
        }
        void queryClient.invalidateQueries({
          queryKey: POS_QUERY_KEYS.shiftSummary(shiftIdForRefresh),
        });
      } else {
        catalog.onNotify?.(
          (res as { body?: string; error?: string }).body
            ?? (res as { error?: string }).error
            ?? 'فشل حفظ التعديل',
        );
        void refetchPosOrderData(queryClient, shiftIdForRefresh);
      }
    })();

    return { ok: true as const };
  };

  const resumeSuspended = async (order: SavedOrder) => {
    if (!accessToken || !ensureShift()) return { ok: false };
    const res = await apiResumeOrder(order.id, accessToken);
    if (!res.ok) return res;

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

  const toggleAutoPrint = (enabled: boolean) => {
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
    addCustomLine,
    updateQuantity,
    updateUnitPrice,
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
