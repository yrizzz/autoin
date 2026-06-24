import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import AdminLayout from '../layout/AdminLayout';
import {
  Plus, Search, Puzzle, ToggleLeft, ToggleRight, Trash2, Edit3,
  Loader2, Play, Terminal, AlertTriangle, Check, X, Image as ImageIcon, BookOpen,
} from 'lucide-react';

interface Plugin {
  id: number;
  name: string;
  prefix: '.' | '/' | '!' | '#';
  command: string;
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

const PREFIXES = ['.', '/', '!', '#'] as const;

// Template contoh: ambil profil X (Twitter), balas teks + foto profil.
const DEFAULT_CODE = [
  "// ctx.args  = argumen setelah command (mis. \".xprofile budi\" -> ctx.args[0]='budi')",
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
  const [prefix, setPrefix] = useState<Plugin['prefix']>('.');
  const [command, setCommand] = useState('');
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
    setPrefix('.');
    setCommand('');
    setDescription('');
    setUsage('');
    setTimeoutMs(8000);
    setCode('');
    setTestArgs('');
    setTestResult(null);
    setModalOpen(true);
  }

  // Isi form dengan contoh .xprofile (opsional, lewat tombol "Sisipkan contoh")
  function loadExample() {
    setName('X (Twitter) Profile');
    setPrefix('.');
    setCommand('xprofile');
    setDescription('Ambil info profil X/Twitter via username');
    setUsage('.xprofile <username>');
    setCode(DEFAULT_CODE);
    setTestArgs('jokowi');
  }

  function openEdit(p: Plugin) {
    setEditing(p);
    setName(p.name);
    setPrefix(p.prefix);
    setCommand(p.command);
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
    if (!name.trim() || !command.trim() || !code.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name, prefix, command: command.trim(),
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
    p.command.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout activePage="plugins" title="Plugin / Extension">
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
              <Puzzle className="w-6 h-6 text-blue-500" /> Plugin / Extension
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Bikin command ber-prefix (mis. <code className="font-mono">.xprofile budi</code>) yang menjalankan
              script-mu sendiri lalu membalas otomatis. Script jalan di sandbox aman dengan batas waktu.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/plugin-docs"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 text-sm font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition whitespace-nowrap">
              <BookOpen className="w-4 h-4" /> Panduan
            </a>
            <button onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl btn-primary text-white text-sm font-bold shadow-sm transition whitespace-nowrap">
              <Plus className="w-4 h-4" /> Tambah Plugin
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari plugin / command…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-zinc-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl">
            <Puzzle className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Belum ada plugin. Klik <b>Tambah Plugin</b> untuk mulai.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map(p => (
              <div key={p.id} className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-900 dark:text-white truncate">{p.name}</span>
                      {!p.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-semibold">NONAKTIF</span>}
                    </div>
                    <code className="mt-1 inline-block text-xs font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300">
                      {p.prefix}{p.command}
                    </code>
                  </div>
                  <button onClick={() => handleToggle(p)} title={p.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                    {p.is_active
                      ? <ToggleRight className="w-8 h-8 text-blue-500" />
                      : <ToggleLeft className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />}
                  </button>
                </div>

                {p.description && <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">{p.description}</p>}

                {p.last_error && (
                  <p className="text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" /> <span className="truncate">{p.last_error}</span>
                  </p>
                )}

                <div className="flex items-center gap-2 mt-1 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <button onClick={() => openEdit(p)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-blue-600">
                    <Edit3 className="w-3.5 h-3.5" /> Edit & Tes
                  </button>
                  <button onClick={() => setToDelete(p)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 ml-auto">
                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white dark:bg-zinc-900 w-full sm:max-w-3xl sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 px-5 py-3.5 flex items-center justify-between">
              <h2 className="font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                <Puzzle className="w-5 h-5 text-blue-500" /> {editing ? 'Edit Plugin' : 'Plugin Baru'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-zinc-400 hover:text-zinc-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Nama Plugin</label>
                  <input value={name} onChange={e => setName(e.target.value)} required
                    className="mt-1 w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Timeout (ms)</label>
                  <input type="number" min={1000} max={15000} step={500} value={timeoutMs}
                    onChange={e => setTimeoutMs(Number(e.target.value))}
                    className="mt-1 w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-[80px_1fr] gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Prefix</label>
                  <select value={prefix} onChange={e => setPrefix(e.target.value as Plugin['prefix'])}
                    className="mt-1 w-full px-2 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {PREFIXES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Command (tanpa prefix)</label>
                  <input value={command} onChange={e => setCommand(e.target.value.replace(/\s+/g, ''))} required placeholder="xprofile"
                    className="mt-1 w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <p className="-mt-2 text-[11px] text-zinc-400">Pemicu: <code className="font-mono text-blue-500">{prefix}{command || 'command'} &lt;args&gt;</code></p>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Deskripsi (opsional)</label>
                  <input value={description} onChange={e => setDescription(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Contoh pemakaian (opsional)</label>
                  <input value={usage} onChange={e => setUsage(e.target.value)} placeholder=".xprofile budi"
                    className="mt-1 w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Code editor */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                    <Terminal className="w-3.5 h-3.5" /> Script (body handler JS)
                  </label>
                  <button type="button" onClick={loadExample}
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline">
                    Sisipkan contoh
                  </button>
                </div>
                <textarea value={code} onChange={e => setCode(e.target.value)} required spellCheck={false} rows={14}
                  placeholder={"// Tulis script-mu di sini. Contoh paling sederhana:\n// return 'pong 🏓';\n//\n// Tersedia: ctx (args, sender, ...) & helpers (getJson, getText, ...).\n// Klik \"Sisipkan contoh\" untuk template .xprofile."}
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-zinc-950 text-emerald-200 placeholder:text-zinc-500 border border-zinc-700 text-[12.5px] font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ tabSize: 2 }} />
                <p className="mt-1 text-[11px] text-zinc-400">
                  Tersedia: <code className="font-mono">ctx</code> (args, rawArgs, sender, chatId) &amp;
                  <code className="font-mono"> helpers</code> (getJson, getText, getBuffer, post, log).
                  Wajib <code className="font-mono">return</code> string atau <code className="font-mono">{'{ text, mediaUrl, mediaType }'}</code>.
                </p>
              </div>

              {/* Test panel */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-3 bg-zinc-50 dark:bg-zinc-800/50">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Argumen tes (pisah spasi)</label>
                    <input value={testArgs} onChange={e => setTestArgs(e.target.value)} placeholder="username"
                      className="mt-1 w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-sm font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <button type="button" onClick={handleTest} disabled={testing || !editing}
                    title={!editing ? 'Simpan dulu untuk mengetes' : 'Jalankan tes'}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-bold disabled:opacity-50">
                    {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Tes
                  </button>
                </div>

                {!editing && <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">Simpan plugin dulu, lalu jalankan tes.</p>}

                {testResult && (
                  <div className="mt-3 space-y-2">
                    <div className={`text-xs font-bold flex items-center gap-1 ${testResult.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {testResult.ok ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      {testResult.ok ? 'Berhasil' : 'Gagal'}
                    </div>
                    {testResult.error && <pre className="text-[11px] whitespace-pre-wrap text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-2 rounded-lg">{testResult.error}</pre>}
                    {testResult.output?.text && (
                      <div className="text-[13px] whitespace-pre-wrap text-zinc-800 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-2.5 rounded-lg">{testResult.output.text}</div>
                    )}
                    {testResult.output?.mediaUrl && (
                      <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5" />
                        <a href={testResult.output.mediaUrl} target="_blank" rel="noreferrer" className="text-blue-500 underline truncate">{testResult.output.mediaUrl}</a>
                        <span className="text-zinc-400">({testResult.output.mediaType})</span>
                      </div>
                    )}
                    {!!testResult.logs?.length && (
                      <pre className="text-[11px] whitespace-pre-wrap text-zinc-500 bg-zinc-100 dark:bg-zinc-800 p-2 rounded-lg">{testResult.logs.join('\n')}</pre>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-bold text-zinc-600 dark:text-zinc-300">
                  Tutup
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl btn-primary text-white text-sm font-bold disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editing ? 'Simpan Perubahan' : 'Simpan Plugin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 max-w-sm w-full">
            <h3 className="font-bold text-zinc-900 dark:text-white">Hapus plugin?</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Plugin <b>{toDelete.name}</b> ({toDelete.prefix}{toDelete.command}) akan dihapus permanen.</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setToDelete(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-bold text-zinc-600 dark:text-zinc-300">Batal</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
