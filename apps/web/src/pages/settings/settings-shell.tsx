import {
  Box,
  Button,
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
import { cardSx, sidebarSx, ui } from '../../lib/ui-tokens.js';

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
    <Paper elevation={0} sx={{ ...sidebarSx, p: 2, height: '100%', minHeight: { xs: 'auto', md: 'calc(100vh - 48px)' } }}>
      <Stack spacing={2.5} sx={{ height: '100%' }}>
        <Stack spacing={0.25}>
          <Typography variant="overline">NIHA</Typography>
          <Typography variant="h6">الإعدادات</Typography>
          <Typography variant="body2">تخصيص الفاتورة والطباعة وإدارة النظام.</Typography>
        </Stack>

        <List disablePadding sx={{ display: 'grid', gap: 0.25, flex: 1 }}>
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
                  py: 1,
                  borderRadius: `${ui.radiusSm}px`,
                  bgcolor: active ? ui.sidebarActive : 'transparent',
                  '&:hover': {
                    bgcolor: active ? ui.sidebarActive : ui.sidebarHover,
                  },
                }}
              >
                <ListItemText
                  primary={item.label}
                  secondary={item.hint}
                  primaryTypographyProps={{
                    fontWeight: active ? 700 : 500,
                    fontSize: '0.9375rem',
                    color: active ? ui.sidebarActiveText : ui.muted,
                  }}
                  secondaryTypographyProps={{ fontSize: '0.75rem' }}
                />
              </ListItemButton>
            );
          })}
        </List>

        <Divider />

        <Stack spacing={1}>
          <Button variant="contained" fullWidth size="small" onClick={() => { navigate('/pos'); onNavigate?.(); }}>
            العودة لنقطة البيع
          </Button>
          {user ? (
            <Button variant="outlined" fullWidth size="small" onClick={() => { logout(); navigate('/login'); }}>
              خروج
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
    <Box sx={{ minHeight: '100vh', py: { xs: 2, md: 2.5 }, bgcolor: ui.bg }}>
      <Container maxWidth="xl">
        <Stack spacing={2}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ pb: 1, borderBottom: `1px solid ${ui.border}` }}
          >
            <Typography variant="h5">{pageTitle}</Typography>
            {!isDesktop ? (
              <IconButton size="small" onClick={() => setDrawerOpen(true)} aria-label="القائمة">
                <Typography variant="body2" fontWeight={600}>☰</Typography>
              </IconButton>
            ) : null}
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', md: '260px minmax(0, 1fr)' },
              alignItems: 'start',
            }}
          >
            {isDesktop ? <SettingsSidebar /> : null}
            <Paper elevation={0} sx={{ ...cardSx, p: { xs: 2, md: 2.5 } }}>
              <Outlet />
            </Paper>
          </Box>
        </Stack>
      </Container>

      <Drawer anchor="right" open={!isDesktop && drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 280, p: 2, bgcolor: ui.ivory }}>
          <SettingsSidebar onNavigate={() => setDrawerOpen(false)} />
        </Box>
      </Drawer>
    </Box>
  );
}
