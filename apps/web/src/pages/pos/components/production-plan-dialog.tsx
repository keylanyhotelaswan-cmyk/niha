import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { apiGetProductionPlan, apiSaveProductionPlan } from '../../../lib/api.js';
import { formatDateLabelAr, localTodayKey } from '../../../lib/date-utils.js';
import { ui } from '../../../lib/ui-tokens.js';

type PlanRow = {
  productId: string;
  name: string;
  categoryName: string;
  soldQuantity: number;
  plannedQuantity: number | null;
  draft: string;
};

type ProductionPlanDialogProps = {
  open: boolean;
  branchId: string;
  accessToken?: string | null;
  onClose: () => void;
  onSaved?: () => void;
};

export function ProductionPlanDialog({ open, branchId, accessToken, onClose, onSaved }: ProductionPlanDialogProps) {
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [dateKey, setDateKey] = useState(localTodayKey());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !branchId || !accessToken) return;
    const today = localTodayKey();
    setDateKey(today);
    setLoading(true);
    setError('');
    void apiGetProductionPlan(branchId, today, accessToken).then((res) => {
      if (!res.ok) {
        setError((res as { body?: string; error?: string }).body ?? (res as { error?: string }).error ?? 'فشل التحميل');
        setRows([]);
        setLoading(false);
        return;
      }
      const data = res.data as { dateKey: string; items: Array<{ productId: string; name: string; categoryName: string; soldQuantity: number; plannedQuantity: number | null }> };
      setDateKey(data.dateKey);
      setRows(data.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        categoryName: item.categoryName,
        soldQuantity: item.soldQuantity,
        plannedQuantity: item.plannedQuantity,
        draft: item.plannedQuantity != null ? String(item.plannedQuantity) : '',
      })));
      setLoading(false);
    });
  }, [open, branchId, accessToken]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.categoryName.toLowerCase().includes(q));
  }, [rows, search]);

  const plannedCount = rows.filter((r) => r.draft.trim() !== '').length;

  const save = async () => {
    if (!accessToken) return;
    setSaving(true);
    setError('');
    const items = rows
      .filter((r) => r.draft.trim() !== '' || r.plannedQuantity != null)
      .map((r) => ({
        productId: r.productId,
        plannedQuantity: r.draft.trim() === '' ? null : Number(r.draft) || 0,
      }));
    const res = await apiSaveProductionPlan({ branchId, dateKey, items }, accessToken);
    setSaving(false);
    if (!res.ok) {
      setError((res as { body?: string; error?: string }).body ?? (res as { error?: string }).error ?? 'فشل الحفظ');
      return;
    }
    onSaved?.();
    onClose();
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>خطة الإنتاج اليومية (اختياري)</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            حدّد كم قطعة تخطط تعملها اليوم لكل صنف. اترك الحقل فارغاً للأصناف بدون خطة.
            «مباع» = من طلبات اليوم المغلقة.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            {formatDateLabelAr(dateKey)} · {plannedCount} صنف بخطة
          </Typography>
          <TextField
            size="small"
            placeholder="بحث عن صنف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {error ? <Alert severity="error">{error}</Alert> : null}
          {loading ? (
            <Stack alignItems="center" py={4}>
              <CircularProgress size={28} />
            </Stack>
          ) : (
            <Box sx={{ maxHeight: '55vh', overflowY: 'auto' }}>
              <Stack spacing={1}>
                {visible.map((row) => {
                  const planned = row.draft.trim() === '' ? null : Number(row.draft) || 0;
                  const over = planned != null && planned > 0 && row.soldQuantity >= planned;
                  return (
                    <Stack
                      key={row.productId}
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      alignItems={{ sm: 'center' }}
                      sx={{
                        p: 1.25,
                        borderRadius: 2.5,
                        border: `1px solid ${ui.border}`,
                        bgcolor: over ? 'rgba(239,68,68,0.06)' : 'rgba(255,250,244,0.95)',
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography fontWeight={700} noWrap>{row.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{row.categoryName}</Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={`مباع ${row.soldQuantity}`}
                        color={over ? 'error' : 'default'}
                        variant="outlined"
                      />
                      <TextField
                        size="small"
                        type="number"
                        label="المخطط"
                        placeholder="—"
                        value={row.draft}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRows((cur) => cur.map((r) => r.productId === row.productId ? { ...r, draft: v } : r));
                        }}
                        sx={{ width: 110 }}
                        inputProps={{ min: 0 }}
                      />
                    </Stack>
                  );
                })}
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>إلغاء</Button>
        <Button variant="contained" disabled={saving || loading} onClick={() => void save()}>
          {saving ? 'جاري الحفظ…' : 'حفظ الخطة'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
