import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid2,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SectionCard, MetricCard } from './shared.js';
import { cardSx, ui } from '../lib/ui-tokens.js';
import { useAuth } from '../lib/auth-context.js';
import { invalidatePosCatalog, useBranches } from '../lib/hooks.js';

import { API_BASE } from '../lib/api-client.js';

export function CatalogPage() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const { data: branchList = [] } = useBranches();
  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  }), [accessToken]);

  const [branchId, setBranchId] = useState('');

  // Product Categories
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [categoryName, setCategoryName] = useState('');

  // Products
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  // Recipes for linking
  const [existingRecipes, setExistingRecipes] = useState<any[]>([]);
  const [recipesLoaded, setRecipesLoaded] = useState(false);

  // Product dialog with recipe linking
  const [productDialog, setProductDialog] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    categoryId: '',
    salePrice: '0',
    estimatedCost: '0',
    isAvailable: true,
  });
  const [editingProductId, setEditingProductId] = useState('');
  const [recipeAction, setRecipeAction] = useState<'none' | 'link_existing' | 'create_new'>('none');
  const [selectedRecipeId, setSelectedRecipeId] = useState('');

  const [msg, setMsg] = useState('');
  const [snack, setSnack] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load first available branch
  useEffect(() => {
    if (branchList.length && !branchId) setBranchId(branchList[0].id);
  }, [branchList, branchId]);

  const fetchCategories = useCallback(async () => {
    if (!branchId || !accessToken) return;
    try {
      const res = await fetch(`${API_BASE}/product-categories?branchId=${branchId}`, { headers });
      if (res.ok) setCategories(await res.json());
    } catch {}
  }, [branchId, accessToken, headers]);

  const fetchProducts = useCallback(async () => {
    if (!branchId || !accessToken) return;
    try {
      const params = new URLSearchParams({ branchId });
      if (selectedCategoryId) params.set('categoryId', selectedCategoryId);
      const res = await fetch(`${API_BASE}/products?${params}`, { headers });
      if (res.ok) setProducts(await res.json());
    } catch {}
  }, [branchId, selectedCategoryId, accessToken, headers]);

  const fetchRecipes = useCallback(async () => {
    if (!branchId || !accessToken) return;
    try { const r = await fetch(`${API_BASE}/recipes?branchId=${branchId}`, { headers }); if (r.ok) setExistingRecipes(await r.json()); } catch {}
  }, [branchId, accessToken, headers]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => {
    if (branchId && accessToken && !recipesLoaded) {
      fetchRecipes();
      setRecipesLoaded(true);
    }
  }, [branchId, accessToken, recipesLoaded, fetchRecipes]);

  const createCategory = async () => {
    if (!categoryName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/product-categories`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ branchId, name: categoryName.trim() }),
      });
      if (res.ok) {
        setMsg('✅ تمت إضافة الفئة بنجاح');
        setCategoryName('');
        setCategoryDialog(false);
        fetchCategories();
      } else {
        const err = await res.json();
        setMsg(`❌ ${err.message || 'حدث خطأ'}`);
      }
    } catch { setMsg('❌ فشل الاتصال بالسيرفر'); }
    setLoading(false);
    setSnack(true);
  };

  const deleteCategory = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/product-categories/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        setMsg('✅ تم حذف الفئة');
        fetchCategories();
      } else {
        const err = await res.json();
        setMsg(`❌ ${err.message || 'حدث خطأ'}`);
      }
    } catch { setMsg('❌ فشل الاتصال'); }
    setLoading(false);
    setSnack(true);
  };

  const createProduct = async () => {
    if (!productForm.name.trim() || !productForm.categoryId) return;
    setLoading(true);
    try {
      const isEditing = !!editingProductId;

      // 1. أنشئ أو حدث المنتج
      const url = isEditing ? `${API_BASE}/products/${editingProductId}` : `${API_BASE}/products`;
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          branchId,
          categoryId: productForm.categoryId,
          name: productForm.name.trim(),
          sku: productForm.sku.trim() || null,
          salePrice: Number(productForm.salePrice) || 0,
          estimatedCost: Number(productForm.estimatedCost) || null,
          isAvailable: productForm.isAvailable,
        }),
      });
      if (!res.ok) { const err = await res.json(); setMsg(`❌ ${err.message || 'حدث خطأ'}`); setLoading(false); setSnack(true); return; }

      const productResult = await res.json();
      const productId = productResult.id || editingProductId;

      // 2. لو في وضع الإضافة فقط — وصفة
      if (!isEditing) {
        if (recipeAction === 'link_existing' && selectedRecipeId) {
          const recipeRes = await fetch(`${API_BASE}/recipes/${selectedRecipeId}`, {
            method: 'PUT', headers,
            body: JSON.stringify({ productId, name: productForm.name.trim(), isActive: true }),
          });
          if (!recipeRes.ok) {
            setMsg('✅ تمت إضافة المنتج لكن فشل ربط الوصفة');
          } else {
            setMsg('✅ تمت إضافة المنتج وربطه بالوصفة بنجاح');
          }
        } else if (recipeAction === 'create_new') {
          const recipeRes = await fetch(`${API_BASE}/recipes`, {
            method: 'POST', headers,
            body: JSON.stringify({ branchId, productId, name: productForm.name.trim() }),
          });
          if (recipeRes.ok) {
            setMsg('✅ تمت إضافة المنتج والوصفة بنجاح');
            setRecipesLoaded(false);
          } else {
            setMsg('✅ تمت إضافة المنتج لكن فشل إنشاء الوصفة تلقائياً');
          }
        } else {
          setMsg('✅ تمت إضافة المنتج بنجاح');
        }
      } else {
        setMsg('✅ تم تحديث المنتج بنجاح');
      }

      setProductDialog(false);
      setEditingProductId('');
      setProductForm({ name: '', sku: '', categoryId: '', salePrice: '0', estimatedCost: '0', isAvailable: true });
      setRecipeAction('none');
      setSelectedRecipeId('');
      fetchProducts();
      invalidatePosCatalog(queryClient);
    } catch { setMsg('❌ فشل الاتصال'); }
    setLoading(false);
    setSnack(true);
  };

  const toggleAvailability = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/products/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ isAvailable: !current }),
      });
      if (res.ok) {
        fetchProducts();
        invalidatePosCatalog(queryClient);
      }
    } catch {}
  };

  const deleteProduct = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        setMsg('✅ تم حذف المنتج');
        fetchProducts();
      }
    } catch {}
    setLoading(false);
    setSnack(true);
  };

  const stats = useMemo(() => [
    { label: 'إجمالي الفئات', value: String(categories.length), note: 'فئات المنيو', progress: 100, tone: 'info' },
    { label: 'إجمالي المنتجات', value: String(products.length), note: 'صنف في المنيو', progress: products.length > 0 ? 72 : 0, tone: 'success' },
    { label: 'متوسط السعر', value: products.length > 0 ? `${(products.reduce((s: number, p: any) => s + p.salePrice, 0) / products.length).toFixed(0)} ج.م` : '—', note: 'متوسط أسعار البيع', progress: 60, tone: 'primary' },
    { label: 'غير متاح', value: String(products.filter((p: any) => !p.isAvailable).length), note: 'منتجات غير متاحة للبيع', progress: 30, tone: 'warning' },
  ], [categories, products]);

  return (
    <Stack spacing={2.5}>
      {msg && <Snackbar open={snack} autoHideDuration={3000} onClose={() => setSnack(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={msg.startsWith('✅') ? 'success' : 'error'} sx={{ width: '100%' }}>{msg}</Alert>
      </Snackbar>}

      <Grid2 container spacing={2}>
        {stats.map((card) => (
          <Grid2 size={{ xs: 12, md: 6, xl: 3 }} key={card.label}>
            <MetricCard {...card} />
          </Grid2>
        ))}
      </Grid2>

      {/* Categories */}
      <SectionCard
        title="فئات المنتجات"
        description="إدارة تصنيفات المنيو"
        action={<Button variant="contained" onClick={() => setCategoryDialog(true)}>إضافة فئة</Button>}
      >
        <Paper elevation={0} sx={{ borderRadius: 4, overflow: 'hidden', border: `1px solid ${ui.border}` }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>الفئة</TableCell>
                <TableCell align="left">عدد المنتجات</TableCell>
                <TableCell align="left">تاريخ الإنشاء</TableCell>
                <TableCell align="left">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.length === 0 && (
                <TableRow><TableCell colSpan={4} align="center">لا توجد فئات بعد، أضف فئة جديدة</TableCell></TableRow>
              )}
              {categories.map((cat) => (
                <TableRow key={cat.id} hover>
                  <TableCell><Typography fontWeight={700}>{cat.name}</Typography></TableCell>
                  <TableCell align="left">{products.filter((p: any) => p.categoryId === cat.id).length}</TableCell>
                  <TableCell align="left">{new Date(cat.createdAt).toLocaleDateString('ar-EG')}</TableCell>
                  <TableCell align="left">
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="outlined" color="error" onClick={() => deleteCategory(cat.id)}>حذف</Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </SectionCard>

      {/* Products */}
      <SectionCard
        title="المنتجات"
        description="إدارة أصناف المنيو"
        action={
          <Stack direction="row" spacing={1}>
            <TextField select label="فلتر بالفئة" size="small" value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)} sx={{ minWidth: 180 }}>
              <MenuItem value="">كل الفئات</MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
              ))}
            </TextField>
            <Button variant="contained" onClick={() => {
              setProductForm((f) => ({ ...f, categoryId: selectedCategoryId || categories[0]?.id || '' }));
              setRecipeAction('none');
              setSelectedRecipeId('');
              setProductDialog(true);
            }}>
              إضافة منتج
            </Button>
          </Stack>
        }
      >
        <Paper elevation={0} sx={{ borderRadius: 4, overflow: 'hidden', border: `1px solid ${ui.border}` }}>
          <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>المنتج</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell align="left">السعر</TableCell>
                  <TableCell align="left">التكلفة</TableCell>
                  <TableCell align="left">الوصفة</TableCell>
                  <TableCell align="left">الحالة</TableCell>
                  <TableCell align="left">إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.length === 0 && (
                  <TableRow><TableCell colSpan={7} align="center">لا توجد منتجات بعد</TableCell></TableRow>
                )}
                {products.map((prod) => {
                  const linkedRecipe = existingRecipes.find((r: any) => r.productId === prod.id);
                  return (
                    <TableRow key={prod.id} hover>
                      <TableCell><Typography fontWeight={700}>{prod.name}</Typography></TableCell>
                      <TableCell>{prod.sku || '—'}</TableCell>
                      <TableCell align="left">{prod.salePrice.toLocaleString()} ج.م</TableCell>
                      <TableCell align="left">{prod.estimatedCost ? `${prod.estimatedCost.toLocaleString()} ج.م` : '—'}</TableCell>
                      <TableCell align="left">
                        {linkedRecipe ? (
                          <Chip size="small" label={`وصفة: ${linkedRecipe.name}`} color="primary" variant="outlined" />
                        ) : (
                          <Chip size="small" label="بدون" color="default" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell align="left">
                        <Chip
                          size="small"
                          label={prod.isAvailable ? 'متاح' : 'غير متاح'}
                          color={prod.isAvailable ? 'success' : 'error'}
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell align="left">
                        <Stack direction="row" spacing={1}>
                          <Button size="small" variant="outlined" onClick={() => {
                            setProductForm({
                              name: prod.name,
                              sku: prod.sku || '',
                              categoryId: prod.categoryId,
                              salePrice: String(prod.salePrice),
                              estimatedCost: String(prod.estimatedCost || ''),
                              isAvailable: prod.isAvailable,
                            });
                            setEditingProductId(prod.id);
                            setRecipeAction('none');
                            setSelectedRecipeId('');
                            setProductDialog(true);
                          }}>
                            تعديل
                          </Button>
                          <Button size="small" variant="outlined" onClick={() => toggleAvailability(prod.id, prod.isAvailable)}>
                            {prod.isAvailable ? 'تعطيل' : 'تفعيل'}
                          </Button>
                          <Button size="small" variant="outlined" color="error" onClick={() => deleteProduct(prod.id)}>حذف</Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
          </Table>
        </Paper>
      </SectionCard>

      {/* Category Dialog */}
      <Dialog open={categoryDialog} onClose={() => setCategoryDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>إضافة فئة جديدة</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="اسم الفئة" fullWidth value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={createCategory} disabled={loading}>حفظ</Button>
        </DialogActions>
      </Dialog>

      {/* Product Dialog */}
      <Dialog open={productDialog} onClose={() => setProductDialog(false)} fullWidth maxWidth="md">
        <DialogTitle>إضافة منتج جديد</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Grid2 container spacing={1.5}>
              <Grid2 size={{ xs: 12, md: 6 }}>
                <TextField label="اسم المنتج" fullWidth value={productForm.name} onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))} />
              </Grid2>
              <Grid2 size={{ xs: 12, md: 3 }}>
                <TextField label="SKU (كود)" fullWidth value={productForm.sku} onChange={(e) => setProductForm((f) => ({ ...f, sku: e.target.value }))} />
              </Grid2>
              <Grid2 size={{ xs: 12, md: 3 }}>
                <TextField select label="الفئة" fullWidth value={productForm.categoryId} onChange={(e) => setProductForm((f) => ({ ...f, categoryId: e.target.value }))}>
                  {categories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                  ))}
                </TextField>
              </Grid2>
            </Grid2>
            <Grid2 container spacing={1.5}>
              <Grid2 size={{ xs: 12, md: 4 }}>
                <TextField label="سعر البيع" type="number" fullWidth value={productForm.salePrice} onChange={(e) => setProductForm((f) => ({ ...f, salePrice: e.target.value }))} />
              </Grid2>
              <Grid2 size={{ xs: 12, md: 4 }}>
                <TextField label="التكلفة التقديرية" type="number" fullWidth value={productForm.estimatedCost} onChange={(e) => setProductForm((f) => ({ ...f, estimatedCost: e.target.value }))} />
              </Grid2>
              <Grid2 size={{ xs: 12, md: 4 }}>
                <TextField select label="متاح للبيع" fullWidth value={productForm.isAvailable ? 'true' : 'false'} onChange={(e) => setProductForm((f) => ({ ...f, isAvailable: e.target.value === 'true' }))}>
                  <MenuItem value="true">متاح</MenuItem>
                  <MenuItem value="false">غير متاح</MenuItem>
                </TextField>
              </Grid2>
            </Grid2>

            {/* Recipe Linking Section */}
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: ui.successBg, border: `1px solid ${ui.successBorder}` }}>
              <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
                🔗 ربط الوصفة (لخصم المخزون تلقائياً عند البيع)
              </Typography>
              <TextField select label="إجراء الوصفة" fullWidth value={recipeAction} onChange={(e) => setRecipeAction(e.target.value as any)}>
                <MenuItem value="none">بدون وصفة (مشروبات/إضافات)</MenuItem>
                <MenuItem value="link_existing">ربط وصفة موجودة</MenuItem>
                <MenuItem value="create_new">إنشاء وصفة جديدة بنفس الاسم</MenuItem>
              </TextField>

              {recipeAction === 'link_existing' && (
                <TextField select label="اختر الوصفة" fullWidth value={selectedRecipeId} onChange={(e) => setSelectedRecipeId(e.target.value)} sx={{ mt: 1.5 }}>
                  {existingRecipes
                    .filter((r: any) => !r.productId || r.productId === '')
                    .map((r: any) => (
                      <MenuItem key={r.id} value={r.id}>{r.name} {r.isActive ? '(نشط)' : ''}</MenuItem>
                    ))}
                  {existingRecipes.filter((r: any) => !r.productId || r.productId === '').length === 0 && (
                    <MenuItem disabled value="">لا توجد وصفات غير مرتبطة — أضف وصفة أولاً</MenuItem>
                  )}
                </TextField>
              )}

              {recipeAction === 'create_new' && (
                <Alert severity="info" sx={{ mt: 1.5 }}>
                  سيتم إنشاء وصفة جديدة باسم "{productForm.name.trim() || '...'}" وربطها بالمنتج تلقائياً. افتح شاشة الوصفات لإضافة المكونات.
                </Alert>
              )}
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProductDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={createProduct} disabled={loading}>حفظ المنتج</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}