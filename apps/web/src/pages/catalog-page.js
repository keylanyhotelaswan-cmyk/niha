import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid2, MenuItem, Paper, Snackbar, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, } from '@mui/material';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SectionCard, MetricCard } from './shared.js';
import { ui } from '../lib/ui-tokens.js';
import { useAuth } from '../lib/auth-context.js';
import { invalidatePosQueries, useBranches } from '../lib/hooks.js';
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
    const [categories, setCategories] = useState([]);
    const [categoryDialog, setCategoryDialog] = useState(false);
    const [categoryName, setCategoryName] = useState('');
    // Products
    const [products, setProducts] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    // Recipes for linking
    const [existingRecipes, setExistingRecipes] = useState([]);
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
    const [recipeAction, setRecipeAction] = useState('none');
    const [selectedRecipeId, setSelectedRecipeId] = useState('');
    const [msg, setMsg] = useState('');
    const [snack, setSnack] = useState(false);
    const [loading, setLoading] = useState(false);
    // Load first available branch
    useEffect(() => {
        if (branchList.length && !branchId)
            setBranchId(branchList[0].id);
    }, [branchList, branchId]);
    const fetchCategories = useCallback(async () => {
        if (!branchId || !accessToken)
            return;
        try {
            const res = await fetch(`${API_BASE}/product-categories?branchId=${branchId}`, { headers });
            if (res.ok)
                setCategories(await res.json());
        }
        catch { }
    }, [branchId, accessToken, headers]);
    const fetchProducts = useCallback(async () => {
        if (!branchId || !accessToken)
            return;
        try {
            const params = new URLSearchParams({ branchId });
            if (selectedCategoryId)
                params.set('categoryId', selectedCategoryId);
            const res = await fetch(`${API_BASE}/products?${params}`, { headers });
            if (res.ok)
                setProducts(await res.json());
        }
        catch { }
    }, [branchId, selectedCategoryId, accessToken, headers]);
    const fetchRecipes = useCallback(async () => {
        if (!branchId || !accessToken)
            return;
        try {
            const r = await fetch(`${API_BASE}/recipes?branchId=${branchId}`, { headers });
            if (r.ok)
                setExistingRecipes(await r.json());
        }
        catch { }
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
        if (!categoryName.trim())
            return;
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
            }
            else {
                const err = await res.json();
                setMsg(`❌ ${err.message || 'حدث خطأ'}`);
            }
        }
        catch {
            setMsg('❌ فشل الاتصال بالسيرفر');
        }
        setLoading(false);
        setSnack(true);
    };
    const deleteCategory = async (id) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/product-categories/${id}`, { method: 'DELETE', headers });
            if (res.ok) {
                setMsg('✅ تم حذف الفئة');
                fetchCategories();
            }
            else {
                const err = await res.json();
                setMsg(`❌ ${err.message || 'حدث خطأ'}`);
            }
        }
        catch {
            setMsg('❌ فشل الاتصال');
        }
        setLoading(false);
        setSnack(true);
    };
    const createProduct = async () => {
        if (!productForm.name.trim() || !productForm.categoryId)
            return;
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
            if (!res.ok) {
                const err = await res.json();
                setMsg(`❌ ${err.message || 'حدث خطأ'}`);
                setLoading(false);
                setSnack(true);
                return;
            }
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
                    }
                    else {
                        setMsg('✅ تمت إضافة المنتج وربطه بالوصفة بنجاح');
                    }
                }
                else if (recipeAction === 'create_new') {
                    const recipeRes = await fetch(`${API_BASE}/recipes`, {
                        method: 'POST', headers,
                        body: JSON.stringify({ branchId, productId, name: productForm.name.trim() }),
                    });
                    if (recipeRes.ok) {
                        setMsg('✅ تمت إضافة المنتج والوصفة بنجاح');
                        setRecipesLoaded(false);
                    }
                    else {
                        setMsg('✅ تمت إضافة المنتج لكن فشل إنشاء الوصفة تلقائياً');
                    }
                }
                else {
                    setMsg('✅ تمت إضافة المنتج بنجاح');
                }
            }
            else {
                setMsg('✅ تم تحديث المنتج بنجاح');
            }
            setProductDialog(false);
            setEditingProductId('');
            setProductForm({ name: '', sku: '', categoryId: '', salePrice: '0', estimatedCost: '0', isAvailable: true });
            setRecipeAction('none');
            setSelectedRecipeId('');
            fetchProducts();
            invalidatePosQueries(queryClient);
        }
        catch {
            setMsg('❌ فشل الاتصال');
        }
        setLoading(false);
        setSnack(true);
    };
    const toggleAvailability = async (id, current) => {
        try {
            const res = await fetch(`${API_BASE}/products/${id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ isAvailable: !current }),
            });
            if (res.ok) {
                fetchProducts();
                invalidatePosQueries(queryClient);
            }
        }
        catch { }
    };
    const deleteProduct = async (id) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE', headers });
            if (res.ok) {
                setMsg('✅ تم حذف المنتج');
                fetchProducts();
            }
        }
        catch { }
        setLoading(false);
        setSnack(true);
    };
    const stats = useMemo(() => [
        { label: 'إجمالي الفئات', value: String(categories.length), note: 'فئات المنيو', progress: 100, tone: 'info' },
        { label: 'إجمالي المنتجات', value: String(products.length), note: 'صنف في المنيو', progress: products.length > 0 ? 72 : 0, tone: 'success' },
        { label: 'متوسط السعر', value: products.length > 0 ? `${(products.reduce((s, p) => s + p.salePrice, 0) / products.length).toFixed(0)} ج.م` : '—', note: 'متوسط أسعار البيع', progress: 60, tone: 'primary' },
        { label: 'غير متاح', value: String(products.filter((p) => !p.isAvailable).length), note: 'منتجات غير متاحة للبيع', progress: 30, tone: 'warning' },
    ], [categories, products]);
    return (_jsxs(Stack, { spacing: 2.5, children: [msg && _jsx(Snackbar, { open: snack, autoHideDuration: 3000, onClose: () => setSnack(false), anchorOrigin: { vertical: 'bottom', horizontal: 'center' }, children: _jsx(Alert, { severity: msg.startsWith('✅') ? 'success' : 'error', sx: { width: '100%' }, children: msg }) }), _jsx(Grid2, { container: true, spacing: 2, children: stats.map((card) => (_jsx(Grid2, { size: { xs: 12, md: 6, xl: 3 }, children: _jsx(MetricCard, { ...card }) }, card.label))) }), _jsx(SectionCard, { title: "\u0641\u0626\u0627\u062A \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A", description: "\u0625\u062F\u0627\u0631\u0629 \u062A\u0635\u0646\u064A\u0641\u0627\u062A \u0627\u0644\u0645\u0646\u064A\u0648", action: _jsx(Button, { variant: "contained", onClick: () => setCategoryDialog(true), children: "\u0625\u0636\u0627\u0641\u0629 \u0641\u0626\u0629" }), children: _jsx(Paper, { elevation: 0, sx: { borderRadius: 4, overflow: 'hidden', border: `1px solid ${ui.border}` }, children: _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u0627\u0644\u0641\u0626\u0629" }), _jsx(TableCell, { align: "left", children: "\u0639\u062F\u062F \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A" }), _jsx(TableCell, { align: "left", children: "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0625\u0646\u0634\u0627\u0621" }), _jsx(TableCell, { align: "left", children: "\u0625\u062C\u0631\u0627\u0621\u0627\u062A" })] }) }), _jsxs(TableBody, { children: [categories.length === 0 && (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 4, align: "center", children: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0641\u0626\u0627\u062A \u0628\u0639\u062F\u060C \u0623\u0636\u0641 \u0641\u0626\u0629 \u062C\u062F\u064A\u062F\u0629" }) })), categories.map((cat) => (_jsxs(TableRow, { hover: true, children: [_jsx(TableCell, { children: _jsx(Typography, { fontWeight: 700, children: cat.name }) }), _jsx(TableCell, { align: "left", children: products.filter((p) => p.categoryId === cat.id).length }), _jsx(TableCell, { align: "left", children: new Date(cat.createdAt).toLocaleDateString('ar-EG') }), _jsx(TableCell, { align: "left", children: _jsx(Stack, { direction: "row", spacing: 1, children: _jsx(Button, { size: "small", variant: "outlined", color: "error", onClick: () => deleteCategory(cat.id), children: "\u062D\u0630\u0641" }) }) })] }, cat.id)))] })] }) }) }), _jsx(SectionCard, { title: "\u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A", description: "\u0625\u062F\u0627\u0631\u0629 \u0623\u0635\u0646\u0627\u0641 \u0627\u0644\u0645\u0646\u064A\u0648", action: _jsxs(Stack, { direction: "row", spacing: 1, children: [_jsxs(TextField, { select: true, label: "\u0641\u0644\u062A\u0631 \u0628\u0627\u0644\u0641\u0626\u0629", size: "small", value: selectedCategoryId, onChange: (e) => setSelectedCategoryId(e.target.value), sx: { minWidth: 180 }, children: [_jsx(MenuItem, { value: "", children: "\u0643\u0644 \u0627\u0644\u0641\u0626\u0627\u062A" }), categories.map((cat) => (_jsx(MenuItem, { value: cat.id, children: cat.name }, cat.id)))] }), _jsx(Button, { variant: "contained", onClick: () => {
                                setProductForm((f) => ({ ...f, categoryId: selectedCategoryId || categories[0]?.id || '' }));
                                setRecipeAction('none');
                                setSelectedRecipeId('');
                                setProductDialog(true);
                            }, children: "\u0625\u0636\u0627\u0641\u0629 \u0645\u0646\u062A\u062C" })] }), children: _jsx(Paper, { elevation: 0, sx: { borderRadius: 4, overflow: 'hidden', border: `1px solid ${ui.border}` }, children: _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u0627\u0644\u0645\u0646\u062A\u062C" }), _jsx(TableCell, { children: "SKU" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u0633\u0639\u0631" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u062A\u0643\u0644\u0641\u0629" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u0648\u0635\u0641\u0629" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u062D\u0627\u0644\u0629" }), _jsx(TableCell, { align: "left", children: "\u0625\u062C\u0631\u0627\u0621\u0627\u062A" })] }) }), _jsxs(TableBody, { children: [products.length === 0 && (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 7, align: "center", children: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0646\u062A\u062C\u0627\u062A \u0628\u0639\u062F" }) })), products.map((prod) => {
                                        const linkedRecipe = existingRecipes.find((r) => r.productId === prod.id);
                                        return (_jsxs(TableRow, { hover: true, children: [_jsx(TableCell, { children: _jsx(Typography, { fontWeight: 700, children: prod.name }) }), _jsx(TableCell, { children: prod.sku || '—' }), _jsxs(TableCell, { align: "left", children: [prod.salePrice.toLocaleString(), " \u062C.\u0645"] }), _jsx(TableCell, { align: "left", children: prod.estimatedCost ? `${prod.estimatedCost.toLocaleString()} ج.م` : '—' }), _jsx(TableCell, { align: "left", children: linkedRecipe ? (_jsx(Chip, { size: "small", label: `وصفة: ${linkedRecipe.name}`, color: "primary", variant: "outlined" })) : (_jsx(Chip, { size: "small", label: "\u0628\u062F\u0648\u0646", color: "default", variant: "outlined" })) }), _jsx(TableCell, { align: "left", children: _jsx(Chip, { size: "small", label: prod.isAvailable ? 'متاح' : 'غير متاح', color: prod.isAvailable ? 'success' : 'error', sx: { fontWeight: 700 } }) }), _jsx(TableCell, { align: "left", children: _jsxs(Stack, { direction: "row", spacing: 1, children: [_jsx(Button, { size: "small", variant: "outlined", onClick: () => {
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
                                                                }, children: "\u062A\u0639\u062F\u064A\u0644" }), _jsx(Button, { size: "small", variant: "outlined", onClick: () => toggleAvailability(prod.id, prod.isAvailable), children: prod.isAvailable ? 'تعطيل' : 'تفعيل' }), _jsx(Button, { size: "small", variant: "outlined", color: "error", onClick: () => deleteProduct(prod.id), children: "\u062D\u0630\u0641" })] }) })] }, prod.id));
                                    })] })] }) }) }), _jsxs(Dialog, { open: categoryDialog, onClose: () => setCategoryDialog(false), fullWidth: true, maxWidth: "sm", children: [_jsx(DialogTitle, { children: "\u0625\u0636\u0627\u0641\u0629 \u0641\u0626\u0629 \u062C\u062F\u064A\u062F\u0629" }), _jsx(DialogContent, { children: _jsx(Stack, { spacing: 2, sx: { pt: 1 }, children: _jsx(TextField, { label: "\u0627\u0633\u0645 \u0627\u0644\u0641\u0626\u0629", fullWidth: true, value: categoryName, onChange: (e) => setCategoryName(e.target.value) }) }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setCategoryDialog(false), children: "\u0625\u0644\u063A\u0627\u0621" }), _jsx(Button, { variant: "contained", onClick: createCategory, disabled: loading, children: "\u062D\u0641\u0638" })] })] }), _jsxs(Dialog, { open: productDialog, onClose: () => setProductDialog(false), fullWidth: true, maxWidth: "md", children: [_jsx(DialogTitle, { children: "\u0625\u0636\u0627\u0641\u0629 \u0645\u0646\u062A\u062C \u062C\u062F\u064A\u062F" }), _jsx(DialogContent, { children: _jsxs(Stack, { spacing: 2, sx: { pt: 1 }, children: [_jsxs(Grid2, { container: true, spacing: 1.5, children: [_jsx(Grid2, { size: { xs: 12, md: 6 }, children: _jsx(TextField, { label: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0646\u062A\u062C", fullWidth: true, value: productForm.name, onChange: (e) => setProductForm((f) => ({ ...f, name: e.target.value })) }) }), _jsx(Grid2, { size: { xs: 12, md: 3 }, children: _jsx(TextField, { label: "SKU (\u0643\u0648\u062F)", fullWidth: true, value: productForm.sku, onChange: (e) => setProductForm((f) => ({ ...f, sku: e.target.value })) }) }), _jsx(Grid2, { size: { xs: 12, md: 3 }, children: _jsx(TextField, { select: true, label: "\u0627\u0644\u0641\u0626\u0629", fullWidth: true, value: productForm.categoryId, onChange: (e) => setProductForm((f) => ({ ...f, categoryId: e.target.value })), children: categories.map((cat) => (_jsx(MenuItem, { value: cat.id, children: cat.name }, cat.id))) }) })] }), _jsxs(Grid2, { container: true, spacing: 1.5, children: [_jsx(Grid2, { size: { xs: 12, md: 4 }, children: _jsx(TextField, { label: "\u0633\u0639\u0631 \u0627\u0644\u0628\u064A\u0639", type: "number", fullWidth: true, value: productForm.salePrice, onChange: (e) => setProductForm((f) => ({ ...f, salePrice: e.target.value })) }) }), _jsx(Grid2, { size: { xs: 12, md: 4 }, children: _jsx(TextField, { label: "\u0627\u0644\u062A\u0643\u0644\u0641\u0629 \u0627\u0644\u062A\u0642\u062F\u064A\u0631\u064A\u0629", type: "number", fullWidth: true, value: productForm.estimatedCost, onChange: (e) => setProductForm((f) => ({ ...f, estimatedCost: e.target.value })) }) }), _jsx(Grid2, { size: { xs: 12, md: 4 }, children: _jsxs(TextField, { select: true, label: "\u0645\u062A\u0627\u062D \u0644\u0644\u0628\u064A\u0639", fullWidth: true, value: productForm.isAvailable ? 'true' : 'false', onChange: (e) => setProductForm((f) => ({ ...f, isAvailable: e.target.value === 'true' })), children: [_jsx(MenuItem, { value: "true", children: "\u0645\u062A\u0627\u062D" }), _jsx(MenuItem, { value: "false", children: "\u063A\u064A\u0631 \u0645\u062A\u0627\u062D" })] }) })] }), _jsxs(Paper, { elevation: 0, sx: { p: 2, borderRadius: 3, bgcolor: ui.successBg, border: `1px solid ${ui.successBorder}` }, children: [_jsx(Typography, { variant: "subtitle1", fontWeight: 800, sx: { mb: 1.5 }, children: "\uD83D\uDD17 \u0631\u0628\u0637 \u0627\u0644\u0648\u0635\u0641\u0629 (\u0644\u062E\u0635\u0645 \u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0639\u0646\u062F \u0627\u0644\u0628\u064A\u0639)" }), _jsxs(TextField, { select: true, label: "\u0625\u062C\u0631\u0627\u0621 \u0627\u0644\u0648\u0635\u0641\u0629", fullWidth: true, value: recipeAction, onChange: (e) => setRecipeAction(e.target.value), children: [_jsx(MenuItem, { value: "none", children: "\u0628\u062F\u0648\u0646 \u0648\u0635\u0641\u0629 (\u0645\u0634\u0631\u0648\u0628\u0627\u062A/\u0625\u0636\u0627\u0641\u0627\u062A)" }), _jsx(MenuItem, { value: "link_existing", children: "\u0631\u0628\u0637 \u0648\u0635\u0641\u0629 \u0645\u0648\u062C\u0648\u062F\u0629" }), _jsx(MenuItem, { value: "create_new", children: "\u0625\u0646\u0634\u0627\u0621 \u0648\u0635\u0641\u0629 \u062C\u062F\u064A\u062F\u0629 \u0628\u0646\u0641\u0633 \u0627\u0644\u0627\u0633\u0645" })] }), recipeAction === 'link_existing' && (_jsxs(TextField, { select: true, label: "\u0627\u062E\u062A\u0631 \u0627\u0644\u0648\u0635\u0641\u0629", fullWidth: true, value: selectedRecipeId, onChange: (e) => setSelectedRecipeId(e.target.value), sx: { mt: 1.5 }, children: [existingRecipes
                                                    .filter((r) => !r.productId || r.productId === '')
                                                    .map((r) => (_jsxs(MenuItem, { value: r.id, children: [r.name, " ", r.isActive ? '(نشط)' : ''] }, r.id))), existingRecipes.filter((r) => !r.productId || r.productId === '').length === 0 && (_jsx(MenuItem, { disabled: true, value: "", children: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0648\u0635\u0641\u0627\u062A \u063A\u064A\u0631 \u0645\u0631\u062A\u0628\u0637\u0629 \u2014 \u0623\u0636\u0641 \u0648\u0635\u0641\u0629 \u0623\u0648\u0644\u0627\u064B" }))] })), recipeAction === 'create_new' && (_jsxs(Alert, { severity: "info", sx: { mt: 1.5 }, children: ["\u0633\u064A\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0648\u0635\u0641\u0629 \u062C\u062F\u064A\u062F\u0629 \u0628\u0627\u0633\u0645 \"", productForm.name.trim() || '...', "\" \u0648\u0631\u0628\u0637\u0647\u0627 \u0628\u0627\u0644\u0645\u0646\u062A\u062C \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B. \u0627\u0641\u062A\u062D \u0634\u0627\u0634\u0629 \u0627\u0644\u0648\u0635\u0641\u0627\u062A \u0644\u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0643\u0648\u0646\u0627\u062A."] }))] })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setProductDialog(false), children: "\u0625\u0644\u063A\u0627\u0621" }), _jsx(Button, { variant: "contained", onClick: createProduct, disabled: loading, children: "\u062D\u0641\u0638 \u0627\u0644\u0645\u0646\u062A\u062C" })] })] })] }));
}
