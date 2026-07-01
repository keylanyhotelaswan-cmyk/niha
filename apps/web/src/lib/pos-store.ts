import { parseItemNote } from './pos-order-sauces.js';
import { formatOrderTimestamp } from './date-utils.js';
import { isValidCustomerPhone } from './customer-phone.js';

/** صنف placeholder في الكتالوج لأسطر يدوية (اسم + سعر مخصّص) */
export const POS_CUSTOM_LINE_SKU = 'POS-CUSTOM';

export type CartItem = {
  /** مفتاح فريد للسطر — يختلف عن productId للأصناف اليدوية المتعددة */
  lineId?: string;
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  note: string;
  sauces?: string[];
};

export function cartLineKey(item: Pick<CartItem, 'lineId' | 'productId'>): string {
  return item.lineId ?? item.productId;
}

/** سطر كتالوج عادي (ليس يدوي) — قابل للدمج عند تكرار الضغط على نفس الصنف */
export function isMergeableCatalogCartLine(
  item: Pick<CartItem, 'lineId' | 'productId'>,
  productId: string,
  customLineProductId?: string | null,
): boolean {
  if (item.productId !== productId) return false;
  if (customLineProductId && item.productId === customLineProductId) return false;
  // lineId === productId كان خطأ قديماً — ندمج هذه الأسطر أيضاً
  return !item.lineId || item.lineId === item.productId;
}

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
  cancelRequestedAt?: string;
  cancellationReason?: string;
  createdByName?: string;
  orderAt?: string;
};

export function isShiftOrderUncollected(order: SavedOrder) {
  return order.collectionStatus === 'uncollected' || order.paymentStatus === 'PENDING';
}

/** نفس تعريف الـ API — للطلبات الخام قبل التحويل */
export function isApiOrderUncollected(order: {
  collectionStatus?: string;
  paymentStatus?: string;
}) {
  return (
    order.collectionStatus === 'UNCOLLECTED'
    || order.collectionStatus === 'uncollected'
    || order.paymentStatus === 'PENDING'
  );
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

/** حقول التيك أواي المطلوبة قبل التأكيد */
export function validateTakeawayOrderFields(
  orderType: OrderType,
  customerName: string,
  customerPhone: string,
): { ok: true } | { ok: false; error: string; missingLabels: string[] } {
  if (orderType !== 'takeaway') return { ok: true };
  const missingLabels: string[] = [];
  if (!customerName.trim()) missingLabels.push('اسم العميل');
  if (!customerPhone.trim()) missingLabels.push('رقم التلفون');
  else if (!isValidCustomerPhone(customerPhone)) missingLabels.push('رقم تلفون صحيح');
  if (missingLabels.length === 0) return { ok: true };
  return {
    ok: false,
    missingLabels,
    error: `أكمل بيانات التيك أواي: ${missingLabels.join(' · ')}`,
  };
}

export function getCollectionStatusLabel(status: CollectionStatus, cancelPending?: boolean) {
  if (cancelPending) return 'طلب إلغاء — بانتظار المدير';
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

function resolveOrderItemNote(item: {
  note?: string | null;
  notes?: Array<{ note?: string | null }>;
}) {
  const direct = item.note?.trim();
  if (direct) return direct;
  const fromNotes = (item.notes ?? [])
    .map((n) => n.note?.trim())
    .filter(Boolean)
    .join('\n');
  return fromNotes;
}

export function mapApiOrderType(orderType: string): OrderType {
  return orderType === 'TAKEAWAY' ? 'takeaway' : 'eat-in';
}

function resolveCreatorName(createdBy?: { fullName?: string | null; username?: string | null } | null) {
  return createdBy?.fullName?.trim() || createdBy?.username?.trim() || '';
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
    cancelRequestedAt?: string | Date | null;
    cancellationReason?: string | null;
    paymentStatus?: string;
    discountAmount?: unknown;
    note?: string | null;
    collectionStatus?: string;
    closedAt?: string | Date | null;
    openedAt?: string | Date | null;
    createdBy?: { fullName?: string | null; username?: string | null } | null;
    _count?: { items?: number };
    items?: Array<{
      id?: string;
      productId: string;
      unitPrice: unknown;
      quantity: unknown;
      note?: string | null;
      notes?: Array<{ note?: string | null }>;
      product?: { name?: string; sku?: string | null } | null;
    }>;
  },
  status: SavedOrder['status'],
): SavedOrder {
  const orderType = mapApiOrderType(order.orderType);
  const at = order.closedAt ?? order.openedAt;
  const createdByName = resolveCreatorName(order.createdBy);
  const orderAt = formatOrderTimestamp(at);
  return {
    id: order.id,
    code: order.orderNumber,
    orderType,
    total: Number(order.totalAmount),
    itemsCount: order._count?.items ?? order.items?.length ?? 0,
    ownerName: order.customerName?.trim() ?? '',
    ...(order.customerPhone ? { customerPhone: order.customerPhone } : {}),
    ...(order.customerAddress ? { customerAddress: order.customerAddress } : {}),
    ...(order.captainName ? { captainName: order.captainName } : {}),
    ...(createdByName ? { createdByName } : {}),
    ...(orderAt ? { orderAt } : {}),
    paymentMethod: 'cash',
    ...(order.paymentStatus === 'PENDING' || order.paymentStatus === 'PAID' || order.paymentStatus === 'VOIDED'
      ? { paymentStatus: order.paymentStatus }
      : {}),
    discountAmount: String(order.discountAmount ?? 0),
    orderNote: order.note ?? '',
    items: (order.items ?? []).map((item, index) => {
      const rawNote = resolveOrderItemNote(item);
      const parsed = parseItemNote(rawNote);
      const isCustomLine = item.product?.sku === POS_CUSTOM_LINE_SKU;
      let name = item.product?.name ?? 'صنف';
      let userNote = parsed.userNote;
      if (isCustomLine && rawNote.trim()) {
        const splitIdx = rawNote.indexOf(' · ');
        if (splitIdx >= 0) {
          name = rawNote.slice(0, splitIdx).trim() || name;
          userNote = parseItemNote(rawNote.slice(splitIdx + 3)).userNote;
        } else if (!parsed.sauces.length) {
          name = rawNote.trim();
          userNote = '';
        }
      }
      return {
        lineId: item.id ?? `${item.productId}-${index}`,
        productId: item.productId,
        name,
        unitPrice: Number(item.unitPrice),
        quantity: Number(item.quantity),
        note: userNote,
        sauces: parsed.sauces,
      };
    }),
    createdAt: orderAt || (at ? new Date(at).toLocaleString('ar-EG') : ''),
    status,
    collectionStatus: mapCollectionStatus(order.collectionStatus),
    ...(order.cancelRequestedAt
      ? {
          cancelRequestedAt: new Date(order.cancelRequestedAt).toLocaleString('ar-EG'),
          ...(order.cancellationReason ? { cancellationReason: order.cancellationReason } : {}),
        }
      : {}),
  };
}
