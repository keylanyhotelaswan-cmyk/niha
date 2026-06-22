import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CustomerPhoneField } from '../../components/customer-phone-field.js';
import { formatCustomerPhoneDisplay } from '../../lib/customer-phone.js';
import { useBranches, useCustomerDetail, useCustomers } from '../../lib/hooks.js';
import { apiUpdateCustomer } from '../../lib/api.js';
import { useAuth } from '../../lib/auth-context.js';
import { formatCurrency } from '../pos/utils.js';

function formatWhen(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
}

export function CustomersPage() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const { data: branches = [] } = useBranches();
  const [branchId, setBranchId] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'regular'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editRegular, setEditRegular] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const effectiveBranchId = branchId || branches[0]?.id || '';
  const { data, isLoading, isError, error } = useCustomers(
    effectiveBranchId,
    q.trim() || undefined,
    filter === 'regular',
  );
  const { data: detail, isLoading: detailLoading } = useCustomerDetail(selectedId ?? undefined);

  const items = data?.items ?? [];

  const openDetail = (id: string) => {
    setSelectedId(id);
    setMessage('');
  };

  useEffect(() => {
    if (!detail) return;
    setEditName(detail.name ?? '');
    setEditAddress(detail.address ?? '');
    setEditNotes(detail.notes ?? '');
    setEditRegular(!!detail.isRegular);
  }, [detail]);

  const saveCustomer = async () => {
    if (!selectedId || !accessToken) return;
    setSaving(true);
    setMessage('');
    const res = await apiUpdateCustomer(selectedId, {
      name: editName.trim(),
      address: editAddress.trim(),
      notes: editNotes.trim(),
      isRegular: editRegular,
    }, accessToken);
    setSaving(false);
    if (!res.ok) {
      setMessage(res.body ?? res.error ?? 'فشل الحفظ');
      return;
    }
    setMessage('تم حفظ بيانات العميل');
    void queryClient.invalidateQueries({ queryKey: ['customers'] });
    void queryClient.invalidateQueries({ queryKey: ['customer', selectedId] });
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
        <Typography variant="h5" fontWeight={800} sx={{ flex: 1 }}>
          العملاء
        </Typography>
        {branches.length > 1 ? (
          <TextField
            select
            size="small"
            label="الفرع"
            value={effectiveBranchId}
            onChange={(e) => setBranchId(e.target.value)}
            SelectProps={{ native: true }}
            sx={{ minWidth: 180 }}
          >
            {branches.map((b: { id: string; name: string }) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </TextField>
        ) : null}
      </Stack>

      <Typography variant="body2" color="text.secondary">
        سجل العملاء من الطلبات السابقة — ابحث بالهاتف أو الاسم، وعلّم «عميل دائم» للزبائن المعتادين.
      </Typography>

      <Paper sx={{ p: 2, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <CustomerPhoneField
              branchId={effectiveBranchId}
              value={q}
              onChange={setQ}
              label="بحث (هاتف أو اسم)"
              placeholder="اكتب 3 أحرف على الأقل..."
              onSelectCustomer={(c) => {
                setQ(c.phone);
                openDetail(c.id);
              }}
            />
          </Box>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={filter}
            onChange={(_e, v) => { if (v) setFilter(v); }}
          >
            <ToggleButton value="all">الكل</ToggleButton>
            <ToggleButton value="regular">عملاء دائمون</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Paper>

      {isError ? <Alert severity="error">{String(error)}</Alert> : null}

      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {isLoading ? (
          <Stack alignItems="center" py={4}><CircularProgress /></Stack>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>الهاتف</TableCell>
                <TableCell>الاسم</TableCell>
                <TableCell>العنوان</TableCell>
                <TableCell align="center">طلبات</TableCell>
                <TableCell>آخر زيارة</TableCell>
                <TableCell align="center">دائم</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    لا يوجد عملاء مطابقون — سيُسجّلون تلقائياً عند إغلاق طلب برقم هاتف.
                  </TableCell>
                </TableRow>
              ) : items.map((row: any) => (
                <TableRow
                  key={row.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => openDetail(row.id)}
                  selected={row.id === selectedId}
                >
                  <TableCell dir="ltr">{formatCustomerPhoneDisplay(row.phone)}</TableCell>
                  <TableCell>{row.name ?? '—'}</TableCell>
                  <TableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.address ?? '—'}
                  </TableCell>
                  <TableCell align="center">{row.orderCount}</TableCell>
                  <TableCell>{formatWhen(row.lastOrderAt)}</TableCell>
                  <TableCell align="center">
                    {row.isRegular ? <Chip label="دائم" size="small" color="primary" /> : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Drawer
        anchor="left"
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 420 }, p: 2.5 } }}
      >
        {detailLoading || !detail ? (
          <Stack alignItems="center" py={6}><CircularProgress /></Stack>
        ) : (
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" fontWeight={800}>ملف العميل</Typography>
              <IconButton onClick={() => setSelectedId(null)} aria-label="إغلاق">✕</IconButton>
            </Stack>

            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(185,56,23,0.04)' }}>
              <Typography dir="ltr" fontWeight={800} fontSize="1.1rem">{formatCustomerPhoneDisplay(detail.phone)}</Typography>
              <Stack direction="row" spacing={2} mt={1} flexWrap="wrap">
                <Typography variant="body2">{detail.orderCount} طلب</Typography>
                <Typography variant="body2">إجمالي {formatCurrency(Number(detail.totalSpent))}</Typography>
                <Typography variant="body2">آخر زيارة: {formatWhen(detail.lastOrderAt)}</Typography>
              </Stack>
            </Paper>

            <TextField label="الاسم" fullWidth size="small" value={editName} onChange={(e) => setEditName(e.target.value)} />
            <TextField label="العنوان" fullWidth size="small" multiline minRows={2} value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
            <TextField label="ملاحظات داخلية" fullWidth size="small" multiline minRows={2} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="تفضيلات، منطقة، تنبيهات..." />
            <FormControlLabel
              control={<Switch checked={editRegular} onChange={(e) => setEditRegular(e.target.checked)} />}
              label="عميل دائم عندي (يظهر مميزاً في نقطة البيع)"
            />

            {message ? <Alert severity={message.includes('فشل') ? 'error' : 'success'}>{message}</Alert> : null}

            <Button variant="contained" disabled={saving} onClick={() => void saveCustomer()}>
              {saving ? 'جاري الحفظ…' : 'حفظ'}
            </Button>

            <Typography variant="subtitle2" fontWeight={800}>آخر الطلبات</Typography>
            {detail.orders?.length ? (
              <Stack spacing={0.75}>
                {detail.orders.map((o: any) => (
                  <Paper key={o.id} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography fontWeight={700}>#{o.orderNumber}</Typography>
                      <Typography fontWeight={700}>{formatCurrency(Number(o.totalAmount))}</Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {formatWhen(o.closedAt ?? o.openedAt)} · {o.orderType === 'TAKEAWAY' ? 'تيك أواي' : o.orderType === 'DINE_IN' ? 'صالة' : o.orderType}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">لا توجد طلبات مرتبطة بعد.</Typography>
            )}
          </Stack>
        )}
      </Drawer>
    </Stack>
  );
}
