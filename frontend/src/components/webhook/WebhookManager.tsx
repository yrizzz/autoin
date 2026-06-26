import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import AdminLayout from '../layout/AdminLayout';
import {
  Plus, Link2, Copy, Check, Trash2, Edit3, Globe, Code, Key,
  ToggleLeft, ToggleRight, Loader2, Activity, RefreshCw, Zap
} from 'lucide-react';

interface Webhook {
  id: number;
  name: string;
  uuid: string;
  url: string;
  platform: 'whatsapp' | 'all';
  secret_token: string;
  is_active: boolean;
  last_triggered_at: string | null;
  created_at: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  whatsapp: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  all:      'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400',
};

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function WebhookManager() {
  const [webhooks, setWebhooks]   = useState<Webhook[]>([]);
  const [loading, setLoading]     = useState(true);
  const [copiedId, setCopiedId]   = useState<number | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [saving, setSaving]       = useState(false);

  // Custom delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [webhookToDelete, setWebhookToDelete] = useState<Webhook | null>(null);

  const [name, setName]         = useState('');
  const [platform, setPlatform] = useState<'all' | 'whatsapp'>('all');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<Webhook[]>('/api/webhooks');
      setWebhooks(data);
    } catch { setWebhooks([]); }
    setLoading(false);
  }

  async function handleToggle(w: Webhook) {
    try {
      const updated = await api.put<Webhook>(`/api/webhooks/${w.id}`, { is_active: !w.is_active });
      setWebhooks(prev => prev.map(x => x.id === w.id ? updated : x));
    } catch (e: any) { alert(e.message ?? 'Gagal mengubah status'); }
  }

  function handleOpenCreate() {
    setEditingWebhook(null);
    setName('');
    setPlatform('all');
    setModalOpen(true);
  }

  function handleOpenEdit(w: Webhook) {
    setEditingWebhook(w);
    setName(w.name);
    setPlatform(w.platform);
    setModalOpen(true);
  }

  function handleDelete(w: Webhook) {
    setWebhookToDelete(w);
    setDeleteConfirmOpen(true);
  }

  async function confirmDeleteWebhook() {
    if (!webhookToDelete) return;
    const w = webhookToDelete;
    setDeleteConfirmOpen(false);
    setWebhookToDelete(null);
    try {
      await api.delete(`/api/webhooks/${w.id}`);
      setWebhooks(prev => prev.filter(x => x.id !== w.id));
    } catch (e: any) { alert(e.message ?? 'Gagal menghapus'); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editingWebhook) {
        const updated = await api.put<Webhook>(`/api/webhooks/${editingWebhook.id}`, { name, platform });
        setWebhooks(prev => prev.map(x => x.id === editingWebhook.id ? updated : x));
      } else {
        const created = await api.post<Webhook>('/api/webhooks', { name, platform });
        setWebhooks(prev => [created, ...prev]);
      }
      setModalOpen(false);
    } catch (e: any) { alert(e.message ?? 'Gagal menyimpan'); }
    setSaving(false);
  }

  function copyUrl(w: Webhook) {
    navigator.clipboard.writeText(w.url);
    setCopiedId(w.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const samplePayload = JSON.stringify({
    message: 'Halo! Order #1024 Anda telah dikonfirmasi.',
    targets: ['628123456789'],
    platform: 'whatsapp',
  }, null, 2);

  function copySample() {
    navigator.clipboard.writeText(samplePayload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  }

  return (
    <AdminLayout activePage="webhook" title="Webhook Integration">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Webhook Integration</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Hubungkan sistem eksternal (WooCommerce, Laravel, Zapier) untuk trigger pesan otomatis.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={handleOpenCreate}
            className="btn-action btn-primary text-white shadow-md">
            <Plus className="w-4 h-4" />
            Webhook Baru
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Webhook list */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            [...Array(2)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 animate-pulse space-y-3">
                <div className="flex justify-between">
                  <div className="h-3 w-40 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
                </div>
                <div className="h-8 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
                <div className="h-2.5 w-64 bg-zinc-100 dark:bg-zinc-800 rounded" />
              </div>
            ))
          ) : webhooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-center px-4">
              <Link2 className="w-8 h-8 text-zinc-400 mb-2" />
              <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Belum ada webhook</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">
                Buat endpoint untuk mengintegrasikan AUTOIN dengan sistem back-office Anda.
              </p>
            </div>
          ) : webhooks.map(w => (
            <div key={w.id}
              className={`bg-white dark:bg-zinc-900 border rounded-2xl p-5 space-y-3 transition-all shadow-sm ${
                w.is_active ? 'border-zinc-200 dark:border-zinc-800 hover:border-blue-500/20' : 'border-zinc-200 dark:border-zinc-800/50 opacity-60'
              }`}>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${w.is_active ? 'bg-blue-500/10' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                    <Globe className={`w-4 h-4 ${w.is_active ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400'}`} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-100 truncate">{w.name}</h3>
                    {w.last_triggered_at && (
                      <div className="flex items-center gap-1 text-[9px] text-zinc-400 mt-0.5">
                        <Activity className="w-2.5 h-2.5" />
                        <span>Terakhir: {fmtDate(w.last_triggered_at)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${PLATFORM_COLORS[w.platform] ?? PLATFORM_COLORS.all}`}>
                    {w.platform === 'all' ? 'Semua' : w.platform}
                  </span>
                  <button onClick={() => handleToggle(w)} className="cursor-pointer" title={w.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                    {w.is_active
                      ? <ToggleRight className="w-7 h-7 text-blue-600 dark:text-blue-500" />
                      : <ToggleLeft className="w-7 h-7 text-zinc-400 dark:text-zinc-600" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <input type="text" value={w.url} readOnly
                  className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-[10px] font-mono text-zinc-600 dark:text-zinc-400 focus:outline-none" />
                <button onClick={() => copyUrl(w)}
                  className="px-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl transition-all flex items-center justify-center cursor-pointer border border-zinc-200 dark:border-zinc-700"
                  title="Salin URL">
                  {copiedId === w.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800 rounded-xl px-3 py-2">
                <Key className="w-3 h-3 text-zinc-400 shrink-0" />
                <span className="text-[9px] text-zinc-400">X-Webhook-Secret:</span>
                <span className="text-[9px] font-mono font-semibold text-zinc-700 dark:text-zinc-300 select-all truncate">{w.secret_token}</span>
              </div>

              <div className="flex justify-end gap-1 pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                <button onClick={() => handleOpenEdit(w)}
                  className="p-1.5 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all cursor-pointer">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(w)}
                  className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Docs sidebar */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-5 shadow-sm h-fit">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-blue-500" />
            <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-800 dark:text-zinc-100">Petunjuk Integrasi</h2>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Kirimkan HTTP <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">POST</code> ke Webhook URL dengan header secret dan payload JSON.
          </p>
          <div className="space-y-4">
            <div>
              <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Method &amp; Headers</span>
              <pre className="code-block p-3 text-[9px] font-mono leading-relaxed whitespace-pre-wrap">
{`POST [Webhook URL]
Content-Type: application/json
X-Webhook-Secret: whsec_xxx`}
              </pre>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Payload (JSON)</span>
                <button onClick={copySample}
                  className="text-[9px] text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer">
                  {copiedPayload ? <><Check className="w-2.5 h-2.5 text-emerald-500" />Disalin!</> : 'Salin JSON'}
                </button>
              </div>
              <pre className="code-block p-3 text-[9px] font-mono">
                {samplePayload}
              </pre>
            </div>
            <div className="bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Zap className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Response</span>
              </div>
              <pre className="code-block p-3 text-[9px] font-mono leading-relaxed">
{`{
  "ok": true,
  "sent": 1,
  "total": 1,
  "platform": "whatsapp"
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl w-full max-w-sm max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-100 dark:bg-zinc-900/60 shrink-0">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                {editingWebhook ? 'Edit Webhook' : 'Buat Webhook Baru'}
              </h3>
              <button onClick={() => setModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 text-xs font-semibold cursor-pointer transition-colors">
                Tutup
              </button>
            </div>
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Nama Webhook</label>
                <input type="text" placeholder="Contoh: WooCommerce Payment Success"
                  value={name} onChange={e => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-100"
                  required />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Platform Default</label>
                <select value={platform} onChange={e => setPlatform(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-100 cursor-pointer">
                  <option value="all">Semua (WhatsApp)</option>
                  <option value="whatsapp">WhatsApp saja</option>
                </select>
              </div>
              {!editingWebhook && (
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-900 rounded-xl p-3 border border-zinc-100 dark:border-zinc-800">
                  URL dan Secret Token dibuat otomatis setelah simpan.
                </p>
              )}
              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 font-bold text-xs rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer border border-zinc-200 dark:border-zinc-700">
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-xs rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all cursor-pointer disabled:opacity-60">
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-zinc-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl dark:shadow-black/60 w-full max-w-sm overflow-hidden p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-2">Hapus Webhook</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
              Apakah Anda yakin ingin menghapus webhook <strong>{webhookToDelete?.name}</strong>? URL webhook ini akan dinonaktifkan.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setDeleteConfirmOpen(false); setWebhookToDelete(null); }}
                className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all cursor-pointer border border-zinc-200 dark:border-zinc-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteWebhook}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-500/10 transition-all cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
