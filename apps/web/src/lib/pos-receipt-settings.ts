export const RECEIPT_SETTINGS_KEY = 'niha-receipt-settings';
export const RECEIPT_SETTINGS_EVENT = 'niha-receipt-settings-changed';
export const RECEIPT_SETTINGS_VERSION = 8;
export const RECEIPT_DPI = 203;
/** عرض CSS ثابت لورق 80mm — يمنع تكبير html2canvas إلى ~639px */
export const RECEIPT_CSS_WIDTH_PX = 280;
export const RECEIPT_DEFAULT_PADDING_MM = 2;
export const DEFAULT_THERMAL_PAPER_SIZE = '80(72.1) x 297 mm';

export function mmToReceiptPx(mm: number) {
  return Math.round((mm / 25.4) * RECEIPT_DPI);
}

/** XP-80C printable area on an 80mm roll (driver label: 80(72.1) x 297 mm) */
export const RECEIPT_PRINTABLE_MM_80 = 72;

export function getReceiptPrintableWidthMm(paperWidthMm = 80) {
  if (paperWidthMm >= 78) return RECEIPT_PRINTABLE_MM_80;
  if (paperWidthMm >= 56) return 48;
  return Math.max(40, Math.round(paperWidthMm * 0.9));
}

/** عرض PNG للطباعة = 203 DPI × العرض القابل للطباعة (576px ≈ 72mm على roll 80mm) */
export function getReceiptPrintWidthPx(paperWidthMm = 80) {
  return mmToReceiptPx(getReceiptPrintableWidthMm(paperWidthMm));
}

export function getReceiptCssWidthPx(paperWidthMm = 80) {
  return Math.round(RECEIPT_CSS_WIDTH_PX * paperWidthMm / 80);
}
export type ReceiptPrintCopies = 'both' | 'kitchen' | 'customer';
export type ReceiptPaperOrientation = 'portrait' | 'landscape';

export type DeliveryDriver = { name: string; phone?: string };

/** escpos = صورة raster (عربي) | escpos-text = نص خام (بدون عربي) | png = PDF */
export type ReceiptPrintMode = 'escpos' | 'escpos-text' | 'png';

export type ReceiptSettings = {
  storeName: string;
  storeSubtitle: string;
  storeFooter: string;
  storePhone: string;
  paperWidthMm: number;
  paperOrientation: ReceiptPaperOrientation;
  marginMm: number;
  showFrame: boolean;
  fontScale: number;
  fontStoreName: number;
  fontBody: number;
  fontKitchenNum: number;
  fontKitchenItem: number;
  printCopies: ReceiptPrintCopies;
  printMode: ReceiptPrintMode;
  autoPrint: boolean;
  cashierPrintingEnabled: boolean;
  printerName: string;
  paperSize: string;
  deliveryDrivers: DeliveryDriver[];
};

export const DEFAULT_RECEIPT_SETTINGS: ReceiptSettings = {
  storeName: 'نـيـهـا يـم',
  storeSubtitle: 'للأكل الآسيوي',
  storeFooter: 'أسوان · الشارع الجديد · أمام سلم فندق الكيلاني',
  storePhone: '01107666987',
  paperWidthMm: 80,
  paperOrientation: 'portrait',
  marginMm: 2,
  showFrame: false,
  fontScale: 1,
  fontStoreName: 28,
  fontBody: 16,
  fontKitchenNum: 72,
  fontKitchenItem: 26,
  printCopies: 'both',
  printMode: 'escpos',
  autoPrint: true,
  cashierPrintingEnabled: true,
  printerName: 'XP-K200L',
  paperSize: '',
  deliveryDrivers: [],
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function normalizeReceiptSettings(raw: Partial<ReceiptSettings> | null | undefined): ReceiptSettings {
  const d = DEFAULT_RECEIPT_SETTINGS;
  const r = raw ?? {};
  return {
    storeName: String(r.storeName ?? d.storeName).trim() || d.storeName,
    storeSubtitle: String(r.storeSubtitle ?? d.storeSubtitle).trim() || d.storeSubtitle,
    storeFooter: String(r.storeFooter ?? d.storeFooter).trim(),
    storePhone: String(r.storePhone ?? d.storePhone).trim(),
    paperWidthMm: clamp(Number(r.paperWidthMm ?? d.paperWidthMm) || d.paperWidthMm, 58, 80),
    paperOrientation: 'portrait',
    marginMm: clamp(Number(r.marginMm ?? d.marginMm) || d.marginMm, 0, 20),
    showFrame: r.showFrame ?? d.showFrame,
    fontScale: clamp(Number(r.fontScale ?? d.fontScale) || d.fontScale, 0.65, 1.5),
    fontStoreName: clamp(Number(r.fontStoreName ?? d.fontStoreName) || d.fontStoreName, 14, 40),
    fontBody: clamp(Number(r.fontBody ?? d.fontBody) || d.fontBody, 10, 28),
    fontKitchenNum: clamp(Number(r.fontKitchenNum ?? d.fontKitchenNum) || d.fontKitchenNum, 24, 96),
    fontKitchenItem: clamp(Number(r.fontKitchenItem ?? d.fontKitchenItem) || d.fontKitchenItem, 12, 36),
    printCopies: r.printCopies === 'kitchen' || r.printCopies === 'customer' ? r.printCopies : 'both',
    printMode:
      r.printMode === 'png' ? 'png'
      : r.printMode === 'escpos-text' ? 'escpos-text'
      : 'escpos',
    autoPrint: r.autoPrint ?? d.autoPrint,
    cashierPrintingEnabled: r.cashierPrintingEnabled ?? d.cashierPrintingEnabled,
    printerName: String(r.printerName ?? d.printerName).trim() || d.printerName,
    paperSize: String(r.paperSize ?? d.paperSize).trim() || d.paperSize,
    deliveryDrivers: Array.isArray(r.deliveryDrivers)
      ? r.deliveryDrivers
          .map((driver) => ({
            name: String((driver as DeliveryDriver)?.name ?? '').trim(),
            ...(String((driver as DeliveryDriver)?.phone ?? '').trim()
              ? { phone: String((driver as DeliveryDriver).phone).trim() }
              : {}),
          }))
          .filter((driver) => driver.name)
      : d.deliveryDrivers,
  };
}

type StoredReceiptSettings = Partial<ReceiptSettings> & { _v?: number; _savedAt?: number };

function readStoredMeta(): { savedAt: number } {
  try {
    const raw = localStorage.getItem(RECEIPT_SETTINGS_KEY);
    if (!raw) return { savedAt: 0 };
    const parsed = JSON.parse(raw) as StoredReceiptSettings;
    return { savedAt: Number(parsed._savedAt) || 0 };
  } catch {
    return { savedAt: 0 };
  }
}

function migrateReceiptSettings(stored: StoredReceiptSettings): ReceiptSettings {
  const version = stored._v ?? 1;
  const { _v: _ignored, ...rest } = stored;
  void _ignored;

  let patch: Partial<ReceiptSettings> = { ...rest };

  if (version < 2) {
    patch = {
      ...patch,
      paperOrientation: 'portrait',
      paperWidthMm: patch.paperWidthMm ?? DEFAULT_RECEIPT_SETTINGS.paperWidthMm,
      marginMm:
        patch.marginMm === undefined || patch.marginMm === 10
          ? RECEIPT_DEFAULT_PADDING_MM
          : patch.marginMm,
      paperSize: patch.paperSize ?? DEFAULT_THERMAL_PAPER_SIZE,
    };
  }

  if (version < 3) {
    patch = {
      ...patch,
      paperOrientation: 'portrait',
      marginMm: patch.marginMm === undefined || patch.marginMm >= 8 ? 2 : patch.marginMm,
      showFrame: false,
      fontStoreName: DEFAULT_RECEIPT_SETTINGS.fontStoreName,
      fontBody: DEFAULT_RECEIPT_SETTINGS.fontBody,
      fontKitchenNum: DEFAULT_RECEIPT_SETTINGS.fontKitchenNum,
      fontKitchenItem: DEFAULT_RECEIPT_SETTINGS.fontKitchenItem,
    };
  }

  if (version < 4) {
    patch = {
      ...patch,
      fontStoreName: DEFAULT_RECEIPT_SETTINGS.fontStoreName,
      fontBody: DEFAULT_RECEIPT_SETTINGS.fontBody,
      fontKitchenNum: DEFAULT_RECEIPT_SETTINGS.fontKitchenNum,
      fontKitchenItem: DEFAULT_RECEIPT_SETTINGS.fontKitchenItem,
      paperSize: '',
    };
  }

  if (version < 5) {
    patch = {
      ...patch,
      cashierPrintingEnabled: true,
    };
  }

  if (version < 6) {
    patch = {
      ...patch,
      deliveryDrivers: Array.isArray((patch as ReceiptSettings).deliveryDrivers)
        ? (patch as ReceiptSettings).deliveryDrivers
        : [],
    };
  }

  return normalizeReceiptSettings(patch);
}

export function getReceiptSettings(): ReceiptSettings {
  try {
    const raw = localStorage.getItem(RECEIPT_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_RECEIPT_SETTINGS };
    const parsed = JSON.parse(raw) as StoredReceiptSettings;
    const settings = migrateReceiptSettings(parsed);
    if ((parsed._v ?? 1) < RECEIPT_SETTINGS_VERSION) {
      saveReceiptSettings(settings);
    }
    return settings;
  } catch {
    return { ...DEFAULT_RECEIPT_SETTINGS };
  }
}

export function saveReceiptSettings(settings: ReceiptSettings) {
  const normalized = normalizeReceiptSettings(settings);
  const savedAt = Date.now();
  localStorage.setItem(
    RECEIPT_SETTINGS_KEY,
    JSON.stringify({ _v: RECEIPT_SETTINGS_VERSION, _savedAt: savedAt, ...normalized }),
  );
  window.dispatchEvent(new CustomEvent(RECEIPT_SETTINGS_EVENT, { detail: normalized }));
  return normalized;
}

export function resetReceiptSettings() {
  return saveReceiptSettings({ ...DEFAULT_RECEIPT_SETTINGS });
}

export type ReceiptSettingsSyncOptions = {
  branchId?: string;
  token?: string | null;
};

/** إعدادات خاصة بكل جهاز — لا تُرفع للسيرفر */
const LOCAL_RECEIPT_SETTING_KEYS = ['printerName', 'autoPrint'] as const satisfies readonly (keyof ReceiptSettings)[];

function pickLocalReceiptSettings(settings: ReceiptSettings): Pick<ReceiptSettings, 'printerName' | 'autoPrint'> {
  return { printerName: settings.printerName, autoPrint: settings.autoPrint };
}

function toServerReceiptPayload(settings: ReceiptSettings, savedAt: number) {
  const payload = { _v: RECEIPT_SETTINGS_VERSION, _savedAt: savedAt, ...settings } as Record<string, unknown>;
  for (const key of LOCAL_RECEIPT_SETTING_KEYS) {
    delete payload[key];
  }
  return payload;
}

function mergeReceiptSettings(local: ReceiptSettings, remote: ReceiptSettings): ReceiptSettings {
  return normalizeReceiptSettings({
    ...remote,
    ...pickLocalReceiptSettings(local),
  });
}

export async function fetchReceiptSettingsFromServer(
  branchId: string,
  token: string,
): Promise<{ settings: ReceiptSettings; savedAt: number } | null> {
  try {
    const { apiGetBranchReceiptSettings } = await import('./api.js');
    const res = await apiGetBranchReceiptSettings(branchId, token) as { settings?: Partial<ReceiptSettings> & { _savedAt?: number } | null };
    if (!res?.settings || typeof res.settings !== 'object') return null;
    const raw = res.settings as Record<string, unknown>;
    const savedAt = Number(raw._savedAt) || 0;
    return { settings: normalizeReceiptSettings(res.settings), savedAt };
  } catch {
    return null;
  }
}

export async function saveReceiptSettingsWithSync(
  settings: ReceiptSettings,
  sync?: ReceiptSettingsSyncOptions,
): Promise<ReceiptSettings> {
  const saved = saveReceiptSettings(settings);
  const { savedAt } = readStoredMeta();

  if (sync?.branchId && sync.token) {
    try {
      const { apiSaveBranchReceiptSettings } = await import('./api.js');
      await apiSaveBranchReceiptSettings(sync.branchId, toServerReceiptPayload(saved, savedAt), sync.token);
    } catch (err) {
      console.warn('[niha] failed to sync receipt settings to server', err);
    }
  }

  return saved;
}

export async function hydrateReceiptSettingsFromServer(branchId: string, token: string) {
  const local = getReceiptSettings();
  const { savedAt: localSavedAt } = readStoredMeta();
  const remote = await fetchReceiptSettingsFromServer(branchId, token);
  if (!remote) return local;

  if (localSavedAt >= remote.savedAt && localSavedAt > 0) {
    if (localSavedAt > remote.savedAt) {
      void saveReceiptSettingsWithSync(local, { branchId, token });
    }
    return local;
  }

  const merged = mergeReceiptSettings(local, remote.settings);
  saveReceiptSettings(merged);
  return merged;
}

export function receiptLayoutFromSettings(settings = getReceiptSettings()) {
  const cssWidthPx = getReceiptCssWidthPx(settings.paperWidthMm);
  const printWidthPx = getReceiptPrintWidthPx(settings.paperWidthMm);
  const printableRollMm = getReceiptPrintableWidthMm(settings.paperWidthMm);
  const padMm = settings.marginMm;
  const printableMm = Math.max(20, printableRollMm - padMm * 2);
  return {
    widthPx: cssWidthPx,
    cssWidthPx,
    printWidthPx,
    dpiWidthPx: printWidthPx,
    marginPx: mmToReceiptPx(padMm),
    printableMm,
    paperMm: settings.paperWidthMm,
    marginMm: padMm,
  };
}

export function scaledFont(basePx: number, settings = getReceiptSettings()) {
  return Math.max(10, Math.round(basePx * settings.fontScale));
}

export function getStoreBranding(settings = getReceiptSettings()) {
  return {
    storeName: settings.storeName,
    storeSubtitle: settings.storeSubtitle,
    storeFooter: settings.storeFooter,
    storePhone: settings.storePhone,
  };
}

export function sampleReceiptData(settings = getReceiptSettings()) {
  return {
    storeName: settings.storeName,
    storeSubtitle: settings.storeSubtitle,
    storeFooter: settings.storeFooter,
    storePhone: settings.storePhone,
    orderNumber: 'ORDER-202606-000049',
    shiftNumber: '1',
    orderType: 'محلي',
    customerName: 'محمود',
    customerPhone: '01152102428',
    customerAddress: 'شارع النيل، المعادي',
    captainName: 'أحمد',
    cashierName: 'كاشير',
    paymentMethod: 'نقدي',
    isPaid: true,
    items: [
      { name: 'بيف رول', quantity: 1, unitPrice: 155, lineTotal: 155 },
      { name: 'بطاطس', quantity: 1, unitPrice: 50, lineTotal: 50 },
    ],
    subtotal: 205,
    discount: 0,
    total: 205,
    createdAt: new Date().toLocaleString('ar-EG'),
  };
}
