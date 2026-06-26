// Origin backend asli — dipakai HANYA untuk navigasi penuh ke OAuth (`/auth/google`)
// dan beberapa URL tampilan media. Panggilan data (XHR) TIDAK lagi memakai ini:
// semuanya lewat origin app sendiri (proxy BFF di src/pages/api/[...path].ts).
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

// Sesi kini dipegang via cookie httpOnly milik origin app (di-set oleh src/middleware.ts
// saat callback OAuth) dan diteruskan ke backend secara server-side oleh proxy.
// Token tidak lagi disimpan di localStorage / dikirim sebagai header dari browser.
// Dua fungsi berikut dipertahankan agar import lama tetap valid (no-op).
export function setToken(_token: string): void { /* deprecated: sesi via httpOnly cookie */ }
export function clearToken(): void { /* deprecated: cookie dibersihkan server-side saat logout */ }

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit & { timeout?: number } = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = options.timeout ?? 60000; // Increased to 60 seconds
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const { timeout, ...fetchOptions } = options;

  // Same-origin: browser hanya menghubungi server Astro (path relatif `/api/...`);
  // proxy BFF yang meneruskan ke backend beserta JWT dari cookie httpOnly.
  const res = await fetch(path, {
    ...fetchOptions,
    credentials: 'include',
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
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
