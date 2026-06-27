/** تاريخ محلي YYYY-MM-DD (ليس UTC) */
export function localTodayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** أول يوم في الشهر الحالي — YYYY-MM-DD */
export function localMonthStartKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

export function isTodayKey(dateKey: string) {
  return dateKey === localTodayKey();
}

/** عرض التاريخ للواجهة العربية */
export function formatDateLabelAr(dateKey: string) {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return dateKey;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return dateKey;
  return dt.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export function isTodayRange(fromKey: string, toKey: string) {
  const today = localTodayKey();
  return fromKey === today && toKey === today;
}

/** وقت الطلب — اليوم: الساعة فقط، غير ذلك: تاريخ + ساعة */
export function formatOrderTimestamp(at: string | Date | null | undefined) {
  if (!at) return '';
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
  const now = new Date();
  const sameDay = d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
  if (sameDay) return time;
  const date = d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
  return `${date} · ${time}`;
}

export function formatDateRangeLabelAr(fromKey: string, toKey: string) {
  if (fromKey === toKey) {
    return isTodayKey(fromKey) ? 'اليوم' : formatDateLabelAr(fromKey);
  }
  return `من ${formatDateLabelAr(fromKey)} إلى ${formatDateLabelAr(toKey)}`;
}