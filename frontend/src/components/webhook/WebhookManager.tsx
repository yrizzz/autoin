import React, { useState, useEffect } from 'react';
import AdminLayout from '../layout/AdminLayout';
import { Plus, Link2, Copy, Check, Trash2, Edit3, Globe, Code, Key } from 'lucide-react';

interface Webhook {
  id: string;
  name: string;
  url: string;
  platform: 'whatsapp' | 'telegram' | 'discord' | 'all';
  secretToken: string;
  status: 'active' | 'inactive';
}

const DEFAULT_WEBHOOKS: Webhook[] = [
  {
    id: 'w1',
    name: 'WooCommerce Order Webhook',
    url: 'http://localhost:8000/api/webhooks/trigger/aa5677d2-78d2-441d-a34f-019dcb67d581',
    platform: 'whatsapp',
    secretToken: 'whsec_89dfa89sd7f98s7df987df',
    status: 'active'
  },
  {
    id: 'w2',
    name: 'Server Alert Slack/Telegram',
    url: 'http://localhost:8000/api/webhooks/trigger/cc90223e-89a1-4322-b011-897cda761b02',
    platform: 'telegram',
    secretToken: 'whsec_908adfa09d8fa9s0dfa90s',
    status: 'active'
  }
];

export default function WebhookManager() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<'whatsapp' | 'telegram' | 'discord' | 'all'>('all');

  useEffect(() => {
    const saved = localStorage.getItem('autoin_webhooks');
    if (saved) {
      setWebhooks(JSON.parse(saved));
    } else {
      setWebhooks(DEFAULT_WEBHOOKS);
      localStorage.setItem('autoin_webhooks', JSON.stringify(DEFAULT_WEBHOOKS));
    }
  }, []);

  const saveToStorage = (updated: Webhook[]) => {
    setWebhooks(updated);
    localStorage.setItem('autoin_webhooks', JSON.stringify(updated));
  };

  const handleOpenCreate = () => {
    setEditingWebhook(null);
    setName('');
    setPlatform('all');
    setModalOpen(true);
  };

  const handleOpenEdit = (w: Webhook) => {
    setEditingWebhook(w);
    setName(w.name);
    setPlatform(w.platform);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus webhook ini?')) {
      const updated = webhooks.filter(w => w.id !== id);
      saveToStorage(updated);
    }
  };

  const handleSave = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingWebhook) {
      const updated = webhooks.map(w => 
        w.id === editingWebhook.id 
          ? { ...w, name, platform } 
          : w
      );
      saveToStorage(updated);
    } else {
      const id = Math.random().toString(36).substring(7);
      const uuid = crypto.randomUUID();
      const newWebhook: Webhook = {
        id,
        name,
        url: `http://localhost:8000/api/webhooks/trigger/${uuid}`,
        platform,
        secretToken: `whsec_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`,
        status: 'active'
      };
      saveToStorage([newWebhook, ...webhooks]);
    }
    setModalOpen(false);
  };

  const copyUrl = (w: Webhook) => {
    navigator.clipboard.writeText(w.url);
    setCopiedId(w.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const samplePayload = `{
  "message": "Halo! Order #1024 Anda telah dikonfirmasi.",
  "targets": ["628123456789"],
  "platform": "whatsapp"
}`;

  const copySamplePayload = () => {
    navigator.clipboard.writeText(samplePayload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <AdminLayout activePage="webhook" title="Webhook App">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Webhook Integration
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Hubungkan sistem eksternal Anda (misal WooCommerce, Laravel, Zapier) dengan AUTOIN untuk trigger kirim pesan otomatis.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/10 hover:from-blue-700 hover:to-blue-800 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Webhook Baru
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Webhook List */}
        <div className="lg:col-span-2 space-y-4">
          {webhooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl text-center px-4">
              <Link2 className="w-8 h-8 text-zinc-400 dark:text-zinc-500 mb-2" />
              <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Belum ada webhook</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">
                Buat Webhook endpoint untuk mengintegrasikan AUTOIN dengan sistem back-office Anda.
              </p>
            </div>
          ) : (
            webhooks.map(w => (
              <div
                key={w.id}
                className="bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 space-y-3 hover:border-blue-500/20 transition-all shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe className="w-4 h-4 text-blue-500 shrink-0" />
                    <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-100 truncate">{w.name}</h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[9px] font-extrabold capitalize">
                      {w.status}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[9px] font-extrabold uppercase">
                      {w.platform}
                    </span>
                  </div>
                </div>

                {/* Webhook Endpoint Input Bar */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={w.url}
                    readOnly
                    className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-[10px] font-mono text-zinc-600 dark:text-zinc-350 focus:outline-none"
                  />
                  <button
                    onClick={() => copyUrl(w)}
                    className="px-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl transition-all flex items-center justify-center cursor-pointer border border-zinc-200 dark:border-zinc-700/60"
                    title="Salin Webhook URL"
                  >
                    {copiedId === w.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Secret Token */}
                <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
                  <Key className="w-3 h-3 text-zinc-400" />
                  <span>X-Webhook-Secret: </span>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300 select-all">{w.secretToken}</span>
                </div>

                {/* Edit / Delete Buttons */}
                <div className="flex justify-end gap-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 mt-1">
                  <button
                    onClick={() => handleOpenEdit(w)}
                    className="p-1 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all cursor-pointer"
                    title="Edit Webhook"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(w.id)}
                    className="p-1 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                    title="Hapus Webhook"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Documentation Sidebar / Guide */}
        <div className="bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 space-y-4 shadow-sm h-fit">
          <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-100">
            <Code className="w-4 h-4 text-blue-500" />
            <h2 className="text-xs font-bold uppercase tracking-wide">Petunjuk Integrasi</h2>
          </div>

          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Kirimkan HTTP POST request ke Webhook URL di samping dengan payload JSON dan header authentikasi.
          </p>

          <div className="space-y-3">
            <div>
              <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Method & Headers</span>
              <pre className="bg-zinc-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-850/60 text-[9px] font-mono text-zinc-600 dark:text-zinc-350 overflow-x-auto space-y-1">
                <div>POST [Webhook URL]</div>
                <div>Content-Type: application/json</div>
                <div>X-Webhook-Secret: whsec_xxx</div>
              </pre>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Request Payload (JSON)</span>
                <button
                  onClick={copySamplePayload}
                  className="text-[9px] text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  {copiedPayload ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : 'Salin JSON'}
                </button>
              </div>
              <pre className="bg-zinc-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-850/60 text-[9px] font-mono text-zinc-600 dark:text-zinc-350 overflow-x-auto">
                {samplePayload}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit Webhook Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-zinc-950/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl dark:shadow-black/60 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-100 dark:bg-zinc-900/60">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                {editingWebhook ? 'Edit Webhook Integration' : 'Buat Webhook Integration Baru'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 text-xs font-semibold cursor-pointer transition-colors"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                  Nama Webhook
                </label>
                <input
                  type="text"
                  placeholder="Contoh: WooCommerce Payment Success"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-100"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                  Platform Default
                </label>
                <select
                  value={platform}
                  onChange={e => setPlatform(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-100 cursor-pointer"
                >
                  <option value="all">Semua Platform</option>
                  <option value="whatsapp">WhatsApp saja</option>
                  <option value="telegram">Telegram saja</option>
                  <option value="discord">Discord saja</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 font-bold text-xs rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer border border-zinc-200 dark:border-zinc-850"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/10 hover:from-blue-700 hover:to-blue-800 transition-all cursor-pointer"
                >
                  Simpan Webhook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
