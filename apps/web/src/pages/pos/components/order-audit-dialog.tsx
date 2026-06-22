import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { apiGetOrderAuditLogs } from '../../../lib/api.js';
import {
  describeAuditChanges,
  formatAuditTime,
  getAuditActionLabel,
} from '../../../lib/audit-log-utils.js';
import { useAuth } from '../../../lib/auth-context.js';

type AuditEntry = {
  id: string;
  action: string;
  createdAt: string;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  actorUser?: { fullName?: string; username?: string } | null;
};

type OrderAuditDialogProps = {
  open: boolean;
  orderId: string;
  orderCode: string;
  onClose: () => void;
};

export function OrderAuditDialog({ open, orderId, orderCode, onClose }: OrderAuditDialogProps) {
  const { accessToken } = useAuth();
  const { data, isPending, isError } = useQuery({
    queryKey: ['order-audit-logs', orderId],
    queryFn: async () => {
      const res = await apiGetOrderAuditLogs(orderId, accessToken ?? undefined);
      if (!res.ok) throw new Error(res.body ?? res.error);
      return (res.data ?? []) as AuditEntry[];
    },
    enabled: open && Boolean(orderId && accessToken),
    staleTime: 15000,
  });

  const logs = data ?? [];
  const amendments = logs.filter((e) => e.action !== 'CREATE');

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800 }}>سجل نشاط · طلب {orderCode}</DialogTitle>
      <DialogContent>
        {isPending ? (
          <Stack alignItems="center" py={3}><CircularProgress size={28} /></Stack>
        ) : isError ? (
          <Alert severity="error">تعذّر تحميل سجل النشاط.</Alert>
        ) : logs.length === 0 ? (
          <Alert severity="info">لا يوجد سجل نشاط لهذا الطلب.</Alert>
        ) : (
          <Stack spacing={1.25}>
            {logs.map((entry) => {
              const changes = describeAuditChanges(entry);
              return (
                <Stack key={entry.id} spacing={0.35} sx={{ p: 1.25, borderRadius: 2, bgcolor: 'rgba(117,89,77,0.06)' }}>
                  <Typography variant="body2" fontWeight={800}>
                    {getAuditActionLabel(entry.action)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatAuditTime(entry.createdAt)}
                    {' · '}
                    {entry.actorUser?.fullName?.trim() || entry.actorUser?.username || 'نظام'}
                  </Typography>
                  {changes.map((line, idx) => (
                    <Typography key={idx} variant="body2">{line}</Typography>
                  ))}
                </Stack>
              );
            })}
            {amendments.length === 0 && logs.some((e) => e.action === 'CREATE') ? (
              <Typography variant="caption" color="text.secondary">لم يُسجَّل أي تعديل بعد إصدار الفاتورة.</Typography>
            ) : null}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
}
