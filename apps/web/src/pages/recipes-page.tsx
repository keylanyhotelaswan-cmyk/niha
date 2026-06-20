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

  const [branches, setBranches] = useState<any[]>([]);
  const [branchId, setBranchId] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
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
    components: [] as Array<{ stockItemId: string; unitId: string; quantity: string; wastePercent: string }>,
  });

  // Fetch base data
  const fetchBranches = async () => {
    try { const r = await fetch(`${API}/branches`, { headers: authHeaders }); if (r.ok) { const data = await r.json(); setBranches(data); if (data.length > 0 && !branchId) setBranchId(data[0].id); } } catch {}
  };
  const fetchProducts = async () => {
    if (!branchId) return;
    try { const r = await fetch(`${API}/products?branchId=${branchId}`, { headers: authHeaders }); if (r.ok) setProducts(await r.json()); } catch {}
  };
  const fetchStockItems = async () => {
    if (!branchId) return;
    try { const r = await fetch(`${API}/stock-items?branchId=${branchId}`, { headers: authHeaders }); if (r.ok) setStockItems(await r.json()); } catch {}
  };
  const fetchUnits = async () => {
    try { const r = await fetch(`${API}/units`, { headers: authHeaders }); if (r.ok) setUnits(await r.json()); } catch {}
  };
  const fetchRecipes = async () => {
    if (!branchId) return;
    try { const r = await fetch(`${API}/recipes?branchId=${branchId}`, { headers: authHeaders }); if (r.ok) setRecipes(await r.json()); } catch {}
  };
  const fetchVersions = async (recipeId: string) => {
    if (!recipeId) return;
    try { const r = await fetch(`${API}/recipes/${recipeId}/versions`, { headers: authHeaders }); if (r.ok) setVersions(await r.json()); } catch {}
  };

  useEffect(() => { fetchBranches(); }, []);
  useEffect(() => { if (branchId) { fetchProducts(); fetchStockItems(); fetchRecipes(); } }, [branchId]);

  const handleSelectRecipe = (id: string) => {
    setSelectedRecipeId(id);
    fetchVersions(id);
    setVersionForm((f) => ({ ...f, recipeId: id }));
  };

  // Compute total cost from versionForm components
  const computedTotalCost = useMemo(() => {
    let sum = 0;
    for (const c of versionForm.components) {
      const item = stockItems.find((s) => s.id === c.stockItemId);
      if (!item) continue;
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

  const updateComponent = (index: number, field: string, value: string) => {
    setVersionForm((f) => ({
      ...f,
      components: f.components.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    }));
  };

  const createRecipe = async () => {
    if (!recipeForm.productId || !recipeForm.name.trim()) return;
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
      } else { const e = await res.json(); setMsg(`❌ ${e.message}`); }
    } catch { setMsg('❌ فشل الاتصال'); }
    setLoading(false); setSnack(true);
  };

  const deleteRecipe = async (id: string) => {
    try {
      const res = await fetch(`${API}/recipes/${id}`, { method: 'DELETE', headers: authHeaders });
      if (res.ok) { setMsg('✅ تم حذف الوصفة'); fetchRecipes(); setSelectedRecipeId(''); setVersions([]); }
    } catch {}
    setSnack(true);
  };

  const selectedVersion = useMemo(() => versions.find((v) => v.id === selectedVersionId), [versions, selectedVersionId]);

  const stats = useMemo(() => [
    { label: 'الوصفات', value: String(recipes.length), note: 'وصفات مسجلة', progress: recipes.length > 0 ? 80 : 0, tone: '#1d4ed8' },
    { label: 'الإصدارات', value: String(versions.length), note: `للوصفة المحددة`, progress: versions.length > 0 ? 65 : 0, tone: '#0f766e' },
    { label: 'تكلفة النشط', value: selectedVersion ? `${Number(selectedVersion.totalCost).toFixed(2)} ج.م` : '—', note: selectedVersion ? `REV-${selectedVersion.versionNumber}` : '', progress: selectedVersion ? 70 : 0, tone: '#7c3aed' },
    { label: 'منتجات كتالوج', value: String(products.length), note: 'صنف متاح', progress: 45, tone: '#b45309' },
  ], [recipes, versions, selectedVersion, products]);

  return (
    <Stack spacing={2.5}>
      <Snackbar open={snack} autoHideDuration={3000} onClose={() => setSnack(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={msg.startsWith('✅') ? 'success' : 'error'}>{msg}</Alert>
      </Snackbar>

      <Grid2 container spacing={2}>
        {stats.map((card) => (<Grid2 size={{ xs: 12, md: 6, xl: 3 }} key={card.label}><MetricCard {...card} /></Grid2>))}
      </Grid2>

      {/* Recipes List */}
      <SectionCard
        title="الوصفات"
        description="ربط المنتجات النهائية بالمكونات المخزنية"
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
              {recipes.map((r) => {
                const prod = products.find((p) => p.id === r.productId);
                return (
                  <TableRow key={r.id} hover selected={selectedRecipeId === r.id} onClick={() => handleSelectRecipe(r.id)} sx={{ cursor: 'pointer' }}>
                    <TableCell><Typography fontWeight={700}>{r.name}</Typography></TableCell>
                    <TableCell>{prod?.name || '—'}</TableCell>
                    <TableCell align="left"><Chip size="small" label={r.isActive ? 'نشط' : 'غير نشط'} color={r.isActive ? 'success' : 'default'} /></TableCell>
                    <TableCell align="left">{r._count?.versions ?? '—'}</TableCell>
                    <TableCell align="left">
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); handleSelectRecipe(r.id); setVersionForm((f) => ({ ...f, recipeId: r.id })); setVersionDialog(true); }}>إضافة إصدار</Button>
                        <Button size="small" variant="outlined" color="error" onClick={(e) => { e.stopPropagation(); deleteRecipe(r.id); }}>حذف</Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
              {recipes.length === 0 && <TableRow><TableCell colSpan={5} align="center">لا توجد وصفات بعد</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Paper>
      </SectionCard>

      {/* Versions for selected recipe */}
      {selectedRecipeId && (
        <SectionCard title="إصدارات الوصفة" description={`الوصفة المحددة: ${recipes.find((r) => r.id === selectedRecipeId)?.name || ''}`}>
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
                {versions.length === 0 && <TableRow><TableCell colSpan={5} align="center">لا توجد إصدارات بعد</TableCell></TableRow>}
                {versions.map((v) => (
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

          {/* Version details with components */}
          {selectedVersion && selectedVersion.components && selectedVersion.components.length > 0 && (
            <Paper elevation={0} sx={{ mt: 2, p: 2, borderRadius: 4, border: '1px solid rgba(117, 89, 77, 0.12)' }}>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>مكونات REV-{selectedVersion.versionNumber}</Typography>
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
                      <TableCell>{c.stockItemName}</TableCell>
                      <TableCell>{c.quantity}</TableCell>
                      <TableCell>{c.wastePercent}%</TableCell>
                      <TableCell align="left">{Number(c.costAmount).toFixed(2)} ج.م</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}
        </SectionCard>
      )}

      {/* Create Recipe Dialog */}
      <Dialog open={recipeDialog} onClose={() => setRecipeDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>إضافة وصفة جديدة</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField select label="المنتج النهائي" fullWidth value={recipeForm.productId} onChange={(e) => {
              const prod = products.find((p) => p.id === e.target.value);
              setRecipeForm({ productId: e.target.value, name: prod?.name || '' });
            }}>
              {products.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </TextField>
            <TextField label="اسم الوصفة" fullWidth value={recipeForm.name} onChange={(e) => setRecipeForm((f) => ({ ...f, name: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRecipeDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={createRecipe} disabled={loading}>حفظ</Button>
        </DialogActions>
      </Dialog>

      {/* Create Version Dialog */}
      <Dialog open={versionDialog} onClose={() => setVersionDialog(false)} fullWidth maxWidth="md">
        <DialogTitle>إضافة إصدار جديد</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Grid2 container spacing={1.5}>
              <Grid2 size={{ xs: 12, md: 6 }}>
                <TextField label="الوصفة" fullWidth value={recipes.find((r) => r.id === versionForm.recipeId)?.name || ''} InputProps={{ readOnly: true }} />
              </Grid2>
              <Grid2 size={{ xs: 12, md: 3 }}>
                <TextField label="العائد" type="number" fullWidth value={versionForm.yieldQuantity} onChange={(e) => setVersionForm((f) => ({ ...f, yieldQuantity: e.target.value }))} />
              </Grid2>
              <Grid2 size={{ xs: 12, md: 3 }}>
                <TextField label="الهالك %" type="number" fullWidth value={versionForm.wastePercent} onChange={(e) => setVersionForm((f) => ({ ...f, wastePercent: e.target.value }))} />
              </Grid2>
            </Grid2>

            <Typography variant="subtitle1" fontWeight={800}>المكونات</Typography>

            {versionForm.components.map((comp, index) => (
              <Grid2 container spacing={1.5} key={index}>
                <Grid2 size={{ xs: 12, md: 4 }}>
                  <TextField select label="الخامة" fullWidth value={comp.stockItemId} onChange={(e) => updateComponent(index, 'stockItemId', e.target.value)}>
                    {stockItems.map((s) => <MenuItem key={s.id} value={s.id}>{s.name} (متوسط: {s.averageCost} ج.م)</MenuItem>)}
                  </TextField>
                </Grid2>
                <Grid2 size={{ xs: 12, md: 2 }}>
                  <TextField select label="الوحدة" fullWidth value={comp.unitId} onChange={(e) => updateComponent(index, 'unitId', e.target.value)}>
                    {units.map((u) => <MenuItem key={u.id} value={u.id}>{u.name} ({u.code})</MenuItem>)}
                  </TextField>
                </Grid2>
                <Grid2 size={{ xs: 12, md: 3 }}>
                  <TextField label="الكمية" type="number" fullWidth value={comp.quantity} onChange={(e) => updateComponent(index, 'quantity', e.target.value)} />
                </Grid2>
                <Grid2 size={{ xs: 12, md: 3 }}>
                  <TextField label="هالك المكون %" type="number" fullWidth value={comp.wastePercent} onChange={(e) => updateComponent(index, 'wastePercent', e.target.value)} />
                </Grid2>
              </Grid2>
            ))}

            <Button variant="outlined" onClick={addComponentRow}>إضافة مكون</Button>

            {/* Live calculation display */}
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(15,118,110,0.08)', border: '1px solid rgba(15,118,110,0.2)' }}>
              <Typography variant="h6" fontWeight={800}>التكلفة التقديرية: {computedTotalCost.toFixed(2)} ج.م</Typography>
              <Typography variant="body2" color="text.secondary">يتم الحساب تلقائياً من متوسط تكلفة الخامات + هالك المكونات + هالك الإنتاج</Typography>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVersionDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={createVersion} disabled={loading}>إنشاء الإصدار</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}