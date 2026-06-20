import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Paper, TextField, Button, Typography, Alert, CircularProgress, } from '@mui/material';
import { useAuth } from '../lib/auth-context.js';
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
        }, children: _jsx(Container, { maxWidth: "sm", children: _jsxs(Paper, { elevation: 3, sx: {
                    p: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                }, children: [_jsx(Typography, { variant: "h4", component: "h1", align: "center", gutterBottom: true, children: "\u0646\u0638\u0627\u0645 Niha" }), error && (_jsx(Alert, { severity: "error", onClose: () => setError(''), children: error })), _jsx("form", { onSubmit: handleSubmit, children: _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2 }, children: [_jsx(TextField, { label: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645", value: username, onChange: (e) => setUsername(e.target.value), required: true, fullWidth: true, autoComplete: "username", dir: "rtl" }), _jsx(TextField, { label: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631", type: "password", value: password, onChange: (e) => setPassword(e.target.value), required: true, fullWidth: true, autoComplete: "current-password", dir: "rtl" }), _jsx(Button, { type: "submit", variant: "contained", fullWidth: true, size: "large", disabled: isLoading, sx: { mt: 2 }, children: isLoading ? _jsx(CircularProgress, { size: 24 }) : 'تسجيل الدخول' })] }) })] }) }) }));
}
