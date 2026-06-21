export type CartItem = {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  note: string;
};

export type OrderType = 'eat-in' | 'takeaway';
export type CollectionStatus = 'pending_approval' | 'uncollected' | 'approved';

export type SavedOrder = {
  id: string;
  code: string;
  orderType: OrderType;
  total: number;
  itemsCount: number;
  ownerName: string;
  customerPhone?: string;
  customerAddress?: string;
  captainName?: string;
  paymentMethod: string;
  paymentStatus?: 'PENDING' | 'PAID' | 'VOIDED';
  discountAmount: string;
  orderNote: string;
  items: CartItem[];
  createdAt: string;
  status: 'suspended' | 'closed' | 'open';
  collectionStatus: CollectionStatus;
};

export function isShiftOrderUncollected(order: SavedOrder) {
  return order.collectionStatus === 'uncollected' || order.paymentStatus === 'PENDING';
}

/** محصّل أو بانتظار اعتماد الإدارة */
export function isShiftOrderCollected(order: SavedOrder) {
  return order.collectionStatus === 'approved' || order.collectionStatus === 'pending_approval';
}

export function createOrderCode() {
  return '';
}

export const POS_BRANCH_STORAGE_KEY = 'niha-pos-branch-id';

export function readPosBranchId() {
  try {
    return sessionStorage.getItem(POS_BRANCH_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function writePosBranchId(branchId: string) {
  try {
    if (branchId) sessionStorage.setItem(POS_BRANCH_STORAGE_KEY, branchId);
  } catch {
    /* ignore */
  }
}

export function defaultOwnerName(orderType: OrderType) {
  return orderType === 'eat-in' ? 'عميل الصالة' : 'عميل تيك أواي';
}

export function getCollectionStatusLabel(status: CollectionStatus) {
  if (status === 'approved') return 'تم التحصيل';
  if (status === 'pending_approval') return 'تم التحصيل — بانتظار اعتماد الخزنة';
  return 'لم يُحصّل';
}

export function mapCollectionStatus(apiStatus?: string): CollectionStatus {
  if (apiStatus === 'UNCOLLECTED') return 'uncollected';
  if (apiStatus === 'PENDING_APPROVAL') return 'pending_approval';
  if (apiStatus === 'APPROVED') return 'approved';
  return 'approved';
}

export function mapPaymentMethodCode(code: string): string {
  const lower = code.toLowerCase();
  if (lower === 'cash') return 'CASH';
  if (lower === 'card') return 'CARD';
  if (lower === 'instapay') return 'INSTAPAY';
  if (lower === 'wallet') return 'WALLET';
  return code.toUpperCase();
}

export function mapOrderTypeToApi(orderType: OrderType): 'DINE_IN' | 'TAKEAWAY' {
  return orderType === 'eat-in' ? 'DINE_IN' : 'TAKEAWAY';
}

export function mapApiOrderType(orderType: string): OrderType {
  return orderType === 'TAKEAWAY' ? 'takeaway' : 'eat-in';
}

export function mapApiOrderToSavedOrder(
  order: {
    id: string;
    orderNumber: string;
    orderType: string;
    totalAmount: unknown;
    customerName?: string | null;
    customerPhone?: string | null;
    customerAddress?: string | null;
    captainName?: string | null;
    paymentStatus?: string;
    discountAmount?: unknown;
    note?: string | null;
    collectionStatus?: string;
    closedAt?: string | Date | null;
    openedAt?: string | Date | null;
    items?: Array<{
      productId: string;
      unitPrice: unknown;
      quantity: unknown;
      product?: { name?: string } | null;
    }>;
  },
  status: SavedOrder['status'],
): SavedOrder {
  const orderType = mapApiOrderType(order.orderType);
  const at = order.closedAt ?? order.openedAt;
  return {
    id: order.id,
    code: order.orderNumber,
    orderType,
    total: Number(order.totalAmount),
    itemsCount: order.items?.length ?? 0,
    ownerName: order.customerName ?? defaultOwnerName(orderType),
    ...(order.customerPhone ? { customerPhone: order.customerPhone } : {}),
    ...(order.customerAddress ? { customerAddress: order.customerAddress } : {}),
    ...(order.captainName ? { captainName: order.captainName } : {}),
    paymentMethod: 'cash',
    ...(order.paymentStatus === 'PENDING' || order.paymentStatus === 'PAID' || order.paymentStatus === 'VOIDED'
      ? { paymentStatus: order.paymentStatus }
      : {}),
    discountAmount: String(order.discountAmount ?? 0),
    orderNote: order.note ?? '',
    items: (order.items ?? []).map((item) => ({
      productId: item.productId,
      name: item.product?.name ?? 'صنف',
      unitPrice: Number(item.unitPrice),
      quantity: Number(item.quantity),
      note: '',
    })),
    createdAt: at ? new Date(at).toLocaleString('ar-EG') : '',
    status,
    collectionStatus: mapCollectionStatus(order.collectionStatus),
  };
}
