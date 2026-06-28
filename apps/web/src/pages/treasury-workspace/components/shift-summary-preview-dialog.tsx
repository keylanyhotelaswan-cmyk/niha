import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import {
  formatShiftDuration,
  formatShiftMoney,
  formatShiftOpenedAt,
  type ShiftSummaryLike,
} from '../../../lib/shift-summary-utils.js';
import {
  buildShiftSummaryThermalHtml,
  openShiftSummaryPreviewWindow,
  printShiftSummary,
  type ShiftSummaryPrintParams,
} from '../../../lib/shift-summary-print.js';
import { ShiftCollectionBreakdown } from './shift-collection-breakdown.js';
import { ui } from '../../../lib/ui-tokens.js';

type ShiftSummaryPreviewDialogProps = {
  open: boolean;
  onClose: () => void;
  params: ShiftSummaryPrintParams | null;
  onMessage?: (msg: string) => void;
};

export function ShiftSummaryPreviewDialog({
  open,
  onClose,
  params,
  onMessage,
}: ShiftSummaryPreviewDialogProps) {
  const [printing, setPrinting] = useState(false);
  const summary = params?.summary ?? null;
  const expected = Number(summary?.expectedCash ?? 0);

  const thermalHtml = useMemo(
    () => (params ? buildShiftSummaryThermalHtml(params) : ''),
    [params],
  );

  useEffect(() => {
    if (!open) setPrinting(false);
  }, [open]);

  const handleThermalPrint = async () => {
    if (!params) return;
    setPrinting(true);
    try {
      const res = await printShiftSummary(params);
      if (res.ok) {
        onMessage?.(`تم إرسال الملخص للطابعة (${res.printer}).`);
        return;
      }
      const opened = openShiftSummaryPreviewWindow(params);
      onMessage?.(opened ? `${res.message} — افتح المعاينة واطبع يدوياً (Ctrl+P).` : res.message);
    } finally {
      setPrinting(false);
    }
  };

  const handleBrowserPreview = () => {
    if (!params) return;
    if (openShiftSummaryPreviewWindow(params)) {
      onMessage?.('تم فتح المعاينة — اضغط Ctrl+P للطباعة عندما تكون جاهزاً.');
    } else {
      onMessage?.('تعذّر فتح نافذة المعاينة — اسمح بالنوافذ المنبثقة.');
    }
  };

  if (!params) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800 }}>ملخص الوردية {params.shiftNumber ?? ''}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {params.cashierName ? `الكاشير: ${params.cashierName}` : null}
            {params.openedAt ? ` · فتح ${formatShiftOpenedAt(params.openedAt)} · ${formatShiftDuration(params.openedAt)}` : ''}
          </Typography>

          <ShiftCollectionBreakdown summary={summary} />

          <Stack spacing={0.5}>
            <SummaryLine label="رصيد الافتتاح" value={formatShiftMoney(Number(summary?.openingFloat ?? 0))} />
            <SummaryLine label="إجمالي المبيعات" value={formatShiftMoney(Number(summary?.totalSales ?? summary?.salesTotal ?? 0))} />
            <SummaryLine label="مصروفات الوردية" value={formatShiftMoney(Number(summary?.expensesTotal ?? summary?.outgoing ?? 0))} />
            <SummaryLine label="نقدي بانتظار اعتماد" value={formatShiftMoney(Number(summary?.pendingCashInCustody ?? summary?.pending ?? 0))} />
            <SummaryLine
              label="طلبات غير محصّلة"
              value={`${summary?.uncollectedCount ?? 0} · ${formatShiftMoney(Number(summary?.uncollectedTotal ?? 0))}`}
            />
            <SummaryLine label="النقدي في الدرج (متوقع)" value={formatShiftMoney(expected)} bold />
          </Stack>

          {(summary?.uncollectedOrders?.length ?? 0) > 0 ? (
            <Stack spacing={0.5} sx={{ bgcolor: 'rgba(217,119,6,0.08)', p: 1.5, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={800} color="warning.dark">
                تفاصيل غير المحصّل
              </Typography>
              {summary!.uncollectedOrders!.map((o) => (
                <Stack key={o.orderNumber} direction="row" justifyContent="space-between" gap={1}>
                  <Typography variant="body2">
                    #{o.orderNumber}
                    {o.customerName?.trim() ? ` · ${o.customerName.trim()}` : ''}
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>{formatShiftMoney(o.total)}</Typography>
                </Stack>
              ))}
            </Stack>
          ) : null}

          <Alert severity="info" sx={{ borderRadius: 2 }}>
            راجع الملخص ثم اضغط «طباعة على الطابعة». لن تُطبع تلقائياً.
          </Alert>

          <Box
            sx={{
              border: `1px dashed ${ui.borderStrong}`,
              borderRadius: 2,
              bgcolor: ui.surfaceMuted,
              p: 1,
              maxHeight: 280,
              overflow: 'auto',
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, px: 0.5 }}>
              شكل الإيصال على الطابعة الحرارية
            </Typography>
            <Box
              component="iframe"
              title="معاينة ملخص الوردية"
              srcDoc={thermalHtml}
              sx={{
                width: '100%',
                minHeight: 220,
                border: 'none',
                bgcolor: ui.paper,
                transform: 'scale(0.92)',
                transformOrigin: 'top center',
              }}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1, px: 2, pb: 2 }}>
        <Button onClick={onClose}>إغلاق</Button>
        <Button variant="outlined" onClick={handleBrowserPreview}>
          معاينة في نافذة
        </Button>
        <Button variant="contained" disabled={printing} onClick={() => { void handleThermalPrint(); }}>
          {printing ? <CircularProgress size={20} color="inherit" /> : 'طباعة على الطابعة'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function SummaryLine({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={1}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={bold ? 800 : 700}>{value}</Typography>
    </Stack>
  );
}

export type { ShiftSummaryPrintParams, ShiftSummaryLike };
