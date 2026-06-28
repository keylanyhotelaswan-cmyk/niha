import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import { useAuth } from '../lib/auth-context.js';
import { LoginDto } from '@niha/contracts';
import { cardSx, ui } from '../lib/ui-tokens.js';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const credentials: LoginDto = { username, password };
      await login(credentials);
      navigate('/');
    } catch (err) {
      setError('فشل تسجيل الدخول. يرجى التحقق من بياناتك.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        direction: 'rtl',
        px: 2,
      }}
    >
      <Container maxWidth="xs">
        <Paper elevation={0} sx={{ ...cardSx, p: { xs: 3, sm: 4 }, boxShadow: ui.shadowLg }}>
          <Stack spacing={3}>
            <Stack spacing={0.5} textAlign="center">
              <Typography variant="overline" sx={{ color: ui.primary }}>NIHA</Typography>
              <Typography variant="h5" component="h1" sx={{ color: ui.ink }}>
                تسجيل الدخول
              </Typography>
              <Typography variant="body2">نظام تشغيل المطعم</Typography>
            </Stack>

            {error ? (
              <Alert severity="error" onClose={() => setError('')}>
                {error}
              </Alert>
            ) : null}

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="اسم المستخدم"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  fullWidth
                  autoComplete="username"
                  dir="rtl"
                />
                <TextField
                  label="كلمة المرور"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  fullWidth
                  autoComplete="current-password"
                  dir="rtl"
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={isLoading}
                  sx={{ mt: 1, py: 1.35, borderRadius: `${ui.radiusPill}px` }}
                >
                  {isLoading ? <CircularProgress size={22} sx={{ color: ui.paper }} /> : 'دخول'}
                </Button>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
