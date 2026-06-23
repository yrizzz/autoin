export function getApiUrl(): string {
  // 1. PUBLIC_API_URL is baked in at build time by deploy.sh (highest priority)
  const baked = import.meta.env.PUBLIC_API_URL;
  if (baked) return baked;

  // 2. Runtime fallback: if not on localhost, assume backend is on same host port 8001
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `${window.location.protocol}//${hostname}:8001`;
    }
  }

  // 3. Local dev default
  return 'http://localhost:8001';
}

const API_URL = getApiUrl();

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

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit & { timeout?: number } = {}): Promise<T> {
  const token = getToken();
  const controller = new AbortController();
  const timeoutMs = options.timeout ?? 60000; // Increased to 60 seconds
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const { timeout, ...fetchOptions } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    credentials: 'include',
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
    throw new ApiError(error.message ?? `HTTP ${res.status}`, res.status);
  }

  if (res.status === 204) return null as T;
  return res.json();
}

export const api = {
  get: <T>(path: string, options: RequestInit & { timeout?: number } = {}) => 
    request<T>(path, options),
  post: <T>(path: string, body?: unknown, options: RequestInit & { timeout?: number } = {}) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body), ...options }),
  put: <T>(path: string, body?: unknown, options: RequestInit & { timeout?: number } = {}) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body), ...options }),
  delete: <T>(path: string, options: RequestInit & { timeout?: number } = {}) => 
    request<T>(path, { method: 'DELETE', ...options }),
};
