import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, Paper, Stack, TextField, Typography, Table, TableBody, TableCell, TableHead, TableRow, Alert, FormControl, InputLabel, Select, MenuItem, FormHelperText, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar } from '@mui/material';
import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth-context.js';
import { apiListUsers, apiCreateUser, apiDeleteUser, apiListRoles, apiUpdateUser } from '../lib/api.js';
export function ManagerUsersPage() {
    const { accessToken, user } = useAuth();
    const [users, setUsers] = useState([]);
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rolesList, setRolesList] = useState([]);
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [message, setMessage] = useState('');
    const [snackOpen, setSnackOpen] = useState(false);
    const [confirmState, setConfirmState] = useState({ open: false });
    const [editingUser, setEditingUser] = useState(null);
    const [editFullName, setEditFullName] = useState('');
    const [editUsername, setEditUsername] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editSelectedRoles, setEditSelectedRoles] = useState([]);
    const load = async () => {
        if (!accessToken)
            return;
        const res = await apiListUsers(user?.organizationId ?? '', accessToken);
        if (res.ok)
            setUsers(res.data ?? []);
        const r = await apiListRoles(accessToken);
        if (r.ok)
            setRolesList(r.data ?? []);
    };
    useEffect(() => {
        load();
    }, [accessToken]);
    const create = async () => {
        setMessage('');
        if (!accessToken)
            return setMessage('يجب تسجيل الدخول');
        const res = await apiCreateUser({ organizationId: user?.organizationId ?? '', fullName, username, password, roleCodes: selectedRoles }, accessToken);
        if (!res.ok)
            return setMessage('فشل إنشاء المستخدم: ' + (res.body ?? res.error));
        setFullName('');
        setUsername('');
        setPassword('');
        setSelectedRoles([]);
        await load();
        setMessage('تم إنشاء المستخدم.');
        setSnackOpen(true);
    };
    const remove = async (id) => {
        if (!accessToken)
            return setMessage('يجب تسجيل الدخول');
        const res = await apiDeleteUser(id, accessToken);
        if (!res.ok)
            return setMessage('فشل الحذف');
        await load();
        setMessage('تم حذف المستخدم.');
        setSnackOpen(true);
    };
    const openEdit = (u) => {
        setEditingUser(u);
        setEditFullName(u.fullName ?? '');
        setEditUsername(u.username ?? '');
        setEditPassword('');
        setEditSelectedRoles((u.roles || []).map((r) => r.code));
    };
    const closeEdit = () => {
        setEditingUser(null);
        setEditFullName('');
        setEditUsername('');
        setEditPassword('');
        setEditSelectedRoles([]);
    };
    const saveEdit = async () => {
        if (!accessToken || !editingUser)
            return setMessage('يجب تسجيل الدخول');
        const dto = { fullName: editFullName, username: editUsername, roleCodes: editSelectedRoles };
        if (editPassword)
            dto.password = editPassword;
        const res = await apiUpdateUser(editingUser.id, dto, accessToken);
        if (!res.ok)
            return setMessage('فشل التحديث: ' + (res.body ?? res.error));
        await load();
        closeEdit();
        setMessage('تم تحديث المستخدم.');
        setSnackOpen(true);
    };
    return (_jsxs(Stack, { spacing: 2.5, children: [_jsxs(Paper, { sx: { p: 2 }, children: [_jsx(Typography, { variant: "h6", fontWeight: 800, children: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646" }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: "\u0623\u0636\u0641 \u0623\u0648 \u0627\u062D\u0630\u0641 \u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646 \u0644\u0644\u0645\u0646\u0638\u0645\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629." })] }), message ? _jsx(Alert, { severity: "info", children: message }) : null, _jsx(Snackbar, { open: snackOpen, autoHideDuration: 3000, onClose: () => setSnackOpen(false), anchorOrigin: { vertical: 'bottom', horizontal: 'center' }, children: _jsx(Alert, { onClose: () => setSnackOpen(false), severity: "success", sx: { width: '100%' }, children: message }) }), _jsx(Paper, { sx: { p: 2 }, children: _jsxs(Stack, { spacing: 1, children: [_jsx(TextField, { label: "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644", value: fullName, onChange: (e) => setFullName(e.target.value) }), _jsx(TextField, { label: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645", value: username, onChange: (e) => setUsername(e.target.value) }), _jsx(TextField, { label: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631", value: password, onChange: (e) => setPassword(e.target.value) }), _jsxs(FormControl, { children: [_jsx(InputLabel, { id: "roles-label", children: "\u0627\u0644\u0623\u062F\u0648\u0627\u0631" }), _jsx(Select, { labelId: "roles-label", multiple: true, value: selectedRoles, label: "\u0627\u0644\u0623\u062F\u0648\u0627\u0631", onChange: (e) => {
                                        const v = e.target.value;
                                        setSelectedRoles(typeof v === 'string' ? v.split(',') : v);
                                    }, renderValue: (selected) => selected.map((code) => {
                                        const r = rolesList.find((x) => x.code === code);
                                        return r ? r.name : code;
                                    }).join(', '), children: rolesList.map((r) => (_jsx(MenuItem, { value: r.code, children: r.name }, r.id))) }), _jsx(FormHelperText, { children: "\u0627\u062E\u062A\u0631 \u062F\u0648\u0631\u0627\u064B \u0648\u0627\u062D\u062F\u0627\u064B \u0623\u0648 \u0623\u0643\u062B\u0631" })] }), _jsx(Button, { variant: "contained", onClick: create, children: "\u0625\u0636\u0627\u0641\u0629 \u0645\u0633\u062A\u062E\u062F\u0645" })] }) }), _jsxs(Paper, { sx: { p: 2 }, children: [_jsx(Typography, { variant: "subtitle1", fontWeight: 700, children: "\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646" }), _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "\u0627\u0644\u0627\u0633\u0645" }), _jsx(TableCell, { children: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645" }), _jsx(TableCell, { children: "\u0627\u0644\u0623\u062F\u0648\u0627\u0631" }), _jsx(TableCell, { children: "\u0627\u0644\u062D\u0627\u0644\u0629" }), _jsx(TableCell, { children: "\u0627\u0644\u0625\u062C\u0631\u0627\u0621\u0627\u062A" })] }) }), _jsx(TableBody, { children: users.map((u) => (_jsxs(TableRow, { hover: true, children: [_jsx(TableCell, { children: u.fullName }), _jsx(TableCell, { children: u.username }), _jsx(TableCell, { children: (u.roles || []).map((r) => r.name ?? r.label ?? r.code).join(', ') }), _jsx(TableCell, { children: u.status }), _jsxs(TableCell, { children: [_jsx(Button, { size: "small", onClick: () => openEdit(u), children: "\u062A\u0639\u062F\u064A\u0644" }), _jsx(Button, { size: "small", color: "error", onClick: () => setConfirmState({ open: true, title: 'حذف المستخدم', text: `هل تريد حذف المستخدم ${u.fullName ?? u.username}?`, onConfirm: () => remove(u.id) }), children: "\u062D\u0630\u0641" })] })] }, u.id))) })] })] }), _jsxs(Dialog, { open: confirmState.open, onClose: () => setConfirmState({ open: false }), children: [_jsx(DialogTitle, { children: confirmState.title }), _jsx(DialogContent, { children: _jsx(Typography, { children: confirmState.text }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setConfirmState({ open: false }), children: "\u0625\u0644\u063A\u0627\u0621" }), _jsx(Button, { color: "error", onClick: () => { confirmState.onConfirm?.(); setConfirmState({ open: false }); }, children: "\u062D\u0630\u0641" })] })] }), _jsxs(Dialog, { open: !!editingUser, onClose: closeEdit, fullWidth: true, maxWidth: "sm", children: [_jsx(DialogTitle, { children: "\u062A\u0639\u062F\u064A\u0644 \u0645\u0633\u062A\u062E\u062F\u0645" }), _jsx(DialogContent, { children: _jsxs(Stack, { spacing: 1, sx: { mt: 1 }, children: [_jsx(TextField, { label: "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644", value: editFullName, onChange: (e) => setEditFullName(e.target.value) }), _jsx(TextField, { label: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645", value: editUsername, onChange: (e) => setEditUsername(e.target.value) }), _jsx(TextField, { label: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 (\u0627\u062A\u0631\u0643\u0647 \u0641\u0627\u0631\u063A\u0627\u064B \u0625\u0646 \u0644\u0645 \u062A\u062A\u063A\u064A\u0631)", value: editPassword, onChange: (e) => setEditPassword(e.target.value) }), _jsxs(FormControl, { children: [_jsx(InputLabel, { id: "edit-roles-label", children: "\u0627\u0644\u0623\u062F\u0648\u0627\u0631" }), _jsx(Select, { labelId: "edit-roles-label", multiple: true, value: editSelectedRoles, label: "\u0627\u0644\u0623\u062F\u0648\u0627\u0631", onChange: (e) => {
                                                const v = e.target.value;
                                                setEditSelectedRoles(typeof v === 'string' ? v.split(',') : v);
                                            }, renderValue: (selected) => selected.map((code) => {
                                                const r = rolesList.find((x) => x.code === code);
                                                return r ? r.name : code;
                                            }).join(', '), children: rolesList.map((r) => (_jsx(MenuItem, { value: r.code, children: r.name }, r.id))) }), _jsx(FormHelperText, { children: "\u0627\u062E\u062A\u0631 \u062F\u0648\u0631\u0627\u064B \u0648\u0627\u062D\u062F\u0627\u064B \u0623\u0648 \u0623\u0643\u062B\u0631" })] })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: closeEdit, children: "\u0625\u0644\u063A\u0627\u0621" }), _jsx(Button, { variant: "contained", onClick: saveEdit, children: "\u062D\u0641\u0638" })] })] })] }));
}
