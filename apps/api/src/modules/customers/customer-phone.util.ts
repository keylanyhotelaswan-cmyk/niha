/** Normalize Egyptian mobile numbers to digits-only 01xxxxxxxxx when possible. */
export function normalizeCustomerPhone(raw?: string | null): string | null {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('20') && digits.length >= 12) {
    return `0${digits.slice(2, 12)}`;
  }
  if (digits.startsWith('0') && digits.length >= 11) {
    return digits.slice(0, 11);
  }
  if (digits.length === 10 && digits.startsWith('1')) {
    return `0${digits}`;
  }
  return digits.length >= 10 ? digits : null;
}

export function isValidCustomerPhone(raw?: string | null): boolean {
  const phone = normalizeCustomerPhone(raw);
  if (!phone) return false;
  return /^01\d{9}$/.test(phone);
}
