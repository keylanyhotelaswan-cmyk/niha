import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Box, Button, Card, CardActionArea, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Grid2, IconButton, MenuItem, Paper, Stack, TextField, Typography, } from '@mui/material';
import { getCollectionStatusLabel, validateTakeawayOrderFields, cartLineKey } from '../../../lib/pos-store.js';
import { collectionTone, formatCurrency } from '../utils.js';
import { cardSx, ui } from '../../../lib/ui-tokens.js';
import { OrderTypeToggle } from './order-type-toggle.js';
import { OrderConfirmDialog } from './order-confirm-dialog.js';
import { CustomerPhoneField } from '../../../components/customer-phone-field.js';
import { CaptainNameField } from '../../../components/captain-name-field.js';
import { useState, useEffect, useMemo, useRef, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { planRemaining, planSoldAdjustment, planStatusLabel, planVisualStatus, summarizeCartPlanAlerts, } from '../production-plan-utils.js';
const PRODUCT_COLS = 4;
const PRODUCT_ROW_HEIGHT = 112;
const ProductCard = memo(function ProductCard({ product, qty, isEdit, editBaselineQty, onAddProduct, }) {
    const plan = product.dailyPlan;
    const soldAdj = plan ? planSoldAdjustment(isEdit, editBaselineQty.get(product.id) ?? 0) : 0;
    const remaining = plan ? planRemaining(plan, qty, soldAdj) : null;
    const status = plan ? planVisualStatus(plan, qty, soldAdj) : null;
    const chip = status ? (() => {
        if (status === 'exceeded')
            return { color: 'error', variant: 'filled' };
        if (status === 'exhausted')
            return { color: 'warning', variant: 'filled' };
        if (status === 'low')
            return { color: 'warning', variant: 'outlined' };
        return { color: 'success', variant: 'outlined' };
    })() : null;
    return (_jsx(Grid2, { size: { xs: 6, sm: 4, lg: 3 }, children: _jsx(Card, { elevation: 0, sx: {
                borderRadius: 3,
                border: '2px solid',
                borderColor: status === 'exceeded'
                    ? 'error.main'
                    : status === 'exhausted' || status === 'low'
                        ? 'warning.main'
                        : qty > 0
                            ? 'primary.main'
                            : ui.border,
                opacity: product.isAvailable ? 1 : 0.5,
                bgcolor: status === 'exceeded'
                    ? 'rgba(239,68,68,0.04)'
                    : status === 'low'
                        ? 'rgba(245,158,11,0.06)'
                        : '#fff',
            }, children: _jsx(CardActionArea, { disabled: !product.isAvailable, onClick: () => onAddProduct(product), children: _jsx(CardContent, { sx: { p: 1.5 }, children: _jsxs(Stack, { spacing: 0.75, children: [_jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 0.5, children: [_jsx(Typography, { fontWeight: 700, fontSize: "0.9rem", lineHeight: 1.3, children: product.name }), _jsxs(Stack, { direction: "row", spacing: 0.5, alignItems: "center", flexWrap: "wrap", useFlexGap: true, children: [plan && chip ? (_jsxs(_Fragment, { children: [_jsx(Chip, { size: "small", label: `${plan.sold + soldAdj + qty}/${plan.planned}`, ...chip, sx: { height: 22, fontSize: '0.68rem', fontWeight: 800 } }), remaining != null && remaining >= 0 ? (_jsx(Chip, { size: "small", label: `متب ${remaining}`, color: status === 'low' ? 'warning' : 'default', variant: "outlined", sx: { height: 22, fontSize: '0.65rem', fontWeight: 700 } })) : remaining != null && remaining < 0 ? (_jsx(Chip, { size: "small", label: `+${Math.abs(remaining)}`, color: "error", sx: { height: 22, fontSize: '0.65rem', fontWeight: 800 } })) : null] })) : null, qty > 0 ? _jsx(Chip, { size: "small", color: "primary", label: qty, sx: { minWidth: 28, fontWeight: 800 } }) : null] })] }), _jsx(Typography, { fontWeight: 800, color: "primary.main", children: formatCurrency(product.salePrice) }), !product.isAvailable ? _jsx(Typography, { variant: "caption", color: "error", children: "\u0645\u0648\u0642\u0648\u0641" }) : null] }) }) }) }) }));
});
export function OrderModal(props) {
    const isEdit = props.mode === 'edit';
    const editBaselineQty = props.editBaselineQty ?? new Map();
    const tone = collectionTone(props.collectionStatus);
    const productMetaMap = useMemo(() => {
        const m = new Map();
        props.products.forEach((p) => {
            if (p.dailyPlan)
                m.set(p.id, { name: p.name, dailyPlan: p.dailyPlan });
        });
        return m;
    }, [props.products]);
    const getPlanMeta = (productId, fallbackName) => productMetaMap.get(productId) ?? { name: fallbackName };
    const cartPlanAlerts = useMemo(() => summarizeCartPlanAlerts(props.cartItems, (id) => productMetaMap.get(id)?.dailyPlan, isEdit, editBaselineQty), [props.cartItems, productMetaMap, isEdit, editBaselineQty]);
    const handleSaveEdit = () => {
        const check = props.validateTakeawayCustomer?.();
        if (check && !check.ok) {
            setShowFieldErrors(true);
            setValidationError(check.error);
            return;
        }
        setShowFieldErrors(false);
        setValidationError('');
        setConfirmOpen(false);
        void Promise.resolve(props.onSaveEdit?.()).then((res) => {
            if (res && !res.ok && res.error)
                setValidationError(res.error);
        });
    };
    const handleCloseOrder = () => {
        if (closingBusy)
            return;
        const check = props.validateTakeawayCustomer?.();
        if (check && !check.ok) {
            setShowFieldErrors(true);
            setValidationError(check.error);
            return;
        }
        setShowFieldErrors(false);
        setValidationError('');
        setConfirmOpen(false);
        setClosingBusy(true);
        void Promise.resolve(props.onCloseOrder()).finally(() => {
            setClosingBusy(false);
        });
    };
    const openReview = () => {
        const check = props.validateTakeawayCustomer?.();
        if (check && !check.ok) {
            setShowFieldErrors(true);
            setValidationError(check.error);
            return;
        }
        setShowFieldErrors(false);
        setValidationError('');
        setConfirmOpen(true);
    };
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [validationError, setValidationError] = useState('');
    const [showFieldErrors, setShowFieldErrors] = useState(false);
    const [closingBusy, setClosingBusy] = useState(false);
    const [customLineOpen, setCustomLineOpen] = useState(false);
    const [customLineName, setCustomLineName] = useState('');
    const [customLinePrice, setCustomLinePrice] = useState('0');
    const drivers = props.deliveryDrivers ?? [];
    const paidSauceIds = new Set(props.paidSauceProductIds ?? []);
    const takeawayCheck = validateTakeawayOrderFields(props.orderType, props.orderOwnerName, props.customerPhone);
    const missingName = props.orderType === 'takeaway' && !props.orderOwnerName.trim();
    const missingPhone = props.orderType === 'takeaway' && !props.customerPhone.trim();
    const invalidPhone = props.orderType === 'takeaway' && props.customerPhone.trim() !== '' && !takeawayCheck.ok && takeawayCheck.missingLabels.includes('رقم تلفون صحيح');
    const productListRef = useRef(null);
    const visibleProducts = useMemo(() => {
        const q = props.productSearch.trim().toLowerCase();
        return props.products.filter((p) => {
            const catOk = props.activeCategory === props.allCategoriesKey || p.categoryId === props.activeCategory;
            const searchOk = !q || p.name.toLowerCase().includes(q);
            return catOk && searchOk;
        });
    }, [props.products, props.activeCategory, props.allCategoriesKey, props.productSearch]);
    const productRows = useMemo(() => {
        const rows = [];
        for (let i = 0; i < visibleProducts.length; i += PRODUCT_COLS) {
            rows.push(visibleProducts.slice(i, i + PRODUCT_COLS));
        }
        return rows;
    }, [visibleProducts]);
    const productRowVirtualizer = useVirtualizer({
        count: productRows.length,
        getScrollElement: () => productListRef.current,
        estimateSize: () => PRODUCT_ROW_HEIGHT,
        overscan: 3,
    });
    useEffect(() => {
        if (!props.open) {
            setShowFieldErrors(false);
            setValidationError('');
            setConfirmOpen(false);
        }
    }, [props.open]);
    return (_jsxs(Dialog, { open: props.open, onClose: props.onClose, fullScreen: props.fullScreen, maxWidth: "xl", fullWidth: true, PaperProps: { sx: { borderRadius: props.fullScreen ? 0 : 4, bgcolor: '#faf6f1' } }, children: [_jsx(DialogTitle, { sx: { pb: 1, borderBottom: `1px solid ${ui.border}`, bgcolor: ui.paper }, children: _jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", gap: 1, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "h6", fontWeight: 800, children: isEdit
                                        ? `تعديل الفاتورة · طلب ${props.currentOrderCode}`
                                        : props.orderType === 'takeaway'
                                            ? 'طلب تيك أواي'
                                            : 'إنشاء طلب' }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: isEdit
                                        ? `تعديل الأصناف والبيانات · الكاشير: ${props.operatorName}`
                                        : `${props.currentOrderCode ? `طلب رقم ${props.currentOrderCode}` : 'طلب جديد'} · الكاشير: ${props.operatorName}` })] }), _jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [_jsx(Chip, { label: getCollectionStatusLabel(props.collectionStatus), size: "small", sx: { bgcolor: tone.bg, color: tone.color, fontWeight: 700 } }), _jsx(IconButton, { onClick: props.onClose, "aria-label": "\u0625\u063A\u0644\u0627\u0642", children: _jsx(Typography, { fontWeight: 800, children: "\u2715" }) })] })] }) }), _jsx(DialogContent, { sx: { p: { xs: 1.5, md: 2 }, overflow: 'hidden' }, children: _jsxs(Grid2, { container: true, spacing: 2, sx: { height: props.fullScreen ? 'calc(100vh - 200px)' : '70vh' }, children: [_jsx(Grid2, { size: { xs: 12, md: 7 }, sx: { height: '100%', overflow: 'hidden' }, children: _jsxs(Stack, { spacing: 1.5, sx: { height: '100%' }, children: [_jsxs(Grid2, { container: true, spacing: 1, children: [_jsx(Grid2, { size: { xs: 12, sm: 6 }, children: _jsx(TextField, { size: "small", fullWidth: true, placeholder: "\u0627\u0628\u062D\u062B \u0639\u0646 \u0635\u0646\u0641...", value: props.productSearch, onChange: (e) => props.onProductSearch(e.target.value) }) }), props.customLineProductId && props.onAddCustomLine ? (_jsx(Grid2, { size: { xs: 12, sm: 6 }, children: _jsx(Button, { fullWidth: true, variant: "outlined", size: "small", sx: { height: 40, fontWeight: 700 }, onClick: () => {
                                                        setCustomLineName('');
                                                        setCustomLinePrice('0');
                                                        setCustomLineOpen(true);
                                                    }, children: "+ \u0635\u0646\u0641 \u064A\u062F\u0648\u064A" }) })) : null, _jsx(Grid2, { size: { xs: 12, sm: 6 }, children: _jsx(CustomerPhoneField, { branchId: props.branchId, value: props.customerPhone, onChange: (e) => {
                                                        props.onCustomerPhone(e);
                                                        if (validationError)
                                                            setValidationError('');
                                                    }, ...(props.onSelectCustomer ? { onSelectCustomer: props.onSelectCustomer } : {}), required: props.orderType === 'takeaway', label: props.orderType === 'takeaway' ? 'رقم التلفون *' : 'رقم التلفون (اختياري)', error: showFieldErrors && (missingPhone || invalidPhone), ...(showFieldErrors && missingPhone
                                                        ? { helperText: 'مطلوب للتيك أواي' }
                                                        : showFieldErrors && invalidPhone
                                                            ? { helperText: 'رقم غير صحيح — 01xxxxxxxxx' }
                                                            : {}) }) }), _jsx(Grid2, { size: { xs: 12, sm: 6 }, children: _jsx(TextField, { size: "small", fullWidth: true, label: "\u0627\u0633\u0645 \u0627\u0644\u0639\u0645\u064A\u0644", value: props.orderOwnerName, onChange: (e) => {
                                                        props.onOrderOwnerName(e.target.value);
                                                        if (validationError)
                                                            setValidationError('');
                                                    }, required: props.orderType === 'takeaway', placeholder: props.orderType === 'takeaway' ? 'مطلوب للتيك أواي' : 'اختياري — يُعبّأ تلقائياً من الهاتف', error: showFieldErrors && missingName, helperText: showFieldErrors && missingName ? 'مطلوب للتيك أواي' : undefined }) }), props.orderType === 'takeaway' ? (_jsxs(_Fragment, { children: [_jsx(Grid2, { size: { xs: 12, sm: 6 }, children: _jsx(CaptainNameField, { branchId: props.branchId, value: props.captainName, onChange: props.onCaptainName, deliveryDrivers: drivers, required: false }) }), _jsx(Grid2, { size: { xs: 12 }, children: _jsx(TextField, { size: "small", fullWidth: true, label: "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0632\u0628\u0648\u0646", value: props.customerAddress, onChange: (e) => props.onCustomerAddress(e.target.value), multiline: true, minRows: 2, placeholder: "\u0627\u0644\u0634\u0627\u0631\u0639\u060C \u0627\u0644\u0645\u0646\u0637\u0642\u0629\u060C \u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0627\u0644\u062A\u0648\u0635\u064A\u0644..." }) })] })) : (_jsx(Grid2, { size: { xs: 12 }, children: _jsx(TextField, { size: "small", fullWidth: true, label: "\u0639\u0646\u0648\u0627\u0646 (\u0627\u062E\u062A\u064A\u0627\u0631\u064A)", value: props.customerAddress, onChange: (e) => props.onCustomerAddress(e.target.value), multiline: true, minRows: 2, placeholder: "\u064A\u064F\u0639\u0628\u0651\u0623 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0625\u0630\u0627 \u0643\u0627\u0646 \u0627\u0644\u0639\u0645\u064A\u0644 \u0645\u0633\u062C\u0651\u0644\u0627\u064B" }) })), _jsx(Grid2, { size: { xs: 12 }, children: _jsx(OrderTypeToggle, { value: props.orderType, onChange: props.onOrderTypeChange, disabled: isEdit }) })] }), validationError ? (_jsx(Alert, { severity: "warning", sx: { borderRadius: 2 }, onClose: () => setValidationError(''), children: validationError })) : null, _jsxs(Stack, { direction: "row", spacing: 0.75, flexWrap: "wrap", useFlexGap: true, children: [_jsx(Chip, { label: "\u0643\u0644 \u0627\u0644\u0623\u0635\u0646\u0627\u0641", size: "small", color: props.activeCategory === props.allCategoriesKey ? 'primary' : 'default', variant: props.activeCategory === props.allCategoriesKey ? 'filled' : 'outlined', onClick: () => props.onCategoryChange(props.allCategoriesKey) }), props.categories.map((cat) => (_jsx(Chip, { label: cat.name, size: "small", color: props.activeCategory === cat.id ? 'primary' : 'default', variant: props.activeCategory === cat.id ? 'filled' : 'outlined', onClick: () => props.onCategoryChange(cat.id) }, cat.id)))] }), _jsxs(Box, { ref: productListRef, sx: { flex: 1, overflowY: 'auto', pr: 0.5 }, children: [props.catalogPending ? (_jsxs(Stack, { alignItems: "center", justifyContent: "center", py: 4, children: [_jsx(CircularProgress, { size: 32 }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mt: 1.5 }, children: "\u062C\u0627\u0631\u064A \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0623\u0635\u0646\u0627\u0641\u2026" })] })) : (_jsx(Box, { sx: { height: productRowVirtualizer.getTotalSize(), position: 'relative', width: '100%' }, children: productRowVirtualizer.getVirtualItems().map((virtualRow) => {
                                                    const rowProducts = productRows[virtualRow.index] ?? [];
                                                    return (_jsx(Box, { sx: {
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            width: '100%',
                                                            transform: `translateY(${virtualRow.start}px)`,
                                                        }, children: _jsx(Grid2, { container: true, spacing: 1.25, children: rowProducts.map((product) => (_jsx(ProductCard, { product: product, qty: props.cartQtyMap.get(product.id) ?? 0, isEdit: isEdit, editBaselineQty: editBaselineQty, onAddProduct: props.onAddProduct }, product.id))) }) }, virtualRow.key));
                                                }) })), !props.catalogPending && visibleProducts.length === 0 ? (_jsx(Alert, { severity: "info", sx: { mt: 1 }, children: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0623\u0635\u0646\u0627\u0641 \u0645\u0637\u0627\u0628\u0642\u0629." })) : null] })] }) }), _jsx(Grid2, { size: { xs: 12, md: 5 }, sx: { height: '100%' }, children: _jsxs(Paper, { elevation: 0, sx: { ...cardSx, p: 2, height: '100%', display: 'flex', flexDirection: 'column' }, children: [_jsxs(Typography, { variant: "subtitle1", fontWeight: 800, sx: { mb: 1.5 }, children: ["\u0627\u0644\u0633\u0644\u0629 \u00B7 ", props.cartItems.length, " \u0635\u0646\u0641"] }), cartPlanAlerts.length > 0 ? (_jsx(Alert, { severity: "warning", sx: { borderRadius: 2, mb: 1.5, py: 0.5 }, children: _jsxs(Stack, { spacing: 0.25, children: [_jsx(Typography, { variant: "caption", fontWeight: 800, children: "\u062A\u0646\u0628\u064A\u0647\u0627\u062A \u062E\u0637\u0629 \u0627\u0644\u0625\u0646\u062A\u0627\u062C" }), cartPlanAlerts.map((line) => (_jsx(Typography, { variant: "caption", display: "block", children: line }, line)))] }) })) : null, _jsx(Box, { sx: { flex: 1, overflowY: 'auto', mb: 1.5 }, children: props.cartItems.length === 0 ? (_jsx(Alert, { severity: "info", sx: { borderRadius: 2 }, children: "\u0627\u0636\u063A\u0637 \u0639\u0644\u0649 \u0627\u0644\u0623\u0635\u0646\u0627\u0641 \u0644\u0625\u0636\u0627\u0641\u062A\u0647\u0627." })) : (_jsx(Stack, { spacing: 1, children: props.cartItems.map((item) => {
                                                const lineKey = cartLineKey(item);
                                                const isCustomLine = props.customLineProductId != null && item.productId === props.customLineProductId;
                                                const plan = productMetaMap.get(item.productId)?.dailyPlan;
                                                const soldAdj = plan ? planSoldAdjustment(isEdit, editBaselineQty.get(item.productId) ?? 0) : 0;
                                                const planLabel = plan ? planStatusLabel(plan, item.quantity, soldAdj) : null;
                                                const planStatus = plan ? planVisualStatus(plan, item.quantity, soldAdj) : null;
                                                return (_jsx(Paper, { variant: "outlined", sx: {
                                                        p: 1.25,
                                                        borderRadius: 2.5,
                                                        borderColor: planStatus === 'exceeded' ? 'error.main' : planStatus === 'low' || planStatus === 'exhausted' ? 'warning.main' : undefined,
                                                        bgcolor: planStatus === 'exceeded' ? 'rgba(239,68,68,0.04)' : undefined,
                                                    }, children: _jsxs(Stack, { spacing: 0.75, children: [_jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", flexWrap: "wrap", useFlexGap: true, children: [_jsx(Typography, { fontWeight: 700, fontSize: "0.95rem", sx: { flex: '0 1 auto' }, children: item.name }), planLabel ? (_jsx(Chip, { size: "small", label: planLabel, color: planStatus === 'exceeded' ? 'error' : 'warning', variant: planStatus === 'exceeded' ? 'filled' : 'outlined', sx: { height: 22, fontSize: '0.68rem', fontWeight: 700 } })) : null, _jsx(TextField, { size: "small", placeholder: "\u0645\u0644\u0627\u062D\u0638\u0629 \u0627\u0644\u0635\u0646\u0641", value: item.note, onChange: (e) => props.onUpdateNote(lineKey, e.target.value), sx: { flex: 1, minWidth: 100 } }), _jsx(Typography, { fontWeight: 800, sx: { ml: 'auto' }, children: formatCurrency(item.unitPrice * item.quantity) })] }), _jsxs(Stack, { direction: "row", spacing: 0.5, alignItems: "center", flexWrap: "wrap", useFlexGap: true, children: [_jsx(IconButton, { size: "small", onClick: () => props.onUpdateQty(lineKey, item.quantity - 1, getPlanMeta(item.productId, item.name)), children: "\u2212" }), _jsx(Chip, { label: item.quantity, size: "small" }), _jsx(IconButton, { size: "small", onClick: () => props.onUpdateQty(lineKey, item.quantity + 1, getPlanMeta(item.productId, item.name)), children: "+" }), _jsx(TextField, { size: "small", type: "number", label: "\u0627\u0644\u0633\u0639\u0631", value: item.unitPrice, onChange: (e) => props.onUpdateUnitPrice(lineKey, Number(e.target.value) || 0), inputProps: { min: 0, step: 0.5 }, sx: { width: 110 } })] }), props.sauces && props.sauces.length > 0 && !paidSauceIds.has(item.productId) && !isCustomLine ? (_jsxs(_Fragment, { children: [_jsx(Typography, { variant: "caption", color: "text.secondary", fontWeight: 700, children: "\u0635\u0648\u0635\u0627\u062A (\u0645\u062C\u0627\u0646\u0627\u064B)" }), _jsx(Stack, { direction: "row", spacing: 0.5, flexWrap: "wrap", useFlexGap: true, children: props.sauces.map((sauce) => {
                                                                            const selected = item.sauces?.includes(sauce.name) ?? false;
                                                                            return (_jsx(Chip, { label: sauce.name, size: "small", clickable: true, color: selected ? 'primary' : 'default', variant: selected ? 'filled' : 'outlined', onClick: () => props.onToggleItemSauce?.(lineKey, sauce.name) }, `${lineKey}-${sauce.id}`));
                                                                        }) })] })) : null] }) }, lineKey));
                                            }) })) }), _jsxs(Stack, { spacing: 1.25, children: [_jsxs(Grid2, { container: true, spacing: 1, children: [_jsx(Grid2, { size: 6, children: _jsx(TextField, { select: true, size: "small", fullWidth: true, label: "\u0627\u0644\u062F\u0641\u0639", value: props.paymentMethod, onChange: (e) => props.onPaymentMethod(e.target.value), disabled: isEdit, children: props.paymentMethods.map((m) => _jsx(MenuItem, { value: m.id, children: m.label }, m.id)) }) }), _jsx(Grid2, { size: 6, children: _jsxs(TextField, { select: true, size: "small", fullWidth: true, label: "\u0627\u0644\u062A\u062D\u0635\u064A\u0644", value: props.collectionStatus, onChange: (e) => props.onCollectionStatus(e.target.value), disabled: isEdit, children: [_jsx(MenuItem, { value: "approved", children: "\u062A\u0645 \u0627\u0644\u062A\u062D\u0635\u064A\u0644 (\u0627\u0644\u062F\u0631\u062C)" }), _jsx(MenuItem, { value: "uncollected", children: "\u0644\u0645 \u064A\u064F\u062D\u0635\u0651\u0644 \u0628\u0639\u062F" })] }) }), _jsx(Grid2, { size: 6, children: _jsx(TextField, { size: "small", fullWidth: true, label: "\u062E\u0635\u0645", type: "number", value: props.discountAmount, onChange: (e) => props.onDiscountAmount(e.target.value) }) }), _jsx(Grid2, { size: 12, children: _jsx(TextField, { size: "small", fullWidth: true, label: "\u0645\u0644\u0627\u062D\u0638\u0629 \u0627\u0644\u0637\u0644\u0628", value: props.orderNote, onChange: (e) => props.onOrderNote(e.target.value), multiline: true, minRows: 2 }) })] }), _jsx(Paper, { sx: { p: 1.5, borderRadius: 2.5, bgcolor: 'rgba(185,56,23,0.06)' }, children: _jsxs(Stack, { spacing: 0.5, children: [_jsxs(Stack, { direction: "row", justifyContent: "space-between", children: [_jsx(Typography, { variant: "body2", children: "\u0642\u0628\u0644 \u0627\u0644\u062E\u0635\u0645" }), _jsx(Typography, { fontWeight: 700, children: formatCurrency(props.subtotal) })] }), _jsxs(Stack, { direction: "row", justifyContent: "space-between", children: [_jsx(Typography, { variant: "body2", children: "\u062E\u0635\u0645" }), _jsx(Typography, { fontWeight: 700, children: formatCurrency(props.discount) })] }), _jsx(Divider, {}), _jsxs(Stack, { direction: "row", justifyContent: "space-between", children: [_jsx(Typography, { fontWeight: 800, children: "\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A" }), _jsx(Typography, { fontWeight: 800, color: "primary.main", children: formatCurrency(props.total) })] })] }) })] })] }) })] }) }), _jsxs(DialogActions, { sx: { px: 2, py: 1.5, borderTop: `1px solid ${ui.border}`, bgcolor: ui.paper }, children: [!isEdit ? _jsx(Button, { onClick: props.onClearCart, children: "\u0625\u0641\u0631\u0627\u063A" }) : null, _jsx(Button, { onClick: props.onClose, children: "\u0625\u0644\u063A\u0627\u0621" }), !isEdit ? (_jsx(Button, { variant: "outlined", disabled: props.cartItems.length === 0, onClick: async () => {
                            const check = props.validateTakeawayCustomer?.();
                            if (check && !check.ok) {
                                setShowFieldErrors(true);
                                setValidationError(check.error);
                                return;
                            }
                            setShowFieldErrors(false);
                            const res = await props.onSuspend();
                            if (!res?.ok && res?.error)
                                setValidationError(res.error);
                        }, children: "\u062A\u0639\u0644\u064A\u0642" })) : null, _jsx(Button, { variant: "contained", disabled: props.cartItems.length === 0 || closingBusy, onClick: isEdit ? () => void handleSaveEdit() : handleCloseOrder, sx: { fontWeight: 800, px: 3 }, children: closingBusy
                            ? 'جاري الإغلاق…'
                            : isEdit
                                ? `حفظ التعديلات · ${formatCurrency(props.total)}`
                                : `إغلاق وتأكيد · ${formatCurrency(props.total)}` }), !isEdit ? (_jsx(Button, { variant: "text", disabled: props.cartItems.length === 0, onClick: openReview, sx: { fontWeight: 700 }, children: "\u0645\u0631\u0627\u062C\u0639\u0629" })) : null] }), !isEdit ? (_jsx(OrderConfirmDialog, { open: confirmOpen, orderCode: props.currentOrderCode, orderType: props.orderType, orderOwnerName: props.orderOwnerName, customerPhone: props.customerPhone, customerAddress: props.customerAddress, captainName: props.captainName, cartItems: props.cartItems, paymentMethod: props.paymentMethod, paymentMethods: props.paymentMethods, collectionStatus: props.collectionStatus, discount: props.discount, subtotal: props.subtotal, total: props.total, orderNote: props.orderNote, onCancel: () => setConfirmOpen(false), onConfirm: handleCloseOrder, busy: closingBusy })) : null, _jsxs(Dialog, { open: customLineOpen, onClose: () => setCustomLineOpen(false), fullWidth: true, maxWidth: "xs", children: [_jsx(DialogTitle, { children: "\u0625\u0636\u0627\u0641\u0629 \u0635\u0646\u0641 \u064A\u062F\u0648\u064A" }), _jsx(DialogContent, { children: _jsxs(Stack, { spacing: 2, sx: { pt: 1 }, children: [_jsx(TextField, { autoFocus: true, label: "\u0627\u0633\u0645 \u0627\u0644\u0635\u0646\u0641", value: customLineName, onChange: (e) => setCustomLineName(e.target.value), fullWidth: true }), _jsx(TextField, { label: "\u0627\u0644\u0633\u0639\u0631", type: "number", value: customLinePrice, onChange: (e) => setCustomLinePrice(e.target.value), inputProps: { min: 0, step: 0.5 }, fullWidth: true })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setCustomLineOpen(false), children: "\u0625\u0644\u063A\u0627\u0621" }), _jsx(Button, { variant: "contained", disabled: !customLineName.trim(), onClick: () => {
                                    const ok = props.onAddCustomLine?.(customLineName, Number(customLinePrice) || 0);
                                    if (ok)
                                        setCustomLineOpen(false);
                                }, children: "\u0625\u0636\u0627\u0641\u0629" })] })] })] }));
}
