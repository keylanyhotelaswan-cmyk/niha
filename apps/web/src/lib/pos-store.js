import { parseItemNote } from './pos-order-sauces.js';
import { formatOrderTimestamp } from './date-utils.js';
import { isValidCustomerPhone } from './customer-phone.js';
export function isShiftOrderUncollected(order) {
    return order.collectionStatus === 'uncollected' || order.paymentStatus === 'PENDING';
}
/** نفس تعريف الـ API — للطلبات الخام قبل التحويل */
export function isApiOrderUncollected(order) {
    return (order.collectionStatus === 'UNCOLLECTED'
        || order.collectionStatus === 'uncollected'
        || order.paymentStatus === 'PENDING');
}
/** محصّل أو بانتظار اعتماد الإدارة */
export function isShiftOrderCollected(order) {
    return order.collectionStatus === 'approved' || order.collectionStatus === 'pending_approval';
}
export function createOrderCode() {
    return '';
}
export const POS_BRANCH_STORAGE_KEY = 'niha-pos-branch-id';
export function readPosBranchId() {
    try {
        return sessionStorage.getItem(POS_BRANCH_STORAGE_KEY) ?? '';
    }
    catch {
        return '';
    }
}
export function writePosBranchId(branchId) {
    try {
        if (branchId)
            sessionStorage.setItem(POS_BRANCH_STORAGE_KEY, branchId);
    }
    catch {
        /* ignore */
    }
}
export function defaultOwnerName(orderType) {
    return orderType === 'eat-in' ? 'عميل الصالة' : 'عميل تيك أواي';
}
/** حقول التيك أواي المطلوبة قبل التأكيد */
export function validateTakeawayOrderFields(orderType, customerName, customerPhone) {
    if (orderType !== 'takeaway')
        return { ok: true };
    const missingLabels = [];
    if (!customerName.trim())
        missingLabels.push('اسم العميل');
    if (!customerPhone.trim())
        missingLabels.push('رقم التلفون');
    else if (!isValidCustomerPhone(customerPhone))
        missingLabels.push('رقم تلفون صحيح');
    if (missingLabels.length === 0)
        return { ok: true };
    return {
        ok: false,
        missingLabels,
        error: `أكمل بيانات التيك أواي: ${missingLabels.join(' · ')}`,
    };
}
export function getCollectionStatusLabel(status, cancelPending) {
    if (cancelPending)
        return 'طلب إلغاء — بانتظار المدير';
    if (status === 'approved')
        return 'تم التحصيل';
    if (status === 'pending_approval')
        return 'تم التحصيل — بانتظار اعتماد الخزنة';
    return 'لم يُحصّل';
}
export function mapCollectionStatus(apiStatus) {
    if (apiStatus === 'UNCOLLECTED')
        return 'uncollected';
    if (apiStatus === 'PENDING_APPROVAL')
        return 'pending_approval';
    if (apiStatus === 'APPROVED')
        return 'approved';
    return 'approved';
}
export function mapPaymentMethodCode(code) {
    const lower = code.toLowerCase();
    if (lower === 'cash')
        return 'CASH';
    if (lower === 'card')
        return 'CARD';
    if (lower === 'instapay')
        return 'INSTAPAY';
    if (lower === 'wallet')
        return 'WALLET';
    return code.toUpperCase();
}
export function mapOrderTypeToApi(orderType) {
    return orderType === 'eat-in' ? 'DINE_IN' : 'TAKEAWAY';
}
function resolveOrderItemNote(item) {
    const direct = item.note?.trim();
    if (direct)
        return direct;
    const fromNotes = (item.notes ?? [])
        .map((n) => n.note?.trim())
        .filter(Boolean)
        .join('\n');
    return fromNotes;
}
export function mapApiOrderType(orderType) {
    return orderType === 'TAKEAWAY' ? 'takeaway' : 'eat-in';
}
function resolveCreatorName(createdBy) {
    return createdBy?.fullName?.trim() || createdBy?.username?.trim() || '';
}
export function mapApiOrderToSavedOrder(order, status) {
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
        items: (order.items ?? []).map((item) => {
            const rawNote = resolveOrderItemNote(item);
            const parsed = parseItemNote(rawNote);
            return {
                productId: item.productId,
                name: item.product?.name ?? 'صنف',
                unitPrice: Number(item.unitPrice),
                quantity: Number(item.quantity),
                note: parsed.userNote,
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
