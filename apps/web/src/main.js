import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { App } from './App.js';
import { AuthProvider } from './lib/auth-context.js';
import './styles.css';
const queryClient = new QueryClient();
const theme = createTheme({
    direction: 'rtl',
    palette: {
        mode: 'light',
        primary: {
            main: '#b93817',
        },
        secondary: {
            main: '#d97706',
        },
        text: {
            primary: '#2f1f18',
            secondary: '#75594d',
        },
        background: {
            default: '#f4eadc',
            paper: '#fff7ed',
        },
    },
    typography: {
        fontFamily: 'Cairo, Tajawal, system-ui, sans-serif',
        h3: {
            fontWeight: 800,
        },
        h4: {
            fontWeight: 800,
        },
    },
    shape: {
        borderRadius: 18,
    },
    components: {
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 14,
                    fontWeight: 700,
                    boxShadow: 'none',
                    textTransform: 'none',
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    fontWeight: 700,
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    boxShadow: 'none',
                },
            },
        },
    },
});
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(QueryClientProvider, { client: queryClient, children: _jsxs(ThemeProvider, { theme: theme, children: [_jsx(CssBaseline, {}), _jsx(AuthProvider, { children: _jsx(App, {}) })] }) }) }));
