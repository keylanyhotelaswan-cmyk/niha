import {
  Avatar,
  Box,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Button,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './lib/auth-context.js';
import { sidebarSx, ui } from './lib/ui-tokens.js';

const navigation = [
  { label: 'نقطة البيع', path: '/pos', permission: 'pos.use' },
  { label: 'العملاء', path: '/customers', permissionAny: ['customers.read', 'treasury.manage', 'pos.use'] as const },
  { label: 'الخزنة والورديات', path: '/shifts', permission: 'treasury.manage' },
  { label: 'الإعدادات', path: '/settings', matchPrefix: true, permissionAny: ['treasury.manage', 'users.manage'] as const },
  { label: 'المستخدمين', path: '/settings/users', permission: 'users.manage' },
  { label: 'الكتالوج', path: '/catalog', permission: 'inventory.manage' },
  { label: 'المخزون', path: '/inventory', permission: 'inventory.manage' },
  { label: 'حسابات الموردين', path: '/vendor-accounts', permissionAny: ['vendor_accounts.view', 'vendor_accounts.manage', 'inventory.manage'] as const },
  { label: 'التأسيس', path: '/setup-costs', permission: 'setup_costs.manage' },
  { label: 'التقارير', path: '/reports', permission: 'reports.view' },
];

function ShellSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, permissions } = useAuth();

  return (
    <Paper elevation={0} sx={{ ...sidebarSx, p: 2, height: '100%' }}>
      <Stack spacing={2.5}>
        <Stack spacing={0.25}>
          <Typography variant="overline">NIHA</Typography>
          <Typography variant="h6">تشغيل المطعم</Typography>
        </Stack>

        <List disablePadding sx={{ display: 'grid', gap: 0.25 }}>
          {navigation
            .filter((item) => {
              const granted = permissions?.map((p: any) => p.code) ?? [];
              const anyOf = (item as { permissionAny?: readonly string[] }).permissionAny;
              if (anyOf?.length) return anyOf.some((c) => granted.includes(c));
              if (!item.permission) return true;
              return granted.includes(item.permission);
            })
            .map((item) => {
              const active = (item as { matchPrefix?: boolean }).matchPrefix
                ? item.path === '/settings'
                  ? location.pathname === '/settings' || location.pathname.startsWith('/settings/receipt')
                  : location.pathname.startsWith(item.path)
                : location.pathname === item.path;

              return (
                <ListItemButton
                  key={item.path}
                  component={NavLink}
                  to={item.path}
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
                    primaryTypographyProps={{
                      fontWeight: active ? 700 : 500,
                      fontSize: '0.9375rem',
                      color: active ? ui.sidebarActiveText : ui.muted,
                    }}
                  />
                </ListItemButton>
              );
            })}
        </List>

        <Divider />

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ bgcolor: ui.primary, width: 32, height: 32, fontSize: 13 }}>N</Avatar>
          <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1 }}>
            {isAuthenticated && user ? user.fullName : 'Niha'}
          </Typography>
        </Stack>

        {isAuthenticated && user ? (
          <Button
            variant="contained"
            color="error"
            fullWidth
            size="small"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            sx={{ borderRadius: `${ui.radiusPill}px` }}
          >
            خروج
          </Button>
        ) : (
          <Button variant="contained" fullWidth size="small" onClick={() => { navigate('/login'); onNavigate?.(); }}>
            دخول
          </Button>
        )}
      </Stack>
    </Paper>
  );
}

export function AppShell() {
  const isDesktop = useMediaQuery('(min-width:1200px)');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();

  const pageTitle = useMemo(() => {
    if (location.pathname.startsWith('/settings/theme')) return 'دليل الألوان والثيم';
    if (location.pathname.startsWith('/settings/receipt')) return 'الفاتورة والطباعة';
    if (location.pathname.startsWith('/settings/users')) return 'المستخدمين';
    if (location.pathname.startsWith('/settings')) return 'الإعدادات';
    if (location.pathname.startsWith('/shifts')) return 'الخزنة والورديات';
    if (location.pathname.startsWith('/customers')) return 'العملاء';
    if (location.pathname.startsWith('/inventory')) return 'المخزون';
    if (location.pathname.startsWith('/vendor-accounts')) return 'حسابات الموردين';
    if (location.pathname.startsWith('/reports')) return 'التقارير';
    return navigation.find((item) => item.path === location.pathname)?.label ?? 'نقطة البيع';
  }, [location.pathname]);

  return (
    <Box sx={{ minHeight: '100vh', py: { xs: 2, md: 2.5 } }}>
      <Container maxWidth="xl">
        <Stack spacing={2}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ pb: 1 }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              {!isDesktop ? (
                <IconButton size="small" onClick={() => setDrawerOpen(true)} aria-label="القائمة" sx={{ color: ui.ink }}>
                  <Typography variant="body2" fontWeight={600}>☰</Typography>
                </IconButton>
              ) : null}
              <Typography variant="h5">{pageTitle}</Typography>
            </Stack>

            {isAuthenticated && user ? (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
                  {user.fullName}
                </Typography>
                <Button variant="contained" color="error" size="small" onClick={() => { logout(); navigate('/login'); }}>
                  خروج
                </Button>
              </Stack>
            ) : (
              <Button variant="contained" size="small" onClick={() => navigate('/login')}>
                دخول
              </Button>
            )}
          </Stack>

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', xl: '220px minmax(0, 1fr)' } }}>
            {isDesktop ? <ShellSidebar /> : null}
            <Box>
              <Outlet />
            </Box>
          </Box>
        </Stack>
      </Container>

      <Drawer anchor="right" open={!isDesktop && drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 260, p: 2, bgcolor: ui.ivory }}>
          <ShellSidebar onNavigate={() => setDrawerOpen(false)} />
        </Box>
      </Drawer>
    </Box>
  );
}
