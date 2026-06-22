import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid2,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { getCollectionStatusLabel, validateTakeawayOrderFields, type CartItem, type CollectionStatus, type OrderType } from '../../../lib/pos-store.js';
import type { PaymentMethodOption } from '../constants.js';
import { collectionTone, formatCurrency } from '../utils.js';
import { OrderTypeToggle } from './order-type-toggle.js';
import { OrderConfirmDialog } from './order-confirm-dialog.js';
import type { DeliveryDriver } from '../../../lib/pos-receipt-settings.js';
import { CustomerPhoneField, type CustomerSearchHit } from '../../../components/customer-phone-field.js';
import { CaptainNameField } from '../../../components/captain-name-field.js';
import { useState, useEffect } from 'react';

type OrderModalProps = {
  open: boolean;
  fullScreen: boolean;
  branchId: string;
  operatorName: string;
  orderType: OrderType;
  currentOrderCode: string;
  collectionStatus: CollectionStatus;
  productSearch: string;
  onProductSearch: (v: string) => void;
  orderOwnerName: string;
  onOrderOwnerName: (v: string) => void;
  customerPhone: string;
  onCustomerPhone: (v: string) => void;
  onSelectCustomer?: (customer: CustomerSearchHit) => void;
  customerAddress: string;
  onCustomerAddress: (v: string) => void;
  captainName: string;
  onCaptainName: (v: string) => void;
  onOrderTypeChange: (t: OrderType) => void;
  categories: any[];
  activeCategory: string;
  onCategoryChange: (id: string) => void;
  allCategoriesKey: string;
  products: any[];
  cartItems: CartItem[];
  cartQtyMap: Map<string, number>;
  onAddProduct: (p: any) => void;
  onUpdateQty: (id: string, qty: number) => void;
  onUpdateNote: (id: string, note: string) => void;
  paymentMethods: PaymentMethodOption[];
  paymentMethod: string;
  onPaymentMethod: (v: string) => void;
  onCollectionStatus: (v: CollectionStatus) => void;
  discountAmount: string;
  onDiscountAmount: (v: string) => void;
  orderNote: string;
  onOrderNote: (v: string) => void;
  sauces?: Array<{ id: string; name: string }>;
  onToggleItemSauce?: (productId: string, sauceName: string) => void;
  subtotal: number;
  discount: number;
  total: number;
  onClose: () => void;
  onSuspend: () => void | Promise<{ ok: boolean; error?: string } | undefined>;
  onCloseOrder: () => void | Promise<void>;
  onClearCart: () => void;
  deliveryDrivers?: DeliveryDriver[];
  validateTakeawayCustomer?: () => { ok: true } | { ok: false; error: string };
  catalogPending?: boolean;
};

export function OrderModal(props: OrderModalProps) {
  const tone = collectionTone(props.collectionStatus);
  const handleCloseOrder = () => {
    const check = props.validateTakeawayCustomer?.();
    if (check && !check.ok) {
      setShowFieldErrors(true);
      setValidationError(check.error);
      return;
    }
    setShowFieldErrors(false);
    setValidationError('');
    setConfirmOpen(false);
    void props.onCloseOrder();
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
  const drivers = props.deliveryDrivers ?? [];
  const takeawayCheck = validateTakeawayOrderFields(props.orderType, props.orderOwnerName, props.customerPhone);
  const missingName = props.orderType === 'takeaway' && !props.orderOwnerName.trim();
  const missingPhone = props.orderType === 'takeaway' && !props.customerPhone.trim();
  const invalidPhone = props.orderType === 'takeaway' && props.customerPhone.trim() !== '' && !takeawayCheck.ok && takeawayCheck.missingLabels.includes('رقم تلفون صحيح');

  useEffect(() => {
    if (!props.open) {
      setShowFieldErrors(false);
      setValidationError('');
      setConfirmOpen(false);
    }
  }, [props.open]);
  const visibleProducts = props.products.filter((p: any) => {
    const catOk = props.activeCategory === props.allCategoriesKey || p.categoryId === props.activeCategory;
    const searchOk = !props.productSearch.trim() || p.name.toLowerCase().includes(props.productSearch.trim().toLowerCase());
    return catOk && searchOk;
  });

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      fullScreen={props.fullScreen}
      maxWidth="xl"
      fullWidth
      PaperProps={{ sx: { borderRadius: props.fullScreen ? 0 : 4, bgcolor: '#faf6f1' } }}
    >
      <DialogTitle sx={{ pb: 1, borderBottom: '1px solid rgba(117,89,77,0.12)', bgcolor: 'rgba(255,250,244,0.98)' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
          <Box>
            <Typography variant="h6" fontWeight={800}>
              {props.orderType === 'takeaway' ? 'طلب تيك أواي' : 'إنشاء طلب'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {props.currentOrderCode ? `طلب رقم ${props.currentOrderCode}` : 'طلب جديد'} · الكاشير: {props.operatorName}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={getCollectionStatusLabel(props.collectionStatus)} size="small" sx={{ bgcolor: tone.bg, color: tone.color, fontWeight: 700 }} />
            <IconButton onClick={props.onClose} aria-label="إغلاق">
              <Typography fontWeight={800}>✕</Typography>
            </IconButton>
          </Stack>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 1.5, md: 2 }, overflow: 'hidden' }}>
        <Grid2 container spacing={2} sx={{ height: props.fullScreen ? 'calc(100vh - 200px)' : '70vh' }}>
          <Grid2 size={{ xs: 12, md: 7 }} sx={{ height: '100%', overflow: 'hidden' }}>
            <Stack spacing={1.5} sx={{ height: '100%' }}>
              <Grid2 container spacing={1}>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <TextField size="small" fullWidth placeholder="ابحث عن صنف..." value={props.productSearch} onChange={(e) => props.onProductSearch(e.target.value)} />
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <CustomerPhoneField
                    branchId={props.branchId}
                    value={props.customerPhone}
                    onChange={(e) => {
                      props.onCustomerPhone(e);
                      if (validationError) setValidationError('');
                    }}
                    {...(props.onSelectCustomer ? { onSelectCustomer: props.onSelectCustomer } : {})}
                    required={props.orderType === 'takeaway'}
                    label={props.orderType === 'takeaway' ? 'رقم التلفون *' : 'رقم التلفون (اختياري)'}
                    error={showFieldErrors && (missingPhone || invalidPhone)}
                    {...(showFieldErrors && missingPhone
                      ? { helperText: 'مطلوب للتيك أواي' }
                      : showFieldErrors && invalidPhone
                        ? { helperText: 'رقم غير صحيح — 01xxxxxxxxx' }
                        : {})}
                  />
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <TextField
                    size="small"
                    fullWidth
                    label="اسم العميل"
                    value={props.orderOwnerName}
                    onChange={(e) => {
                      props.onOrderOwnerName(e.target.value);
                      if (validationError) setValidationError('');
                    }}
                    required={props.orderType === 'takeaway'}
                    placeholder={props.orderType === 'takeaway' ? 'مطلوب للتيك أواي' : 'اختياري — يُعبّأ تلقائياً من الهاتف'}
                    error={showFieldErrors && missingName}
                    helperText={showFieldErrors && missingName ? 'مطلوب للتيك أواي' : undefined}
                  />
                </Grid2>
                {props.orderType === 'takeaway' ? (
                  <>
                    <Grid2 size={{ xs: 12, sm: 6 }}>
                      <CaptainNameField
                        branchId={props.branchId}
                        value={props.captainName}
                        onChange={props.onCaptainName}
                        deliveryDrivers={drivers}
                        required={false}
                      />
                    </Grid2>
                    <Grid2 size={{ xs: 12 }}>
                      <TextField size="small" fullWidth label="عنوان الزبون" value={props.customerAddress} onChange={(e) => props.onCustomerAddress(e.target.value)} multiline minRows={2} placeholder="الشارع، المنطقة، ملاحظات التوصيل..." />
                    </Grid2>
                  </>
                ) : (
                  <Grid2 size={{ xs: 12 }}>
                    <TextField size="small" fullWidth label="عنوان (اختياري)" value={props.customerAddress} onChange={(e) => props.onCustomerAddress(e.target.value)} multiline minRows={2} placeholder="يُعبّأ تلقائياً إذا كان العميل مسجّلاً" />
                  </Grid2>
                )}
                <Grid2 size={{ xs: 12 }}>
                  <OrderTypeToggle value={props.orderType} onChange={props.onOrderTypeChange} />
                </Grid2>
              </Grid2>

              {validationError ? (
                <Alert severity="warning" sx={{ borderRadius: 2 }} onClose={() => setValidationError('')}>
                  {validationError}
                </Alert>
              ) : null}

              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                <Chip
                  label="كل الأصناف"
                  size="small"
                  color={props.activeCategory === props.allCategoriesKey ? 'primary' : 'default'}
                  variant={props.activeCategory === props.allCategoriesKey ? 'filled' : 'outlined'}
                  onClick={() => props.onCategoryChange(props.allCategoriesKey)}
                />
                {props.categories.map((cat: any) => (
                  <Chip
                    key={cat.id}
                    label={cat.name}
                    size="small"
                    color={props.activeCategory === cat.id ? 'primary' : 'default'}
                    variant={props.activeCategory === cat.id ? 'filled' : 'outlined'}
                    onClick={() => props.onCategoryChange(cat.id)}
                  />
                ))}
              </Stack>

              <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5 }}>
                {props.catalogPending ? (
                  <Stack alignItems="center" justifyContent="center" py={4}>
                    <CircularProgress size={32} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>جاري تحميل الأصناف…</Typography>
                  </Stack>
                ) : (
                <Grid2 container spacing={1.25}>
                  {visibleProducts.map((product: any) => {
                    const qty = props.cartQtyMap.get(product.id) ?? 0;
                    return (
                      <Grid2 key={product.id} size={{ xs: 6, sm: 4, lg: 3 }}>
                        <Card
                          elevation={0}
                          sx={{
                            borderRadius: 3,
                            border: qty > 0 ? '2px solid' : '1px solid rgba(117,89,77,0.14)',
                            borderColor: qty > 0 ? 'primary.main' : 'rgba(117,89,77,0.14)',
                            opacity: product.isAvailable ? 1 : 0.5,
                            bgcolor: '#fff',
                          }}
                        >
                          <CardActionArea disabled={!product.isAvailable} onClick={() => props.onAddProduct(product)}>
                            <CardContent sx={{ p: 1.5 }}>
                              <Stack spacing={0.75}>
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={0.5}>
                                  <Typography fontWeight={700} fontSize="0.9rem" lineHeight={1.3}>{product.name}</Typography>
                                  {qty > 0 ? <Chip size="small" color="primary" label={qty} sx={{ minWidth: 28, fontWeight: 800 }} /> : null}
                                </Stack>
                                <Typography fontWeight={800} color="primary.main">{formatCurrency(product.salePrice)}</Typography>
                                {!product.isAvailable ? <Typography variant="caption" color="error">موقوف</Typography> : null}
                              </Stack>
                            </CardContent>
                          </CardActionArea>
                        </Card>
                      </Grid2>
                    );
                  })}
                </Grid2>
                )}
                {!props.catalogPending && visibleProducts.length === 0 ? (
                  <Alert severity="info" sx={{ mt: 1 }}>لا توجد أصناف مطابقة.</Alert>
                ) : null}
              </Box>
            </Stack>
          </Grid2>

          <Grid2 size={{ xs: 12, md: 5 }} sx={{ height: '100%' }}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 4, height: '100%', border: '1px solid rgba(117,89,77,0.14)', bgcolor: '#fff', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>السلة · {props.cartItems.length} صنف</Typography>
              <Box sx={{ flex: 1, overflowY: 'auto', mb: 1.5 }}>
                {props.cartItems.length === 0 ? (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>اضغط على الأصناف لإضافتها.</Alert>
                ) : (
                  <Stack spacing={1}>
                    {props.cartItems.map((item) => (
                      <Paper key={item.productId} variant="outlined" sx={{ p: 1.25, borderRadius: 2.5 }}>
                        <Stack spacing={0.75}>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Typography fontWeight={700} fontSize="0.95rem" sx={{ flex: '0 1 auto' }}>{item.name}</Typography>
                            <TextField
                              size="small"
                              placeholder="ملاحظة الصنف"
                              value={item.note}
                              onChange={(e) => props.onUpdateNote(item.productId, e.target.value)}
                              sx={{ flex: 1, minWidth: 100 }}
                            />
                            <Typography fontWeight={800} sx={{ ml: 'auto' }}>{formatCurrency(item.unitPrice * item.quantity)}</Typography>
                          </Stack>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <IconButton size="small" onClick={() => props.onUpdateQty(item.productId, item.quantity - 1)}>−</IconButton>
                            <Chip label={item.quantity} size="small" />
                            <IconButton size="small" onClick={() => props.onUpdateQty(item.productId, item.quantity + 1)}>+</IconButton>
                            <Typography variant="caption" color="text.secondary">{formatCurrency(item.unitPrice)}</Typography>
                          </Stack>
                          {props.sauces && props.sauces.length > 0 ? (
                            <>
                              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                صوصات (مجاناً)
                              </Typography>
                              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                              {props.sauces.map((sauce) => {
                                const selected = item.sauces?.includes(sauce.name) ?? false;
                                return (
                                  <Chip
                                    key={`${item.productId}-${sauce.id}`}
                                    label={sauce.name}
                                    size="small"
                                    clickable
                                    color={selected ? 'primary' : 'default'}
                                    variant={selected ? 'filled' : 'outlined'}
                                    onClick={() => props.onToggleItemSauce?.(item.productId, sauce.name)}
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
              </Box>
              <Stack spacing={1.25}>
                <Grid2 container spacing={1}>
                  <Grid2 size={6}>
                    <TextField select size="small" fullWidth label="الدفع" value={props.paymentMethod} onChange={(e) => props.onPaymentMethod(e.target.value)}>
                      {props.paymentMethods.map((m) => <MenuItem key={m.id} value={m.id}>{m.label}</MenuItem>)}
                    </TextField>
                  </Grid2>
                  <Grid2 size={6}>
                    <TextField select size="small" fullWidth label="التحصيل" value={props.collectionStatus} onChange={(e) => props.onCollectionStatus(e.target.value as CollectionStatus)}>
                      <MenuItem value="approved">تم التحصيل (الدرج)</MenuItem>
                      <MenuItem value="uncollected">لم يُحصّل بعد</MenuItem>
                    </TextField>
                  </Grid2>
                  <Grid2 size={6}>
                    <TextField size="small" fullWidth label="خصم" type="number" value={props.discountAmount} onChange={(e) => props.onDiscountAmount(e.target.value)} />
                  </Grid2>
                  <Grid2 size={12}>
                    <TextField size="small" fullWidth label="ملاحظة الطلب" value={props.orderNote} onChange={(e) => props.onOrderNote(e.target.value)} multiline minRows={2} />
                  </Grid2>
                </Grid2>
                <Paper sx={{ p: 1.5, borderRadius: 2.5, bgcolor: 'rgba(185,56,23,0.06)' }}>
                  <Stack spacing={0.5}>
                    <Stack direction="row" justifyContent="space-between"><Typography variant="body2">قبل الخصم</Typography><Typography fontWeight={700}>{formatCurrency(props.subtotal)}</Typography></Stack>
                    <Stack direction="row" justifyContent="space-between"><Typography variant="body2">خصم</Typography><Typography fontWeight={700}>{formatCurrency(props.discount)}</Typography></Stack>
                    <Divider />
                    <Stack direction="row" justifyContent="space-between"><Typography fontWeight={800}>الإجمالي</Typography><Typography fontWeight={800} color="primary.main">{formatCurrency(props.total)}</Typography></Stack>
                  </Stack>
                </Paper>
              </Stack>
            </Paper>
          </Grid2>
        </Grid2>
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5, borderTop: '1px solid rgba(117,89,77,0.12)', bgcolor: 'rgba(255,250,244,0.98)' }}>
        <Button onClick={props.onClearCart}>إفراغ</Button>
        <Button onClick={props.onClose}>إلغاء</Button>
        <Button variant="outlined" disabled={props.cartItems.length === 0} onClick={async () => {
          const check = props.validateTakeawayCustomer?.();
          if (check && !check.ok) {
            setShowFieldErrors(true);
            setValidationError(check.error);
            return;
          }
          setShowFieldErrors(false);
          const res = await props.onSuspend();
          if (!res?.ok && (res as any)?.error) setValidationError((res as any).error);
        }}>تعليق</Button>
        <Button
          variant="contained"
          disabled={props.cartItems.length === 0}
          onClick={handleCloseOrder}
          sx={{ fontWeight: 800, px: 3 }}
        >
          إغلاق وتأكيد · {formatCurrency(props.total)}
        </Button>
        <Button
          variant="text"
          disabled={props.cartItems.length === 0}
          onClick={openReview}
          sx={{ fontWeight: 700 }}
        >
          مراجعة
        </Button>
      </DialogActions>

      <OrderConfirmDialog
        open={confirmOpen}
        orderCode={props.currentOrderCode}
        orderType={props.orderType}
        orderOwnerName={props.orderOwnerName}
        customerPhone={props.customerPhone}
        customerAddress={props.customerAddress}
        captainName={props.captainName}
        cartItems={props.cartItems}
        paymentMethod={props.paymentMethod}
        paymentMethods={props.paymentMethods}
        collectionStatus={props.collectionStatus}
        discount={props.discount}
        subtotal={props.subtotal}
        total={props.total}
        orderNote={props.orderNote}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleCloseOrder}
      />
    </Dialog>
  );
}
