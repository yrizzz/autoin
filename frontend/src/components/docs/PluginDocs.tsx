import React, { useState } from 'react';
import AdminLayout from '../layout/AdminLayout';
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
];

const HELPER_ROWS: [string, string][] = [
  ['await helpers.getJson(url, opts?)', 'GET lalu parse JSON. opts: { headers, method, body }.'],
  ['await helpers.getText(url, opts?)', 'GET dan kembalikan teks mentah.'],
  ['await helpers.getBuffer(url, opts?)', 'GET dan kembalikan Buffer (mis. untuk media).'],
  ['await helpers.post(url, body, opts?)', 'POST. body objek → otomatis JSON.'],
  ['helpers.log(...args)', 'Catat ke log (muncul di panel Tes). Bukan untuk balasan.'],
];

function Code({ id, code }: { id: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-800/80 text-zinc-300 hover:text-white opacity-0 group-hover:opacity-100 transition">
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <pre className="bg-zinc-950 text-emerald-200 border border-zinc-700 rounded-xl p-3.5 text-[12px] font-mono leading-relaxed overflow-x-auto">{code}</pre>
    </div>
  );
}

function Section({ n, title, icon, children }: { n: string; title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
        <span className="w-5 h-5 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center text-[10px] font-bold">{n}</span>
        {icon}{title}
      </h2>
      {children}
    </section>
  );
}

export default function PluginDocs() {
  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
            <Puzzle className="w-6 h-6 text-violet-500" /> Dokumentasi Plugin
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Plugin = command ber-prefix (mis. <code className="font-mono text-violet-500">.xprofile budi</code>) yang menjalankan
            script JS-mu sendiri lalu membalas otomatis di WhatsApp. Script berjalan di sandbox aman dengan batas waktu.
          </p>
        </div>

        {/* 1. Alur */}
        <Section n="1" title="Cara kerja" icon={<Zap className="w-4 h-4 text-amber-500" />}>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700">
            <span className="font-mono">Pesan masuk</span> <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-mono">cocokkan prefix+command</span> <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-mono">jalankan script (sandbox)</span> <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-mono">kirim output</span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Plugin dicek <b>sebelum</b> auto-reply biasa, jadi command-mu tidak akan “kemakan” rule chatbot.
          </p>
        </Section>

        {/* 2. Membuat plugin */}
        <Section n="2" title="Membuat plugin (di dashboard)">
          <ol className="text-sm text-zinc-600 dark:text-zinc-300 space-y-1.5 list-decimal list-inside">
            <li>Buka menu <b>Plugin / Extension</b> → <b>Tambah Plugin</b>.</li>
            <li>Isi <b>Nama</b>, pilih <b>Prefix</b>, isi <b>Command</b> (tanpa prefix, mis. <code className="font-mono">xprofile</code>).</li>
            <li>Tulis <b>Script</b> (body handler) di editor.</li>
            <li>Klik <b>Simpan</b>, lalu <b>Tes</b> dengan contoh argumen untuk melihat output/log/error.</li>
            <li>Pastikan plugin <b>Aktif</b>. Selesai — kirim <code className="font-mono">{'<prefix><command> <args>'}</code> dari WhatsApp.</li>
          </ol>
        </Section>

        {/* 3. Anatomi command */}
        <Section n="3" title="Anatomi command">
          <Code id="anat" code={'.xprofile  tasyaardhisa_\n│ │         └── ctx.args[0]\n│ └────────── command\n└──────────── prefix ( . / ! # )'} />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Cocok bila pesan diawali <b>prefix+command</b> diikuti spasi atau akhir. Command tidak peka huruf besar/kecil; argumen tetap apa adanya.
          </p>
        </Section>

        {/* 4. Kontrak script */}
        <Section n="4" title="Kontrak base script" icon={<Terminal className="w-4 h-4 text-zinc-500" />}>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Kamu menulis <b>body handler</b>. Tersedia dua variabel global: <code className="font-mono text-violet-500">ctx</code> dan
            <code className="font-mono text-violet-500"> helpers</code>. Script <b>wajib</b> <code className="font-mono">return</code> output.
          </p>

          <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mt-2">ctx — data pesan masuk</div>
          <table className="w-full text-left text-xs border-collapse">
            <tbody className="divide-y divide-zinc-200/40 dark:divide-zinc-800">
              {CTX_ROWS.map(([k, v]) => (
                <tr key={k}>
                  <td className="py-2 pr-3 font-mono text-violet-600 dark:text-violet-400 whitespace-nowrap align-top">{k}</td>
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
                  <td className="py-2 pr-3 font-mono text-violet-600 dark:text-violet-400 whitespace-nowrap align-top">{k}</td>
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

        {/* 7. Batas & keamanan */}
        <Section n="7" title="Batas & keamanan" icon={<ShieldCheck className="w-4 h-4 text-emerald-500" />}>
          <ul className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1.5 list-disc list-inside">
            <li><b>Timeout</b> 1–15 detik (default 8s). Lewat batas → dihentikan paksa.</li>
            <li>Script jalan di <b>sandbox terisolasi</b>: tidak ada akses <code className="font-mono">require</code>, file system, atau env server.</li>
            <li>Akses jaringan <b>hanya via <code className="font-mono">helpers.*</code></b>, khusus http/https. IP privat/localhost diblokir (anti-SSRF).</li>
            <li>Maksimal <b>10 request</b> & respons <b>≤ 5 MB</b> per eksekusi; teks balasan dipotong di 8.000 karakter.</li>
            <li>Jumlah plugin dibatasi paket langganan (lihat batas paket di dashboard).</li>
          </ul>
        </Section>

        {/* 8. Troubleshooting */}
        <Section n="8" title="Masalah umum" icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}>
          <table className="w-full text-left text-xs border-collapse">
            <tbody className="divide-y divide-zinc-200/40 dark:divide-zinc-800">
              <tr><td className="py-2 pr-3 font-mono text-amber-600 dark:text-amber-400 align-top whitespace-nowrap">Missing API Key</td><td className="py-2 text-zinc-500 dark:text-zinc-400">API tujuan butuh header auth. Kirim lewat <code className="font-mono">{'opts.headers'}</code>.</td></tr>
              <tr><td className="py-2 pr-3 font-mono text-amber-600 dark:text-amber-400 align-top whitespace-nowrap">Plugin timeout</td><td className="py-2 text-zinc-500 dark:text-zinc-400">Eksekusi terlalu lama. Naikkan timeout atau percepat request.</td></tr>
              <tr><td className="py-2 pr-3 font-mono text-amber-600 dark:text-amber-400 align-top whitespace-nowrap">Akses ke IP privat ditolak</td><td className="py-2 text-zinc-500 dark:text-zinc-400">URL menunjuk ke localhost/IP internal. Pakai domain publik.</td></tr>
              <tr><td className="py-2 pr-3 font-mono text-amber-600 dark:text-amber-400 align-top whitespace-nowrap">Bot tidak membalas</td><td className="py-2 text-zinc-500 dark:text-zinc-400">Pastikan plugin Aktif, prefix+command tepat, dan script ada <code className="font-mono">return</code>.</td></tr>
            </tbody>
          </table>
        </Section>
      </div>
    </AdminLayout>
  );
}
