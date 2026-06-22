import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SectionCard } from '../../shared.js';
import { useAuth } from '../../../lib/auth-context.js';
import {
  apiApproveOrderCancellation,
  apiApproveTransaction,
  apiBatchApproveTransactions,
  apiListPendingCancellations,
  apiRejectOrderCancellation,
  apiRejectTransaction,
} from '../../../lib/api.js';
import { parseApiErrorBody } from '../../../lib/api-client.js';
import { PaymentMethodCards } from '../components/payment-method-cards.js';

type ApprovalsTabProps = {
  workspace: any;
  onRefresh: () => void;
  onMessage: (msg: string) => void;
};

export function ApprovalsTab({ workspace, onRefresh, onMessage }: ApprovalsTabProps) {
  const { accessToken } = useAuth();
  const pending = workspace?.pendingCollections ?? [];
  const paymentMethods = workspace?.context?.paymentMethods ?? [];
  const treasuryToday = workspace?.treasuryToday ?? {};
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectBusy, setRejectBusy] = useState(false);
  const branchId = workspace?.context?.branch?.id ?? '';

  const { data: pendingCancellations = [], refetch: refetchCancellations } = useQuery({
    queryKey: ['pending-cancellations', branchId],
    queryFn: async (): Promise<any[]> => {
      const res = await apiListPendingCancellations(branchId, undefined, accessToken ?? undefined);
      if (!res.ok) throw new Error(res.body ?? res.error);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: Boolean(accessToken && branchId),
    staleTime: 15000,
  });

  const approveCancel = async (orderId: string) => {
    if (!accessToken) return;
    const res = await apiApproveOrderCancellation(orderId, accessToken);
    if (res.ok) {
      onMessage('تم اعتماد إلغاء الفاتورة.');
      onRefresh();
      refetchCancellations();
    } else {
      onMessage(parseApiErrorBody(res.body, 'فشل اعتماد الإلغاء'));
    }
  };

  const rejectCancel = async (orderId: string) => {
    if (!accessToken) return;
    const res = await apiRejectOrderCancellation(orderId, undefined, accessToken);
    if (res.ok) {
      onMessage('تم رفض طلب الإلغاء — الفاتورة كما هي.');
      onRefresh();
      refetchCancellations();
    } else {
      onMessage(parseApiErrorBody(res.body, 'فشل رفض الإلغاء'));
    }
  };

  const allIds = useMemo(() => pending.map((p: any) => p.id), [pending]);

  const toggleAll = () => {
    if (selected.size === allIds.length) setSelected(new Set());
    else setSelected(new Set(allIds));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const approveOne = async (id: string) => {
    if (!accessToken) return;
    const res = await apiApproveTransaction(id, accessToken);
    if (res.ok) {
      onMessage('تم الاعتماد النهائي.');
      onRefresh();
    } else {
      onMessage(parseApiErrorBody(res.body, 'فشل الاعتماد — تحقق من الصلاحيات'));
    }
  };

  const confirmReject = async () => {
    if (!accessToken || !rejectId) return;
    setRejectBusy(true);
    const res = await apiRejectTransaction(
      rejectId,
      rejectReason.trim() || undefined,
      accessToken,
    );
    setRejectBusy(false);
    if (res.ok) {
      setRejectId(null);
      setRejectReason('');
      onMessage('تم إرجاع الطلب لـ«غير محصل» في نقطة البيع — نفس الفاتورة بدون تكرار. يمكن للكاشير إعادة التحصيل أو إلغاء الفاتورة.');
      onRefresh();
    } else {
      onMessage(parseApiErrorBody(res.body, 'فشل الرفض — تحقق من الصلاحيات'));
    }
  };

  const rejectOne = (id: string) => {
    setRejectId(id);
    setRejectReason('');
  };

  const approveBatch = async () => {
    if (!accessToken || selected.size === 0) return;
    const count = selected.size;
    const res = await apiBatchApproveTransactions([...selected], accessToken);
    if (res.ok) {
      setSelected(new Set());
      onMessage(`تم اعتماد ${count} تحصيل نهائياً.`);
      onRefresh();
    } else {
      onMessage(parseApiErrorBody(res.body, 'فشل اعتماد الدفعة'));
    }
  };

  const inTreasuryTotal = Number(treasuryToday.approvedTotal ?? 0) + Number(treasuryToday.pendingTotal ?? 0);

  return (
    <>
    <Stack spacing={2}>
      <SectionCard title="ملخص الخزنة اليوم">
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          التحصيل يُسلَّم من الكاشير للإدارة — يُخصم من عهدة الدرج ويُسجَّل في الخزنة. الاعتماد تأكيد نهائي على المبلغ.
        </Typography>
        <PaymentMethodCards
          paymentMethods={paymentMethods}
          breakdown={treasuryToday.byPaymentMethod ?? {}}
          mode="today"
        />
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
          <Typography variant="body2" fontWeight={700}>
            في الخزنة: {inTreasuryTotal.toLocaleString('en-US')} ج.م
          </Typography>
          <Typography variant="body2" color="warning.main">
            بانتظار اعتماد: {Number(treasuryToday.pendingTotal ?? 0).toLocaleString('en-US')} ج.م
          </Typography>
          <Typography variant="body2" color="text.secondary">
            معتمد نهائي: {Number(treasuryToday.approvedTotal ?? 0).toLocaleString('en-US')} ج.م
          </Typography>
        </Stack>
      </SectionCard>

      <SectionCard
        title="بانتظار اعتمادك النهائي"
        action={
          <Button size="small" variant="contained" disabled={selected.size === 0} onClick={approveBatch}>
            اعتماد المحدد ({selected.size})
          </Button>
        }
      >
        {pending.length === 0 ? (
          <Alert severity="success">لا توجد تحصيلات بانتظار اعتمادك النهائي اليوم.</Alert>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selected.size === allIds.length && allIds.length > 0}
                    indeterminate={selected.size > 0 && selected.size < allIds.length}
                    onChange={toggleAll}
                  />
                </TableCell>
                <TableCell>الطلب</TableCell>
                <TableCell>الكاشير</TableCell>
                <TableCell>الدفع</TableCell>
                <TableCell>الوقت</TableCell>
                <TableCell align="left">المبلغ</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {pending.map((row: any) => (
                <TableRow key={row.id} hover>
                  <TableCell padding="checkbox">
                    <Checkbox checked={selected.has(row.id)} onChange={() => toggleOne(row.id)} />
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight={700}>{row.orderNumber}</Typography>
                    {row.customerName ? <Typography variant="caption">{row.customerName}</Typography> : null}
                  </TableCell>
                  <TableCell>{row.cashierName}</TableCell>
                  <TableCell>{row.paymentMethodName}</TableCell>
                  <TableCell>{new Date(row.occurredAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                  <TableCell align="left" sx={{ fontWeight: 800 }}>{Number(row.amount).toLocaleString('en-US')} ج.م</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <Button size="small" onClick={() => approveOne(row.id)}>اعتماد</Button>
                      <Button size="small" color="warning" onClick={() => rejectOne(row.id)}>إرجاع غير محصل</Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      <SectionCard title="طلبات إلغاء فواتير">
        {pendingCancellations.length === 0 ? (
          <Alert severity="info">لا توجد طلبات إلغاء بانتظارك.</Alert>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>الطلب</TableCell>
                <TableCell>السبب</TableCell>
                <TableCell>المبلغ</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingCancellations.map((row: any) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Typography fontWeight={700}>{row.orderNumber}</Typography>
                    {row.customerName ? <Typography variant="caption">{row.customerName}</Typography> : null}
                  </TableCell>
                  <TableCell>{row.cancellationReason ?? '—'}</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>{Number(row.totalAmount).toLocaleString('en-US')} ج.م</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <Button size="small" color="error" onClick={() => approveCancel(row.id)}>اعتماد الإلغاء</Button>
                      <Button size="small" onClick={() => rejectCancel(row.id)}>رفض</Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      {workspace?.collectorSummary?.collectors?.length ? (
        <SectionCard title="تحصيل معتمد اليوم (لكل كاشير)">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>الكاشير</TableCell>
                <TableCell align="right">الإجمالي</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {workspace.collectorSummary.collectors.map((row: any) => (
                <TableRow key={row.userId}>
                  <TableCell>{row.fullName}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>{Number(row.total).toLocaleString('en-US')} ج.م</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      ) : null}
    </Stack>

    <Dialog open={Boolean(rejectId)} onClose={() => !rejectBusy && setRejectId(null)} fullWidth maxWidth="xs">
      <DialogTitle>إرجاع لغير محصل</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          لن تُنشأ فاتورة جديدة — نفس الطلب يعود لتبويب «غير محصل» في نقطة البيع. يمكن للكاشير بعدها إعادة التحصيل أو إلغاء الفاتورة.
        </Typography>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={2}
          label="سبب (اختياري)"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setRejectId(null)} disabled={rejectBusy}>إلغاء</Button>
        <Button color="warning" variant="contained" onClick={confirmReject} disabled={rejectBusy}>
          تأكيد الإرجاع
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}
