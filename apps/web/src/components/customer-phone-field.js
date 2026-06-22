import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { createElement as _createElement } from "react";
import { Autocomplete, Box, Chip, CircularProgress, TextField, Typography, } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { apiSearchCustomers } from '../lib/api.js';
import { useAuth } from '../lib/auth-context.js';
import { formatCustomerPhoneDisplay, normalizeCustomerPhone } from '../lib/customer-phone.js';
export function CustomerPhoneField({ branchId, value, onChange, onSelectCustomer, required, label = 'رقم التلفون', placeholder = '01xxxxxxxxx', size = 'small', disabled, error, helperText, }) {
    const { accessToken } = useAuth();
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [inputValue, setInputValue] = useState(value);
    useEffect(() => {
        setInputValue(value);
    }, [value]);
    useEffect(() => {
        if (!branchId || !accessToken) {
            setOptions([]);
            return;
        }
        const q = inputValue.trim();
        if (q.length < 3) {
            setOptions([]);
            return;
        }
        const timer = window.setTimeout(() => {
            setLoading(true);
            void apiSearchCustomers(branchId, q, accessToken ?? undefined)
                .then((res) => {
                if (res.ok && res.data)
                    setOptions(res.data);
                else
                    setOptions([]);
            })
                .finally(() => setLoading(false));
        }, 280);
        return () => window.clearTimeout(timer);
    }, [branchId, accessToken, inputValue]);
    const selected = useMemo(() => options.find((o) => normalizeCustomerPhone(o.phone) === normalizeCustomerPhone(value)) ?? null, [options, value]);
    return (_jsx(Autocomplete, { freeSolo: true, disableClearable: false, options: options, loading: loading, disabled: disabled ?? false, filterOptions: (x) => x, inputValue: inputValue, onInputChange: (_e, next, reason) => {
            setInputValue(next);
            if (reason === 'input')
                onChange(next);
        }, value: selected, onChange: (_e, option) => {
            if (!option || typeof option === 'string')
                return;
            const phone = formatCustomerPhoneDisplay(option.phone);
            setInputValue(phone);
            onChange(phone);
            onSelectCustomer?.(option);
        }, getOptionLabel: (option) => typeof option === 'string' ? option : formatCustomerPhoneDisplay(option.phone), isOptionEqualToValue: (a, b) => a.id === b.id, renderOption: (props, option) => (_createElement(Box, { component: "li", ...props, key: option.id },
            _jsx(Box, { sx: { width: '100%' }, children: _jsx(StackRow, { option: option }) }))), renderInput: (params) => (_jsx(TextField, { id: params.id, disabled: params.disabled, size: size, fullWidth: true, required: required ?? false, label: label, placeholder: placeholder, error: error ?? false, helperText: helperText, inputProps: { ...params.inputProps, dir: 'ltr', style: { textAlign: 'left' } }, InputProps: {
                ...params.InputProps,
                endAdornment: (_jsxs(_Fragment, { children: [loading ? _jsx(CircularProgress, { color: "inherit", size: 16 }) : null, params.InputProps.endAdornment] })),
            } })) }));
}
function StackRow({ option }) {
    return (_jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', gap: 0.25, py: 0.25 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }, children: [_jsx(Typography, { variant: "body2", fontWeight: 700, dir: "ltr", children: formatCustomerPhoneDisplay(option.phone) }), option.name ? (_jsx(Typography, { variant: "body2", color: "text.secondary", children: option.name })) : null, option.isRegular ? (_jsx(Chip, { label: "\u0639\u0645\u064A\u0644 \u062F\u0627\u0626\u0645", size: "small", color: "primary", sx: { height: 20, fontSize: '0.7rem' } })) : null] }), option.address ? (_jsx(Typography, { variant: "caption", color: "text.secondary", noWrap: true, children: option.address })) : null, option.orderCount > 0 ? (_jsxs(Typography, { variant: "caption", color: "text.secondary", children: [option.orderCount, " \u0637\u0644\u0628 \u0633\u0627\u0628\u0642"] })) : null] }));
}
