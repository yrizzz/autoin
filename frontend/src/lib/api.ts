const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:8001';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('autoin_token');
}

export function setToken(token: string): void {
  localStorage.setItem('autoin_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('autoin_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',        // send HttpOnly cookie automatically
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  }).finally(() => clearTimeout(timer));

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return null as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
