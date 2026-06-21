import { apiGet, apiPost, apiPut, apiDelete } from './api-client.js';

export async function apiOpenShift(dto: { branchId: string; cashBoxId: string; openingFloat?: number }, token?: string) {
  return apiPost('/shifts/open', dto, token);
}

export async function apiAutoOpenShift(dto: { branchId: string; cashBoxId: string; openingFloat?: number }, token?: string) {
  return apiPost('/shifts/auto-open', dto, token);
}

export async function apiListShifts(branchId: string, from?: string, to?: string, token?: string) {
  const params = new URLSearchParams({ branchId });
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return apiGet(`/shifts/list?${params}`, token);
}

export async function apiCollectorSummary(branchId: string, date?: string, token?: string) {
  const params = new URLSearchParams({ branchId });
  if (date) params.set('date', date);
  return apiGet(`/shifts/collector-summary?${params}`, token);
}

export async function apiCloseShift(dto: { shiftId: string; countedCash: number; note?: string }, token?: string) {
  return apiPost('/shifts/close', dto, token);
}

export async function apiCurrentShift(branchId: string, cashBoxId: string, token?: string) {
  return apiGet(`/shifts/current?branchId=${branchId}&cashBoxId=${cashBoxId}`, token);
}

export async function apiTransfer(dto: { branchId: string; cashBoxId: string; treasuryId: string; amount: number; note: string }, token?: string) {
  return apiPost('/treasury/transfer', dto, token);
}

export async function apiGetBranchReceiptSettings(branchId: string, token?: string) {
  return apiGet(`/branches/${branchId}/receipt-settings`, token);
}

export async function apiSaveBranchReceiptSettings(branchId: string, settings: Record<string, unknown>, token?: string) {
  return apiPut(`/branches/${branchId}/receipt-settings`, { settings }, token);
}

export async function apiCreateMovement(dto: {
  branchId: string;
  cashBoxId: string;
  shiftId?: string;
  movementType: 'CASH_DEPOSIT' | 'CASH_WITHDRAWAL' | 'OPERATING_EXPENSE';
  safeType?: 'PROFITS' | 'EXPENSES';
  paymentMethod?: 'CASH' | 'CARD' | 'INSTAPAY' | 'WALLET' | 'MIXED';
  amount: number;
  note: string;
}, token?: string) {
  return apiPost('/treasury/movements', dto, token);
}

export async function apiUpdateSafeSplitSetting(dto: {
  branchId: string;
  date?: string;
  expensesPercentage: number;
}, token?: string) {
  return apiPost('/treasury/safe-split-setting', dto, token);
}

export async function apiInternalSafeTransfer(dto: {
  branchId: string;
  cashBoxId: string;
  fromSafeType: 'PROFITS' | 'EXPENSES';
  fromPaymentMethod: 'CASH' | 'CARD' | 'INSTAPAY' | 'WALLET' | 'MIXED';
  toSafeType: 'PROFITS' | 'EXPENSES';
  toPaymentMethod: 'CASH' | 'CARD' | 'INSTAPAY' | 'WALLET' | 'MIXED';
  amount: number;
  note?: string;
}, token?: string) {
  return apiPost('/treasury/internal-transfer', dto, token);
}

export async function apiProfitWithdrawal(dto: {
  branchId: string;
  cashBoxId: string;
  paymentMethod: 'CASH' | 'CARD' | 'INSTAPAY' | 'WALLET' | 'MIXED';
  amount: number;
  note?: string;
}, token?: string) {
  return apiPost('/treasury/profit-withdrawals', dto, token);
}

export async function apiApproveTransaction(id: string, token?: string) {
  return apiPost(`/treasury/transactions/${id}/approve`, {}, token);
}

export async function apiRejectTransaction(id: string, reason?: string, token?: string) {
  return apiPost(`/treasury/transactions/${id}/reject`, { reason }, token);
}

export async function apiBatchApproveTransactions(ids: string[], token?: string) {
  return apiPost('/treasury/transactions/batch-approve', { ids }, token);
}

export async function apiTreasuryWorkspace(
  branchId: string,
  cashBoxId: string,
  fromDate?: string,
  toDate?: string,
  token?: string,
) {
  const params = new URLSearchParams({ branchId, cashBoxId });
  if (fromDate) params.set('from', fromDate);
  if (toDate) params.set('to', toDate);
  return apiGet(`/treasury/workspace?${params}`, token);
}

export async function apiTreasuryShiftSummary(shiftId: string, token?: string) {
  return apiGet(`/treasury/summary?shiftId=${shiftId}`, token);
}

export async function apiListTransactions(branchId?: string, shiftId?: string, token?: string) {
  const params = new URLSearchParams();
  if (branchId) params.set('branchId', branchId);
  if (shiftId) params.set('shiftId', shiftId);
  return apiGet(`/treasury/transactions?${params}`, token);
}

export async function apiTreasuryBalance(branchId: string, token?: string) {
  return apiGet(`/treasury/balance?branchId=${branchId}`, token);
}

export async function apiListUsers(organizationId: string, token?: string) {
  return apiGet(`/users?organizationId=${organizationId}`, token);
}

export async function apiListRoles(token?: string) {
  return apiGet('/roles', token);
}

export async function apiCreateUser(dto: { organizationId: string; fullName: string; username: string; password: string; roleCodes?: string[] }, token?: string) {
  return apiPost('/users', dto, token);
}

export async function apiDeleteUser(id: string, token?: string) {
  return apiDelete(`/users/${id}`, token);
}

export async function apiUpdateUser(id: string, dto: { fullName?: string; username?: string; password?: string; status?: string; roleCodes?: string[] }, token?: string) {
  return apiPut(`/users/${id}`, dto, token);
}

export async function apiPlaceOrder(dto: {
  branchId: string;
  shiftId?: string;
  cashBoxId?: string;
  items: Array<{ productId: string; productName: string; quantity: number; unitPrice: number; note?: string }>;
  total: number;
  discountAmount?: number;
  paymentMethod: 'CASH' | 'CARD' | 'INSTAPAY' | 'WALLET' | 'MIXED';
  orderType: 'DINE_IN' | 'TAKEAWAY';
  orderNote?: string;
  orderOwnerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  captainName?: string;
  collectionStatus?: 'PENDING_APPROVAL' | 'UNCOLLECTED' | 'APPROVED';
}, token?: string) {
  return apiPost('/orders', dto, token);
}

export async function apiSuspendOrder(orderId: string, reason?: string, token?: string) {
  return apiPost(`/orders/${orderId}/suspend`, { reason }, token);
}

export async function apiResumeOrder(orderId: string, token?: string) {
  return apiPost(`/orders/${orderId}/resume`, {}, token);
}

export async function apiAddOrderPayment(orderId: string, dto: { paymentMethodCode: string; amount: number; approvalStatus?: 'PENDING' | 'APPROVED' }, token?: string) {
  return apiPost(`/orders/${orderId}/payments`, dto, token);
}

export async function apiCollectClosedOrder(orderId: string, dto: { paymentMethodCode: string; amount: number; approvalStatus?: 'PENDING' | 'APPROVED' }, token?: string) {
  return apiPost(`/orders/${orderId}/collect`, dto, token);
}

export async function apiCloseOrder(orderId: string, token?: string) {
  return apiPost(`/orders/${orderId}/close`, {}, token);
}

export async function apiVoidOrder(orderId: string, reason?: string, token?: string) {
  return apiPost(`/orders/${orderId}/void`, { reason }, token);
}

export async function apiCreateOpenOrder(dto: {
  branchId: string;
  cashBoxId?: string;
  shiftId?: string;
  items: Array<{ productId: string; quantity: number; unitPrice: number; note?: string }>;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  discountAmount?: number;
  orderNote?: string;
  orderOwnerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  captainName?: string;
}, token?: string) {
  return apiPost('/orders/open', dto, token);
}

export async function apiListSuspendedOrders(branchId: string, token?: string) {
  return apiGet(`/orders/suspended?branchId=${branchId}`, token);
}

export async function apiCreateCashierExpense(dto: { branchId: string; shiftId?: string; kind: 'ITEM' | 'GENERAL'; stockItemId?: string; quantity?: number; unitPrice?: number; amount?: number; note?: string }, token?: string) {
  return apiPost('/cashier-expenses', dto, token);
}

export async function apiListExpenseStockItems(branchId: string, token?: string) {
  return apiGet<{ id: string; name: string; averageCost: number; onHandQuantity: number }[]>(
    `/cashier-expenses/stock-items?branchId=${branchId}`,
    token,
  );
}

export async function apiListCashBoxes(branchId: string, token?: string) {
  return apiGet(`/cash-boxes?branchId=${branchId}`, token);
}

export async function apiListPaymentMethods(branchId: string, token?: string) {
  return apiGet(`/payment-methods?branchId=${branchId}`, token);
}
