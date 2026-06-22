import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiCloseShift, apiGetCustomer, apiListCustomers } from './api.js';
import { apiGet, apiPost, parseApiErrorBody } from './api-client.js';
import { useAuth } from './auth-context.js';
import { readPosCatalogCache, readPosContextCache, writePosCatalogCache, writePosContextCache } from './pos-cache.js';
function token(accessToken) {
    return accessToken ?? undefined;
}
export const POS_QUERY_KEYS = {
    context: ['pos-context'],
    shiftSummary: (shiftId) => ['pos-shift-summary', shiftId],
    shiftClosed: (shiftId) => ['orders-shift-closed', shiftId],
    suspended: (branchId) => ['orders-suspended', branchId],
    shiftCurrent: (branchId, cashBoxId) => ['shift-current', branchId, cashBoxId],
};
export function invalidatePosQueries(queryClient) {
    queryClient.invalidateQueries({ queryKey: POS_QUERY_KEYS.context });
    queryClient.invalidateQueries({ queryKey: ['pos-shift-summary'] });
    queryClient.invalidateQueries({ queryKey: ['orders-shift-closed'] });
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
/** تحديث خفيف بعد إغلاق طلب / تحصيل — بدون انتظار */
export function refetchPosOrderData(queryClient, shiftId) {
    if (!shiftId)
        return;
    void queryClient.invalidateQueries({ queryKey: POS_QUERY_KEYS.shiftSummary(shiftId) });
    void queryClient.invalidateQueries({ queryKey: POS_QUERY_KEYS.shiftClosed(shiftId) });
}
export function patchShiftOrderUncollected(queryClient, shiftId, orderId) {
    queryClient.setQueryData(POS_QUERY_KEYS.shiftClosed(shiftId), (old) => {
        if (!old?.length)
            return old;
        return old.map((order) => order.id === orderId
            ? {
                ...order,
                collectionStatus: 'UNCOLLECTED',
                paymentStatus: 'PENDING',
            }
            : order);
    });
}
export function patchShiftOrderCollected(queryClient, shiftId, orderId) {
    queryClient.setQueryData(POS_QUERY_KEYS.shiftClosed(shiftId), (old) => {
        if (!old?.length)
            return old;
        return old.map((order) => order.id === orderId
            ? {
                ...order,
                collectionStatus: 'PENDING_APPROVAL',
                paymentStatus: 'PAID',
            }
            : order);
    });
}
export function patchShiftOrderRemoved(queryClient, shiftId, orderId) {
    queryClient.setQueryData(POS_QUERY_KEYS.shiftClosed(shiftId), (old) => {
        if (!old?.length)
            return old;
        return old.filter((order) => order.id !== orderId);
    });
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
        refetchInterval: 120000,
        staleTime: 60000,
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
        staleTime: 300000,
        ...(cached ? { placeholderData: cached } : {}),
    });
}
export function useShiftClosedOrders(shiftId) {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: ['orders-shift-closed', shiftId],
        queryFn: async () => {
            const res = await apiGet(`/orders/by-shift?shiftId=${shiftId}`, token(accessToken));
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return res.data ?? [];
        },
        enabled: !!accessToken && !!shiftId,
        staleTime: 15000,
    });
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
        staleTime: 15000,
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
        refetchOnMount: 'always',
        staleTime: 0,
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
export function useReport(group, branchId, shiftId) {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: ['report', group, branchId, shiftId],
        queryFn: async () => {
            const params = new URLSearchParams({ branchId: branchId });
            if (shiftId)
                params.set('shiftId', shiftId);
            const res = await apiGet(`/reports/${group}?${params}`, token(accessToken));
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return res.data;
        },
        enabled: !!accessToken && !!branchId && !!group,
    });
}
export function useVendors(branchId) {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: ['vendors', branchId],
        queryFn: async () => {
            const res = await apiGet(`/vendors?branchId=${branchId}`, token(accessToken));
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
        onSuccess: () => invalidate(['shift-current', 'pos-context', 'orders-shift-closed', 'treasury-workspace', 'treasury-transactions', 'dashboard', 'pos-shift-summary']),
    });
    const closeShift = useMutation({
        mutationFn: async (dto) => {
            const res = await apiCloseShift(dto, token(accessToken));
            if (!res.ok)
                throw new Error(parseApiErrorBody(res.body, res.error ?? 'فشل إغلاق الوردية'));
            return res.data;
        },
        onSuccess: () => invalidate(['shift-current', 'pos-context', 'orders-shift-closed', 'treasury-workspace', 'treasury-transactions', 'dashboard', 'pos-shift-summary']),
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
