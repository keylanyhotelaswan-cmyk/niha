import { useAuth } from '../lib/auth-context.js';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

export function RouteFallback() {
  return (
    <Box sx={{ minHeight: 320, display: 'grid', placeItems: 'center' }}>
      <CircularProgress color="primary" />
    </Box>
  );
}

export function PermissionRoute({ permission, anyOf, children }: { permission?: string; anyOf?: string[]; children: React.ReactNode }) {
  const { permissions, isLoading } = useAuth();
  if (isLoading) return <RouteFallback />;
  const codes = permissions?.map((p) => p.code) ?? [];
  const allowed = anyOf?.length
    ? anyOf.some((c) => codes.includes(c))
    : permission
      ? codes.includes(permission)
      : true;
  if (!allowed) {
    return <Navigate to="/pos" replace />;
  }
  return <>{children}</>;
}

export function HomeRedirect() {
  return <Navigate to="/pos" replace />;
}
