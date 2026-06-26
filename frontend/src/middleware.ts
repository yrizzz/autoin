import { defineMiddleware } from 'astro:middleware';

/**
 * Menangkap token JWT dari URL (`?token=...`) yang dikirim backend saat redirect
 * balik dari OAuth, lalu menyimpannya sebagai cookie httpOnly di origin app ini.
 *
 * Tujuan: sesi dipegang di origin Astro (mis. autoin.my.id) — bukan mengandalkan
 * cookie backend yang ada di subdomain berbeda (api.autoin.my.id) dan tak terkirim
 * lintas-subdomain. Setelah cookie di-set, token dibuang dari URL via redirect bersih,
 * dan tidak pernah masuk ke localStorage (tidak bisa dibaca JS / aman dari XSS).
 */
export const onRequest = defineMiddleware(async ({ url, cookies, redirect }, next) => {
  const token = url.searchParams.get('token');
  if (token) {
    cookies.set('autoin_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: import.meta.env.PROD,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    });
    const clean = new URL(url);
    clean.searchParams.delete('token');
    return redirect(clean.pathname + clean.search, 302);
  }

  return next();
});
