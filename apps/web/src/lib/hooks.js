import { useQuery, useMutation, useQueryClient, keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { apiCloseShift, apiGetCustomer, apiListCustomers, apiListOrdersByShift } from './api.js';
import { apiGet, apiPost, parseApiErrorBody } from './api-client.js';
import { useAuth } from './auth-context.js';
import { isApiOrderUncollected } from './pos-store.js';
import { clearPosCatalogCache, readPosCatalogCache, readPosContextCache, writePosCatalogCache, writePosContextCache } from './pos-cache.js';
function token(accessToken) {
    return accessToken ?? undefined;
}
export const POS_QUERY_KEYS = {
    context: ['pos-context'],
    shiftSummary: (shiftId) => ['pos-shift-summary', shiftId],
    shiftUncollected: (shiftId) => ['orders-shift-uncollected', shiftId],
    shiftCollected: (shiftId) => ['orders-shift-collected', shiftId],
    suspended: (branchId) => ['orders-suspended', branchId],
    shiftCurrent: (branchId, cashBoxId) => ['shift-current', branchId, cashBoxId],
};
export function invalidatePosQueries(queryClient) {
    clearPosCatalogCache();
    queryClient.invalidateQueries({ queryKey: POS_QUERY_KEYS.context });
    queryClient.invalidateQueries({ queryKey: ['pos-shift-summary'] });
    queryClient.invalidateQueries({ queryKey: ['orders-shift-uncollected'] });
    queryClient.invalidateQueries({ queryKey: ['orders-shift-collected'] });
    queryClient.invalidateQueries({ queryKey: ['orders-suspended'] });
    queryClient.invalidateQueries({ queryKey: ['shift-current'] });
    queryClient.invalidateQueries({ queryKey: ['pos-catalog'] });
}
/** تحديث الكاش بعد فتح وردية — بدون إعادة جلب pos-context الثقيل */
export function patchPosCachesAfterAutoOpen(queryClient, branchId, cashBoxId, payload) {
    const { shift, summary } = payload;
    const cashBox = shift.cashBox;
    queryClient.setQueryData(POS_QUERY_KEYS.shiftCurrent(branchId, cashBoxId), {
        shiftOpen: true,
        shift,
        summary: summary ?? null,
    });
    queryClient.setQueryData(POS_QUERY_KEYS.context, (old) => {
        if (!old)
            return old;
        return {
            ...old,
            shiftOpen: true,
            shift,
            ...(summary != null ? { summary } : {}),
            ...(cashBox ? { cashBox: { id: cashBox.id, name: cashBox.name } } : {}),
        };
    });
}
/** تحديث خفيف بعد إغلاق طلب / تحصيل — ملخص + قوائم الطلبات */
export function refetchPosOrderData(queryClient, shiftId) {
    if (!shiftId)
        return;
    void queryClient.invalidateQueries({ queryKey: POS_QUERY_KEYS.shiftSummary(shiftId) });
    void queryClient.invalidateQueries({ queryKey: POS_QUERY_KEYS.shiftUncollected(shiftId) });
    void queryClient.invalidateQueries({ queryKey: POS_QUERY_KEYS.shiftCollected(shiftId) });
}
/** تحديث فوري لبيانات طلب في كاش القوائم (بعد تعديل فاتورة مثلاً) */
export function patchShiftOrderUpdated(queryClient, shiftId, orderId, patch) {
    const merge = (orders) => orders.map((order) => (order.id === orderId ? { ...order, ...patch } : order));
    patchUncollectedPages(queryClient, shiftId, merge);
    patchCollectedPages(queryClient, shiftId, merge);
}
function patchUncollectedPages(queryClient, shiftId, updater) {
    queryClient.setQueryData(POS_QUERY_KEYS.shiftUncollected(shiftId), (old) => {
        if (!old?.pages?.length)
            return old;
        return {
            ...old,
            pages: old.pages.map((page, i) => i === 0 ? { ...page, orders: updater(page.orders ?? []) } : page),
        };
    });
}
function patchCollectedPages(queryClient, shiftId, updater) {
    queryClient.setQueryData(POS_QUERY_KEYS.shiftCollected(shiftId), (old) => {
        if (!old?.pages?.length)
            return old;
        return {
            ...old,
            pages: old.pages.map((page, i) => i === 0 ? { ...page, orders: updater(page.orders ?? []) } : page),
        };
    });
}
export function patchShiftOrderAdded(queryClient, shiftId, order) {
    const isUncollected = isApiOrderUncollected(order);
    if (isUncollected) {
        patchUncollectedPages(queryClient, shiftId, (orders) => {
            if (orders.some((o) => o.id === order.id))
                return orders;
            return [order, ...orders];
        });
    }
    else {
        patchCollectedPages(queryClient, shiftId, (orders) => {
            if (orders.some((o) => o.id === order.id))
                return orders;
            return [order, ...orders];
        });
    }
}
export function patchShiftOrderUncollected(queryClient, shiftId, orderId, orderSnapshot) {
    let moved = null;
    patchCollectedPages(queryClient, shiftId, (orders) => {
        const found = orders.find((o) => o.id === orderId);
        if (found)
            moved = { ...found, collectionStatus: 'UNCOLLECTED', paymentStatus: 'PENDING' };
        return orders.filter((order) => order.id !== orderId);
    });
    const uncollectedOrder = orderSnapshot
        ? { ...orderSnapshot, collectionStatus: 'UNCOLLECTED', paymentStatus: 'PENDING' }
        : moved;
    if (uncollectedOrder) {
        patchUncollectedPages(queryClient, shiftId, (orders) => {
            if (orders.some((o) => o.id === orderId)) {
                return orders.map((order) => order.id === orderId
                    ? { ...order, collectionStatus: 'UNCOLLECTED', paymentStatus: 'PENDING' }
                    : order);
            }
            return [uncollectedOrder, ...orders];
        });
    }
}
export function patchShiftOrderCollected(queryClient, shiftId, orderId, orderSnapshot) {
    let moved = null;
    patchUncollectedPages(queryClient, shiftId, (orders) => {
        const found = orders.find((o) => o.id === orderId);
        if (found)
            moved = { ...found, collectionStatus: 'PENDING_APPROVAL', paymentStatus: 'PAID' };
        return orders.filter((order) => order.id !== orderId);
    });
    const collected = orderSnapshot
        ? { ...orderSnapshot, collectionStatus: 'PENDING_APPROVAL', paymentStatus: 'PAID' }
        : moved;
    if (collected) {
        patchCollectedPages(queryClient, shiftId, (orders) => {
            if (orders.some((o) => o.id === orderId)) {
                return orders.map((order) => order.id === orderId
                    ? { ...order, collectionStatus: 'PENDING_APPROVAL', paymentStatus: 'PAID' }
                    : order);
            }
            return [collected, ...orders];
        });
    }
}
export function patchShiftOrderRemoved(queryClient, shiftId, orderId) {
    patchUncollectedPages(queryClient, shiftId, (orders) => orders.filter((order) => order.id !== orderId));
    patchCollectedPages(queryClient, shiftId, (orders) => orders.filter((order) => order.id !== orderId));
}
export function useBranches() {
    const { accessToken, user } = useAuth();
    return useQuery({
        queryKey: ['branches', user?.organizationId],
        queryFn: async () => {
            const res = await apiGet(`/branches?organizationId=${user?.organizationId}`, token(accessToken));
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return res.data ?? [];
        },
        enabled: !!accessToken && !!user?.organizationId,
    });
}
export function useCashBoxes(branchId) {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: ['cash-boxes', branchId],
        queryFn: async () => {
            const res = await apiGet(`/cash-boxes?branchId=${branchId}`, token(accessToken));
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return res.data ?? [];
        },
        enabled: !!accessToken && !!branchId,
    });
}
export function useCurrentShift(branchId, cashBoxId, enabled = true) {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: ['shift-current', branchId, cashBoxId],
        queryFn: async () => {
            const res = await apiGet(`/shifts/current?branchId=${branchId}&cashBoxId=${cashBoxId}`, token(accessToken));
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return res.data;
        },
        enabled: enabled && !!accessToken && !!branchId && !!cashBoxId,
        staleTime: 120000,
        refetchOnWindowFocus: false,
    });
}
export function usePosContext() {
    const { accessToken } = useAuth();
    const cached = readPosContextCache();
    return useQuery({
        queryKey: ['pos-context'],
        queryFn: async () => {
            const res = await apiGet('/shifts/pos-context', token(accessToken));
            if (!res.ok) {
                const msg = res.body ?? res.error ?? `فشل تحميل سياق نقطة البيع (${res.status ?? 'network'})`;
                throw new Error(msg);
            }
            writePosContextCache(res.data);
            return res.data;
        },
        enabled: !!accessToken,
        staleTime: 120000,
        retry: false,
        refetchOnWindowFocus: false,
        ...(cached != null ? { placeholderData: cached } : {}),
    });
}
export function usePosCatalog(branchId) {
    const { accessToken } = useAuth();
    const cached = branchId ? readPosCatalogCache(branchId) : undefined;
    return useQuery({
        queryKey: ['pos-catalog', branchId],
        queryFn: async () => {
            const res = await apiGet(`/shifts/pos-catalog?branchId=${branchId}`, token(accessToken));
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            const data = res.data ?? { categories: [], products: [], sauces: [], paymentMethods: [] };
            if (branchId)
                writePosCatalogCache(branchId, data);
            return data;
        },
        enabled: !!accessToken && !!branchId,
        staleTime: 60_000,
        refetchOnMount: 'always',
        ...(cached ? { placeholderData: cached } : {}),
    });
}
export function useShiftUncollectedOrders(shiftId) {
    const { accessToken } = useAuth();
    return useInfiniteQuery({
        queryKey: POS_QUERY_KEYS.shiftUncollected(shiftId),
        queryFn: async ({ pageParam }) => {
            const res = await apiListOrdersByShift(shiftId, {
                filter: 'uncollected',
                take: 25,
                ...(pageParam ? { cursor: String(pageParam) } : {}),
            }, token(accessToken));
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return res.data ?? { orders: [], nextCursor: null };
        },
        initialPageParam: undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        enabled: !!accessToken && !!shiftId,
        staleTime: 60000,
        refetchOnWindowFocus: false,
    });
}
export function useShiftCollectedOrders(shiftId) {
    const { accessToken } = useAuth();
    return useInfiniteQuery({
        queryKey: POS_QUERY_KEYS.shiftCollected(shiftId),
        queryFn: async ({ pageParam }) => {
            const res = await apiListOrdersByShift(shiftId, {
                filter: 'collected',
                take: 10,
                ...(pageParam ? { cursor: String(pageParam) } : {}),
            }, token(accessToken));
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return res.data ?? { orders: [], nextCursor: null };
        },
        initialPageParam: undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        enabled: !!accessToken && !!shiftId,
        staleTime: 60000,
        refetchOnWindowFocus: false,
    });
}
/** @deprecated use useShiftUncollectedOrders + useShiftCollectedOrders */
export function useShiftClosedOrders(shiftId) {
    const uncollected = useShiftUncollectedOrders(shiftId);
    const collected = useShiftCollectedOrders(shiftId);
    const orders = [
        ...(uncollected.data?.pages.flatMap((p) => p.orders) ?? []),
        ...(collected.data?.pages.flatMap((p) => p.orders) ?? []),
    ];
    return {
        ...uncollected,
        data: orders,
        isPending: uncollected.isPending && collected.isPending,
        isError: uncollected.isError || collected.isError,
        refetch: async () => {
            await Promise.all([uncollected.refetch(), collected.refetch()]);
        },
    };
}
export function usePosShiftSummary(shiftId, initialSummary) {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: ['pos-shift-summary', shiftId],
        queryFn: async () => {
            const res = await apiGet(`/shifts/pos-summary?shiftId=${shiftId}`, token(accessToken));
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return res.data;
        },
        enabled: !!accessToken && !!shiftId,
        ...(initialSummary != null ? { initialData: initialSummary } : {}),
        staleTime: 60000,
        refetchOnWindowFocus: false,
    });
}
export function useStockItems(branchId) {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: ['stock-items', branchId],
        queryFn: async () => {
            const res = await apiGet(`/stock-items?branchId=${branchId}`, token(accessToken));
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return res.data ?? [];
        },
        enabled: !!accessToken && !!branchId,
    });
}
export function useDashboard(branchId) {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: ['dashboard', branchId],
        queryFn: async () => {
            const res = await apiGet(`/reports/dashboard?branchId=${branchId}`, token(accessToken));
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return res.data;
        },
        enabled: !!accessToken && !!branchId,
    });
}
export function useSuspendedOrders(branchId) {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: ['orders-suspended', branchId],
        queryFn: async () => {
            const res = await apiGet(`/orders/suspended?branchId=${branchId}`, token(accessToken));
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return res.data ?? [];
        },
        enabled: !!accessToken && !!branchId,
        staleTime: 30000,
        refetchOnWindowFocus: false,
        placeholderData: keepPreviousData,
    });
}
export function useSetupCosts(branchId) {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: ['setup-costs', branchId],
        queryFn: async () => {
            const res = await apiGet(`/setup-costs?branchId=${branchId}`, token(accessToken));
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return res.data ?? [];
        },
        enabled: !!accessToken && !!branchId,
    });
}
export function useSetupCategories() {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: ['setup-categories'],
        queryFn: async () => {
            const res = await apiGet('/setup-costs/categories', token(accessToken));
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return res.data ?? [];
        },
        enabled: !!accessToken,
    });
}
function appendReportRange(params, range) {
    if (range?.from)
        params.set('from', `${range.from}T00:00:00.000`);
    if (range?.to)
        params.set('to', `${range.to}T23:59:59.999`);
}
export function useReport(group, branchId, opts) {
    const { accessToken } = useAuth();
    const shiftId = opts?.shiftId;
    const range = opts?.range;
    return useQuery({
        queryKey: ['report', group, branchId, shiftId, range?.from, range?.to],
        queryFn: async () => {
            const params = new URLSearchParams({ branchId: branchId });
            if (shiftId)
                params.set('shiftId', shiftId);
            appendReportRange(params, range);
            const res = await apiGet(`/reports/${group}?${params}`, token(accessToken));
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return res.data;
        },
        enabled: !!accessToken && !!branchId && !!group,
    });
}
export function useProductDayMatrix(branchId, range) {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: ['report', 'product-day-matrix', branchId, range?.from, range?.to],
        queryFn: async () => {
            const params = new URLSearchParams({ branchId: branchId });
            appendReportRange(params, range);
            const res = await apiGet(`/reports/product-day-matrix?${params}`, token(accessToken));
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return res.data;
        },
        enabled: !!accessToken && !!branchId,
        staleTime: 300000,
        retry: false,
    });
}
export function useWeekOverWeek(branchId, weeks = 8) {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: ['report', 'week-over-week', branchId, weeks],
        queryFn: async () => {
            const res = await apiGet(`/reports/week-over-week?branchId=${branchId}&weeks=${weeks}`, token(accessToken));
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return res.data;
        },
        enabled: !!accessToken && !!branchId,
        staleTime: 300000,
        retry: false,
    });
}
export function useBundleSuggestions(branchId, range) {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: ['report', 'bundle-suggestions', branchId, range?.from, range?.to],
        queryFn: async () => {
            const params = new URLSearchParams({ branchId: branchId });
            appendReportRange(params, range);
            const res = await apiGet(`/reports/bundle-suggestions?${params}`, token(accessToken));
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return res.data;
        },
        enabled: !!accessToken && !!branchId,
        staleTime: 3600000,
        retry: false,
    });
}
export function useVendors(branchId, withBalance = false) {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: ['vendors', branchId, withBalance],
        queryFn: async () => {
            const params = new URLSearchParams({ branchId: branchId });
            if (withBalance)
                params.set('withBalance', 'true');
            const res = await apiGet(`/vendors?${params}`, token(accessToken));
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return res.data ?? [];
        },
        enabled: !!accessToken && !!branchId,
    });
}
export function useVendorStatement(vendorId, from, to) {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: ['vendor-statement', vendorId, from, to],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (from)
                params.set('from', from);
            if (to)
                params.set('to', to);
            const res = await apiGet(`/vendors/${vendorId}/statement?${params}`, token(accessToken));
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return res.data;
        },
        enabled: !!accessToken && !!vendorId,
    });
}
export function useVendorInvoices(branchId, vendorId) {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: ['vendor-invoices', branchId, vendorId],
        queryFn: async () => {
            const params = new URLSearchParams({ branchId: branchId });
            if (vendorId)
                params.set('vendorId', vendorId);
            const res = await apiGet(`/vendor-invoices?${params}`, token(accessToken));
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return res.data ?? [];
        },
        enabled: !!accessToken && !!branchId,
    });
}
export function useVendorPayments(branchId, vendorId) {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: ['vendor-payments', branchId, vendorId],
        queryFn: async () => {
            const params = new URLSearchParams({ branchId: branchId });
            if (vendorId)
                params.set('vendorId', vendorId);
            const res = await apiGet(`/vendor-payments?${params}`, token(accessToken));
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return res.data ?? [];
        },
        enabled: !!accessToken && !!branchId,
    });
}
export function usePaymentMethods(branchId) {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: ['payment-methods', branchId],
        queryFn: async () => {
            const res = await apiGet(`/payment-methods?branchId=${branchId}`, token(accessToken));
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return res.data ?? [];
        },
        enabled: !!accessToken && !!branchId,
    });
}
export function usePurchaseOrders(branchId) {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: ['purchase-orders', branchId],
        queryFn: async () => {
            const res = await apiGet(`/purchase-orders?branchId=${branchId}`, token(accessToken));
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return res.data ?? [];
        },
        enabled: !!accessToken && !!branchId,
    });
}
export function useWarehouses(branchId) {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: ['warehouses', branchId],
        queryFn: async () => {
            const res = await apiGet(`/warehouses?branchId=${branchId}`, token(accessToken));
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return res.data ?? [];
        },
        enabled: !!accessToken && !!branchId,
    });
}
export function useVendorAccountsContext(branchId, cashBoxId) {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: ['vendor-accounts-context', branchId, cashBoxId],
        queryFn: async () => {
            const params = new URLSearchParams({ branchId: branchId });
            if (cashBoxId)
                params.set('cashBoxId', cashBoxId);
            const res = await apiGet(`/vendor-accounts/context?${params}`, token(accessToken));
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return res.data;
        },
        enabled: !!accessToken && !!branchId,
        staleTime: 20_000,
        refetchInterval: 30_000,
    });
}
export function useTreasuryWorkspace(branchId, cashBoxId, fromDate, toDate, sections) {
    const { accessToken } = useAuth();
    const sectionKey = sections?.join(',') ?? 'current';
    return useQuery({
        queryKey: ['treasury-workspace', branchId, cashBoxId, fromDate, toDate, sectionKey],
        queryFn: async () => {
            const params = new URLSearchParams({ branchId: branchId, cashBoxId: cashBoxId });
            if (fromDate)
                params.set('from', fromDate);
            if (toDate)
                params.set('to', toDate);
            if (sections?.length)
                params.set('sections', sections.join(','));
            const res = await apiGet(`/treasury/workspace?${params}`, token(accessToken));
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return res.data;
        },
        enabled: !!accessToken && !!branchId && !!cashBoxId,
        staleTime: 30000,
        placeholderData: keepPreviousData,
    });
}
export function useInvalidateTreasuryWorkspace() {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: ['treasury-workspace'] });
}
export function useInvalidateOnMutation() {
    const queryClient = useQueryClient();
    return (keys) => keys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
}
export function useShiftMutations() {
    const { accessToken } = useAuth();
    const invalidate = useInvalidateOnMutation();
    const openShift = useMutation({
        mutationFn: async (dto) => {
            const res = await apiPost('/shifts/open', dto, token(accessToken));
            if (!res.ok)
                throw new Error(parseApiErrorBody(res.body, res.error ?? 'فشل فتح الوردية'));
            return res.data;
        },
        onSuccess: () => invalidate(['shift-current', 'pos-context', 'orders-shift-uncollected', 'orders-shift-collected', 'treasury-workspace', 'treasury-transactions', 'dashboard', 'pos-shift-summary']),
    });
    const closeShift = useMutation({
        mutationFn: async (dto) => {
            const res = await apiCloseShift(dto, token(accessToken));
            if (!res.ok)
                throw new Error(parseApiErrorBody(res.body, res.error ?? 'فشل إغلاق الوردية'));
            return res.data;
        },
        onSuccess: () => invalidate(['shift-current', 'pos-context', 'orders-shift-uncollected', 'orders-shift-collected', 'treasury-workspace', 'treasury-transactions', 'dashboard', 'pos-shift-summary']),
    });
    return { openShift, closeShift };
}
export function useCustomers(branchId, q, regularOnly) {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: ['customers', branchId, q ?? '', regularOnly ? '1' : '0'],
        queryFn: async () => {
            const res = await apiListCustomers(branchId, {
                ...(q ? { q } : {}),
                ...(regularOnly ? { regularOnly: true } : {}),
                take: 80,
            }, token(accessToken));
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return res.data ?? { items: [], total: 0 };
        },
        enabled: !!accessToken && !!branchId,
        staleTime: 20_000,
    });
}
export function useCustomerDetail(customerId) {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: ['customer', customerId],
        queryFn: async () => {
            const res = await apiGetCustomer(customerId, token(accessToken) ?? undefined);
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return res.data;
        },
        enabled: !!accessToken && !!customerId,
    });
}
