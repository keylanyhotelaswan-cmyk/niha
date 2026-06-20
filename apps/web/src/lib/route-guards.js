import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useAuth } from '../lib/auth-context.js';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
export function RouteFallback() {
    return (_jsx(Box, { sx: { minHeight: 320, display: 'grid', placeItems: 'center' }, children: _jsx(CircularProgress, { color: "primary" }) }));
}
export function PermissionRoute({ permission, anyOf, children }) {
    const { permissions, isLoading } = useAuth();
    if (isLoading)
        return _jsx(RouteFallback, {});
    const codes = permissions?.map((p) => p.code) ?? [];
    const allowed = anyOf?.length
        ? anyOf.some((c) => codes.includes(c))
        : permission
            ? codes.includes(permission)
            : true;
    if (!allowed) {
        return _jsx(Navigate, { to: "/pos", replace: true });
    }
    return _jsx(_Fragment, { children: children });
}
export function HomeRedirect() {
    return _jsx(Navigate, { to: "/pos", replace: true });
}
