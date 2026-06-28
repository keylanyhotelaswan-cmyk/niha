import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Paper, TextField, Button, Typography, Alert, CircularProgress, Stack, } from '@mui/material';
import { useAuth } from '../lib/auth-context.js';
import { cardSx, ui } from '../lib/ui-tokens.js';
export function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const credentials = { username, password };
            await login(credentials);
            navigate('/');
        }
        catch (err) {
            setError('فشل تسجيل الدخول. يرجى التحقق من بياناتك.');
        }
        finally {
            setIsLoading(false);
        }
    };
    return (_jsx(Box, { sx: {
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default',
            direction: 'rtl',
            px: 2,
        }, children: _jsx(Container, { maxWidth: "xs", children: _jsx(Paper, { elevation: 0, sx: { ...cardSx, p: { xs: 3, sm: 4 }, boxShadow: ui.shadowLg }, children: _jsxs(Stack, { spacing: 3, children: [_jsxs(Stack, { spacing: 0.5, textAlign: "center", children: [_jsx(Typography, { variant: "overline", sx: { color: ui.primary }, children: "NIHA" }), _jsx(Typography, { variant: "h5", component: "h1", sx: { color: ui.ink }, children: "\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644" }), _jsx(Typography, { variant: "body2", children: "\u0646\u0638\u0627\u0645 \u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u0645\u0637\u0639\u0645" })] }), error ? (_jsx(Alert, { severity: "error", onClose: () => setError(''), children: error })) : null, _jsx(Box, { component: "form", onSubmit: handleSubmit, children: _jsxs(Stack, { spacing: 2, children: [_jsx(TextField, { label: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645", value: username, onChange: (e) => setUsername(e.target.value), required: true, fullWidth: true, autoComplete: "username", dir: "rtl" }), _jsx(TextField, { label: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631", type: "password", value: password, onChange: (e) => setPassword(e.target.value), required: true, fullWidth: true, autoComplete: "current-password", dir: "rtl" }), _jsx(Button, { type: "submit", variant: "contained", fullWidth: true, size: "large", disabled: isLoading, sx: { mt: 1, py: 1.35, borderRadius: `${ui.radiusPill}px` }, children: isLoading ? _jsx(CircularProgress, { size: 22, sx: { color: ui.paper } }) : 'دخول' })] }) })] }) }) }) }));
}
