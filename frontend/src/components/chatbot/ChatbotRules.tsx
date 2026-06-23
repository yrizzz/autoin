import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import AdminLayout from '../layout/AdminLayout';
import { 
  Plus, Search, Cpu, ToggleLeft, ToggleRight, Trash2, Edit3, 
  MessageSquare, Loader2, MessageCircle, Settings, Settings2,
  HelpCircle, Sparkles, Check, X, ShieldAlert, ArrowRight, CornerDownRight,
  Upload, Video, FileText
} from 'lucide-react';

interface ChatbotRule {
  id: number;
  trigger: string;
  match_type: 'exact' | 'contains' | 'starts_with';
  reply: string;
  media_url?: string | null;
  media_type?: string | null;
  platform: 'all' | 'whatsapp';
  is_active: boolean;
  is_ai?: boolean;
  reply_type?: 'normal' | 'quote';
  prefix?: 'any' | 'none' | '.' | '/' | '!' | '#';
  created_at: string;
}

const MATCH_LABELS: Record<string, string> = {
  exact: 'Sama Persis',
  contains: 'Mengandung kata',
  starts_with: 'Diawali dengan',
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
  const [mediaUrl, setMediaUrl]   = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string | null>(null);
  const [isAi, setIsAi]           = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [optimizing, setOptimizing] = useState<boolean>(false);

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
    setMediaUrl(null);
    setMediaType(null);
    setIsAi(false);
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
    setMediaUrl(rule.media_url || null);
    setMediaType(rule.media_type || null);
    setIsAi(!!rule.is_ai);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const token = localStorage.getItem('autoin_token');
      const formData = new FormData();
      formData.append('file', files[0]);

      const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:8001';
      const res = await fetch(`${apiUrl}/api/upload`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setMediaUrl(data.url);
      setMediaType(data.mediaType || 'document');
    } catch (err: any) {
      alert(err.message ?? 'Gagal mengunggah file.');
    } finally {
      setUploading(false);
    }
  };

  async function handleOptimizeWithAI() {
    if (!reply.trim()) {
      alert('Tulis pesan balasan terlebih dahulu untuk dioptimalkan.');
      return;
    }
    setOptimizing(true);
    try {
      const res = await api.post<{ optimized: string; suggestions: string[]; is_simulated: boolean }>('/api/ai/optimize', {
        content: reply
      });
      if (res && res.optimized) {
        setReply(res.optimized);
      }
    } catch (e: any) {
      alert(e.message ?? 'Gagal mengoptimalkan pesan dengan AI.');
    } finally {
      setOptimizing(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!trigger.trim() || !reply.trim()) return;
    setSaving(true);
    try {
      const payload = {
        trigger,
        match_type: matchType,
        reply,
        platform,
        reply_type: replyType,
        prefix,
        media_url: mediaUrl,
        media_type: mediaType,
        is_ai: isAi,
      };
      if (editingRule) {
        const updated = await api.put<ChatbotRule>(`/api/chatbot-rules/${editingRule.id}`, payload);
        setRules(prev => prev.map(r => r.id === editingRule.id ? updated : r));
      } else {
        const created = await api.post<ChatbotRule>('/api/chatbot-rules', payload);
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg mb-3">
            <Cpu className="w-3 h-3" />
            Automation Engine
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight font-display">
            Chatbot & Auto Reply
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-lg">
            Bangun interaksi otomatis 24/7. Kirim balasan instan di WhatsApp berdasarkan pemicu kata kunci yang Anda tentukan secara fleksibel.
          </p>
        </div>
        <button onClick={handleOpenCreate}
          className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 font-bold text-xs rounded-xl shadow-md cursor-pointer shrink-0">
          <Plus className="w-4 h-4" />
          Aturan Baru
        </button>
      </div>

      {/* Control bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800/80 p-4 rounded-2xl shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
          <input type="text" placeholder="Cari kata kunci pemicu atau balasan..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 transition-all" />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold bg-zinc-100 dark:bg-zinc-900/60 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800">
            Total: <strong className="text-zinc-900 dark:text-white">{rules.length} aturan</strong>
          </span>
        </div>
      </div>

      {/* Rules Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800/60 rounded-xl p-4 animate-pulse space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-6 w-32 bg-zinc-250 dark:bg-zinc-800 rounded-lg" />
                <div className="h-6 w-12 bg-zinc-250 dark:bg-zinc-800 rounded-lg" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-zinc-250 dark:bg-zinc-800 rounded" />
                <div className="h-4 w-5/6 bg-zinc-250 dark:bg-zinc-800 rounded" />
              </div>
              <div className="h-10 bg-zinc-250 dark:bg-zinc-800 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800 rounded-2xl text-center px-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center mb-4 border border-zinc-100 dark:border-zinc-800/80">
            <Cpu className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
          </div>
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
            {search ? 'Tidak ada aturan yang cocok' : 'Belum ada aturan chatbot'}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs leading-relaxed">
            {search ? 'Cobalah kata kunci pencarian yang lain.' : 'Buat auto-reply agar bot merespon pesan otomatis ketika Anda offline.'}
          </p>
          {!search && (
            <button onClick={handleOpenCreate} className="mt-4 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl transition-all cursor-pointer">
              Mulai Buat Aturan
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(rule => (
            <div key={rule.id}
              className={`bg-white dark:bg-[#0e0e11] border rounded-xl p-4 flex flex-col justify-between gap-3.5 transition-all shadow-sm hover:shadow-md relative overflow-hidden group ${
                rule.is_active
                  ? 'border-zinc-200 dark:border-zinc-800 hover:border-blue-500/20'
                  : 'border-zinc-200 dark:border-zinc-850 opacity-70'
              }`}>
              
              {/* Card top */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${rule.is_active ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400'}`}>
                      <MessageCircle className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block leading-none mb-1">
                        Pemicu Pesan
                      </span>
                      <h3 className="text-xs font-extrabold text-zinc-800 dark:text-zinc-100 truncate flex items-center gap-1.5">
                        IF: <code className="bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-850 font-mono text-[10.5px] text-blue-600 dark:text-blue-400">"{rule.trigger}"</code>
                      </h3>
                    </div>
                  </div>

                  {/* Sleek Custom Pill Toggle Status */}
                  <button
                    onClick={() => handleToggle(rule)}
                    className={`w-8 h-4.5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 mt-1 ${
                      rule.is_active ? 'bg-blue-500' : 'bg-zinc-250 dark:bg-zinc-800'
                    }`}
                    title={rule.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  >
                    <div
                      className={`bg-white w-3.5 h-3.5 rounded-full shadow transform transition-transform duration-250 ${
                        rule.is_active ? 'translate-x-3.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Metadata Badges */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {rule.is_ai && (
                    <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase border bg-purple-500/10 text-purple-650 dark:text-purple-400 border-purple-500/20 flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5 text-purple-500" />
                      AI Autopilot
                    </span>
                  )}
                  <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase border bg-blue-500/5 text-blue-600 dark:text-blue-450 border-blue-500/10">
                    {MATCH_LABELS[rule.match_type] ?? rule.match_type}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase border ${
                    rule.platform === 'whatsapp' 
                      ? 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-450 border-emerald-500/10' 
                      : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-650 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800'
                  }`}>
                    {rule.platform === 'all' ? 'WhatsApp' : rule.platform}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase border ${
                    rule.reply_type === 'quote' 
                      ? 'bg-purple-500/5 text-purple-600 dark:text-purple-450 border-purple-500/10' 
                      : 'bg-amber-500/5 text-amber-600 dark:text-amber-450 border-amber-500/10'
                  }`}>
                    {rule.reply_type === 'quote' ? 'Quote' : 'Biasa'}
                  </span>
                  {rule.prefix && rule.prefix !== 'any' && (
                    <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase border bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800">
                      Prefix: "{rule.prefix}"
                    </span>
                  )}
                </div>

                {/* Media Preview block */}
                {rule.media_url && (
                  <div className="rounded-xl border border-zinc-100 dark:border-zinc-900/60 bg-zinc-50 dark:bg-zinc-950/20 p-2 flex items-center gap-2">
                    {rule.media_type === 'image' ? (
                      <img src={rule.media_url} className="w-8 h-8 object-cover rounded border border-zinc-200 dark:border-zinc-850" />
                    ) : rule.media_type === 'video' ? (
                      <div className="w-8 h-8 rounded bg-purple-500/10 text-purple-600 flex items-center justify-center border border-purple-500/20">
                        <Video className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 truncate max-w-[180px]">
                      {rule.media_url.split('/').pop()}
                    </span>
                  </div>
                )}

                {/* Response Preview block */}
                <div className="bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-900/60 px-3 py-2.5 rounded-xl relative">
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap line-clamp-3 font-medium">
                    <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase mr-1.5">{rule.is_ai ? 'Instruksi AI:' : 'Reply:'}</span>
                    {rule.reply}
                  </p>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-900 pt-3 mt-1">
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                  Dibuat {new Date(rule.created_at || Date.now()).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleOpenEdit(rule)}
                    className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-all cursor-pointer" title="Edit Aturan">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(rule)}
                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all cursor-pointer" title="Hapus Aturan">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-zinc-150 dark:border-zinc-900 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/30 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <Settings2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  {editingRule ? 'Edit Aturan Chatbot' : 'Buat Aturan Chatbot Baru'}
                </h3>
              </div>
              <button onClick={() => setModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                    Kata Kunci Pemicu (Trigger)
                  </label>
                  <input type="text" placeholder="Contoh: halo, harga, bantuan"
                    value={trigger} onChange={e => setTrigger(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-100"
                    required />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                    Kriteria Pencocokan
                  </label>
                  <select value={matchType} onChange={e => setMatchType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-100 cursor-pointer">
                    <option value="contains">Mengandung (Contains)</option>
                    <option value="exact">Sama Persis (Exact Match)</option>
                    <option value="starts_with">Diawali dengan (Starts With)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Platform</label>
                  <select value={platform} onChange={e => setPlatform(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-100 cursor-pointer">
                    <option value="all">Semua (WhatsApp)</option>
                    <option value="whatsapp">WhatsApp saja</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Tipe Balasan</label>
                  <select value={replyType} onChange={e => setReplyType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-100 cursor-pointer">
                    <option value="normal">Balas Biasa (Normal)</option>
                    <option value="quote">Reply & Kutip (Quote)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                  Prefix Command
                </label>
                <select value={prefix} onChange={e => setPrefix(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-100 cursor-pointer">
                  <option value="any">Bebas Prefix (Bisa pakai prefix apa saja atau tanpa prefix)</option>
                  <option value="none">Tanpa Prefix (Hanya merespon teks polos tanpa prefix)</option>
                  <option value=".">Hanya Prefix Titik ( . )</option>
                  <option value="/">Hanya Prefix Slash ( / )</option>
                  <option value="!">Hanya Prefix Tanda Seru ( ! )</option>
                  <option value="#">Hanya Prefix Pagar ( # )</option>
                </select>
              </div>

              {/* AI Autopilot Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-purple-500/5 border border-purple-500/10 rounded-2xl">
                <div>
                  <span className="block text-xs font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                    Mode AI Autopilot
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    Gunakan kecerdasan buatan untuk menjawab secara dinamis berdasarkan instruksi.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAi(!isAi)}
                  className={`w-8 h-4.5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                    isAi ? 'bg-purple-600' : 'bg-zinc-250 dark:bg-zinc-800'
                  }`}
                >
                  <div
                    className={`bg-white w-3.5 h-3.5 rounded-full shadow transform transition-transform duration-250 ${
                      isAi ? 'translate-x-3.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Reply Textarea with AI Optimization */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    {isAi ? 'Instruksi / Panduan AI' : 'Isi Pesan Balasan (Reply)'}
                  </label>
                  {!isAi && (
                    <button
                      type="button"
                      onClick={handleOptimizeWithAI}
                      disabled={optimizing}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-extrabold bg-purple-500/10 hover:bg-purple-500/15 text-purple-650 dark:text-purple-400 rounded-lg cursor-pointer transition-all disabled:opacity-50"
                    >
                      {optimizing ? (
                        <Loader2 className="w-3 h-3 animate-spin animate-pulse" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      Optimalkan dengan AI
                    </button>
                  )}
                </div>
                <textarea
                  placeholder={
                    isAi
                      ? "Contoh: Jawab pelanggan bahwa jam operasional kami jam 9-18. Beri tahu harga paket PRO Rp 100rb/bln. Bersikaplah ramah dan gunakan emoji."
                      : "Tulis pesan auto-reply di sini..."
                  }
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  rows={4}
                  className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-100 resize-none font-sans"
                  required
                />
              </div>

              {/* Media Upload */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                  Lampiran Media (Opsional)
                </label>
                {mediaUrl ? (
                  <div className="relative rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-50 dark:bg-zinc-900/40 p-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {mediaType === 'image' ? (
                        <img src={mediaUrl} className="w-10 h-10 object-cover rounded border border-zinc-200 dark:border-zinc-850" />
                      ) : mediaType === 'video' ? (
                        <div className="w-10 h-10 rounded bg-purple-500/10 text-purple-600 flex items-center justify-center border border-purple-500/20">
                          <Video className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}
                      <span className="text-[11px] font-bold text-zinc-650 dark:text-zinc-350 truncate max-w-[150px]">
                        {mediaUrl.split('/').pop()}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setMediaUrl(null); setMediaType(null); }}
                      className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-250 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-all relative">
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={uploading}
                    />
                    {uploading ? (
                      <div className="flex flex-col items-center justify-center">
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin mb-1" />
                        <span className="text-[10px] font-bold text-zinc-500">Mengupload media...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <Upload className="w-5 h-5 text-zinc-300 dark:text-zinc-600 mb-1" />
                        <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
                          Klik untuk Upload File (Foto, Video, PDF)
                        </span>
                        <span className="text-[8px] text-zinc-400 dark:text-zinc-500">
                          File akan dikirim otomatis bersama balasan chat.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-150 dark:border-zinc-900 shrink-0">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 bg-zinc-50 hover:bg-zinc-150 dark:bg-zinc-900 dark:hover:bg-zinc-850 text-zinc-600 dark:text-zinc-300 font-bold text-xs rounded-xl transition-all cursor-pointer border border-zinc-200 dark:border-zinc-800">
                  Batal
                </button>
                <button type="submit" disabled={saving || uploading}
                  className="btn-primary flex items-center gap-1.5 px-5 py-2.5 font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-60">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-2">Hapus Aturan</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
              Apakah Anda yakin ingin menghapus aturan chatbot untuk trigger <strong>"{ruleToDelete?.trigger}"</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setDeleteConfirmOpen(false); setRuleToDelete(null); }}
                className="flex-1 py-2.5 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer border border-zinc-250 dark:border-zinc-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteRule}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
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
