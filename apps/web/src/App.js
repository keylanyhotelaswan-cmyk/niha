import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Suspense, lazy } from 'react';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AppShell } from './app-shell.js';
import { useAuth } from './lib/auth-context.js';
import { HomeRedirect, PermissionRoute, RouteFallback } from './lib/route-guards.js';
const PosPage = lazy(() => import('./pages/pos-page.js').then((module) => ({ default: module.PosPage })));
const TreasuryWorkspacePage = lazy(() => import('./pages/treasury-workspace/treasury-workspace-page.js').then((module) => ({ default: module.TreasuryWorkspacePage })));
const ManagerUsersPage = lazy(() => import('./pages/manager-users-page.js').then((module) => ({ default: module.ManagerUsersPage })));
const ReceiptSettingsPage = lazy(() => import('./pages/receipt-settings-page.tsx').then((module) => ({ default: module.ReceiptSettingsPage })));
const SettingsHubPage = lazy(() => import('./pages/settings/settings-hub-page.js').then((module) => ({ default: module.SettingsHubPage })));
const InventoryPage = lazy(() => import('./pages/inventory-page.js').then((module) => ({ default: module.InventoryPage })));
const SetupCostsPage = lazy(() => import('./pages/setup-costs-page.js').then((module) => ({ default: module.SetupCostsPage })));
const ReportsPage = lazy(() => import('./pages/reports-page.js').then((module) => ({ default: module.ReportsPage })));
const LoginPage = lazy(() => import('./pages/login-page.js').then((module) => ({ default: module.LoginPage })));
const CatalogPage = lazy(() => import('./pages/catalog-page.js').then((module) => ({ default: module.CatalogPage })));
function ProtectedRoute({ children }) {
    const { isAuthenticated, isLoading } = useAuth();
    if (isLoading) {
        return _jsx(RouteFallback, {});
    }
    if (!isAuthenticated) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    return _jsx(_Fragment, { children: children });
}
const router = createBrowserRouter([
    {
        path: '/login',
        element: _jsx(LoginPage, {}),
    },
    {
        path: '/',
        element: (_jsx(ProtectedRoute, { children: _jsx(AppShell, {}) })),
        children: [
            { index: true, element: _jsx(HomeRedirect, {}) },
            { path: 'pos', element: _jsx(PosPage, {}) },
            { path: 'shifts', element: _jsx(PermissionRoute, { permission: "shifts.access", children: _jsx(TreasuryWorkspacePage, {}) }) },
            { path: 'settings', element: _jsx(PermissionRoute, { anyOf: ['treasury.manage', 'users.manage'], children: _jsx(SettingsHubPage, {}) }) },
            { path: 'settings/receipt', element: _jsx(PermissionRoute, { permission: "treasury.manage", children: _jsx(ReceiptSettingsPage, {}) }) },
            { path: 'settings/users', element: _jsx(PermissionRoute, { permission: "users.manage", children: _jsx(ManagerUsersPage, {}) }) },
            { path: 'catalog', element: _jsx(PermissionRoute, { permission: "inventory.manage", children: _jsx(CatalogPage, {}) }) },
            { path: 'inventory', element: _jsx(PermissionRoute, { permission: "inventory.manage", children: _jsx(InventoryPage, {}) }) },
            { path: 'setup-costs', element: _jsx(PermissionRoute, { permission: "setup_costs.manage", children: _jsx(SetupCostsPage, {}) }) },
            { path: 'reports', element: _jsx(PermissionRoute, { permission: "reports.view", children: _jsx(ReportsPage, {}) }) },
            { path: '*', element: _jsx(Navigate, { to: "/pos", replace: true }) },
        ],
    },
]);
export function App() {
    return (_jsx(Suspense, { fallback: _jsx(RouteFallback, {}), children: _jsx(RouterProvider, { router: router }) }));
}
