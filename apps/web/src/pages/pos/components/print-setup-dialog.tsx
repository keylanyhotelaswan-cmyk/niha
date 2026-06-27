import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  DEFAULT_PRINTER_NAME,
  getReceiptLayout,
  getReceiptSettings,
  readSavedPrinterName,
  sampleReceiptData,
  savePrinterName,
} from '../../../lib/pos-receipt.js';
import {
  bridgePrintEscPos,
  bridgePrintJobs,
  isPrintBridgeOnline,
  listBridgePrinters,
} from '../../../lib/pos-print-bridge.js';
import { buildEscPosJobs, pickEscPosBridgeSettings } from '../../../lib/pos-receipt-escpos.js';
import { kitchenFromReceipt } from '../../../lib/pos-receipt.js';
import { renderCustomerReceiptPng, renderKitchenReceiptPng } from '../../../lib/pos-receipt-render.js';

type PrintSetupDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function PrintSetupDialog({ open, onClose }: PrintSetupDialogProps) {
  const receiptSettings = getReceiptSettings();
  const layout = getReceiptLayout(receiptSettings);
  const [printers, setPrinters] = useState<string[]>([]);
  const [selected, setSelected] = useState(() => readSavedPrinterName());
  const [manualName, setManualName] = useState(() => readSavedPrinterName());
  const [bridgeOk, setBridgeOk] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [testMsg, setTestMsg] = useState('');
  const [testing, setTesting] = useState(false);

  const effectiveName = (selected || manualName).trim() || DEFAULT_PRINTER_NAME;

  const refresh = async () => {
    setStatus('loading');
    setError('');
    setTestMsg('');
    const online = await isPrintBridgeOnline();
    setBridgeOk(online);
    if (!online) {
      setStatus('error');
      setError('Niha Print Bridge غير شغّال. شغّله: npm run dev:print-bridge');
      setPrinters([]);
      return;
    }
    const list = await listBridgePrinters();
    setPrinters(list);
    const saved = readSavedPrinterName();
    setManualName(saved);
    if (list.includes(saved)) setSelected(saved);
    else setSelected(list.find((p) => /xp-?k?200/i.test(p)) ?? list.find((p) => /xp-80/i.test(p)) ?? list[0] ?? '');
    setStatus('ready');
  };

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  const runTestPrint = async () => {
    setTesting(true);
    setTestMsg('');
    savePrinterName(effectiveName);
    const settings = getReceiptSettings();
    const receiptData = sampleReceiptData(settings);
    const copies = settings.printCopies;

    if (settings.printMode === 'escpos') {
      const { printPosReceipt } = await import('../../../lib/pos-receipt.js');
      const res = await printPosReceipt(receiptData, { force: true, silent: true, copies });
      const copyLabel = copies === 'both' ? 'شيف + زبون' : copies === 'kitchen' ? 'شيف' : 'زبون';
      setTestMsg(res.ok ? `تمت طباعة ${copyLabel} (ESC/POS — عربي).` : res.message ?? 'فشل الطباعة');
      setTesting(false);
      return;
    }

    if (settings.printMode === 'escpos-text') {
      const res = await bridgePrintEscPos(
        buildEscPosJobs(receiptData, copies),
        pickEscPosBridgeSettings(),
      );
      const copyLabel = copies === 'both' ? 'شيف + زبون' : copies === 'kitchen' ? 'شيف' : 'زبون';
      setTestMsg(res.ok ? `تمت طباعة ${copyLabel} (ESC/POS نصي).` : res.message);
      setTesting(false);
      return;
    }

    const kitchen = kitchenFromReceipt(receiptData);
    const jobs = [];
    if (copies === 'kitchen' || copies === 'both') {
      const kPng = await renderKitchenReceiptPng(kitchen, settings);
      if (kPng) jobs.push({ pngBase64: kPng.base64, pngHeightPx: kPng.heightPx, pngWidthPx: kPng.widthPx, paperWidthMm: kPng.paperWidthMm, label: 'kitchen' });
    }
    if (copies === 'customer' || copies === 'both') {
      const cPng = await renderCustomerReceiptPng(receiptData, settings);
      if (cPng) jobs.push({ pngBase64: cPng.base64, pngHeightPx: cPng.heightPx, pngWidthPx: cPng.widthPx, paperWidthMm: cPng.paperWidthMm, label: 'customer' });
    }
    const res = await bridgePrintJobs(jobs);
    setTestMsg(res.ok ? 'تمت طباعة الاختبار (PNG).' : res.message);
    setTesting(false);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>إعداد الطابعة (طباعة صامتة)</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            <strong>Niha Print Bridge</strong> — بديل QZ Tray
            <br />
            لتخصيص شكل الفاتورة:{' '}
            <Button component={RouterLink} to="/settings/receipt" size="small" onClick={onClose}>
              إعدادات الفاتورة
            </Button>
          </Alert>
          {status === 'error' ? (
            <Alert severity="warning" sx={{ borderRadius: 2 }}>{error}</Alert>
          ) : null}
          {bridgeOk ? (
            <Alert severity="success" sx={{ borderRadius: 2 }}>Print Bridge متصل ✓</Alert>
          ) : null}
          {printers.length > 0 ? (
            <TextField
              select
              fullWidth
              label="الطابعات"
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setManualName(e.target.value);
              }}
            >
              {printers.map((p) => (
                <MenuItem key={p} value={p}>{p}</MenuItem>
              ))}
            </TextField>
          ) : null}
          <TextField
            fullWidth
            label="اسم الطابعة"
            placeholder={DEFAULT_PRINTER_NAME}
            value={manualName}
            onChange={(e) => {
              setManualName(e.target.value);
              if (!printers.includes(e.target.value)) setSelected('');
            }}
            helperText="مثال: XP-K200L"
          />
          <Typography variant="caption" color="text.secondary">
            الطباعة الصامتة على: <strong>{effectiveName}</strong>
            <br />
            مقاس الورق: {layout.paperMm}mm — هامش {layout.marginMm}mm — محتوى {layout.printableMm}mm
          </Typography>
          {testMsg ? (
            <Alert severity={testMsg.includes('فشل') || testMsg.includes('غير') ? 'error' : 'success'} sx={{ borderRadius: 2 }}>
              {testMsg}
            </Alert>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1, px: 2, pb: 2 }}>
        <Button component={RouterLink} to="/settings/receipt" onClick={onClose}>تخصيص الفاتورة</Button>
        <Button onClick={refresh} disabled={status === 'loading'}>إعادة المحاولة</Button>
        <Button onClick={runTestPrint} disabled={testing || !bridgeOk}>
          طباعة اختبار
        </Button>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" onClick={() => { savePrinterName(effectiveName); onClose(); }}>
          حفظ
        </Button>
      </DialogActions>
    </Dialog>
  );
}
