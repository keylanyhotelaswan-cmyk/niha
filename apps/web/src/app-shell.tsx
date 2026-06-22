import {
  Avatar,
  Box,
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
  Button,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './lib/auth-context.js';

const navigation = [
  { label: 'نقطة البيع', path: '/pos', hint: 'البيع والطلبات المعلقة', permission: 'pos.use' },
  { label: 'العملاء', path: '/customers', hint: 'سجل الزبائن والعملاء الدائمين', permissionAny: ['customers.read', 'treasury.manage', 'pos.use'] as const },
  { label: 'الخزنة والورديات', path: '/shifts', hint: 'العهدة والتحصيل والاعتماد', permission: 'treasury.manage' },
  { label: 'الإعدادات', path: '/settings', hint: 'الفاتورة، الطباعة، والنظام', matchPrefix: true, permissionAny: ['treasury.manage', 'users.manage'] as const },
  { label: 'إدارة المستخدمين', path: '/settings/users', hint: 'أدرّ مستخدمي النظام', permission: 'users.manage' },
  { label: 'الكتالوج', path: '/catalog', hint: 'الفئات والمنتجات والأسعار', permission: 'inventory.manage' },
  { label: 'المخزون والوصفات', path: '/inventory', hint: 'الخامات والحركة والتكلفة والوصفات', permission: 'inventory.manage' },
  { label: 'مصروفات التأسيس', path: '/setup-costs', hint: 'المدفوعات والالتزامات', permission: 'setup_costs.manage' },
  { label: 'التقارير', path: '/reports', hint: 'المراجعة التشغيلية والمالية', permission: 'reports.view' },
];

function ShellSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, permissions } = useAuth();

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 6,
        border: '1px solid rgba(185, 56, 23, 0.10)',
        background: 'linear-gradient(180deg, rgba(255,248,239,0.98), rgba(250,239,226,0.98))',
        height: '100%',
        boxShadow: '0 18px 42px rgba(47, 31, 24, 0.08)',
      }}
    >
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Chip label="Niha Kitchen Ops" color="primary" sx={{ alignSelf: 'flex-start', fontWeight: 700 }} />
          <Typography variant="h5" fontWeight={800} lineHeight={1.15}>
            تشغيل المطعم
          </Typography>
          <Typography variant="body2" color="text.secondary" lineHeight={1.8}>
            وصول سريع إلى البيع، الخزنة، المخزون، والتقارير.
          </Typography>
        </Stack>

        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 4,
            background: 'linear-gradient(135deg, rgba(185,56,23,0.14), rgba(217,119,6,0.16), rgba(47,31,24,0.08))',
            border: '1px solid rgba(185, 56, 23, 0.10)',
          }}
        >
          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">
              اليوم
            </Typography>
            <Typography variant="h6" fontWeight={800}>
              فرع واحد نشط مع تشغيل مباشر للكاشير والخزنة.
            </Typography>
          </Stack>
        </Paper>

        <Box>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
            الوحدات الرئيسية
          </Typography>
          <List disablePadding sx={{ display: 'grid', gap: 1 }}>
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
                      py: 1.25,
                      borderRadius: 3,
                      border: active ? '1px solid rgba(185, 56, 23, 0.24)' : '1px solid rgba(117, 89, 77, 0.12)',
                      backgroundColor: active ? 'rgba(185, 56, 23, 0.08)' : 'rgba(255,250,244,0.82)',
                    }}
                  >
                    <ListItemText
                      primary={item.label}
                      secondary={item.hint}
                      primaryTypographyProps={{ fontWeight: 700 }}
                    />
                  </ListItemButton>
                );
              })}
          </List>
        </Box>

        <Divider flexItem />

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ bgcolor: '#b93817', width: 42, height: 42 }}>N</Avatar>
          <Box>
            <Typography fontWeight={800}>Niha Kitchen</Typography>
            <Typography variant="body2" color="text.secondary">
              متابعة الكاشير، الطلبات، الحركة، والمطبخ من نفس الواجهة.
            </Typography>
          </Box>
        </Stack>
        <Box sx={{ mt: 2 }}>
          {isAuthenticated && user ? (
            <Button variant="outlined" fullWidth onClick={() => { logout(); navigate('/login'); }}>
              خروج ({user.fullName})
            </Button>
          ) : (
            <Button variant="contained" fullWidth onClick={() => { navigate('/login'); onNavigate?.(); }}>
              تسجيل الدخول
            </Button>
          )}
        </Box>
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
    if (location.pathname.startsWith('/settings/receipt')) return 'الفاتورة والطباعة';
    if (location.pathname.startsWith('/settings/users')) return 'إدارة المستخدمين';
    if (location.pathname.startsWith('/settings')) return 'الإعدادات';
    if (location.pathname.startsWith('/shifts')) return 'الخزنة والورديات';
    if (location.pathname.startsWith('/customers')) return 'العملاء';
    return navigation.find((item) => item.path === location.pathname)?.label ?? 'نقطة البيع';
  }, [location.pathname]);

  return (
    <Box sx={{ minHeight: '100vh', py: { xs: 2, md: 3 } }}>
      <Container maxWidth="xl">
        <Stack spacing={2.5}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, md: 2.5 },
              borderRadius: 6,
              color: '#fff7ed',
              position: 'relative',
              overflow: 'hidden',
              background:
                'linear-gradient(135deg, rgba(47,31,24,0.98) 0%, rgba(92,43,24,0.98) 35%, rgba(185,56,23,1) 70%, rgba(217,119,6,0.96) 100%)',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                opacity: 0.55,
                background:
                  'radial-gradient(circle at 12% 18%, rgba(255,255,255,0.16), transparent 18%), radial-gradient(circle at 86% 20%, rgba(255,255,255,0.12), transparent 20%), linear-gradient(120deg, transparent 0%, transparent 60%, rgba(255,255,255,0.08) 60%, rgba(255,255,255,0.08) 66%, transparent 66%)',
              }}
            />
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} alignItems={{ md: 'center' }}>
              <Stack spacing={1} sx={{ position: 'relative' }}>
                <Chip
                  label="Workspace"
                  sx={{ alignSelf: 'flex-start', bgcolor: 'rgba(255,247,237,0.14)', color: '#fff7ed' }}
                />
                <Typography variant="h4" fontWeight={800}>
                  {pageTitle}
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255,247,237,0.82)', maxWidth: 760 }}>
                  شاشة تشغيل عملية بدون عناصر زائدة.
                </Typography>
              </Stack>

              <Stack direction="row" spacing={2} alignItems="center">
                {!isDesktop ? (
                  <IconButton onClick={() => setDrawerOpen(true)} sx={{ color: 'common.white', alignSelf: 'flex-start' }}>
                    <Typography variant="body2" fontWeight={800}>
                      القائمة
                    </Typography>
                  </IconButton>
                ) : null}

                <Stack direction="row" spacing={1} alignItems="center">
                  {isAuthenticated && user ? (
                    <>
                      <Typography variant="body2" sx={{ color: 'rgba(255,247,237,0.92)' }}>
                        {user.fullName}
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{ color: 'rgba(255,247,237,0.92)', borderColor: 'rgba(255,247,237,0.18)' }}
                        onClick={() => {
                          logout();
                          navigate('/login');
                        }}
                      >
                        خروج
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="contained"
                      size="small"
                      color="secondary"
                      onClick={() => navigate('/login')}
                    >
                      تسجيل الدخول
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Stack>
          </Paper>

          <Box sx={{ display: 'grid', gap: 20, gridTemplateColumns: { xs: '1fr', xl: '320px minmax(0, 1fr)' } }}>
            {isDesktop ? <ShellSidebar /> : null}
            <Box>
              <Outlet />
            </Box>
          </Box>
        </Stack>
      </Container>

      <Drawer anchor="right" open={!isDesktop && drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 320, p: 2 }}>
          <ShellSidebar onNavigate={() => setDrawerOpen(false)} />
        </Box>
      </Drawer>

      {/* Floating action: visible login/logout for quick access */}
      <Box sx={{ position: 'fixed', top: 16, right: 16, zIndex: 1400 }}>
        {isAuthenticated && user ? (
          <Button
            variant="contained"
            color="secondary"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            خروج
          </Button>
        ) : (
          <Button variant="contained" color="primary" onClick={() => navigate('/login')}>
            تسجيل الدخول
          </Button>
        )}
      </Box>
    </Box>
  );
}