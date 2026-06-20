import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiGet, apiPost, parseApiErrorBody } from './api-client.js';
import { useAuth } from './auth-context.js';
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
/** تحديث خفيف بعد إغلاق طلب / تحصيل — KPIs + قائمة الطلبات فقط */
export async function refetchPosOrderData(queryClient, shiftId) {
    if (!shiftId)
        return;
    await Promise.all([
        queryClient.refetchQueries({ queryKey: POS_QUERY_KEYS.shiftSummary(shiftId) }),
        queryClient.refetchQueries({ queryKey: POS_QUERY_KEYS.shiftClosed(shiftId) }),
    ]);
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
export function useCurrentShift(branchId, cashBoxId) {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: ['shift-current', branchId, cashBoxId],
        queryFn: async () => {
            const res = await apiGet(`/shifts/current?branchId=${branchId}&cashBoxId=${cashBoxId}`, token(accessToken));
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return res.data;
        },
        enabled: !!accessToken && !!branchId && !!cashBoxId,
        refetchInterval: 120000,
    });
}
export function usePosContext() {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: ['pos-context'],
        queryFn: async () => {
            const res = await apiGet('/shifts/pos-context', token(accessToken));
            if (!res.ok) {
                const msg = res.body ?? res.error ?? `فشل تحميل سياق نقطة البيع (${res.status ?? 'network'})`;
                throw new Error(msg);
            }
            return res.data;
        },
        enabled: !!accessToken,
        staleTime: 60000,
        retry: false,
        refetchOnWindowFocus: true,
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
export function usePosShiftSummary(shiftId) {
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
            const res = await apiPost('/shifts/close', dto, token(accessToken));
            if (!res.ok)
                throw new Error(parseApiErrorBody(res.body, res.error ?? 'فشل إغلاق الوردية'));
            return res.data;
        },
        onSuccess: () => invalidate(['shift-current', 'pos-context', 'orders-shift-closed', 'treasury-workspace', 'treasury-transactions', 'dashboard', 'pos-shift-summary']),
    });
    return { openShift, closeShift };
}
