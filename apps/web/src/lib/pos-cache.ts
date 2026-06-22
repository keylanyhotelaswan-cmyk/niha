const POS_CONTEXT_KEY = 'niha-pos-context-v1';
const POS_CATALOG_KEY = 'niha-pos-catalog-v1';

export function readPosContextCache(): unknown | undefined {
  try {
    const raw = sessionStorage.getItem(POS_CONTEXT_KEY);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

export function writePosContextCache(data: unknown) {
  try {
    sessionStorage.setItem(POS_CONTEXT_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function readPosCatalogCache(branchId: string): unknown | undefined {
  try {
    const raw = sessionStorage.getItem(POS_CATALOG_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { branchId?: string; data?: unknown };
    return parsed.branchId === branchId ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export function writePosCatalogCache(branchId: string, data: unknown) {
  try {
    sessionStorage.setItem(POS_CATALOG_KEY, JSON.stringify({ branchId, data }));
  } catch {
    /* ignore */
  }
}
