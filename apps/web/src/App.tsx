import { Suspense, lazy } from 'react';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AppShell } from './app-shell.js';
import { useAuth } from './lib/auth-context.js';
import { HomeRedirect, PermissionRoute, RouteFallback } from './lib/route-guards.js';

const PosPage = lazy(() => import('./pages/pos-page.js').then((module) => ({ default: module.PosPage })));
const TreasuryWorkspacePage = lazy(() => import('./pages/treasury-workspace/treasury-workspace-page.js').then((module) => ({ default: module.TreasuryWorkspacePage })));
const ManagerUsersPage = lazy(() => import('./pages/manager-users-page.js').then((module) => ({ default: module.ManagerUsersPage })));
const ReceiptSettingsPage = lazy(() => import('./pages/receipt-settings-page.js').then((module) => ({ default: module.ReceiptSettingsPage })));
const SettingsHubPage = lazy(() => import('./pages/settings/settings-hub-page.js').then((module) => ({ default: module.SettingsHubPage })));
const InventoryPage = lazy(() => import('./pages/inventory-page.js').then((module) => ({ default: module.InventoryPage })));
const SetupCostsPage = lazy(() => import('./pages/setup-costs-page.js').then((module) => ({ default: module.SetupCostsPage })));
const ReportsPage = lazy(() => import('./pages/reports-page.js').then((module) => ({ default: module.ReportsPage })));
const LoginPage = lazy(() => import('./pages/login-page.js').then((module) => ({ default: module.LoginPage })));
const CatalogPage = lazy(() => import('./pages/catalog-page.js').then((module) => ({ default: module.CatalogPage })));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <RouteFallback />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: 'pos', element: <PosPage /> },
      { path: 'shifts', element: <PermissionRoute permission="shifts.access"><TreasuryWorkspacePage /></PermissionRoute> },
      { path: 'settings', element: <PermissionRoute anyOf={['treasury.manage', 'users.manage']}><SettingsHubPage /></PermissionRoute> },
      { path: 'settings/receipt', element: <PermissionRoute permission="treasury.manage"><ReceiptSettingsPage /></PermissionRoute> },
      { path: 'settings/users', element: <PermissionRoute permission="users.manage"><ManagerUsersPage /></PermissionRoute> },
      { path: 'catalog', element: <PermissionRoute permission="inventory.manage"><CatalogPage /></PermissionRoute> },
      { path: 'inventory', element: <PermissionRoute permission="inventory.manage"><InventoryPage /></PermissionRoute> },
      { path: 'setup-costs', element: <PermissionRoute permission="setup_costs.manage"><SetupCostsPage /></PermissionRoute> },
      { path: 'reports', element: <PermissionRoute permission="reports.view"><ReportsPage /></PermissionRoute> },
      { path: '*', element: <Navigate to="/pos" replace /> },
    ],
  },
]);

export function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
