import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography, } from '@mui/material';
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { DEFAULT_PRINTER_NAME, getReceiptLayout, getReceiptSettings, readSavedPrinterName, sampleReceiptData, savePrinterName, } from '../../../lib/pos-receipt.js';
import { bridgePrintEscPos, bridgePrintJobs, isPrintBridgeOnline, listBridgePrinters, } from '../../../lib/pos-print-bridge.js';
import { buildEscPosJobs, pickEscPosBridgeSettings } from '../../../lib/pos-receipt-escpos.js';
import { kitchenFromReceipt } from '../../../lib/pos-receipt.js';
import { renderCustomerReceiptPng, renderKitchenReceiptPng } from '../../../lib/pos-receipt-render.js';
export function PrintSetupDialog({ open, onClose }) {
    const receiptSettings = getReceiptSettings();
    const layout = getReceiptLayout(receiptSettings);
    const [printers, setPrinters] = useState([]);
    const [selected, setSelected] = useState(() => readSavedPrinterName());
    const [manualName, setManualName] = useState(() => readSavedPrinterName());
    const [bridgeOk, setBridgeOk] = useState(false);
    const [status, setStatus] = useState('loading');
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
        if (list.includes(saved))
            setSelected(saved);
        else
            setSelected(list.find((p) => /xp-?k?200/i.test(p)) ?? list.find((p) => /xp-80/i.test(p)) ?? list[0] ?? '');
        setStatus('ready');
    };
    useEffect(() => {
        if (open)
            refresh();
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
            const res = await bridgePrintEscPos(buildEscPosJobs(receiptData, copies), pickEscPosBridgeSettings());
            const copyLabel = copies === 'both' ? 'شيف + زبون' : copies === 'kitchen' ? 'شيف' : 'زبون';
            setTestMsg(res.ok ? `تمت طباعة ${copyLabel} (ESC/POS نصي).` : res.message);
            setTesting(false);
            return;
        }
        const kitchen = kitchenFromReceipt(receiptData);
        const jobs = [];
        if (copies === 'kitchen' || copies === 'both') {
            const kPng = await renderKitchenReceiptPng(kitchen, settings);
            if (kPng)
                jobs.push({ pngBase64: kPng.base64, pngHeightPx: kPng.heightPx, pngWidthPx: kPng.widthPx, paperWidthMm: kPng.paperWidthMm, label: 'kitchen' });
        }
        if (copies === 'customer' || copies === 'both') {
            const cPng = await renderCustomerReceiptPng(receiptData, settings);
            if (cPng)
                jobs.push({ pngBase64: cPng.base64, pngHeightPx: cPng.heightPx, pngWidthPx: cPng.widthPx, paperWidthMm: cPng.paperWidthMm, label: 'customer' });
        }
        const res = await bridgePrintJobs(jobs);
        setTestMsg(res.ok ? 'تمت طباعة الاختبار (PNG).' : res.message);
        setTesting(false);
    };
    return (_jsxs(Dialog, { open: open, onClose: onClose, fullWidth: true, maxWidth: "sm", children: [_jsx(DialogTitle, { children: "\u0625\u0639\u062F\u0627\u062F \u0627\u0644\u0637\u0627\u0628\u0639\u0629 (\u0637\u0628\u0627\u0639\u0629 \u0635\u0627\u0645\u062A\u0629)" }), _jsx(DialogContent, { children: _jsxs(Stack, { spacing: 2, sx: { pt: 1 }, children: [_jsxs(Alert, { severity: "info", sx: { borderRadius: 2 }, children: [_jsx("strong", { children: "Niha Print Bridge" }), " \u2014 \u0628\u062F\u064A\u0644 QZ Tray", _jsx("br", {}), "\u0644\u062A\u062E\u0635\u064A\u0635 \u0634\u0643\u0644 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629:", ' ', _jsx(Button, { component: RouterLink, to: "/settings/receipt", size: "small", onClick: onClose, children: "\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629" })] }), status === 'error' ? (_jsx(Alert, { severity: "warning", sx: { borderRadius: 2 }, children: error })) : null, bridgeOk ? (_jsx(Alert, { severity: "success", sx: { borderRadius: 2 }, children: "Print Bridge \u0645\u062A\u0635\u0644 \u2713" })) : null, printers.length > 0 ? (_jsx(TextField, { select: true, fullWidth: true, label: "\u0627\u0644\u0637\u0627\u0628\u0639\u0627\u062A", value: selected, onChange: (e) => {
                                setSelected(e.target.value);
                                setManualName(e.target.value);
                            }, children: printers.map((p) => (_jsx(MenuItem, { value: p, children: p }, p))) })) : null, _jsx(TextField, { fullWidth: true, label: "\u0627\u0633\u0645 \u0627\u0644\u0637\u0627\u0628\u0639\u0629", placeholder: DEFAULT_PRINTER_NAME, value: manualName, onChange: (e) => {
                                setManualName(e.target.value);
                                if (!printers.includes(e.target.value))
                                    setSelected('');
                            }, helperText: "\u0645\u062B\u0627\u0644: XP-K200L" }), _jsxs(Typography, { variant: "caption", color: "text.secondary", children: ["\u0627\u0644\u0637\u0628\u0627\u0639\u0629 \u0627\u0644\u0635\u0627\u0645\u062A\u0629 \u0639\u0644\u0649: ", _jsx("strong", { children: effectiveName }), _jsx("br", {}), "\u0645\u0642\u0627\u0633 \u0627\u0644\u0648\u0631\u0642: ", layout.paperMm, "mm \u2014 \u0647\u0627\u0645\u0634 ", layout.marginMm, "mm \u2014 \u0645\u062D\u062A\u0648\u0649 ", layout.printableMm, "mm"] }), testMsg ? (_jsx(Alert, { severity: testMsg.includes('فشل') || testMsg.includes('غير') ? 'error' : 'success', sx: { borderRadius: 2 }, children: testMsg })) : null] }) }), _jsxs(DialogActions, { sx: { flexWrap: 'wrap', gap: 1, px: 2, pb: 2 }, children: [_jsx(Button, { component: RouterLink, to: "/settings/receipt", onClick: onClose, children: "\u062A\u062E\u0635\u064A\u0635 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629" }), _jsx(Button, { onClick: refresh, disabled: status === 'loading', children: "\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629" }), _jsx(Button, { onClick: runTestPrint, disabled: testing || !bridgeOk, children: "\u0637\u0628\u0627\u0639\u0629 \u0627\u062E\u062A\u0628\u0627\u0631" }), _jsx(Button, { onClick: onClose, children: "\u0625\u0644\u063A\u0627\u0621" }), _jsx(Button, { variant: "contained", onClick: () => { savePrinterName(effectiveName); onClose(); }, children: "\u062D\u0641\u0638" })] })] }));
}
