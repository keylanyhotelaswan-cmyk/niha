import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Alert, Box, Button, Chip, Grid2, Pagination, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { isShiftOrderUncollected } from '../../../lib/pos-store.js';
import { OrderSummaryCard } from './order-summary-card.js';
export const ORDERS_PAGE_SIZE = 10;
function buildCardProps(order, props) {
    const common = {
        order,
        variant: 'closed',
        ...(props.showReprint && props.onReprint ? { showReprint: true, onReprint: (copies) => props.onReprint(order, copies) } : {}),
        ...(props.onViewAudit ? { onViewAudit: () => props.onViewAudit(order) } : {}),
        ...(props.onViewSummary ? { onViewSummary: () => props.onViewSummary(order) } : {}),
        ...(props.onEdit ? { onEdit: () => props.onEdit(order) } : {}),
        ...(props.onUncollect && props.onCancel && props.onRequestCancel && props.onWithdrawCancel
            ? { onUncollect: props.onUncollect, onCancel: props.onCancel, onRequestCancel: props.onRequestCancel, onWithdrawCancel: props.onWithdrawCancel }
            : {}),
    };
    if (isShiftOrderUncollected(order)) {
        return {
            ...common,
            actionLabel: 'تحصيل الآن',
            actionBusy: props.pendingOrderId === order.id,
            onAction: () => props.onCollect(order),
        };
    }
    return common;
}
export function ShiftOrdersSection(props) {
    const [page, setPage] = useState(1);
    const visible = props.tab === 'uncollected' ? props.uncollected : props.collected;
    const totalCount = props.orders.length;
    useEffect(() => {
        setPage(1);
    }, [props.tab]);
    const loadedPages = Math.max(1, Math.ceil(visible.length / ORDERS_PAGE_SIZE));
    const showMorePagesHint = props.tab === 'collected' && props.hasMoreCollected;
    const totalPages = showMorePagesHint ? loadedPages + 1 : loadedPages;
    useEffect(() => {
        if (page > loadedPages && page < totalPages && props.tab === 'collected') {
            if (props.hasMoreCollected && !props.collectedLoadingMore) {
                props.onLoadMoreCollected?.();
            }
        }
    }, [page, loadedPages, totalPages, props.tab, props.hasMoreCollected, props.collectedLoadingMore, props.onLoadMoreCollected]);
    useEffect(() => {
        if (page > loadedPages && !props.hasMoreCollected) {
            setPage(loadedPages);
        }
    }, [page, loadedPages, props.hasMoreCollected]);
    const pageItems = useMemo(() => {
        const start = (page - 1) * ORDERS_PAGE_SIZE;
        return visible.slice(start, start + ORDERS_PAGE_SIZE);
    }, [visible, page]);
    const rangeLabel = visible.length
        ? `${(page - 1) * ORDERS_PAGE_SIZE + 1}–${Math.min(page * ORDERS_PAGE_SIZE, visible.length)} من ${visible.length}${showMorePagesHint ? '+' : ''}`
        : '';
    return (_jsxs(Box, { children: [_jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", sx: { mb: 1 }, children: [_jsx(Typography, { variant: "h6", fontWeight: 800, children: "\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0648\u0631\u062F\u064A\u0629 (\u0645\u063A\u0644\u0642\u0629)" }), _jsx(Chip, { label: `${totalCount} طلب`, size: "small", variant: "outlined" })] }), _jsxs(Tabs, { value: props.tab, onChange: (_, v) => props.onTabChange(v), sx: { mb: 1.5, minHeight: 40, '& .MuiTab-root': { minHeight: 40, fontWeight: 700 } }, children: [_jsx(Tab, { value: "uncollected", label: `غير محصل (${props.uncollected.length})` }), _jsx(Tab, { value: "collected", label: `محصل (${props.collected.length}${props.hasMoreCollected ? '+' : ''})` })] }), !props.shiftOpen && totalCount === 0 ? (_jsx(Alert, { severity: "info", sx: { borderRadius: 3 }, children: "\u0627\u0641\u062A\u062D \u0648\u0631\u062F\u064A\u0629 \u0644\u0639\u0631\u0636 \u0637\u0644\u0628\u0627\u062A\u0647\u0627 \u0647\u0646\u0627." })) : props.loading && totalCount === 0 ? (_jsx(Alert, { severity: "info", sx: { borderRadius: 3 }, children: "\u062C\u0627\u0631\u064A \u062A\u062D\u0645\u064A\u0644 \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0648\u0631\u062F\u064A\u0629..." })) : props.error && totalCount === 0 ? (_jsx(Alert, { severity: "warning", sx: { borderRadius: 3 }, action: _jsx(Button, { size: "small", onClick: props.onRetry, children: "\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629" }), children: "\u062A\u0639\u0630\u0651\u0631 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u2014 \u062A\u0623\u0643\u062F \u0623\u0646 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u064A\u0639\u0645\u0644 \u062B\u0645 \u0623\u0639\u062F \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629." })) : visible.length === 0 ? (_jsx(Alert, { severity: "info", sx: { borderRadius: 3 }, children: props.tab === 'uncollected' ? 'لا توجد طلبات غير محصلة في هذه الوردية.' : 'لا توجد طلبات محصلة في هذه الوردية.' })) : (_jsxs(_Fragment, { children: [_jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", sx: { mb: 1 }, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", fontWeight: 700, children: rangeLabel }), _jsxs(Typography, { variant: "caption", color: "text.secondary", children: [ORDERS_PAGE_SIZE, " \u0643\u0631\u0648\u062A \u0641\u064A \u0627\u0644\u0635\u0641\u062D\u0629"] })] }), _jsx(Grid2, { container: true, spacing: 1.5, children: pageItems.map((order) => (_jsx(Grid2, { size: { xs: 12, sm: 6, lg: 4 }, children: _jsx(OrderSummaryCard, { ...buildCardProps(order, props) }) }, order.id))) }), props.collectedLoadingMore && page > loadedPages ? (_jsx(Alert, { severity: "info", sx: { mt: 1.5, borderRadius: 2 }, children: "\u062C\u0627\u0631\u064A \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0635\u0641\u062D\u0629\u2026" })) : null, totalPages > 1 ? (_jsx(Stack, { alignItems: "center", sx: { mt: 2 }, children: _jsx(Pagination, { count: totalPages, page: page, onChange: (_, value) => setPage(value), color: "primary", shape: "rounded", siblingCount: 1, boundaryCount: 1, disabled: Boolean(props.collectedLoadingMore && page > loadedPages) }) })) : null] }))] }));
}
