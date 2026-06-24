// Worker eksekusi plugin: jalankan body handler user di vm context terbatas.
// Hanya `ctx`, `helpers`, dan builtin aman yang tersedia. Tidak ada require/fs/process
// yang diekspos ke konteks. `helpers.*` = satu-satunya jalan keluar (HTTP, dgn guard).
import { parentPort, workerData } from 'node:worker_threads';
import vm from 'node:vm';
import dns from 'node:dns/promises';
import net from 'node:net';

const { code, ctx, timeoutMs } = workerData;

const logs = [];
const MAX_REQUESTS = 10;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_TEXT_LEN = 8000;
const REQUEST_TIMEOUT = Math.min(Number(timeoutMs) || 8000, 15000);
let requestCount = 0;

// ── Anti-SSRF ───────────────────────────────────────────────────────────────
function isPrivateIp(ip) {
  if (net.isIP(ip) === 4) {
    const p = ip.split('.').map(Number);
    if (p[0] === 10) return true;
    if (p[0] === 127) return true;
    if (p[0] === 0) return true;
    if (p[0] === 169 && p[1] === 254) return true; // link-local / cloud metadata
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    return false;
  }
  const low = String(ip).toLowerCase();
  if (low === '::1' || low === '::') return true;
  if (low.startsWith('::ffff:')) return isPrivateIp(low.replace('::ffff:', ''));
  if (low.startsWith('fc') || low.startsWith('fd')) return true; // unique-local
  if (low.startsWith('fe80')) return true;                       // link-local
  return false;
}

async function assertSafeUrl(rawUrl) {
  let u;
  try { u = new URL(rawUrl); } catch { throw new Error('URL tidak valid'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('Hanya http/https yang diizinkan');
  }
  const host = u.hostname;
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error('Akses ke IP privat ditolak');
    return;
  }
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('Akses ke host internal ditolak');
  }
  let addrs = [];
  try { addrs = await dns.lookup(host, { all: true }); } catch { throw new Error('Gagal resolve host'); }
  for (const a of addrs) {
    if (isPrivateIp(a.address)) throw new Error('Host menunjuk ke IP privat');
  }
}

async function safeFetch(url, opts = {}) {
  if (++requestCount > MAX_REQUESTS) throw new Error('Batas request plugin tercapai');
  await assertSafeUrl(url);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const res = await fetch(url, {
      method: opts.method || 'GET',
      headers: opts.headers || {},
      body: opts.body,
      redirect: 'follow',
      signal: controller.signal,
    });
    const len = Number(res.headers.get('content-length') || 0);
    if (len && len > MAX_RESPONSE_BYTES) throw new Error('Respons terlalu besar');
    return res;
  } finally {
    clearTimeout(t);
  }
}

async function readLimited(res) {
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_RESPONSE_BYTES) throw new Error('Respons terlalu besar');
  return buf;
}

// ── Multipart upload (untuk endpoint yang menerima file, mis. removeBg/imageHd) ──
function dataToBuffer(data) {
  if (Buffer.isBuffer(data)) return data;
  if (typeof data === 'string') {
    const m = /^data:([^;,]*)(;base64)?,([\s\S]*)$/.exec(data);
    if (m) return m[2] ? Buffer.from(m[3], 'base64') : Buffer.from(decodeURIComponent(m[3]));
    return Buffer.from(data, 'base64'); // anggap base64 polos
  }
  throw new Error('upload: file.data harus Buffer / base64 / data URL');
}

function buildMultipart(fields, file) {
  const boundary = '----autoin' + Math.random().toString(16).slice(2) + Date.now().toString(16);
  const CRLF = '\r\n';
  const parts = [];
  for (const [name, value] of Object.entries(fields || {})) {
    parts.push(Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="${name}"${CRLF}${CRLF}${value}${CRLF}`));
  }
  parts.push(Buffer.from(
    `--${boundary}${CRLF}Content-Disposition: form-data; name="${file.field}"; filename="${file.filename}"${CRLF}Content-Type: ${file.contentType}${CRLF}${CRLF}`
  ));
  parts.push(file.buffer, Buffer.from(CRLF));
  parts.push(Buffer.from(`--${boundary}--${CRLF}`));
  return { body: Buffer.concat(parts), boundary };
}

const helpers = {
  log: (...a) => {
    logs.push(a.map(x => (typeof x === 'string' ? x : safeStringify(x))).join(' '));
  },
  // helpers.upload(url, { data, field?, filename?, contentType? }, { fields?, headers? })
  // data: ctx.media.dataUrl / base64 / Buffer. Mengembalikan JSON (atau teks) seperti helpers.post.
  async upload(url, file, opts = {}) {
    if (!file || file.data == null) throw new Error('upload: file.data wajib (mis. ctx.media.dataUrl)');
    const buffer = dataToBuffer(file.data);
    if (buffer.length > MAX_RESPONSE_BYTES) throw new Error('File untuk upload terlalu besar (maks 5MB)');
    const { body, boundary } = buildMultipart(opts.fields || {}, {
      field: file.field || 'image',
      filename: file.filename || 'upload.bin',
      contentType: file.contentType || 'application/octet-stream',
      buffer,
    });
    const res = await safeFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, ...(opts.headers || {}) },
      body,
    });
    const ct = res.headers.get('content-type') || '';
    const b = await readLimited(res);
    return ct.includes('application/json') ? JSON.parse(b.toString('utf8')) : b.toString('utf8');
  },
  async getJson(url, opts) {
    const b = await readLimited(await safeFetch(url, opts));
    return JSON.parse(b.toString('utf8'));
  },
  async getText(url, opts) {
    const b = await readLimited(await safeFetch(url, opts));
    return b.toString('utf8');
  },
  async getBuffer(url, opts) {
    return readLimited(await safeFetch(url, opts));
  },
  async post(url, body, opts = {}) {
    const isJson = body && typeof body === 'object' && !Buffer.isBuffer(body);
    const res = await safeFetch(url, {
      method: 'POST',
      headers: { ...(isJson ? { 'Content-Type': 'application/json' } : {}), ...(opts.headers || {}) },
      body: isJson ? JSON.stringify(body) : body,
    });
    const ct = res.headers.get('content-type') || '';
    const b = await readLimited(res);
    return ct.includes('application/json') ? JSON.parse(b.toString('utf8')) : b.toString('utf8');
  },
};

function safeStringify(x) {
  try { return JSON.stringify(x); } catch { return String(x); }
}

function normalize(out) {
  if (out == null) return null;
  if (typeof out === 'string') return { text: out };
  if (typeof out === 'object') {
    const o = {};
    if (out.text != null) o.text = String(out.text);
    const mu = out.mediaUrl ?? out.media_url;
    const mt = out.mediaType ?? out.media_type;
    if (mu != null) o.mediaUrl = String(mu);
    if (mt != null) o.mediaType = String(mt);
    return o;
  }
  return { text: String(out) };
}

(async () => {
  try {
    const sandbox = {
      ctx, helpers,
      JSON, Math, Date, Promise, RegExp, Error,
      String, Number, Boolean, Array, Object,
      parseInt, parseFloat, isNaN, isFinite,
      encodeURIComponent, decodeURIComponent, encodeURI, decodeURI,
    };
    vm.createContext(sandbox);

    // Bungkus body user jadi async IIFE; `return` mereka jadi nilai output.
    const wrapped = `(async () => {\n${code}\n})()`;
    const result = await vm.runInContext(wrapped, sandbox, {
      timeout: REQUEST_TIMEOUT,
      filename: 'plugin.js',
    });

    const output = normalize(result);
    if (output?.text && output.text.length > MAX_TEXT_LEN) {
      output.text = output.text.slice(0, MAX_TEXT_LEN);
    }
    parentPort.postMessage({ ok: true, output, logs });
  } catch (err) {
    parentPort.postMessage({ ok: false, error: String(err?.message || err), logs });
  }
})();
