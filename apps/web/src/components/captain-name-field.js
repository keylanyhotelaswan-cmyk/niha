import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { createElement as _createElement } from "react";
import { Autocomplete, Box, CircularProgress, TextField, Typography, } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { apiSearchDeliveryCaptains } from '../lib/api.js';
import { useAuth } from '../lib/auth-context.js';
function commitCaptainName(raw, onChange) {
    onChange(raw.trim());
}
export function CaptainNameField({ branchId, value, onChange, deliveryDrivers = [], label = 'الكابتن (دليفري)', placeholder = 'اسم السائق — يُقترح من الطلبات السابقة', size = 'small', disabled, required, }) {
    const { accessToken } = useAuth();
    const [historyHits, setHistoryHits] = useState([]);
    const [loading, setLoading] = useState(false);
    const [inputValue, setInputValue] = useState(value);
    useEffect(() => {
        setInputValue(value);
    }, [value]);
    useEffect(() => {
        if (!branchId || !accessToken) {
            setHistoryHits([]);
            return;
        }
        const timer = window.setTimeout(() => {
            setLoading(true);
            void apiSearchDeliveryCaptains(branchId, inputValue.trim(), accessToken ?? undefined)
                .then((res) => {
                if (res.ok && res.data)
                    setHistoryHits(res.data);
                else
                    setHistoryHits([]);
            })
                .finally(() => setLoading(false));
        }, 220);
        return () => window.clearTimeout(timer);
    }, [branchId, accessToken, inputValue]);
    const options = useMemo(() => {
        const q = inputValue.trim().toLowerCase();
        const seen = new Set();
        const merged = [];
        for (const driver of deliveryDrivers) {
            const name = driver.name.trim();
            if (!name)
                continue;
            if (q && !name.toLowerCase().includes(q))
                continue;
            const key = name.toLowerCase();
            if (seen.has(key))
                continue;
            seen.add(key);
            merged.push({ name, phone: driver.phone ?? null, source: 'settings' });
        }
        for (const hit of historyHits) {
            const name = hit.name.trim();
            if (!name)
                continue;
            const key = name.toLowerCase();
            if (seen.has(key))
                continue;
            seen.add(key);
            merged.push({ name, orderCount: hit.orderCount, source: 'history' });
        }
        return merged;
    }, [deliveryDrivers, historyHits, inputValue]);
    const selected = useMemo(() => options.find((o) => o.name === value.trim()) ?? (value.trim() ? { name: value.trim(), source: 'history' } : null), [options, value]);
    return (_jsx(Autocomplete, { freeSolo: true, options: options, loading: loading, disabled: disabled ?? false, filterOptions: (x) => x, inputValue: inputValue, onInputChange: (_e, next, reason) => {
            setInputValue(next);
            if (reason === 'input') {
                onChange(next);
            }
            else if (reason === 'clear') {
                onChange('');
            }
        }, value: selected, onChange: (_e, option) => {
            if (typeof option === 'string') {
                setInputValue(option);
                commitCaptainName(option, onChange);
                return;
            }
            if (option) {
                setInputValue(option.name);
                commitCaptainName(option.name, onChange);
                return;
            }
            setInputValue('');
            onChange('');
        }, getOptionLabel: (option) => (typeof option === 'string' ? option : option.name), isOptionEqualToValue: (a, b) => a.name === b.name, renderOption: (props, option) => (_createElement(Box, { component: "li", ...props, key: `${option.source}-${option.name}` },
            _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 0.25, py: 0.25 }, children: [_jsxs(Typography, { variant: "body2", fontWeight: 700, children: [option.name, option.phone ? (_jsxs(Typography, { component: "span", variant: "body2", color: "text.secondary", sx: { ml: 0.75 }, children: ["\u00B7 ", option.phone] })) : null] }), option.orderCount != null && option.orderCount > 0 ? (_jsxs(Typography, { variant: "caption", color: "text.secondary", children: [option.orderCount, " \u0637\u0644\u0628 \u0633\u0627\u0628\u0642"] })) : option.source === 'settings' ? (_jsx(Typography, { variant: "caption", color: "text.secondary", children: "\u0645\u0646 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A" })) : null] }))), renderInput: (params) => (_jsx(TextField, { id: params.id, disabled: params.disabled, size: size, fullWidth: true, required: required ?? false, label: label, placeholder: placeholder, inputProps: params.inputProps, InputProps: {
                ...params.InputProps,
                endAdornment: (_jsxs(_Fragment, { children: [loading ? _jsx(CircularProgress, { color: "inherit", size: 16 }) : null, params.InputProps.endAdornment] })),
            }, onBlur: (event) => {
                const nativeOnBlur = params.inputProps.onBlur;
                if (nativeOnBlur)
                    nativeOnBlur(event);
                const trimmed = inputValue.trim();
                if (trimmed !== value.trim()) {
                    setInputValue(trimmed);
                    onChange(trimmed);
                }
            } })) }));
}
