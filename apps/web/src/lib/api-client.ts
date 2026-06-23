export function parseApiErrorBody(body?: string, fallback = 'طلب غير ناجح') {
  if (!body) return fallback;
  try {
    const parsed = JSON.parse(body) as { message?: string | string[] };
    const msg = parsed.message;
    if (Array.isArray(msg)) return msg.join('، ');
    if (typeof msg === 'string') return msg;
  } catch {
    /* plain text body */
  }
  return body;
}

export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000/api';

export type ApiResult<T = unknown> = {
  ok: boolean;
  data?: T;
  status?: number;
  body?: string;
  error?: string;
  unauthorized?: boolean;
};

export const AUTH_EXPIRED_EVENT = 'niha:auth-expired';

function clearAuthStorage() {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      localStorage.removeItem('roles');
      localStorage.removeItem('permissions');
    }
  } catch {
    /* ignore */
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<ApiResult<T>> {
  try {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> ?? {}),
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
    const data = text ? (JSON.parse(text) as T) : (undefined as T);
    return { ok: true, data };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

export function apiGet<T>(path: string, token?: string) {
  return apiFetch<T>(path, { method: 'GET' }, token);
}

export function apiPost<T>(path: string, body: unknown, token?: string) {
  return apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }, token);
}

export function apiPut<T>(path: string, body: unknown, token?: string) {
  return apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }, token);
}

export function apiDelete<T>(path: string, token?: string) {
  return apiFetch<T>(path, { method: 'DELETE' }, token);
}
