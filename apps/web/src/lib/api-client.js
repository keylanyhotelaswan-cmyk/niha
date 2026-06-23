export function parseApiErrorBody(body, fallback = 'طلب غير ناجح') {
    if (!body)
        return fallback;
    try {
        const parsed = JSON.parse(body);
        const msg = parsed.message;
        if (Array.isArray(msg))
            return msg.join('، ');
        if (typeof msg === 'string')
            return msg;
    }
    catch {
        /* plain text body */
    }
    return body;
}
export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';
export const AUTH_EXPIRED_EVENT = 'niha:auth-expired';
function clearAuthStorage() {
    try {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
            localStorage.removeItem('roles');
            localStorage.removeItem('permissions');
        }
    }
    catch {
        /* ignore */
    }
}
export async function apiFetch(path, options = {}, token) {
    try {
        const headers = {
            ...(options.headers ?? {}),
        };
        if (!headers['Content-Type'] && options.body) {
            headers['Content-Type'] = 'application/json';
        }
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
        const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
        if (res.status === 401) {
            clearAuthStorage();
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
            }
            return { ok: false, status: 401, body: await res.text(), unauthorized: true };
        }
        if (!res.ok) {
            return { ok: false, status: res.status, body: await res.text() };
        }
        const text = await res.text();
        const data = text ? JSON.parse(text) : undefined;
        return { ok: true, data };
    }
    catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
    }
}
export function apiGet(path, token) {
    return apiFetch(path, { method: 'GET' }, token);
}
export function apiPost(path, body, token) {
    return apiFetch(path, { method: 'POST', body: JSON.stringify(body) }, token);
}
export function apiPut(path, body, token) {
    return apiFetch(path, { method: 'PUT', body: JSON.stringify(body) }, token);
}
export function apiDelete(path, token) {
    return apiFetch(path, { method: 'DELETE' }, token);
}
