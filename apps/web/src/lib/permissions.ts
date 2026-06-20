type Perm = { code: string };

export function permissionCodes(permissions?: Perm[]) {
  return permissions?.map((p) => p.code) ?? [];
}

export function hasPermission(permissions: Perm[] | undefined, code: string) {
  return permissionCodes(permissions).includes(code);
}

/** إدارة الخزنة الكاملة — للمدير */
export function canManageTreasury(permissions?: Perm[]) {
  return hasPermission(permissions, 'treasury.manage');
}

/** إدارة إعدادات الفاتورة والطابعة — للمدير */
export function canManagePosPrinting(permissions?: Perm[]) {
  return hasPermission(permissions, 'treasury.manage');
}

/** طباعة من نقطة البيع — مدير أو كاشير عند تفعيلها من الإعدادات */
export function canUsePosPrinting(permissions?: Perm[]) {
  if (canManagePosPrinting(permissions)) return true;
  if (!hasPermission(permissions, 'pos.use')) return false;
  try {
    const raw = localStorage.getItem('niha-receipt-settings');
    if (!raw) return true;
    const parsed = JSON.parse(raw) as { cashierPrintingEnabled?: boolean };
    return parsed.cashierPrintingEnabled !== false;
  } catch {
    return true;
  }
}

/** كاشير: يرى ورديته اليوم من POS فقط */
export function isCashierTreasuryView(permissions?: Perm[]) {
  return hasPermission(permissions, 'shifts.access') && !canManageTreasury(permissions);
}

export function canAccessSettingsHub(permissions?: Perm[]) {
  return canManageTreasury(permissions) || hasPermission(permissions, 'users.manage');
}
