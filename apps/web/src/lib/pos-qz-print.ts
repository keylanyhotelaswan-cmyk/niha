import { DEFAULT_PRINTER_NAME, readSavedPrinterName, savePrinterName } from './pos-receipt.js';

const QZ_ALLOWED_KEY = 'niha-pos-qz-allowed';
const PRINTER_HINTS = ['Xprinter', 'xprinter', 'XP-', 'XP ', 'POS', '80', '58', 'thermal', 'receipt'];

export { readSavedPrinterName, savePrinterName };

type QzModule = {
  websocket: {
    isActive: () => boolean;
    connect: (cfg?: { retries?: number; delay?: number }) => Promise<void>;
    disconnect: () => Promise<void>;
  };
  printers: {
    find: (query?: string) => Promise<string[]>;
    getDefault: () => Promise<string>;
  };
  configs: {
    create: (printer: string | null, opts?: Record<string, unknown>) => unknown;
  };
  print: (config: unknown, data: unknown[]) => Promise<void>;
  security: {
    setCertificatePromise: (fn: (resolve: (v: string) => void, reject: (e: Error) => void) => void) => void;
    setSignaturePromise: (fn: (toSign: string) => (resolve: (v: string) => void, reject: (e: Error) => void) => void) => void;
  };
};

let qzPromise: Promise<QzModule | null> | null = null;
let connectPromise: Promise<boolean> | null = null;
let securityConfigured = false;

function configureQzSecurity(qz: QzModule) {
  if (securityConfigured) return;
  securityConfigured = true;
  qz.security.setCertificatePromise((resolve) => {
    resolve('');
  });
  qz.security.setSignaturePromise(() => (resolve) => {
    resolve('');
  });
}

async function loadQz(): Promise<QzModule | null> {
  if (qzPromise) return qzPromise;
  qzPromise = import('qz-tray')
    .then((mod) => {
      const qz = (mod.default ?? mod) as QzModule;
      configureQzSecurity(qz);
      return qz;
    })
    .catch(() => null);
  return qzPromise;
}

export function markQzAllowed() {
  try {
    localStorage.setItem(QZ_ALLOWED_KEY, 'true');
  } catch {
    /* ignore */
  }
}

export function isQzMarkedAllowed(): boolean {
  try {
    return localStorage.getItem(QZ_ALLOWED_KEY) === 'true';
  } catch {
    return false;
  }
}

export async function ensureQzConnected(): Promise<boolean> {
  const qz = await loadQz();
  if (!qz) return false;
  if (qz.websocket.isActive()) return true;
  if (connectPromise) return connectPromise;

  connectPromise = qz.websocket
    .connect({ retries: 5, delay: 1 })
    .then(() => {
      markQzAllowed();
      return true;
    })
    .catch(() => false)
    .finally(() => {
      connectPromise = null;
    });

  return connectPromise;
}

function preferNonDuplicatePrinter(printers: string[]): string[] {
  const primary = printers.filter((p) => !/\(copy\s*\d*\)/i.test(p));
  return primary.length ? primary : printers;
}

function pickPreferredPrinter(printers: string[]): string | null {
  if (!printers.length) return null;
  const pool = preferNonDuplicatePrinter(printers);
  const preferred = pool.find((p) => /xprinter|xp[\s-]?\d|58mm|80mm|thermal|receipt|pos/i.test(p));
  return preferred ?? pool[0] ?? null;
}

function matchPrinterName(saved: string, printers: string[]): string | null {
  const trimmed = saved.trim();
  if (!trimmed) return null;
  const exact = printers.find((p) => p === trimmed);
  if (exact) return exact;
  const lower = trimmed.toLowerCase();
  const caseInsensitive = printers.find((p) => p.toLowerCase() === lower);
  if (caseInsensitive) return caseInsensitive;
  const partial = printers.find((p) => {
    const pl = p.toLowerCase();
    return pl.includes(lower) || lower.includes(pl);
  });
  return partial ?? null;
}

async function discoverPrinters(qz: QzModule): Promise<string[]> {
  const found = new Set<string>();

  const add = (names: string | string[] | null | undefined) => {
    if (!names) return;
    const list = Array.isArray(names) ? names : [names];
    list.forEach((n) => {
      const trimmed = String(n).trim();
      if (trimmed) found.add(trimmed);
    });
  };

  try {
    add(await qz.printers.find());
  } catch {
    /* ignore */
  }

  try {
    add(await qz.printers.getDefault());
  } catch {
    /* ignore */
  }

  for (const hint of PRINTER_HINTS) {
    try {
      add(await qz.printers.find(hint));
    } catch {
      /* ignore */
    }
  }

  return [...found].sort((a, b) => a.localeCompare(b, 'ar'));
}

export async function listQzPrinters(): Promise<string[]> {
  const ok = await ensureQzConnected();
  if (!ok) return [];
  const qz = await loadQz();
  if (!qz) return [];
  return discoverPrinters(qz);
}

export async function resolveQzPrinter(): Promise<string | null> {
  const qz = await loadQz();
  if (!qz) return null;
  if (!(await ensureQzConnected())) return null;

  const printers = await discoverPrinters(qz);
  const saved = readSavedPrinterName();

  if (saved) {
    const matched = matchPrinterName(saved, printers);
    if (matched) return matched;
    return saved;
  }

  const chosen = pickPreferredPrinter(printers);
  if (chosen) savePrinterName(chosen);
  return chosen;
}

export type SilentPrintResult =
  | { ok: true; printer: string }
  | { ok: false; reason: 'qz-missing' | 'qz-disconnected' | 'no-printer' | 'print-failed'; message: string };

export type ReceiptPrintPayload = {
  html: string;
  pngBase64?: string;
  pngHeightPx?: number;
};

type PrintStrategyResult = { ok: true; method: string } | { ok: false; error: string };

const THERMAL_WIDTH_IN = 3.15; // 80mm

async function runPrintStrategy(
  qz: QzModule,
  printer: string,
  label: string,
  run: () => Promise<void>,
): Promise<PrintStrategyResult> {
  try {
    await run();
    return { ok: true, method: label };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg || label };
  }
}

export async function printReceiptToQz(printer: string, payload: ReceiptPrintPayload): Promise<{ method: string }> {
  const qz = await loadQz();
  if (!qz) throw new Error('qz-missing');

  const strategies: Array<{ label: string; run: () => Promise<void> }> = [];

  if (payload.pngBase64) {
    const heightIn = Math.max(2, (payload.pngHeightPx ?? 800) / 203 + 0.2);
    strategies.push(
      {
        label: 'image-simple',
        run: async () => {
          const config = qz.configs.create(printer, {
            colorType: 'grayscale',
            interpolation: 'nearest-neighbor',
            margins: 0,
            scaleContent: true,
          });
          await qz.print(config, [{
            type: 'pixel',
            format: 'image',
            flavor: 'base64',
            data: payload.pngBase64,
          }]);
        },
      },
      {
        label: 'image-sized',
        run: async () => {
          const config = qz.configs.create(printer, {
            size: { width: THERMAL_WIDTH_IN, height: heightIn },
            units: 'in',
            colorType: 'grayscale',
            interpolation: 'nearest-neighbor',
            margins: 0,
            scaleContent: true,
            rasterize: false,
          });
          await qz.print(config, [{
            type: 'pixel',
            format: 'image',
            flavor: 'base64',
            data: payload.pngBase64,
          }]);
        },
      },
      {
        label: 'image-raw',
        run: async () => {
          const config = qz.configs.create(printer, { encoding: 'UTF-8' });
          await qz.print(config, [{
            type: 'raw',
            format: 'image',
            flavor: 'base64',
            data: payload.pngBase64,
          }]);
        },
      },
    );
  }

  strategies.push(
    {
      label: 'html-plain',
      run: async () => {
        const config = qz.configs.create(printer, {
          size: { width: THERMAL_WIDTH_IN, height: 11 },
          units: 'in',
          colorType: 'grayscale',
          margins: 0,
          scaleContent: true,
          rasterize: false,
        });
        await qz.print(config, [{
          type: 'pixel',
          format: 'html',
          flavor: 'plain',
          data: payload.html,
        }]);
      },
    },
    {
      label: 'html-raster',
      run: async () => {
        const config = qz.configs.create(printer, {
          size: { width: THERMAL_WIDTH_IN, height: 11 },
          units: 'in',
          colorType: 'grayscale',
          interpolation: 'nearest-neighbor',
          margins: 0,
          scaleContent: true,
          rasterize: true,
        });
        await qz.print(config, [{
          type: 'pixel',
          format: 'html',
          flavor: 'plain',
          data: payload.html,
        }]);
      },
    },
  );

  const errors: string[] = [];
  for (const strategy of strategies) {
    const result = await runPrintStrategy(qz, printer, strategy.label, strategy.run);
    if (result.ok) return { method: result.method };
    errors.push(`${strategy.label}: ${result.error}`);
  }

  throw new Error(errors.join(' | ') || 'print-failed');
}

/** @deprecated استخدم printReceiptToQz */
export async function printHtmlToQz(printer: string, html: string): Promise<void> {
  await printReceiptToQz(printer, { html });
}

export async function silentPrintReceipt(payload: ReceiptPrintPayload): Promise<SilentPrintResult> {
  return silentPrintReceipts([payload]);
}

export async function silentPrintReceipts(payloads: ReceiptPrintPayload[]): Promise<SilentPrintResult> {
  if (!payloads.length) return { ok: false, reason: 'print-failed', message: 'لا يوجد ما يُطبع' };

  const qz = await loadQz();
  if (!qz) {
    return {
      ok: false,
      reason: 'qz-missing',
      message: 'ثبّت QZ Tray من qz.io وشغّله — مطلوب للطباعة الصامتة',
    };
  }

  const connected = await ensureQzConnected();
  if (!connected) {
    return {
      ok: false,
      reason: 'qz-disconnected',
      message: 'شغّل QZ Tray واضغط Allow عند طلب الاتصال (مرة واحدة)',
    };
  }

  const printer = await resolveQzPrinter();
  if (!printer) {
    return {
      ok: false,
      reason: 'no-printer',
      message: 'لم تُعثر على طابعة — افتح «طابعة» واكتب اسمها كما في Windows',
    };
  }

  const methods: string[] = [];
  try {
    for (let i = 0; i < payloads.length; i += 1) {
      const { method } = await printReceiptToQz(printer, payloads[i]!);
      methods.push(method);
      if (i < payloads.length - 1) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }
    return { ok: true, printer: `${printer} (${methods.join(' + ')})` };
  } catch (err) {
    const detail = err instanceof Error ? err.message : '';
    return {
      ok: false,
      reason: 'print-failed',
      message: `فشل الطباعة على «${printer}» — تأكد أنها مشغّلة.${detail ? ` (${detail.slice(0, 100)})` : ''}`,
    };
  }
}

/** @deprecated استخدم silentPrintReceipt */
export async function silentPrintHtml(html: string): Promise<SilentPrintResult> {
  return silentPrintReceipt({ html });
}

export async function getQzStatus(): Promise<'ready' | 'no-qz' | 'disconnected' | 'no-printer'> {
  const qz = await loadQz();
  if (!qz) return 'no-qz';
  if (!(await ensureQzConnected())) return 'disconnected';
  const printer = await resolveQzPrinter();
  if (!printer) return 'no-printer';
  return 'ready';
}
