import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, MenuItem, Paper, Stack, TextField, Typography, } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { CustomerPhoneField } from '../../../components/customer-phone-field.js';
import { CaptainNameField } from '../../../components/captain-name-field.js';
import { isValidCustomerPhone } from '../../../lib/customer-phone.js';
import { formatCurrency } from '../utils.js';
function cloneCartItems(items) {
    return items.map((item) => ({ ...item, sauces: item.sauces ?? [] }));
}
export function OrderEditDialog({ open, branchId, order, products, sauces = [], paidSauceProductIds = [], deliveryDrivers = [], onClose, onSave, }) {
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [captainName, setCaptainName] = useState('');
    const [note, setNote] = useState('');
    const [cartItems, setCartItems] = useState([]);
    const [addProductId, setAddProductId] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        if (!open || !order)
            return;
        setCustomerName(order.ownerName ?? '');
        setCustomerPhone(order.customerPhone ?? '');
        setCustomerAddress(order.customerAddress ?? '');
        setCaptainName(order.captainName ?? '');
        setNote(order.orderNote ?? '');
        setCartItems(cloneCartItems(order.items));
        setAddProductId('');
        setError('');
    }, [open, order]);
    const isTakeaway = order?.orderType === 'takeaway';
    const discount = Math.max(0, Number(order?.discountAmount) || 0);
    const subtotal = useMemo(() => cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0), [cartItems]);
    const total = Math.max(0, subtotal - discount);
    const availableProducts = products.filter((p) => p.isAvailable !== false);
    const paidSauceIds = new Set(paidSauceProductIds);
    const addProduct = (productId) => {
        const product = products.find((p) => p.id === productId);
        if (!product || product.isAvailable === false)
            return;
        setCartItems((cur) => {
            const existing = cur.find((i) => i.productId === product.id);
            if (existing) {
                return cur.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...cur, {
                    productId: product.id,
                    name: product.name,
                    unitPrice: product.salePrice,
                    quantity: 1,
                    note: '',
                    sauces: [],
                }];
        });
        setAddProductId('');
    };
    const updateNote = (productId, note) => {
        setCartItems((cur) => cur.map((i) => i.productId === productId ? { ...i, note } : i));
    };
    const toggleItemSauce = (productId, sauceName) => {
        setCartItems((cur) => cur.map((i) => {
            if (i.productId !== productId)
                return i;
            const list = i.sauces ?? [];
            const next = list.includes(sauceName) ? list.filter((s) => s !== sauceName) : [...list, sauceName];
            return { ...i, sauces: next };
        }));
    };
    const updateQty = (productId, qty) => {
        setCartItems((cur) => {
            if (qty <= 0)
                return cur.filter((i) => i.productId !== productId);
            return cur.map((i) => i.productId === productId ? { ...i, quantity: qty } : i);
        });
    };
    const handleSave = async () => {
        if (!order)
            return;
        if (isTakeaway && !customerName.trim()) {
            setError('اسم العميل مطلوب لطلبات التيك أواي');
            return;
        }
        if (isTakeaway && !isValidCustomerPhone(customerPhone)) {
            setError('رقم التلفون مطلوب وصحيح لطلبات التيك أواي');
            return;
        }
        if (cartItems.length === 0) {
            setError('يجب أن يحتوي الطلب على صنف واحد على الأقل');
            return;
        }
        setBusy(true);
        setError('');
        const res = await onSave({
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            customerAddress: customerAddress.trim(),
            captainName: captainName.trim(),
            note: note.trim(),
            items: cartItems,
        });
        setBusy(false);
        if (!res.ok) {
            setError(res.error ?? 'فشل حفظ التعديل');
            return;
        }
        onClose();
    };
    if (!order)
        return null;
    return (_jsxs(Dialog, { open: open, onClose: busy ? undefined : onClose, fullWidth: true, maxWidth: "md", children: [_jsxs(DialogTitle, { sx: { fontWeight: 800 }, children: ["\u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u00B7 \u0637\u0644\u0628 ", order.code] }), _jsx(DialogContent, { children: _jsxs(Stack, { spacing: 2, sx: { pt: 0.5 }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u0639\u062F\u0651\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0623\u0648 \u0623\u0636\u0641/\u0627\u062D\u0630\u0641 \u0623\u0635\u0646\u0627\u0641 \u2014 \u064A\u064F\u0633\u062C\u064E\u0651\u0644 \u0643\u0644 \u062A\u063A\u064A\u064A\u0631 \u0641\u064A \u0633\u062C\u0644 \u0627\u0644\u0646\u0634\u0627\u0637." }), error ? _jsx(Alert, { severity: "warning", children: error }) : null, _jsx(CustomerPhoneField, { branchId: branchId, value: customerPhone, onChange: setCustomerPhone, required: isTakeaway, label: isTakeaway ? 'رقم التلفون *' : 'رقم التلفون (اختياري)', onSelectCustomer: (c) => {
                                setCustomerPhone(c.phone);
                                if (c.name?.trim())
                                    setCustomerName(c.name.trim());
                                if (c.address?.trim())
                                    setCustomerAddress(c.address.trim());
                            } }), _jsx(TextField, { fullWidth: true, size: "small", label: "\u0627\u0633\u0645 \u0627\u0644\u0639\u0645\u064A\u0644", value: customerName, onChange: (e) => setCustomerName(e.target.value), required: isTakeaway, placeholder: isTakeaway ? 'مطلوب' : 'اختياري' }), _jsx(CaptainNameField, { branchId: branchId, value: captainName, onChange: setCaptainName, deliveryDrivers: deliveryDrivers, label: "\u0643\u0627\u0628\u062A\u0646 \u0627\u0644\u062F\u0644\u064A\u0641\u0631\u064A", placeholder: "\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0628\u062A\u0646 \u2014 \u064A\u064F\u0642\u062A\u0631\u062D \u0645\u0646 \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0633\u0627\u0628\u0642\u0629" }), isTakeaway ? (_jsx(TextField, { fullWidth: true, size: "small", label: "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0632\u0628\u0648\u0646", value: customerAddress, onChange: (e) => setCustomerAddress(e.target.value), multiline: true, minRows: 2 })) : (_jsx(TextField, { fullWidth: true, size: "small", label: "\u0639\u0646\u0648\u0627\u0646 (\u0627\u062E\u062A\u064A\u0627\u0631\u064A)", value: customerAddress, onChange: (e) => setCustomerAddress(e.target.value), multiline: true, minRows: 2 })), _jsx(TextField, { fullWidth: true, size: "small", label: "\u0645\u0644\u0627\u062D\u0638\u0629 \u0627\u0644\u0637\u0644\u0628", value: note, onChange: (e) => setNote(e.target.value), multiline: true, minRows: 2 }), _jsx(Divider, {}), _jsx(Typography, { variant: "subtitle2", fontWeight: 800, children: "\u0627\u0644\u0623\u0635\u0646\u0627\u0641" }), _jsx(Stack, { direction: { xs: 'column', sm: 'row' }, spacing: 1, children: _jsxs(TextField, { select: true, size: "small", fullWidth: true, label: "\u0625\u0636\u0627\u0641\u0629 \u0635\u0646\u0641", value: addProductId, onChange: (e) => {
                                    const id = e.target.value;
                                    setAddProductId(id);
                                    if (id)
                                        addProduct(id);
                                }, children: [_jsx(MenuItem, { value: "", children: "\u0627\u062E\u062A\u0631 \u0635\u0646\u0641\u0627\u064B..." }), availableProducts.map((product) => (_jsxs(MenuItem, { value: product.id, children: [product.name, " \u00B7 ", formatCurrency(product.salePrice)] }, product.id)))] }) }), cartItems.length === 0 ? (_jsx(Alert, { severity: "info", children: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0623\u0635\u0646\u0627\u0641 \u2014 \u0623\u0636\u0641 \u0635\u0646\u0641\u0627\u064B \u0648\u0627\u062D\u062F\u0627\u064B \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644." })) : (_jsx(Stack, { spacing: 1, children: cartItems.map((item) => (_jsx(Paper, { variant: "outlined", sx: { p: 1.25, borderRadius: 2 }, children: _jsxs(Stack, { spacing: 0.75, children: [_jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", flexWrap: "wrap", useFlexGap: true, children: [_jsx(Typography, { fontWeight: 700, fontSize: "0.95rem", sx: { flex: '0 1 auto' }, children: item.name }), _jsx(TextField, { size: "small", placeholder: "\u0645\u0644\u0627\u062D\u0638\u0629 \u0627\u0644\u0635\u0646\u0641", value: item.note, onChange: (e) => updateNote(item.productId, e.target.value), sx: { flex: 1, minWidth: 100 } }), _jsxs(Stack, { direction: "row", spacing: 0.5, alignItems: "center", sx: { ml: 'auto' }, children: [_jsx(IconButton, { size: "small", onClick: () => updateQty(item.productId, item.quantity - 1), children: "\u2212" }), _jsx(Chip, { label: item.quantity, size: "small" }), _jsx(IconButton, { size: "small", onClick: () => updateQty(item.productId, item.quantity + 1), children: "+" }), _jsx(Typography, { fontWeight: 800, sx: { minWidth: 72, textAlign: 'left' }, children: formatCurrency(item.unitPrice * item.quantity) }), _jsx(Button, { size: "small", color: "error", onClick: () => updateQty(item.productId, 0), children: "\u062D\u0630\u0641" })] })] }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: formatCurrency(item.unitPrice) }), sauces.length > 0 && !paidSauceIds.has(item.productId) ? (_jsxs(_Fragment, { children: [_jsx(Typography, { variant: "caption", color: "text.secondary", fontWeight: 700, children: "\u0635\u0648\u0635\u0627\u062A (\u0645\u062C\u0627\u0646\u0627\u064B)" }), _jsx(Stack, { direction: "row", spacing: 0.5, flexWrap: "wrap", useFlexGap: true, children: sauces.map((sauce) => {
                                                        const selected = item.sauces?.includes(sauce.name) ?? false;
                                                        return (_jsx(Chip, { label: sauce.name, size: "small", clickable: true, color: selected ? 'primary' : 'default', variant: selected ? 'filled' : 'outlined', onClick: () => toggleItemSauce(item.productId, sauce.name) }, `${item.productId}-${sauce.id}`));
                                                    }) })] })) : null] }) }, item.productId))) })), _jsx(Paper, { sx: { p: 1.5, borderRadius: 2, bgcolor: 'rgba(185,56,23,0.06)' }, children: _jsxs(Stack, { spacing: 0.5, children: [_jsxs(Stack, { direction: "row", justifyContent: "space-between", children: [_jsx(Typography, { variant: "body2", children: "\u0642\u0628\u0644 \u0627\u0644\u062E\u0635\u0645" }), _jsx(Typography, { fontWeight: 700, children: formatCurrency(subtotal) })] }), discount > 0 ? (_jsxs(Stack, { direction: "row", justifyContent: "space-between", children: [_jsx(Typography, { variant: "body2", children: "\u062E\u0635\u0645" }), _jsx(Typography, { fontWeight: 700, children: formatCurrency(discount) })] })) : null, _jsx(Divider, {}), _jsxs(Stack, { direction: "row", justifyContent: "space-between", children: [_jsx(Typography, { fontWeight: 800, children: "\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u062C\u062F\u064A\u062F" }), _jsx(Typography, { fontWeight: 800, color: "primary.main", children: formatCurrency(total) })] }), total !== order.total ? (_jsxs(Typography, { variant: "caption", color: "text.secondary", children: ["\u0643\u0627\u0646 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0633\u0627\u0628\u0642: ", formatCurrency(order.total)] })) : null] }) })] }) }), _jsxs(DialogActions, { sx: { px: 2, pb: 2 }, children: [_jsx(Button, { onClick: onClose, disabled: busy, children: "\u0625\u0644\u063A\u0627\u0621" }), _jsx(Button, { variant: "contained", onClick: handleSave, disabled: busy, sx: { fontWeight: 800 }, children: "\u062D\u0641\u0638 \u0627\u0644\u062A\u0639\u062F\u064A\u0644" })] })] }));
}
