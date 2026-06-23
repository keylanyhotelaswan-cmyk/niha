import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, Stack } from '@mui/material';
export function OrderTypeToggle({ value, onChange, disabled }) {
    return (_jsxs(Stack, { direction: "row", spacing: 0.5, sx: { bgcolor: 'rgba(47,31,24,0.06)', borderRadius: 3, p: 0.5, opacity: disabled ? 0.65 : 1 }, children: [_jsx(Button, { size: "small", fullWidth: true, disabled: Boolean(disabled), variant: value === 'eat-in' ? 'contained' : 'text', onClick: () => onChange('eat-in'), sx: { borderRadius: 2.5, fontWeight: 700 }, children: "\u0635\u0627\u0644\u0629" }), _jsx(Button, { size: "small", fullWidth: true, disabled: Boolean(disabled), variant: value === 'takeaway' ? 'contained' : 'text', onClick: () => onChange('takeaway'), sx: { borderRadius: 2.5, fontWeight: 700 }, children: "\u062A\u064A\u0643 \u0623\u0648\u0627\u064A" })] }));
}
