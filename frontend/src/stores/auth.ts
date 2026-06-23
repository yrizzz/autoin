import { atom, computed } from 'nanostores';
import type { User } from '../types';
import { api, clearToken, setToken, getApiUrl } from '../lib/api';

export const $user = atom<User | null>(null);
export const $token = atom<string | null>(null);
export const $isAuthenticated = computed($user, (u) => u !== null);

export async function initAuth(): Promise<void> {
  if (typeof window === 'undefined') return;

  // Handle token from OAuth callback
  const params = new URLSearchParams(window.location.search);
  const tokenFromUrl = params.get('token');
  if (tokenFromUrl) {
    setToken(tokenFromUrl);
    $token.set(tokenFromUrl);
    window.history.replaceState({}, '', window.location.pathname);
  } else {
    const stored = localStorage.getItem('autoin_token');
    if (stored) $token.set(stored);
  }

  if ($token.get()) {
    try {
      const user = await api.get<User>('/api/me');
      $user.set(user);
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        clearToken();
        $token.set(null);
      }
    }
  }
}

export function logout(): void {
  clearToken();
  $token.set(null);
  $user.set(null);
  window.location.href = '/';
}

export function loginWithGoogle(): void {
  window.location.href = `${getApiUrl()}/auth/google`;
}
