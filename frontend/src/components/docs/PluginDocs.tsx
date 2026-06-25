import React, { useState } from 'react';
import AdminLayout from '../layout/AdminLayout';
import CodeEditor from '../ui/CodeEditor';
import { Puzzle, Copy, Check, Terminal, Zap, ShieldCheck, AlertTriangle, ArrowRight } from 'lucide-react';

const EX_XPROFILE = `// .xprofile <username>  -> balas info profil X/Twitter + foto
const API_KEY = 'pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const username = (ctx.args[0] || '').replace('@','').trim();
if (!username) return 'Pemakaian: .xprofile <username>';

const res = await helpers.getJson(
  'https://api.yrizzz.my.id/api/execute/v1/socialmedia/xprofile?username=' + encodeURIComponent(username),
  { headers: { 'x-api-key': API_KEY } }
);
if (!res || res.status !== true || !res.data) return 'Profil @' + username + ' tidak ditemukan.';

const d = res.data;
const text =
  '👤 *' + (d.name || username) + '*  (@' + d.screen_name + ')\\n' +
  '👥 Followers: ' + Number(d.followers_count ?? 0).toLocaleString('id-ID') + '\\n' +
  '➡️ Following: ' + Number(d.following_count ?? 0).toLocaleString('id-ID');

return { text, mediaUrl: d.profile_image || null, mediaType: d.profile_image ? 'image' : null };`;

// Instagram lengkap: profil + statistik + foto profil (pakai 1 endpoint igprofile)
const EX_IG = `// .ig <username>  -> profil Instagram lengkap + foto profil
const API_KEY = 'pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const username = (ctx.args[0] || '').replace('@','').trim();
if (!username) return 'Pemakaian: .ig <username>';

const res = await helpers.post(
  'https://api.yrizzz.my.id/api/execute/v1/socialmedia/igprofile',
  { username },
  { headers: { 'x-api-key': API_KEY } }
);
if (!res || res.status !== true || !res.data) {
  return 'Akun @' + username + ' tidak ditemukan' + (res && res.message ? ' (' + res.message + ')' : '') + '.';
}

const d = res.data;
const p = d.profile || {};
const fmt = (n) => Number(n || 0).toLocaleString('id-ID');
const badge = (p.is_verified ? ' ✅' : '') + (p.is_private ? ' 🔒' : '');

const lines = [
  '📸 *' + (p.full_name || username) + '*  (@' + (p.username || username) + ')' + badge,
  '',
  '👥 Followers : ' + fmt(p.follower_count),
  '➡️ Following : ' + fmt(p.following_count),
  '🖼️ Postingan : ' + fmt(p.post_count),
];
if (p.biography)   lines.push('', '📝 ' + p.biography);
if (p.external_url) lines.push('🔗 ' + p.external_url);
lines.push(
  '',
  '🧩 Konten terambil:',
  '• ' + d.posts_count + ' post terbaru   • ' + d.stories_count + ' story aktif   • ' + d.highlights_count + ' highlight',
  '',
  'instagram.com/' + (p.username || username)
);

return {
  text: lines.join('\\n'),
  mediaUrl: p.profile_pic_url || null,
  mediaType: p.profile_pic_url ? 'image' : null,
};`;

// Postingan terbaru (carousel diambil media pertamanya)
const EX_IGPOST = `// .igpost <username>  -> postingan terbaru (media + caption)
const API_KEY = 'pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const username = (ctx.args[0] || '').replace('@','').trim();
if (!username) return 'Pemakaian: .igpost <username>';

const res = await helpers.post(
  'https://api.yrizzz.my.id/api/execute/v1/socialmedia/igprofile',
  { username, count: 1 },
  { headers: { 'x-api-key': API_KEY } }
);
const posts = res && res.status === true ? (res.data && res.data.posts) || [] : [];
if (posts.length === 0) return 'Tidak ada postingan untuk @' + username + '.';

const post  = posts[0];
const first = (post.carousel_media && post.carousel_media[0]) || post; // carousel -> media pertama
const isVideo = first.media_type === 'video' || !!first.video_url;
const url = isVideo ? (first.video_url || first.image_url) : first.image_url;
const cap = (post.caption || '').slice(0, 500);

const text =
  '📷 *Postingan terbaru @' + username + '*\\n' +
  '❤️ ' + Number(post.like_count || 0).toLocaleString('id-ID') +
  '   💬 ' + Number(post.comment_count || 0).toLocaleString('id-ID') +
  (cap ? '\\n\\n' + cap : '') +
  '\\n\\ninstagram.com/p/' + post.shortcode;

return { text, mediaUrl: url || null, mediaType: url ? (isVideo ? 'video' : 'image') : null };`;

// Story aktif terbaru (kalau ada)
const EX_IGSTORY = `// .igstory <username>  -> story aktif terbaru
const API_KEY = 'pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const username = (ctx.args[0] || '').replace('@','').trim();
if (!username) return 'Pemakaian: .igstory <username>';

const res = await helpers.post(
  'https://api.yrizzz.my.id/api/execute/v1/socialmedia/igprofile',
  { username },
  { headers: { 'x-api-key': API_KEY } }
);
if (!res || res.status !== true) return 'Akun @' + username + ' tidak ditemukan.';

const stories = (res.data && res.data.stories) || [];
if (stories.length === 0) {
  return res.data && res.data.profile && res.data.profile.is_private
    ? '🔒 Akun @' + username + ' privat — story tidak bisa diambil.'
    : '@' + username + ' tidak punya story aktif saat ini.';
}

const s = stories[0];
const isVideo = s.media_type === 'video' || !!s.video_url;
const url = isVideo ? (s.video_url || s.image_url) : s.image_url;

return {
  text: '👻 *Story aktif @' + username + '*\\n📦 Total story aktif: ' + stories.length,
  mediaUrl: url || null,
  mediaType: url ? (isVideo ? 'video' : 'image') : null,
};`;

// TikTok: profil + foto (endpoint ttprofile, balas data webapp.user-detail mentah)
const EX_TIKTOK = `// .tiktok <username>  -> profil TikTok + foto profil
const API_KEY = 'pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const username = (ctx.args[0] || '').replace('@','').trim();
if (!username) return 'Pemakaian: .tiktok <username>';

const res = await helpers.getJson(
  'https://api.yrizzz.my.id/api/execute/v1/socialmedia/ttprofile?username=' + encodeURIComponent(username),
  { headers: { 'x-api-key': API_KEY } }
);
const info = res && res.status === true && res.data ? res.data.userInfo : null;
if (!info || !info.user) {
  return 'Akun TikTok @' + username + ' tidak ditemukan' + (res && res.message ? ' (' + res.message + ')' : '') + '.';
}

const u = info.user;
const s = info.stats || {};
const fmt = (n) => Number(n || 0).toLocaleString('id-ID');
const badge = (u.verified ? ' ✅' : '') + (u.privateAccount ? ' 🔒' : '');

const lines = [
  '🎵 *' + (u.nickname || username) + '*  (@' + (u.uniqueId || username) + ')' + badge,
  '',
  '👥 Followers : ' + fmt(s.followerCount),
  '➡️ Following : ' + fmt(s.followingCount),
  '❤️ Likes     : ' + fmt(s.heartCount || s.heart),
  '🎬 Video     : ' + fmt(s.videoCount),
];
if (u.signature) lines.push('', '📝 ' + u.signature);
lines.push('', 'tiktok.com/@' + (u.uniqueId || username));

const pic = u.avatarLarger || u.avatarMedium || u.avatarThumb || null;
return { text: lines.join('\\n'), mediaUrl: pic, mediaType: pic ? 'image' : null };`;

// Domain / WHOIS lookup lengkap (endpoint domaininfo, GET 1 argumen domain)
const EX_DOMAIN = `// .domain <domain>  -> info domain LENGKAP (registrar, whois, umur, tanggal)
const API_KEY = 'pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

// terima "google.com", "https://google.com/x", "@google.com" -> google.com
const domain = (ctx.args[0] || '')
  .trim().toLowerCase()
  .replace(/^https?:\\/\\//, '')
  .replace(/^www\\./, '')
  .replace(/\\/.*$/, '')
  .replace(/^@/, '');
if (!domain || !domain.includes('.')) return 'Pemakaian: .domain <domain.com>';

const res = await helpers.getJson(
  'https://api.yrizzz.my.id/api/execute/v1/domain/domaininfo?domain=' + encodeURIComponent(domain),
  { headers: { 'x-api-key': API_KEY } }
);
if (!res || res.status !== true || !res.data) {
  return '❌ Info domain *' + domain + '* tidak ditemukan' + (res && res.message ? ' (' + res.message + ')' : '') + '.';
}

const d = res.data;
const val = (v) => (v && v !== '-') ? v : '—';

const lines = [
  '🌐 *' + domain + '*',
  '',
  '🏢 Registrar : ' + val(d.name),
  '🔗 Registrar URL : ' + val(d.registrar),
  '📖 WHOIS : ' + val(d.whois),
  '',
  '⏳ Umur : ' + val(d.age),
  '📅 Dibuat : ' + val(d.created),
  '🔄 Diperbarui : ' + val(d.updated),
  '⌛ Kedaluwarsa : ' + val(d.expired),
];

return { text: lines.join('\\n') };`;

// Olah gambar: hapus background. Ambil gambar dari ctx.media (reply / caption), upload, balas hasil.
const EX_REMOVEBG = `// .removebg  -> hapus background dari gambar yang kamu kirim / reply
const API_KEY = 'pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

// Gambar diambil dari pesan yang kamu kirim bareng ".removebg" (caption),
// atau dari pesan gambar yang kamu reply.
if (!ctx.media)                       return 'Kirim *gambar* dengan caption .removebg, atau reply gambar lalu ketik .removebg';
if (ctx.media.mediaType !== 'image')  return 'Khusus gambar ya 🙏';
if (ctx.media.tooLarge)               return 'Gambar terlalu besar (maks 8MB).';

const res = await helpers.upload(
  'https://api.yrizzz.my.id/api/execute/v1/tool/removeBg',
  { data: ctx.media.dataUrl, field: 'image', filename: 'input.png', contentType: ctx.media.mimetype },
  { headers: { 'x-api-key': API_KEY } }
);
if (!res || res.status !== true || !res.data) {
  return 'Gagal memproses' + (res && res.message ? ': ' + res.message : '') + '.';
}

// API bisa balas URL (http...) atau base64 mentah → keduanya didukung.
const out = res.data;
const mediaUrl = (typeof out === 'string' && out.startsWith('http')) ? out : 'data:image/png;base64,' + out;
return { text: '✅ Background dihapus!', mediaUrl, mediaType: 'image' };`;

// Upscale / HD. Catatan: proses bisa lama → set timeout plugin ke 15s.
const EX_HD = `// .hd  -> tingkatkan resolusi (upscale) gambar yang kamu kirim / reply
const API_KEY = 'pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
if (!ctx.media)                      return 'Kirim gambar dgn caption .hd, atau reply gambar lalu ketik .hd';
if (ctx.media.mediaType !== 'image') return 'Khusus gambar ya 🙏';
if (ctx.media.tooLarge)              return 'Gambar terlalu besar (maks 8MB).';

const res = await helpers.upload(
  'https://api.yrizzz.my.id/api/execute/v1/tool/imageHd',
  { data: ctx.media.dataUrl, field: 'image', filename: 'input.png', contentType: ctx.media.mimetype },
  { headers: { 'x-api-key': API_KEY } }
);
if (!res || res.status !== true || !res.data) {
  return 'Gagal upscale' + (res && res.message ? ': ' + res.message : '') + '.';
}
const out = res.data;
const mediaUrl = (typeof out === 'string' && out.startsWith('http')) ? out : 'data:image/png;base64,' + out;
return { text: '✨ Gambar di-HD-kan!', mediaUrl, mediaType: 'image' };`;

// Ganti background jadi warna solid (param "color")
const EX_IMAGEBG = `// .bg <warna>  -> ganti background jadi warna solid (mis. .bg red). Default: blue
const API_KEY = 'pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
if (!ctx.media)                      return 'Kirim gambar dgn caption ".bg <warna>", atau reply gambar lalu ketik .bg <warna>';
if (ctx.media.mediaType !== 'image') return 'Khusus gambar ya 🙏';
if (ctx.media.tooLarge)              return 'Gambar terlalu besar (maks 8MB).';

const color = (ctx.args[0] || 'blue').trim();
const res = await helpers.upload(
  'https://api.yrizzz.my.id/api/execute/v1/tool/imageBg',
  { data: ctx.media.dataUrl, field: 'image', filename: 'input.png', contentType: ctx.media.mimetype },
  { fields: { color }, headers: { 'x-api-key': API_KEY } }   // field tambahan lewat opts.fields
);
if (!res || res.status !== true || !res.data) {
  return 'Gagal mengganti background' + (res && res.message ? ': ' + res.message : '') + '.';
}
const out = res.data;
const mediaUrl = (typeof out === 'string' && out.startsWith('http')) ? out : 'data:image/png;base64,' + out;
return { text: '🎨 Background diganti jadi ' + color + '!', mediaUrl, mediaType: 'image' };`;

// Konversi format gambar (param "type")
const EX_IMAGECV = `// .convert <format>  -> ubah format gambar (png/jpg/webp/avif/heic...). Default: png
const API_KEY = 'pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
if (!ctx.media)                      return 'Kirim gambar dgn caption ".convert <format>", atau reply gambar lalu ketik .convert <format>';
if (ctx.media.mediaType !== 'image') return 'Khusus gambar ya 🙏';
if (ctx.media.tooLarge)              return 'Gambar terlalu besar (maks 8MB).';

const type = (ctx.args[0] || 'png').toLowerCase().replace('.', '').trim();
const res = await helpers.upload(
  'https://api.yrizzz.my.id/api/execute/v1/tool/imageCv',
  { data: ctx.media.dataUrl, field: 'image', filename: 'input.png', contentType: ctx.media.mimetype },
  { fields: { type }, headers: { 'x-api-key': API_KEY } }
);
if (!res || res.status !== true || !res.data) {
  return 'Gagal konversi' + (res && res.message ? ': ' + res.message : '') + '.';
}
const out = res.data;
const mime = 'image/' + (type === 'jpg' ? 'jpeg' : type);
const mediaUrl = (typeof out === 'string' && out.startsWith('http')) ? out : 'data:' + mime + ';base64,' + out;
// png/jpg/webp/gif bisa tampil sbg gambar; format lain (avif/heic) dikirim sbg dokumen
const viewable = ['png','jpg','jpeg','webp','gif'].includes(type);
return { text: '🔄 Dikonversi ke ' + type.toUpperCase(), mediaUrl, mediaType: viewable ? 'image' : 'document' };`;

// Universal downloader: TikTok / Instagram / YouTube / Facebook / Twitter / dll.
// Pakai endpoint baru /v1/socialmedia/download (jalankan add-download-to-db.js di Porto dulu).
const EX_DOWNLOAD = `// .download <link>  -> unduh media dari TikTok/IG/YouTube/Facebook/Twitter dll.
const API_KEY = 'pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const url = (ctx.rawArgs || ctx.args[0] || '').trim();
if (!/^https?:\\/\\//i.test(url)) {
  return 'Pemakaian: .download <link>\\nContoh: .download https://vt.tiktok.com/xxxxx';
}

const res = await helpers.getJson(
  'https://api.yrizzz.my.id/api/execute/v1/socialmedia/download?url=' + encodeURIComponent(url),
  { headers: { 'x-api-key': API_KEY } }
);
const medias = (res && res.status === true && res.data) ? (res.data.medias || []) : [];
if (medias.length === 0) {
  return '❌ Gagal mengunduh' + (res && res.message ? ': ' + res.message : '') + '.';
}

const d = res.data;
const EMOJI = { tiktok:'🎵', instagram:'📸', youtube:'▶️', facebook:'📘', twitter:'🐦' };
const icon = EMOJI[d.source] || '⬇️';

// endpoint sudah urutkan video dulu → ambil yang pertama sebagai media utama
const pick = medias[0];

let text = icon + ' *Download ' + (d.source || 'media').toUpperCase() + '*';
if (d.title) text += '\\n📝 ' + d.title.slice(0, 200);
if (d.author) text += '\\n👤 ' + d.author;

// tawarkan media lain (kualitas/format) sebagai link tap — maks 6 biar nggak spam
const others = medias.slice(1, 7);
if (others.length) {
  text += '\\n\\n🔗 Lainnya:\\n' + others.map(m => '• ' + (m.label || m.type) + ': ' + m.url).join('\\n');
  if (medias.length > 7) text += '\\n• …dan ' + (medias.length - 7) + ' lagi';
}

return { text, mediaUrl: pick.url, mediaType: pick.type };`;

const EX_PING = `// .ping  -> balasan teks sederhana
return 'pong 🏓';`;

const EX_ARGS = `// .hitung 10 5  -> contoh pakai argumen & balas objek
const a = Number(ctx.args[0] || 0);
const b = Number(ctx.args[1] || 0);
helpers.log('input', a, b);            // muncul di panel Tes
return { text: a + ' + ' + b + ' = ' + (a + b) };`;

const CTX_ROWS: [string, string][] = [
  ['ctx.args', 'Array argumen setelah command. ".xprofile budi andi" → ["budi","andi"].'],
  ['ctx.rawArgs', 'String mentah semua argumen. → "budi andi".'],
  ['ctx.sender', 'JID pengirim (mis. "628xx@s.whatsapp.net").'],
  ['ctx.chatId', 'JID chat/grup tempat command dikirim.'],
  ['ctx.sessionId', 'ID sesi device WhatsApp.'],
  ['ctx.media', 'Media dari gambar yang dikirim bareng command ATAU yang di-reply. null bila tak ada. Isi: { mediaType, mimetype, size, dataUrl }. dataUrl = base64 siap dipakai helpers.upload.'],
];

const HELPER_ROWS: [string, string][] = [
  ['await helpers.getJson(url, opts?)', 'GET lalu parse JSON. opts: { headers, method, body }.'],
  ['await helpers.getText(url, opts?)', 'GET dan kembalikan teks mentah.'],
  ['await helpers.getBuffer(url, opts?)', 'GET dan kembalikan Buffer (mis. untuk media).'],
  ['await helpers.post(url, body, opts?)', 'POST. body objek → otomatis JSON.'],
  ['await helpers.upload(url, file, opts?)', 'Upload file (multipart). file: { data, field?, filename?, contentType? } — data biasanya ctx.media.dataUrl. opts: { fields, headers }. Dipakai untuk endpoint olah gambar.'],
  ['helpers.log(...args)', 'Catat ke log (muncul di panel Tes). Bukan untuk balasan.'],
];

function Code({ id, code }: { id: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-zinc-800/80 text-zinc-300 hover:text-white opacity-0 group-hover:opacity-100 transition">
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <CodeEditor value={code} onChange={() => {}} readOnly minRows={Math.max(code.split('\n').length, 1)} />
    </div>
  );
}

function Section({ n, title, icon, children }: { n: string; title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
        <span className="w-5 h-5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm shadow-blue-500/30">{n}</span>
        {icon}{title}
      </h2>
      {children}
    </section>
  );
}

export default function PluginDocs() {
  return (
    <AdminLayout activePage="plugins" title="Dokumentasi Plugin">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
            <Puzzle className="w-6 h-6 text-blue-500" /> Dokumentasi Plugin
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Plugin = <b>script JS</b> yang kamu tulis. Pemicunya (prefix + trigger, mis.
            <code className="font-mono text-blue-500"> .xprofile budi</code>) diatur di halaman <b>Chatbot</b> saat
            plugin dipilih sebagai balasan. Script berjalan di sandbox aman dengan batas waktu.
          </p>
        </div>

        {/* 1. Alur */}
        <Section n="1" title="Cara kerja" icon={<Zap className="w-4 h-4 text-amber-500" />}>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700">
            <span className="font-mono">Pesan masuk</span> <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-mono">cocok dgn rule chatbot (prefix+trigger)</span> <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-mono">jalankan script plugin (sandbox)</span> <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-mono">kirim output</span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            <b>Plugin hanya menyediakan script.</b> Kapan ia berjalan ditentukan oleh <b>rule chatbot</b> yang
            memilihnya: di sanalah kamu atur prefix &amp; trigger. Teks setelah trigger menjadi <code className="font-mono">ctx.args</code>.
          </p>
        </Section>

        {/* 2. Membuat plugin */}
        <Section n="2" title="Membuat & memasang plugin">
          <ol className="text-sm text-zinc-600 dark:text-zinc-300 space-y-1.5 list-decimal list-inside">
            <li>Buka menu <b>Plugin / Extension</b> → <b>Tambah Plugin</b>.</li>
            <li>Isi <b>Nama</b> + <b>Deskripsi</b>, lalu tulis <b>Script</b> (body handler) di editor.</li>
            <li>Klik <b>Simpan</b>, lalu <b>Tes</b> dengan contoh argumen untuk melihat output/log/error.</li>
            <li>Pastikan plugin <b>Aktif</b>.</li>
            <li>Buka halaman <b>Chatbot</b> → buat rule, pilih mode <b>Plugin</b>, set <b>Prefix</b> &amp; <b>Trigger</b> (mis. <code className="font-mono">xprofile</code>), lalu pilih plugin ini.</li>
          </ol>
        </Section>

        {/* 3. Anatomi pemicu */}
        <Section n="3" title="Anatomi pemicu (diatur di Chatbot)">
          <Code id="anat" code={'.xprofile  username\n│ │         └── ctx.args[0]\n│ └────────── trigger (rule chatbot)\n└──────────── prefix (rule chatbot)'} />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Prefix &amp; trigger berasal dari <b>rule chatbot</b> yang memakai plugin ini — bukan dari plugin-nya.
            Trigger tidak peka huruf besar/kecil; argumen tetap apa adanya.
          </p>
        </Section>

        {/* 4. Kontrak script */}
        <Section n="4" title="Kontrak base script" icon={<Terminal className="w-4 h-4 text-zinc-500" />}>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Kamu menulis <b>body handler</b>. Tersedia dua variabel global: <code className="font-mono text-blue-500">ctx</code> dan
            <code className="font-mono text-blue-500"> helpers</code>. Script <b>wajib</b> <code className="font-mono">return</code> output.
          </p>

          <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mt-2">ctx — data pesan masuk</div>
          <table className="w-full text-left text-xs border-collapse">
            <tbody className="divide-y divide-zinc-200/40 dark:divide-zinc-800">
              {CTX_ROWS.map(([k, v]) => (
                <tr key={k}>
                  <td className="py-2 pr-3 font-mono text-blue-600 dark:text-blue-400 whitespace-nowrap align-top">{k}</td>
                  <td className="py-2 text-zinc-500 dark:text-zinc-400">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mt-3">helpers — akses keluar (HTTP)</div>
          <table className="w-full text-left text-xs border-collapse">
            <tbody className="divide-y divide-zinc-200/40 dark:divide-zinc-800">
              {HELPER_ROWS.map(([k, v]) => (
                <tr key={k}>
                  <td className="py-2 pr-3 font-mono text-blue-600 dark:text-blue-400 whitespace-nowrap align-top">{k}</td>
                  <td className="py-2 text-zinc-500 dark:text-zinc-400">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* 5. Format output */}
        <Section n="5" title="Format output (return)">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Boleh kembalikan <b>string</b> (jadi teks biasa) atau <b>objek</b>:
          </p>
          <Code id="out" code={`return 'teks saja';
// atau:
return {
  text: 'caption / pesan',
  mediaUrl: 'https://.../gambar.jpg', // opsional
  mediaType: 'image',                 // image | video | audio | document
};`} />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Kalau tidak ada <code className="font-mono">text</code> maupun <code className="font-mono">mediaUrl</code>, bot tidak membalas.
            Format teks WhatsApp: <code className="font-mono">*tebal*</code>, <code className="font-mono">_miring_</code>, <code className="font-mono">{'`mono`'}</code>, dan <code className="font-mono">\n</code> untuk baris baru.
          </p>
        </Section>

        {/* 6. Contoh */}
        <Section n="6" title="Contoh plugin">
          <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400">a. Paling sederhana — <span className="font-mono">.ping</span></div>
          <Code id="ping" code={EX_PING} />
          <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mt-2">b. Pakai argumen + log — <span className="font-mono">.hitung 10 5</span></div>
          <Code id="args" code={EX_ARGS} />
          <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mt-2">c. Fetch API + media — <span className="font-mono">.xprofile budi</span></div>
          <Code id="xp" code={EX_XPROFILE} />
        </Section>

        {/* 7. Instagram (lengkap) */}
        <Section n="7" title="Instagram (lengkap)">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Tiga plugin di bawah memakai <b>satu endpoint</b> yang sama
            (<code className="font-mono text-blue-500">/v1/socialmedia/igprofile</code> di yrizzz.my.id) — sekali panggil
            sudah mengembalikan <b>profil, postingan, story, &amp; highlight</b>. Ganti
            <code className="font-mono"> API_KEY</code> dengan API key kamu, dan atur prefix/trigger
            (<code className="font-mono">ig</code>, <code className="font-mono">igpost</code>, <code className="font-mono">igstory</code>)
            di halaman <b>Chatbot</b>.
          </p>
          <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400">a. Profil lengkap + foto — <span className="font-mono">.ig cristiano</span></div>
          <Code id="ig" code={EX_IG} />
          <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mt-2">b. Postingan terbaru — <span className="font-mono">.igpost cristiano</span></div>
          <Code id="igpost" code={EX_IGPOST} />
          <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mt-2">c. Story aktif — <span className="font-mono">.igstory cristiano</span></div>
          <Code id="igstory" code={EX_IGSTORY} />
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
            Catatan: foto/video Instagram dikirim sebagai <code className="font-mono">mediaUrl</code> tunggal —
            untuk carousel diambil media pertama, untuk story diambil yang terbaru. Akun privat &amp; rate-limit
            ditangani lewat <code className="font-mono">res.status</code>/<code className="font-mono">res.message</code> dari API.
          </p>
        </Section>

        {/* 8. Plugin lain (TikTok & Domain) */}
        <Section n="8" title="Plugin lain (TikTok & Domain)">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Pola yang sama bisa dipakai untuk endpoint yrizzz.my.id lain yang cukup 1 argumen
            (tanpa upload file). Atur prefix/trigger (<code className="font-mono">tiktok</code>, <code className="font-mono">domain</code>)
            di halaman <b>Chatbot</b>.
          </p>
          <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400">a. Profil TikTok + foto — <span className="font-mono">.tiktok khaby.lame</span></div>
          <Code id="tiktok" code={EX_TIKTOK} />
          <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mt-2">b. Cek domain / WHOIS (lengkap) — <span className="font-mono">.domain google.com</span></div>
          <Code id="domain" code={EX_DOMAIN} />
        </Section>

        {/* 9. Olah gambar (pakai ctx.media) */}
        <Section n="9" title="Olah gambar — kirim / reply gambar">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Plugin bisa <b>memproses gambar</b> dari WhatsApp. Saat command dipicu, bot otomatis mengisi
            <code className="font-mono text-blue-500"> ctx.media</code> dari:
          </p>
          <ul className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1 list-disc list-inside">
            <li>gambar yang dikirim <b>bersama caption</b> (mis. kirim foto, captionnya <code className="font-mono">.removebg</code>), atau</li>
            <li>gambar yang <b>kamu reply</b> lalu ketik command (mis. reply foto → <code className="font-mono">.removebg</code>).</li>
          </ul>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            <code className="font-mono">ctx.media</code> berisi <code className="font-mono">{'{ mediaType, mimetype, size, dataUrl }'}</code>.
            Kirim <code className="font-mono">dataUrl</code> ke endpoint via <code className="font-mono">helpers.upload(...)</code>, lalu balas hasilnya —
            API boleh mengembalikan URL <i>atau</i> base64, bot mendukung keduanya (termasuk balasan <code className="font-mono">data:</code> URI).
          </p>
          <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400">a. Hapus background — <span className="font-mono">.removebg</span></div>
          <Code id="removebg" code={EX_REMOVEBG} />
          <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mt-2">b. Upscale / HD — <span className="font-mono">.hd</span></div>
          <Code id="hd" code={EX_HD} />
          <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mt-2">c. Ganti background warna — <span className="font-mono">.bg red</span></div>
          <Code id="imagebg" code={EX_IMAGEBG} />
          <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mt-2">d. Konversi format — <span className="font-mono">.convert webp</span></div>
          <Code id="imagecv" code={EX_IMAGECV} />
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
            Pola sama untuk semua: ambil <code className="font-mono">ctx.media.dataUrl</code> → <code className="font-mono">helpers.upload(...)</code> →
            balas hasil. Argumen tambahan (warna/format) dikirim lewat <code className="font-mono">opts.fields</code>. Catatan:
            <b> .hd</b> kadang butuh &gt; 15 detik (upscale) sehingga bisa kena batas waktu sandbox — set
            <code className="font-mono"> timeout</code> plugin ke maksimum (15s). Gambar dibatasi <b>8MB</b> masuk &amp; <b>5MB</b> hasil per eksekusi.
          </p>
        </Section>

        {/* 10. Downloader semua platform */}
        <Section n="10" title="Downloader — semua platform (link)">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Satu command buat <b>TikTok, Instagram, YouTube, Facebook, Twitter/X</b>, dll. Cukup kirim
            <b> link</b>-nya. Memakai endpoint <code className="font-mono text-blue-500">/v1/socialmedia/download</code>
            (mesinnya <code className="font-mono">btch-downloader</code>) yang membalas daftar media ternormalisasi
            <code className="font-mono"> data.medias[] = {'{ url, type, label }'}</code>.
          </p>
          <div className="text-xs text-zinc-600 dark:text-zinc-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
            ⚠️ <b>Endpoint ini perlu didaftarkan dulu di Porto</b> (sekali saja): jalankan
            <code className="font-mono"> node scripts-archive/add-download-to-db.js</code> di project Porto. Sesudah itu plugin di bawah langsung jalan.
          </div>
          <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Kirim link apa saja — <span className="font-mono">.download &lt;link&gt;</span></div>
          <Code id="download" code={EX_DOWNLOAD} />
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
            Bot mengirim 1 media (video diutamakan) + daftar link lainnya sebagai teks. Media diambil
            oleh WA service dari URL hasil (bukan via sandbox), jadi tidak kena batas 5MB sandbox — tapi tetap
            tunduk pada <b>batas ukuran WhatsApp</b>. Video panjang (mis. YouTube penuh) bisa gagal kirim karena kebesaran;
            untuk audio saja, ubah <code className="font-mono">pick</code> ke <code className="font-mono">m.type === 'audio'</code>.
          </p>
        </Section>

        {/* 11. Batas & keamanan */}
        <Section n="11" title="Batas & keamanan" icon={<ShieldCheck className="w-4 h-4 text-emerald-500" />}>
          <ul className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1.5 list-disc list-inside">
            <li><b>Timeout</b> 1–15 detik (default 8s). Lewat batas → dihentikan paksa.</li>
            <li>Script jalan di <b>sandbox terisolasi</b>: tidak ada akses <code className="font-mono">require</code>, file system, atau env server.</li>
            <li>Akses jaringan <b>hanya via <code className="font-mono">helpers.*</code></b>, khusus http/https. IP privat/localhost diblokir (anti-SSRF).</li>
            <li>Maksimal <b>10 request</b> & respons <b>≤ 5 MB</b> per eksekusi; teks balasan dipotong di 8.000 karakter.</li>
            <li>Jumlah plugin dibatasi paket langganan (lihat batas paket di dashboard).</li>
          </ul>
        </Section>

        {/* 12. Troubleshooting */}
        <Section n="12" title="Masalah umum" icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}>
          <table className="w-full text-left text-xs border-collapse">
            <tbody className="divide-y divide-zinc-200/40 dark:divide-zinc-800">
              <tr><td className="py-2 pr-3 font-mono text-amber-600 dark:text-amber-400 align-top whitespace-nowrap">Missing API Key</td><td className="py-2 text-zinc-500 dark:text-zinc-400">API tujuan butuh header auth. Kirim lewat <code className="font-mono">{'opts.headers'}</code>.</td></tr>
              <tr><td className="py-2 pr-3 font-mono text-amber-600 dark:text-amber-400 align-top whitespace-nowrap">Plugin timeout</td><td className="py-2 text-zinc-500 dark:text-zinc-400">Eksekusi terlalu lama. Naikkan timeout atau percepat request.</td></tr>
              <tr><td className="py-2 pr-3 font-mono text-amber-600 dark:text-amber-400 align-top whitespace-nowrap">Akses ke IP privat ditolak</td><td className="py-2 text-zinc-500 dark:text-zinc-400">URL menunjuk ke localhost/IP internal. Pakai domain publik.</td></tr>
              <tr><td className="py-2 pr-3 font-mono text-amber-600 dark:text-amber-400 align-top whitespace-nowrap">Bot tidak membalas</td><td className="py-2 text-zinc-500 dark:text-zinc-400">Pastikan plugin Aktif, ada rule chatbot yang memilihnya dengan prefix+trigger tepat, dan script ada <code className="font-mono">return</code>.</td></tr>
              <tr><td className="py-2 pr-3 font-mono text-amber-600 dark:text-amber-400 align-top whitespace-nowrap">ctx.media null</td><td className="py-2 text-zinc-500 dark:text-zinc-400">Tidak ada gambar. Kirim command sebagai <b>caption gambar</b>, atau <b>reply</b> gambarnya lalu ketik command — bukan kirim gambar lalu chat terpisah.</td></tr>
            </tbody>
          </table>
        </Section>
      </div>
    </AdminLayout>
  );
}
