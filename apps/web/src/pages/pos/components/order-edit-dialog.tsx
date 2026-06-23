import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import type { DeliveryDriver } from '../../../lib/pos-receipt-settings.js';
import type { CartItem, SavedOrder } from '../../../lib/pos-store.js';
import { CustomerPhoneField } from '../../../components/customer-phone-field.js';
import { CaptainNameField } from '../../../components/captain-name-field.js';
import { isValidCustomerPhone } from '../../../lib/customer-phone.js';
import { formatCurrency } from '../utils.js';

export type OrderAmendPayload = {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  captainName: string;
  note: string;
  items: CartItem[];
};

type PosProduct = {
  id: string;
  name: string;
  salePrice: number;
  isAvailable?: boolean;
};

type OrderEditDialogProps = {
  open: boolean;
  branchId: string;
  order: SavedOrder | null;
  products: PosProduct[];
  sauces?: Array<{ id: string; name: string }>;
  paidSauceProductIds?: string[];
  deliveryDrivers?: DeliveryDriver[];
  onClose: () => void;
  onSave: (payload: OrderAmendPayload) => Promise<{ ok: boolean; error?: string }>;
};

function cloneCartItems(items: CartItem[]): CartItem[] {
  return items.map((item) => ({ ...item, sauces: item.sauces ?? [] }));
}

export function OrderEditDialog({
  open,
  branchId,
  order,
  products,
  sauces = [],
  paidSauceProductIds = [],
  deliveryDrivers = [],
  onClose,
  onSave,
}: OrderEditDialogProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [captainName, setCaptainName] = useState('');
  const [note, setNote] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [addProductId, setAddProductId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !order) return;
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
  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [cartItems],
  );
  const total = Math.max(0, subtotal - discount);

  const availableProducts = products.filter((p) => p.isAvailable !== false);
  const paidSauceIds = new Set(paidSauceProductIds);

  const addProduct = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product || product.isAvailable === false) return;
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

  const updateNote = (productId: string, note: string) => {
    setCartItems((cur) => cur.map((i) => i.productId === productId ? { ...i, note } : i));
  };

  const toggleItemSauce = (productId: string, sauceName: string) => {
    setCartItems((cur) => cur.map((i) => {
      if (i.productId !== productId) return i;
      const list = i.sauces ?? [];
      const next = list.includes(sauceName) ? list.filter((s) => s !== sauceName) : [...list, sauceName];
      return { ...i, sauces: next };
    }));
  };

  const updateQty = (productId: string, qty: number) => {
    setCartItems((cur) => {
      if (qty <= 0) return cur.filter((i) => i.productId !== productId);
      return cur.map((i) => i.productId === productId ? { ...i, quantity: qty } : i);
    });
  };

  const handleSave = async () => {
    if (!order) return;
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

  if (!order) return null;

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 800 }}>تعديل الفاتورة · طلب {order.code}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            عدّل البيانات أو أضف/احذف أصناف — يُسجَّل كل تغيير في سجل النشاط.
          </Typography>

          {error ? <Alert severity="warning">{error}</Alert> : null}

          <CustomerPhoneField
            branchId={branchId}
            value={customerPhone}
            onChange={setCustomerPhone}
            required={isTakeaway}
            label={isTakeaway ? 'رقم التلفون *' : 'رقم التلفون (اختياري)'}
            onSelectCustomer={(c) => {
              setCustomerPhone(c.phone);
              if (c.name?.trim()) setCustomerName(c.name.trim());
              if (c.address?.trim()) setCustomerAddress(c.address.trim());
            }}
          />

          <TextField
            fullWidth
            size="small"
            label="اسم العميل"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required={isTakeaway}
            placeholder={isTakeaway ? 'مطلوب' : 'اختياري'}
          />

          <CaptainNameField
            branchId={branchId}
            value={captainName}
            onChange={setCaptainName}
            deliveryDrivers={deliveryDrivers}
            label="كابتن الدليفري"
            placeholder="اسم الكابتن — يُقترح من الطلبات السابقة"
          />

          {isTakeaway ? (
            <TextField
              fullWidth
              size="small"
              label="عنوان الزبون"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              multiline
              minRows={2}
            />
          ) : (
            <TextField
              fullWidth
              size="small"
              label="عنوان (اختياري)"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              multiline
              minRows={2}
            />
          )}

          <TextField
            fullWidth
            size="small"
            label="ملاحظة الطلب"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            multiline
            minRows={2}
          />

          <Divider />

          <Typography variant="subtitle2" fontWeight={800}>الأصناف</Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              select
              size="small"
              fullWidth
              label="إضافة صنف"
              value={addProductId}
              onChange={(e) => {
                const id = e.target.value;
                setAddProductId(id);
                if (id) addProduct(id);
              }}
            >
              <MenuItem value="">اختر صنفاً...</MenuItem>
              {availableProducts.map((product) => (
                <MenuItem key={product.id} value={product.id}>
                  {product.name} · {formatCurrency(product.salePrice)}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          {cartItems.length === 0 ? (
            <Alert severity="info">لا توجد أصناف — أضف صنفاً واحداً على الأقل.</Alert>
          ) : (
            <Stack spacing={1}>
              {cartItems.map((item) => (
                <Paper key={item.productId} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                  <Stack spacing={0.75}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography fontWeight={700} fontSize="0.95rem" sx={{ flex: '0 1 auto' }}>{item.name}</Typography>
                      <TextField
                        size="small"
                        placeholder="ملاحظة الصنف"
                        value={item.note}
                        onChange={(e) => updateNote(item.productId, e.target.value)}
                        sx={{ flex: 1, minWidth: 100 }}
                      />
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 'auto' }}>
                        <IconButton size="small" onClick={() => updateQty(item.productId, item.quantity - 1)}>−</IconButton>
                        <Chip label={item.quantity} size="small" />
                        <IconButton size="small" onClick={() => updateQty(item.productId, item.quantity + 1)}>+</IconButton>
                        <Typography fontWeight={800} sx={{ minWidth: 72, textAlign: 'left' }}>
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </Typography>
                        <Button size="small" color="error" onClick={() => updateQty(item.productId, 0)}>حذف</Button>
                      </Stack>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">{formatCurrency(item.unitPrice)}</Typography>
                    {sauces.length > 0 && !paidSauceIds.has(item.productId) ? (
                      <>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>
                          صوصات (مجاناً)
                        </Typography>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {sauces.map((sauce) => {
                          const selected = item.sauces?.includes(sauce.name) ?? false;
                          return (
                            <Chip
                              key={`${item.productId}-${sauce.id}`}
                              label={sauce.name}
                              size="small"
                              clickable
                              color={selected ? 'primary' : 'default'}
                              variant={selected ? 'filled' : 'outlined'}
                              onClick={() => toggleItemSauce(item.productId, sauce.name)}
                            />
                          );
                        })}
                        </Stack>
                      </>
                    ) : null}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}

          <Paper sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(185,56,23,0.06)' }}>
            <Stack spacing={0.5}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">قبل الخصم</Typography>
                <Typography fontWeight={700}>{formatCurrency(subtotal)}</Typography>
              </Stack>
              {discount > 0 ? (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">خصم</Typography>
                  <Typography fontWeight={700}>{formatCurrency(discount)}</Typography>
                </Stack>
              ) : null}
              <Divider />
              <Stack direction="row" justifyContent="space-between">
                <Typography fontWeight={800}>الإجمالي الجديد</Typography>
                <Typography fontWeight={800} color="primary.main">{formatCurrency(total)}</Typography>
              </Stack>
              {total !== order.total ? (
                <Typography variant="caption" color="text.secondary">
                  كان الإجمالي السابق: {formatCurrency(order.total)}
                </Typography>
              ) : null}
            </Stack>
          </Paper>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2 }}>
        <Button onClick={onClose} disabled={busy}>إلغاء</Button>
        <Button variant="contained" onClick={handleSave} disabled={busy} sx={{ fontWeight: 800 }}>
          حفظ التعديل
        </Button>
      </DialogActions>
    </Dialog>
  );
}
