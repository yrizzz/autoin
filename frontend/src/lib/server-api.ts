import type { AstroCookies } from 'astro';

// Alamat backend internal — env SERVER-ONLY (sama dengan proxy di src/pages/api/[...path].ts).
const INTERNAL_API_URL = (
  process.env.INTERNAL_API_URL ??
  import.meta.env.INTERNAL_API_URL ??
  'http://127.0.0.1:8001'
).replace(/\/+$/, '');

/**
 * Ambil data backend dari sisi SERVER Astro (server-to-server) memakai JWT dari
 * cookie httpOnly milik origin app. Dipakai di frontmatter `.astro` untuk pola
 * SSR data-as-props: hasilnya ditanam langsung ke HTML & dioper sebagai props ke
 * island React, sehingga data awal TIDAK menghasilkan XHR di browser.
 *
 * Mengembalikan null bila belum login / gagal — pemanggil bisa fallback ke fetch client.
 */
export async function serverApiGet<T>(path: string, cookies: AstroCookies): Promise<T | null> {
  const token = cookies.get('autoin_token')?.value;
  if (!token) return null;

  try {
    const res = await fetch(`${INTERNAL_API_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
