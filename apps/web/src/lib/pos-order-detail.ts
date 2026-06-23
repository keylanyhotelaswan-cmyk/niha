import { apiGetOrder } from './api.js';
import { mapApiOrderToSavedOrder, type SavedOrder } from './pos-store.js';

export async function fetchOrderDetailForPos(
  orderId: string,
  token: string,
  status: SavedOrder['status'] = 'closed',
): Promise<SavedOrder | null> {
  const res = await apiGetOrder(orderId, token);
  if (!res.ok || !res.data) return null;
  return mapApiOrderToSavedOrder(res.data as Parameters<typeof mapApiOrderToSavedOrder>[0], status);
}
