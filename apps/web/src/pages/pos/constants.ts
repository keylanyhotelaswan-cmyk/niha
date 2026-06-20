export const ALL_CATEGORIES = '__all__';

/** @deprecated use getStoreBranding() from pos-receipt */
export { getStoreBranding } from '../../lib/pos-receipt-settings.js';
export const STORE_NAME = 'نـيـهـا يـم';
export const STORE_SUBTITLE = 'للأكل الآسيوي';
export const STORE_FOOTER = 'أسوان · الشارع الجديد · أمام سلم فندق الكيلاني';
export const STORE_PHONE = '01107666987';
export const DEFAULT_PAYMENT_METHODS = [
  { id: 'cash', label: 'نقدي', code: 'CASH' },
  { id: 'instapay', label: 'انستاباي', code: 'INSTAPAY' },
  { id: 'wallet', label: 'محفظة', code: 'WALLET' },
];

export type PaymentMethodOption = { id: string; label: string; code: string };
