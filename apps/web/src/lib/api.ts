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

export async function apiCloseShift(dto: {
  shiftId: string;
  countedCash: number;
  note?: string;
  handoffMode?: 'defer' | 'treasury' | 'existing' | 'successor';
  targetShiftId?: string;
  successorCashBoxId?: string;
  successorOpeningFloat?: number;
}, token?: string) {
  return apiPost('/shifts/close', dto, token);
}

export async function apiShiftWalletTransfer(dto: {
  shiftId: string;
  fromPaymentMethod: 'CASH' | 'INSTAPAY' | 'WALLET';
  toPaymentMethod: 'CASH' | 'INSTAPAY' | 'WALLET';
  amount: number;
  note?: string;
}, token?: string) {
  return apiPost('/shifts/wallet-transfer', dto, token);
}

export async function apiShiftHandoffOptions(shiftId: string, token?: string) {
  return apiGet<{
    shift: { id: string; shiftNumber: string; cashBoxId: string; cashBoxName: string; cashierName: string };
    pending: { uncollectedCount: number; suspendedCount: number; openCount: number; total: number };
    openShifts: Array<{
      id: string;
      shiftNumber: string;
      cashierName: string;
      cashBoxId: string;
      cashBoxName: string;
      openedAt: string;
    }>;
    cashBoxes: Array<{ id: string; name: string; code: string }>;
    hasOpenShiftOnCashBox?: boolean;
    canOpenSuccessor?: boolean;
  }>(`/shifts/handoff-options?shiftId=${shiftId}`, token);
}

export async function apiPendingCashHandoff(cashBoxId: string, token?: string) {
  return apiGet<{
    id: string;
    fromShiftNumber: string;
    handedByName: string | null;
    cashAmount: number;
    uncollectedCount: number;
    note: string | null;
    createdAt: string;
  } | null>(`/shifts/pending-handoff?cashBoxId=${cashBoxId}`, token);
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

export async function apiGetOrderAuditLogs(orderId: string, token?: string) {
  return apiGet(`/orders/${orderId}/audit-logs`, token);
}

export async function apiGetOrder(orderId: string, token?: string) {
  return apiGet(`/orders/${orderId}`, token);
}

export async function apiListOrdersByShift(
  shiftId: string,
  opts?: { filter?: 'all' | 'uncollected' | 'collected'; take?: number; cursor?: string },
  token?: string,
) {
  const params = new URLSearchParams({ shiftId, view: 'list' });
  if (opts?.filter) params.set('filter', opts.filter);
  if (opts?.take != null) params.set('take', String(opts.take));
  if (opts?.cursor) params.set('cursor', opts.cursor);
  return apiGet<{ orders: unknown[]; nextCursor: string | null }>(`/orders/by-shift?${params}`, token);
}

export async function apiListAuditLogs(query: string, token?: string) {
  return apiGet(`/audit/logs?${query}`, token);
}

export async function apiAmendOrder(
  orderId: string,
  dto: {
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
    captainName?: string;
    note?: string;
    discountAmount?: number;
    items?: Array<{ productId: string; quantity: number; unitPrice: number; note?: string }>;
  },
  token?: string,
) {
  return apiPost(`/orders/${orderId}/amend`, dto, token);
}

export async function apiUncollectOrder(orderId: string, token?: string) {
  return apiPost(`/orders/${orderId}/uncollect`, {}, token);
}

export async function apiCancelClosedOrder(orderId: string, reason?: string, token?: string) {
  return apiPost(`/orders/${orderId}/cancel`, { reason }, token);
}

export async function apiRequestCancelOrder(orderId: string, reason?: string, token?: string) {
  return apiPost(`/orders/${orderId}/cancel-request`, { reason }, token);
}

export async function apiWithdrawCancelRequest(orderId: string, token?: string) {
  return apiPost(`/orders/${orderId}/cancel-request/withdraw`, {}, token);
}

export async function apiListPendingCancellations(branchId: string, shiftId?: string, token?: string) {
  const params = new URLSearchParams({ branchId });
  if (shiftId) params.set('shiftId', shiftId);
  return apiGet(`/orders/pending-cancellations?${params}`, token);
}

export async function apiApproveOrderCancellation(orderId: string, token?: string) {
  return apiPost(`/orders/${orderId}/cancel-request/approve`, {}, token);
}

export async function apiRejectOrderCancellation(orderId: string, reason?: string, token?: string) {
  return apiPost(`/orders/${orderId}/cancel-request/reject`, { reason }, token);
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

export async function apiCreateCashierExpense(dto: {
  branchId: string;
  shiftId?: string;
  kind: 'ITEM' | 'GENERAL';
  stockItemId?: string;
  quantity?: number;
  unitPrice?: number;
  amount?: number;
  note?: string;
  paymentMethod?: 'CASH' | 'INSTAPAY' | 'WALLET' | 'CARD';
}, token?: string) {
  return apiPost('/cashier-expenses', dto, token);
}

export async function apiListExpenseStockItems(branchId: string, token?: string) {
  return apiGet<{ id: string; name: string; averageCost: number; onHandQuantity: number }[]>(
    `/cashier-expenses/stock-items?branchId=${branchId}`,
    token,
  );
}

export async function apiGetProductionPlan(branchId: string, date?: string, token?: string) {
  const params = new URLSearchParams({ branchId });
  if (date) params.set('date', date);
  return apiGet<{
    dateKey: string;
    items: Array<{
      productId: string;
      name: string;
      categoryId: string;
      categoryName: string;
      plannedQuantity: number | null;
      soldQuantity: number;
    }>;
  }>(`/production-plan?${params}`, token);
}

export async function apiSaveProductionPlan(dto: {
  branchId: string;
  dateKey?: string;
  items: Array<{ productId: string; plannedQuantity?: number | null }>;
}, token?: string) {
  return apiPost('/production-plan', dto, token);
}

export async function apiListCashBoxes(branchId: string, token?: string) {
  return apiGet(`/cash-boxes?branchId=${branchId}`, token);
}

export async function apiListPaymentMethods(branchId: string, token?: string) {
  return apiGet(`/payment-methods?branchId=${branchId}`, token);
}

export async function apiSearchCustomers(branchId: string, q: string, token?: string) {
  const params = new URLSearchParams({ branchId, q });
  return apiGet<Array<{
    id: string;
    phone: string;
    name: string | null;
    address: string | null;
    isRegular: boolean;
    orderCount: number;
    lastOrderAt: string | null;
  }>>(`/customers/search?${params}`, token);
}

export async function apiSearchDeliveryCaptains(branchId: string, q: string, token?: string) {
  const params = new URLSearchParams({ branchId });
  if (q.trim()) params.set('q', q.trim());
  return apiGet<Array<{
    name: string;
    orderCount: number;
    lastOrderAt: string | null;
  }>>(`/orders/delivery-captains/search?${params}`, token);
}

export async function apiListCustomers(
  branchId: string,
  opts?: { q?: string; regularOnly?: boolean; skip?: number; take?: number },
  token?: string,
) {
  const params = new URLSearchParams({ branchId });
  if (opts?.q) params.set('q', opts.q);
  if (opts?.regularOnly) params.set('regularOnly', '1');
  if (opts?.skip != null) params.set('skip', String(opts.skip));
  if (opts?.take != null) params.set('take', String(opts.take));
  return apiGet<{ items: any[]; total: number }>(`/customers?${params}`, token);
}

export async function apiGetCustomer(id: string, token?: string) {
  return apiGet<any>(`/customers/${id}`, token);
}

export async function apiUpdateCustomer(
  id: string,
  dto: { name?: string; address?: string; isRegular?: boolean; notes?: string },
  token?: string,
) {
  return apiPut(`/customers/${id}`, dto, token);
}
