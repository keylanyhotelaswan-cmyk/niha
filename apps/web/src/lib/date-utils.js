/** تاريخ محلي YYYY-MM-DD (ليس UTC) */
export function localTodayKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
export function isTodayKey(dateKey) {
    return dateKey === localTodayKey();
}
/** عرض التاريخ للواجهة العربية */
export function formatDateLabelAr(dateKey) {
    const [y, m, d] = dateKey.split('-').map(Number);
    if (!y || !m || !d)
        return dateKey;
    const dt = new Date(y, m - 1, d);
    if (Number.isNaN(dt.getTime()))
        return dateKey;
    return dt.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
export function isTodayRange(fromKey, toKey) {
    const today = localTodayKey();
    return fromKey === today && toKey === today;
}
export function formatDateRangeLabelAr(fromKey, toKey) {
    if (fromKey === toKey) {
        return isTodayKey(fromKey) ? 'اليوم' : formatDateLabelAr(fromKey);
    }
    return `من ${formatDateLabelAr(fromKey)} إلى ${formatDateLabelAr(toKey)}`;
}
