import { useQuery, useMutation, useQueryClient, keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { apiCloseShift, apiGetCustomer, apiListCustomers, apiListOrdersByShift } from './api.js';
import { apiGet, apiPost, parseApiErrorBody } from './api-client.js';
import { useAuth } from './auth-context.js';
import { isApiOrderUncollected } from './pos-store.js';
import { readPosCatalogCache, readPosContextCache, writePosCatalogCache, writePosContextCache } from './pos-cache.js';

function token(accessToken: string | null | undefined) {
  return accessToken ?? undefined;
}

export const POS_QUERY_KEYS = {
  context: ['pos-context'] as const,
  shiftSummary: (shiftId?: string) => ['pos-shift-summary', shiftId] as const,
  shiftUncollected: (shiftId?: string) => ['orders-shift-uncollected', shiftId] as const,
  shiftCollected: (shiftId?: string) => ['orders-shift-collected', shiftId] as const,
  suspended: (branchId?: string) => ['orders-suspended', branchId] as const,
  shiftCurrent: (branchId?: string, cashBoxId?: string) => ['shift-current', branchId, cashBoxId] as const,
};

export type ShiftOrdersPage = { orders: any[]; nextCursor: string | null };

export function invalidatePosQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: POS_QUERY_KEYS.context });
  queryClient.invalidateQueries({ queryKey: ['pos-shift-summary'] });
  queryClient.invalidateQueries({ queryKey: ['orders-shift-uncollected'] });
  queryClient.invalidateQueries({ queryKey: ['orders-shift-collected'] });
  queryClient.invalidateQueries({ queryKey: ['orders-suspended'] });
  queryClient.invalidateQueries({ queryKey: ['shift-current'] });
  queryClient.invalidateQueries({ queryKey: ['pos-catalog'] });
}

/** تحديث الكاش بعد فتح وردية — بدون إعادة جلب pos-context الثقيل */
export function patchPosCachesAfterAutoOpen(
  queryClient: ReturnType<typeof useQueryClient>,
  branchId: string,
  cashBoxId: string,
  payload: { shift: Record<string, unknown>; summary?: unknown },
) {
  const { shift, summary } = payload;
  const cashBox = (shift as { cashBox?: { id: string; name: string } }).cashBox;

  queryClient.setQueryData(POS_QUERY_KEYS.shiftCurrent(branchId, cashBoxId), {
    shiftOpen: true,
    shift,
    summary: summary ?? null,
  });

  queryClient.setQueryData(POS_QUERY_KEYS.context, (old: Record<string, unknown> | undefined) => {
    if (!old) return old;
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
export function refetchPosOrderData(
  queryClient: ReturnType<typeof useQueryClient>,
  shiftId?: string,
) {
  if (!shiftId) return;
  void queryClient.invalidateQueries({ queryKey: POS_QUERY_KEYS.shiftSummary(shiftId) });
  void queryClient.invalidateQueries({ queryKey: POS_QUERY_KEYS.shiftUncollected(shiftId) });
  void queryClient.invalidateQueries({ queryKey: POS_QUERY_KEYS.shiftCollected(shiftId) });
}

/** تحديث فوري لبيانات طلب في كاش القوائم (بعد تعديل فاتورة مثلاً) */
export function patchShiftOrderUpdated(
  queryClient: ReturnType<typeof useQueryClient>,
  shiftId: string,
  orderId: string,
  patch: Record<string, unknown>,
) {
  const merge = (orders: any[]) =>
    orders.map((order) => (order.id === orderId ? { ...order, ...patch } : order));

  patchUncollectedPages(queryClient, shiftId, merge);
  patchCollectedPages(queryClient, shiftId, merge);
}

function patchUncollectedPages(
  queryClient: ReturnType<typeof useQueryClient>,
  shiftId: string,
  updater: (orders: any[]) => any[],
) {
  queryClient.setQueryData<{ pages: ShiftOrdersPage[]; pageParams: unknown[] }>(
    POS_QUERY_KEYS.shiftUncollected(shiftId),
    (old) => {
      if (!old?.pages?.length) return old;
      return {
        ...old,
        pages: old.pages.map((page, i) =>
          i === 0 ? { ...page, orders: updater(page.orders ?? []) } : page,
        ),
      };
    },
  );
}

function patchCollectedPages(
  queryClient: ReturnType<typeof useQueryClient>,
  shiftId: string,
  updater: (orders: any[]) => any[],
) {
  queryClient.setQueryData<{ pages: ShiftOrdersPage[]; pageParams: unknown[] }>(
    POS_QUERY_KEYS.shiftCollected(shiftId),
    (old) => {
      if (!old?.pages?.length) return old;
      return {
        ...old,
        pages: old.pages.map((page, i) =>
          i === 0 ? { ...page, orders: updater(page.orders ?? []) } : page,
        ),
      };
    },
  );
}

export function patchShiftOrderAdded(
  queryClient: ReturnType<typeof useQueryClient>,
  shiftId: string,
  order: Record<string, unknown>,
) {
  const isUncollected = isApiOrderUncollected(order);
  if (isUncollected) {
    patchUncollectedPages(queryClient, shiftId, (orders) => {
      if (orders.some((o) => o.id === order.id)) return orders;
      return [order, ...orders];
    });
  } else {
    patchCollectedPages(queryClient, shiftId, (orders) => {
      if (orders.some((o) => o.id === order.id)) return orders;
      return [order, ...orders];
    });
  }
}

export function patchShiftOrderUncollected(
  queryClient: ReturnType<typeof useQueryClient>,
  shiftId: string,
  orderId: string,
  orderSnapshot?: Record<string, unknown>,
) {
  let moved: Record<string, unknown> | null = null;
  patchCollectedPages(queryClient, shiftId, (orders) => {
    const found = orders.find((o) => o.id === orderId);
    if (found) moved = { ...found, collectionStatus: 'UNCOLLECTED', paymentStatus: 'PENDING' };
    return orders.filter((order) => order.id !== orderId);
  });
  const uncollectedOrder = orderSnapshot
    ? { ...orderSnapshot, collectionStatus: 'UNCOLLECTED', paymentStatus: 'PENDING' }
    : moved;
  if (uncollectedOrder) {
    patchUncollectedPages(queryClient, shiftId, (orders) => {
      if (orders.some((o) => o.id === orderId)) {
        return orders.map((order) =>
          order.id === orderId
            ? { ...order, collectionStatus: 'UNCOLLECTED', paymentStatus: 'PENDING' }
            : order,
        );
      }
      return [uncollectedOrder, ...orders];
    });
  }
}

export function patchShiftOrderCollected(
  queryClient: ReturnType<typeof useQueryClient>,
  shiftId: string,
  orderId: string,
  orderSnapshot?: Record<string, unknown>,
) {
  let moved: Record<string, unknown> | null = null;
  patchUncollectedPages(queryClient, shiftId, (orders) => {
    const found = orders.find((o) => o.id === orderId);
    if (found) moved = { ...found, collectionStatus: 'PENDING_APPROVAL', paymentStatus: 'PAID' };
    return orders.filter((order) => order.id !== orderId);
  });
  const collected = orderSnapshot
    ? { ...orderSnapshot, collectionStatus: 'PENDING_APPROVAL', paymentStatus: 'PAID' }
    : moved;
  if (collected) {
    patchCollectedPages(queryClient, shiftId, (orders) => {
      if (orders.some((o) => o.id === orderId)) {
        return orders.map((order) =>
          order.id === orderId
            ? { ...order, collectionStatus: 'PENDING_APPROVAL', paymentStatus: 'PAID' }
            : order,
        );
      }
      return [collected, ...orders];
    });
  }
}

export function patchShiftOrderRemoved(
  queryClient: ReturnType<typeof useQueryClient>,
  shiftId: string,
  orderId: string,
) {
  patchUncollectedPages(queryClient, shiftId, (orders) =>
    orders.filter((order) => order.id !== orderId),
  );
  patchCollectedPages(queryClient, shiftId, (orders) =>
    orders.filter((order) => order.id !== orderId),
  );
}

export function useBranches() {
  const { accessToken, user } = useAuth();
  return useQuery({
    queryKey: ['branches', user?.organizationId],
    queryFn: async () => {
      const res = await apiGet<any[]>(`/branches?organizationId=${user?.organizationId}`, token(accessToken));
      if (!res.ok) throw new Error(res.body ?? res.error);
      return res.data ?? [];
    },
    enabled: !!accessToken && !!user?.organizationId,
  });
}

export function useCashBoxes(branchId?: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['cash-boxes', branchId],
    queryFn: async () => {
      const res = await apiGet<any[]>(`/cash-boxes?branchId=${branchId}`, token(accessToken));
      if (!res.ok) throw new Error(res.body ?? res.error);
      return res.data ?? [];
    },
    enabled: !!accessToken && !!branchId,
  });
}

export function useCurrentShift(branchId?: string, cashBoxId?: string, enabled = true) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['shift-current', branchId, cashBoxId],
    queryFn: async () => {
      const res = await apiGet<any>(`/shifts/current?branchId=${branchId}&cashBoxId=${cashBoxId}`, token(accessToken));
      if (!res.ok) throw new Error(res.body ?? res.error);
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
      const res = await apiGet<any>('/shifts/pos-context', token(accessToken));
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

export type PosCatalogData = {
  categories: unknown[];
  products: unknown[];
  sauces: Array<{ id: string; name: string; isAvailable?: boolean }>;
  paymentMethods: Array<{ code: string; name: string }>;
};

export function usePosCatalog(branchId?: string) {
  const { accessToken } = useAuth();
  const cached = branchId ? readPosCatalogCache(branchId) as PosCatalogData | undefined : undefined;
  return useQuery({
    queryKey: ['pos-catalog', branchId],
    queryFn: async () => {
      const res = await apiGet<PosCatalogData>(`/shifts/pos-catalog?branchId=${branchId}`, token(accessToken));
      if (!res.ok) throw new Error(res.body ?? res.error);
      const data = res.data ?? { categories: [], products: [], sauces: [], paymentMethods: [] };
      if (branchId) writePosCatalogCache(branchId, data);
      return data;
    },
    enabled: !!accessToken && !!branchId,
    staleTime: 300000,
    ...(cached ? { placeholderData: cached } : {}),
  });
}

export function useShiftUncollectedOrders(shiftId?: string) {
  const { accessToken } = useAuth();
  return useInfiniteQuery({
    queryKey: POS_QUERY_KEYS.shiftUncollected(shiftId),
    queryFn: async ({ pageParam }) => {
      const res = await apiListOrdersByShift(
        shiftId!,
        {
          filter: 'uncollected',
          take: 25,
          ...(pageParam ? { cursor: String(pageParam) } : {}),
        },
        token(accessToken),
      );
      if (!res.ok) throw new Error(res.body ?? res.error);
      return res.data ?? { orders: [], nextCursor: null };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!accessToken && !!shiftId,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
}

export function useShiftCollectedOrders(shiftId?: string) {
  const { accessToken } = useAuth();
  return useInfiniteQuery({
    queryKey: POS_QUERY_KEYS.shiftCollected(shiftId),
    queryFn: async ({ pageParam }) => {
      const res = await apiListOrdersByShift(
        shiftId!,
        {
          filter: 'collected',
          take: 10,
          ...(pageParam ? { cursor: String(pageParam) } : {}),
        },
        token(accessToken),
      );
      if (!res.ok) throw new Error(res.body ?? res.error);
      return res.data ?? { orders: [], nextCursor: null };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!accessToken && !!shiftId,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
}

/** @deprecated use useShiftUncollectedOrders + useShiftCollectedOrders */
export function useShiftClosedOrders(shiftId?: string) {
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

export function usePosShiftSummary(shiftId?: string, initialSummary?: unknown) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['pos-shift-summary', shiftId],
    queryFn: async () => {
      const res = await apiGet<any>(`/shifts/pos-summary?shiftId=${shiftId}`, token(accessToken));
      if (!res.ok) throw new Error(res.body ?? res.error);
      return res.data;
    },
    enabled: !!accessToken && !!shiftId,
    ...(initialSummary != null ? { initialData: initialSummary } : {}),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
}

export function useStockItems(branchId?: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['stock-items', branchId],
    queryFn: async () => {
      const res = await apiGet<any[]>(`/stock-items?branchId=${branchId}`, token(accessToken));
      if (!res.ok) throw new Error(res.body ?? res.error);
      return res.data ?? [];
    },
    enabled: !!accessToken && !!branchId,
  });
}

export function useDashboard(branchId?: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['dashboard', branchId],
    queryFn: async () => {
      const res = await apiGet<any>(`/reports/dashboard?branchId=${branchId}`, token(accessToken));
      if (!res.ok) throw new Error(res.body ?? res.error);
      return res.data;
    },
    enabled: !!accessToken && !!branchId,
  });
}

export function useSuspendedOrders(branchId?: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['orders-suspended', branchId],
    queryFn: async () => {
      const res = await apiGet<any[]>(`/orders/suspended?branchId=${branchId}`, token(accessToken));
      if (!res.ok) throw new Error(res.body ?? res.error);
      return res.data ?? [];
    },
    enabled: !!accessToken && !!branchId,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}

export function useSetupCosts(branchId?: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['setup-costs', branchId],
    queryFn: async () => {
      const res = await apiGet<any[]>(`/setup-costs?branchId=${branchId}`, token(accessToken));
      if (!res.ok) throw new Error(res.body ?? res.error);
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
      const res = await apiGet<any[]>('/setup-costs/categories', token(accessToken));
      if (!res.ok) throw new Error(res.body ?? res.error);
      return res.data ?? [];
    },
    enabled: !!accessToken,
  });
}

export type ReportDateRange = { from: string; to: string };

function appendReportRange(params: URLSearchParams, range?: ReportDateRange) {
  if (range?.from) params.set('from', `${range.from}T00:00:00.000`);
  if (range?.to) params.set('to', `${range.to}T23:59:59.999`);
}

export function useReport(group: string, branchId?: string, opts?: { shiftId?: string; range?: ReportDateRange }) {
  const { accessToken } = useAuth();
  const shiftId = opts?.shiftId;
  const range = opts?.range;
  return useQuery({
    queryKey: ['report', group, branchId, shiftId, range?.from, range?.to],
    queryFn: async () => {
      const params = new URLSearchParams({ branchId: branchId! });
      if (shiftId) params.set('shiftId', shiftId);
      appendReportRange(params, range);
      const res = await apiGet<any>(`/reports/${group}?${params}`, token(accessToken));
      if (!res.ok) throw new Error(res.body ?? res.error);
      return res.data;
    },
    enabled: !!accessToken && !!branchId && !!group,
  });
}

export function useProductDayMatrix(branchId?: string, range?: ReportDateRange) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['report', 'product-day-matrix', branchId, range?.from, range?.to],
    queryFn: async () => {
      const params = new URLSearchParams({ branchId: branchId! });
      appendReportRange(params, range);
      const res = await apiGet<any>(`/reports/product-day-matrix?${params}`, token(accessToken));
      if (!res.ok) throw new Error(res.body ?? res.error);
      return res.data;
    },
    enabled: !!accessToken && !!branchId,
    staleTime: 300000,
    retry: false,
  });
}

export function useWeekOverWeek(branchId?: string, weeks = 8) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['report', 'week-over-week', branchId, weeks],
    queryFn: async () => {
      const res = await apiGet<any>(
        `/reports/week-over-week?branchId=${branchId}&weeks=${weeks}`,
        token(accessToken),
      );
      if (!res.ok) throw new Error(res.body ?? res.error);
      return res.data;
    },
    enabled: !!accessToken && !!branchId,
    staleTime: 300000,
    retry: false,
  });
}

export function useBundleSuggestions(branchId?: string, range?: ReportDateRange) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['report', 'bundle-suggestions', branchId, range?.from, range?.to],
    queryFn: async () => {
      const params = new URLSearchParams({ branchId: branchId! });
      appendReportRange(params, range);
      const res = await apiGet<any>(`/reports/bundle-suggestions?${params}`, token(accessToken));
      if (!res.ok) throw new Error(res.body ?? res.error);
      return res.data;
    },
    enabled: !!accessToken && !!branchId,
    staleTime: 3600000,
    retry: false,
  });
}

export function useVendors(branchId?: string, withBalance = false) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['vendors', branchId, withBalance],
    queryFn: async () => {
      const params = new URLSearchParams({ branchId: branchId! });
      if (withBalance) params.set('withBalance', 'true');
      const res = await apiGet<any[]>(`/vendors?${params}`, token(accessToken));
      if (!res.ok) throw new Error(res.body ?? res.error);
      return res.data ?? [];
    },
    enabled: !!accessToken && !!branchId,
  });
}

export function useVendorStatement(vendorId?: string, from?: string, to?: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['vendor-statement', vendorId, from, to],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await apiGet<any>(`/vendors/${vendorId}/statement?${params}`, token(accessToken));
      if (!res.ok) throw new Error(res.body ?? res.error);
      return res.data;
    },
    enabled: !!accessToken && !!vendorId,
  });
}

export function useVendorInvoices(branchId?: string, vendorId?: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['vendor-invoices', branchId, vendorId],
    queryFn: async () => {
      const params = new URLSearchParams({ branchId: branchId! });
      if (vendorId) params.set('vendorId', vendorId);
      const res = await apiGet<any[]>(`/vendor-invoices?${params}`, token(accessToken));
      if (!res.ok) throw new Error(res.body ?? res.error);
      return res.data ?? [];
    },
    enabled: !!accessToken && !!branchId,
  });
}

export function useVendorPayments(branchId?: string, vendorId?: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['vendor-payments', branchId, vendorId],
    queryFn: async () => {
      const params = new URLSearchParams({ branchId: branchId! });
      if (vendorId) params.set('vendorId', vendorId);
      const res = await apiGet<any[]>(`/vendor-payments?${params}`, token(accessToken));
      if (!res.ok) throw new Error(res.body ?? res.error);
      return res.data ?? [];
    },
    enabled: !!accessToken && !!branchId,
  });
}

export function usePaymentMethods(branchId?: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['payment-methods', branchId],
    queryFn: async () => {
      const res = await apiGet<any[]>(`/payment-methods?branchId=${branchId}`, token(accessToken));
      if (!res.ok) throw new Error(res.body ?? res.error);
      return res.data ?? [];
    },
    enabled: !!accessToken && !!branchId,
  });
}

export function usePurchaseOrders(branchId?: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['purchase-orders', branchId],
    queryFn: async () => {
      const res = await apiGet<any[]>(`/purchase-orders?branchId=${branchId}`, token(accessToken));
      if (!res.ok) throw new Error(res.body ?? res.error);
      return res.data ?? [];
    },
    enabled: !!accessToken && !!branchId,
  });
}

export function useWarehouses(branchId?: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['warehouses', branchId],
    queryFn: async () => {
      const res = await apiGet<any[]>(`/warehouses?branchId=${branchId}`, token(accessToken));
      if (!res.ok) throw new Error(res.body ?? res.error);
      return res.data ?? [];
    },
    enabled: !!accessToken && !!branchId,
  });
}

export function useVendorAccountsContext(branchId?: string, cashBoxId?: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['vendor-accounts-context', branchId, cashBoxId],
    queryFn: async () => {
      const params = new URLSearchParams({ branchId: branchId! });
      if (cashBoxId) params.set('cashBoxId', cashBoxId);
      const res = await apiGet<any>(`/vendor-accounts/context?${params}`, token(accessToken));
      if (!res.ok) throw new Error(res.body ?? res.error);
      return res.data;
    },
    enabled: !!accessToken && !!branchId,
    staleTime: 20_000,
    refetchInterval: 30_000,
  });
}

export function useTreasuryWorkspace(
  branchId?: string,
  cashBoxId?: string,
  fromDate?: string,
  toDate?: string,
  sections?: string[],
) {
  const { accessToken } = useAuth();
  const sectionKey = sections?.join(',') ?? 'current';
  return useQuery({
    queryKey: ['treasury-workspace', branchId, cashBoxId, fromDate, toDate, sectionKey],
    queryFn: async () => {
      const params = new URLSearchParams({ branchId: branchId!, cashBoxId: cashBoxId! });
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      if (sections?.length) params.set('sections', sections.join(','));
      const res = await apiGet<any>(`/treasury/workspace?${params}`, token(accessToken));
      if (!res.ok) throw new Error(res.body ?? res.error);
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
  return (keys: string[]) => keys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
}

export function useShiftMutations() {
  const { accessToken } = useAuth();
  const invalidate = useInvalidateOnMutation();
  const openShift = useMutation({
    mutationFn: async (dto: { branchId: string; cashBoxId: string; openingFloat?: number }) => {
      const res = await apiPost('/shifts/open', dto, token(accessToken));
      if (!res.ok) throw new Error(parseApiErrorBody(res.body, res.error ?? 'فشل فتح الوردية'));
      return res.data;
    },
    onSuccess: () => invalidate(['shift-current', 'pos-context', 'orders-shift-uncollected', 'orders-shift-collected', 'treasury-workspace', 'treasury-transactions', 'dashboard', 'pos-shift-summary']),
  });
  const closeShift = useMutation({
    mutationFn: async (dto: {
      shiftId: string;
      countedCash: number;
      note?: string;
      handoffMode?: 'defer' | 'treasury' | 'existing' | 'successor';
      targetShiftId?: string;
      successorCashBoxId?: string;
      successorOpeningFloat?: number;
    }) => {
      const res = await apiCloseShift(dto, token(accessToken));
      if (!res.ok) throw new Error(parseApiErrorBody(res.body, res.error ?? 'فشل إغلاق الوردية'));
      return res.data;
    },
    onSuccess: () => invalidate(['shift-current', 'pos-context', 'orders-shift-uncollected', 'orders-shift-collected', 'treasury-workspace', 'treasury-transactions', 'dashboard', 'pos-shift-summary']),
  });
  return { openShift, closeShift };
}

export function useCustomers(branchId?: string, q?: string, regularOnly?: boolean) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['customers', branchId, q ?? '', regularOnly ? '1' : '0'],
    queryFn: async () => {
      const res = await apiListCustomers(
        branchId!,
        {
          ...(q ? { q } : {}),
          ...(regularOnly ? { regularOnly: true } : {}),
          take: 80,
        },
        token(accessToken),
      );
      if (!res.ok) throw new Error(res.body ?? res.error);
      return res.data ?? { items: [], total: 0 };
    },
    enabled: !!accessToken && !!branchId,
    staleTime: 20_000,
  });
}

export function useCustomerDetail(customerId?: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      const res = await apiGetCustomer(customerId!, token(accessToken) ?? undefined);
      if (!res.ok) throw new Error(res.body ?? res.error);
      return res.data;
    },
    enabled: !!accessToken && !!customerId,
  });
}
