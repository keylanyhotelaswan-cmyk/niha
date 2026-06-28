import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid2, InputAdornment, MenuItem, Paper, Stack, Tab, Tabs, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PageToolbar } from '../components/page-toolbar.js';
import { apiPost, API_BASE, parseApiErrorBody } from '../lib/api-client.js';
import { useAuth } from '../lib/auth-context.js';
import { useBranches, useCashBoxes, usePaymentMethods, usePurchaseOrders, useVendorAccountsContext, useVendorInvoices, useVendorPayments, useVendorStatement, useVendors, useWarehouses, } from '../lib/hooks.js';
import { localMonthStartKey, localTodayKey } from '../lib/date-utils.js';
import { MetricCard, SectionCard } from './shared.js';
import { cardSx, ui } from '../lib/ui-tokens.js';
import { ExpensesTreasuryPanel } from './vendor-accounts/expenses-treasury-panel.js';
const ENTRY_LABELS = {
    INVOICE: 'فاتورة شراء',
    PAYMENT: 'دفعة',
    ADJUSTMENT: 'تسوية',
    OPENING: 'رصيد افتتاحي',
    CREDIT_NOTE: 'إشعار دائن',
};
const INVOICE_STATUS = {
    DRAFT: { label: 'مسودة', color: 'default' },
    POSTED: { label: 'مرحّلة', color: 'info' },
    PARTIALLY_PAID: { label: 'مدفوعة جزئياً', color: 'warning' },
    PAID: { label: 'مدفوعة', color: 'success' },
    VOIDED: { label: 'ملغاة', color: 'error' },
};
const SCENARIOS = [
    { title: 'مورد جديد + رصيد افتتاحي', desc: 'أضف المورد برصيد مستحق سابق — يظهر في كشف الحساب كرصيد افتتاحي.' },
    { title: 'أمر شراء → استلام', desc: 'استلام البضاعة يزيد المخزون ويُنشئ فاتورة AP تلقائياً على المورد.' },
    { title: 'فاتورة يدوية', desc: 'مشتريات/خدمات بدون مخزون — قيد AP مباشر.' },
    { title: 'دفعة من خزينة المصروفات', desc: 'تُخصم من رصيد EXPENSES حسب الوسيلة (نقدي/انستاباي…) — يقل AP ويظهر في الخزينة.' },
    { title: 'سداد فاتورة محددة', desc: 'اربط الدفعة بفاتورة — يُحدَّث paidAmount وحالة الفاتورة.' },
    { title: 'تسوية / إشعار دائن', desc: 'تصحيح رصيد المورد (زيادة أو تخفيض) بدون حركة خزينة.' },
    { title: 'إلغاء فاتورة', desc: 'فقط للفواتير بدون مدفوعات — يعكس قيد AP.' },
];
const PO_STATUS = {
    DRAFT: 'مسودة',
    ORDERED: 'مُرسَل',
    RECEIVED: 'مُستلم',
    CANCELLED: 'ملغى',
};
function fmt(n) {
    return `${n.toLocaleString('en-US')} ج.م`;
}
function apiActionError(res, fallback) {
    if (res.status === 404) {
        return `مسار الـ API غير موجود (${API_BASE}). أعد تشغيل الـ API: npm run dev:api — وتجنّب dev:desktop:cloud محلياً.`;
    }
    return parseApiErrorBody(res.body, res.error ?? fallback);
}
export function VendorAccountsPage() {
    const { accessToken } = useAuth();
    const queryClient = useQueryClient();
    const { data: branches = [] } = useBranches();
    const [branchId, setBranchId] = useState('');
    const effectiveBranchId = branchId || branches[0]?.id || '';
    const { data: vendors = [], isLoading, isError, error } = useVendors(effectiveBranchId, true);
    const { data: paymentMethods = [] } = usePaymentMethods(effectiveBranchId);
    const { data: cashBoxes = [] } = useCashBoxes(effectiveBranchId);
    const { data: warehouses = [] } = useWarehouses(effectiveBranchId);
    const { data: allPurchaseOrders = [], refetch: refetchPOs } = usePurchaseOrders(effectiveBranchId);
    const [vendorSearch, setVendorSearch] = useState('');
    const [selectedVendorId, setSelectedVendorId] = useState(null);
    const [detailTab, setDetailTab] = useState(0);
    const [fromDate, setFromDate] = useState(localMonthStartKey);
    const [toDate, setToDate] = useState(localTodayKey);
    const [showFlow, setShowFlow] = useState(false);
    const [payOpen, setPayOpen] = useState(false);
    const [payAmount, setPayAmount] = useState('');
    const [payMethodId, setPayMethodId] = useState('');
    const [payCashBoxId, setPayCashBoxId] = useState('');
    const [payInvoiceId, setPayInvoiceId] = useState('');
    const [payReference, setPayReference] = useState('');
    const [payBusy, setPayBusy] = useState(false);
    const [payError, setPayError] = useState('');
    const [invoiceOpen, setInvoiceOpen] = useState(false);
    const [invDesc, setInvDesc] = useState('');
    const [invAmount, setInvAmount] = useState('');
    const [invBusy, setInvBusy] = useState(false);
    const [invError, setInvError] = useState('');
    const [vendorOpen, setVendorOpen] = useState(false);
    const [vendorName, setVendorName] = useState('');
    const [vendorCode, setVendorCode] = useState('');
    const [vendorPhone, setVendorPhone] = useState('');
    const [vendorOpening, setVendorOpening] = useState('');
    const [vendorBusy, setVendorBusy] = useState(false);
    const [vendorError, setVendorError] = useState('');
    const [poMsg, setPoMsg] = useState('');
    const [adjOpen, setAdjOpen] = useState(false);
    const [adjCredit, setAdjCredit] = useState('');
    const [adjDebit, setAdjDebit] = useState('');
    const [adjNote, setAdjNote] = useState('');
    const [adjBusy, setAdjBusy] = useState(false);
    const [adjError, setAdjError] = useState('');
    const { data: apContext, refetch: refetchContext } = useVendorAccountsContext(effectiveBranchId, payCashBoxId || undefined);
    useEffect(() => {
        if (cashBoxes.length && !payCashBoxId)
            setPayCashBoxId(cashBoxes[0].id);
    }, [cashBoxes, payCashBoxId]);
    useEffect(() => {
        if (paymentMethods.length && !payMethodId) {
            const def = paymentMethods.find((pm) => pm.isDefault) ?? paymentMethods[0];
            if (def)
                setPayMethodId(def.id);
        }
    }, [paymentMethods, payMethodId]);
    const filteredVendors = useMemo(() => {
        const q = vendorSearch.trim().toLowerCase();
        const list = [...vendors].sort((a, b) => Number(b.currentBalance ?? 0) - Number(a.currentBalance ?? 0));
        if (!q)
            return list;
        return list.filter((v) => v.name.toLowerCase().includes(q) || v.code.toLowerCase().includes(q));
    }, [vendors, vendorSearch]);
    const totalPayableClient = useMemo(() => vendors.reduce((sum, v) => sum + Math.max(0, Number(v.currentBalance ?? 0)), 0), [vendors]);
    const vendorsWithDebtClient = useMemo(() => vendors.filter((v) => Number(v.currentBalance ?? 0) > 0.01).length, [vendors]);
    const totalPayable = Number(apContext?.summary?.totalPayable ?? totalPayableClient);
    const vendorsWithDebt = Number(apContext?.summary?.vendorsWithDebt ?? vendorsWithDebtClient);
    const unpaidInvoicesGlobal = Number(apContext?.summary?.unpaidInvoices ?? 0);
    const paymentsThisMonth = Number(apContext?.summary?.paymentsThisMonth ?? 0);
    const recentPayments = apContext?.recentPayments ?? [];
    const selectedPayMethod = paymentMethods.find((pm) => pm.id === payMethodId);
    const selectedPayMethodType = selectedPayMethod?.type;
    const payAmountNum = Number(payAmount) || 0;
    const expensesAvailableForPay = selectedPayMethodType
        ? Number(apContext?.treasury?.walletBalances?.[selectedPayMethodType]?.EXPENSES ?? 0)
        : Number(apContext?.treasury?.expensesSafe ?? 0);
    const payInsufficient = payAmountNum > 0 && payAmountNum > expensesAvailableForPay + 0.01;
    const selectedVendor = vendors.find((v) => v.id === selectedVendorId);
    const { data: statement, isFetching: statementLoading } = useVendorStatement(selectedVendorId ?? undefined, fromDate, toDate);
    const { data: vendorInvoices = [] } = useVendorInvoices(effectiveBranchId, selectedVendorId ?? undefined);
    const { data: vendorPayments = [] } = useVendorPayments(effectiveBranchId, selectedVendorId ?? undefined);
    const vendorPOs = useMemo(() => allPurchaseOrders.filter((po) => po.vendorId === selectedVendorId), [allPurchaseOrders, selectedVendorId]);
    const unpaidInvoices = useMemo(() => vendorInvoices.filter((inv) => inv.status !== 'VOIDED' && inv.status !== 'DRAFT' && Number(inv.totalAmount) > Number(inv.paidAmount)), [vendorInvoices]);
    const invalidateVendor = () => {
        void queryClient.invalidateQueries({ queryKey: ['vendors'] });
        void queryClient.invalidateQueries({ queryKey: ['vendor-statement'] });
        void queryClient.invalidateQueries({ queryKey: ['vendor-invoices'] });
        void queryClient.invalidateQueries({ queryKey: ['vendor-payments'] });
        void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
        void queryClient.invalidateQueries({ queryKey: ['vendor-accounts-context'] });
        void refetchContext();
    };
    const openPayDialog = (invoiceId, amount) => {
        setPayInvoiceId(invoiceId ?? '');
        setPayAmount(amount != null ? String(amount) : '');
        setPayReference('');
        setPayError('');
        setPayOpen(true);
    };
    const submitPayment = async () => {
        if (!accessToken || !selectedVendorId || !payMethodId)
            return;
        setPayBusy(true);
        setPayError('');
        const res = await apiPost('/vendor-payments', {
            branchId: effectiveBranchId,
            vendorId: selectedVendorId,
            paymentMethodId: payMethodId,
            amount: Number(payAmount),
            ...(payCashBoxId ? { cashBoxId: payCashBoxId } : {}),
            ...(payInvoiceId ? { vendorInvoiceId: payInvoiceId } : {}),
            ...(payReference ? { reference: payReference } : {}),
        }, accessToken);
        setPayBusy(false);
        if (!res.ok) {
            setPayError(apiActionError(res, 'فشل تسجيل الدفعة'));
            return;
        }
        setPayOpen(false);
        setPayAmount('');
        setPayInvoiceId('');
        setPayReference('');
        invalidateVendor();
    };
    const submitManualInvoice = async () => {
        if (!accessToken || !selectedVendorId || !invDesc.trim())
            return;
        setInvBusy(true);
        setInvError('');
        const res = await apiPost('/vendor-invoices', {
            branchId: effectiveBranchId,
            vendorId: selectedVendorId,
            post: true,
            lines: [{ description: invDesc.trim(), lineTotal: Number(invAmount) }],
        }, accessToken);
        setInvBusy(false);
        if (!res.ok) {
            setInvError(apiActionError(res, 'فشل إنشاء الفاتورة'));
            return;
        }
        setInvoiceOpen(false);
        setInvDesc('');
        setInvAmount('');
        invalidateVendor();
    };
    const submitVendor = async () => {
        if (!accessToken || !vendorName.trim() || !effectiveBranchId)
            return;
        setVendorBusy(true);
        setVendorError('');
        const res = await apiPost('/vendors', {
            branchId: effectiveBranchId,
            name: vendorName.trim(),
            code: vendorCode.trim() || vendorName.trim().slice(0, 6).toUpperCase(),
            ...(vendorPhone.trim() ? { phone: vendorPhone.trim() } : {}),
            ...(vendorOpening ? { openingBalance: Number(vendorOpening) } : {}),
        }, accessToken);
        setVendorBusy(false);
        if (!res.ok) {
            setVendorError(apiActionError(res, 'فشل إضافة المورد'));
            return;
        }
        setVendorOpen(false);
        setVendorName('');
        setVendorCode('');
        setVendorPhone('');
        setVendorOpening('');
        invalidateVendor();
    };
    const voidInvoice = async (invoiceId) => {
        if (!accessToken || !window.confirm('إلغاء هذه الفاتورة؟'))
            return;
        const res = await apiPost(`/vendor-invoices/${invoiceId}/void`, {}, accessToken);
        if (!res.ok) {
            setInvError(apiActionError(res, 'فشل إلغاء الفاتورة'));
            return;
        }
        invalidateVendor();
    };
    const submitAdjustment = async () => {
        if (!accessToken || !selectedVendorId)
            return;
        const credit = Number(adjCredit) || 0;
        const debit = Number(adjDebit) || 0;
        if (credit <= 0 && debit <= 0) {
            setAdjError('أدخل مبلغ تسوية (دائن أو مدين)');
            return;
        }
        setAdjBusy(true);
        setAdjError('');
        const res = await apiPost('/vendor-accounts/adjustments', {
            branchId: effectiveBranchId,
            vendorId: selectedVendorId,
            ...(credit > 0 ? { credit } : {}),
            ...(debit > 0 ? { debit } : {}),
            ...(adjNote.trim() ? { note: adjNote.trim() } : {}),
        }, accessToken);
        setAdjBusy(false);
        if (!res.ok) {
            setAdjError(apiActionError(res, 'فشل التسوية'));
            return;
        }
        setAdjOpen(false);
        setAdjCredit('');
        setAdjDebit('');
        setAdjNote('');
        invalidateVendor();
    };
    const receivePO = async (poId) => {
        if (!accessToken || !warehouses[0]) {
            setPoMsg('أضف مخزناً أولاً من صفحة المخزون.');
            return;
        }
        setPoMsg('');
        const res = await apiPost(`/purchase-orders/${poId}/receive`, { warehouseId: warehouses[0].id }, accessToken);
        if (!res.ok) {
            setPoMsg(apiActionError(res, 'فشل استلام البضاعة'));
            return;
        }
        setPoMsg('تم الاستلام — أُنشئت فاتورة شراء على حساب المورد تلقائياً.');
        invalidateVendor();
        void refetchPOs();
    };
    return (_jsxs(Stack, { spacing: 2, children: [_jsx(PageToolbar, { title: "\u062D\u0633\u0627\u0628\u0627\u062A \u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646", subtitle: "\u0645\u0631\u0643\u0632 \u0648\u0627\u062D\u062F \u0644\u0644\u0645\u0648\u0631\u062F\u064A\u0646\u060C \u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0634\u0631\u0627\u0621\u060C \u0627\u0644\u0645\u062F\u0641\u0648\u0639\u0627\u062A\u060C \u0648\u0631\u0628\u0637 \u062E\u0632\u064A\u0646\u0629 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u2014 \u0645\u0646\u0641\u0635\u0644 \u0639\u0646 \u0645\u0628\u064A\u0639\u0627\u062A POS." }), _jsxs(Alert, { severity: "info", action: _jsx(Button, { color: "inherit", size: "small", onClick: () => setShowFlow((v) => !v), children: showFlow ? 'إخفاء' : 'كيف يعمل؟' }), children: [_jsx("strong", { children: "\u0645\u0631\u0628\u0648\u0637 \u0628\u062E\u0632\u064A\u0646\u0629 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A (EXPENSES)" }), " \u2014 \u0643\u0644 \u062F\u0641\u0639\u0629 \u0645\u0648\u0631\u062F \u062A\u064F\u0633\u062C\u0651\u064E\u0644 \u0641\u064A \u062F\u0641\u062A\u0631 AP + \u062D\u0631\u0643\u0629 \u062E\u0632\u064A\u0646\u0629 \u0645\u0635\u0631\u0648\u0641\u0627\u062A\u060C \u0628\u062F\u0648\u0646 \u0631\u0628\u0637 \u0628\u0648\u0631\u062F\u064A\u0629 POS."] }), showFlow ? (_jsx(SectionCard, { title: "\u062C\u0645\u064A\u0639 \u0627\u0644\u0633\u064A\u0646\u0627\u0631\u064A\u0648\u0647\u0627\u062A", compact: true, children: _jsx(Grid2, { container: true, spacing: 1.5, children: SCENARIOS.map((s) => (_jsx(Grid2, { size: { xs: 12, sm: 6, md: 4 }, children: _jsxs(Paper, { elevation: 0, sx: { ...cardSx, p: 1.5, height: '100%' }, children: [_jsx(Typography, { fontWeight: 700, variant: "body2", sx: { mb: 0.5 }, children: s.title }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: s.desc })] }) }, s.title))) }) })) : null, _jsx(SectionCard, { title: "\u062E\u0632\u064A\u0646\u0629 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u2014 \u0645\u0635\u062F\u0631 \u0627\u0644\u062F\u0641\u0639", compact: true, children: _jsxs(Stack, { spacing: 1.5, children: [_jsxs(Stack, { direction: { xs: 'column', sm: 'row' }, spacing: 1.5, alignItems: { sm: 'center' }, children: [_jsx(TextField, { select: true, label: "\u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u062E\u0632\u064A\u0646\u0629", size: "small", value: payCashBoxId, onChange: (e) => setPayCashBoxId(e.target.value), sx: { minWidth: 200 }, children: cashBoxes.map((cb) => (_jsx(MenuItem, { value: cb.id, children: cb.name }, cb.id))) }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u0639\u0631\u0648\u0636 \u062A\u0631\u0627\u0643\u0645\u064A (approved) \u2014 \u064A\u064F\u062E\u0635\u0645 \u0645\u0646\u0647 \u0639\u0646\u062F \u0643\u0644 \u062F\u0641\u0639\u0629 \u0645\u0648\u0631\u062F" })] }), _jsx(ExpensesTreasuryPanel, { treasury: apContext?.treasury })] }) }), _jsxs(Grid2, { container: true, spacing: 1.5, children: [_jsx(Grid2, { size: { xs: 6, sm: 3 }, children: _jsx(MetricCard, { label: "\u0645\u0633\u062A\u062D\u0642 \u0644\u0644\u0645\u0648\u0631\u062F\u064A\u0646 (AP)", value: fmt(totalPayable), note: `${vendorsWithDebt} مورد` }) }), _jsx(Grid2, { size: { xs: 6, sm: 3 }, children: _jsx(MetricCard, { label: "\u062E\u0632\u064A\u0646\u0629 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A", value: fmt(Number(apContext?.treasury?.expensesSafe ?? 0)), note: "EXPENSES \u00B7 \u0645\u062A\u0627\u062D \u0644\u0644\u0635\u0631\u0641" }) }), _jsx(Grid2, { size: { xs: 6, sm: 3 }, children: _jsx(MetricCard, { label: "\u0641\u0648\u0627\u062A\u064A\u0631 \u063A\u064A\u0631 \u0645\u0633\u062F\u062F\u0629", value: String(unpaidInvoicesGlobal), note: "\u0643\u0644 \u0627\u0644\u0641\u0631\u0648\u0639" }) }), _jsx(Grid2, { size: { xs: 6, sm: 3 }, children: _jsx(MetricCard, { label: "\u0645\u062F\u0641\u0648\u0639\u0627\u062A \u0627\u0644\u0634\u0647\u0631", value: fmt(paymentsThisMonth), note: `${apContext?.summary?.paymentsCountThisMonth ?? 0} دفعة` }) })] }), recentPayments.length ? (_jsx(SectionCard, { title: "\u0622\u062E\u0631 \u0645\u062F\u0641\u0648\u0639\u0627\u062A \u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646", compact: true, children: _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u0627\u0644\u062A\u0627\u0631\u064A\u062E" }), _jsx(TableCell, { children: "\u0627\u0644\u0645\u0648\u0631\u062F" }), _jsx(TableCell, { children: "\u0627\u0644\u0648\u0633\u064A\u0644\u0629" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u0645\u0628\u0644\u063A" })] }) }), _jsx(TableBody, { children: recentPayments.map((p) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: new Date(p.paidAt).toLocaleDateString('ar-EG') }), _jsx(TableCell, { children: p.vendorName }), _jsx(TableCell, { children: p.paymentMethod ?? '—' }), _jsx(TableCell, { align: "left", sx: { fontWeight: 700 }, children: fmt(Number(p.amount)) })] }, p.id))) })] }) })) : null, _jsxs(Stack, { direction: { xs: 'column', md: 'row' }, spacing: 1.5, flexWrap: "wrap", useFlexGap: true, alignItems: "center", children: [branches.length > 1 ? (_jsx(TextField, { select: true, label: "\u0627\u0644\u0641\u0631\u0639", size: "small", value: effectiveBranchId, onChange: (e) => setBranchId(e.target.value), sx: { minWidth: 180 }, children: branches.map((b) => (_jsx(MenuItem, { value: b.id, children: b.name }, b.id))) })) : null, _jsx(Button, { variant: "contained", onClick: () => setVendorOpen(true), children: "+ \u0645\u0648\u0631\u062F \u062C\u062F\u064A\u062F" })] }), _jsxs(Grid2, { container: true, spacing: 2, children: [_jsx(Grid2, { size: { xs: 12, md: 4, lg: 3 }, children: _jsxs(SectionCard, { title: "\u0627\u0644\u0645\u0648\u0631\u062F\u0648\u0646", compact: true, children: [_jsx(TextField, { size: "small", fullWidth: true, placeholder: "\u0628\u062D\u062B \u0628\u0627\u0644\u0627\u0633\u0645 \u0623\u0648 \u0627\u0644\u0643\u0648\u062F\u2026", value: vendorSearch, onChange: (e) => setVendorSearch(e.target.value), sx: { mb: 1.5 }, InputProps: {
                                        startAdornment: (_jsx(InputAdornment, { position: "start", children: _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u2315" }) })),
                                    } }), isError ? (_jsx(Alert, { severity: "error", sx: { mb: 1 }, children: error instanceof Error ? error.message : 'تعذّر تحميل الموردين' })) : null, isLoading ? (_jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644\u2026" })) : !filteredVendors.length ? (_jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u0644\u0627 \u064A\u0648\u062C\u062F \u0645\u0648\u0631\u062F\u0648\u0646. \u0623\u0636\u0641 \u0645\u0648\u0631\u062F\u0627\u064B \u062C\u062F\u064A\u062F\u0627\u064B." })) : (_jsx(Stack, { spacing: 0.75, sx: { maxHeight: 520, overflow: 'auto' }, children: filteredVendors.map((v) => {
                                        const bal = Number(v.currentBalance ?? 0);
                                        return (_jsx(Paper, { elevation: 0, onClick: () => { setSelectedVendorId(v.id); setDetailTab(0); }, sx: {
                                                ...cardSx,
                                                p: 1.5,
                                                cursor: 'pointer',
                                                border: selectedVendorId === v.id ? `2px solid ${ui.primary}` : `1px solid ${ui.border}`,
                                                bgcolor: selectedVendorId === v.id ? ui.primaryBg : ui.paper,
                                            }, children: _jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", gap: 1, children: [_jsxs(Box, { minWidth: 0, children: [_jsx(Typography, { fontWeight: 700, noWrap: true, children: v.name }), _jsxs(Typography, { variant: "caption", color: "text.secondary", children: [v.code, v.phone ? ` · ${v.phone}` : ''] })] }), _jsxs(Stack, { alignItems: "flex-end", spacing: 0.25, children: [_jsx(Typography, { fontWeight: 700, color: bal > 0 ? 'warning.main' : 'text.secondary', sx: { fontSize: '0.9rem' }, children: fmt(bal) }), bal > 0 ? _jsx(Chip, { size: "small", label: "\u0645\u0633\u062A\u062D\u0642", color: "warning", variant: "outlined", sx: { height: 20, fontSize: '0.65rem' } }) : null] })] }) }, v.id));
                                    }) }))] }) }), _jsx(Grid2, { size: { xs: 12, md: 8, lg: 9 }, children: !selectedVendor ? (_jsx(SectionCard, { title: "\u0645\u0633\u0627\u062D\u0629 \u0627\u0644\u0639\u0645\u0644", compact: true, children: _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u0627\u062E\u062A\u0631 \u0645\u0648\u0631\u062F\u0627\u064B \u0645\u0646 \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0644\u0639\u0631\u0636 \u0643\u0634\u0641 \u062D\u0633\u0627\u0628\u0647\u060C \u0641\u0648\u0627\u062A\u064A\u0631\u0647\u060C \u0645\u062F\u0641\u0648\u0639\u0627\u062A\u0647\u060C \u0648\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621." }) })) : (_jsxs(Stack, { spacing: 2, children: [_jsxs(Paper, { elevation: 0, sx: { ...cardSx, px: 2, pt: 1 }, children: [_jsxs(Stack, { direction: { xs: 'column', sm: 'row' }, justifyContent: "space-between", alignItems: { sm: 'center' }, gap: 1, sx: { mb: 1 }, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "h6", fontWeight: 800, children: selectedVendor.name }), _jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["\u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u062D\u0627\u0644\u064A: ", _jsx("strong", { children: fmt(Number(selectedVendor.currentBalance ?? 0)) })] })] }), _jsxs(Stack, { direction: "row", spacing: 1, flexWrap: "wrap", useFlexGap: true, children: [_jsx(Button, { size: "small", variant: "outlined", onClick: () => setInvoiceOpen(true), children: "\u0641\u0627\u062A\u0648\u0631\u0629 \u064A\u062F\u0648\u064A\u0629" }), _jsx(Button, { size: "small", variant: "outlined", onClick: () => setAdjOpen(true), children: "\u062A\u0633\u0648\u064A\u0629" }), _jsx(Button, { size: "small", variant: "contained", onClick: () => openPayDialog(), children: "\u062A\u0633\u062C\u064A\u0644 \u062F\u0641\u0639\u0629" })] })] }), _jsxs(Tabs, { value: detailTab, onChange: (_, v) => setDetailTab(v), variant: "scrollable", scrollButtons: "auto", children: [_jsx(Tab, { label: "\u0643\u0634\u0641 \u062D\u0633\u0627\u0628" }), _jsx(Tab, { label: `فواتير (${vendorInvoices.length})` }), _jsx(Tab, { label: `مدفوعات (${vendorPayments.length})` }), _jsx(Tab, { label: `أوامر شراء (${vendorPOs.length})` })] })] }), detailTab === 0 ? (_jsxs(SectionCard, { title: "\u0643\u0634\u0641 \u0627\u0644\u062D\u0633\u0627\u0628", compact: true, children: [_jsxs(Stack, { direction: { xs: 'column', sm: 'row' }, spacing: 1.5, sx: { mb: 2 }, children: [_jsx(TextField, { label: "\u0645\u0646", type: "date", size: "small", value: fromDate, onChange: (e) => setFromDate(e.target.value), InputLabelProps: { shrink: true } }), _jsx(TextField, { label: "\u0625\u0644\u0649", type: "date", size: "small", value: toDate, onChange: (e) => setToDate(e.target.value), InputLabelProps: { shrink: true } })] }), statement?.summary ? (_jsxs(Grid2, { container: true, spacing: 1.5, sx: { mb: 2 }, children: [_jsx(Grid2, { size: { xs: 6, sm: 3 }, children: _jsx(MetricCard, { label: "\u0631\u0635\u064A\u062F \u0627\u0641\u062A\u062A\u0627\u062D\u064A", value: fmt(statement.summary.openingBalance) }) }), _jsx(Grid2, { size: { xs: 6, sm: 3 }, children: _jsx(MetricCard, { label: "\u0645\u0634\u062A\u0631\u064A\u0627\u062A", value: fmt(statement.summary.purchases) }) }), _jsx(Grid2, { size: { xs: 6, sm: 3 }, children: _jsx(MetricCard, { label: "\u0645\u062F\u0641\u0648\u0639\u0627\u062A", value: fmt(statement.summary.payments) }) }), _jsx(Grid2, { size: { xs: 6, sm: 3 }, children: _jsx(MetricCard, { label: "\u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u062D\u0627\u0644\u064A", value: fmt(statement.summary.closingBalance) }) })] })) : null, statementLoading ? (_jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u062C\u0627\u0631\u064A \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u062D\u0631\u0643\u0627\u062A\u2026" })) : (_jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u0627\u0644\u062A\u0627\u0631\u064A\u062E" }), _jsx(TableCell, { children: "\u0627\u0644\u0646\u0648\u0639" }), _jsx(TableCell, { children: "\u0645\u0631\u062C\u0639" }), _jsx(TableCell, { align: "left", children: "\u0645\u062F\u064A\u0646" }), _jsx(TableCell, { align: "left", children: "\u062F\u0627\u0626\u0646" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u0631\u0635\u064A\u062F" })] }) }), _jsx(TableBody, { children: (statement?.lines ?? []).map((line) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: new Date(line.date).toLocaleDateString('ar-EG') }), _jsx(TableCell, { children: ENTRY_LABELS[line.type] ?? line.type }), _jsx(TableCell, { children: line.reference ?? '—' }), _jsx(TableCell, { align: "left", children: line.debit > 0 ? fmt(line.debit) : '—' }), _jsx(TableCell, { align: "left", children: line.credit > 0 ? fmt(line.credit) : '—' }), _jsx(TableCell, { align: "left", sx: { fontWeight: 700 }, children: fmt(line.balanceAfter) })] }, line.id))) })] }))] })) : null, detailTab === 1 ? (_jsx(SectionCard, { title: "\u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0634\u0631\u0627\u0621", compact: true, children: !vendorInvoices.length ? (_jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0641\u0648\u0627\u062A\u064A\u0631. \u062A\u064F\u0646\u0634\u0623 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0639\u0646\u062F \u0627\u0633\u062A\u0644\u0627\u0645 \u0623\u0645\u0631 \u0634\u0631\u0627\u0621." })) : (_jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u0631\u0642\u0645 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629" }), _jsx(TableCell, { children: "\u0627\u0644\u062A\u0627\u0631\u064A\u062E" }), _jsx(TableCell, { children: "\u0627\u0644\u062D\u0627\u0644\u0629" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u0645\u062F\u0641\u0648\u0639" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u0645\u062A\u0628\u0642\u064A" }), _jsx(TableCell, {})] }) }), _jsx(TableBody, { children: vendorInvoices.map((inv) => {
                                                    const remaining = Number(inv.totalAmount) - Number(inv.paidAmount);
                                                    const st = INVOICE_STATUS[inv.status] ?? { label: inv.status, color: 'default' };
                                                    return (_jsxs(TableRow, { children: [_jsx(TableCell, { children: inv.invoiceNumber }), _jsx(TableCell, { children: new Date(inv.invoiceDate).toLocaleDateString('ar-EG') }), _jsx(TableCell, { children: _jsx(Chip, { size: "small", label: st.label, color: st.color, variant: "outlined" }) }), _jsx(TableCell, { align: "left", children: fmt(Number(inv.totalAmount)) }), _jsx(TableCell, { align: "left", children: fmt(Number(inv.paidAmount)) }), _jsx(TableCell, { align: "left", sx: { fontWeight: 700 }, children: remaining > 0.01 ? fmt(remaining) : '—' }), _jsx(TableCell, { align: "left", children: _jsxs(Stack, { direction: "row", spacing: 0.5, children: [remaining > 0.01 && inv.status !== 'VOIDED' ? (_jsx(Button, { size: "small", onClick: () => openPayDialog(inv.id, remaining), children: "\u0633\u062F\u0627\u062F" })) : null, Number(inv.paidAmount) <= 0 && inv.status !== 'VOIDED' && inv.status !== 'DRAFT' ? (_jsx(Button, { size: "small", color: "error", onClick: () => void voidInvoice(inv.id), children: "\u0625\u0644\u063A\u0627\u0621" })) : null] }) })] }, inv.id));
                                                }) })] })) })) : null, detailTab === 2 ? (_jsxs(SectionCard, { title: "\u0645\u062F\u0641\u0648\u0639\u0627\u062A \u0627\u0644\u0645\u0648\u0631\u062F", compact: true, children: [_jsxs(Alert, { severity: "success", sx: { mb: 2 }, children: ["\u0643\u0644 \u062F\u0641\u0639\u0629 \u0647\u0646\u0627 \u062A\u064F\u0633\u062C\u0651\u064E\u0644 \u0623\u064A\u0636\u0627\u064B \u0641\u064A ", _jsx("strong", { children: "\u062E\u0632\u064A\u0646\u0629 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A" }), " (TreasuryTransaction \u00B7 VENDOR_PAYMENT) \u2014 \u062A\u0638\u0647\u0631 \u0641\u064A \u0635\u0641\u062D\u0629 \u0627\u0644\u062E\u0632\u064A\u0646\u0629."] }), !vendorPayments.length ? (_jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u062F\u0641\u0648\u0639\u0627\u062A \u0628\u0639\u062F." })) : (_jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u0627\u0644\u062A\u0627\u0631\u064A\u062E" }), _jsx(TableCell, { children: "\u0627\u0644\u0645\u0628\u0644\u063A" }), _jsx(TableCell, { children: "\u0627\u0644\u0648\u0633\u064A\u0644\u0629" }), _jsx(TableCell, { children: "\u0641\u0627\u062A\u0648\u0631\u0629" }), _jsx(TableCell, { children: "\u0645\u0631\u062C\u0639" })] }) }), _jsx(TableBody, { children: vendorPayments.map((p) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: new Date(p.paidAt).toLocaleDateString('ar-EG') }), _jsx(TableCell, { align: "left", sx: { fontWeight: 700 }, children: fmt(Number(p.amount)) }), _jsx(TableCell, { children: p.paymentMethod?.name ?? p.paymentMethod?.type ?? '—' }), _jsx(TableCell, { children: p.vendorInvoice?.invoiceNumber ?? '—' }), _jsx(TableCell, { children: p.reference ?? '—' })] }, p.id))) })] }))] })) : null, detailTab === 3 ? (_jsxs(SectionCard, { title: "\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621", compact: true, children: [poMsg ? _jsx(Alert, { severity: poMsg.includes('فشل') ? 'error' : 'success', sx: { mb: 2 }, onClose: () => setPoMsg(''), children: poMsg }) : null, !vendorPOs.length ? (_jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0623\u0648\u0627\u0645\u0631 \u0634\u0631\u0627\u0621. \u0623\u0646\u0634\u0626 \u0623\u0645\u0631 \u0634\u0631\u0627\u0621 \u0645\u0646 \u0635\u0641\u062D\u0629 \u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u2192 \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A." })) : (_jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u0631\u0642\u0645 \u0627\u0644\u0623\u0645\u0631" }), _jsx(TableCell, { children: "\u0627\u0644\u062D\u0627\u0644\u0629" }), _jsx(TableCell, { align: "left", children: "\u0627\u0644\u0625\u062C\u0631\u0627\u0621" })] }) }), _jsx(TableBody, { children: vendorPOs.map((po) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: po.orderNumber }), _jsx(TableCell, { children: _jsx(Chip, { size: "small", label: PO_STATUS[po.status] ?? po.status }) }), _jsx(TableCell, { align: "left", children: po.status !== 'RECEIVED' && po.status !== 'CANCELLED' ? (_jsx(Button, { size: "small", variant: "outlined", onClick: () => void receivePO(po.id), children: "\u0627\u0633\u062A\u0644\u0627\u0645 \u2192 \u0641\u0627\u062A\u0648\u0631\u0629 AP" })) : (_jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u2014" })) })] }, po.id))) })] }))] })) : null] })) })] }), _jsxs(Dialog, { open: payOpen, onClose: () => setPayOpen(false), maxWidth: "sm", fullWidth: true, children: [_jsxs(DialogTitle, { children: ["\u062A\u0633\u062C\u064A\u0644 \u062F\u0641\u0639\u0629 \u2014 ", selectedVendor?.name] }), _jsx(DialogContent, { children: _jsxs(Stack, { spacing: 2, sx: { mt: 1 }, children: [_jsx(ExpensesTreasuryPanel, { treasury: apContext?.treasury, payAmount: payAmountNum, ...(selectedPayMethodType ? { payMethodType: selectedPayMethodType } : {}), compact: true }), payError ? _jsx(Alert, { severity: "error", children: payError }) : null, _jsx(TextField, { label: "\u0627\u0644\u0645\u0628\u0644\u063A", type: "number", size: "small", fullWidth: true, value: payAmount, onChange: (e) => setPayAmount(e.target.value) }), _jsx(TextField, { select: true, label: "\u0648\u0633\u064A\u0644\u0629 \u0627\u0644\u062F\u0641\u0639", size: "small", fullWidth: true, value: payMethodId, onChange: (e) => setPayMethodId(e.target.value), children: paymentMethods.map((pm) => {
                                        const avail = Number(apContext?.treasury?.walletBalances?.[pm.type]?.EXPENSES ?? 0);
                                        return (_jsxs(MenuItem, { value: pm.id, children: [pm.name ?? pm.type, " \u00B7 \u0645\u062A\u0627\u062D ", fmt(avail)] }, pm.id));
                                    }) }), _jsx(TextField, { select: true, label: "\u0635\u0646\u062F\u0648\u0642 / \u0646\u0642\u0637\u0629 \u0627\u0644\u062E\u0632\u064A\u0646\u0629", size: "small", fullWidth: true, value: payCashBoxId, onChange: (e) => setPayCashBoxId(e.target.value), children: cashBoxes.map((cb) => (_jsx(MenuItem, { value: cb.id, children: cb.name }, cb.id))) }), _jsxs(TextField, { select: true, label: "\u0631\u0628\u0637 \u0628\u0641\u0627\u062A\u0648\u0631\u0629 (\u0627\u062E\u062A\u064A\u0627\u0631\u064A)", size: "small", fullWidth: true, value: payInvoiceId, onChange: (e) => {
                                        const id = e.target.value;
                                        setPayInvoiceId(id);
                                        const inv = unpaidInvoices.find((i) => i.id === id);
                                        if (inv)
                                            setPayAmount(String(Number(inv.totalAmount) - Number(inv.paidAmount)));
                                    }, children: [_jsx(MenuItem, { value: "", children: "\u2014 \u0628\u062F\u0648\u0646 \u2014" }), unpaidInvoices.map((inv) => (_jsxs(MenuItem, { value: inv.id, children: [inv.invoiceNumber, " \u00B7 \u0645\u062A\u0628\u0642\u064A ", fmt(Number(inv.totalAmount) - Number(inv.paidAmount))] }, inv.id)))] }), _jsx(TextField, { label: "\u0645\u0631\u062C\u0639 / \u0645\u0644\u0627\u062D\u0638\u0629", size: "small", fullWidth: true, value: payReference, onChange: (e) => setPayReference(e.target.value) })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setPayOpen(false), children: "\u0625\u0644\u063A\u0627\u0621" }), _jsx(Button, { variant: "contained", disabled: payBusy || !payAmount || !payMethodId || payInsufficient, onClick: () => void submitPayment(), children: payBusy ? 'جاري الحفظ…' : payInsufficient ? 'رصيد غير كافٍ' : 'تسجيل الدفعة' })] })] }), _jsxs(Dialog, { open: invoiceOpen, onClose: () => setInvoiceOpen(false), maxWidth: "xs", fullWidth: true, children: [_jsxs(DialogTitle, { children: ["\u0641\u0627\u062A\u0648\u0631\u0629 \u064A\u062F\u0648\u064A\u0629 \u2014 ", selectedVendor?.name] }), _jsx(DialogContent, { children: _jsxs(Stack, { spacing: 2, sx: { mt: 1 }, children: [invError ? _jsx(Alert, { severity: "error", children: invError }) : null, _jsx(TextField, { label: "\u0627\u0644\u0648\u0635\u0641", size: "small", fullWidth: true, value: invDesc, onChange: (e) => setInvDesc(e.target.value) }), _jsx(TextField, { label: "\u0627\u0644\u0645\u0628\u0644\u063A", type: "number", size: "small", fullWidth: true, value: invAmount, onChange: (e) => setInvAmount(e.target.value) })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setInvoiceOpen(false), children: "\u0625\u0644\u063A\u0627\u0621" }), _jsx(Button, { variant: "contained", disabled: invBusy || !invDesc || !invAmount, onClick: () => void submitManualInvoice(), children: invBusy ? 'جاري الحفظ…' : 'حفظ وترحيل' })] })] }), _jsxs(Dialog, { open: adjOpen, onClose: () => setAdjOpen(false), maxWidth: "xs", fullWidth: true, children: [_jsxs(DialogTitle, { children: ["\u062A\u0633\u0648\u064A\u0629 \u062D\u0633\u0627\u0628 \u2014 ", selectedVendor?.name] }), _jsx(DialogContent, { children: _jsxs(Stack, { spacing: 2, sx: { mt: 1 }, children: [_jsx(Alert, { severity: "warning", children: "\u0627\u0644\u062A\u0633\u0648\u064A\u0629 \u062A\u0639\u062F\u0651\u0644 \u0631\u0635\u064A\u062F AP \u0641\u0642\u0637 \u2014 \u0628\u062F\u0648\u0646 \u062D\u0631\u0643\u0629 \u062E\u0632\u064A\u0646\u0629." }), adjError ? _jsx(Alert, { severity: "error", children: adjError }) : null, _jsx(TextField, { label: "\u0632\u064A\u0627\u062F\u0629 \u0645\u0633\u062A\u062D\u0642 (\u062F\u0627\u0626\u0646)", type: "number", size: "small", fullWidth: true, value: adjCredit, onChange: (e) => setAdjCredit(e.target.value), helperText: "\u064A\u0632\u064A\u062F \u0645\u0627 \u0646\u062F\u064A\u0646 \u0628\u0647 \u0644\u0644\u0645\u0648\u0631\u062F" }), _jsx(TextField, { label: "\u062A\u062E\u0641\u064A\u0636 \u0645\u0633\u062A\u062D\u0642 (\u0645\u062F\u064A\u0646)", type: "number", size: "small", fullWidth: true, value: adjDebit, onChange: (e) => setAdjDebit(e.target.value), helperText: "\u0625\u0634\u0639\u0627\u0631 \u062F\u0627\u0626\u0646 / \u062E\u0635\u0645" }), _jsx(TextField, { label: "\u0645\u0644\u0627\u062D\u0638\u0629", size: "small", fullWidth: true, value: adjNote, onChange: (e) => setAdjNote(e.target.value) })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setAdjOpen(false), children: "\u0625\u0644\u063A\u0627\u0621" }), _jsx(Button, { variant: "contained", disabled: adjBusy, onClick: () => void submitAdjustment(), children: adjBusy ? 'جاري الحفظ…' : 'تسجيل التسوية' })] })] }), _jsxs(Dialog, { open: vendorOpen, onClose: () => setVendorOpen(false), maxWidth: "xs", fullWidth: true, children: [_jsx(DialogTitle, { children: "\u0645\u0648\u0631\u062F \u062C\u062F\u064A\u062F" }), _jsx(DialogContent, { children: _jsxs(Stack, { spacing: 2, sx: { mt: 1 }, children: [vendorError ? _jsx(Alert, { severity: "error", children: vendorError }) : null, _jsx(TextField, { label: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0648\u0631\u062F", size: "small", fullWidth: true, required: true, value: vendorName, onChange: (e) => setVendorName(e.target.value) }), _jsx(TextField, { label: "\u0627\u0644\u0643\u0648\u062F", size: "small", fullWidth: true, value: vendorCode, onChange: (e) => setVendorCode(e.target.value), placeholder: "\u064A\u064F\u0648\u0644\u0651\u064E\u062F \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0625\u0646 \u062A\u064F\u0631\u0643 \u0641\u0627\u0631\u063A\u0627\u064B" }), _jsx(TextField, { label: "\u0627\u0644\u0647\u0627\u062A\u0641", size: "small", fullWidth: true, value: vendorPhone, onChange: (e) => setVendorPhone(e.target.value) }), _jsx(TextField, { label: "\u0631\u0635\u064A\u062F \u0627\u0641\u062A\u062A\u0627\u062D\u064A (\u0627\u062E\u062A\u064A\u0627\u0631\u064A)", type: "number", size: "small", fullWidth: true, value: vendorOpening, onChange: (e) => setVendorOpening(e.target.value), helperText: "\u0645\u0628\u0644\u063A \u0645\u0633\u062A\u062D\u0642 \u0644\u0644\u0645\u0648\u0631\u062F \u0642\u0628\u0644 \u0628\u062F\u0621 \u0627\u0644\u0646\u0638\u0627\u0645" })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setVendorOpen(false), children: "\u0625\u0644\u063A\u0627\u0621" }), _jsx(Button, { variant: "contained", disabled: vendorBusy || !vendorName.trim(), onClick: () => void submitVendor(), children: vendorBusy ? 'جاري الحفظ…' : 'إضافة' })] })] })] }));
}
