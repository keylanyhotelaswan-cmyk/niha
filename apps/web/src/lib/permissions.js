export function permissionCodes(permissions) {
    return permissions?.map((p) => p.code) ?? [];
}
export function hasPermission(permissions, code) {
    return permissionCodes(permissions).includes(code);
}
/** إدارة الخزنة الكاملة — للمدير */
export function canManageTreasury(permissions) {
    return hasPermission(permissions, 'treasury.manage');
}
/** إدارة إعدادات الفاتورة والطابعة — للمدير */
export function canManagePosPrinting(permissions) {
    return hasPermission(permissions, 'treasury.manage');
}
/** طباعة من نقطة البيع — مدير أو كاشير عند تفعيلها من الإعدادات */
export function canUsePosPrinting(permissions) {
    if (canManagePosPrinting(permissions))
        return true;
    if (!hasPermission(permissions, 'pos.use'))
        return false;
    try {
        const raw = localStorage.getItem('niha-receipt-settings');
        if (!raw)
            return true;
        const parsed = JSON.parse(raw);
        return parsed.cashierPrintingEnabled !== false;
    }
    catch {
        return true;
    }
}
/** كاشير: يرى ورديته اليوم من POS فقط */
export function isCashierTreasuryView(permissions) {
    return hasPermission(permissions, 'shifts.access') && !canManageTreasury(permissions);
}
export function canAccessSettingsHub(permissions) {
    return canManageTreasury(permissions) || hasPermission(permissions, 'users.manage');
}
