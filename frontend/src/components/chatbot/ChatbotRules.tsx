import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import AdminLayout from '../layout/AdminLayout';
import { Plus, Search, Cpu, ToggleLeft, ToggleRight, Trash2, Edit3, MessageSquare, Loader2 } from 'lucide-react';

interface ChatbotRule {
  id: number;
  trigger: string;
  match_type: 'exact' | 'contains' | 'starts_with';
  reply: string;
  platform: 'all' | 'whatsapp';
  is_active: boolean;
  reply_type?: 'normal' | 'quote';
  prefix?: 'any' | 'none' | '.' | '/' | '!' | '#';
  created_at: string;
}

const MATCH_LABELS: Record<string, string> = {
  exact: 'Sama Persis',
  contains: 'Mengandung',
  starts_with: 'Diawali',
};

export default function ChatbotRules() {
  const [rules, setRules]       = useState<ChatbotRule[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ChatbotRule | null>(null);
  const [saving, setSaving]     = useState(false);

  // Form states
  const [trigger, setTrigger]     = useState('');
  const [matchType, setMatchType] = useState<ChatbotRule['match_type']>('contains');
  const [reply, setReply]         = useState('');
  const [platform, setPlatform]   = useState<ChatbotRule['platform']>('all');
  const [replyType, setReplyType] = useState<'normal' | 'quote'>('normal');
  const [prefix, setPrefix]       = useState<string>('any');

  // Custom delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<ChatbotRule | null>(null);

  useEffect(() => { loadRules(); }, []);

  async function loadRules() {
    setLoading(true);
    try {
      const data = await api.get<ChatbotRule[]>('/api/chatbot-rules');
      setRules(data);
    } catch {
      setRules([]);
    }
    setLoading(false);
  }

  async function handleToggle(rule: ChatbotRule) {
    try {
      const updated = await api.put<ChatbotRule>(`/api/chatbot-rules/${rule.id}`, {
        is_active: !rule.is_active,
      });
      setRules(prev => prev.map(r => r.id === rule.id ? updated : r));
    } catch (e: any) {
      alert(e.message ?? 'Gagal mengubah status.');
    }
  }

  function handleOpenCreate() {
    setEditingRule(null);
    setTrigger('');
    setMatchType('contains');
    setReply('');
    setPlatform('all');
    setReplyType('normal');
    setPrefix('any');
    setModalOpen(true);
  }

  function handleOpenEdit(rule: ChatbotRule) {
    setEditingRule(rule);
    setTrigger(rule.trigger);
    setMatchType(rule.match_type);
    setReply(rule.reply);
    setPlatform(rule.platform);
    setReplyType(rule.reply_type || 'normal');
    setPrefix(rule.prefix || 'any');
    setModalOpen(true);
  }

  function handleDelete(rule: ChatbotRule) {
    setRuleToDelete(rule);
    setDeleteConfirmOpen(true);
  }

  async function confirmDeleteRule() {
    if (!ruleToDelete) return;
    const rule = ruleToDelete;
    setDeleteConfirmOpen(false);
    setRuleToDelete(null);
    try {
      await api.delete(`/api/chatbot-rules/${rule.id}`);
      setRules(prev => prev.filter(r => r.id !== rule.id));
    } catch (e: any) {
      alert(e.message ?? 'Gagal menghapus.');
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!trigger.trim() || !reply.trim()) return;
    setSaving(true);
    try {
      if (editingRule) {
        const updated = await api.put<ChatbotRule>(`/api/chatbot-rules/${editingRule.id}`, {
          trigger, match_type: matchType, reply, platform, reply_type: replyType, prefix,
        });
        setRules(prev => prev.map(r => r.id === editingRule.id ? updated : r));
      } else {
        const created = await api.post<ChatbotRule>('/api/chatbot-rules', {
          trigger, match_type: matchType, reply, platform, reply_type: replyType, prefix,
        });
        setRules(prev => [created, ...prev]);
      }
      setModalOpen(false);
    } catch (e: any) {
      alert(e.message ?? 'Gagal menyimpan.');
    }
    setSaving(false);
  }

  const filtered = rules.filter(r =>
    r.trigger.toLowerCase().includes(search.toLowerCase()) ||
    r.reply.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout activePage="chatbot" title="Chatbot Rules">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Chatbot (Auto Reply)
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Balas pesan otomatis berdasarkan kata kunci — aktif untuk WhatsApp.
          </p>
        </div>
        <button onClick={handleOpenCreate}
          className="btn-primary flex items-center gap-2 px-4 py-2 font-bold text-xs rounded-xl shadow-md cursor-pointer shrink-0">
          <Plus className="w-4 h-4" />
          Aturan Baru
        </button>
      </div>

      {/* Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
          <input type="text" placeholder="Cari kata kunci atau balasan..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-all shadow-sm" />
        </div>
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold bg-zinc-100 dark:bg-zinc-800/60 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
          {rules.length} aturan aktif
        </span>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 animate-pulse">
              <div className="flex gap-4">
                <div className="w-11 h-11 rounded-xl bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-40 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-2.5 w-64 bg-zinc-200 dark:bg-zinc-800 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-center px-4">
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center mb-3">
            <Cpu className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
          </div>
          <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
            {search ? 'Tidak ada hasil' : 'Belum ada aturan chatbot'}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">
            {search ? 'Coba kata kunci lain.' : 'Klik "Aturan Baru" untuk membuat auto-reply pertama.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(rule => (
            <div key={rule.id}
              className={`bg-white dark:bg-[#0e0e11] border rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-sm ${
                rule.is_active
                  ? 'border-zinc-200 dark:border-zinc-800/80 hover:border-blue-500/20'
                  : 'border-zinc-200 dark:border-zinc-800/40 opacity-60'
              }`}>
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl shrink-0 ${rule.is_active ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 bg-blue-500/[0.06] border border-blue-500/10 px-2.5 py-0.5 rounded-lg">
                      IF: "{rule.trigger}"
                    </span>
                    <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 text-[9px] font-extrabold uppercase">
                      {MATCH_LABELS[rule.match_type] ?? rule.match_type}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                      rule.platform === 'whatsapp' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                      'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400'
                    }`}>
                      {rule.platform === 'all' ? 'Semua' : rule.platform}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                      rule.reply_type === 'quote' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}>
                      {rule.reply_type === 'quote' ? 'Reply / Quote' : 'Balas Biasa'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                      rule.prefix === 'none' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                      rule.prefix === 'any' ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400' :
                      'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                    }`}>
                      Prefix: {rule.prefix === 'any' ? 'Bebas' : rule.prefix === 'none' ? 'Tanpa Prefix' : `"${rule.prefix}"`}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 max-w-xl whitespace-pre-wrap">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">Reply: </span>
                    {rule.reply}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 border-zinc-100 dark:border-zinc-800/60 pt-3 md:pt-0">
                <button onClick={() => handleToggle(rule)} className="cursor-pointer" title={rule.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                  {rule.is_active
                    ? <ToggleRight className="w-8 h-8 text-blue-600 dark:text-blue-500" />
                    : <ToggleLeft className="w-8 h-8 text-zinc-400 dark:text-zinc-600" />
                  }
                </button>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleOpenEdit(rule)}
                    className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all cursor-pointer" title="Edit">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(rule)}
                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all cursor-pointer" title="Hapus">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-zinc-950/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl dark:shadow-black/60 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-100 dark:bg-zinc-900/60">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                {editingRule ? 'Edit Aturan Chatbot' : 'Buat Aturan Chatbot Baru'}
              </h3>
              <button onClick={() => setModalOpen(false)}
                className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 text-xs font-semibold cursor-pointer transition-colors">
                Tutup
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                    Kata Kunci Pemicu (Trigger)
                  </label>
                  <input type="text" placeholder="Contoh: halo, harga, bantuan"
                    value={trigger} onChange={e => setTrigger(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-100"
                    required />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                    Kriteria Pencocokan
                  </label>
                  <select value={matchType} onChange={e => setMatchType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-100 cursor-pointer">
                    <option value="contains">Mengandung (Contains)</option>
                    <option value="exact">Sama Persis (Exact Match)</option>
                    <option value="starts_with">Diawali dengan (Starts With)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Platform</label>
                  <select value={platform} onChange={e => setPlatform(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-100 cursor-pointer">
                    <option value="all">Semua (WhatsApp)</option>
                    <option value="whatsapp">WhatsApp saja</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Tipe Balasan</label>
                  <select value={replyType} onChange={e => setReplyType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-100 cursor-pointer">
                    <option value="normal">Balas Biasa (Normal)</option>
                    <option value="quote">Reply / Quote</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                  Prefix Command
                </label>
                <select value={prefix} onChange={e => setPrefix(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-100 cursor-pointer">
                  <option value="any">Bebas Prefix (Bisa pakai prefix apa saja atau tanpa prefix)</option>
                  <option value="none">Tanpa Prefix (Hanya merespon teks polos tanpa prefix)</option>
                  <option value=".">Hanya Prefix Titik ( . )</option>
                  <option value="/">Hanya Prefix Slash ( / )</option>
                  <option value="!">Hanya Prefix Tanda Seru ( ! )</option>
                  <option value="#">Hanya Prefix Pagar ( # )</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                  Isi Pesan Balasan (Reply)
                </label>
                <textarea placeholder="Tulis pesan auto-reply di sini..."
                  value={reply} onChange={e => setReply(e.target.value)}
                  rows={5}
                  className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-100 resize-none font-sans"
                  required />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 font-bold text-xs rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer border border-zinc-200 dark:border-zinc-700">
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="btn-primary flex items-center gap-1.5 px-4 py-2 font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-60">
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Simpan Aturan
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
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-2">Hapus Aturan</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
              Apakah Anda yakin ingin menghapus aturan chatbot untuk trigger <strong>"{ruleToDelete?.trigger}"</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setDeleteConfirmOpen(false); setRuleToDelete(null); }}
                className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all cursor-pointer border border-zinc-200 dark:border-zinc-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteRule}
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
