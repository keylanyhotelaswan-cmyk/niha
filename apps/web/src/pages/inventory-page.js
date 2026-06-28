import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Snackbar, Grid2, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth-context.js';
import { MetricCard, SectionCard } from './shared.js';
import { ui } from '../lib/ui-tokens.js';
import { useBranches, useVendors, usePurchaseOrders } from '../lib/hooks.js';
import { API_BASE, apiPost, parseApiErrorBody } from '../lib/api-client.js';
export function InventoryPage() {
    const { accessToken } = useAuth();
    const headers = useMemo(() => ({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
    }), [accessToken]);
    const { data: branches = [] } = useBranches();
    const [branchId, setBranchId] = useState('');
    const effectiveBranchId = branchId || branches[0]?.id || '';
    // === Stock Items (الخامات) ===
    const [stockItems, setStockItems] = useState([]);
    const [stockItemDialog, setStockItemDialog] = useState(false);
    const [stockItemForm, setStockItemForm] = useState({ name: '', code: '', unitId: '', warehouseId: '', averageCost: '0', onHandQuantity: '0' });
    // === Warehouses + Units ===
    const [warehouses, setWarehouses] = useState([]);
    const [units, setUnits] = useState([]);
    // === Recipes (دمج الوصفات هنا) ===
    const [products, setProducts] = useState([]);
    const [recipes, setRecipes] = useState([]);
    const [versions, setVersions] = useState([]);
    const [selectedRecipeId, setSelectedRecipeId] = useState('');
    const [selectedVersionId, setSelectedVersionId] = useState('');
    const [recipeDialog, setRecipeDialog] = useState(false);
    const [versionDialog, setVersionDialog] = useState(false);
    const [recipeForm, setRecipeForm] = useState({ productId: '', name: '' });
    const [versionForm, setVersionForm] = useState({
        recipeId: '', yieldQuantity: '1', wastePercent: '0',
        components: [],
    });
    const [msg, setMsg] = useState('');
    const [snack, setSnack] = useState(false);
    const [loading, setLoading] = useState(false);
    // === Fetch all data ===
    const fetchStockItems = async () => {
        if (!effectiveBranchId)
            return;
        try {
            const r = await fetch(`${API_BASE}/stock-items?branchId=${effectiveBranchId}`, { headers });
            if (r.ok)
                setStockItems(await r.json());
        }
        catch { }
    };
    const fetchWarehouses = async () => {
        if (!effectiveBranchId)
            return;
        try {
            const r = await fetch(`${API_BASE}/warehouses?branchId=${effectiveBranchId}`, { headers });
            if (r.ok)
                setWarehouses(await r.json());
        }
        catch { }
    };
    const fetchUnits = async () => {
        try {
            const r = await fetch(`${API_BASE}/units`, { headers });
            if (r.ok)
                setUnits(await r.json());
        }
        catch { }
    };
    const fetchProducts = async () => {
        if (!effectiveBranchId)
            return;
        try {
            const r = await fetch(`${API_BASE}/products?branchId=${effectiveBranchId}`, { headers });
            if (r.ok)
                setProducts(await r.json());
        }
        catch { }
    };
    const fetchRecipes = async () => {
        if (!effectiveBranchId)
            return;
        try {
            const r = await fetch(`${API_BASE}/recipes?branchId=${effectiveBranchId}`, { headers });
            if (r.ok)
                setRecipes(await r.json());
        }
        catch { }
    };
    const fetchVersions = async (recipeId) => {
        if (!recipeId)
            return;
        try {
            const r = await fetch(`${API_BASE}/recipes/${recipeId}/versions`, { headers });
            if (r.ok)
                setVersions(await r.json());
        }
        catch { }
    };
    useEffect(() => {
        if (effectiveBranchId) {
            fetchStockItems();
            fetchWarehouses();
            fetchUnits();
            fetchProducts();
            fetchRecipes();
        }
    }, [effectiveBranchId]);
    // === Stock Item CRUD ===
    const createStockItem = async () => {
        if (!stockItemForm.name.trim() || !stockItemForm.code.trim())
            return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/stock-items`, {
                method: 'POST', headers,
                body: JSON.stringify({
                    branchId: effectiveBranchId, warehouseId: stockItemForm.warehouseId || warehouses[0]?.id || '',
                    unitId: stockItemForm.unitId || units[0]?.id || '',
                    name: stockItemForm.name.trim(), code: stockItemForm.code.trim(),
                    averageCost: Number(stockItemForm.averageCost) || 0,
                    onHandQuantity: Number(stockItemForm.onHandQuantity) || 0,
                }),
            });
            if (res.ok) {
                setMsg('✅ تمت إضافة الخامة');
                setStockItemDialog(false);
                setStockItemForm({ name: '', code: '', unitId: '', warehouseId: '', averageCost: '0', onHandQuantity: '0' });
                fetchStockItems();
            }
            else {
                const e = await res.json();
                setMsg(`❌ ${e.message}`);
            }
        }
        catch {
            setMsg('❌ فشل الاتصال');
        }
        setLoading(false);
        setSnack(true);
    };
    const deleteStockItem = async (id) => {
        try {
            const r = await fetch(`${API_BASE}/stock-items/${id}`, { method: 'DELETE', headers });
            if (r.ok) {
                setMsg('✅ تم الحذف');
                fetchStockItems();
            }
        }
        catch { }
        setSnack(true);
    };
    // === Recipe CRUD ===
    const handleSelectRecipe = (id) => {
        setSelectedRecipeId(id);
        fetchVersions(id);
        setVersionForm((f) => ({ ...f, recipeId: id }));
    };
    const addComponentRow = () => {
        setVersionForm((f) => ({
            ...f,
            components: [...f.components, { stockItemId: stockItems[0]?.id || '', unitId: units[0]?.id || '', quantity: '0', wastePercent: '0' }],
        }));
    };
    const updateComponent = (index, field, value) => {
        setVersionForm((f) => ({
            ...f, components: f.components.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
        }));
    };
    const computedTotalCost = useMemo(() => {
        let sum = 0;
        for (const c of versionForm.components) {
            const item = stockItems.find((s) => s.id === c.stockItemId);
            if (!item)
                continue;
            const qty = Number(c.quantity) || 0;
            const waste = Number(c.wastePercent) || 0;
            const avgCost = item.averageCost || 0;
            sum += qty * Number(avgCost) * (1 + waste / 100);
        }
        const waste = Number(versionForm.wastePercent) || 0;
        return sum * (1 + waste / 100);
    }, [versionForm, stockItems]);
    const createRecipe = async () => {
        if (!recipeForm.productId || !recipeForm.name.trim())
            return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/recipes`, {
                method: 'POST', headers,
                body: JSON.stringify({ branchId: effectiveBranchId, productId: recipeForm.productId, name: recipeForm.name.trim() }),
            });
            if (res.ok) {
                setMsg('✅ تم إضافة الوصفة');
                setRecipeDialog(false);
                setRecipeForm({ productId: '', name: '' });
                fetchRecipes();
            }
            else {
                const e = await res.json();
                setMsg(`❌ ${e.message}`);
            }
        }
        catch {
            setMsg('❌ فشل الاتصال');
        }
        setLoading(false);
        setSnack(true);
    };
    const createVersion = async () => {
        if (!versionForm.recipeId)
            return;
        setLoading(true);
        const body = {
            recipeId: versionForm.recipeId,
            yieldQuantity: Number(versionForm.yieldQuantity) || 1,
            wastePercent: Number(versionForm.wastePercent) || 0,
            components: versionForm.components
                .filter((c) => c.stockItemId && Number(c.quantity) > 0)
                .map((c) => ({
                stockItemId: c.stockItemId, unitId: c.unitId,
                quantity: Number(c.quantity), wastePercent: Number(c.wastePercent) || 0,
            })),
        };
        try {
            const res = await fetch(`${API_BASE}/recipes/${versionForm.recipeId}/versions`, {
                method: 'POST', headers, body: JSON.stringify(body),
            });
            if (res.ok) {
                setMsg('✅ تم إنشاء الإصدار');
                setVersionDialog(false);
                setVersionForm({ recipeId: '', yieldQuantity: '1', wastePercent: '0', components: [] });
                fetchVersions(selectedRecipeId);
            }
            else {
                const e = await res.json();
                setMsg(`❌ ${e.message}`);
            }
        }
        catch {
            setMsg('❌ فشل الاتصال');
        }
        setLoading(false);
        setSnack(true);
    };
    const deleteRecipe = async (id) => {
        try {
            const r = await fetch(`${API_BASE}/recipes/${id}`, { method: 'DELETE', headers });
            if (r.ok) {
                setMsg('✅ تم حذف الوصفة');
                fetchRecipes();
                setSelectedRecipeId('');
                setVersions([]);
            }
        }
        catch { }
        setSnack(true);
    };
    const selectedVersion = useMemo(() => versions.find((v) => v.id === selectedVersionId), [versions, selectedVersionId]);
    // === Stats ===
    const stats = useMemo(() => [
        { label: 'الخامات', value: String(stockItems.length), note: 'صنف مخزني', progress: 60, tone: 'info' },
        { label: 'المستودعات', value: String(warehouses.length), note: 'مستودع', progress: 100, tone: 'success' },
        { label: 'الوصفات', value: String(recipes.length), note: 'وصفات مسجلة', progress: recipes.length > 0 ? 80 : 0, tone: 'primary' },
        { label: 'منتجات كتالوج', value: String(products.length), note: 'صنف متاح', progress: 45, tone: 'warning' },
    ], [stockItems, warehouses, recipes, products]);
    return (_jsxs(Stack, { spacing: 2.5, children: [_jsx(Snackbar, { open: snack, autoHideDuration: 3000, onClose: () => setSnack(false), anchorOrigin: { vertical: 'bottom', horizontal: 'center' }, children: _jsx(Alert, { severity: msg.startsWith('✅') ? 'success' : 'error', children: msg }) }), _jsx(Grid2, { container: true, spacing: 2, children: stats.map((card) => (_jsx(Grid2, { size: { xs: 12, md: 6, xl: 3 }, children: _jsx(MetricCard, { ...card }) }, card.label))) }), _jsx(SectionCard, { title: "\u0627\u0644\u062E\u0627\u0645\u0627\u062A \u0627\u0644\u0645\u062E\u0632\u0646\u064A\u0629", description: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0623\u0635\u0646\u0627\u0641 \u0627\u0644\u0645\u062E\u0632\u0646\u064A\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 (\u0627\u0644\u0645\u0643\u0648\u0646\u0627\u062A)", action: _jsx(Button, { variant: "contained", onClick: () => setStockItemDialog(true), children: "\u0625\u0636\u0627\u0641\u0629 \u062E\u0627\u0645\u0629" }), children: _jsx(Paper, { elevation: 0, sx: { borderRadius: 4, overflow: 'hidden', border: `1px solid ${ui.border}` }, children: _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u0627\u0644\u062E\u0627\u0645\u0629" }), _jsx(TableCell, { children: "\u0627\u0644\u0643\u0648\u062F" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u0643\u0645\u064A\u0629" }), _jsx(TableCell, { align: "left", children: "\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u062A\u0643\u0644\u0641\u0629" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u062D\u0627\u0644\u0629" }), _jsx(TableCell, { align: "left", children: "\u0625\u062C\u0631\u0627\u0621\u0627\u062A" })] }) }), _jsxs(TableBody, { children: [stockItems.length === 0 && _jsx(TableRow, { children: _jsx(TableCell, { colSpan: 6, align: "center", children: "\u0644\u0627 \u062A\u0648\u062C\u062F \u062E\u0627\u0645\u0627\u062A \u2014 \u0623\u0636\u0641 \u0623\u0648\u0644 \u062E\u0627\u0645\u0629" }) }), stockItems.map((item) => (_jsxs(TableRow, { hover: true, children: [_jsx(TableCell, { children: _jsx(Typography, { fontWeight: 700, children: item.name }) }), _jsx(TableCell, { children: item.code }), _jsx(TableCell, { align: "left", children: Number(item.onHandQuantity).toFixed(2) }), _jsxs(TableCell, { align: "left", children: [Number(item.averageCost).toFixed(2), " \u062C.\u0645"] }), _jsx(TableCell, { align: "left", children: _jsx(Chip, { size: "small", label: item.isActive ? 'نشط' : 'غير نشط', color: item.isActive ? 'success' : 'default' }) }), _jsx(TableCell, { align: "left", children: _jsx(Button, { size: "small", variant: "outlined", color: "error", onClick: () => deleteStockItem(item.id), children: "\u062D\u0630\u0641" }) })] }, item.id)))] })] }) }) }), _jsxs(SectionCard, { title: "\u0627\u0644\u0648\u0635\u0641\u0627\u062A", description: "\u0631\u0628\u0637 \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0627\u0644\u0646\u0647\u0627\u0626\u064A\u0629 \u0628\u0627\u0644\u0645\u0643\u0648\u0646\u0627\u062A \u0627\u0644\u0645\u062E\u0632\u0646\u064A\u0629 \u0644\u062E\u0635\u0645 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A \u0639\u0646\u062F \u0627\u0644\u0628\u064A\u0639", action: _jsx(Button, { variant: "contained", onClick: () => setRecipeDialog(true), children: "\u0625\u0636\u0627\u0641\u0629 \u0648\u0635\u0641\u0629" }), children: [_jsx(Paper, { elevation: 0, sx: { borderRadius: 4, overflow: 'hidden', border: `1px solid ${ui.border}` }, children: _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u0627\u0644\u0648\u0635\u0641\u0629" }), _jsx(TableCell, { children: "\u0627\u0644\u0645\u0646\u062A\u062C" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u062D\u0627\u0644\u0629" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u0625\u0635\u062F\u0627\u0631\u0627\u062A" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u0625\u062C\u0631\u0627\u0621\u0627\u062A" })] }) }), _jsxs(TableBody, { children: [recipes.length === 0 && _jsx(TableRow, { children: _jsx(TableCell, { colSpan: 5, align: "center", children: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0648\u0635\u0641\u0627\u062A \u0628\u0639\u062F" }) }), recipes.map((r) => {
                                            const prod = products.find((p) => p.id === r.productId);
                                            return (_jsxs(TableRow, { hover: true, selected: selectedRecipeId === r.id, onClick: () => handleSelectRecipe(r.id), sx: { cursor: 'pointer' }, children: [_jsx(TableCell, { children: _jsx(Typography, { fontWeight: 700, children: r.name }) }), _jsx(TableCell, { children: prod?.name || '—' }), _jsx(TableCell, { align: "left", children: _jsx(Chip, { size: "small", label: r.isActive ? 'نشط' : 'غير نشط', color: r.isActive ? 'success' : 'default' }) }), _jsx(TableCell, { align: "left", children: versions.length || '—' }), _jsx(TableCell, { align: "left", children: _jsxs(Stack, { direction: "row", spacing: 1, children: [_jsx(Button, { size: "small", variant: "outlined", onClick: (e) => { e.stopPropagation(); handleSelectRecipe(r.id); setVersionForm((f) => ({ ...f, recipeId: r.id })); setVersionDialog(true); }, children: "\u0625\u0636\u0627\u0641\u0629 \u0625\u0635\u062F\u0627\u0631" }), _jsx(Button, { size: "small", variant: "outlined", color: "error", onClick: (e) => { e.stopPropagation(); deleteRecipe(r.id); }, children: "\u062D\u0630\u0641" })] }) })] }, r.id));
                                        })] })] }) }), selectedRecipeId && (_jsxs(Box, { sx: { mt: 3 }, children: [_jsxs(Typography, { variant: "h6", fontWeight: 800, sx: { mb: 1 }, children: ["\u0625\u0635\u062F\u0627\u0631\u0627\u062A: ", recipes.find((r) => r.id === selectedRecipeId)?.name] }), _jsx(Paper, { elevation: 0, sx: { borderRadius: 4, overflow: 'hidden', border: `1px solid ${ui.border}` }, children: _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u0627\u0644\u0625\u0635\u062F\u0627\u0631" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u0639\u0627\u0626\u062F" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u0647\u0627\u0644\u0643 %" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u062A\u0643\u0644\u0641\u0629" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u062D\u0627\u0644\u0629" })] }) }), _jsxs(TableBody, { children: [versions.length === 0 && _jsx(TableRow, { children: _jsx(TableCell, { colSpan: 5, align: "center", children: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0625\u0635\u062F\u0627\u0631\u0627\u062A" }) }), versions.map((v) => (_jsxs(TableRow, { hover: true, selected: selectedVersionId === v.id, onClick: () => setSelectedVersionId(v.id), sx: { cursor: 'pointer' }, children: [_jsx(TableCell, { children: _jsxs(Typography, { fontWeight: 700, children: ["REV-", v.versionNumber] }) }), _jsx(TableCell, { align: "left", children: v.yieldQuantity }), _jsxs(TableCell, { align: "left", children: [v.wastePercent, "%"] }), _jsxs(TableCell, { align: "left", children: [Number(v.totalCost).toFixed(2), " \u062C.\u0645"] }), _jsx(TableCell, { align: "left", children: _jsx(Chip, { size: "small", label: v.status === 'ACTIVE' ? 'نشط' : 'مؤرشف', color: v.status === 'ACTIVE' ? 'success' : 'default' }) })] }, v.id)))] })] }) }), selectedVersion?.components && selectedVersion.components.length > 0 && (_jsxs(Paper, { elevation: 0, sx: { mt: 2, p: 2, borderRadius: 4, border: `1px solid ${ui.border}` }, children: [_jsxs(Typography, { variant: "subtitle1", fontWeight: 800, children: ["\u0645\u0643\u0648\u0646\u0627\u062A REV-", selectedVersion.versionNumber] }), _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u0627\u0644\u0645\u0643\u0648\u0646" }), _jsx(TableCell, { children: "\u0627\u0644\u0643\u0645\u064A\u0629" }), _jsx(TableCell, { children: "\u0646\u0633\u0628\u0629 \u0627\u0644\u0647\u0627\u0644\u0643" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u062A\u0643\u0644\u0641\u0629" })] }) }), _jsx(TableBody, { children: selectedVersion.components.map((c) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: c.stockItemName || stockItems.find((s) => s.id === c.stockItemId)?.name || '—' }), _jsx(TableCell, { children: c.quantity }), _jsxs(TableCell, { children: [c.wastePercent, "%"] }), _jsxs(TableCell, { align: "left", children: [Number(c.costAmount).toFixed(2), " \u062C.\u0645"] })] }, c.id))) })] })] }))] }))] }), _jsxs(Dialog, { open: stockItemDialog, onClose: () => setStockItemDialog(false), fullWidth: true, maxWidth: "sm", children: [_jsx(DialogTitle, { children: "\u0625\u0636\u0627\u0641\u0629 \u062E\u0627\u0645\u0629 \u062C\u062F\u064A\u062F\u0629" }), _jsx(DialogContent, { children: _jsxs(Stack, { spacing: 2, sx: { pt: 1 }, children: [_jsx(TextField, { label: "\u0627\u0633\u0645 \u0627\u0644\u062E\u0627\u0645\u0629", fullWidth: true, value: stockItemForm.name, onChange: (e) => setStockItemForm((f) => ({ ...f, name: e.target.value })) }), _jsx(TextField, { label: "\u0627\u0644\u0643\u0648\u062F", fullWidth: true, value: stockItemForm.code, onChange: (e) => setStockItemForm((f) => ({ ...f, code: e.target.value })) }), _jsx(TextField, { select: true, label: "\u0627\u0644\u0645\u0633\u062A\u0648\u062F\u0639", fullWidth: true, value: stockItemForm.warehouseId, onChange: (e) => setStockItemForm((f) => ({ ...f, warehouseId: e.target.value })), children: warehouses.map((w) => _jsx(MenuItem, { value: w.id, children: w.name }, w.id)) }), _jsx(TextField, { select: true, label: "\u0627\u0644\u0648\u062D\u062F\u0629", fullWidth: true, value: stockItemForm.unitId, onChange: (e) => setStockItemForm((f) => ({ ...f, unitId: e.target.value })), children: units.map((u) => _jsxs(MenuItem, { value: u.id, children: [u.name, " (", u.code, ")"] }, u.id)) }), _jsxs(Grid2, { container: true, spacing: 1.5, children: [_jsx(Grid2, { size: { xs: 12, md: 6 }, children: _jsx(TextField, { label: "\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u062A\u0643\u0644\u0641\u0629", type: "number", fullWidth: true, value: stockItemForm.averageCost, onChange: (e) => setStockItemForm((f) => ({ ...f, averageCost: e.target.value })) }) }), _jsx(Grid2, { size: { xs: 12, md: 6 }, children: _jsx(TextField, { label: "\u0627\u0644\u0643\u0645\u064A\u0629 \u0627\u0644\u0627\u0641\u062A\u062A\u0627\u062D\u064A\u0629", type: "number", fullWidth: true, value: stockItemForm.onHandQuantity, onChange: (e) => setStockItemForm((f) => ({ ...f, onHandQuantity: e.target.value })) }) })] })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setStockItemDialog(false), children: "\u0625\u0644\u063A\u0627\u0621" }), _jsx(Button, { variant: "contained", onClick: createStockItem, disabled: loading, children: "\u062D\u0641\u0638 \u0627\u0644\u062E\u0627\u0645\u0629" })] })] }), _jsxs(Dialog, { open: recipeDialog, onClose: () => setRecipeDialog(false), fullWidth: true, maxWidth: "sm", children: [_jsx(DialogTitle, { children: "\u0625\u0636\u0627\u0641\u0629 \u0648\u0635\u0641\u0629 \u062C\u062F\u064A\u062F\u0629" }), _jsx(DialogContent, { children: _jsxs(Stack, { spacing: 2, sx: { pt: 1 }, children: [_jsx(TextField, { select: true, label: "\u0627\u0644\u0645\u0646\u062A\u062C \u0627\u0644\u0646\u0647\u0627\u0626\u064A", fullWidth: true, value: recipeForm.productId, onChange: (e) => {
                                        const p = products.find((prod) => prod.id === e.target.value);
                                        setRecipeForm({ productId: e.target.value, name: p?.name || '' });
                                    }, children: products.map((p) => _jsx(MenuItem, { value: p.id, children: p.name }, p.id)) }), _jsx(TextField, { label: "\u0627\u0633\u0645 \u0627\u0644\u0648\u0635\u0641\u0629", fullWidth: true, value: recipeForm.name, onChange: (e) => setRecipeForm((f) => ({ ...f, name: e.target.value })) })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setRecipeDialog(false), children: "\u0625\u0644\u063A\u0627\u0621" }), _jsx(Button, { variant: "contained", onClick: createRecipe, disabled: loading, children: "\u062D\u0641\u0638" })] })] }), _jsxs(Dialog, { open: versionDialog, onClose: () => setVersionDialog(false), fullWidth: true, maxWidth: "md", children: [_jsx(DialogTitle, { children: "\u0625\u0636\u0627\u0641\u0629 \u0625\u0635\u062F\u0627\u0631 \u062C\u062F\u064A\u062F" }), _jsx(DialogContent, { children: _jsxs(Stack, { spacing: 2, sx: { pt: 1 }, children: [_jsxs(Grid2, { container: true, spacing: 1.5, children: [_jsx(Grid2, { size: { xs: 12, md: 6 }, children: _jsx(TextField, { label: "\u0627\u0644\u0648\u0635\u0641\u0629", fullWidth: true, value: recipes.find((r) => r.id === versionForm.recipeId)?.name || '', InputProps: { readOnly: true } }) }), _jsx(Grid2, { size: { xs: 12, md: 3 }, children: _jsx(TextField, { label: "\u0627\u0644\u0639\u0627\u0626\u062F", type: "number", fullWidth: true, value: versionForm.yieldQuantity, onChange: (e) => setVersionForm((f) => ({ ...f, yieldQuantity: e.target.value })) }) }), _jsx(Grid2, { size: { xs: 12, md: 3 }, children: _jsx(TextField, { label: "\u0627\u0644\u0647\u0627\u0644\u0643 %", type: "number", fullWidth: true, value: versionForm.wastePercent, onChange: (e) => setVersionForm((f) => ({ ...f, wastePercent: e.target.value })) }) })] }), _jsx(Typography, { variant: "subtitle1", fontWeight: 800, children: "\u0627\u0644\u0645\u0643\u0648\u0646\u0627\u062A (\u0645\u0646 \u0627\u0644\u062E\u0627\u0645\u0627\u062A \u0627\u0644\u0645\u062E\u0632\u0646\u064A\u0629)" }), versionForm.components.map((comp, index) => (_jsxs(Grid2, { container: true, spacing: 1.5, children: [_jsx(Grid2, { size: { xs: 12, md: 4 }, children: _jsx(TextField, { select: true, label: "\u0627\u0644\u062E\u0627\u0645\u0629", fullWidth: true, value: comp.stockItemId, onChange: (e) => updateComponent(index, 'stockItemId', e.target.value), children: stockItems.map((s) => _jsxs(MenuItem, { value: s.id, children: [s.name, " (\u0645\u062A\u0648\u0633\u0637: ", Number(s.averageCost).toFixed(2), " \u062C.\u0645 \u2014 \u0631\u0635\u064A\u062F: ", Number(s.onHandQuantity).toFixed(2), ")"] }, s.id)) }) }), _jsx(Grid2, { size: { xs: 12, md: 3 }, children: _jsx(TextField, { select: true, label: "\u0627\u0644\u0648\u062D\u062F\u0629", fullWidth: true, value: comp.unitId, onChange: (e) => updateComponent(index, 'unitId', e.target.value), children: units.map((u) => _jsxs(MenuItem, { value: u.id, children: [u.name, " (", u.code, ")"] }, u.id)) }) }), _jsx(Grid2, { size: { xs: 12, md: 3 }, children: _jsx(TextField, { label: "\u0627\u0644\u0643\u0645\u064A\u0629", type: "number", fullWidth: true, value: comp.quantity, onChange: (e) => updateComponent(index, 'quantity', e.target.value) }) }), _jsx(Grid2, { size: { xs: 12, md: 2 }, children: _jsx(TextField, { label: "\u0647\u0627\u0644\u0643 %", type: "number", fullWidth: true, value: comp.wastePercent, onChange: (e) => updateComponent(index, 'wastePercent', e.target.value) }) })] }, index))), _jsx(Button, { variant: "outlined", onClick: addComponentRow, children: "\u2795 \u0625\u0636\u0627\u0641\u0629 \u0645\u0643\u0648\u0646" }), _jsxs(Paper, { elevation: 0, sx: { p: 2, borderRadius: 3, bgcolor: 'rgba(15,118,110,0.08)', border: '1px solid rgba(15,118,110,0.2)' }, children: [_jsxs(Typography, { variant: "h6", fontWeight: 800, children: ["\u0627\u0644\u062A\u0643\u0644\u0641\u0629 \u0627\u0644\u062A\u0642\u062F\u064A\u0631\u064A\u0629: ", computedTotalCost.toFixed(2), " \u062C.\u0645"] }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u064A\u062A\u0645 \u0627\u0644\u062D\u0633\u0627\u0628 \u0645\u0646 \u0645\u062A\u0648\u0633\u0637 \u062A\u0643\u0644\u0641\u0629 \u0627\u0644\u062E\u0627\u0645\u0627\u062A + \u0647\u0627\u0644\u0643 \u0627\u0644\u0645\u0643\u0648\u0646\u0627\u062A + \u0647\u0627\u0644\u0643 \u0627\u0644\u0625\u0646\u062A\u0627\u062C" })] })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setVersionDialog(false), children: "\u0625\u0644\u063A\u0627\u0621" }), _jsx(Button, { variant: "contained", onClick: createVersion, disabled: loading, children: "\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0625\u0635\u062F\u0627\u0631" })] })] }), _jsx(SectionCard, { title: "\u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646 \u0648\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621", description: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646 \u0648\u0627\u0633\u062A\u0644\u0627\u0645 \u0627\u0644\u0628\u0636\u0627\u0639\u0629 \u0625\u0644\u0649 \u0627\u0644\u0645\u062E\u0632\u0648\u0646.", children: _jsx(PurchasingPanel, { branchId: effectiveBranchId, warehouses: warehouses, accessToken: accessToken }) })] }));
}
function PurchasingPanel({ branchId, warehouses, accessToken }) {
    const queryClient = useQueryClient();
    const { data: vendors = [], refetch: refetchVendors, isError: vendorsError, error: vendorsLoadError, isLoading: vendorsLoading } = useVendors(branchId);
    const { data: purchaseOrders = [], refetch: refetchPOs } = usePurchaseOrders(branchId);
    const [vendorName, setVendorName] = useState('');
    const [vendorCode, setVendorCode] = useState('');
    const [msg, setMsg] = useState('');
    const [vendorError, setVendorError] = useState('');
    const createVendor = async () => {
        if (!accessToken || !vendorName.trim())
            return;
        if (!branchId) {
            setVendorError('انتظر تحميل الفرع ثم حاول مرة أخرى.');
            return;
        }
        setVendorError('');
        const res = await apiPost('/vendors', { branchId, name: vendorName, code: vendorCode || vendorName.slice(0, 6).toUpperCase() }, accessToken);
        if (res.ok) {
            setVendorName('');
            setVendorCode('');
            void refetchVendors();
            void queryClient.invalidateQueries({ queryKey: ['vendors'] });
            setMsg('تم إضافة المورد.');
        }
        else {
            setVendorError(parseApiErrorBody(res.body, res.error ?? 'فشل إضافة المورد'));
        }
    };
    const receivePO = async (poId) => {
        if (!accessToken || !warehouses[0])
            return;
        const res = await apiPost(`/purchase-orders/${poId}/receive`, { warehouseId: warehouses[0].id }, accessToken);
        if (res.ok) {
            refetchPOs();
            setMsg('تم استلام البضاعة وتحديث المخزون.');
        }
    };
    return (_jsxs(Stack, { spacing: 2, children: [msg ? _jsx(Alert, { severity: "success", onClose: () => setMsg(''), children: msg }) : null, vendorError ? _jsx(Alert, { severity: "error", onClose: () => setVendorError(''), children: vendorError }) : null, vendorsError ? (_jsx(Alert, { severity: "error", children: vendorsLoadError instanceof Error ? vendorsLoadError.message : 'تعذّر تحميل قائمة الموردين' })) : null, _jsxs(Stack, { direction: { xs: 'column', md: 'row' }, spacing: 1, children: [_jsx(TextField, { label: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0648\u0631\u062F", size: "small", value: vendorName, onChange: (e) => setVendorName(e.target.value) }), _jsx(TextField, { label: "\u0627\u0644\u0643\u0648\u062F", size: "small", value: vendorCode, onChange: (e) => setVendorCode(e.target.value) }), _jsx(Button, { variant: "contained", onClick: createVendor, disabled: !branchId, children: "\u0625\u0636\u0627\u0641\u0629 \u0645\u0648\u0631\u062F" })] }), _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u0627\u0644\u0645\u0648\u0631\u062F" }), _jsx(TableCell, { children: "\u0627\u0644\u0643\u0648\u062F" }), _jsx(TableCell, { children: "\u0627\u0644\u0647\u0627\u062A\u0641" })] }) }), _jsx(TableBody, { children: vendorsLoading ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 3, children: "\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644\u2026" }) })) : !vendors.length && !vendorsError ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 3, children: "\u0644\u0627 \u064A\u0648\u062C\u062F \u0645\u0648\u0631\u062F\u0648\u0646 \u0628\u0639\u062F." }) })) : (vendors.map((v) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: v.name }), _jsx(TableCell, { children: v.code }), _jsx(TableCell, { children: v.phone ?? '—' })] }, v.id)))) })] }), _jsx(Typography, { variant: "subtitle1", fontWeight: 800, children: "\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621" }), _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u0631\u0642\u0645 \u0627\u0644\u0623\u0645\u0631" }), _jsx(TableCell, { children: "\u0627\u0644\u0645\u0648\u0631\u062F" }), _jsx(TableCell, { children: "\u0627\u0644\u062D\u0627\u0644\u0629" }), _jsx(TableCell, {})] }) }), _jsx(TableBody, { children: purchaseOrders.map((po) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: po.orderNumber }), _jsx(TableCell, { children: po.vendor?.name }), _jsx(TableCell, { children: _jsx(Chip, { size: "small", label: po.status }) }), _jsx(TableCell, { children: po.status !== 'RECEIVED' && po.status !== 'CANCELLED' ? (_jsx(Button, { size: "small", onClick: () => receivePO(po.id), children: "\u0627\u0633\u062A\u0644\u0627\u0645" })) : null })] }, po.id))) })] })] }));
}
