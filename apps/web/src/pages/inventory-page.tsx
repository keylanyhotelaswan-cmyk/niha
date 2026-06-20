import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Grid2,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../lib/auth-context.js';
import { MetricCard, SectionCard } from './shared.js';
import { useVendors, usePurchaseOrders } from '../lib/hooks.js';
import { API_BASE, apiPost } from '../lib/api-client.js';

export function InventoryPage() {
  const { accessToken } = useAuth();
  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  }), [accessToken]);

  const [branches, setBranches] = useState<any[]>([]);
  const [branchId, setBranchId] = useState('');

  // === Stock Items (الخامات) ===
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [stockItemDialog, setStockItemDialog] = useState(false);
  const [stockItemForm, setStockItemForm] = useState({ name: '', code: '', unitId: '', warehouseId: '', averageCost: '0', onHandQuantity: '0' });

  // === Warehouses + Units ===
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  // === Recipes (دمج الوصفات هنا) ===
  const [products, setProducts] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [recipeDialog, setRecipeDialog] = useState(false);
  const [versionDialog, setVersionDialog] = useState(false);
  const [recipeForm, setRecipeForm] = useState({ productId: '', name: '' });
  const [versionForm, setVersionForm] = useState({
    recipeId: '', yieldQuantity: '1', wastePercent: '0',
    components: [] as Array<{ stockItemId: string; unitId: string; quantity: string; wastePercent: string }>,
  });

  const [msg, setMsg] = useState('');
  const [snack, setSnack] = useState(false);
  const [loading, setLoading] = useState(false);

  // === Fetch all data ===
  const fetchBranches = async () => {
    try { const r = await fetch(`${API_BASE}/branches`, { headers }); if (r.ok) { const d = await r.json(); setBranches(d); if (d.length > 0 && !branchId) setBranchId(d[0].id); } } catch {}
  };
  const fetchStockItems = async () => {
    if (!branchId) return;
    try { const r = await fetch(`${API_BASE}/stock-items?branchId=${branchId}`, { headers }); if (r.ok) setStockItems(await r.json()); } catch {}
  };
  const fetchWarehouses = async () => {
    if (!branchId) return;
    try { const r = await fetch(`${API_BASE}/warehouses?branchId=${branchId}`, { headers }); if (r.ok) setWarehouses(await r.json()); } catch {}
  };
  const fetchUnits = async () => {
    try { const r = await fetch(`${API_BASE}/units`, { headers }); if (r.ok) setUnits(await r.json()); } catch {}
  };
  const fetchProducts = async () => {
    if (!branchId) return;
    try { const r = await fetch(`${API_BASE}/products?branchId=${branchId}`, { headers }); if (r.ok) setProducts(await r.json()); } catch {}
  };
  const fetchRecipes = async () => {
    if (!branchId) return;
    try { const r = await fetch(`${API_BASE}/recipes?branchId=${branchId}`, { headers }); if (r.ok) setRecipes(await r.json()); } catch {}
  };
  const fetchVersions = async (recipeId: string) => {
    if (!recipeId) return;
    try { const r = await fetch(`${API_BASE}/recipes/${recipeId}/versions`, { headers }); if (r.ok) setVersions(await r.json()); } catch {}
  };

  useEffect(() => { fetchBranches(); }, []);
  useEffect(() => {
    if (branchId) {
      fetchStockItems(); fetchWarehouses(); fetchUnits();
      fetchProducts(); fetchRecipes();
    }
  }, [branchId]);

  // === Stock Item CRUD ===
  const createStockItem = async () => {
    if (!stockItemForm.name.trim() || !stockItemForm.code.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/stock-items`, {
        method: 'POST', headers,
        body: JSON.stringify({
          branchId, warehouseId: stockItemForm.warehouseId || warehouses[0]?.id || '',
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
      } else { const e = await res.json(); setMsg(`❌ ${e.message}`); }
    } catch { setMsg('❌ فشل الاتصال'); }
    setLoading(false); setSnack(true);
  };

  const deleteStockItem = async (id: string) => {
    try { const r = await fetch(`${API_BASE}/stock-items/${id}`, { method: 'DELETE', headers }); if (r.ok) { setMsg('✅ تم الحذف'); fetchStockItems(); } } catch {}
    setSnack(true);
  };

  // === Recipe CRUD ===
  const handleSelectRecipe = (id: string) => {
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

  const updateComponent = (index: number, field: string, value: string) => {
    setVersionForm((f) => ({
      ...f, components: f.components.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    }));
  };

  const computedTotalCost = useMemo(() => {
    let sum = 0;
    for (const c of versionForm.components) {
      const item = stockItems.find((s) => s.id === c.stockItemId);
      if (!item) continue;
      const qty = Number(c.quantity) || 0;
      const waste = Number(c.wastePercent) || 0;
      const avgCost = item.averageCost || 0;
      sum += qty * Number(avgCost) * (1 + waste / 100);
    }
    const waste = Number(versionForm.wastePercent) || 0;
    return sum * (1 + waste / 100);
  }, [versionForm, stockItems]);

  const createRecipe = async () => {
    if (!recipeForm.productId || !recipeForm.name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/recipes`, {
        method: 'POST', headers,
        body: JSON.stringify({ branchId, productId: recipeForm.productId, name: recipeForm.name.trim() }),
      });
      if (res.ok) {
        setMsg('✅ تم إضافة الوصفة');
        setRecipeDialog(false); setRecipeForm({ productId: '', name: '' });
        fetchRecipes();
      } else { const e = await res.json(); setMsg(`❌ ${e.message}`); }
    } catch { setMsg('❌ فشل الاتصال'); }
    setLoading(false); setSnack(true);
  };

  const createVersion = async () => {
    if (!versionForm.recipeId) return;
    setLoading(true);
    const body: any = {
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
      } else { const e = await res.json(); setMsg(`❌ ${e.message}`); }
    } catch { setMsg('❌ فشل الاتصال'); }
    setLoading(false); setSnack(true);
  };

  const deleteRecipe = async (id: string) => {
    try { const r = await fetch(`${API_BASE}/recipes/${id}`, { method: 'DELETE', headers }); if (r.ok) { setMsg('✅ تم حذف الوصفة'); fetchRecipes(); setSelectedRecipeId(''); setVersions([]); } } catch {}
    setSnack(true);
  };

  const selectedVersion = useMemo(() => versions.find((v) => v.id === selectedVersionId), [versions, selectedVersionId]);

  // === Stats ===
  const stats = useMemo(() => [
    { label: 'الخامات', value: String(stockItems.length), note: 'صنف مخزني', progress: 60, tone: '#1d4ed8' },
    { label: 'المستودعات', value: String(warehouses.length), note: 'مستودع', progress: 100, tone: '#0f766e' },
    { label: 'الوصفات', value: String(recipes.length), note: 'وصفات مسجلة', progress: recipes.length > 0 ? 80 : 0, tone: '#7c3aed' },
    { label: 'منتجات كتالوج', value: String(products.length), note: 'صنف متاح', progress: 45, tone: '#b45309' },
  ], [stockItems, warehouses, recipes, products]);

  return (
    <Stack spacing={2.5}>
      <Snackbar open={snack} autoHideDuration={3000} onClose={() => setSnack(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={msg.startsWith('✅') ? 'success' : 'error'}>{msg}</Alert>
      </Snackbar>

      <Grid2 container spacing={2}>
        {stats.map((card) => (<Grid2 size={{ xs: 12, md: 6, xl: 3 }} key={card.label}><MetricCard {...card} /></Grid2>))}
      </Grid2>

      {/* ========== الخامات (Stock Items) ========== */}
      <SectionCard
        title="الخامات المخزنية"
        description="إدارة الأصناف المخزنية الأساسية (المكونات)"
        action={<Button variant="contained" onClick={() => setStockItemDialog(true)}>إضافة خامة</Button>}
      >
        <Paper elevation={0} sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(117, 89, 77, 0.12)' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>الخامة</TableCell>
                <TableCell>الكود</TableCell>
                <TableCell align="left">الكمية</TableCell>
                <TableCell align="left">متوسط التكلفة</TableCell>
                <TableCell align="left">الحالة</TableCell>
                <TableCell align="left">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stockItems.length === 0 && <TableRow><TableCell colSpan={6} align="center">لا توجد خامات — أضف أول خامة</TableCell></TableRow>}
              {stockItems.map((item: any) => (
                <TableRow key={item.id} hover>
                  <TableCell><Typography fontWeight={700}>{item.name}</Typography></TableCell>
                  <TableCell>{item.code}</TableCell>
                  <TableCell align="left">{Number(item.onHandQuantity).toFixed(2)}</TableCell>
                  <TableCell align="left">{Number(item.averageCost).toFixed(2)} ج.م</TableCell>
                  <TableCell align="left"><Chip size="small" label={item.isActive ? 'نشط' : 'غير نشط'} color={item.isActive ? 'success' : 'default'} /></TableCell>
                  <TableCell align="left"><Button size="small" variant="outlined" color="error" onClick={() => deleteStockItem(item.id)}>حذف</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </SectionCard>

      {/* ========== الوصفات (Recipes) ========== */}
      <SectionCard
        title="الوصفات"
        description="ربط المنتجات النهائية بالمكونات المخزنية لخصم التلقائي عند البيع"
        action={<Button variant="contained" onClick={() => setRecipeDialog(true)}>إضافة وصفة</Button>}
      >
        <Paper elevation={0} sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(117, 89, 77, 0.12)' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>الوصفة</TableCell>
                <TableCell>المنتج</TableCell>
                <TableCell align="left">الحالة</TableCell>
                <TableCell align="left">الإصدارات</TableCell>
                <TableCell align="left">الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recipes.length === 0 && <TableRow><TableCell colSpan={5} align="center">لا توجد وصفات بعد</TableCell></TableRow>}
              {recipes.map((r: any) => {
                const prod = products.find((p: any) => p.id === r.productId);
                return (
                  <TableRow key={r.id} hover selected={selectedRecipeId === r.id} onClick={() => handleSelectRecipe(r.id)} sx={{ cursor: 'pointer' }}>
                    <TableCell><Typography fontWeight={700}>{r.name}</Typography></TableCell>
                    <TableCell>{prod?.name || '—'}</TableCell>
                    <TableCell align="left"><Chip size="small" label={r.isActive ? 'نشط' : 'غير نشط'} color={r.isActive ? 'success' : 'default'} /></TableCell>
                    <TableCell align="left">{versions.length || '—'}</TableCell>
                    <TableCell align="left">
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); handleSelectRecipe(r.id); setVersionForm((f) => ({ ...f, recipeId: r.id })); setVersionDialog(true); }}>إضافة إصدار</Button>
                        <Button size="small" variant="outlined" color="error" onClick={(e) => { e.stopPropagation(); deleteRecipe(r.id); }}>حذف</Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>

        {/* إصدارات الوصفة المحددة */}
        {selectedRecipeId && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
              إصدارات: {recipes.find((r: any) => r.id === selectedRecipeId)?.name}
            </Typography>
            <Paper elevation={0} sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(117, 89, 77, 0.12)' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>الإصدار</TableCell>
                    <TableCell align="left">العائد</TableCell>
                    <TableCell align="left">الهالك %</TableCell>
                    <TableCell align="left">التكلفة</TableCell>
                    <TableCell align="left">الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {versions.length === 0 && <TableRow><TableCell colSpan={5} align="center">لا توجد إصدارات</TableCell></TableRow>}
                  {versions.map((v: any) => (
                    <TableRow key={v.id} hover selected={selectedVersionId === v.id} onClick={() => setSelectedVersionId(v.id)} sx={{ cursor: 'pointer' }}>
                      <TableCell><Typography fontWeight={700}>REV-{v.versionNumber}</Typography></TableCell>
                      <TableCell align="left">{v.yieldQuantity}</TableCell>
                      <TableCell align="left">{v.wastePercent}%</TableCell>
                      <TableCell align="left">{Number(v.totalCost).toFixed(2)} ج.م</TableCell>
                      <TableCell align="left"><Chip size="small" label={v.status === 'ACTIVE' ? 'نشط' : 'مؤرشف'} color={v.status === 'ACTIVE' ? 'success' : 'default'} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>

            {/* مكونات الإصدار المحدد */}
            {selectedVersion?.components && selectedVersion.components.length > 0 && (
              <Paper elevation={0} sx={{ mt: 2, p: 2, borderRadius: 4, border: '1px solid rgba(117, 89, 77, 0.12)' }}>
                <Typography variant="subtitle1" fontWeight={800}>مكونات REV-{selectedVersion.versionNumber}</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>المكون</TableCell>
                      <TableCell>الكمية</TableCell>
                      <TableCell>نسبة الهالك</TableCell>
                      <TableCell align="left">التكلفة</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedVersion.components.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.stockItemName || stockItems.find((s: any) => s.id === c.stockItemId)?.name || '—'}</TableCell>
                        <TableCell>{c.quantity}</TableCell>
                        <TableCell>{c.wastePercent}%</TableCell>
                        <TableCell align="left">{Number(c.costAmount).toFixed(2)} ج.م</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            )}
          </Box>
        )}
      </SectionCard>

      {/* ========== Dialogs ========== */}

      {/* إضافة خامة */}
      <Dialog open={stockItemDialog} onClose={() => setStockItemDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>إضافة خامة جديدة</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="اسم الخامة" fullWidth value={stockItemForm.name} onChange={(e) => setStockItemForm((f) => ({ ...f, name: e.target.value }))} />
            <TextField label="الكود" fullWidth value={stockItemForm.code} onChange={(e) => setStockItemForm((f) => ({ ...f, code: e.target.value }))} />
            <TextField select label="المستودع" fullWidth value={stockItemForm.warehouseId} onChange={(e) => setStockItemForm((f) => ({ ...f, warehouseId: e.target.value }))}>
              {warehouses.map((w: any) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
            </TextField>
            <TextField select label="الوحدة" fullWidth value={stockItemForm.unitId} onChange={(e) => setStockItemForm((f) => ({ ...f, unitId: e.target.value }))}>
              {units.map((u: any) => <MenuItem key={u.id} value={u.id}>{u.name} ({u.code})</MenuItem>)}
            </TextField>
            <Grid2 container spacing={1.5}>
              <Grid2 size={{ xs: 12, md: 6 }}><TextField label="متوسط التكلفة" type="number" fullWidth value={stockItemForm.averageCost} onChange={(e) => setStockItemForm((f) => ({ ...f, averageCost: e.target.value }))} /></Grid2>
              <Grid2 size={{ xs: 12, md: 6 }}><TextField label="الكمية الافتتاحية" type="number" fullWidth value={stockItemForm.onHandQuantity} onChange={(e) => setStockItemForm((f) => ({ ...f, onHandQuantity: e.target.value }))} /></Grid2>
            </Grid2>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStockItemDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={createStockItem} disabled={loading}>حفظ الخامة</Button>
        </DialogActions>
      </Dialog>

      {/* إضافة وصفة */}
      <Dialog open={recipeDialog} onClose={() => setRecipeDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>إضافة وصفة جديدة</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField select label="المنتج النهائي" fullWidth value={recipeForm.productId} onChange={(e) => {
              const p = products.find((prod: any) => prod.id === e.target.value);
              setRecipeForm({ productId: e.target.value, name: p?.name || '' });
            }}>
              {products.map((p: any) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </TextField>
            <TextField label="اسم الوصفة" fullWidth value={recipeForm.name} onChange={(e) => setRecipeForm((f) => ({ ...f, name: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRecipeDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={createRecipe} disabled={loading}>حفظ</Button>
        </DialogActions>
      </Dialog>

      {/* إضافة إصدار مع مكونات */}
      <Dialog open={versionDialog} onClose={() => setVersionDialog(false)} fullWidth maxWidth="md">
        <DialogTitle>إضافة إصدار جديد</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Grid2 container spacing={1.5}>
              <Grid2 size={{ xs: 12, md: 6 }}><TextField label="الوصفة" fullWidth value={recipes.find((r: any) => r.id === versionForm.recipeId)?.name || ''} InputProps={{ readOnly: true }} /></Grid2>
              <Grid2 size={{ xs: 12, md: 3 }}><TextField label="العائد" type="number" fullWidth value={versionForm.yieldQuantity} onChange={(e) => setVersionForm((f) => ({ ...f, yieldQuantity: e.target.value }))} /></Grid2>
              <Grid2 size={{ xs: 12, md: 3 }}><TextField label="الهالك %" type="number" fullWidth value={versionForm.wastePercent} onChange={(e) => setVersionForm((f) => ({ ...f, wastePercent: e.target.value }))} /></Grid2>
            </Grid2>

            <Typography variant="subtitle1" fontWeight={800}>المكونات (من الخامات المخزنية)</Typography>

            {versionForm.components.map((comp, index) => (
              <Grid2 container spacing={1.5} key={index}>
                <Grid2 size={{ xs: 12, md: 4 }}>
                  <TextField select label="الخامة" fullWidth value={comp.stockItemId} onChange={(e) => updateComponent(index, 'stockItemId', e.target.value)}>
                    {stockItems.map((s: any) => <MenuItem key={s.id} value={s.id}>{s.name} (متوسط: {Number(s.averageCost).toFixed(2)} ج.م — رصيد: {Number(s.onHandQuantity).toFixed(2)})</MenuItem>)}
                  </TextField>
                </Grid2>
                <Grid2 size={{ xs: 12, md: 3 }}>
                  <TextField select label="الوحدة" fullWidth value={comp.unitId} onChange={(e) => updateComponent(index, 'unitId', e.target.value)}>
                    {units.map((u: any) => <MenuItem key={u.id} value={u.id}>{u.name} ({u.code})</MenuItem>)}
                  </TextField>
                </Grid2>
                <Grid2 size={{ xs: 12, md: 3 }}><TextField label="الكمية" type="number" fullWidth value={comp.quantity} onChange={(e) => updateComponent(index, 'quantity', e.target.value)} /></Grid2>
                <Grid2 size={{ xs: 12, md: 2 }}><TextField label="هالك %" type="number" fullWidth value={comp.wastePercent} onChange={(e) => updateComponent(index, 'wastePercent', e.target.value)} /></Grid2>
              </Grid2>
            ))}

            <Button variant="outlined" onClick={addComponentRow}>➕ إضافة مكون</Button>

            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(15,118,110,0.08)', border: '1px solid rgba(15,118,110,0.2)' }}>
              <Typography variant="h6" fontWeight={800}>التكلفة التقديرية: {computedTotalCost.toFixed(2)} ج.م</Typography>
              <Typography variant="body2" color="text.secondary">يتم الحساب من متوسط تكلفة الخامات + هالك المكونات + هالك الإنتاج</Typography>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVersionDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={createVersion} disabled={loading}>إنشاء الإصدار</Button>
        </DialogActions>
      </Dialog>

      <SectionCard title="الموردين وأوامر الشراء" description="إدارة الموردين واستلام البضاعة إلى المخزون.">
        <PurchasingPanel branchId={branchId} warehouses={warehouses} accessToken={accessToken} />
      </SectionCard>
    </Stack>
  );
}

function PurchasingPanel({ branchId, warehouses, accessToken }: { branchId: string; warehouses: any[]; accessToken?: string | null }) {
  const { data: vendors = [], refetch: refetchVendors } = useVendors(branchId);
  const { data: purchaseOrders = [], refetch: refetchPOs } = usePurchaseOrders(branchId);
  const [vendorName, setVendorName] = useState('');
  const [vendorCode, setVendorCode] = useState('');
  const [msg, setMsg] = useState('');

  const createVendor = async () => {
    if (!accessToken || !vendorName.trim()) return;
    const res = await apiPost('/vendors', { branchId, name: vendorName, code: vendorCode || vendorName.slice(0, 6).toUpperCase() }, accessToken);
    if (res.ok) {
      setVendorName('');
      setVendorCode('');
      refetchVendors();
      setMsg('تم إضافة المورد.');
    }
  };

  const receivePO = async (poId: string) => {
    if (!accessToken || !warehouses[0]) return;
    const res = await apiPost(`/purchase-orders/${poId}/receive`, { warehouseId: warehouses[0].id }, accessToken);
    if (res.ok) {
      refetchPOs();
      setMsg('تم استلام البضاعة وتحديث المخزون.');
    }
  };

  return (
    <Stack spacing={2}>
      {msg ? <Alert severity="success" onClose={() => setMsg('')}>{msg}</Alert> : null}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
        <TextField label="اسم المورد" size="small" value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
        <TextField label="الكود" size="small" value={vendorCode} onChange={(e) => setVendorCode(e.target.value)} />
        <Button variant="contained" onClick={createVendor}>إضافة مورد</Button>
      </Stack>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>المورد</TableCell>
            <TableCell>الكود</TableCell>
            <TableCell>الهاتف</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {vendors.map((v: any) => (
            <TableRow key={v.id}><TableCell>{v.name}</TableCell><TableCell>{v.code}</TableCell><TableCell>{v.phone ?? '—'}</TableCell></TableRow>
          ))}
        </TableBody>
      </Table>
      <Typography variant="subtitle1" fontWeight={800}>أوامر الشراء</Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>رقم الأمر</TableCell>
            <TableCell>المورد</TableCell>
            <TableCell>الحالة</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {purchaseOrders.map((po: any) => (
            <TableRow key={po.id}>
              <TableCell>{po.orderNumber}</TableCell>
              <TableCell>{po.vendor?.name}</TableCell>
              <TableCell><Chip size="small" label={po.status} /></TableCell>
              <TableCell>
                {po.status !== 'RECEIVED' && po.status !== 'CANCELLED' ? (
                  <Button size="small" onClick={() => receivePO(po.id)}>استلام</Button>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stack>
  );
}