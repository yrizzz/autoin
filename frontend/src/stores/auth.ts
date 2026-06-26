import { atom, computed } from 'nanostores';
import type { User } from '../types';
import { api, getApiUrl } from '../lib/api';

export const $user = atom<User | null>(null);
export const $isAuthenticated = computed($user, (u) => u !== null);

export async function initAuth(): Promise<void> {
  if (typeof window === 'undefined') return;

  // Sesi dipegang via cookie httpOnly (di-set oleh src/middleware.ts saat callback OAuth).
  // Cukup tanya /api/me lewat proxy; bila 401/403 berarti belum login.
  try {
    const user = await api.get<User>('/api/me');
    $user.set(user);
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) {
      $user.set(null);
    }
  }
}

export function logout(): void {
  // Proxy /api/logout membersihkan cookie sesi di origin app, lalu redirect.
  api.post('/api/logout').catch(() => {}).finally(() => {
    $user.set(null);
    window.location.href = '/';
  });
}

export function loginWithGoogle(): void {
  window.location.href = `${getApiUrl()}/auth/google`;
}
