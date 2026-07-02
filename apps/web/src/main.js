import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { App } from './App.js';
import { AuthProvider } from './lib/auth-context.js';
import { appTheme } from './lib/theme.js';
import './styles.css';
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(QueryClientProvider, { client: queryClient, children: _jsxs(ThemeProvider, { theme: appTheme, children: [_jsx(CssBaseline, {}), _jsx(AuthProvider, { children: _jsx(App, {}) })] }) }) }));
