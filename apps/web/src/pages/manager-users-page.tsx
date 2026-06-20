import { Button, Paper, Stack, TextField, Typography, Table, TableBody, TableCell, TableHead, TableRow, Alert, FormControl, InputLabel, Select, MenuItem, FormHelperText, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar } from '@mui/material';
import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth-context.js';
import { apiListUsers, apiCreateUser, apiDeleteUser, apiListRoles, apiUpdateUser } from '../lib/api.js';

export function ManagerUsersPage() {
  const { accessToken, user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [snackOpen, setSnackOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<{ open: boolean; title?: string; text?: string; onConfirm?: () => void }>({ open: false });
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editSelectedRoles, setEditSelectedRoles] = useState<string[]>([]);

  const load = async () => {
    if (!accessToken) return;
    const res = await apiListUsers((user as any)?.organizationId ?? '', accessToken);
    if (res.ok) setUsers((res.data as any[]) ?? []);
    const r = await apiListRoles(accessToken);
    if (r.ok) setRolesList((r.data as any[]) ?? []);
  };

  useEffect(() => {
    load();
  }, [accessToken]);

  const create = async () => {
    setMessage('');
    if (!accessToken) return setMessage('يجب تسجيل الدخول');
    const res = await apiCreateUser({ organizationId: (user as any)?.organizationId ?? '', fullName, username, password, roleCodes: selectedRoles }, accessToken);
    if (!res.ok) return setMessage('فشل إنشاء المستخدم: ' + (res.body ?? res.error));
    setFullName('');
    setUsername('');
    setPassword('');
    setSelectedRoles([]);
    await load();
    setMessage('تم إنشاء المستخدم.');
    setSnackOpen(true);
  };

  const remove = async (id: string) => {
    if (!accessToken) return setMessage('يجب تسجيل الدخول');
    const res = await apiDeleteUser(id, accessToken);
    if (!res.ok) return setMessage('فشل الحذف');
    await load();
    setMessage('تم حذف المستخدم.');
    setSnackOpen(true);
  };

  const openEdit = (u: any) => {
    setEditingUser(u);
    setEditFullName(u.fullName ?? '');
    setEditUsername(u.username ?? '');
    setEditPassword('');
    setEditSelectedRoles((u.roles || []).map((r: any) => r.code));
  };

  const closeEdit = () => {
    setEditingUser(null);
    setEditFullName('');
    setEditUsername('');
    setEditPassword('');
    setEditSelectedRoles([]);
  };

  const saveEdit = async () => {
    if (!accessToken || !editingUser) return setMessage('يجب تسجيل الدخول');
    const dto: any = { fullName: editFullName, username: editUsername, roleCodes: editSelectedRoles };
    if (editPassword) dto.password = editPassword;
    const res = await apiUpdateUser(editingUser.id, dto, accessToken);
    if (!res.ok) return setMessage('فشل التحديث: ' + (res.body ?? res.error));
    await load();
    closeEdit();
    setMessage('تم تحديث المستخدم.');
    setSnackOpen(true);
  };

  return (
    <Stack spacing={2.5}>
      <Paper sx={{ p: 2 }}> 
        <Typography variant="h6" fontWeight={800}>إدارة المستخدمين</Typography>
        <Typography variant="body2" color="text.secondary">أضف أو احذف مستخدمين للمنظمة الحالية.</Typography>
      </Paper>

      {message ? <Alert severity="info">{message}</Alert> : null}
      <Snackbar open={snackOpen} autoHideDuration={3000} onClose={() => setSnackOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackOpen(false)} severity="success" sx={{ width: '100%' }}>
          {message}
        </Alert>
      </Snackbar>

      <Paper sx={{ p: 2 }}>
        <Stack spacing={1}>
          <TextField label="الاسم الكامل" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <TextField label="اسم المستخدم" value={username} onChange={(e) => setUsername(e.target.value)} />
          <TextField label="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} />
          <FormControl>
            <InputLabel id="roles-label">الأدوار</InputLabel>
            <Select
              labelId="roles-label"
              multiple
              value={selectedRoles}
              label="الأدوار"
              onChange={(e) => {
                const v = (e.target as any).value;
                setSelectedRoles(typeof v === 'string' ? v.split(',') : (v as string[]));
              }}
              renderValue={(selected) => (selected as string[]).map((code) => {
                const r = rolesList.find((x) => x.code === code);
                return r ? r.name : code;
              }).join(', ')}
            >
              {rolesList.map((r) => (
                <MenuItem key={r.id} value={r.code}>
                  {r.name}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>اختر دوراً واحداً أو أكثر</FormHelperText>
          </FormControl>
          <Button variant="contained" onClick={create}>إضافة مستخدم</Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={700}>قائمة المستخدمين</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
                <TableCell>الاسم</TableCell>
                <TableCell>اسم المستخدم</TableCell>
                <TableCell>الأدوار</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>الإجراءات</TableCell>
              </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell>{u.fullName}</TableCell>
                <TableCell>{u.username}</TableCell>
                <TableCell>{(u.roles || []).map((r: any) => r.name ?? r.label ?? r.code).join(', ')}</TableCell>
                <TableCell>{u.status}</TableCell>
                <TableCell>
                  <Button size="small" onClick={() => openEdit(u)}>تعديل</Button>
                  <Button size="small" color="error" onClick={() => setConfirmState({ open: true, title: 'حذف المستخدم', text: `هل تريد حذف المستخدم ${u.fullName ?? u.username}?`, onConfirm: () => remove(u.id) })}>حذف</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <Dialog open={confirmState.open} onClose={() => setConfirmState({ open: false })}>
        <DialogTitle>{confirmState.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmState.text}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmState({ open: false })}>إلغاء</Button>
          <Button color="error" onClick={() => { confirmState.onConfirm?.(); setConfirmState({ open: false }); }}>حذف</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={!!editingUser} onClose={closeEdit} fullWidth maxWidth="sm">
        <DialogTitle>تعديل مستخدم</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ mt: 1 }}>
            <TextField label="الاسم الكامل" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
            <TextField label="اسم المستخدم" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
            <TextField label="كلمة المرور (اتركه فارغاً إن لم تتغير)" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} />
            <FormControl>
              <InputLabel id="edit-roles-label">الأدوار</InputLabel>
              <Select
                labelId="edit-roles-label"
                multiple
                value={editSelectedRoles}
                label="الأدوار"
                onChange={(e) => {
                  const v = (e.target as any).value;
                  setEditSelectedRoles(typeof v === 'string' ? v.split(',') : (v as string[]));
                }}
                renderValue={(selected) => (selected as string[]).map((code) => {
                  const r = rolesList.find((x) => x.code === code);
                  return r ? r.name : code;
                }).join(', ')}
              >
                {rolesList.map((r) => (
                  <MenuItem key={r.id} value={r.code}>
                    {r.name}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>اختر دوراً واحداً أو أكثر</FormHelperText>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEdit}>إلغاء</Button>
          <Button variant="contained" onClick={saveEdit}>حفظ</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
