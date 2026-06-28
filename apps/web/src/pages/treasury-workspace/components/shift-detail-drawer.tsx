import {
  Chip,
  Drawer,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  isIncomingTransaction,
  paymentMethodLabel,
  treasuryTypeLabel,
} from '../../../lib/treasury-store.js';
import { ui } from '../../../lib/ui-tokens.js';

type ShiftDetailDrawerProps = {
  open: boolean;
  onClose: () => void;
  entry: any | null;
  loading?: boolean;
  detailTransactions?: any[];
};

export function ShiftDetailDrawer({ open, onClose, entry, detailTransactions = [] }: ShiftDetailDrawerProps) {
  const shift = entry?.shift;
  const closing = shift?.closingRecord;

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 2 } }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight={800}>
            وردية {shift?.shiftNumber ?? '—'}
          </Typography>
          <IconButton onClick={onClose} aria-label="إغلاق">✕</IconButton>
        </Stack>

        {shift ? (
          <Stack spacing={1}>
            <Chip
              size="small"
              label={shift.status === 'OPEN' ? 'مفتوحة' : 'مغلقة'}
              color={shift.status === 'OPEN' ? 'success' : 'default'}
            />
            <Typography variant="body2">الكاشير: {shift.openedBy?.fullName ?? '—'}</Typography>
            <Typography variant="body2">الخزنة: {shift.cashBox?.name ?? '—'}</Typography>
            <Typography variant="body2">
              فتح: {new Date(shift.openedAt).toLocaleString('ar-EG')}
            </Typography>
            {shift.closedAt ? (
              <Typography variant="body2">إغلاق: {new Date(shift.closedAt).toLocaleString('ar-EG')}</Typography>
            ) : null}
          </Stack>
        ) : null}

        {entry ? (
          <Stack spacing={0.5}>
            <Typography fontWeight={700}>مبيعات: {Number(entry.totalSales ?? 0).toLocaleString('en-US')} ج.م</Typography>
            <Typography variant="body2">معلق: {Number(entry.pending ?? 0).toLocaleString('en-US')} ج.م</Typography>
            <Typography variant="body2">عهدة متوقعة: {Number(entry.expectedCash ?? 0).toLocaleString('en-US')} ج.م</Typography>
            {closing ? (
              <>
                <Typography variant="body2">عهدة فعلية: {Number(closing.countedCash).toLocaleString('en-US')} ج.م</Typography>
                <Typography variant="body2">فرق: {Number(closing.varianceAmount).toLocaleString('en-US')} ج.م</Typography>
              </>
            ) : null}
          </Stack>
        ) : null}

        <Typography fontWeight={800}>حركات الوردية</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>الوقت</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell align="left">المبلغ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {detailTransactions.map((tx) => {
              const incoming = isIncomingTransaction(tx.transactionType);
              return (
                <TableRow key={tx.id}>
                  <TableCell>
                    {new Date(tx.occurredAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                  <TableCell>
                    {treasuryTypeLabel(tx.transactionType)} · {paymentMethodLabel(tx.paymentMethod)}
                  </TableCell>
                  <TableCell align="left" sx={{ color: incoming ? ui.success : ui.warn, fontWeight: 700 }}>
                    {incoming ? '+' : '-'} {Number(tx.amount).toLocaleString('en-US')}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Stack>
    </Drawer>
  );
}
