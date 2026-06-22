import { apiGet, apiPost, apiPut, apiDelete } from './api-client.js';
export async function apiOpenShift(dto, token) {
    return apiPost('/shifts/open', dto, token);
}
export async function apiAutoOpenShift(dto, token) {
    return apiPost('/shifts/auto-open', dto, token);
}
export async function apiListShifts(branchId, from, to, token) {
    const params = new URLSearchParams({ branchId });
    if (from)
        params.set('from', from);
    if (to)
        params.set('to', to);
    return apiGet(`/shifts/list?${params}`, token);
}
export async function apiCollectorSummary(branchId, date, token) {
    const params = new URLSearchParams({ branchId });
    if (date)
        params.set('date', date);
    return apiGet(`/shifts/collector-summary?${params}`, token);
}
export async function apiCloseShift(dto, token) {
    return apiPost('/shifts/close', dto, token);
}
export async function apiShiftHandoffOptions(shiftId, token) {
    return apiGet(`/shifts/handoff-options?shiftId=${shiftId}`, token);
}
export async function apiPendingCashHandoff(cashBoxId, token) {
    return apiGet(`/shifts/pending-handoff?cashBoxId=${cashBoxId}`, token);
}
export async function apiCurrentShift(branchId, cashBoxId, token) {
    return apiGet(`/shifts/current?branchId=${branchId}&cashBoxId=${cashBoxId}`, token);
}
export async function apiTransfer(dto, token) {
    return apiPost('/treasury/transfer', dto, token);
}
export async function apiGetBranchReceiptSettings(branchId, token) {
    return apiGet(`/branches/${branchId}/receipt-settings`, token);
}
export async function apiSaveBranchReceiptSettings(branchId, settings, token) {
    return apiPut(`/branches/${branchId}/receipt-settings`, { settings }, token);
}
export async function apiCreateMovement(dto, token) {
    return apiPost('/treasury/movements', dto, token);
}
export async function apiUpdateSafeSplitSetting(dto, token) {
    return apiPost('/treasury/safe-split-setting', dto, token);
}
export async function apiInternalSafeTransfer(dto, token) {
    return apiPost('/treasury/internal-transfer', dto, token);
}
export async function apiProfitWithdrawal(dto, token) {
    return apiPost('/treasury/profit-withdrawals', dto, token);
}
export async function apiApproveTransaction(id, token) {
    return apiPost(`/treasury/transactions/${id}/approve`, {}, token);
}
export async function apiRejectTransaction(id, reason, token) {
    return apiPost(`/treasury/transactions/${id}/reject`, { reason }, token);
}
export async function apiBatchApproveTransactions(ids, token) {
    return apiPost('/treasury/transactions/batch-approve', { ids }, token);
}
export async function apiTreasuryWorkspace(branchId, cashBoxId, fromDate, toDate, token) {
    const params = new URLSearchParams({ branchId, cashBoxId });
    if (fromDate)
        params.set('from', fromDate);
    if (toDate)
        params.set('to', toDate);
    return apiGet(`/treasury/workspace?${params}`, token);
}
export async function apiTreasuryShiftSummary(shiftId, token) {
    return apiGet(`/treasury/summary?shiftId=${shiftId}`, token);
}
export async function apiListTransactions(branchId, shiftId, token) {
    const params = new URLSearchParams();
    if (branchId)
        params.set('branchId', branchId);
    if (shiftId)
        params.set('shiftId', shiftId);
    return apiGet(`/treasury/transactions?${params}`, token);
}
export async function apiTreasuryBalance(branchId, token) {
    return apiGet(`/treasury/balance?branchId=${branchId}`, token);
}
export async function apiListUsers(organizationId, token) {
    return apiGet(`/users?organizationId=${organizationId}`, token);
}
export async function apiListRoles(token) {
    return apiGet('/roles', token);
}
export async function apiCreateUser(dto, token) {
    return apiPost('/users', dto, token);
}
export async function apiDeleteUser(id, token) {
    return apiDelete(`/users/${id}`, token);
}
export async function apiUpdateUser(id, dto, token) {
    return apiPut(`/users/${id}`, dto, token);
}
export async function apiPlaceOrder(dto, token) {
    return apiPost('/orders', dto, token);
}
export async function apiSuspendOrder(orderId, reason, token) {
    return apiPost(`/orders/${orderId}/suspend`, { reason }, token);
}
export async function apiResumeOrder(orderId, token) {
    return apiPost(`/orders/${orderId}/resume`, {}, token);
}
export async function apiAddOrderPayment(orderId, dto, token) {
    return apiPost(`/orders/${orderId}/payments`, dto, token);
}
export async function apiCollectClosedOrder(orderId, dto, token) {
    return apiPost(`/orders/${orderId}/collect`, dto, token);
}
export async function apiCloseOrder(orderId, token) {
    return apiPost(`/orders/${orderId}/close`, {}, token);
}
export async function apiVoidOrder(orderId, reason, token) {
    return apiPost(`/orders/${orderId}/void`, { reason }, token);
}
export async function apiGetOrderAuditLogs(orderId, token) {
    return apiGet(`/orders/${orderId}/audit-logs`, token);
}
export async function apiGetOrder(orderId, token) {
    return apiGet(`/orders/${orderId}`, token);
}
export async function apiListAuditLogs(query, token) {
    return apiGet(`/audit/logs?${query}`, token);
}
export async function apiAmendOrder(orderId, dto, token) {
    return apiPost(`/orders/${orderId}/amend`, dto, token);
}
export async function apiUncollectOrder(orderId, token) {
    return apiPost(`/orders/${orderId}/uncollect`, {}, token);
}
export async function apiCancelClosedOrder(orderId, reason, token) {
    return apiPost(`/orders/${orderId}/cancel`, { reason }, token);
}
export async function apiRequestCancelOrder(orderId, reason, token) {
    return apiPost(`/orders/${orderId}/cancel-request`, { reason }, token);
}
export async function apiWithdrawCancelRequest(orderId, token) {
    return apiPost(`/orders/${orderId}/cancel-request/withdraw`, {}, token);
}
export async function apiListPendingCancellations(branchId, shiftId, token) {
    const params = new URLSearchParams({ branchId });
    if (shiftId)
        params.set('shiftId', shiftId);
    return apiGet(`/orders/pending-cancellations?${params}`, token);
}
export async function apiApproveOrderCancellation(orderId, token) {
    return apiPost(`/orders/${orderId}/cancel-request/approve`, {}, token);
}
export async function apiRejectOrderCancellation(orderId, reason, token) {
    return apiPost(`/orders/${orderId}/cancel-request/reject`, { reason }, token);
}
export async function apiCreateOpenOrder(dto, token) {
    return apiPost('/orders/open', dto, token);
}
export async function apiListSuspendedOrders(branchId, token) {
    return apiGet(`/orders/suspended?branchId=${branchId}`, token);
}
export async function apiCreateCashierExpense(dto, token) {
    return apiPost('/cashier-expenses', dto, token);
}
export async function apiListExpenseStockItems(branchId, token) {
    return apiGet(`/cashier-expenses/stock-items?branchId=${branchId}`, token);
}
export async function apiListCashBoxes(branchId, token) {
    return apiGet(`/cash-boxes?branchId=${branchId}`, token);
}
export async function apiListPaymentMethods(branchId, token) {
    return apiGet(`/payment-methods?branchId=${branchId}`, token);
}
export async function apiSearchCustomers(branchId, q, token) {
    const params = new URLSearchParams({ branchId, q });
    return apiGet(`/customers/search?${params}`, token);
}
export async function apiSearchDeliveryCaptains(branchId, q, token) {
    const params = new URLSearchParams({ branchId });
    if (q.trim())
        params.set('q', q.trim());
    return apiGet(`/orders/delivery-captains/search?${params}`, token);
}
export async function apiListCustomers(branchId, opts, token) {
    const params = new URLSearchParams({ branchId });
    if (opts?.q)
        params.set('q', opts.q);
    if (opts?.regularOnly)
        params.set('regularOnly', '1');
    if (opts?.skip != null)
        params.set('skip', String(opts.skip));
    if (opts?.take != null)
        params.set('take', String(opts.take));
    return apiGet(`/customers?${params}`, token);
}
export async function apiGetCustomer(id, token) {
    return apiGet(`/customers/${id}`, token);
}
export async function apiUpdateCustomer(id, dto, token) {
    return apiPut(`/customers/${id}`, dto, token);
}
