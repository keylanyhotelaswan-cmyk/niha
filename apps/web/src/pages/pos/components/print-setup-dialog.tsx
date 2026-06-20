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
  kitchenFromReceipt,
  readSavedPrinterName,
  renderCustomerReceiptPng,
  renderKitchenReceiptPng,
  sampleReceiptData,
  savePrinterName,
} from '../../../lib/pos-receipt.js';
import {
  bridgePrintJobs,
  isPrintBridgeOnline,
  listBridgePrinters,
} from '../../../lib/pos-print-bridge.js';

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
    else setSelected(list.find((p) => /xp-80/i.test(p)) ?? list[0] ?? '');
    setStatus('ready');
  };

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  const runTestPrint = async () => {
    setTesting(true);
    setTestMsg('');
    savePrinterName(effectiveName);
    const receiptData = sampleReceiptData();
    const kitchen = kitchenFromReceipt(receiptData);
    const kPng = await renderKitchenReceiptPng(kitchen);
    const cPng = await renderCustomerReceiptPng(receiptData);
    const jobs = [];
    if (kPng) jobs.push({ pngBase64: kPng.base64, pngHeightPx: kPng.heightPx, pngWidthPx: kPng.widthPx, paperWidthMm: kPng.paperWidthMm, label: 'kitchen' });
    if (cPng) jobs.push({ pngBase64: cPng.base64, pngHeightPx: cPng.heightPx, pngWidthPx: cPng.widthPx, paperWidthMm: cPng.paperWidthMm, label: 'customer' });
    const res = await bridgePrintJobs(jobs);
    setTestMsg(res.ok ? 'تمت طباعة نسخة الشيف + نسخة الزبون.' : res.message);
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
            helperText="مثال: XP-80C (copy 3)"
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
          طباعة اختبار (شيف + زبون)
        </Button>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" onClick={() => { savePrinterName(effectiveName); onClose(); }}>
          حفظ
        </Button>
      </DialogActions>
    </Dialog>
  );
}
