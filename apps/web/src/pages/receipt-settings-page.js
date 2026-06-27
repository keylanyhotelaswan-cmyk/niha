import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Box, Button, Divider, FormControlLabel, Grid, MenuItem, Paper, Slider, Stack, Switch, Tab, Tabs, TextField, Typography, } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../lib/auth-context.js';
import { useBranches } from '../lib/hooks.js';
import { readPosBranchId } from '../lib/pos-store.js';
import { getReceiptSettings, hydrateReceiptSettingsFromServer, receiptLayoutFromSettings, resetReceiptSettings, sampleReceiptData, saveReceiptSettingsWithSync, } from '../lib/pos-receipt-settings.js';
import { buildCustomerReceiptHtml, buildKitchenReceiptHtml, kitchenFromReceipt, savePrinterName, } from '../lib/pos-receipt.js';
import { bridgePrintEscPos, bridgePrintJobs, isPrintBridgeOnline, listBridgePrinters, } from '../lib/pos-print-bridge.js';
import { pickEscPosBridgeSettings, buildEscPosJobs } from '../lib/pos-receipt-escpos.js';
function ReceiptPreview({ settings, mode }) {
    const html = useMemo(() => {
        const sample = sampleReceiptData(settings);
        if (mode === 'kitchen') {
            return buildKitchenReceiptHtml(kitchenFromReceipt(sample), settings, false);
        }
        return buildCustomerReceiptHtml(sample, settings, false);
    }, [settings, mode]);
    const layout = receiptLayoutFromSettings(settings);
    const widthPx = layout.widthPx;
    return (_jsx(Box, { sx: {
            bgcolor: '#f5f5f5',
            p: 2,
            borderRadius: 2,
            overflow: 'auto',
            maxHeight: 520,
            display: 'flex',
            justifyContent: 'center',
        }, children: _jsx("iframe", { title: `preview-${mode}`, srcDoc: html, style: {
                width: widthPx,
                minHeight: 360,
                border: '1px solid #ccc',
                background: '#fff',
            } }) }));
}
export function ReceiptSettingsPage() {
    const { accessToken } = useAuth();
    const { data: branches = [] } = useBranches();
    const branchId = readPosBranchId() || branches[0]?.id || '';
    const [settings, setSettings] = useState(() => getReceiptSettings());
    const [loadingRemote, setLoadingRemote] = useState(false);
    const [previewTab, setPreviewTab] = useState('customer');
    const [savedMsg, setSavedMsg] = useState('');
    const [printMsg, setPrintMsg] = useState('');
    const [bridgeOk, setBridgeOk] = useState(false);
    const [bridgePrinters, setBridgePrinters] = useState([]);
    const layout = useMemo(() => receiptLayoutFromSettings(settings), [settings]);
    const patch = useCallback((partial) => {
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
                const guess = list.find((p) => /xp-?k?200/i.test(p))
                    ?? list.find((p) => /xp-?80/i.test(p))
                    ?? list[0];
                if (guess)
                    patch({ printerName: guess });
            }
        })();
    }, []);
    useEffect(() => {
        if (!branchId || !accessToken)
            return;
        let cancelled = false;
        setLoadingRemote(true);
        hydrateReceiptSettingsFromServer(branchId, accessToken)
            .then((remote) => {
            if (!cancelled)
                setSettings(remote);
        })
            .finally(() => {
            if (!cancelled)
                setLoadingRemote(false);
        });
        return () => {
            cancelled = true;
        };
    }, [branchId, accessToken]);
    const syncOptions = useMemo(() => ({ branchId, token: accessToken }), [branchId, accessToken]);
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
            const res = await bridgePrintEscPos(buildEscPosJobs(sample, saved.printCopies), pickEscPosBridgeSettings());
            setPrintMsg(res.ok ? 'تمت طباعة الاختبار (ESC/POS نصي).' : res.message);
            return;
        }
        const kitchen = kitchenFromReceipt(sample);
        const { renderCustomerReceiptPng, renderKitchenReceiptPng } = await import('../lib/pos-receipt-render.js');
        const jobs = [];
        if (saved.printCopies === 'kitchen' || saved.printCopies === 'both') {
            const kPng = await renderKitchenReceiptPng(kitchen, saved);
            if (kPng)
                jobs.push(kPng);
        }
        if (saved.printCopies === 'customer' || saved.printCopies === 'both') {
            const cPng = await renderCustomerReceiptPng(sample, saved);
            if (cPng)
                jobs.push(cPng);
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
    return (_jsxs(Stack, { spacing: 3, children: [_jsxs(Stack, { spacing: 0.5, children: [_jsx(Typography, { variant: "h5", fontWeight: 800, children: "\u062A\u062E\u0635\u064A\u0635 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0648\u0627\u0644\u0637\u0628\u0627\u0639\u0629" }), _jsx(Typography, { color: "text.secondary", variant: "body2", children: "\u0639\u062F\u0651\u0644 \u0627\u0644\u0634\u0643\u0644 \u0648\u0627\u0644\u0645\u0642\u0627\u0633 \u2014 \u0627\u0644\u062A\u063A\u064A\u064A\u0631\u0627\u062A \u062A\u064F\u062D\u0641\u0638 \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u062C\u0647\u0627\u0632 \u0648\u0639\u0644\u0649 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0628\u0639\u062F \u00AB\u062D\u0641\u0638 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A\u00BB." })] }), loadingRemote ? _jsx(Alert, { severity: "info", children: "\u062C\u0627\u0631\u064A \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0645\u0646 \u0627\u0644\u0633\u064A\u0631\u0641\u0631\u2026" }) : null, savedMsg ? _jsx(Alert, { severity: "success", children: savedMsg }) : null, printMsg ? (_jsx(Alert, { severity: printMsg.includes('فشل') || printMsg.includes('غير') ? 'error' : 'success', children: printMsg })) : null, _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, lg: 7, children: _jsxs(Paper, { sx: { p: 2.5, borderRadius: 3 }, children: [_jsx(Typography, { variant: "h6", fontWeight: 800, gutterBottom: true, children: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u062D\u0644" }), _jsxs(Stack, { spacing: 2, children: [_jsx(TextField, { label: "\u0627\u0633\u0645 \u0627\u0644\u0645\u062D\u0644", fullWidth: true, value: settings.storeName, onChange: (e) => patch({ storeName: e.target.value }) }), _jsx(TextField, { label: "\u0627\u0644\u0648\u0635\u0641", fullWidth: true, value: settings.storeSubtitle, onChange: (e) => patch({ storeSubtitle: e.target.value }) }), _jsx(TextField, { label: "\u0627\u0644\u0639\u0646\u0648\u0627\u0646 (\u0623\u0633\u0641\u0644 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629)", fullWidth: true, multiline: true, minRows: 2, value: settings.storeFooter, onChange: (e) => patch({ storeFooter: e.target.value }) }), _jsx(TextField, { label: "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641", fullWidth: true, value: settings.storePhone, onChange: (e) => patch({ storePhone: e.target.value }) })] }), _jsx(Divider, { sx: { my: 3 } }), _jsx(Typography, { variant: "h6", fontWeight: 800, gutterBottom: true, children: "\u0627\u0644\u0645\u0642\u0627\u0633 \u0648\u0627\u0644\u0625\u0637\u0627\u0631" }), _jsxs(Stack, { spacing: 2, children: [_jsxs(TextField, { select: true, fullWidth: true, label: "\u0639\u0631\u0636 \u0627\u0644\u0648\u0631\u0642", value: settings.paperWidthMm, onChange: (e) => patch({ paperWidthMm: Number(e.target.value) }), children: [_jsx(MenuItem, { value: 80, children: "80mm (\u0634\u0627\u0626\u0639 \u2014 XP-K200L)" }), _jsx(MenuItem, { value: 58, children: "58mm" })] }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u0627\u062A\u062C\u0627\u0647 \u0627\u0644\u0637\u0628\u0627\u0639\u0629: \u0628\u0627\u0644\u0637\u0648\u0644 (\u0639\u0645\u0648\u062F\u064A) \u2014 \u062B\u0627\u0628\u062A \u0644\u0637\u0627\u0628\u0639\u0629 \u0627\u0644\u0648\u0631\u0642 \u0627\u0644\u062D\u0631\u0627\u0631\u064A 80mm" }), _jsxs(Box, { children: [_jsxs(Typography, { gutterBottom: true, children: ["\u0627\u0644\u0647\u0627\u0645\u0634 \u0645\u0646 \u0643\u0644 \u062C\u0627\u0646\u0628: ", settings.marginMm, "mm (\u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A 2mm)"] }), _jsx(Slider, { value: settings.marginMm, min: 0, max: 20, step: 1, valueLabelDisplay: "auto", onChange: (_, v) => patch({ marginMm: v }) })] }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: settings.showFrame, onChange: (e) => patch({ showFrame: e.target.checked }) }), label: "\u0625\u0637\u0627\u0631 \u062D\u0648\u0644 \u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629" }), _jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["\u0639\u0631\u0636 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0641\u0639\u0644\u064A: ", layout.printableMm, "mm \u2014 \u0639\u0631\u0636 \u0627\u0644\u0635\u0648\u0631\u0629: ", layout.widthPx, "px"] })] }), _jsx(Divider, { sx: { my: 3 } }), _jsx(Typography, { variant: "h6", fontWeight: 800, gutterBottom: true, children: "\u0627\u0644\u062E\u0637" }), _jsxs(Stack, { spacing: 2, children: [_jsxs(Box, { children: [_jsxs(Typography, { gutterBottom: true, children: ["\u0645\u0642\u064A\u0627\u0633 \u0627\u0644\u062E\u0637 \u0627\u0644\u0639\u0627\u0645: ", Math.round(settings.fontScale * 100), "%"] }), _jsx(Slider, { value: settings.fontScale, min: 0.65, max: 1.5, step: 0.05, valueLabelDisplay: "auto", valueLabelFormat: (v) => `${Math.round(v * 100)}%`, onChange: (_, v) => patch({ fontScale: v }) })] }), _jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { item: true, xs: 6, children: _jsx(TextField, { type: "number", fullWidth: true, label: "\u0627\u0633\u0645 \u0627\u0644\u0645\u062D\u0644 (px)", value: settings.fontStoreName, onChange: (e) => patch({ fontStoreName: Number(e.target.value) }) }) }), _jsx(Grid, { item: true, xs: 6, children: _jsx(TextField, { type: "number", fullWidth: true, label: "\u0627\u0644\u0646\u0635 \u0627\u0644\u0639\u0627\u062F\u064A (px)", value: settings.fontBody, onChange: (e) => patch({ fontBody: Number(e.target.value) }) }) }), _jsx(Grid, { item: true, xs: 6, children: _jsx(TextField, { type: "number", fullWidth: true, label: "\u0631\u0642\u0645 \u0627\u0644\u0645\u0637\u0628\u062E (px)", value: settings.fontKitchenNum, onChange: (e) => patch({ fontKitchenNum: Number(e.target.value) }) }) }), _jsx(Grid, { item: true, xs: 6, children: _jsx(TextField, { type: "number", fullWidth: true, label: "\u0623\u0635\u0646\u0627\u0641 \u0627\u0644\u0645\u0637\u0628\u062E (px)", value: settings.fontKitchenItem, onChange: (e) => patch({ fontKitchenItem: Number(e.target.value) }) }) })] })] }), _jsx(Divider, { sx: { my: 3 } }), _jsx(Typography, { variant: "h6", fontWeight: 800, gutterBottom: true, children: "\u0633\u0627\u0626\u0642\u0648 \u0627\u0644\u062F\u0644\u064A\u0641\u0631\u064A" }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 1.5 }, children: "\u0623\u0636\u0641 \u0627\u0644\u0623\u0633\u0645\u0627\u0621 \u0647\u0646\u0627 \u0644\u062A\u0638\u0647\u0631 \u0643\u0642\u0627\u0626\u0645\u0629 \u0645\u0646\u0633\u062F\u0644\u0629 \u0641\u064A \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u062A\u064A\u0643 \u0623\u0648\u0627\u064A." }), _jsxs(Stack, { spacing: 1.25, children: [(settings.deliveryDrivers ?? []).map((driver, index) => (_jsxs(Stack, { direction: { xs: 'column', sm: 'row' }, spacing: 1, children: [_jsx(TextField, { fullWidth: true, size: "small", label: "\u0627\u0644\u0627\u0633\u0645", value: driver.name, onChange: (e) => {
                                                        const next = [...settings.deliveryDrivers];
                                                        next[index] = { ...next[index], name: e.target.value };
                                                        patch({ deliveryDrivers: next });
                                                    } }), _jsx(TextField, { fullWidth: true, size: "small", label: "\u0647\u0627\u062A\u0641 (\u0627\u062E\u062A\u064A\u0627\u0631\u064A)", value: driver.phone ?? '', onChange: (e) => {
                                                        const next = [...settings.deliveryDrivers];
                                                        next[index] = { ...next[index], name: next[index]?.name ?? '', phone: e.target.value };
                                                        patch({ deliveryDrivers: next });
                                                    } }), _jsx(Button, { color: "error", onClick: () => patch({ deliveryDrivers: settings.deliveryDrivers.filter((_, i) => i !== index) }), children: "\u062D\u0630\u0641" })] }, index))), _jsx(Button, { variant: "outlined", onClick: () => patch({ deliveryDrivers: [...settings.deliveryDrivers, { name: '' }] }), children: "+ \u0625\u0636\u0627\u0641\u0629 \u0633\u0627\u0626\u0642" })] }), _jsx(Divider, { sx: { my: 3 } }), _jsx(Typography, { variant: "h6", fontWeight: 800, gutterBottom: true, children: "\u0627\u0644\u0637\u0628\u0627\u0639\u0629" }), _jsxs(Stack, { spacing: 2, children: [_jsxs(TextField, { select: true, fullWidth: true, label: "\u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u0637\u0628\u0627\u0639\u0629", value: settings.printMode, onChange: (e) => patch({ printMode: e.target.value }), helperText: "ESC/POS \u0635\u0648\u0631\u0629 = \u0639\u0631\u0628\u064A \u0648\u0627\u0636\u062D \u0639\u0644\u0649 XPrinter (\u0645\u0648\u0635\u0649 \u0628\u0647). \u0627\u0644\u0646\u0635\u064A = \u0633\u0631\u064A\u0639 \u0644\u0643\u0646 \u0627\u0644\u0639\u0631\u0628\u064A \u0642\u062F \u064A\u0638\u0647\u0631 \u0631\u0645\u0648\u0632.", children: [_jsx(MenuItem, { value: "escpos", children: "ESC/POS \u0635\u0648\u0631\u0629 (\u0639\u0631\u0628\u064A \u2014 \u0645\u0648\u0635\u0649 \u0628\u0647)" }), _jsx(MenuItem, { value: "escpos-text", children: "ESC/POS \u0646\u0635\u064A (\u0633\u0631\u064A\u0639 \u2014 \u0628\u062F\u0648\u0646 \u0639\u0631\u0628\u064A)" }), _jsx(MenuItem, { value: "png", children: "PDF/\u0635\u0648\u0631\u0629 (\u0627\u062D\u062A\u064A\u0627\u0637\u064A)" })] }), _jsxs(TextField, { select: true, fullWidth: true, label: "\u0646\u0633\u062E \u0627\u0644\u0637\u0628\u0627\u0639\u0629 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629", value: settings.printCopies, onChange: (e) => patch({ printCopies: e.target.value }), children: [_jsx(MenuItem, { value: "both", children: "\u0634\u064A\u0641 + \u0632\u0628\u0648\u0646" }), _jsx(MenuItem, { value: "kitchen", children: "\u0634\u064A\u0641 \u0641\u0642\u0637" }), _jsx(MenuItem, { value: "customer", children: "\u0632\u0628\u0648\u0646 \u0641\u0642\u0637" })] }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: settings.autoPrint, onChange: (e) => patch({ autoPrint: e.target.checked }) }), label: "\u0637\u0628\u0627\u0639\u0629 \u062A\u0644\u0642\u0627\u0626\u064A\u0629 \u0639\u0646\u062F \u0625\u063A\u0644\u0627\u0642 \u0627\u0644\u0637\u0644\u0628" }), _jsx(FormControlLabel, { control: _jsx(Switch, { checked: settings.cashierPrintingEnabled, onChange: (e) => patch({ cashierPrintingEnabled: e.target.checked }) }), label: "\u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u0637\u0628\u0627\u0639\u0629 \u0644\u0644\u0643\u0627\u0634\u064A\u0631 (\u0646\u0641\u0633 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0637\u0627\u0628\u0639\u0629)" }), _jsx(TextField, { fullWidth: true, label: "\u0645\u0642\u0627\u0633 \u0627\u0644\u0648\u0631\u0642 \u0641\u064A Windows", value: settings.paperSize, onChange: (e) => patch({ paperSize: e.target.value }), helperText: "\u064A\u062C\u0628 \u0623\u0646 \u064A\u0637\u0627\u0628\u0642 \u0627\u0644\u0627\u0633\u0645 \u0641\u064A \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0637\u0627\u0628\u0639\u0629 \u2014 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A: 80(72.1) x 297 mm" }), _jsx(TextField, { select: bridgePrinters.length > 0, fullWidth: true, label: "\u0627\u0633\u0645 \u0627\u0644\u0637\u0627\u0628\u0639\u0629", value: settings.printerName, onChange: (e) => patch({ printerName: e.target.value }), helperText: bridgeOk
                                                ? (bridgePrinters.length
                                                    ? `Print Bridge متصل — ${bridgePrinters.length} طابعة`
                                                    : 'Print Bridge متصل — اكتب اسم الطابعة يدوياً')
                                                : 'شغّل Print Bridge: npm run dev:print-bridge', children: bridgePrinters.map((p) => (_jsx(MenuItem, { value: p, children: p }, p))) })] }), _jsxs(Stack, { direction: "row", flexWrap: "wrap", gap: 1, sx: { mt: 3 }, children: [_jsx(Button, { variant: "contained", onClick: handleSave, children: "\u062D\u0641\u0638 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A" }), _jsx(Button, { variant: "outlined", onClick: handleReset, children: "\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A" }), _jsx(Button, { variant: "outlined", onClick: handleTestPrint, disabled: !bridgeOk, children: "\u0637\u0628\u0627\u0639\u0629 \u0627\u062E\u062A\u0628\u0627\u0631" }), _jsx(Button, { component: RouterLink, to: "/pos", children: "\u0627\u0644\u0639\u0648\u062F\u0629 \u0644\u0646\u0642\u0637\u0629 \u0627\u0644\u0628\u064A\u0639" })] })] }) }), _jsx(Grid, { item: true, xs: 12, lg: 5, children: _jsxs(Paper, { sx: { p: 2, borderRadius: 3, position: { lg: 'sticky' }, top: 16 }, children: [_jsx(Typography, { variant: "h6", fontWeight: 800, gutterBottom: true, children: "\u0645\u0639\u0627\u064A\u0646\u0629 \u0645\u0628\u0627\u0634\u0631\u0629" }), _jsxs(Tabs, { value: previewTab, onChange: (_, v) => setPreviewTab(v), sx: { mb: 2 }, children: [_jsx(Tab, { value: "customer", label: "\u0641\u0627\u062A\u0648\u0631\u0629 \u0627\u0644\u0632\u0628\u0648\u0646" }), _jsx(Tab, { value: "kitchen", label: "\u0641\u0627\u062A\u0648\u0631\u0629 \u0627\u0644\u0645\u0637\u0628\u062E" })] }), _jsx(ReceiptPreview, { settings: settings, mode: previewTab })] }) })] })] }));
}
