import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import AdminLayout from '../layout/AdminLayout';
import {
  Plus, Search, Cpu, Trash2, Edit3, MessageSquare, Loader2,
  Sparkles, X, Upload, Video, FileText, Puzzle, Check, ArrowRight, Quote,
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
  plugin_id?: number | null;
  created_at: string;
}

interface PluginLite {
  id: number;
  name: string;
  description?: string | null;
  is_active: boolean;
}

type ReplyMode = 'text' | 'ai' | 'plugin';

const MATCH_LABELS: Record<string, string> = {
  exact: 'Sama Persis',
  contains: 'Mengandung kata',
  starts_with: 'Diawali dengan',
};

const getAbsoluteMediaUrl = (url: string | null) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = import.meta.env.PUBLIC_API_URL || 'http://localhost:8001';
  return `${base.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
};

export default function ChatbotRules() {
  const [rules, setRules] = useState<ChatbotRule[]>([]);
  const [plugins, setPlugins] = useState<PluginLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ChatbotRule | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [mode, setMode] = useState<ReplyMode>('text');
  const [trigger, setTrigger] = useState('');
  const [matchType, setMatchType] = useState<ChatbotRule['match_type']>('contains');
  const [reply, setReply] = useState('');
  const [platform, setPlatform] = useState<ChatbotRule['platform']>('all');
  const [replyType, setReplyType] = useState<'normal' | 'quote'>('normal');
  const [prefix, setPrefix] = useState<string>('any');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string | null>(null);
  const [pluginId, setPluginId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<ChatbotRule | null>(null);

  useEffect(() => { loadRules(); loadPlugins(); }, []);

  async function loadRules() {
    setLoading(true);
    try {
      setRules(await api.get<ChatbotRule[]>('/api/chatbot-rules'));
    } catch {
      setRules([]);
    }
    setLoading(false);
  }

  async function loadPlugins() {
    try {
      setPlugins(await api.get<PluginLite[]>('/api/plugins'));
    } catch {
      setPlugins([]);
    }
  }

  async function handleToggle(rule: ChatbotRule) {
    try {
      const updated = await api.put<ChatbotRule>(`/api/chatbot-rules/${rule.id}`, { is_active: !rule.is_active });
      setRules(prev => prev.map(r => r.id === rule.id ? updated : r));
    } catch (e: any) {
      alert(e.message ?? 'Gagal mengubah status.');
    }
  }

  function resetForm() {
    setMode('text');
    setTrigger('');
    setMatchType('contains');
    setReply('');
    setPlatform('all');
    setReplyType('normal');
    setPrefix('any');
    setMediaUrl(null);
    setMediaType(null);
    setPluginId(null);
  }

  function handleOpenCreate() {
    setEditingRule(null);
    resetForm();
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
    setPluginId(rule.plugin_id || null);
    setMode(rule.plugin_id ? 'plugin' : (rule.is_ai ? 'ai' : 'text'));
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
    if (!reply.trim()) { alert('Tulis pesan balasan terlebih dahulu untuk dioptimalkan.'); return; }
    setOptimizing(true);
    try {
      const res = await api.post<{ optimized: string }>('/api/ai/optimize', { content: reply });
      if (res?.optimized) setReply(res.optimized);
    } catch (e: any) {
      alert(e.message ?? 'Gagal mengoptimalkan pesan dengan AI.');
    } finally {
      setOptimizing(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!trigger.trim()) return;
    if (mode === 'plugin' && !pluginId) { alert('Pilih plugin yang akan dijalankan.'); return; }
    if (mode !== 'plugin' && !reply.trim()) { alert('Isi pesan balasan terlebih dahulu.'); return; }

    setSaving(true);
    try {
      const payload = {
        trigger,
        match_type: matchType,
        reply: mode === 'plugin' ? '' : reply,
        platform,
        reply_type: replyType,
        prefix,
        media_url: mode === 'plugin' ? null : mediaUrl,
        media_type: mode === 'plugin' ? null : mediaType,
        is_ai: mode === 'ai',
        plugin_id: mode === 'plugin' ? pluginId : null,
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
    (r.reply || '').toLowerCase().includes(search.toLowerCase())
  );

  const pluginById = (id?: number | null) => plugins.find(p => p.id === id);

  const MODES: { id: ReplyMode; label: string; icon: any; desc: string }[] = [
    { id: 'text', label: 'Teks / Media', icon: MessageSquare, desc: 'Balasan teks tetap, bisa dengan lampiran.' },
    { id: 'ai', label: 'AI Autopilot', icon: Sparkles, desc: 'Jawaban dinamis dari AI sesuai panduan.' },
    { id: 'plugin', label: 'Plugin', icon: Puzzle, desc: 'Jalankan script dari pustaka plugin.' },
  ];

  function ModeBadge({ rule }: { rule: ChatbotRule }) {
    if (rule.plugin_id) {
      const p = pluginById(rule.plugin_id);
      return (
        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase border bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 flex items-center gap-0.5">
          <Puzzle className="w-2.5 h-2.5" /> {p ? p.name : 'Plugin'}
        </span>
      );
    }
    if (rule.is_ai) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase border bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 flex items-center gap-0.5">
          <Sparkles className="w-2.5 h-2.5" /> AI
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 flex items-center gap-0.5">
        <MessageSquare className="w-2.5 h-2.5" /> Teks
      </span>
    );
  }

  return (
    <AdminLayout activePage="chatbot" title="Chatbot Auto-Reply">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            <Cpu className="w-6 h-6 text-blue-500" /> Chatbot Auto-Reply
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl">
            Balas pesan WhatsApp otomatis dari pemicu kata kunci. Pilih balasan <b>Teks</b>, <b>AI</b>,
            atau jalankan <b>Plugin</b> dari pustaka.
          </p>
        </div>
        <button onClick={handleOpenCreate}
          className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 font-bold text-xs rounded-xl shadow-md cursor-pointer shrink-0 text-white">
          <Plus className="w-4 h-4" /> Aturan Baru
        </button>
      </div>

      {/* Control bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 mb-6">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input type="text" placeholder="Cari pemicu atau balasan…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <a href="/plugins" className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 px-3.5 py-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800">
            <Puzzle className="w-3.5 h-3.5" /> Kelola Plugin
          </a>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold bg-zinc-100 dark:bg-zinc-900 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800">
            {rules.length} aturan
          </span>
        </div>
      </div>

      {/* Rules grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 animate-pulse space-y-4">
              <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
              <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl text-center px-4">
          <div className="w-14 h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center mb-4 border border-zinc-100 dark:border-zinc-800">
            <Cpu className="w-6 h-6 text-zinc-400" />
          </div>
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{search ? 'Tidak ada aturan yang cocok' : 'Belum ada aturan chatbot'}</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">{search ? 'Coba kata kunci lain.' : 'Buat auto-reply agar bot merespon otomatis.'}</p>
          {!search && <button onClick={handleOpenCreate} className="mt-4 btn-primary px-4 py-2 text-white text-xs font-bold rounded-xl">Mulai Buat Aturan</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(rule => {
            const plg = pluginById(rule.plugin_id);
            return (
              <div key={rule.id}
                className={`bg-white dark:bg-zinc-900 border rounded-2xl p-4 flex flex-col justify-between gap-3.5 transition-all shadow-sm hover:shadow-md ${
                  rule.is_active ? 'border-zinc-200 dark:border-zinc-800' : 'border-zinc-200 dark:border-zinc-850 opacity-70'}`}>
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 ${rule.is_active ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                        <MessageSquare className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block leading-none mb-1">Pemicu</span>
                        <h3 className="text-xs font-extrabold text-zinc-800 dark:text-zinc-100 truncate">
                          <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 font-mono text-[10.5px] text-blue-600 dark:text-blue-400">{rule.prefix && !['any','none'].includes(rule.prefix) ? rule.prefix : ''}{rule.trigger}</code>
                        </h3>
                      </div>
                    </div>
                    <button onClick={() => handleToggle(rule)} title={rule.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      className={`w-8 h-4.5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 mt-1 ${rule.is_active ? 'bg-blue-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
                      <div className={`bg-white w-3.5 h-3.5 rounded-full shadow transform transition-transform ${rule.is_active ? 'translate-x-3.5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <ModeBadge rule={rule} />
                    <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase border bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800">{MATCH_LABELS[rule.match_type] ?? rule.match_type}</span>
                    {rule.reply_type === 'quote' && <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase border bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 flex items-center gap-0.5"><Quote className="w-2.5 h-2.5" />Quote</span>}
                    {rule.prefix && rule.prefix !== 'any' && <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase border bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800">Prefix: {rule.prefix === 'none' ? 'tanpa' : `"${rule.prefix}"`}</span>}
                  </div>

                  {/* Body preview */}
                  {rule.plugin_id ? (
                    <div className="bg-blue-50/60 dark:bg-blue-500/5 border border-blue-200/60 dark:border-blue-500/15 px-3 py-2.5 rounded-xl flex items-center gap-2">
                      <Puzzle className="w-4 h-4 text-blue-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-800 dark:text-zinc-100 truncate">{plg ? plg.name : `Plugin #${rule.plugin_id}`}</p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{plg ? (plg.description || 'Jalankan script plugin') : 'Plugin tidak ditemukan'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800/60 px-3 py-2.5 rounded-xl">
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap line-clamp-3 font-medium">
                        <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase mr-1.5">{rule.is_ai ? 'Instruksi AI:' : 'Balasan:'}</span>
                        {rule.reply}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-3">
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{new Date(rule.created_at || Date.now()).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleOpenEdit(rule)} className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-all cursor-pointer" title="Edit"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(rule)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all cursor-pointer" title="Hapus"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 sm:rounded-3xl rounded-t-3xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-150 dark:border-zinc-900 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/30 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center"><Cpu className="w-4 h-4" /></div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{editingRule ? 'Edit Aturan' : 'Aturan Baru'}</h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Mode selector */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Mode Balasan</label>
                <div className="grid grid-cols-3 gap-2">
                  {MODES.map(m => {
                    const Icon = m.icon; const active = mode === m.id;
                    return (
                      <button type="button" key={m.id} onClick={() => setMode(m.id)}
                        className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-[11px] font-bold transition-all ${active ? 'btn-primary text-white border-transparent shadow-md' : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-blue-400'}`}>
                        <Icon className="w-4 h-4" /> {m.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-zinc-400 mt-1.5">{MODES.find(m => m.id === mode)?.desc}</p>
              </div>

              {/* Trigger + match */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Kata Kunci Pemicu</label>
                  <input type="text" placeholder={mode === 'plugin' ? 'cth: xprofile' : 'cth: halo, harga'} value={trigger} onChange={e => setTrigger(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-800 dark:text-zinc-100" required />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Kriteria Pencocokan</label>
                  <select value={matchType} onChange={e => setMatchType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-800 dark:text-zinc-100 cursor-pointer">
                    <option value="contains">Mengandung (Contains)</option>
                    <option value="exact">Sama Persis (Exact)</option>
                    <option value="starts_with">Diawali dengan (Starts With)</option>
                  </select>
                </div>
              </div>

              {/* Prefix + platform + reply_type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Prefix</label>
                  <select value={prefix} onChange={e => setPrefix(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-800 dark:text-zinc-100 cursor-pointer">
                    <option value="any">Bebas (apa saja / tanpa prefix)</option>
                    <option value="none">Tanpa prefix</option>
                    <option value=".">Titik ( . )</option>
                    <option value="/">Slash ( / )</option>
                    <option value="!">Seru ( ! )</option>
                    <option value="#">Pagar ( # )</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Tipe Kirim</label>
                  <select value={replyType} onChange={e => setReplyType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-800 dark:text-zinc-100 cursor-pointer">
                    <option value="normal">Balas Biasa</option>
                    <option value="quote">Reply &amp; Kutip</option>
                  </select>
                </div>
              </div>

              {/* ── Mode: PLUGIN ─────────────────────────────────────────── */}
              {mode === 'plugin' && (
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Pilih Plugin</label>
                  {plugins.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-4 text-center">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Belum ada plugin di pustaka.</p>
                      <a href="/plugins" className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">Buat plugin dulu <ArrowRight className="w-3 h-3" /></a>
                    </div>
                  ) : (
                    <>
                      <select value={pluginId ?? ''} onChange={e => setPluginId(e.target.value ? Number(e.target.value) : null)}
                        className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-800 dark:text-zinc-100 cursor-pointer">
                        <option value="">— pilih plugin —</option>
                        {plugins.map(p => (
                          <option key={p.id} value={p.id} disabled={!p.is_active}>
                            {p.name}{p.is_active ? '' : ' (nonaktif)'}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-start gap-2 rounded-xl bg-blue-50/60 dark:bg-blue-500/5 border border-blue-200/60 dark:border-blue-500/15 p-2.5">
                        <Puzzle className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                          Plugin dijalankan saat pesan cocok dengan <b>Trigger + Prefix</b> di atas.
                          Teks setelah pemicu menjadi <b>argumen</b> (mis. <code className="font-mono">{prefix !== 'any' && prefix !== 'none' ? prefix : '.'}{trigger || 'cmd'} budi</code> → args <code className="font-mono">budi</code>).
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── Mode: TEXT / AI ──────────────────────────────────────── */}
              {mode !== 'plugin' && (
                <>
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{mode === 'ai' ? 'Instruksi / Panduan AI' : 'Isi Pesan Balasan'}</label>
                      {mode === 'text' && (
                        <button type="button" onClick={handleOptimizeWithAI} disabled={optimizing}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-extrabold bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 rounded-lg cursor-pointer transition-all disabled:opacity-50">
                          {optimizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Optimalkan AI
                        </button>
                      )}
                    </div>
                    <textarea
                      placeholder={mode === 'ai' ? 'Cth: Jawab jam operasional 9–18, paket PRO Rp100rb/bln. Ramah & pakai emoji.' : 'Tulis pesan auto-reply di sini…'}
                      value={reply} onChange={e => setReply(e.target.value)} rows={4}
                      className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-800 dark:text-zinc-100 resize-none" required />
                  </div>

                  {mode === 'text' && (
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Lampiran Media (Opsional)</label>
                      {mediaUrl ? (() => {
                        const fullUrl = getAbsoluteMediaUrl(mediaUrl);
                        const filename = mediaUrl.split('/').pop();
                        return (
                          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-3 flex flex-col gap-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {mediaType === 'image' ? (
                                  <div className="w-8 h-8 rounded overflow-hidden border border-zinc-200 dark:border-zinc-700 shrink-0"><img src={fullUrl} className="w-full h-full object-cover" /></div>
                                ) : mediaType === 'video' ? (
                                  <div className="w-8 h-8 rounded bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20 shrink-0"><Video className="w-4 h-4" /></div>
                                ) : (
                                  <div className="w-8 h-8 rounded bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20 shrink-0"><FileText className="w-4 h-4" /></div>
                                )}
                                <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 truncate max-w-[150px]" title={filename}>{filename}</span>
                              </div>
                              <button type="button" onClick={() => { setMediaUrl(null); setMediaType(null); }} className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"><X className="w-4 h-4" /></button>
                            </div>
                            {mediaType === 'image' && <div className="aspect-video w-full rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800"><img src={fullUrl} className="w-full h-full object-cover" /></div>}
                            {mediaType === 'video' && <div className="aspect-video w-full rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800"><video src={fullUrl} className="w-full h-full object-cover" controls preload="metadata" muted /></div>}
                          </div>
                        );
                      })() : (
                        <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-all relative">
                          <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" disabled={uploading} />
                          {uploading ? (
                            <div className="flex flex-col items-center"><Loader2 className="w-5 h-5 text-blue-500 animate-spin mb-1" /><span className="text-[10px] font-bold text-zinc-500">Mengupload…</span></div>
                          ) : (
                            <div className="flex flex-col items-center"><Upload className="w-5 h-5 text-zinc-300 dark:text-zinc-600 mb-1" /><span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300">Upload File (Foto, Video, PDF)</span></div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Platform</label>
                  <select value={platform} onChange={e => setPlatform(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-800 dark:text-zinc-100 cursor-pointer">
                    <option value="all">Semua (WhatsApp)</option>
                    <option value="whatsapp">WhatsApp saja</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-150 dark:border-zinc-900 shrink-0">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 bg-zinc-50 hover:bg-zinc-150 dark:bg-zinc-900 dark:hover:bg-zinc-850 text-zinc-600 dark:text-zinc-300 font-bold text-xs rounded-xl border border-zinc-200 dark:border-zinc-800">Batal</button>
                <button type="submit" disabled={saving || uploading} className="btn-primary flex items-center gap-1.5 px-5 py-2.5 font-bold text-xs rounded-xl shadow-md text-white disabled:opacity-60">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Simpan Aturan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-500/20"><Trash2 className="w-5 h-5" /></div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-2">Hapus Aturan</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">Yakin hapus aturan untuk trigger <strong>"{ruleToDelete?.trigger}"</strong>? Tidak bisa dibatalkan.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setDeleteConfirmOpen(false); setRuleToDelete(null); }} className="flex-1 py-2.5 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800">Batal</button>
              <button type="button" onClick={confirmDeleteRule} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
