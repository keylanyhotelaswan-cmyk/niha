import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { apiAutoOpenShift, apiCollectClosedOrder, apiCreateCashierExpense, apiListExpenseStockItems } from '../../lib/api.js';
import { apiGet } from '../../lib/api-client.js';
import { useAuth } from '../../lib/auth-context.js';
import { invalidatePosQueries, patchPosCachesAfterAutoOpen, refetchPosOrderData, useBranches, useCashBoxes, useCurrentShift, usePosContext, usePosShiftSummary, useShiftClosedOrders, useShiftMutations, useSuspendedOrders, } from '../../lib/hooks.js';
import { canManageTreasury, canUsePosPrinting } from '../../lib/permissions.js';
import { RECEIPT_SETTINGS_EVENT } from '../../lib/pos-receipt-settings.js';
import { isShiftOrderUncollected, mapApiOrderToSavedOrder, mapPaymentMethodCode, readPosBranchId, writePosBranchId, } from '../../lib/pos-store.js';
export function usePosWorkspace() {
    const queryClient = useQueryClient();
    const { accessToken, user, permissions } = useAuth();
    const { data: posContext, refetch: refetchPosContext, isPending: posContextPending, isError: posContextError, error: posContextErrorDetail } = usePosContext();
    const { data: branchList = [] } = useBranches();
    const [branchId, setBranchId] = useState(() => readPosBranchId());
    const [selectedCashBoxId, setSelectedCashBoxId] = useState('');
    const effectiveBranchId = posContext?.branch?.id || branchId || branchList[0]?.id || readPosBranchId();
    const { data: cashBoxes = [] } = useCashBoxes(effectiveBranchId);
    const { data: shiftData, refetch: refetchShift } = useCurrentShift(effectiveBranchId, selectedCashBoxId);
    const shift = shiftData != null
        ? (shiftData.shiftOpen ? shiftData.shift : null)
        : (posContext?.shiftOpen ? posContext.shift ?? null : null);
    const canManageShift = canManageTreasury(permissions);
    const shiftOwned = Boolean(shift && user?.id && shift.openedById === user.id);
    const shiftOpen = Boolean(shift && (shiftOwned || canManageShift));
    const effectiveShiftId = shiftOpen && shift?.id ? shift.id : '';
    const cashBoxId = shift?.cashBoxId ?? posContext?.cashBox?.id ?? selectedCashBoxId;
    const { data: posSummaryFetched, refetch: refetchPosSummary, isPending: posSummaryPending, isError: posSummaryError } = usePosShiftSummary(effectiveShiftId);
    const posSummary = posSummaryFetched ?? posContext?.posSummary ?? null;
    const treasurySummary = shiftData?.summary ?? posContext?.summary ?? null;
    const closeShiftSummary = posSummary ?? (treasurySummary
        ? {
            expectedCash: treasurySummary.expectedCash,
            openingFloat: treasurySummary.openingFloat,
            totalSales: treasurySummary.totalSales,
            pending: treasurySummary.pending ?? treasurySummary.pendingCashInCustody,
            byPaymentMethod: treasurySummary.byPaymentMethod,
        }
        : null);
    const { data: shiftOrdersRaw = [], isPending: shiftOrdersPending, isError: shiftOrdersError, refetch: refetchShiftOrders, } = useShiftClosedOrders(effectiveShiftId);
    const { data: apiSuspended = [], isPending: suspendedPending, refetch: refetchSuspended } = useSuspendedOrders(effectiveBranchId);
    const [printingEnabled, setPrintingEnabled] = useState(() => canUsePosPrinting(permissions));
    useEffect(() => {
        setPrintingEnabled(canUsePosPrinting(permissions));
        const onSettingsChange = () => setPrintingEnabled(canUsePosPrinting(permissions));
        window.addEventListener(RECEIPT_SETTINGS_EVENT, onSettingsChange);
        return () => window.removeEventListener(RECEIPT_SETTINGS_EVENT, onSettingsChange);
    }, [permissions]);
    const { closeShift } = useShiftMutations();
    const operatorName = user?.fullName?.trim() || user?.username || 'مستخدم';
    const shiftOperatorName = shift?.openedBy?.fullName?.trim() || operatorName;
    useEffect(() => {
        if (effectiveBranchId)
            writePosBranchId(effectiveBranchId);
    }, [effectiveBranchId]);
    useEffect(() => {
        if (posContext?.branch?.id) {
            setBranchId(posContext.branch.id);
            writePosBranchId(posContext.branch.id);
        }
        if (posContext?.cashBox?.id)
            setSelectedCashBoxId(posContext.cashBox.id);
    }, [posContext]);
    useEffect(() => {
        const boxId = shift?.cashBoxId ?? posContext?.cashBox?.id;
        if (boxId)
            setSelectedCashBoxId(boxId);
    }, [shift?.cashBoxId, posContext?.cashBox?.id]);
    useEffect(() => {
        if (cashBoxes.length && !selectedCashBoxId)
            setSelectedCashBoxId(cashBoxes[0].id);
    }, [cashBoxes, selectedCashBoxId]);
    const suspendedOrders = useMemo(() => apiSuspended.map((o) => mapApiOrderToSavedOrder(o, 'suspended')), [apiSuspended]);
    const shiftClosedOrdersSource = useMemo(() => {
        if (shiftOrdersRaw.length > 0)
            return shiftOrdersRaw;
        const fromSummary = posSummary?.shiftClosedOrders ?? posContext?.posSummary?.shiftClosedOrders;
        return fromSummary ?? shiftOrdersRaw;
    }, [shiftOrdersRaw, posSummary, posContext]);
    const shiftClosedOrders = useMemo(() => shiftClosedOrdersSource.map((o) => mapApiOrderToSavedOrder(o, 'closed')), [shiftClosedOrdersSource]);
    const shiftOrdersShowError = shiftOrdersError && shiftClosedOrders.length === 0;
    const uncollectedOrders = useMemo(() => shiftClosedOrders.filter((o) => isShiftOrderUncollected(o)), [shiftClosedOrders]);
    const collectedOrders = useMemo(() => shiftClosedOrders.filter((o) => !isShiftOrderUncollected(o)), [shiftClosedOrders]);
    const uncollectedAmount = useMemo(() => uncollectedOrders.reduce((s, o) => s + o.total, 0), [uncollectedOrders]);
    const resolvedBranchId = posContext?.branch?.id || branchId || branchList[0]?.id;
    const resolvedCashBoxId = posContext?.cashBox?.id || selectedCashBoxId || cashBoxes[0]?.id;
    const contextReady = Boolean(resolvedBranchId && resolvedCashBoxId);
    const refreshAfterOrder = async (shiftId) => {
        await refetchPosOrderData(queryClient, shiftId ?? effectiveShiftId);
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
        }
        return res;
    };
    const closeShiftSession = async (countedCash) => {
        if (!shift?.id)
            return { ok: false, error: 'لا توجد وردية' };
        if (!shiftOwned && !canManageShift) {
            return { ok: false, error: 'لا يمكنك إغلاق وردية مستخدم آخر' };
        }
        try {
            await closeShift.mutateAsync({ shiftId: shift.id, countedCash });
            invalidatePosQueries(queryClient);
            await refreshAll();
            return { ok: true };
        }
        catch (e) {
            const message = e.message ?? 'فشل إغلاق الوردية';
            if (message.includes('مغلقة بالفعل')) {
                invalidatePosQueries(queryClient);
                await refreshAll();
                return { ok: true };
            }
            return { ok: false, error: message };
        }
    };
    const collectOrder = async (order, paymentMethodId) => {
        if (!accessToken)
            return { ok: false, error: 'غير مسجل' };
        const res = await apiCollectClosedOrder(order.id, {
            paymentMethodCode: mapPaymentMethodCode(paymentMethodId),
            amount: order.total,
        }, accessToken);
        if (res.ok) {
            await refreshAfterOrder();
        }
        return res;
    };
    const createExpense = async (dto) => {
        if (!accessToken || !shift?.id)
            return { ok: false, error: 'الوردية مغلقة' };
        const res = await apiCreateCashierExpense({
            branchId: effectiveBranchId,
            shiftId: shift.id,
            kind: dto.kind,
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
            await refreshAfterOrder();
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
        refetchShiftOrders,
        refetchPosContext,
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
