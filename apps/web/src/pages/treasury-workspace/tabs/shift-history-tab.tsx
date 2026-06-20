import {
  Alert,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { useState } from 'react';
import { SectionCard } from '../../shared.js';
import { useAuth } from '../../../lib/auth-context.js';
import { apiGet } from '../../../lib/api-client.js';
import { ShiftDetailDrawer } from '../components/shift-detail-drawer.js';
import { formatDateRangeLabelAr, isTodayRange } from '../../../lib/date-utils.js';

type ShiftHistoryTabProps = {
  workspace: any;
  fromDate?: string;
  toDate?: string;
};

export function ShiftHistoryTab({ workspace, fromDate, toDate }: ShiftHistoryTabProps) {
  const { accessToken } = useAuth();
  const shifts = workspace?.shiftsForDate ?? [];
  const fromKey = fromDate ?? workspace?.context?.fromDate ?? workspace?.context?.date ?? '';
  const toKey = toDate ?? workspace?.context?.toDate ?? workspace?.context?.date ?? '';
  const rangeLabel = fromKey && toKey ? formatDateRangeLabelAr(fromKey, toKey) : '';
  const sectionTitle = rangeLabel
    ? (isTodayRange(fromKey, toKey) ? 'ورديات اليوم' : `ورديات ${rangeLabel}`)
    : 'سجل الورديات';
  const sectionDesc = fromKey === toKey
    ? 'عرض ورديات اليوم المحدد فقط — اضغط على وردية لعرض التفاصيل والحركات.'
    : 'عرض ورديات الفترة المحددة — اضغط على وردية لعرض التفاصيل والحركات.';
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [detailTx, setDetailTx] = useState<any[]>([]);

  const openDetail = async (entry: any) => {
    setSelectedEntry(entry);
    if (!accessToken || !entry?.shift?.id) return;
    const res = await apiGet<any[]>(`/treasury/transactions?shiftId=${entry.shift.id}`, accessToken);
    if (res.ok) setDetailTx(res.data ?? []);
  };

  return (
    <Stack spacing={2}>
      <SectionCard title={sectionTitle} description={sectionDesc}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>الوردية</TableCell>
              <TableCell>الكاشير</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>مبيعات</TableCell>
              <TableCell>معلق</TableCell>
              <TableCell align="right">عهدة متوقعة</TableCell>
              <TableCell align="right">فرق إغلاق</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shifts.map((entry: any) => (
              <TableRow key={entry.shift.id} hover sx={{ cursor: 'pointer' }} onClick={() => openDetail(entry)}>
                <TableCell>{entry.shift.shiftNumber}</TableCell>
                <TableCell>{entry.shift.openedBy?.fullName ?? '—'}</TableCell>
                <TableCell>
                  <Chip size="small" label={entry.shift.status === 'OPEN' ? 'مفتوحة' : 'مغلقة'} color={entry.shift.status === 'OPEN' ? 'success' : 'default'} />
                </TableCell>
                <TableCell>{Number(entry.totalSales ?? 0).toLocaleString('en-US')}</TableCell>
                <TableCell>{Number(entry.pending ?? 0).toLocaleString('en-US')}</TableCell>
                <TableCell align="right">{Number(entry.expectedCash ?? 0).toLocaleString('en-US')} ج.م</TableCell>
                <TableCell align="right">
                  {entry.variance != null ? `${Number(entry.variance).toLocaleString('en-US')} ج.م` : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {shifts.length === 0 ? <Alert severity="info" sx={{ mt: 1 }}>لا توجد ورديات في هذه الفترة.</Alert> : null}
      </SectionCard>

      <ShiftDetailDrawer
        open={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        entry={selectedEntry}
        detailTransactions={detailTx}
      />
    </Stack>
  );
}
