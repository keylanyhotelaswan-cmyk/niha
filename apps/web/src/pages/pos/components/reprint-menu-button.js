import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, Menu, MenuItem } from '@mui/material';
import { useState } from 'react';
const OPTIONS = [
    { copies: 'kitchen', label: 'مطبخ فقط' },
    { copies: 'customer', label: 'صالة (زبون) فقط' },
    { copies: 'both', label: 'الاثنين معاً' },
];
export function ReprintMenuButton({ disabled, onReprint }) {
    const [anchor, setAnchor] = useState(null);
    return (_jsxs(_Fragment, { children: [_jsx(Button, { size: "small", variant: "text", disabled: Boolean(disabled), onClick: (e) => setAnchor(e.currentTarget), sx: { borderRadius: 2.5, fontWeight: 700 }, children: "\u0625\u0639\u0627\u062F\u0629 \u0637\u0628\u0627\u0639\u0629" }), _jsx(Menu, { anchorEl: anchor, open: Boolean(anchor), onClose: () => setAnchor(null), children: OPTIONS.map((opt) => (_jsx(MenuItem, { onClick: () => {
                        setAnchor(null);
                        onReprint(opt.copies);
                    }, children: opt.label }, opt.copies))) })] }));
}
