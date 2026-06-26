import type { APIRoute } from 'astro';

// Endpoint ini WAJIB on-demand (bukan prerender) — ia berjalan di server Astro.
export const prerender = false;

// Alamat backend internal — env SERVER-ONLY (tidak pernah dibakar ke bundle client).
// Di prod set ke http://127.0.0.1:8001 (lihat ecosystem.config.cjs / deploy.sh).
const INTERNAL_API_URL = (
  process.env.INTERNAL_API_URL ??
  import.meta.env.INTERNAL_API_URL ??
  'http://127.0.0.1:8001'
).replace(/\/+$/, '');

// Header yang tidak boleh diteruskan apa adanya.
const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding', 'upgrade', 'host', 'content-length',
]);

const proxy: APIRoute = async ({ params, request, cookies, url }) => {
  const rest = params.path ?? '';
  const target = `${INTERNAL_API_URL}/api/${rest}${url.search}`;

  // Salin header request, buang yang sensitif/hop-by-hop.
  const headers = new Headers();
  for (const [key, value] of request.headers) {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  }
  // Jangan bocorkan cookie sesi app / origin browser ke backend.
  headers.delete('cookie');
  headers.delete('origin');
  headers.delete('referer');

  // Auth: ambil JWT dari cookie httpOnly milik origin app, kirim sebagai Bearer
  // (backend JWT guard / CookieToJwt menerima ini). Token tidak pernah terlihat oleh JS browser.
  const token = cookies.get('autoin_token')?.value;
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const init: RequestInit = { method: request.method, headers, redirect: 'manual' };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch {
    return new Response(JSON.stringify({ message: 'Upstream tidak dapat dijangkau.' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Logout: bersihkan cookie sesi di origin app (cookie backend di domain lain tidak relevan).
  if (rest === 'logout') {
    cookies.delete('autoin_token', { path: '/' });
  }

  // Teruskan response apa adanya; buang hop-by-hop & set-cookie milik backend.
  const respHeaders = new Headers();
  for (const [key, value] of upstream.headers) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower) || lower === 'set-cookie') continue;
    respHeaders.set(key, value);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: respHeaders,
  });
};

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
export const HEAD = proxy;
