import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { apiAutoOpenShift, apiCollectClosedOrder, apiCreateCashierExpense, apiListExpenseStockItems, apiShiftWalletTransfer } from '../../lib/api.js';
import { apiGet } from '../../lib/api-client.js';
import { useAuth } from '../../lib/auth-context.js';
import {
  invalidatePosQueries,
  patchPosCachesAfterAutoOpen,
  patchShiftOrderCollected,
  patchShiftOrderUncollected,
  refetchPosOrderData,
  useBranches,
  useCashBoxes,
  useCurrentShift,
  usePosContext,
  usePosShiftSummary,
  useShiftCollectedOrders,
  useShiftUncollectedOrders,
  useShiftMutations,
  useSuspendedOrders,
} from '../../lib/hooks.js';
import { readPosContextCache } from '../../lib/pos-cache.js';
import { canManageTreasury, canUsePosPrinting } from '../../lib/permissions.js';
import { hydrateReceiptSettingsFromServer, RECEIPT_SETTINGS_EVENT } from '../../lib/pos-receipt-settings.js';
import {
  isShiftOrderCollected,
  isShiftOrderUncollected,
  mapApiOrderToSavedOrder,
  mapPaymentMethodCode,
  readPosBranchId,
  writePosBranchId,
  type SavedOrder,
} from '../../lib/pos-store.js';

export function usePosWorkspace() {
  const queryClient = useQueryClient();
  const { accessToken, user, permissions } = useAuth();

  const { data: posContext, refetch: refetchPosContext, isPending: posContextPending, isError: posContextError, error: posContextErrorDetail, isFetching: posContextFetching } = usePosContext();
  const cachedContext = readPosContextCache() as { shiftOpen?: boolean; shift?: unknown } | undefined;
  const cachedShiftOpen = Boolean(cachedContext?.shiftOpen);
  const shiftStatusPending = posContextPending && !posContext;
  const { data: branchList = [] } = useBranches();
  const [branchId, setBranchId] = useState(() => readPosBranchId());
  const [selectedCashBoxId, setSelectedCashBoxId] = useState('');

  const effectiveBranchId = posContext?.branch?.id || branchId || branchList[0]?.id || readPosBranchId();
  const { data: cashBoxes = [] } = useCashBoxes(effectiveBranchId);
  const contextCashBoxId = posContext?.cashBox?.id ?? '';
  const queryCashBoxId = selectedCashBoxId || contextCashBoxId || cashBoxes[0]?.id || '';
  const hasContextShift = Boolean(posContext?.shiftOpen && posContext?.shift);
  const { data: shiftData, refetch: refetchShift } = useCurrentShift(
    effectiveBranchId,
    queryCashBoxId,
    !posContextPending && !!effectiveBranchId && !!queryCashBoxId && (!hasContextShift || !posContext?.summary),
  );

  const shift = useMemo(() => {
    if (shiftData?.shiftOpen && shiftData.shift) return shiftData.shift;
    if (posContext?.shiftOpen && posContext.shift) return posContext.shift;
    return null;
  }, [shiftData, posContext]);
  const canManageShift = canManageTreasury(permissions);
  const shiftOwned = Boolean(shift && user?.id && shift.openedById === user.id);
  const shiftOpen = Boolean(shift && (shiftOwned || canManageShift));
  const effectiveShiftId = shiftOpen && shift?.id ? shift.id : '';
  const cashBoxId = shift?.cashBoxId ?? posContext?.cashBox?.id ?? selectedCashBoxId;

  const { data: posSummaryFetched, refetch: refetchPosSummary, isPending: posSummaryPending, isError: posSummaryError } = usePosShiftSummary(
    effectiveShiftId || undefined,
    posContext?.posSummary,
  );
  const posSummary = posSummaryFetched ?? posContext?.posSummary ?? null;
  const treasurySummary = shiftData?.summary ?? posContext?.summary ?? null;
  const closeShiftSummary = posSummary ?? (treasurySummary
    ? {
        expectedCash: treasurySummary.expectedCash,
        openingFloat: treasurySummary.openingFloat,
        totalSales: treasurySummary.totalSales,
        pending: treasurySummary.pending ?? treasurySummary.pendingCashInCustody,
        pendingCashInCustody: treasurySummary.pendingCashInCustody,
        expensesTotal: treasurySummary.expensesTotal,
        ordersCount: treasurySummary.ordersCount,
        byPaymentMethod: treasurySummary.byPaymentMethod,
        salesByMethod: treasurySummary.salesByMethod,
        expensesByPaymentMethod: treasurySummary.expensesByPaymentMethod,
        walletTransfers: treasurySummary.walletTransfers,
        netSalesByMethod: treasurySummary.netSalesByMethod,
        outgoing: treasurySummary.outgoing,
      }
    : null);
  const displayPosSummary = posSummary ?? closeShiftSummary;

  const {
    data: uncollectedPages,
    isPending: uncollectedPending,
    isError: uncollectedError,
    refetch: refetchUncollected,
    fetchNextPage: fetchNextUncollectedPage,
    hasNextPage: hasMoreUncollected,
    isFetchingNextPage: uncollectedLoadingMore,
  } = useShiftUncollectedOrders(effectiveShiftId);

  const {
    data: collectedPages,
    isPending: collectedPending,
    isError: collectedError,
    refetch: refetchCollected,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useShiftCollectedOrders(effectiveShiftId);

  const shiftOrdersPending = uncollectedPending && collectedPending;
  const shiftOrdersError = uncollectedError || collectedError;
  const refetchShiftOrders = async () => {
    await Promise.all([refetchUncollected(), refetchCollected()]);
  };

  const { data: apiSuspended = [], isPending: suspendedPending, refetch: refetchSuspended } = useSuspendedOrders(effectiveBranchId);

  const [printingEnabled, setPrintingEnabled] = useState(() => canUsePosPrinting(permissions));

  useEffect(() => {
    setPrintingEnabled(canUsePosPrinting(permissions));
    const onSettingsChange = () => setPrintingEnabled(canUsePosPrinting(permissions));
    window.addEventListener(RECEIPT_SETTINGS_EVENT, onSettingsChange);
    return () => window.removeEventListener(RECEIPT_SETTINGS_EVENT, onSettingsChange);
  }, [permissions]);

  useEffect(() => {
    if (!effectiveBranchId || !accessToken) return;
    hydrateReceiptSettingsFromServer(effectiveBranchId, accessToken).catch(() => {});
  }, [effectiveBranchId, accessToken]);
  const { closeShift } = useShiftMutations();

  const operatorName = user?.fullName?.trim() || user?.username || 'مستخدم';
  const shiftOperatorName = shift?.openedBy?.fullName?.trim() || operatorName;

  useEffect(() => {
    if (effectiveBranchId) writePosBranchId(effectiveBranchId);
  }, [effectiveBranchId]);

  useEffect(() => {
    if (posContext?.branch?.id) {
      setBranchId(posContext.branch.id);
      writePosBranchId(posContext.branch.id);
    }
    if (posContext?.cashBox?.id) setSelectedCashBoxId(posContext.cashBox.id);
  }, [posContext]);

  useEffect(() => {
    const boxId = shift?.cashBoxId ?? posContext?.cashBox?.id;
    if (boxId) setSelectedCashBoxId(boxId);
  }, [shift?.cashBoxId, posContext?.cashBox?.id]);

  useEffect(() => {
    if (cashBoxes.length && !selectedCashBoxId) setSelectedCashBoxId(cashBoxes[0].id);
  }, [cashBoxes, selectedCashBoxId]);

  const suspendedOrders = useMemo<SavedOrder[]>(
    () => apiSuspended.map((o: any) => mapApiOrderToSavedOrder(o, 'suspended')),
    [apiSuspended],
  );

  const shiftClosedOrdersSource = useMemo(() => {
    const uncollected = uncollectedPages?.pages.flatMap((p) => p.orders) ?? [];
    const collected = collectedPages?.pages.flatMap((p) => p.orders) ?? [];
    if (uncollected.length > 0 || collected.length > 0) {
      return [...uncollected, ...collected];
    }
    const fromSummary = posSummary?.shiftClosedOrders ?? posContext?.posSummary?.shiftClosedOrders;
    return fromSummary ?? [];
  }, [uncollectedPages, collectedPages, posSummary, posContext]);

  const shiftClosedOrders = useMemo<SavedOrder[]>(() => {
    const seen = new Set<string>();
    return shiftClosedOrdersSource
      .map((o: any) => mapApiOrderToSavedOrder(o, 'closed'))
      .filter((o: SavedOrder) => {
        if (seen.has(o.id)) return false;
        seen.add(o.id);
        return true;
      });
  }, [shiftClosedOrdersSource]);

  const shiftOrdersShowError = shiftOrdersError && shiftClosedOrders.length === 0;

  const uncollectedOrders = useMemo(
    () => shiftClosedOrders.filter((o) => isShiftOrderUncollected(o)),
    [shiftClosedOrders],
  );
  const collectedOrders = useMemo(
    () => shiftClosedOrders.filter((o) => isShiftOrderCollected(o)),
    [shiftClosedOrders],
  );
  const uncollectedAmount = useMemo(
    () => uncollectedOrders.reduce((s, o) => s + o.total, 0),
    [uncollectedOrders],
  );

  const displayUncollectedCount =
    (displayPosSummary as { uncollectedCount?: number } | null)?.uncollectedCount
    ?? uncollectedOrders.length;
  const displayUncollectedAmount =
    (displayPosSummary as { uncollectedTotal?: number } | null)?.uncollectedTotal
    ?? uncollectedAmount;
  const summaryOrdersCount = (displayPosSummary as { ordersCount?: number } | null)?.ordersCount;
  const displayCollectedCount =
    summaryOrdersCount != null && (displayPosSummary as { uncollectedCount?: number })?.uncollectedCount != null
      ? summaryOrdersCount - (displayPosSummary as { uncollectedCount: number }).uncollectedCount
      : collectedOrders.length;

  const resolvedBranchId = posContext?.branch?.id || branchId || branchList[0]?.id;
  const resolvedCashBoxId = posContext?.cashBox?.id || selectedCashBoxId || cashBoxes[0]?.id;
  const contextReady = Boolean(resolvedBranchId && resolvedCashBoxId);

  const refreshAfterOrder = async (shiftId?: string) => {
    const id = shiftId ?? shift?.id ?? effectiveShiftId;
    if (id) {
      await refetchPosOrderData(queryClient, id);
    }
  };

  const refreshAll = async () => {
    invalidatePosQueries(queryClient);
    await Promise.all([
      refetchPosContext(),
      refetchShift(),
      refetchPosSummary(),
      refetchShiftOrders(),
      refetchSuspended(),
    ]);
  };

  const resolveContextIds = async (): Promise<{ branchId: string; cashBoxId: string } | null> => {
    if (posContext?.branch?.id && posContext?.cashBox?.id) {
      return { branchId: posContext.branch.id, cashBoxId: posContext.cashBox.id };
    }
    if (!accessToken) return null;
    const res = await apiGet<{ branch?: { id: string }; cashBox?: { id: string } }>('/shifts/pos-context', accessToken);
    if (res.ok && res.data?.branch?.id && res.data?.cashBox?.id) {
      return { branchId: res.data.branch.id, cashBoxId: res.data.cashBox.id };
    }
    return null;
  };

  const openShift = async (openingFloat: number) => {
    const ctx = await resolveContextIds();
    const openBranchId = ctx?.branchId ?? resolvedBranchId;
    const openCashBoxId = ctx?.cashBoxId ?? resolvedCashBoxId;
    if (!accessToken || !openBranchId || !openCashBoxId) return { ok: false, error: 'لا يوجد فرع أو خزنة' };

    const res = await apiAutoOpenShift({
      branchId: openBranchId,
      cashBoxId: openCashBoxId,
      openingFloat,
    }, accessToken);

    if (res.ok && res.data) {
      const data = res.data as {
        shift?: Record<string, unknown>;
        summary?: unknown;
        created?: boolean;
        acceptedHandoff?: {
          handedByName?: string | null;
          cashAmount?: number;
          fromShiftNumber?: string;
          uncollectedCount?: number;
        };
      };
      if (data.shift) {
        patchPosCachesAfterAutoOpen(queryClient, openBranchId, openCashBoxId, {
          shift: data.shift,
          ...(data.summary != null ? { summary: data.summary } : {}),
        });
        await refreshAfterOrder(String(data.shift.id));
      } else {
        await refreshAfterOrder();
      }
      const handoff = data.acceptedHandoff ?? (data.shift as { acceptedHandoff?: typeof data.acceptedHandoff })?.acceptedHandoff;
      if (handoff?.handedByName && handoff.cashAmount != null) {
        const name = handoff.handedByName;
        const amount = Number(handoff.cashAmount).toLocaleString('en-US');
        const extra = handoff.uncollectedCount ? ` · ${handoff.uncollectedCount} طلب غير محصّل على الخزنة` : '';
        return {
          ...res,
          handoffMessage: `${name} سلّمك ${amount} ج.م نقدية (من وردية ${handoff.fromShiftNumber ?? '—'})${extra}`,
          suggestedOpeningFloat: handoff.cashAmount,
        };
      }
    }
    return res;
  };

  const closeShiftSession = async (payload: {
    countedCash: number;
    handoffMode: 'defer' | 'treasury' | 'existing' | 'successor';
    targetShiftId?: string;
    successorCashBoxId?: string;
    successorOpeningFloat?: number;
  }) => {
    if (!shift?.id) return { ok: false, error: 'لا توجد وردية' };
    if (!shiftOwned && !canManageShift) {
      return { ok: false, error: 'لا يمكنك إغلاق وردية مستخدم آخر' };
    }
    try {
      const result = await closeShift.mutateAsync({
        shiftId: shift.id,
        countedCash: payload.countedCash,
        handoffMode: payload.handoffMode,
        ...(payload.targetShiftId ? { targetShiftId: payload.targetShiftId } : {}),
        ...(payload.successorCashBoxId ? { successorCashBoxId: payload.successorCashBoxId } : {}),
        ...(payload.successorOpeningFloat != null ? { successorOpeningFloat: payload.successorOpeningFloat } : {}),
      });
      invalidatePosQueries(queryClient);
      await refreshAll();
      const handoff = (result as { handoff?: { mode?: string; transferredCount?: number; targetShiftNumber?: string; cashAmount?: number; handedByName?: string } })?.handoff;
      const successor = (result as { successorShift?: { shiftNumber?: string } })?.successorShift;
      let message = 'تم إغلاق الوردية.';
      if (handoff?.mode === 'defer') {
        message = `تم التسليم: ${Number(handoff.cashAmount ?? payload.countedCash).toLocaleString('en-US')} ج.م للكاشير التالي على نفس الخزنة.`;
      } else if (handoff?.mode === 'treasury') {
        message = 'تم إغلاق الوردية وتسليم العهدة للإدارة.';
      } else if (handoff?.transferredCount && handoff.transferredCount > 0) {
        message = `تم نقل ${handoff.transferredCount} طلب/سلة → وردية ${handoff.targetShiftNumber ?? 'المستلمة'}.`;
      }
      if (successor) {
        message += ` وردية جديدة ${successor.shiftNumber} مفتوحة.`;
      }
      return { ok: true, message };
    } catch (e) {
      const message = (e as Error).message ?? 'فشل إغلاق الوردية';
      if (message.includes('مغلقة بالفعل')) {
        invalidatePosQueries(queryClient);
        await refreshAll();
        return { ok: true, message: 'الوردية مغلقة.' };
      }
      return { ok: false, error: message };
    }
  };

  const collectOrder = async (
    order: SavedOrder,
    paymentMethodId: string,
    onError?: (message: string) => void,
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    if (!accessToken) return { ok: false, error: 'غير مسجل' };
    const shiftId = effectiveShiftId ?? shift?.id;
    if (shiftId) {
      patchShiftOrderCollected(queryClient, shiftId, order.id);
    }

    const res = await apiCollectClosedOrder(order.id, {
      paymentMethodCode: mapPaymentMethodCode(paymentMethodId),
      amount: order.total,
    }, accessToken);

    if (res.ok) {
      void refetchPosOrderData(queryClient, shiftId);
      return { ok: true };
    }

    const message = typeof res.body === 'string' ? res.body : res.error ?? 'فشل التحصيل';
    if (shiftId) {
      patchShiftOrderUncollected(queryClient, shiftId, order.id);
      void queryClient.invalidateQueries({ queryKey: ['orders-shift-uncollected', shiftId] });
      void queryClient.invalidateQueries({ queryKey: ['orders-shift-collected', shiftId] });
    }
    onError?.(message);
    return { ok: false, error: message };
  };

  const createExpense = async (dto: {
    kind: 'GENERAL' | 'ITEM';
    amount?: number;
    stockItemId?: string;
    quantity?: number;
    unitPrice?: number;
    note?: string;
    paymentMethod?: 'CASH' | 'INSTAPAY' | 'WALLET' | 'CARD';
  }) => {
    if (!accessToken || !shift?.id) return { ok: false, error: 'الوردية مغلقة' };
    const res = await apiCreateCashierExpense({
      branchId: effectiveBranchId,
      shiftId: shift.id,
      kind: dto.kind,
      paymentMethod: dto.paymentMethod ?? 'CASH',
      ...(dto.kind === 'ITEM'
        ? {
            ...(dto.stockItemId ? { stockItemId: dto.stockItemId } : {}),
            ...(dto.quantity != null ? { quantity: dto.quantity } : {}),
            ...(dto.unitPrice != null ? { unitPrice: dto.unitPrice } : {}),
          }
        : { ...(dto.amount != null ? { amount: dto.amount } : {}) }),
      ...(dto.note ? { note: dto.note } : {}),
    }, accessToken);
    if (res.ok) {
      void refreshAfterOrder();
    }
    return res;
  };

  const transferWallet = async (dto: {
    fromPaymentMethod: 'CASH' | 'INSTAPAY' | 'WALLET';
    toPaymentMethod: 'CASH' | 'INSTAPAY' | 'WALLET';
    amount: number;
    note?: string;
  }) => {
    if (!accessToken || !shift?.id) return { ok: false, error: 'الوردية مغلقة' };
    const res = await apiShiftWalletTransfer({
      shiftId: shift.id,
      fromPaymentMethod: dto.fromPaymentMethod,
      toPaymentMethod: dto.toPaymentMethod,
      amount: dto.amount,
      ...(dto.note ? { note: dto.note } : {}),
    }, accessToken);
    if (res.ok) {
      void refreshAfterOrder();
    }
    return res;
  };

  return {
    accessToken,
    user,
    permissions,
    printingEnabled,
    posContext,
    posContextPending,
    posContextFetching,
    shiftStatusPending,
    cachedShiftOpen,
    posContextError,
    posContextErrorDetail,
    branchList,
    cashBoxes,
    effectiveBranchId,
    shift,
    shiftOpen,
    effectiveShiftId,
    cashBoxId,
    posSummary,
    displayPosSummary,
    closeShiftSummary,
    posSummaryPending,
    posSummaryError,
    shiftOrdersPending,
    shiftOrdersError: shiftOrdersShowError,
    suspendedPending,
    suspendedOrders,
    shiftClosedOrders,
    uncollectedOrders,
    collectedOrders,
    uncollectedAmount,
    displayUncollectedCount,
    displayUncollectedAmount,
    displayCollectedCount,
    operatorName,
    shiftOperatorName,
    resolvedBranchId,
    resolvedCashBoxId,
    contextReady,
    refreshAll,
    refreshAfterOrder,
    openShift,
    closeShiftSession,
    collectOrder,
    createExpense,
    transferWallet,
    refetchShiftOrders,
    refetchUncollected,
    refetchCollected,
    fetchNextCollectedPage: fetchNextPage,
    hasMoreCollected: hasNextPage,
    collectedLoadingMore: isFetchingNextPage,
    fetchNextUncollectedPage,
    hasMoreUncollected,
    uncollectedLoadingMore,
    refetchPosContext,
    refetchSuspended,
  };
}

export function usePosExpenseStock(branchId?: string, enabled = false) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['pos-expense-stock-items', branchId],
    queryFn: async () => {
      const res = await apiListExpenseStockItems(branchId!, accessToken ?? undefined);
      if (!res.ok) throw new Error(res.body ?? res.error);
      return res.data ?? [];
    },
    enabled: !!accessToken && !!branchId && enabled,
    staleTime: 60000,
    retry: 1,
  });
}
