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
import { getCollectionStatusLabel, validateTakeawayOrderFields, cartLineKey, type CartItem, type CollectionStatus, type OrderType } from '../../../lib/pos-store.js';
import type { PaymentMethodOption } from '../constants.js';
import { collectionTone, formatCurrency } from '../utils.js';
import { cardSx, ui } from '../../../lib/ui-tokens.js';
import { OrderTypeToggle } from './order-type-toggle.js';
import { OrderConfirmDialog } from './order-confirm-dialog.js';
import type { DeliveryDriver } from '../../../lib/pos-receipt-settings.js';
import { CustomerPhoneField, type CustomerSearchHit } from '../../../components/customer-phone-field.js';
import { CaptainNameField } from '../../../components/captain-name-field.js';
import { useState, useEffect, useMemo, useRef, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { DailyPlan } from '../production-plan-utils.js';
import {
  planRemaining,
  planSoldAdjustment,
  planStatusLabel,
  planVisualStatus,
  summarizeCartPlanAlerts,
} from '../production-plan-utils.js';

type OrderModalProps = {
  open: boolean;
  mode?: 'create' | 'edit';
  editBaselineQty?: Map<string, number>;
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
  onUpdateQty: (lineKey: string, qty: number, productMeta?: { name: string; dailyPlan?: DailyPlan }) => void;
  onUpdateUnitPrice: (lineKey: string, unitPrice: number) => void;
  onUpdateNote: (lineKey: string, note: string) => void;
  onAddCustomLine?: (name: string, unitPrice: number) => boolean;
  customLineProductId?: string | null;
  paymentMethods: PaymentMethodOption[];
  paymentMethod: string;
  onPaymentMethod: (v: string) => void;
  onCollectionStatus: (v: CollectionStatus) => void;
  discountAmount: string;
  onDiscountAmount: (v: string) => void;
  orderNote: string;
  onOrderNote: (v: string) => void;
  sauces?: Array<{ id: string; name: string }>;
  paidSauceProductIds?: string[];
  onToggleItemSauce?: (lineKey: string, sauceName: string) => void;
  subtotal: number;
  discount: number;
  total: number;
  onClose: () => void;
  onSuspend: () => void | Promise<{ ok: boolean; error?: string } | undefined>;
  onCloseOrder: () => void | Promise<void>;
  onSaveEdit?: () => void | Promise<{ ok: boolean; error?: string } | undefined>;
  onClearCart: () => void;
  deliveryDrivers?: DeliveryDriver[];
  validateTakeawayCustomer?: () => { ok: true } | { ok: false; error: string };
  catalogPending?: boolean;
};

const PRODUCT_COLS = 4;
const PRODUCT_ROW_HEIGHT = 112;

const ProductCard = memo(function ProductCard({
  product,
  qty,
  isEdit,
  editBaselineQty,
  onAddProduct,
}: {
  product: any;
  qty: number;
  isEdit: boolean;
  editBaselineQty: Map<string, number>;
  onAddProduct: (p: any) => void;
}) {
  const plan = product.dailyPlan as DailyPlan | undefined;
  const soldAdj = plan ? planSoldAdjustment(isEdit, editBaselineQty.get(product.id) ?? 0) : 0;
  const remaining = plan ? planRemaining(plan, qty, soldAdj) : null;
  const status = plan ? planVisualStatus(plan, qty, soldAdj) : null;
  const chip = status ? (() => {
    if (status === 'exceeded') return { color: 'error' as const, variant: 'filled' as const };
    if (status === 'exhausted') return { color: 'warning' as const, variant: 'filled' as const };
    if (status === 'low') return { color: 'warning' as const, variant: 'outlined' as const };
    return { color: 'success' as const, variant: 'outlined' as const };
  })() : null;

  return (
    <Grid2 size={{ xs: 6, sm: 4, lg: 3 }}>
      <Card
        elevation={0}
        sx={{
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
        }}
      >
        <CardActionArea disabled={!product.isAvailable} onClick={() => onAddProduct(product)}>
          <CardContent sx={{ p: 1.5 }}>
            <Stack spacing={0.75}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={0.5}>
                <Typography fontWeight={700} fontSize="0.9rem" lineHeight={1.3}>{product.name}</Typography>
                <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                  {plan && chip ? (
                    <>
                      <Chip
                        size="small"
                        label={`${plan.sold + soldAdj + qty}/${plan.planned}`}
                        {...chip}
                        sx={{ height: 22, fontSize: '0.68rem', fontWeight: 800 }}
                      />
                      {remaining != null && remaining >= 0 ? (
                        <Chip size="small" label={`متب ${remaining}`} color={status === 'low' ? 'warning' : 'default'} variant="outlined" sx={{ height: 22, fontSize: '0.65rem', fontWeight: 700 }} />
                      ) : remaining != null && remaining < 0 ? (
                        <Chip size="small" label={`+${Math.abs(remaining)}`} color="error" sx={{ height: 22, fontSize: '0.65rem', fontWeight: 800 }} />
                      ) : null}
                    </>
                  ) : null}
                  {qty > 0 ? <Chip size="small" color="primary" label={qty} sx={{ minWidth: 28, fontWeight: 800 }} /> : null}
                </Stack>
              </Stack>
              <Typography fontWeight={800} color="primary.main">{formatCurrency(product.salePrice)}</Typography>
              {!product.isAvailable ? <Typography variant="caption" color="error">موقوف</Typography> : null}
            </Stack>
          </CardContent>
        </CardActionArea>
      </Card>
    </Grid2>
  );
});

export function OrderModal(props: OrderModalProps) {
  const isEdit = props.mode === 'edit';
  const editBaselineQty = props.editBaselineQty ?? new Map<string, number>();
  const tone = collectionTone(props.collectionStatus);

  const productMetaMap = useMemo(() => {
    const m = new Map<string, { name: string; dailyPlan?: DailyPlan }>();
    props.products.forEach((p: any) => {
      if (p.dailyPlan) m.set(p.id, { name: p.name, dailyPlan: p.dailyPlan as DailyPlan });
    });
    return m;
  }, [props.products]);

  const getPlanMeta = (productId: string, fallbackName: string) =>
    productMetaMap.get(productId) ?? { name: fallbackName };

  const cartPlanAlerts = useMemo(
    () => summarizeCartPlanAlerts(
      props.cartItems,
      (id) => productMetaMap.get(id)?.dailyPlan,
      isEdit,
      editBaselineQty,
    ),
    [props.cartItems, productMetaMap, isEdit, editBaselineQty],
  );

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
      if (res && !res.ok && res.error) setValidationError(res.error);
    });
  };
  const handleCloseOrder = () => {
    if (closingBusy) return;
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
  const productListRef = useRef<HTMLDivElement>(null);

  const visibleProducts = useMemo(() => {
    const q = props.productSearch.trim().toLowerCase();
    return props.products.filter((p: any) => {
      const catOk = props.activeCategory === props.allCategoriesKey || p.categoryId === props.activeCategory;
      const searchOk = !q || p.name.toLowerCase().includes(q);
      return catOk && searchOk;
    });
  }, [props.products, props.activeCategory, props.allCategoriesKey, props.productSearch]);

  const productRows = useMemo(() => {
    const rows: any[][] = [];
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

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      fullScreen={props.fullScreen}
      maxWidth="xl"
      fullWidth
      PaperProps={{ sx: { borderRadius: props.fullScreen ? 0 : 4, bgcolor: '#faf6f1' } }}
    >
      <DialogTitle sx={{ pb: 1, borderBottom: `1px solid ${ui.border}`, bgcolor: ui.paper }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
          <Box>
            <Typography variant="h6" fontWeight={800}>
              {isEdit
                ? `تعديل الفاتورة · طلب ${props.currentOrderCode}`
                : props.orderType === 'takeaway'
                  ? 'طلب تيك أواي'
                  : 'إنشاء طلب'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isEdit
                ? `تعديل الأصناف والبيانات · الكاشير: ${props.operatorName}`
                : `${props.currentOrderCode ? `طلب رقم ${props.currentOrderCode}` : 'طلب جديد'} · الكاشير: ${props.operatorName}`}
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
                {props.customLineProductId && props.onAddCustomLine ? (
                  <Grid2 size={{ xs: 12, sm: 6 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      sx={{ height: 40, fontWeight: 700 }}
                      onClick={() => {
                        setCustomLineName('');
                        setCustomLinePrice('0');
                        setCustomLineOpen(true);
                      }}
                    >
                      + صنف يدوي
                    </Button>
                  </Grid2>
                ) : null}
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
                  <OrderTypeToggle value={props.orderType} onChange={props.onOrderTypeChange} disabled={isEdit} />
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

              <Box ref={productListRef} sx={{ flex: 1, overflowY: 'auto', pr: 0.5 }}>
                {props.catalogPending ? (
                  <Stack alignItems="center" justifyContent="center" py={4}>
                    <CircularProgress size={32} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>جاري تحميل الأصناف…</Typography>
                  </Stack>
                ) : (
                <Box sx={{ height: productRowVirtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
                  {productRowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const rowProducts = productRows[virtualRow.index] ?? [];
                    return (
                      <Box
                        key={virtualRow.key}
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <Grid2 container spacing={1.25}>
                          {rowProducts.map((product: any) => (
                            <ProductCard
                              key={product.id}
                              product={product}
                              qty={props.cartQtyMap.get(product.id) ?? 0}
                              isEdit={isEdit}
                              editBaselineQty={editBaselineQty}
                              onAddProduct={props.onAddProduct}
                            />
                          ))}
                        </Grid2>
                      </Box>
                    );
                  })}
                </Box>
                )}
                {!props.catalogPending && visibleProducts.length === 0 ? (
                  <Alert severity="info" sx={{ mt: 1 }}>لا توجد أصناف مطابقة.</Alert>
                ) : null}
              </Box>
            </Stack>
          </Grid2>

          <Grid2 size={{ xs: 12, md: 5 }} sx={{ height: '100%' }}>
            <Paper elevation={0} sx={{ ...cardSx, p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>السلة · {props.cartItems.length} صنف</Typography>
              {cartPlanAlerts.length > 0 ? (
                <Alert severity="warning" sx={{ borderRadius: 2, mb: 1.5, py: 0.5 }}>
                  <Stack spacing={0.25}>
                    <Typography variant="caption" fontWeight={800}>تنبيهات خطة الإنتاج</Typography>
                    {cartPlanAlerts.map((line) => (
                      <Typography key={line} variant="caption" display="block">{line}</Typography>
                    ))}
                  </Stack>
                </Alert>
              ) : null}
              <Box sx={{ flex: 1, overflowY: 'auto', mb: 1.5 }}>
                {props.cartItems.length === 0 ? (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>اضغط على الأصناف لإضافتها.</Alert>
                ) : (
                  <Stack spacing={1}>
                    {props.cartItems.map((item) => {
                      const lineKey = cartLineKey(item);
                      const isCustomLine = props.customLineProductId != null && item.productId === props.customLineProductId;
                      const plan = productMetaMap.get(item.productId)?.dailyPlan;
                      const soldAdj = plan ? planSoldAdjustment(isEdit, editBaselineQty.get(item.productId) ?? 0) : 0;
                      const planLabel = plan ? planStatusLabel(plan, item.quantity, soldAdj) : null;
                      const planStatus = plan ? planVisualStatus(plan, item.quantity, soldAdj) : null;
                      return (
                      <Paper key={lineKey} variant="outlined" sx={{
                        p: 1.25,
                        borderRadius: 2.5,
                        borderColor: planStatus === 'exceeded' ? 'error.main' : planStatus === 'low' || planStatus === 'exhausted' ? 'warning.main' : undefined,
                        bgcolor: planStatus === 'exceeded' ? 'rgba(239,68,68,0.04)' : undefined,
                      }}>
                        <Stack spacing={0.75}>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Typography fontWeight={700} fontSize="0.95rem" sx={{ flex: '0 1 auto' }}>{item.name}</Typography>
                            {planLabel ? (
                              <Chip
                                size="small"
                                label={planLabel}
                                color={planStatus === 'exceeded' ? 'error' : 'warning'}
                                variant={planStatus === 'exceeded' ? 'filled' : 'outlined'}
                                sx={{ height: 22, fontSize: '0.68rem', fontWeight: 700 }}
                              />
                            ) : null}
                            <TextField
                              size="small"
                              placeholder="ملاحظة الصنف"
                              value={item.note}
                              onChange={(e) => props.onUpdateNote(lineKey, e.target.value)}
                              sx={{ flex: 1, minWidth: 100 }}
                            />
                            <Typography fontWeight={800} sx={{ ml: 'auto' }}>{formatCurrency(item.unitPrice * item.quantity)}</Typography>
                          </Stack>
                          <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                            <IconButton size="small" onClick={() => props.onUpdateQty(lineKey, item.quantity - 1, getPlanMeta(item.productId, item.name))}>−</IconButton>
                            <Chip label={item.quantity} size="small" />
                            <IconButton size="small" onClick={() => props.onUpdateQty(lineKey, item.quantity + 1, getPlanMeta(item.productId, item.name))}>+</IconButton>
                            <TextField
                              size="small"
                              type="number"
                              label="السعر"
                              value={item.unitPrice}
                              onChange={(e) => props.onUpdateUnitPrice(lineKey, Number(e.target.value) || 0)}
                              inputProps={{ min: 0, step: 0.5 }}
                              sx={{ width: 110 }}
                            />
                          </Stack>
                          {props.sauces && props.sauces.length > 0 && !paidSauceIds.has(item.productId) && !isCustomLine ? (
                            <>
                              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                صوصات (مجاناً)
                              </Typography>
                              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                              {props.sauces.map((sauce) => {
                                const selected = item.sauces?.includes(sauce.name) ?? false;
                                return (
                                  <Chip
                                    key={`${lineKey}-${sauce.id}`}
                                    label={sauce.name}
                                    size="small"
                                    clickable
                                    color={selected ? 'primary' : 'default'}
                                    variant={selected ? 'filled' : 'outlined'}
                                    onClick={() => props.onToggleItemSauce?.(lineKey, sauce.name)}
                                  />
                                );
                              })}
                              </Stack>
                            </>
                          ) : null}
                        </Stack>
                      </Paper>
                    );})}
                  </Stack>
                )}
              </Box>
              <Stack spacing={1.25}>
                <Grid2 container spacing={1}>
                  <Grid2 size={6}>
                    <TextField select size="small" fullWidth label="الدفع" value={props.paymentMethod} onChange={(e) => props.onPaymentMethod(e.target.value)} disabled={isEdit}>
                      {props.paymentMethods.map((m) => <MenuItem key={m.id} value={m.id}>{m.label}</MenuItem>)}
                    </TextField>
                  </Grid2>
                  <Grid2 size={6}>
                    <TextField select size="small" fullWidth label="التحصيل" value={props.collectionStatus} onChange={(e) => props.onCollectionStatus(e.target.value as CollectionStatus)} disabled={isEdit}>
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

      <DialogActions sx={{ px: 2, py: 1.5, borderTop: `1px solid ${ui.border}`, bgcolor: ui.paper }}>
        {!isEdit ? <Button onClick={props.onClearCart}>إفراغ</Button> : null}
        <Button onClick={props.onClose}>إلغاء</Button>
        {!isEdit ? (
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
        ) : null}
        <Button
          variant="contained"
          disabled={props.cartItems.length === 0 || closingBusy}
          onClick={isEdit ? () => void handleSaveEdit() : handleCloseOrder}
          sx={{ fontWeight: 800, px: 3 }}
        >
          {closingBusy
            ? 'جاري الإغلاق…'
            : isEdit
              ? `حفظ التعديلات · ${formatCurrency(props.total)}`
              : `إغلاق وتأكيد · ${formatCurrency(props.total)}`}
        </Button>
        {!isEdit ? (
          <Button
            variant="text"
            disabled={props.cartItems.length === 0}
            onClick={openReview}
            sx={{ fontWeight: 700 }}
          >
            مراجعة
          </Button>
        ) : null}
      </DialogActions>

      {!isEdit ? (
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
        busy={closingBusy}
      />
      ) : null}

      <Dialog open={customLineOpen} onClose={() => setCustomLineOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>إضافة صنف يدوي</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              autoFocus
              label="اسم الصنف"
              value={customLineName}
              onChange={(e) => setCustomLineName(e.target.value)}
              fullWidth
            />
            <TextField
              label="السعر"
              type="number"
              value={customLinePrice}
              onChange={(e) => setCustomLinePrice(e.target.value)}
              inputProps={{ min: 0, step: 0.5 }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomLineOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={!customLineName.trim()}
            onClick={() => {
              const ok = props.onAddCustomLine?.(customLineName, Number(customLinePrice) || 0);
              if (ok) setCustomLineOpen(false);
            }}
          >
            إضافة
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
