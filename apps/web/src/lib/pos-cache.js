const POS_CONTEXT_KEY = 'niha-pos-context-v1';
const POS_SESSION_KEY = 'niha-pos-session-v1';
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
export function readPosSessionCache() {
    try {
        const raw = sessionStorage.getItem(POS_SESSION_KEY);
        return raw ? JSON.parse(raw) : undefined;
    }
    catch {
        return undefined;
    }
}
export function writePosSessionCache(data) {
    try {
        sessionStorage.setItem(POS_SESSION_KEY, JSON.stringify({ ...data, _cachedAt: Date.now() }));
        writePosContextCache(data);
    }
    catch {
        /* ignore */
    }
}
export function readPosSessionCacheUpdatedAt() {
    try {
        const raw = sessionStorage.getItem(POS_SESSION_KEY);
        if (!raw)
            return undefined;
        const parsed = JSON.parse(raw);
        return typeof parsed._cachedAt === 'number' ? parsed._cachedAt : undefined;
    }
    catch {
        return undefined;
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
