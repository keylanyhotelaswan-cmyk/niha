import { apiGetOrder } from './api.js';
import { mapApiOrderToSavedOrder } from './pos-store.js';
export async function fetchOrderDetailForPos(orderId, token, status = 'closed') {
    const res = await apiGetOrder(orderId, token);
    if (!res.ok || !res.data)
        return null;
    return mapApiOrderToSavedOrder(res.data, status);
}
