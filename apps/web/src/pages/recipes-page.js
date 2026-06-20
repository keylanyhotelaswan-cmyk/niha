import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid2, MenuItem, Paper, Snackbar, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { SectionCard, MetricCard } from './shared.js';
import { useAuth } from '../lib/auth-context.js';
const API = 'http://localhost:4000/api';
export function RecipesPage() {
    const { accessToken } = useAuth();
    const authHeaders = useMemo(() => ({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
    }), [accessToken]);
    const [branches, setBranches] = useState([]);
    const [branchId, setBranchId] = useState('');
    const [products, setProducts] = useState([]);
    const [stockItems, setStockItems] = useState([]);
    const [units, setUnits] = useState([]);
    const [recipes, setRecipes] = useState([]);
    const [versions, setVersions] = useState([]);
    const [selectedRecipeId, setSelectedRecipeId] = useState('');
    const [selectedVersionId, setSelectedVersionId] = useState('');
    const [recipeDialog, setRecipeDialog] = useState(false);
    const [versionDialog, setVersionDialog] = useState(false);
    const [msg, setMsg] = useState('');
    const [snack, setSnack] = useState(false);
    const [loading, setLoading] = useState(false);
    // Recipe form
    const [recipeForm, setRecipeForm] = useState({ productId: '', name: '' });
    // Version form with components
    const [versionForm, setVersionForm] = useState({
        recipeId: '',
        yieldQuantity: '1',
        wastePercent: '0',
        components: [],
    });
    // Fetch base data
    const fetchBranches = async () => {
        try {
            const r = await fetch(`${API}/branches`, { headers: authHeaders });
            if (r.ok) {
                const data = await r.json();
                setBranches(data);
                if (data.length > 0 && !branchId)
                    setBranchId(data[0].id);
            }
        }
        catch { }
    };
    const fetchProducts = async () => {
        if (!branchId)
            return;
        try {
            const r = await fetch(`${API}/products?branchId=${branchId}`, { headers: authHeaders });
            if (r.ok)
                setProducts(await r.json());
        }
        catch { }
    };
    const fetchStockItems = async () => {
        if (!branchId)
            return;
        try {
            const r = await fetch(`${API}/stock-items?branchId=${branchId}`, { headers: authHeaders });
            if (r.ok)
                setStockItems(await r.json());
        }
        catch { }
    };
    const fetchUnits = async () => {
        try {
            const r = await fetch(`${API}/units`, { headers: authHeaders });
            if (r.ok)
                setUnits(await r.json());
        }
        catch { }
    };
    const fetchRecipes = async () => {
        if (!branchId)
            return;
        try {
            const r = await fetch(`${API}/recipes?branchId=${branchId}`, { headers: authHeaders });
            if (r.ok)
                setRecipes(await r.json());
        }
        catch { }
    };
    const fetchVersions = async (recipeId) => {
        if (!recipeId)
            return;
        try {
            const r = await fetch(`${API}/recipes/${recipeId}/versions`, { headers: authHeaders });
            if (r.ok)
                setVersions(await r.json());
        }
        catch { }
    };
    useEffect(() => { fetchBranches(); }, []);
    useEffect(() => { if (branchId) {
        fetchProducts();
        fetchStockItems();
        fetchRecipes();
    } }, [branchId]);
    const handleSelectRecipe = (id) => {
        setSelectedRecipeId(id);
        fetchVersions(id);
        setVersionForm((f) => ({ ...f, recipeId: id }));
    };
    // Compute total cost from versionForm components
    const computedTotalCost = useMemo(() => {
        let sum = 0;
        for (const c of versionForm.components) {
            const item = stockItems.find((s) => s.id === c.stockItemId);
            if (!item)
                continue;
            const qty = Number(c.quantity) || 0;
            const waste = Number(c.wastePercent) || 0;
            const avgCost = item.averageCost || 0;
            sum += qty * avgCost * (1 + waste / 100);
        }
        const waste = Number(versionForm.wastePercent) || 0;
        return sum * (1 + waste / 100);
    }, [versionForm, stockItems]);
    const addComponentRow = () => {
        setVersionForm((f) => ({
            ...f,
            components: [...f.components, { stockItemId: stockItems[0]?.id || '', unitId: units[0]?.id || '', quantity: '0', wastePercent: '0' }],
        }));
    };
    const updateComponent = (index, field, value) => {
        setVersionForm((f) => ({
            ...f,
            components: f.components.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
        }));
    };
    const createRecipe = async () => {
        if (!recipeForm.productId || !recipeForm.name.trim())
            return;
        setLoading(true);
        const prod = products.find((p) => p.id === recipeForm.productId);
        try {
            const res = await fetch(`${API}/recipes`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ branchId, productId: recipeForm.productId, name: recipeForm.name.trim() }),
            });
            if (res.ok) {
                setMsg(`✅ تم إضافة وصفة ${recipeForm.name}`);
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
                stockItemId: c.stockItemId,
                unitId: c.unitId,
                quantity: Number(c.quantity),
                wastePercent: Number(c.wastePercent) || 0,
            })),
        };
        try {
            const res = await fetch(`${API}/recipes/${versionForm.recipeId}/versions`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify(body),
            });
            if (res.ok) {
                setMsg('✅ تم إنشاء الإصدار بنجاح');
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
            const res = await fetch(`${API}/recipes/${id}`, { method: 'DELETE', headers: authHeaders });
            if (res.ok) {
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
    const stats = useMemo(() => [
        { label: 'الوصفات', value: String(recipes.length), note: 'وصفات مسجلة', progress: recipes.length > 0 ? 80 : 0, tone: '#1d4ed8' },
        { label: 'الإصدارات', value: String(versions.length), note: `للوصفة المحددة`, progress: versions.length > 0 ? 65 : 0, tone: '#0f766e' },
        { label: 'تكلفة النشط', value: selectedVersion ? `${Number(selectedVersion.totalCost).toFixed(2)} ج.م` : '—', note: selectedVersion ? `REV-${selectedVersion.versionNumber}` : '', progress: selectedVersion ? 70 : 0, tone: '#7c3aed' },
        { label: 'منتجات كتالوج', value: String(products.length), note: 'صنف متاح', progress: 45, tone: '#b45309' },
    ], [recipes, versions, selectedVersion, products]);
    return (_jsxs(Stack, { spacing: 2.5, children: [_jsx(Snackbar, { open: snack, autoHideDuration: 3000, onClose: () => setSnack(false), anchorOrigin: { vertical: 'bottom', horizontal: 'center' }, children: _jsx(Alert, { severity: msg.startsWith('✅') ? 'success' : 'error', children: msg }) }), _jsx(Grid2, { container: true, spacing: 2, children: stats.map((card) => (_jsx(Grid2, { size: { xs: 12, md: 6, xl: 3 }, children: _jsx(MetricCard, { ...card }) }, card.label))) }), _jsx(SectionCard, { title: "\u0627\u0644\u0648\u0635\u0641\u0627\u062A", description: "\u0631\u0628\u0637 \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0627\u0644\u0646\u0647\u0627\u0626\u064A\u0629 \u0628\u0627\u0644\u0645\u0643\u0648\u0646\u0627\u062A \u0627\u0644\u0645\u062E\u0632\u0646\u064A\u0629", action: _jsx(Button, { variant: "contained", onClick: () => setRecipeDialog(true), children: "\u0625\u0636\u0627\u0641\u0629 \u0648\u0635\u0641\u0629" }), children: _jsx(Paper, { elevation: 0, sx: { borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(117, 89, 77, 0.12)' }, children: _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u0627\u0644\u0648\u0635\u0641\u0629" }), _jsx(TableCell, { children: "\u0627\u0644\u0645\u0646\u062A\u062C" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u062D\u0627\u0644\u0629" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u0625\u0635\u062F\u0627\u0631\u0627\u062A" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u0625\u062C\u0631\u0627\u0621\u0627\u062A" })] }) }), _jsxs(TableBody, { children: [recipes.map((r) => {
                                        const prod = products.find((p) => p.id === r.productId);
                                        return (_jsxs(TableRow, { hover: true, selected: selectedRecipeId === r.id, onClick: () => handleSelectRecipe(r.id), sx: { cursor: 'pointer' }, children: [_jsx(TableCell, { children: _jsx(Typography, { fontWeight: 700, children: r.name }) }), _jsx(TableCell, { children: prod?.name || '—' }), _jsx(TableCell, { align: "left", children: _jsx(Chip, { size: "small", label: r.isActive ? 'نشط' : 'غير نشط', color: r.isActive ? 'success' : 'default' }) }), _jsx(TableCell, { align: "left", children: r._count?.versions ?? '—' }), _jsx(TableCell, { align: "left", children: _jsxs(Stack, { direction: "row", spacing: 1, children: [_jsx(Button, { size: "small", variant: "outlined", onClick: (e) => { e.stopPropagation(); handleSelectRecipe(r.id); setVersionForm((f) => ({ ...f, recipeId: r.id })); setVersionDialog(true); }, children: "\u0625\u0636\u0627\u0641\u0629 \u0625\u0635\u062F\u0627\u0631" }), _jsx(Button, { size: "small", variant: "outlined", color: "error", onClick: (e) => { e.stopPropagation(); deleteRecipe(r.id); }, children: "\u062D\u0630\u0641" })] }) })] }, r.id));
                                    }), recipes.length === 0 && _jsx(TableRow, { children: _jsx(TableCell, { colSpan: 5, align: "center", children: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0648\u0635\u0641\u0627\u062A \u0628\u0639\u062F" }) })] })] }) }) }), selectedRecipeId && (_jsxs(SectionCard, { title: "\u0625\u0635\u062F\u0627\u0631\u0627\u062A \u0627\u0644\u0648\u0635\u0641\u0629", description: `الوصفة المحددة: ${recipes.find((r) => r.id === selectedRecipeId)?.name || ''}`, children: [_jsx(Paper, { elevation: 0, sx: { borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(117, 89, 77, 0.12)' }, children: _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u0627\u0644\u0625\u0635\u062F\u0627\u0631" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u0639\u0627\u0626\u062F" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u0647\u0627\u0644\u0643 %" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u062A\u0643\u0644\u0641\u0629" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u062D\u0627\u0644\u0629" })] }) }), _jsxs(TableBody, { children: [versions.length === 0 && _jsx(TableRow, { children: _jsx(TableCell, { colSpan: 5, align: "center", children: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0625\u0635\u062F\u0627\u0631\u0627\u062A \u0628\u0639\u062F" }) }), versions.map((v) => (_jsxs(TableRow, { hover: true, selected: selectedVersionId === v.id, onClick: () => setSelectedVersionId(v.id), sx: { cursor: 'pointer' }, children: [_jsx(TableCell, { children: _jsxs(Typography, { fontWeight: 700, children: ["REV-", v.versionNumber] }) }), _jsx(TableCell, { align: "left", children: v.yieldQuantity }), _jsxs(TableCell, { align: "left", children: [v.wastePercent, "%"] }), _jsxs(TableCell, { align: "left", children: [Number(v.totalCost).toFixed(2), " \u062C.\u0645"] }), _jsx(TableCell, { align: "left", children: _jsx(Chip, { size: "small", label: v.status === 'ACTIVE' ? 'نشط' : 'مؤرشف', color: v.status === 'ACTIVE' ? 'success' : 'default' }) })] }, v.id)))] })] }) }), selectedVersion && selectedVersion.components && selectedVersion.components.length > 0 && (_jsxs(Paper, { elevation: 0, sx: { mt: 2, p: 2, borderRadius: 4, border: '1px solid rgba(117, 89, 77, 0.12)' }, children: [_jsxs(Typography, { variant: "h6", fontWeight: 800, sx: { mb: 2 }, children: ["\u0645\u0643\u0648\u0646\u0627\u062A REV-", selectedVersion.versionNumber] }), _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u0627\u0644\u0645\u0643\u0648\u0646" }), _jsx(TableCell, { children: "\u0627\u0644\u0643\u0645\u064A\u0629" }), _jsx(TableCell, { children: "\u0646\u0633\u0628\u0629 \u0627\u0644\u0647\u0627\u0644\u0643" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u062A\u0643\u0644\u0641\u0629" })] }) }), _jsx(TableBody, { children: selectedVersion.components.map((c) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: c.stockItemName }), _jsx(TableCell, { children: c.quantity }), _jsxs(TableCell, { children: [c.wastePercent, "%"] }), _jsxs(TableCell, { align: "left", children: [Number(c.costAmount).toFixed(2), " \u062C.\u0645"] })] }, c.id))) })] })] }))] })), _jsxs(Dialog, { open: recipeDialog, onClose: () => setRecipeDialog(false), fullWidth: true, maxWidth: "sm", children: [_jsx(DialogTitle, { children: "\u0625\u0636\u0627\u0641\u0629 \u0648\u0635\u0641\u0629 \u062C\u062F\u064A\u062F\u0629" }), _jsx(DialogContent, { children: _jsxs(Stack, { spacing: 2, sx: { pt: 1 }, children: [_jsx(TextField, { select: true, label: "\u0627\u0644\u0645\u0646\u062A\u062C \u0627\u0644\u0646\u0647\u0627\u0626\u064A", fullWidth: true, value: recipeForm.productId, onChange: (e) => {
                                        const prod = products.find((p) => p.id === e.target.value);
                                        setRecipeForm({ productId: e.target.value, name: prod?.name || '' });
                                    }, children: products.map((p) => _jsx(MenuItem, { value: p.id, children: p.name }, p.id)) }), _jsx(TextField, { label: "\u0627\u0633\u0645 \u0627\u0644\u0648\u0635\u0641\u0629", fullWidth: true, value: recipeForm.name, onChange: (e) => setRecipeForm((f) => ({ ...f, name: e.target.value })) })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setRecipeDialog(false), children: "\u0625\u0644\u063A\u0627\u0621" }), _jsx(Button, { variant: "contained", onClick: createRecipe, disabled: loading, children: "\u062D\u0641\u0638" })] })] }), _jsxs(Dialog, { open: versionDialog, onClose: () => setVersionDialog(false), fullWidth: true, maxWidth: "md", children: [_jsx(DialogTitle, { children: "\u0625\u0636\u0627\u0641\u0629 \u0625\u0635\u062F\u0627\u0631 \u062C\u062F\u064A\u062F" }), _jsx(DialogContent, { children: _jsxs(Stack, { spacing: 2, sx: { pt: 1 }, children: [_jsxs(Grid2, { container: true, spacing: 1.5, children: [_jsx(Grid2, { size: { xs: 12, md: 6 }, children: _jsx(TextField, { label: "\u0627\u0644\u0648\u0635\u0641\u0629", fullWidth: true, value: recipes.find((r) => r.id === versionForm.recipeId)?.name || '', InputProps: { readOnly: true } }) }), _jsx(Grid2, { size: { xs: 12, md: 3 }, children: _jsx(TextField, { label: "\u0627\u0644\u0639\u0627\u0626\u062F", type: "number", fullWidth: true, value: versionForm.yieldQuantity, onChange: (e) => setVersionForm((f) => ({ ...f, yieldQuantity: e.target.value })) }) }), _jsx(Grid2, { size: { xs: 12, md: 3 }, children: _jsx(TextField, { label: "\u0627\u0644\u0647\u0627\u0644\u0643 %", type: "number", fullWidth: true, value: versionForm.wastePercent, onChange: (e) => setVersionForm((f) => ({ ...f, wastePercent: e.target.value })) }) })] }), _jsx(Typography, { variant: "subtitle1", fontWeight: 800, children: "\u0627\u0644\u0645\u0643\u0648\u0646\u0627\u062A" }), versionForm.components.map((comp, index) => (_jsxs(Grid2, { container: true, spacing: 1.5, children: [_jsx(Grid2, { size: { xs: 12, md: 4 }, children: _jsx(TextField, { select: true, label: "\u0627\u0644\u062E\u0627\u0645\u0629", fullWidth: true, value: comp.stockItemId, onChange: (e) => updateComponent(index, 'stockItemId', e.target.value), children: stockItems.map((s) => _jsxs(MenuItem, { value: s.id, children: [s.name, " (\u0645\u062A\u0648\u0633\u0637: ", s.averageCost, " \u062C.\u0645)"] }, s.id)) }) }), _jsx(Grid2, { size: { xs: 12, md: 2 }, children: _jsx(TextField, { select: true, label: "\u0627\u0644\u0648\u062D\u062F\u0629", fullWidth: true, value: comp.unitId, onChange: (e) => updateComponent(index, 'unitId', e.target.value), children: units.map((u) => _jsxs(MenuItem, { value: u.id, children: [u.name, " (", u.code, ")"] }, u.id)) }) }), _jsx(Grid2, { size: { xs: 12, md: 3 }, children: _jsx(TextField, { label: "\u0627\u0644\u0643\u0645\u064A\u0629", type: "number", fullWidth: true, value: comp.quantity, onChange: (e) => updateComponent(index, 'quantity', e.target.value) }) }), _jsx(Grid2, { size: { xs: 12, md: 3 }, children: _jsx(TextField, { label: "\u0647\u0627\u0644\u0643 \u0627\u0644\u0645\u0643\u0648\u0646 %", type: "number", fullWidth: true, value: comp.wastePercent, onChange: (e) => updateComponent(index, 'wastePercent', e.target.value) }) })] }, index))), _jsx(Button, { variant: "outlined", onClick: addComponentRow, children: "\u0625\u0636\u0627\u0641\u0629 \u0645\u0643\u0648\u0646" }), _jsxs(Paper, { elevation: 0, sx: { p: 2, borderRadius: 3, bgcolor: 'rgba(15,118,110,0.08)', border: '1px solid rgba(15,118,110,0.2)' }, children: [_jsxs(Typography, { variant: "h6", fontWeight: 800, children: ["\u0627\u0644\u062A\u0643\u0644\u0641\u0629 \u0627\u0644\u062A\u0642\u062F\u064A\u0631\u064A\u0629: ", computedTotalCost.toFixed(2), " \u062C.\u0645"] }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u064A\u062A\u0645 \u0627\u0644\u062D\u0633\u0627\u0628 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0645\u0646 \u0645\u062A\u0648\u0633\u0637 \u062A\u0643\u0644\u0641\u0629 \u0627\u0644\u062E\u0627\u0645\u0627\u062A + \u0647\u0627\u0644\u0643 \u0627\u0644\u0645\u0643\u0648\u0646\u0627\u062A + \u0647\u0627\u0644\u0643 \u0627\u0644\u0625\u0646\u062A\u0627\u062C" })] })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setVersionDialog(false), children: "\u0625\u0644\u063A\u0627\u0621" }), _jsx(Button, { variant: "contained", onClick: createVersion, disabled: loading, children: "\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0625\u0635\u062F\u0627\u0631" })] })] })] }));
}
