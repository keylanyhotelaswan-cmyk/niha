const POS_CONTEXT_KEY = 'niha-pos-context-v1';
const POS_CATALOG_KEY = 'niha-pos-catalog-v1';
export function readPosContextCache() {
    try {
        const raw = sessionStorage.getItem(POS_CONTEXT_KEY);
        return raw ? JSON.parse(raw) : undefined;
    }
    catch {
        return undefined;
    }
}
export function writePosContextCache(data) {
    try {
        sessionStorage.setItem(POS_CONTEXT_KEY, JSON.stringify(data));
    }
    catch {
        /* ignore */
    }
}
export function readPosCatalogCache(branchId) {
    try {
        const raw = sessionStorage.getItem(POS_CATALOG_KEY);
        if (!raw)
            return undefined;
        const parsed = JSON.parse(raw);
        return parsed.branchId === branchId ? parsed.data : undefined;
    }
    catch {
        return undefined;
    }
}
export function writePosCatalogCache(branchId, data) {
    try {
        sessionStorage.setItem(POS_CATALOG_KEY, JSON.stringify({ branchId, data }));
    }
    catch {
        /* ignore */
    }
}
export function clearPosCatalogCache() {
    try {
        sessionStorage.removeItem(POS_CATALOG_KEY);
    }
    catch {
        /* ignore */
    }
}
