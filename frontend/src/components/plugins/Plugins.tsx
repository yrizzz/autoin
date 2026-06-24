import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import AdminLayout from '../layout/AdminLayout';
import CodeEditor from '../ui/CodeEditor';
import {
  Plus, Search, Puzzle, ToggleLeft, ToggleRight, Trash2, Edit3,
  Loader2, Play, Terminal, AlertTriangle, Check, X, Image as ImageIcon,
  BookOpen, Sparkles, Clock,
} from 'lucide-react';

interface Plugin {
  id: number;
  name: string;
  description?: string | null;
  usage?: string | null;
  code: string;
  is_active: boolean;
  timeout_ms: number;
  last_error?: string | null;
  last_run_at?: string | null;
  created_at: string;
}

interface TestResult {
  ok: boolean;
  output?: { text?: string; mediaUrl?: string; mediaType?: string };
  logs?: string[];
  error?: string;
}

// Ringkas pesan error teknis jadi kalimat ramah (detail tetap ada di tooltip).
function friendlyError(msg?: string | null): string {
  if (!msg) return '';
  if (/plugins\/run|WA service|tidak terjangkau|tidak valid|ECONNREFUSED|restart/i.test(msg)) {
    return 'Layanan WhatsApp belum siap menjalankan plugin. Coba lagi sebentar.';
  }
  return msg;
}

// Template contoh: ambil profil X (Twitter), balas teks + foto profil.
const DEFAULT_CODE = [
  "// ctx.args  = argumen dari pesan setelah trigger (mis. trigger \"xprofile\",",
  "//            pesan \".xprofile budi\" -> ctx.args[0]='budi'). Prefix & trigger",
  "//            diatur di halaman Chatbot saat plugin ini dipakai.",
  "// helpers   = { getJson, getText, getBuffer, post, log }  (satu-satunya akses keluar)",
  "// Wajib `return` output: string ATAU { text, mediaUrl, mediaType }.",
  "const API_KEY = 'pk_3876f9c71b90f5000e9f3b626298e4e34ae446dfe0a918342602e63f364709aa';",
  "const username = (ctx.args[0] || '').replace('@','').trim();",
  "if (!username) return 'Pemakaian: .xprofile <username>';",
  "",
  "const res = await helpers.getJson(",
  "  'https://api.yrizzz.my.id/api/execute/v1/socialmedia/xprofile?username=' + encodeURIComponent(username),",
  "  { headers: { 'x-api-key': API_KEY } }",
  ");",
  "if (!res || res.status !== true || !res.data) return 'Profil @' + username + ' tidak ditemukan.';",
  "",
  "const d = res.data;",
  "const text =",
  "  '👤 *' + (d.name || username) + '*  (@' + d.screen_name + ')\\n' +",
  "  (d.description ? '📝 ' + d.description + '\\n' : '') +",
  "  '👥 Followers: ' + Number(d.followers_count ?? 0).toLocaleString('id-ID') + '\\n' +",
  "  '➡️ Following: ' + Number(d.following_count ?? 0).toLocaleString('id-ID');",
  "",
  "return { text, mediaUrl: d.profile_image || null, mediaType: d.profile_image ? 'image' : null };",
].join('\n');

export default function Plugins() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Plugin | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [usage, setUsage] = useState('');
  const [timeoutMs, setTimeoutMs] = useState(8000);
  const [code, setCode] = useState('');

  // Test panel
  const [testArgs, setTestArgs] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Delete confirm
  const [toDelete, setToDelete] = useState<Plugin | null>(null);

  useEffect(() => { load(); }, []);

  // Tutup modal dengan tombol Esc.
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setModalOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  async function load() {
    setLoading(true);
    try {
      setPlugins(await api.get<Plugin[]>('/api/plugins'));
    } catch {
      setPlugins([]);
    }
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setName('');
    setDescription('');
    setUsage('');
    setTimeoutMs(8000);
    setCode('');
    setTestArgs('');
    setTestResult(null);
    setModalOpen(true);
  }

  // Isi form dengan contoh .xprofile (lewat tombol "Sisipkan contoh")
  function loadExample() {
    setName('X (Twitter) Profile');
    setDescription('Ambil info profil X/Twitter via username');
    setUsage('.xprofile <username>');
    setCode(DEFAULT_CODE);
    setTestArgs('jokowi');
  }

  function openEdit(p: Plugin) {
    setEditing(p);
    setName(p.name);
    setDescription(p.description || '');
    setUsage(p.usage || '');
    setTimeoutMs(p.timeout_ms || 8000);
    setCode(p.code);
    setTestArgs('');
    setTestResult(null);
    setModalOpen(true);
  }

  async function handleToggle(p: Plugin) {
    try {
      const updated = await api.put<Plugin>(`/api/plugins/${p.id}`, { is_active: !p.is_active });
      setPlugins(prev => prev.map(x => x.id === p.id ? updated : x));
    } catch (e: any) {
      alert(e.message ?? 'Gagal mengubah status.');
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const p = toDelete;
    setToDelete(null);
    try {
      await api.delete(`/api/plugins/${p.id}`);
      setPlugins(prev => prev.filter(x => x.id !== p.id));
    } catch (e: any) {
      alert(e.message ?? 'Gagal menghapus.');
    }
  }

  function buildArgs(): string[] {
    return testArgs.trim() === '' ? [] : testArgs.trim().split(/\s+/);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name,
        description: description || null,
        usage: usage || null,
        timeout_ms: timeoutMs,
        code,
      };
      if (editing) {
        const updated = await api.put<Plugin>(`/api/plugins/${editing.id}`, payload);
        setPlugins(prev => prev.map(x => x.id === editing.id ? updated : x));
        setEditing(updated);
      } else {
        const created = await api.post<Plugin>('/api/plugins', payload);
        setPlugins(prev => [created, ...prev]);
        setEditing(created); // jadi bisa langsung dites
      }
    } catch (e: any) {
      alert(e.message ?? 'Gagal menyimpan plugin.');
    }
    setSaving(false);
  }

  async function handleTest() {
    if (!editing) {
      alert('Simpan plugin dulu, lalu jalankan tes.');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post<TestResult>(`/api/plugins/${editing.id}/test`, {
        args: buildArgs(),
        code, // tes kode terbaru di editor (boleh belum disimpan)
      }, { timeout: 30000 });
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ ok: false, error: e.message ?? 'Gagal menjalankan tes.' });
    }
    setTesting(false);
  }

  const filtered = plugins.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const inputCls =
    'w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500 transition';
  const labelCls = 'text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400';

  return (
    <AdminLayout activePage="plugins" title="Plugin / Extension">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-5">
        <div className="min-w-0">
          <h1 className="text-lg font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
            <span className="grid place-items-center w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500">
              <Puzzle className="w-4 h-4" />
            </span>
            Plugin / Extension
          </h1>
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-1.5 max-w-2xl leading-relaxed">
            Pustaka <b>script</b> yang bisa dipakai sebagai balasan otomatis. Atur pemicunya
            (prefix &amp; trigger, mis. <code className="font-mono text-blue-500">.xprofile budi</code>) di
            halaman <a href="/chatbot" className="text-blue-500 hover:underline font-semibold">Chatbot</a>.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a href="/plugin-docs"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 text-[13px] font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition whitespace-nowrap">
            <BookOpen className="w-4 h-4" /> Panduan
          </a>
          <button onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg btn-primary text-white text-[13px] font-semibold shadow-sm transition whitespace-nowrap">
            <Plus className="w-4 h-4" /> Tambah Plugin
          </button>
        </div>
      </div>

      {/* ── Search ─────────────────────────────────────────────────────────── */}
      <div className="relative mb-4 max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari plugin…"
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500 transition" />
      </div>

      {/* ── List ───────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <div className="grid place-items-center w-12 h-12 mx-auto rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 mb-3">
            <Puzzle className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
          </div>
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Belum ada plugin</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Klik <b>Tambah Plugin</b> untuk membuat script pertamamu.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(p => (
            <div key={p.id}
              className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 flex flex-col gap-3 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm transition">
              {/* top */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-zinc-900 dark:text-white truncate">{p.name}</span>
                    {!p.is_active && (
                      <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold uppercase tracking-wide">Nonaktif</span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300">
                      <Terminal className="w-2.5 h-2.5" /> Script
                    </span>
                    <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-zinc-400 dark:text-zinc-500">
                      <Clock className="w-2.5 h-2.5" /> {(p.timeout_ms / 1000).toFixed(0)}s
                    </span>
                  </div>
                </div>
                <button onClick={() => handleToggle(p)} title={p.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  className="shrink-0 -mt-1 -mr-1 p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                  {p.is_active
                    ? <ToggleRight className="w-7 h-7 text-blue-500" />
                    : <ToggleLeft className="w-7 h-7 text-zinc-300 dark:text-zinc-600" />}
                </button>
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 min-h-[2rem]">
                {p.description || <span className="italic text-zinc-400 dark:text-zinc-600">Tanpa deskripsi.</span>}
              </p>

              {p.last_error && (
                <div title={p.last_error}
                  className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 rounded-lg px-2 py-1.5">
                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{friendlyError(p.last_error)}</span>
                </div>
              )}

              <div className="flex items-center gap-2 mt-auto pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button onClick={() => openEdit(p)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-blue-600 dark:hover:text-blue-400 transition">
                  <Edit3 className="w-3.5 h-3.5" /> Edit &amp; Tes
                </button>
                <button onClick={() => setToDelete(p)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition ml-auto">
                  <Trash2 className="w-3.5 h-3.5" /> Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Editor modal ───────────────────────────────────────────────────── */}
      {modalOpen && (
        <div onClick={() => setModalOpen(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <form onClick={e => e.stopPropagation()} onSubmit={handleSave}
            className="bg-white dark:bg-zinc-900 w-full sm:max-w-4xl sm:rounded-2xl rounded-t-2xl flex flex-col max-h-[94vh] sm:max-h-[90vh] shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">

            {/* header (sticky via flex shrink-0) */}
            <div className="shrink-0 border-b border-zinc-100 dark:border-zinc-800 px-5 py-3.5 flex items-center justify-between">
              <h2 className="font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                <span className="grid place-items-center w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500">
                  <Puzzle className="w-4 h-4" />
                </span>
                {editing ? 'Edit Plugin' : 'Plugin Baru'}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* body (scrollable) */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div className="grid sm:grid-cols-[1fr_140px] gap-3">
                <div>
                  <label className={labelCls}>Nama Plugin</label>
                  <input value={name} onChange={e => setName(e.target.value)} required placeholder="X (Twitter) Profile"
                    className={`mt-1.5 ${inputCls}`} />
                </div>
                <div>
                  <label className={labelCls}>Timeout</label>
                  <div className="relative mt-1.5">
                    <input type="number" min={1000} max={15000} step={500} value={timeoutMs}
                      onChange={e => setTimeoutMs(Number(e.target.value))} className={`${inputCls} pr-9`} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-zinc-400">ms</span>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Deskripsi <span className="font-normal normal-case text-zinc-400">(opsional)</span></label>
                  <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ambil info profil via username"
                    className={`mt-1.5 ${inputCls}`} />
                </div>
                <div>
                  <label className={labelCls}>Contoh pemakaian <span className="font-normal normal-case text-zinc-400">(opsional)</span></label>
                  <input value={usage} onChange={e => setUsage(e.target.value)} placeholder=".xprofile budi"
                    className={`mt-1.5 ${inputCls} font-mono`} />
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 dark:bg-blue-500/[0.07] border border-blue-100 dark:border-blue-500/20 px-3 py-2 text-[11px] text-blue-700 dark:text-blue-300 flex items-start gap-1.5 leading-relaxed">
                <Puzzle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>Plugin ini cuma <b>menyediakan script</b>. Prefix &amp; trigger (mis. <code className="font-mono">.xprofile</code>) diatur di halaman <b>Chatbot</b> saat memilih plugin sebagai balasan.</span>
              </div>

              {/* Code editor */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`${labelCls} flex items-center gap-1.5`}>
                    <Terminal className="w-3.5 h-3.5" /> Script <span className="font-normal normal-case text-zinc-400">(body handler JS)</span>
                  </label>
                  <button type="button" onClick={loadExample}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 px-2 py-1 rounded-md transition">
                    <Sparkles className="w-3 h-3" /> Sisipkan contoh
                  </button>
                </div>
                <CodeEditor value={code} onChange={setCode} minRows={13}
                  placeholder={"// Tulis script-mu di sini. Contoh paling sederhana:\n// return 'pong 🏓';\n//\n// Tersedia: ctx (args, sender, ...) & helpers (getJson, getText, ...).\n// Klik \"Sisipkan contoh\" untuk template .xprofile."} />
                <p className="mt-1.5 text-[11px] text-zinc-400 leading-relaxed">
                  Tersedia <code className="font-mono">ctx</code> (args, rawArgs, sender, chatId) &amp;
                  <code className="font-mono"> helpers</code> (getJson, getText, getBuffer, post, log).
                  Wajib <code className="font-mono">return</code> string atau <code className="font-mono">{'{ text, mediaUrl, mediaType }'}</code>.
                </p>
              </div>

              {/* Test panel */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/30 p-3">
                <label className={`${labelCls} flex items-center gap-1.5 mb-1.5`}>
                  <Play className="w-3 h-3" /> Coba jalankan
                </label>
                <div className="flex items-stretch gap-2">
                  <input value={testArgs} onChange={e => setTestArgs(e.target.value)} placeholder="argumen tes (pisah spasi), mis. jokowi"
                    className={`flex-1 ${inputCls} font-mono bg-white dark:bg-zinc-900`} />
                  <button type="button" onClick={handleTest} disabled={testing || !editing}
                    title={!editing ? 'Simpan dulu untuk mengetes' : 'Jalankan tes'}
                    className="inline-flex items-center gap-1.5 px-4 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-bold disabled:opacity-50 hover:opacity-90 transition shrink-0">
                    {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Tes
                  </button>
                </div>

                {!editing && (
                  <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Simpan plugin dulu, lalu jalankan tes.
                  </p>
                )}

                {testResult && (
                  <div className="mt-3 space-y-2">
                    <div className={`text-xs font-bold flex items-center gap-1.5 ${testResult.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {testResult.ok ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      {testResult.ok ? 'Berhasil dijalankan' : 'Gagal dijalankan'}
                    </div>
                    {testResult.error && (
                      <div className="text-[12px] text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/20 p-2.5 rounded-lg break-words">
                        {friendlyError(testResult.error)}
                        {friendlyError(testResult.error) !== testResult.error && (
                          <div className="mt-1 text-[10.5px] font-mono text-red-500/70 dark:text-red-400/60 break-all">{testResult.error}</div>
                        )}
                      </div>
                    )}
                    {testResult.output?.text && (
                      <div className="text-[13px] whitespace-pre-wrap text-zinc-800 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-2.5 rounded-lg break-words">{testResult.output.text}</div>
                    )}
                    {testResult.output?.mediaUrl && (
                      <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                        <a href={testResult.output.mediaUrl} target="_blank" rel="noreferrer" className="text-blue-500 underline truncate">{testResult.output.mediaUrl}</a>
                        <span className="text-zinc-400 shrink-0">({testResult.output.mediaType})</span>
                      </div>
                    )}
                    {!!testResult.logs?.length && (
                      <pre className="text-[11px] whitespace-pre-wrap text-zinc-500 bg-zinc-100 dark:bg-zinc-800 p-2 rounded-lg overflow-x-auto">{testResult.logs.join('\n')}</pre>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* footer (sticky via flex shrink-0) */}
            <div className="shrink-0 border-t border-zinc-100 dark:border-zinc-800 px-5 py-3 flex items-center gap-2 bg-white dark:bg-zinc-900">
              <p className="hidden sm:block text-[11px] text-zinc-400 mr-auto">
                {editing ? 'Perubahan tersimpan ke pustaka plugin.' : 'Simpan dulu untuk bisa mengetes.'}
              </p>
              <button type="button" onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-[13px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition">
                Tutup
              </button>
              <button type="submit" disabled={saving}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg btn-primary text-white text-[13px] font-bold disabled:opacity-50 transition">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editing ? 'Simpan Perubahan' : 'Simpan Plugin'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Delete confirm ─────────────────────────────────────────────────── */}
      {toDelete && (
        <div onClick={() => setToDelete(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <span className="grid place-items-center w-9 h-9 rounded-xl bg-red-500/10 text-red-500 shrink-0">
                <Trash2 className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-zinc-900 dark:text-white">Hapus plugin?</h3>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2.5">Plugin <b>{toDelete.name}</b> akan dihapus permanen dan tidak bisa dikembalikan.</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setToDelete(null)} className="flex-1 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-[13px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition">Batal</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[13px] font-bold transition">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
