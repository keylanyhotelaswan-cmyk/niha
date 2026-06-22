export function normalizeCustomerPhone(raw?: string | null): string {
  if (!raw?.trim()) return '';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return raw.trim();
  if (digits.startsWith('20') && digits.length >= 12) {
    return `0${digits.slice(2, 12)}`;
  }
  if (digits.startsWith('0') && digits.length >= 11) {
    return digits.slice(0, 11);
  }
  if (digits.length === 10 && digits.startsWith('1')) {
    return `0${digits}`;
  }
  return digits.length >= 10 ? digits : raw.trim();
}

export function isValidCustomerPhone(raw?: string | null): boolean {
  const phone = normalizeCustomerPhone(raw);
  return /^01\d{9}$/.test(phone);
}

export function formatCustomerPhoneDisplay(raw?: string | null): string {
  return normalizeCustomerPhone(raw) || raw?.trim() || '';
}
