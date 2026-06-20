export function isShiftOrderUncollected(order) {
    return order.collectionStatus === 'uncollected' || order.paymentStatus === 'PENDING';
}
export function isShiftOrderCollected(order) {
    return !isShiftOrderUncollected(order);
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
export function getCollectionStatusLabel(status) {
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
export function mapApiOrderType(orderType) {
    return orderType === 'TAKEAWAY' ? 'takeaway' : 'eat-in';
}
export function mapApiOrderToSavedOrder(order, status) {
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
