import {
  Alert,
  Box,
  Button,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Slider,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../lib/auth-context.js';
import { useBranches } from '../lib/hooks.js';
import { readPosBranchId } from '../lib/pos-store.js';
import {
  getReceiptSettings,
  hydrateReceiptSettingsFromServer,
  receiptLayoutFromSettings,
  resetReceiptSettings,
  sampleReceiptData,
  saveReceiptSettingsWithSync,
  type ReceiptSettings,
} from '../lib/pos-receipt-settings.js';
import {
  buildCustomerReceiptHtml,
  buildKitchenReceiptHtml,
  kitchenFromReceipt,
  savePrinterName,
} from '../lib/pos-receipt.js';

import {
  bridgePrintEscPos,
  bridgePrintJobs,
  isPrintBridgeOnline,
  listBridgePrinters,
} from '../lib/pos-print-bridge.js';
import { pickEscPosBridgeSettings, buildEscPosJobs } from '../lib/pos-receipt-escpos.js';

function ReceiptPreview({ settings, mode }: { settings: ReceiptSettings; mode: 'customer' | 'kitchen' }) {
  const html = useMemo(() => {
    const sample = sampleReceiptData(settings);
    if (mode === 'kitchen') {
      return buildKitchenReceiptHtml(kitchenFromReceipt(sample), settings, false);
    }
    return buildCustomerReceiptHtml(sample, settings, false);
  }, [settings, mode]);

  const layout = receiptLayoutFromSettings(settings);
  const widthPx = layout.widthPx;

  return (
    <Box
      sx={{
        bgcolor: '#f5f5f5',
        p: 2,
        borderRadius: 2,
        overflow: 'auto',
        maxHeight: 520,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <iframe
        title={`preview-${mode}`}
        srcDoc={html}
        style={{
          width: widthPx,
          minHeight: 360,
          border: '1px solid #ccc',
          background: '#fff',
        }}
      />
    </Box>
  );
}

export function ReceiptSettingsPage() {
  const { accessToken } = useAuth();
  const { data: branches = [] } = useBranches();
  const branchId = readPosBranchId() || branches[0]?.id || '';
  const [settings, setSettings] = useState<ReceiptSettings>(() => getReceiptSettings());
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [previewTab, setPreviewTab] = useState<'customer' | 'kitchen'>('customer');
  const [savedMsg, setSavedMsg] = useState('');
  const [printMsg, setPrintMsg] = useState('');
  const [bridgeOk, setBridgeOk] = useState(false);
  const [bridgePrinters, setBridgePrinters] = useState<string[]>([]);

  const layout = useMemo(() => receiptLayoutFromSettings(settings), [settings]);

  const patch = useCallback((partial: Partial<ReceiptSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  useEffect(() => {
    void (async () => {
      const online = await isPrintBridgeOnline();
      setBridgeOk(online);
      if (!online) {
        setBridgePrinters([]);
        return;
      }
      const list = await listBridgePrinters();
      setBridgePrinters(list);
      if (list.length && !list.includes(settings.printerName)) {
        const guess =
          list.find((p) => /xp-?k?200/i.test(p))
          ?? list.find((p) => /xp-?80/i.test(p))
          ?? list[0];
        if (guess) patch({ printerName: guess });
      }
    })();
  }, []);

  useEffect(() => {
    if (!branchId || !accessToken) return;
    let cancelled = false;
    setLoadingRemote(true);
    hydrateReceiptSettingsFromServer(branchId, accessToken)
      .then((remote) => {
        if (!cancelled) setSettings(remote);
      })
      .finally(() => {
        if (!cancelled) setLoadingRemote(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, accessToken]);

  const syncOptions = useMemo(
    () => ({ branchId, token: accessToken }),
    [branchId, accessToken],
  );

  const handleSave = async () => {
    const saved = await saveReceiptSettingsWithSync(settings, syncOptions);
    savePrinterName(saved.printerName);
    setSettings(saved);
    setSavedMsg('تم حفظ إعدادات الفاتورة (محلي + سيرفر).');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  const handleReset = async () => {
    const defaults = resetReceiptSettings();
    const saved = await saveReceiptSettingsWithSync(defaults, syncOptions);
    setSettings(saved);
    setSavedMsg('تمت إعادة الإعدادات الافتراضية.');
  };

  const handleTestPrint = async () => {
    setPrintMsg('');
    const saved = await saveReceiptSettingsWithSync(settings, syncOptions);
    savePrinterName(saved.printerName);
    const sample = sampleReceiptData(saved);

    if (saved.printMode === 'escpos') {
      const { printPosReceipt } = await import('../lib/pos-receipt.js');
      const res = await printPosReceipt(sample, { force: true, silent: true, copies: saved.printCopies });
      setPrintMsg(res.ok ? 'تمت طباعة الاختبار (ESC/POS — عربي صحيح).' : res.message ?? 'فشل الطباعة');
      return;
    }

    if (saved.printMode === 'escpos-text') {
      const res = await bridgePrintEscPos(
        buildEscPosJobs(sample, saved.printCopies),
        pickEscPosBridgeSettings(),
      );
      setPrintMsg(res.ok ? 'تمت طباعة الاختبار (ESC/POS نصي).' : res.message);
      return;
    }

    const kitchen = kitchenFromReceipt(sample);
    const { renderCustomerReceiptPng, renderKitchenReceiptPng } = await import('../lib/pos-receipt-render.js');
    const jobs = [];
    if (saved.printCopies === 'kitchen' || saved.printCopies === 'both') {
      const kPng = await renderKitchenReceiptPng(kitchen, saved);
      if (kPng) jobs.push(kPng);
    }
    if (saved.printCopies === 'customer' || saved.printCopies === 'both') {
      const cPng = await renderCustomerReceiptPng(sample, saved);
      if (cPng) jobs.push(cPng);
    }
    const res = await bridgePrintJobs(jobs.map((j) => ({
      pngBase64: j.base64,
      pngHeightPx: j.heightPx,
      pngWidthPx: j.widthPx,
      paperWidthMm: j.paperWidthMm,
      paperSize: saved.paperSize,
    })));
    setPrintMsg(res.ok ? 'تمت طباعة الاختبار (PNG).' : res.message);
  };

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h5" fontWeight={800}>تخصيص الفاتورة والطباعة</Typography>
        <Typography color="text.secondary" variant="body2">
          عدّل الشكل والمقاس — التغييرات تُحفظ على هذا الجهاز وعلى السيرفر بعد «حفظ الإعدادات».
        </Typography>
      </Stack>

      {loadingRemote ? <Alert severity="info">جاري تحميل الإعدادات من السيرفر…</Alert> : null}
      {savedMsg ? <Alert severity="success">{savedMsg}</Alert> : null}
      {printMsg ? (
        <Alert severity={printMsg.includes('فشل') || printMsg.includes('غير') ? 'error' : 'success'}>
          {printMsg}
        </Alert>
      ) : null}

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={800} gutterBottom>بيانات المحل</Typography>
            <Stack spacing={2}>
              <TextField label="اسم المحل" fullWidth value={settings.storeName} onChange={(e) => patch({ storeName: e.target.value })} />
              <TextField label="الوصف" fullWidth value={settings.storeSubtitle} onChange={(e) => patch({ storeSubtitle: e.target.value })} />
              <TextField label="العنوان (أسفل الفاتورة)" fullWidth multiline minRows={2} value={settings.storeFooter} onChange={(e) => patch({ storeFooter: e.target.value })} />
              <TextField label="رقم الهاتف" fullWidth value={settings.storePhone} onChange={(e) => patch({ storePhone: e.target.value })} />
            </Stack>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" fontWeight={800} gutterBottom>المقاس والإطار</Typography>
            <Stack spacing={2}>
              <TextField
                select
                fullWidth
                label="عرض الورق"
                value={settings.paperWidthMm}
                onChange={(e) => patch({ paperWidthMm: Number(e.target.value) })}
              >
                <MenuItem value={80}>80mm (شائع — XP-K200L)</MenuItem>
                <MenuItem value={58}>58mm</MenuItem>
              </TextField>
              <Typography variant="body2" color="text.secondary">
                اتجاه الطباعة: بالطول (عمودي) — ثابت لطابعة الورق الحراري 80mm
              </Typography>
              <Box>
                <Typography gutterBottom>الهامش من كل جانب: {settings.marginMm}mm (الافتراضي 2mm)</Typography>
                <Slider
                  value={settings.marginMm}
                  min={0}
                  max={20}
                  step={1}
                  valueLabelDisplay="auto"
                  onChange={(_, v) => patch({ marginMm: v as number })}
                />
              </Box>
              <FormControlLabel
                control={<Switch checked={settings.showFrame} onChange={(e) => patch({ showFrame: e.target.checked })} />}
                label="إطار حول محتوى الفاتورة"
              />
              <Typography variant="body2" color="text.secondary">
                عرض المحتوى الفعلي: {layout.printableMm}mm — عرض الصورة: {layout.widthPx}px
              </Typography>
            </Stack>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" fontWeight={800} gutterBottom>الخط</Typography>
            <Stack spacing={2}>
              <Box>
                <Typography gutterBottom>مقياس الخط العام: {Math.round(settings.fontScale * 100)}%</Typography>
                <Slider
                  value={settings.fontScale}
                  min={0.65}
                  max={1.5}
                  step={0.05}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(v) => `${Math.round(v * 100)}%`}
                  onChange={(_, v) => patch({ fontScale: v as number })}
                />
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField type="number" fullWidth label="اسم المحل (px)" value={settings.fontStoreName} onChange={(e) => patch({ fontStoreName: Number(e.target.value) })} />
                </Grid>
                <Grid item xs={6}>
                  <TextField type="number" fullWidth label="النص العادي (px)" value={settings.fontBody} onChange={(e) => patch({ fontBody: Number(e.target.value) })} />
                </Grid>
                <Grid item xs={6}>
                  <TextField type="number" fullWidth label="رقم المطبخ (px)" value={settings.fontKitchenNum} onChange={(e) => patch({ fontKitchenNum: Number(e.target.value) })} />
                </Grid>
                <Grid item xs={6}>
                  <TextField type="number" fullWidth label="أصناف المطبخ (px)" value={settings.fontKitchenItem} onChange={(e) => patch({ fontKitchenItem: Number(e.target.value) })} />
                </Grid>
              </Grid>
            </Stack>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" fontWeight={800} gutterBottom>سائقو الدليفري</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              أضف الأسماء هنا لتظهر كقائمة منسدلة في طلبات التيك أواي.
            </Typography>
            <Stack spacing={1.25}>
              {(settings.deliveryDrivers ?? []).map((driver, index) => (
                <Stack key={index} direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <TextField
                    fullWidth
                    size="small"
                    label="الاسم"
                    value={driver.name}
                    onChange={(e) => {
                      const next = [...settings.deliveryDrivers];
                      next[index] = { ...next[index], name: e.target.value };
                      patch({ deliveryDrivers: next });
                    }}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="هاتف (اختياري)"
                    value={driver.phone ?? ''}
                    onChange={(e) => {
                      const next = [...settings.deliveryDrivers];
                      next[index] = { ...next[index], name: next[index]?.name ?? '', phone: e.target.value };
                      patch({ deliveryDrivers: next });
                    }}
                  />
                  <Button
                    color="error"
                    onClick={() => patch({ deliveryDrivers: settings.deliveryDrivers.filter((_, i) => i !== index) })}
                  >
                    حذف
                  </Button>
                </Stack>
              ))}
              <Button
                variant="outlined"
                onClick={() => patch({ deliveryDrivers: [...settings.deliveryDrivers, { name: '' }] })}
              >
                + إضافة سائق
              </Button>
            </Stack>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" fontWeight={800} gutterBottom>الطباعة</Typography>
            <Stack spacing={2}>
              <TextField
                select
                fullWidth
                label="طريقة الطباعة"
                value={settings.printMode}
                onChange={(e) => patch({ printMode: e.target.value as ReceiptSettings['printMode'] })}
                helperText="ESC/POS صورة = عربي واضح على XPrinter (موصى به). النصي = سريع لكن العربي قد يظهر رموز."
              >
                <MenuItem value="escpos">ESC/POS صورة (عربي — موصى به)</MenuItem>
                <MenuItem value="escpos-text">ESC/POS نصي (سريع — بدون عربي)</MenuItem>
                <MenuItem value="png">PDF/صورة (احتياطي)</MenuItem>
              </TextField>
              <TextField
                select
                fullWidth
                label="نسخ الطباعة الافتراضية"
                value={settings.printCopies}
                onChange={(e) => patch({ printCopies: e.target.value as ReceiptSettings['printCopies'] })}
              >
                <MenuItem value="both">شيف + زبون</MenuItem>
                <MenuItem value="kitchen">شيف فقط</MenuItem>
                <MenuItem value="customer">زبون فقط</MenuItem>
              </TextField>
              <FormControlLabel
                control={<Switch checked={settings.autoPrint} onChange={(e) => patch({ autoPrint: e.target.checked })} />}
                label="طباعة تلقائية عند إغلاق الطلب"
              />
              <FormControlLabel
                control={<Switch checked={settings.cashierPrintingEnabled} onChange={(e) => patch({ cashierPrintingEnabled: e.target.checked })} />}
                label="تفعيل الطباعة للكاشير (نفس إعدادات الطابعة)"
              />
              <TextField
                fullWidth
                label="مقاس الورق في Windows"
                value={settings.paperSize}
                onChange={(e) => patch({ paperSize: e.target.value })}
                helperText="يجب أن يطابق الاسم في إعدادات الطابعة — الافتراضي: 80(72.1) x 297 mm"
              />
              <TextField
                select={bridgePrinters.length > 0}
                fullWidth
                label="اسم الطابعة"
                value={settings.printerName}
                onChange={(e) => patch({ printerName: e.target.value })}
                helperText={
                  bridgeOk
                    ? (bridgePrinters.length
                      ? `Print Bridge متصل — ${bridgePrinters.length} طابعة`
                      : 'Print Bridge متصل — اكتب اسم الطابعة يدوياً')
                    : 'شغّل Print Bridge: npm run dev:print-bridge'
                }
              >
                {bridgePrinters.map((p) => (
                  <MenuItem key={p} value={p}>{p}</MenuItem>
                ))}
              </TextField>
            </Stack>

            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 3 }}>
              <Button variant="contained" onClick={handleSave}>حفظ الإعدادات</Button>
              <Button variant="outlined" onClick={handleReset}>إعادة الافتراضي</Button>
              <Button variant="outlined" onClick={handleTestPrint} disabled={!bridgeOk}>طباعة اختبار</Button>
              <Button component={RouterLink} to="/pos">العودة لنقطة البيع</Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Paper sx={{ p: 2, borderRadius: 3, position: { lg: 'sticky' }, top: 16 }}>
            <Typography variant="h6" fontWeight={800} gutterBottom>معاينة مباشرة</Typography>
            <Tabs value={previewTab} onChange={(_, v) => setPreviewTab(v)} sx={{ mb: 2 }}>
              <Tab value="customer" label="فاتورة الزبون" />
              <Tab value="kitchen" label="فاتورة المطبخ" />
            </Tabs>
            <ReceiptPreview settings={settings} mode={previewTab} />
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
}
