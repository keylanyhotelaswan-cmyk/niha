import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context.js';

const settingsNav = [
  { label: 'نظرة عامة', path: '/settings', hint: 'ملخص الإعدادات', end: true },
  { label: 'الفاتورة والطباعة', path: '/settings/receipt', hint: 'الشكل، الهوامش، الخط، الطابعة' },
  { label: 'المستخدمين', path: '/settings/users', hint: 'الحسابات والصلاحيات', permission: 'users.manage' },
];

function SettingsSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { permissions, user, logout } = useAuth();
  const granted = permissions?.map((p: { code: string }) => p.code) ?? [];

  const visibleNav = settingsNav.filter(
    (item) => !item.permission || granted.includes(item.permission),
  );

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 4,
        border: '1px solid rgba(185, 56, 23, 0.14)',
        background: 'linear-gradient(180deg, rgba(255,248,239,0.98), rgba(250,239,226,0.98))',
        height: '100%',
        minHeight: { xs: 'auto', md: 'calc(100vh - 48px)' },
      }}
    >
      <Stack spacing={2.5} sx={{ height: '100%' }}>
        <Stack spacing={1}>
          <Chip label="Niha Settings" color="primary" sx={{ alignSelf: 'flex-start', fontWeight: 700 }} />
          <Typography variant="h5" fontWeight={800}>
            الإعدادات
          </Typography>
          <Typography variant="body2" color="text.secondary" lineHeight={1.7}>
            صفحة مستقلة لتخصيص الفاتورة والطباعة وإدارة النظام.
          </Typography>
        </Stack>

        <List disablePadding sx={{ display: 'grid', gap: 1, flex: 1 }}>
          {visibleNav.map((item) => {
            const active = item.end
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            return (
              <ListItemButton
                key={item.path}
                component={NavLink}
                to={item.path}
                {...(item.end !== undefined ? { end: item.end } : {})}
                onClick={onNavigate}
                sx={{
                  px: 1.5,
                  py: 1.25,
                  borderRadius: 3,
                  border: active ? '1px solid rgba(185, 56, 23, 0.35)' : '1px solid rgba(117, 89, 77, 0.12)',
                  bgcolor: active ? 'rgba(185, 56, 23, 0.10)' : 'rgba(255,250,244,0.82)',
                }}
              >
                <ListItemText
                  primary={item.label}
                  secondary={item.hint}
                  primaryTypographyProps={{ fontWeight: 800 }}
                />
              </ListItemButton>
            );
          })}
        </List>

        <Divider />

        <Stack spacing={1}>
          <Button variant="contained" fullWidth onClick={() => { navigate('/pos'); onNavigate?.(); }}>
            ← العودة لنقطة البيع
          </Button>
          {user ? (
            <Button variant="outlined" fullWidth onClick={() => { logout(); navigate('/login'); }}>
              خروج ({user.fullName})
            </Button>
          ) : null}
        </Stack>
      </Stack>
    </Paper>
  );
}

export function SettingsShell() {
  const isDesktop = useMediaQuery('(min-width: 960px)');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  const pageTitle = useMemo(() => {
    if (location.pathname.startsWith('/settings/receipt')) return 'الفاتورة والطباعة';
    if (location.pathname.startsWith('/settings/users')) return 'المستخدمين';
    return 'نظرة عامة';
  }, [location.pathname]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        py: { xs: 2, md: 3 },
        background: 'linear-gradient(180deg, #fff8ef 0%, #faf3ea 100%)',
      }}
    >
      <Container maxWidth="xl">
        <Stack spacing={2}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, md: 2.5 },
              borderRadius: 4,
              color: '#fff7ed',
              background: 'linear-gradient(135deg, #2f1f18 0%, #5c2b18 40%, #b93817 100%)',
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              <Stack spacing={0.5}>
                <Typography variant="overline" sx={{ opacity: 0.85 }}>
                  Niha · الإعدادات
                </Typography>
                <Typography variant="h4" fontWeight={800}>
                  {pageTitle}
                </Typography>
              </Stack>
              {!isDesktop ? (
                <IconButton onClick={() => setDrawerOpen(true)} sx={{ color: '#fff7ed' }}>
                  <Typography fontWeight={800}>القائمة</Typography>
                </IconButton>
              ) : null}
            </Stack>
          </Paper>

          <Box
            sx={{
              display: 'grid',
              gap: 2.5,
              gridTemplateColumns: { xs: '1fr', md: '280px minmax(0, 1fr)' },
              alignItems: 'start',
            }}
          >
            {isDesktop ? <SettingsSidebar /> : null}
            <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4, border: '1px solid rgba(185,56,23,0.10)' }}>
              <Outlet />
            </Paper>
          </Box>
        </Stack>
      </Container>

      <Drawer anchor="right" open={!isDesktop && drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 300, p: 2 }}>
          <SettingsSidebar onNavigate={() => setDrawerOpen(false)} />
        </Box>
      </Drawer>
    </Box>
  );
}
