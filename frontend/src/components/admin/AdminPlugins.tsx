import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import AdminLayout from '../layout/AdminLayout';
import {
  Puzzle, Search, Trash2, ToggleLeft, ToggleRight, Loader2, Play, Terminal,
  AlertTriangle, Check, X, Code2, User as UserIcon, Clock, ShieldCheck,
} from 'lucide-react';

interface PluginOwner { id: number; name: string; email: string; }
interface AdminPlugin {
  id: number;
  user_id: number;
  name: string;
  description?: string | null;
  usage?: string | null;
  code: string;
  is_active: boolean;
  timeout_ms: number;
  last_error?: string | null;
  last_run_at?: string | null;
  created_at: string;
  user?: PluginOwner | null;
}
interface Stats { total: number; active: number; errored: number; owners: number; }
interface TestResult { ok: boolean; output?: { text?: string; mediaUrl?: string; mediaType?: string }; logs?: string[]; error?: string; }

function fmt(d?: string | null) {
  if (!d) return '—';
  try { return new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }); } catch { return d; }
}

export default function AdminPlugins() {
  const [plugins, setPlugins] = useState<AdminPlugin[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, errored: 0, owners: 0 });
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'errored'>('all');

  const [viewing, setViewing] = useState<AdminPlugin | null>(null);
  const [testArgs, setTestArgs] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [toDelete, setToDelete] = useState<AdminPlugin | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<{ stats: Stats; plugins: AdminPlugin[] }>('/api/admin/plugins');
      setPlugins(data.plugins);
      setStats(data.stats);
    } catch (e: any) {
      if (e?.status === 403) setDenied(true);
      setPlugins([]);
    }
    setLoading(false);
  }

  async function handleToggle(p: AdminPlugin) {
    try {
      const updated = await api.post<AdminPlugin>(`/api/admin/plugins/${p.id}/toggle`);
      setPlugins(prev => prev.map(x => x.id === p.id ? { ...x, ...updated } : x));
      setStats(s => ({ ...s, active: s.active + (updated.is_active ? 1 : -1) }));
    } catch (e: any) {
      alert(e.message ?? 'Gagal mengubah status.');
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const p = toDelete;
    setToDelete(null);
    try {
      await api.delete(`/api/admin/plugins/${p.id}`);
      setPlugins(prev => prev.filter(x => x.id !== p.id));
      setStats(s => ({ ...s, total: s.total - 1, active: s.active - (p.is_active ? 1 : 0) }));
    } catch (e: any) {
      alert(e.message ?? 'Gagal menghapus.');
    }
  }

  function openView(p: AdminPlugin) {
    setViewing(p);
    setTestArgs('');
    setTestResult(null);
  }

  async function handleTest() {
    if (!viewing) return;
    setTesting(true);
    setTestResult(null);
    try {
      const args = testArgs.trim() === '' ? [] : testArgs.trim().split(/\s+/);
      const res = await api.post<TestResult>(`/api/admin/plugins/${viewing.id}/test`, { args }, { timeout: 30000 });
      setTestResult(res);
      setPlugins(prev => prev.map(x => x.id === viewing.id ? { ...x, last_error: res.ok ? null : (res.error || 'Error'), last_run_at: new Date().toISOString() } : x));
    } catch (e: any) {
      setTestResult({ ok: false, error: e.message ?? 'Gagal menjalankan tes.' });
    }
    setTesting(false);
  }

  const filtered = plugins.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      p.name.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.user?.email || '').toLowerCase().includes(q) ||
      (p.user?.name || '').toLowerCase().includes(q);
    const matchFilter =
      filter === 'all' ? true :
      filter === 'active' ? p.is_active :
      filter === 'inactive' ? !p.is_active :
      !!p.last_error;
    return matchSearch && matchFilter;
  });

  if (denied) {
    return (
      <AdminLayout activePage="admin_plugins" title="Kelola Plugin">
        <div className="max-w-md mx-auto py-24 text-center">
          <ShieldCheck className="w-12 h-12 mx-auto text-zinc-300 mb-3" />
          <p className="font-bold text-zinc-700 dark:text-zinc-200">Khusus Admin</p>
          <p className="text-sm text-zinc-500 mt-1">Halaman ini hanya untuk administrator.</p>
        </div>
      </AdminLayout>
    );
  }

  const statCards = [
    { label: 'Total Plugin', value: stats.total, color: 'text-zinc-900 dark:text-white' },
    { label: 'Aktif', value: stats.active, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Bermasalah', value: stats.errored, color: 'text-red-600 dark:text-red-400' },
    { label: 'Pemilik', value: stats.owners, color: 'text-blue-600 dark:text-blue-400' },
  ];

  return (
    <AdminLayout activePage="admin_plugins" title="Kelola Plugin">
      <div>
        <div className="mb-5">
          <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
            <Puzzle className="w-6 h-6 text-blue-500" /> Kelola Plugin <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300">ADMIN</span>
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Pantau & kontrol semua plugin dari seluruh pengguna.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {statCards.map(c => (
            <div key={c.label} className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
              <div className={`text-2xl font-extrabold ${c.color}`}>{c.value}</div>
              <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-0.5">{c.label}</div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama / command / pemilik…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1">
            {(['all', 'active', 'inactive', 'errored'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition ${filter === f ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-white shadow-sm' : 'text-zinc-500'}`}>
                {f === 'all' ? 'Semua' : f === 'active' ? 'Aktif' : f === 'inactive' ? 'Nonaktif' : 'Error'}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-zinc-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl">
            <Puzzle className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Tidak ada plugin yang cocok.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
            {filtered.map(p => (
              <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-zinc-900 dark:text-white truncate">{p.name}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300">Script</span>
                    {!p.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-semibold">NONAKTIF</span>}
                    {p.last_error && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" />ERROR</span>}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400 flex-wrap">
                    <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" />{p.user?.email || `user#${p.user_id}`}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Run: {fmt(p.last_run_at)}</span>
                  </div>
                  {p.last_error && <p className="mt-1 text-[11px] text-red-600 dark:text-red-400 truncate">{p.last_error}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openView(p)} title="Lihat kode & tes"
                    className="p-2 rounded-lg text-zinc-500 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"><Code2 className="w-4 h-4" /></button>
                  <button onClick={() => handleToggle(p)} title={p.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                    {p.is_active ? <ToggleRight className="w-8 h-8 text-blue-500" /> : <ToggleLeft className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />}
                  </button>
                  <button onClick={() => setToDelete(p)} title="Hapus"
                    className="p-2 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View code + test modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white dark:bg-zinc-900 w-full sm:max-w-3xl sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 px-5 py-3.5 flex items-center justify-between">
              <div className="min-w-0">
                <h2 className="font-extrabold text-zinc-900 dark:text-white truncate flex items-center gap-2">
                  <Puzzle className="w-5 h-5 text-blue-500 shrink-0" /> {viewing.name}
                </h2>
                <p className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" />{viewing.user?.email || `user#${viewing.user_id}`}</span>
                </p>
              </div>
              <button onClick={() => setViewing(null)} className="text-zinc-400 hover:text-zinc-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-4">
              {viewing.description && <p className="text-sm text-zinc-600 dark:text-zinc-300">{viewing.description}</p>}

              <div>
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1"><Terminal className="w-3.5 h-3.5" /> Kode (read-only)</label>
                <pre className="mt-1 w-full px-3 py-2 rounded-xl bg-zinc-950 text-emerald-200 border border-zinc-700 text-[12px] font-mono leading-relaxed overflow-x-auto max-h-72">{viewing.code}</pre>
              </div>

              {/* Test */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-3 bg-zinc-50 dark:bg-zinc-800/50">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Argumen tes (pisah spasi)</label>
                    <input value={testArgs} onChange={e => setTestArgs(e.target.value)} placeholder="username"
                      className="mt-1 w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-sm font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <button onClick={handleTest} disabled={testing}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-bold disabled:opacity-50">
                    {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Tes
                  </button>
                </div>
                {testResult && (
                  <div className="mt-3 space-y-2">
                    <div className={`text-xs font-bold flex items-center gap-1 ${testResult.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {testResult.ok ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}{testResult.ok ? 'Berhasil' : 'Gagal'}
                    </div>
                    {testResult.error && <pre className="text-[11px] whitespace-pre-wrap text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-2 rounded-lg">{testResult.error}</pre>}
                    {testResult.output?.text && <div className="text-[13px] whitespace-pre-wrap text-zinc-800 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-2.5 rounded-lg">{testResult.output.text}</div>}
                    {testResult.output?.mediaUrl && (
                      <div className="text-[11px] text-zinc-500 truncate">media: <a href={testResult.output.mediaUrl} target="_blank" rel="noreferrer" className="text-blue-500 underline">{testResult.output.mediaUrl}</a></div>
                    )}
                    {!!testResult.logs?.length && <pre className="text-[11px] whitespace-pre-wrap text-zinc-500 bg-zinc-100 dark:bg-zinc-800 p-2 rounded-lg">{testResult.logs.join('\n')}</pre>}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={() => handleToggle(viewing)} className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-bold text-zinc-600 dark:text-zinc-300">
                  {viewing.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
                <button onClick={() => { setToDelete(viewing); setViewing(null); }} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold">Hapus Plugin</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 max-w-sm w-full">
            <h3 className="font-bold text-zinc-900 dark:text-white">Hapus plugin?</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Plugin <b>{toDelete.name}</b> milik <b>{toDelete.user?.email || `user#${toDelete.user_id}`}</b> akan dihapus permanen.</p>
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
