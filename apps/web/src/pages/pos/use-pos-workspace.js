import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { apiAutoOpenShift, apiCollectClosedOrder, apiCreateCashierExpense, apiListExpenseStockItems, apiShiftWalletTransfer } from '../../lib/api.js';
import { apiGet } from '../../lib/api-client.js';
import { useAuth } from '../../lib/auth-context.js';
import { hydratePosSessionFromCache, invalidatePosQueries, patchPosCachesAfterAutoOpen, patchShiftOrderCollected, patchShiftOrderUncollected, POS_QUERY_KEYS, refetchPosOrderData, useBranches, useCashBoxes, useCurrentShift, usePosSession, usePosShiftSummary, useShiftCollectedOrders, useShiftUncollectedOrders, useShiftMutations, useSuspendedOrders, } from '../../lib/hooks.js';
import { readPosContextCache, readPosSessionCache } from '../../lib/pos-cache.js';
import { markPosPerf } from '../../lib/pos-perf.js';
import { canManageTreasury, canUsePosPrinting } from '../../lib/permissions.js';
import { getReceiptSettings, mergeReceiptSettings, RECEIPT_SETTINGS_EVENT, saveReceiptSettings } from '../../lib/pos-receipt-settings.js';
import { isShiftOrderCollected, isShiftOrderUncollected, mapApiOrderToSavedOrder, mapPaymentMethodCode, readPosBranchId, writePosBranchId, } from '../../lib/pos-store.js';
function readCount(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
}
function sessionShiftIdOf(session) {
    const id = session?.shift?.id;
    return id != null ? String(id) : '';
}
function sessionHasOrderSeed(session, shiftId, field) {
    if (!session || !shiftId)
        return false;
    if (sessionShiftIdOf(session) !== shiftId)
        return false;
    return session[field] != null;
}
function sessionHasSuspendedSeed(session, branchId) {
    if (!session || !branchId)
        return false;
    if (session.branch?.id !== branchId)
        return false;
    return session.suspendedOrders != null;
}
export function usePosWorkspace() {
    const queryClient = useQueryClient();
    const { accessToken, user, permissions } = useAuth();
    if (!queryClient.getQueryData(POS_QUERY_KEYS.session)) {
        hydratePosSessionFromCache(queryClient);
    }
    const { data: posSession, refetch: refetchPosSession, isPending: posSessionPending, isError: posContextError, error: posContextErrorDetail, isFetching: posContextFetching, } = usePosSession();
    const bootstrapSession = posSession ?? readPosSessionCache();
    const posContext = bootstrapSession;
    const sessionReady = Boolean(bootstrapSession?.branch);
    const cachedContext = readPosContextCache();
    const cachedShiftOpen = Boolean(cachedContext?.shiftOpen ?? bootstrapSession?.shiftOpen);
    const shiftStatusPending = !sessionReady && posSessionPending;
    const sessionBackgroundSyncing = Boolean(sessionReady && posContextFetching);
    const { data: branchList = [] } = useBranches(bootstrapSession?.branch ?? null);
    const [branchId, setBranchId] = useState(() => readPosBranchId());
    const [selectedCashBoxId, setSelectedCashBoxId] = useState('');
    const effectiveBranchId = bootstrapSession?.branch?.id || branchId || branchList[0]?.id || readPosBranchId();
    const { data: cashBoxesFetched = [] } = useCashBoxes(effectiveBranchId, !sessionReady || !bootstrapSession?.cashBoxes);
    const cashBoxes = bootstrapSession?.cashBoxes ?? cashBoxesFetched;
    const contextCashBoxId = bootstrapSession?.cashBox?.id ?? '';
    const queryCashBoxId = selectedCashBoxId || contextCashBoxId || cashBoxes[0]?.id || '';
    const hasContextShift = Boolean(bootstrapSession?.shiftOpen && bootstrapSession?.shift);
    const skipShiftCurrent = Boolean(bootstrapSession && (!bootstrapSession.shiftOpen || (hasContextShift && bootstrapSession.summary)));
    const { data: shiftData, refetch: refetchShift } = useCurrentShift(effectiveBranchId, queryCashBoxId, !posSessionPending && !!effectiveBranchId && !!queryCashBoxId && !skipShiftCurrent);
    const shift = useMemo(() => {
        if (shiftData?.shiftOpen && shiftData.shift)
            return shiftData.shift;
        if (bootstrapSession?.shiftOpen && bootstrapSession.shift)
            return bootstrapSession.shift;
        return null;
    }, [shiftData, bootstrapSession]);
    const canManageShift = canManageTreasury(permissions);
    const shiftOwned = Boolean(shift && user?.id && shift.openedById === user.id);
    const shiftOpen = Boolean(shift && (shiftOwned || canManageShift));
    const sessionShiftId = shift?.id ? String(shift.id) : sessionShiftIdOf(bootstrapSession);
    const hasOpenShiftContext = Boolean(sessionShiftId && (shiftOpen || bootstrapSession?.shiftOpen || cachedShiftOpen));
    /** للتحصيل والإغلاق — يتطلب وردية مؤكدة */
    const effectiveShiftId = shiftOpen && sessionShiftId ? sessionShiftId : '';
    /** لتحميل قوائم الطلبات — يكفي وجود وردية في الجلسة/الكاش */
    const ordersShiftId = hasOpenShiftContext ? sessionShiftId : '';
    const cashBoxId = shift?.cashBoxId ?? bootstrapSession?.cashBox?.id ?? selectedCashBoxId;
    const { data: posSummaryFetched, refetch: refetchPosSummary, isPending: posSummaryPending, isError: posSummaryError } = usePosShiftSummary(effectiveShiftId || undefined, bootstrapSession?.posSummary);
    const posSummary = posSummaryFetched ?? bootstrapSession?.posSummary ?? null;
    const treasurySummary = shiftData?.summary ?? bootstrapSession?.summary ?? null;
    const closeShiftSummary = posSummary ?? (treasurySummary
        ? {
            expectedCash: treasurySummary.expectedCash,
            openingFloat: treasurySummary.openingFloat,
            totalSales: treasurySummary.totalSales,
            salesTotal: treasurySummary.totalSales,
            pending: treasurySummary.pending ?? treasurySummary.pendingCashInCustody,
            pendingCashInCustody: treasurySummary.pendingCashInCustody,
            expensesTotal: treasurySummary.expensesTotal,
            ordersCount: treasurySummary.ordersCount,
            uncollectedCount: treasurySummary.uncollectedCount,
            uncollectedTotal: treasurySummary.uncollectedTotal,
            byPaymentMethod: treasurySummary.byPaymentMethod,
            salesByMethod: treasurySummary.salesByMethod,
            expensesByPaymentMethod: treasurySummary.expensesByPaymentMethod,
            walletTransfers: treasurySummary.walletTransfers,
            netSalesByMethod: treasurySummary.netSalesByMethod,
            outgoing: treasurySummary.outgoing,
        }
        : null);
    const displayPosSummary = posSummary ?? closeShiftSummary;
    const { data: uncollectedPages, isPending: uncollectedPending, isError: uncollectedError, refetch: refetchUncollected, fetchNextPage: fetchNextUncollectedPage, hasNextPage: hasMoreUncollected, isFetchingNextPage: uncollectedLoadingMore, } = useShiftUncollectedOrders(ordersShiftId, !sessionReady || !sessionHasOrderSeed(bootstrapSession, ordersShiftId, 'ordersUncollected'));
    const { data: collectedPages, isPending: collectedPending, isError: collectedError, refetch: refetchCollected, fetchNextPage, hasNextPage, isFetchingNextPage, } = useShiftCollectedOrders(ordersShiftId, !sessionReady || !sessionHasOrderSeed(bootstrapSession, ordersShiftId, 'ordersCollected'));
    const hasShiftOrdersSeed = sessionHasOrderSeed(bootstrapSession, ordersShiftId, 'ordersUncollected')
        || sessionHasOrderSeed(bootstrapSession, ordersShiftId, 'ordersCollected');
    const shiftOrdersPending = !hasShiftOrdersSeed && uncollectedPending && collectedPending;
    const shiftOrdersError = uncollectedError || collectedError;
    const refetchShiftOrders = async () => {
        await Promise.all([refetchUncollected(), refetchCollected()]);
    };
    const { data: apiSuspendedFetched = [], isPending: suspendedPending, refetch: refetchSuspended } = useSuspendedOrders(effectiveBranchId, !sessionReady || !sessionHasSuspendedSeed(bootstrapSession, effectiveBranchId));
    const apiSuspended = bootstrapSession?.suspendedOrders ?? apiSuspendedFetched;
    const suspendedShowPending = suspendedPending && apiSuspended.length === 0;
    const [printingEnabled, setPrintingEnabled] = useState(() => canUsePosPrinting(permissions));
    useEffect(() => {
        if (sessionReady)
            markPosPerf('session-bootstrap');
    }, [sessionReady]);
    useEffect(() => {
        setPrintingEnabled(canUsePosPrinting(permissions));
        const onSettingsChange = () => setPrintingEnabled(canUsePosPrinting(permissions));
        window.addEventListener(RECEIPT_SETTINGS_EVENT, onSettingsChange);
        return () => window.removeEventListener(RECEIPT_SETTINGS_EVENT, onSettingsChange);
    }, [permissions]);
    useEffect(() => {
        if (!effectiveBranchId || !accessToken)
            return;
        const remote = bootstrapSession?.receiptSettings;
        if (remote) {
            const merged = mergeReceiptSettings(getReceiptSettings(), remote.settings ?? null);
            saveReceiptSettings(merged);
            return;
        }
    }, [effectiveBranchId, accessToken, bootstrapSession?.receiptSettings]);
    const { closeShift } = useShiftMutations();
    const operatorName = user?.fullName?.trim() || user?.username || 'مستخدم';
    const shiftOperatorName = shift?.openedBy?.fullName?.trim() || operatorName;
    useEffect(() => {
        if (effectiveBranchId)
            writePosBranchId(effectiveBranchId);
    }, [effectiveBranchId]);
    useEffect(() => {
        if (bootstrapSession?.branch?.id) {
            setBranchId(bootstrapSession.branch.id);
            writePosBranchId(bootstrapSession.branch.id);
        }
        if (bootstrapSession?.cashBox?.id)
            setSelectedCashBoxId(bootstrapSession.cashBox.id);
    }, [bootstrapSession]);
    useEffect(() => {
        const boxId = shift?.cashBoxId ?? bootstrapSession?.cashBox?.id;
        if (boxId)
            setSelectedCashBoxId(boxId);
    }, [shift?.cashBoxId, bootstrapSession?.cashBox?.id]);
    useEffect(() => {
        if (cashBoxes.length && !selectedCashBoxId)
            setSelectedCashBoxId(cashBoxes[0].id);
    }, [cashBoxes, selectedCashBoxId]);
    const suspendedOrders = useMemo(() => apiSuspended.map((o) => mapApiOrderToSavedOrder(o, 'suspended')), [apiSuspended]);
    const shiftClosedOrdersSource = useMemo(() => {
        const uncollected = uncollectedPages?.pages.flatMap((p) => p.orders) ?? [];
        const collected = collectedPages?.pages.flatMap((p) => p.orders) ?? [];
        if (uncollected.length > 0 || collected.length > 0) {
            return [...uncollected, ...collected];
        }
        const bootstrapMatchesShift = sessionShiftIdOf(bootstrapSession) === ordersShiftId;
        const bootstrapUncollected = bootstrapMatchesShift
            ? bootstrapSession?.ordersUncollected?.orders ?? []
            : [];
        const bootstrapCollected = bootstrapMatchesShift
            ? bootstrapSession?.ordersCollected?.orders ?? []
            : [];
        if (bootstrapUncollected.length > 0 || bootstrapCollected.length > 0) {
            return [...bootstrapUncollected, ...bootstrapCollected];
        }
        const fromSummary = posSummary?.shiftClosedOrders ?? bootstrapSession?.posSummary?.shiftClosedOrders;
        return fromSummary ?? [];
    }, [uncollectedPages, collectedPages, posSummary, bootstrapSession, ordersShiftId]);
    const shiftClosedOrders = useMemo(() => {
        const seen = new Set();
        return shiftClosedOrdersSource
            .map((o) => mapApiOrderToSavedOrder(o, 'closed'))
            .filter((o) => {
            if (seen.has(o.id))
                return false;
            seen.add(o.id);
            return true;
        });
    }, [shiftClosedOrdersSource]);
    const shiftOrdersShowError = shiftOrdersError && shiftClosedOrders.length === 0;
    const uncollectedOrders = useMemo(() => shiftClosedOrders.filter((o) => isShiftOrderUncollected(o)), [shiftClosedOrders]);
    const collectedOrders = useMemo(() => shiftClosedOrders.filter((o) => isShiftOrderCollected(o)), [shiftClosedOrders]);
    const uncollectedAmount = useMemo(() => uncollectedOrders.reduce((s, o) => s + o.total, 0), [uncollectedOrders]);
    const summaryOrdersCount = readCount(displayPosSummary?.ordersCount);
    const summaryUncollectedCount = readCount(displayPosSummary?.uncollectedCount);
    const displayUncollectedCount = summaryUncollectedCount ?? uncollectedOrders.length;
    const displayUncollectedAmount = readCount(displayPosSummary?.uncollectedTotal)
        ?? uncollectedAmount;
    const displayCollectedCount = summaryOrdersCount != null && summaryUncollectedCount != null
        ? Math.max(0, summaryOrdersCount - summaryUncollectedCount)
        : collectedOrders.length;
    const displaySuspendedCount = readCount(displayPosSummary?.suspendedCount)
        ?? suspendedOrders.length;
    const resolvedBranchId = posContext?.branch?.id || branchId || branchList[0]?.id;
    const resolvedCashBoxId = posContext?.cashBox?.id || selectedCashBoxId || cashBoxes[0]?.id;
    const contextReady = Boolean(resolvedBranchId && resolvedCashBoxId);
    const refreshAfterOrder = async (shiftId) => {
        const id = shiftId ?? shift?.id ?? effectiveShiftId;
        if (id) {
            await refetchPosOrderData(queryClient, id);
        }
    };
    const refreshAll = () => {
        void invalidatePosQueries(queryClient);
    };
    const resolveContextIds = async () => {
        if (posContext?.branch?.id && posContext?.cashBox?.id) {
            return { branchId: posContext.branch.id, cashBoxId: posContext.cashBox.id };
        }
        if (!accessToken)
            return null;
        const res = await apiGet('/shifts/pos-context', accessToken);
        if (res.ok && res.data?.branch?.id && res.data?.cashBox?.id) {
            return { branchId: res.data.branch.id, cashBoxId: res.data.cashBox.id };
        }
        return null;
    };
    const openShift = async (openingFloat) => {
        const ctx = await resolveContextIds();
        const openBranchId = ctx?.branchId ?? resolvedBranchId;
        const openCashBoxId = ctx?.cashBoxId ?? resolvedCashBoxId;
        if (!accessToken || !openBranchId || !openCashBoxId)
            return { ok: false, error: 'لا يوجد فرع أو خزنة' };
        const res = await apiAutoOpenShift({
            branchId: openBranchId,
            cashBoxId: openCashBoxId,
            openingFloat,
        }, accessToken);
        if (res.ok && res.data) {
            const data = res.data;
            if (data.shift) {
                patchPosCachesAfterAutoOpen(queryClient, openBranchId, openCashBoxId, {
                    shift: data.shift,
                    ...(data.summary != null ? { summary: data.summary } : {}),
                });
                await refreshAfterOrder(String(data.shift.id));
            }
            else {
                await refreshAfterOrder();
            }
            const handoff = data.acceptedHandoff ?? data.shift?.acceptedHandoff;
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
    const closeShiftSession = async (payload) => {
        if (!shift?.id)
            return { ok: false, error: 'لا توجد وردية' };
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
            await refreshAll();
            const handoff = result?.handoff;
            const successor = result?.successorShift;
            let message = 'تم إغلاق الوردية.';
            if (handoff?.mode === 'defer') {
                message = `تم التسليم: ${Number(handoff.cashAmount ?? payload.countedCash).toLocaleString('en-US')} ج.م للكاشير التالي على نفس الخزنة.`;
            }
            else if (handoff?.mode === 'treasury') {
                message = 'تم إغلاق الوردية وتسليم العهدة للإدارة.';
            }
            else if (handoff?.transferredCount && handoff.transferredCount > 0) {
                message = `تم نقل ${handoff.transferredCount} طلب/سلة → وردية ${handoff.targetShiftNumber ?? 'المستلمة'}.`;
            }
            if (successor) {
                message += ` وردية جديدة ${successor.shiftNumber} مفتوحة.`;
            }
            return { ok: true, message };
        }
        catch (e) {
            const message = e.message ?? 'فشل إغلاق الوردية';
            if (message.includes('مغلقة بالفعل')) {
                await refreshAll();
                return { ok: true, message: 'الوردية مغلقة.' };
            }
            return { ok: false, error: message };
        }
    };
    const collectOrder = async (order, paymentMethodId, onError) => {
        if (!accessToken)
            return { ok: false, error: 'غير مسجل' };
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
    const createExpense = async (dto) => {
        if (!accessToken || !shift?.id)
            return { ok: false, error: 'الوردية مغلقة' };
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
    const transferWallet = async (dto) => {
        if (!accessToken || !shift?.id)
            return { ok: false, error: 'الوردية مغلقة' };
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
        catalogFromSession: Boolean(bootstrapSession?.catalog),
        posContextPending: shiftStatusPending,
        posContextFetching: sessionBackgroundSyncing,
        sessionBackgroundSyncing,
        sessionReady,
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
        suspendedPending: suspendedShowPending,
        suspendedOrders,
        shiftClosedOrders,
        uncollectedOrders,
        collectedOrders,
        uncollectedAmount,
        displayUncollectedCount,
        displayUncollectedAmount,
        displayCollectedCount,
        displaySuspendedCount,
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
        refetchPosContext: refetchPosSession,
        refetchSuspended,
    };
}
export function usePosExpenseStock(branchId, enabled = false) {
    const { accessToken } = useAuth();
    return useQuery({
        queryKey: ['pos-expense-stock-items', branchId],
        queryFn: async () => {
            const res = await apiListExpenseStockItems(branchId, accessToken ?? undefined);
            if (!res.ok)
                throw new Error(res.body ?? res.error);
            return res.data ?? [];
        },
        enabled: !!accessToken && !!branchId && enabled,
        staleTime: 60000,
        retry: 1,
    });
}
