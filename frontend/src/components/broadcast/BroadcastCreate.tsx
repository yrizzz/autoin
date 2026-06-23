import { useEffect, useState, useMemo, useRef } from 'react';
import { api } from '../../lib/api';
import type { Channel } from '../../types';
import AdminLayout from '../layout/AdminLayout';
import Toast from '../ui/Toast';
import {
  Send, Sparkles, Check, AlertCircle, MessageSquare, Globe,
  Loader2, Bookmark, Image as ImageIcon, Video, FileText, Plus,
  Trash2, Paperclip, Upload, X, Calendar, Clock, Users, Search,
  Phone, Hash, UserCheck, Wand2, Lightbulb, Copy, CheckCircle2,
  ArrowRight, Info, Eye, HelpCircle
} from 'lucide-react';

interface Recipient { id: string; name: string; phone?: string; type: 'contact' | 'group'; }

interface ChannelRecipientState {
  loading: boolean;
  items: Recipient[];
  selected: Set<string>;
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-pink-500', 'bg-orange-500',
  'bg-emerald-500', 'bg-sky-500', 'bg-purple-500', 'bg-cyan-500',
  'bg-rose-500', 'bg-teal-500', 'bg-amber-500', 'bg-indigo-500',
];

function avatarColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function parseWhatsAppFormatting(text: string): string {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  html = html.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');
  html = html.replace(/~(.*?)~/g, '<del>$1</del>');
  html = html.replace(/```(.*?)```/gs, '<code class="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono text-[11px]">$1</code>');
  html = html.replace(/\n/g, '<br />');
  return html;
}

function PlatformIcon({ platform, className = 'w-5 h-5' }: { platform: string; className?: string }) {
  if (platform === 'whatsapp') return (
    <svg className={`${className} text-emerald-500`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.908.533 3.69 1.465 5.215L2 22l4.928-1.412A9.97 9.97 0 0012.004 22c5.524 0 10.004-4.48 10.004-10.004C22.008 6.48 17.528 2 12.004 2zm0 18.008c-1.67 0-3.238-.456-4.6-1.25L4.4 19.6l.858-2.928a8.004 8.004 0 116.746 3.336zM15.908 13.4c-.22-.11-1.3-.642-1.503-.715-.2-.074-.347-.11-.495.11-.147.22-.57.715-.7.863-.128.147-.257.165-.477.055a6.002 6.002 0 01-1.77-1.093c-.633-.564-1.062-1.26-1.186-1.48-.124-.22-.013-.34.097-.45.1-.1.22-.257.33-.385.11-.128.147-.22.22-.367.073-.147.037-.275-.018-.385-.055-.11-.495-1.193-.68-1.637-.18-.433-.36-.374-.495-.38l-.42-.008c-.147 0-.386.055-.588.275-.2.22-.77.752-.77 1.834 0 1.082.788 2.128.9 2.275.11.147 1.55 2.365 3.755 3.318.524.226.934.362 1.254.464.526.167 1.004.143 1.382.087.42-.062 1.3-.532 1.485-1.046.183-.513.183-.953.128-1.046-.055-.093-.202-.147-.422-.257z" />
    </svg>
  );
  return <Globe className={`${className} text-zinc-500`} />;
}

function RecipientModal({
  channel,
  state,
  onClose,
  onToggle,
  onClearAll,
}: {
  channel: Channel;
  state: ChannelRecipientState;
  onClose: () => void;
  onToggle: (id: string) => void;
  onClearAll: () => void;
}) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'contacts' | 'groups' | 'selected'>('contacts');

  const contacts = state.items.filter(r => r.type === 'contact');
  const groups   = state.items.filter(r => r.type === 'group');
  const selected = state.items.filter(r => state.selected.has(r.id));

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const pool = tab === 'contacts' ? contacts : tab === 'groups' ? groups : selected;
    return q ? pool.filter(r => r.name.toLowerCase().includes(q) || (r.phone || r.id).includes(q)) : pool;
  }, [tab, contacts, groups, selected, search]);

  const allInTab = tab === 'contacts' ? contacts : tab === 'groups' ? groups : [];
  const allTabSelected = allInTab.length > 0 && allInTab.every(r => state.selected.has(r.id));

  function toggleTabAll() {
    if (allTabSelected) {
      allInTab.forEach(r => state.selected.has(r.id) && onToggle(r.id));
    } else {
      allInTab.forEach(r => !state.selected.has(r.id) && onToggle(r.id));
    }
  }

  const platformLabel = 'WhatsApp';
  const platformColor = 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${platformColor} shrink-0`}>
              <PlatformIcon platform={channel.platform} className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-white truncate">Pilih Penerima</h3>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">{channel.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-250 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input type="text" placeholder="Cari nama, nomor, atau ID..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          {(['contacts', 'groups', 'selected'] as const).map(t => {
            const count = t === 'contacts' ? contacts.length : t === 'groups' ? groups.length : state.selected.size;
            return (
              <button key={t} onClick={() => { setTab(t); setSearch(''); }}
                className={`flex-1 py-2 text-center rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                  tab === t
                    ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}>
                {t === 'contacts' ? 'Kontak' : t === 'groups' ? 'Grup' : 'Terpilih'} ({count})
              </button>
            );
          })}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {tab !== 'selected' && allInTab.length > 0 && (
            <button type="button" onClick={toggleTabAll}
              className="w-full flex items-center justify-between p-2.5 mb-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 hover:bg-zinc-100 dark:hover:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 text-xs font-bold text-zinc-700 dark:text-zinc-300 text-left transition-all cursor-pointer">
              <span>{allTabSelected ? 'Batal Pilih Semua di Halaman Ini' : 'Pilih Semua di Halaman Ini'}</span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400">{allInTab.length} item</span>
            </button>
          )}

          {state.loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="text-xs text-zinc-400">Memuat kontak & grup...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-zinc-400 dark:text-zinc-600 text-xs">
              {search ? 'Pencarian tidak ditemukan.' : tab === 'selected' ? 'Belum ada penerima terpilih.' : 'Tidak ada data.'}
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.map(r => {
                const isSelected = state.selected.has(r.id);
                const isGroup = r.type === 'group';
                return (
                  <label key={r.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-500/30'
                      : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                  }`}>
                    <input type="checkbox" checked={isSelected} onChange={() => onToggle(r.id)}
                      className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer" />
                    <div className={`w-8 h-8 rounded-full ${avatarColor(r.id)} flex items-center justify-center text-white text-[10px] font-extrabold uppercase shrink-0`}>
                      {r.name.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-250 truncate">{r.name}</span>
                        {isGroup && (
                          <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20 shrink-0">Grup</span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono truncate mt-0.5">{r.phone || r.id}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 shrink-0 flex items-center justify-between gap-3">
          <div className="min-w-0">
            {state.selected.size > 0 ? (
              <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                {state.selected.size} terpilih
              </span>
            ) : (
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 italic">Kirim ke semua</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {state.selected.size > 0 && (
              <button type="button" onClick={onClearAll}
                className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg cursor-pointer transition-all">
                Reset
              </button>
            )}
            <button type="button" onClick={onClose}
              className="btn-primary px-4 py-1.5 text-xs font-bold rounded-lg cursor-pointer">
              Simpan
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function BroadcastCreate() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Tabs State (Mobile & Desktop sections)
  const [activeTab, setActiveTab] = useState<'editor' | 'ai' | 'preview'>('editor');

  const [channels, setChannels]           = useState<Channel[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<number[]>([]);
  const [recipientState, setRecipientState] = useState<Record<number, ChannelRecipientState>>({});
  const [recipientModal, setRecipientModal] = useState<Channel | null>(null);
  const [content, setContent]             = useState('');
  const [title, setTitle]                 = useState('');
  const [sending, setSending]             = useState(false);
  const [result, setResult]               = useState<{ ok: boolean; message: string } | null>(null);

  const [scheduledAt, setScheduledAt]     = useState('');
  const [recurring, setRecurring]         = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');

  const [mediaUrls, setMediaUrls]         = useState<string[]>([]);
  const [mediaType, setMediaType]         = useState<'image' | 'video' | 'pdf' | 'document'>('image');
  const [inputUrl, setInputUrl]           = useState('');
  const [uploading, setUploading]         = useState(false);

  const [aiTone, setAiTone]               = useState<string | null>(null);
  const [aiGenerating, setAiGenerating]   = useState(false);
  const [aiTab, setAiTab]                 = useState<'rewrite' | 'generate' | 'optimize'>('rewrite');
  const [isSimulatedInfo, setIsSimulatedInfo] = useState<boolean | null>(null);

  // AI Generator States
  const [aiGenType, setAiGenType]         = useState<'promo' | 'announcement' | 'reminder' | 'caption'>('promo');
  const [aiGenContext, setAiGenContext]   = useState('');
  const [aiGenResult, setAiGenResult]     = useState('');
  const [aiGenLoading, setAiGenLoading]   = useState(false);

  // AI Optimizer States
  const [aiOptSuggestions, setAiOptSuggestions] = useState<string[]>([]);
  const [aiOptResult, setAiOptResult]     = useState('');
  const [aiOptLoading, setAiOptLoading]   = useState(false);
  const [showOptResult, setShowOptResult] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [templates, setTemplates]         = useState<Array<{ id: number; title: string; content: string; platform: string }>>([]);
  const [showVarHelpModal, setShowVarHelpModal] = useState(false);

  useEffect(() => {
    api.get<Channel[]>('/api/channels')
      .then(chs => setChannels(chs.filter(c => c.status === 'active' && c.platform === 'whatsapp')))
      .catch(() => setChannels([]));
  }, []);

  useEffect(() => {
    if (templatePickerOpen) {
      api.get<Array<{ id: number; title: string; content: string; platform: string }>>('/api/templates')
        .then(setTemplates)
        .catch(() => setTemplates([]));
    }
  }, [templatePickerOpen]);

  function applyFormat(type: 'bold' | 'italic' | 'strike' | 'code') {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    let prefix = '';
    let suffix = '';
    if (type === 'bold') { prefix = '*'; suffix = '*'; }
    else if (type === 'italic') { prefix = '_'; suffix = '_'; }
    else if (type === 'strike') { prefix = '~'; suffix = '~'; }
    else if (type === 'code') { prefix = '```'; suffix = '```'; }

    const selectedText = text.substring(start, end);
    const before = text.substring(0, start);
    const after = text.substring(end);
    const newContent = before + prefix + selectedText + suffix + after;
    setContent(newContent);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 0);
  }

  const [quickAiLoading, setQuickAiLoading] = useState(false);

  const handleQuickAiAction = async (action: 'optimize' | 'marketing' | 'santai' | 'formal') => {
    if (!content.trim()) { alert('Tulis draf pesan di editor terlebih dahulu!'); return; }
    setQuickAiLoading(true);
    try {
      if (action === 'optimize') {
        const res = await api.post<{ optimized: string; suggestions: string[]; is_simulated: boolean }>('/api/ai/optimize', { content });
        setContent(res.optimized);
      } else {
        const res = await api.post<{ rewritten: string; is_simulated: boolean }>('/api/ai/rewrite', { content, tone: action });
        setContent(res.rewritten);
      }
    } catch (err: any) {
      alert(err.message ?? 'Gagal memproses AI helper.');
    } finally {
      setQuickAiLoading(false);
    }
  };

  function toggleChannel(id: number) {
    setSelectedChannels(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  }

  function handleSelectAllChannels() {
    setSelectedChannels(selectedChannels.length === channels.length ? [] : channels.map(c => c.id));
  }

  async function openRecipientModal(ch: Channel) {
    const id = ch.id;
    if (!recipientState[id]) {
      setRecipientState(prev => ({
        ...prev,
        [id]: { loading: true, items: [], selected: new Set() },
      }));
      try {
        let items: Recipient[] = [];
        if (ch.platform === 'whatsapp') {
          const [cRes, gRes] = await Promise.all([
            api.get<{ contacts: any[] }>(`/api/whatsapp/${id}/contacts`).catch(() => ({ contacts: [] })),
            api.get<{ groups: any[] }>(`/api/whatsapp/${id}/groups`).catch(() => ({ groups: [] })),
          ]);
          const contacts: Recipient[] = (cRes.contacts || [])
            .filter((c: any) => c.id && (c.id.endsWith('@s.whatsapp.net') || c.id.endsWith('@lid')) && !c.id.startsWith('status@'))
            .map((c: any) => ({
              id: c.id,
              name: c.name && !c.name.includes('@') ? c.name : (c.id.endsWith('@lid') ? 'Kontak WhatsApp' : c.id.split('@')[0]),
              phone: c.id.endsWith('@lid') ? undefined : `+${c.id.split('@')[0]}`,
              type: 'contact' as const
            }));
          const groups: Recipient[] = (gRes.groups || [])
            .map((g: any) => ({ id: g.id, name: g.name || g.subject || g.id, type: 'group' as const }));
          items = [...contacts, ...groups];
        }
        setRecipientState(prev => ({
          ...prev,
          [id]: { loading: false, items, selected: prev[id]?.selected ?? new Set() },
        }));
      } catch {
        setRecipientState(prev => ({
          ...prev,
          [id]: { loading: false, items: [], selected: prev[id]?.selected ?? new Set() },
        }));
      }
    }
    setRecipientModal(ch);
  }

  function toggleRecipient(channelId: number, recipientId: string) {
    setRecipientState(prev => {
      const cur = prev[channelId];
      if (!cur) return prev;
      const next = new Set(cur.selected);
      next.has(recipientId) ? next.delete(recipientId) : next.add(recipientId);
      return { ...prev, [channelId]: { ...cur, selected: next } };
    });
  }

  function clearAllRecipients(channelId: number) {
    setRecipientState(prev => {
      const cur = prev[channelId];
      if (!cur) return prev;
      return { ...prev, [channelId]: { ...cur, selected: new Set() } };
    });
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const token = localStorage.getItem('autoin_token');
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${import.meta.env.PUBLIC_API_URL ?? 'http://localhost:8001'}/api/upload`, {
          method: 'POST',
          headers: { 'Accept': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: formData,
        });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        setMediaUrls(prev => [...prev, data.url]);
        if (i === 0) {
          const mime = file.type;
          if (mime.startsWith('image/')) setMediaType('image');
          else if (mime.startsWith('video/')) setMediaType('video');
          else if (mime.endsWith('pdf')) setMediaType('pdf');
          else setMediaType('document');
        }
      }
    } catch (err: any) {
      alert(err.message ?? 'Gagal mengunggah file.');
    } finally {
      setUploading(false);
    }
  };

  const handleAddUrl = () => {
    if (!inputUrl.trim()) return;
    if (!inputUrl.startsWith('http://') && !inputUrl.startsWith('https://')) {
      alert('Tolong masukkan URL yang valid (harus dimulai dengan http:// atau https://)');
      return;
    }
    setMediaUrls(prev => [...prev, inputUrl.trim()]);
    setInputUrl('');
  };

  const isScheduled = Boolean(scheduledAt);

  async function handleSend() {
    if (!content.trim() || selectedChannels.length === 0) return;
    setSending(true);
    setResult(null);
    try {
      const recipientsMap: Record<string, string[]> = {};
      selectedChannels.forEach(id => {
        const state = recipientState[id];
        if (state && state.selected.size > 0) recipientsMap[String(id)] = Array.from(state.selected);
      });

      const scheduledAtUtc = scheduledAt && !isNaN(new Date(scheduledAt).getTime())
        ? new Date(scheduledAt).toISOString()
        : undefined;

      const broadcast = await api.post<{ id: number }>('/api/broadcasts', {
        title: title || undefined,
        content,
        media_url: mediaUrls.length > 0 ? JSON.stringify(mediaUrls) : undefined,
        media_type: mediaUrls.length > 0 ? mediaType : undefined,
        channel_ids: selectedChannels,
        recipients: Object.keys(recipientsMap).length > 0 ? recipientsMap : undefined,
        scheduled_at: scheduledAtUtc,
        recurring: scheduledAtUtc ? recurring : undefined,
      });

      if (!isScheduled) {
        await api.post(`/api/broadcasts/${broadcast.id}/send`);
        setResult({ ok: true, message: '🚀 Broadcast sukses dikirim ke antrean platform!' });
      } else {
        setResult({ ok: true, message: `📅 Broadcast dijadwalkan pada ${new Date(scheduledAt).toLocaleString('id-ID')}` });
      }

      setContent(''); setTitle(''); setMediaUrls([]); setSelectedChannels([]);
      setScheduledAt(''); setRecurring('none'); setRecipientState({});
      setActiveTab('editor');
    } catch (e: any) {
      setResult({ ok: false, message: e.message ?? 'Gagal memproses broadcast.' });
    } finally {
      setSending(false);
    }
  }

  const handleAiRewrite = async (tone: string) => {
    if (!content.trim()) { alert('Tulis draf pesan di editor utama terlebih dahulu!'); return; }
    setAiTone(tone);
    setAiGenerating(true);
    try {
      const res = await api.post<{ rewritten: string; is_simulated: boolean }>('/api/ai/rewrite', {
        content,
        tone,
      });
      setContent(res.rewritten);
      setIsSimulatedInfo(res.is_simulated);
      showToast('Gaya bahasa berhasil diperbarui oleh AI!', 'success');
    } catch (err: any) {
      alert(err.message ?? 'Gagal memproses gaya bahasa.');
    } finally {
      setAiGenerating(false);
      setAiTone(null);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiGenContext.trim()) { alert('Masukkan konsep / konteks pesan terlebih dahulu!'); return; }
    setAiGenLoading(true);
    try {
      const res = await api.post<{ generated: string; is_simulated: boolean }>('/api/ai/generate', {
        type: aiGenType,
        context: aiGenContext,
      });
      setAiGenResult(res.generated);
      setIsSimulatedInfo(res.is_simulated);
      showToast('Draf pesan berhasil dibuat oleh AI!', 'success');
    } catch (err: any) {
      alert(err.message ?? 'Gagal membuat pesan.');
    } finally {
      setAiGenLoading(false);
    }
  };

  const handleAiOptimize = async () => {
    if (!content.trim()) { alert('Tulis draf pesan di editor utama terlebih dahulu!'); return; }
    setAiOptLoading(true);
    try {
      const res = await api.post<{ suggestions: string[]; optimized: string; is_simulated: boolean }>('/api/ai/optimize', {
        content,
      });
      setAiOptSuggestions(res.suggestions);
      setAiOptResult(res.optimized);
      setIsSimulatedInfo(res.is_simulated);
      setShowOptResult(true);
      showToast('Audit & optimasi AI selesai!', 'success');
    } catch (err: any) {
      alert(err.message ?? 'Gagal mengoptimalkan pesan.');
    } finally {
      setAiOptLoading(false);
    }
  };

  const minDateTime = new Date(Date.now() + 60_000).toISOString().slice(0, 16);

  return (
    <AdminLayout activePage="broadcast" title="Buat Broadcast">
      {/* Recipient Modal */}
      {recipientModal && recipientState[recipientModal.id] && (
        <RecipientModal
          channel={recipientModal}
          state={recipientState[recipientModal.id]}
          onClose={() => setRecipientModal(null)}
          onToggle={id => toggleRecipient(recipientModal.id, id)}
          onClearAll={() => clearAllRecipients(recipientModal.id)}
        />
      )}

      {/* Main Grid Container */}
      <div className="w-full max-w-6xl mx-auto space-y-6">

        {/* Notification Status */}
        {result && (
          <div className={`rounded-2xl p-4 border text-xs flex items-start gap-3 shadow-sm transition-all duration-300 animate-in fade-in ${
            result.ok ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
          }`}>
            {result.ok ? <Check className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            <div>
              <p className="font-bold">{result.ok ? 'Sukses' : 'Gagal'}</p>
              <p className="opacity-90 mt-0.5">{result.message}</p>
            </div>
          </div>
        )}

        {/* Tab Selector (Mobile view only to avoid vertical clutter) */}
        <div className="flex md:hidden p-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full">
          <button type="button" onClick={() => setActiveTab('editor')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              activeTab === 'editor' ? 'tab-active' : 'text-zinc-500 dark:text-zinc-400'
            }`}>
            <MessageSquare className="w-4 h-4" />
            Editor
          </button>
          <button type="button" onClick={() => setActiveTab('ai')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              activeTab === 'ai' ? 'tab-active' : 'text-zinc-500 dark:text-zinc-400'
            }`}>
            <Sparkles className="w-4 h-4" />
            AI Asisten
          </button>
          <button type="button" onClick={() => setActiveTab('preview')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              activeTab === 'preview' ? 'tab-active' : 'text-zinc-500 dark:text-zinc-400'
            }`}>
            <Eye className="w-4 h-4" />
            Penerima
          </button>
        </div>

                {/* Form columns layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: EDITOR, MEDIA, SCHEDULE, AI */}
          <div className="md:col-span-7 lg:col-span-8 space-y-6">
            
            {/* Editor Box */}
            <div className={`bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5 ${activeTab === 'editor' ? 'block' : 'hidden md:block'}`}>
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800/50">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                <h3 className="font-extrabold text-xs text-zinc-900 dark:text-white uppercase tracking-wider">Tulis Pesan Broadcast</h3>
              </div>

              {/* Title input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Judul Campaign (Opsional)</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="Contoh: Flash Sale Mingguan - Hijab Modern"
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-blue-500 transition-all shadow-sm" />
              </div>

              {/* Main Content input */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="block text-[11px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-widest">Konten Utama *</label>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-500 font-mono">{content.length} karakter</span>
                    <div className="relative">
                      <button type="button" onClick={() => setTemplatePickerOpen(prev => !prev)}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all cursor-pointer">
                        <Bookmark className="w-3.5 h-3.5" />
                        Pilih Template
                      </button>

                      {templatePickerOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setTemplatePickerOpen(false)} />
                          <div className="absolute right-0 top-full mt-2 z-20 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                            <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
                              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Koleksi Template</span>
                              <span className="text-[9px] text-zinc-400 font-mono">{templates.length} total</span>
                            </div>
                            <div className="max-h-56 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60">
                              {templates.length === 0 ? (
                                <div className="px-4 py-8 text-center text-[11px] text-zinc-400">
                                  Belum ada template tersimpan. <a href="/templates" className="text-blue-500 underline font-bold">Buat baru</a>
                                </div>
                              ) : templates.map(t => (
                                <button key={t.id} type="button"
                                  onClick={() => { setContent(t.content); setTemplatePickerOpen(false); }}
                                  className="w-full text-left p-3 hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-all group">
                                  <div className="flex items-center justify-between gap-2 mb-0.5">
                                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate group-hover:text-blue-500 transition-colors">{t.title}</span>
                                    <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 shrink-0">{t.platform}</span>
                                  </div>
                                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 line-clamp-2 leading-relaxed">{t.content}</p>
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Formatter Toolbar */}
                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                  <button type="button" onClick={() => applyFormat('bold')} className="w-8 h-8 flex items-center justify-center text-xs font-extrabold text-zinc-600 dark:text-zinc-400 hover:text-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all cursor-pointer" title="Tebal (Bold)">B</button>
                  <button type="button" onClick={() => applyFormat('italic')} className="w-8 h-8 flex items-center justify-center text-xs italic font-semibold text-zinc-600 dark:text-zinc-400 hover:text-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all cursor-pointer" title="Miring (Italic)">I</button>
                  <button type="button" onClick={() => applyFormat('strike')} className="w-8 h-8 flex items-center justify-center text-xs line-through text-zinc-600 dark:text-zinc-400 hover:text-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all cursor-pointer" title="Coret">S</button>
                  <button type="button" onClick={() => applyFormat('code')} className="px-2.5 h-8 flex items-center justify-center text-[10px] font-mono text-zinc-600 dark:text-zinc-400 hover:text-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all cursor-pointer" title="Code Format">&lt;/&gt;</button>
                  <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />
                               {/* Inline AI Quick Helpers */}
                  <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 flex items-center gap-1 select-none">
                    <Sparkles className="w-3 h-3 text-blue-500" />
                    AI Quick:
                  </span>
                  <button type="button" onClick={() => handleQuickAiAction('optimize')} disabled={quickAiLoading || aiGenerating || !content.trim()}
                    className="px-2.5 py-1 text-[9px] font-bold bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/35 hover:border-blue-500 text-blue-600 dark:text-blue-400 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1">
                    {quickAiLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : '✨ Optimalkan'}
                  </button>
                  <button type="button" onClick={() => handleQuickAiAction('marketing')} disabled={quickAiLoading || aiGenerating || !content.trim()}
                    className="px-2.5 py-1 text-[9px] font-bold bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/35 hover:border-amber-500 text-amber-600 dark:text-amber-400 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                    🔥 Marketing
                  </button>
                  <button type="button" onClick={() => handleQuickAiAction('santai')} disabled={quickAiLoading || aiGenerating || !content.trim()}
                    className="px-2.5 py-1 text-[9px] font-bold bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/35 hover:border-emerald-500 text-emerald-600 dark:text-emerald-400 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                    🥤 Santai
                  </button>
                  <button type="button" onClick={() => handleQuickAiAction('formal')} disabled={quickAiLoading || aiGenerating || !content.trim()}
                    className="px-2.5 py-1 text-[9px] font-bold bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/35 hover:border-indigo-500 text-indigo-600 dark:text-indigo-400 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                    💼 Formal
                  </button>
                </div>
 
                {/* Editor Textarea */}
                <div className="relative">
                  <textarea ref={textareaRef} value={content} onChange={e => setContent(e.target.value)}
                    placeholder="Tulis pesan promosi, pemberitahuan, atau informasi berharga Anda di sini..."
                    rows={8}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl px-4 py-4 text-xs text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500 transition-all resize-y min-h-[120px] leading-relaxed shadow-inner" />
                  
                  {(aiGenerating || quickAiLoading) && (
                    <div className="absolute inset-0 bg-zinc-900/60 dark:bg-zinc-950/70 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center gap-2.5 animate-in fade-in z-10">
                      <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                      <span className="text-xs text-white font-bold">
                        {aiGenerating ? `AI sedang menyusun gaya ${aiTone}...` : 'AI sedang mengoptimasi pesan Anda...'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic Variables Inserter */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Sisipkan Variable Dinamis</span>
                  <button type="button" onClick={() => setShowVarHelpModal(true)}
                    className="p-0.5 text-zinc-400 hover:text-blue-500 rounded-full transition-colors cursor-pointer" title="Cara menggunakan variable dinamis">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['nama', 'tagihan', 'tanggal', 'link', 'username'].map(v => (
                    <button key={v} type="button" onClick={() => setContent(prev => prev + ` {{${v}}}`)}
                      className="px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-600 dark:text-zinc-400 rounded-xl hover:text-blue-500 hover:border-blue-500/30 transition-all cursor-pointer">
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Media Attachment Box */}
            <div className={`bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5 ${activeTab === 'editor' ? 'block' : 'hidden md:block'}`}>
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/50">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-blue-500" />
                  <h3 className="font-extrabold text-xs text-zinc-900 dark:text-white uppercase tracking-wider">Lampiran Media / File</h3>
                </div>
                {mediaUrls.length > 0 && (
                  <span className="text-[9px] bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20 font-bold px-2.5 py-0.5 rounded-full">
                    {mediaUrls.length} file terpilih
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <label className="block text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Tipe Lampiran</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['image', 'video', 'pdf', 'document'] as const).map(type => (
                    <button key={type} type="button" onClick={() => setMediaType(type)}
                      className={`flex flex-col items-center justify-center py-3 rounded-2xl border text-[10px] font-bold transition-all cursor-pointer ${
                        mediaType === type
                          ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-550 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                      }`}>
                      {type === 'image' && <ImageIcon className="w-4 h-4 mb-1" />}
                      {type === 'video' && <Video className="w-4 h-4 mb-1" />}
                      {(type === 'pdf' || type === 'document') && <FileText className="w-4 h-4 mb-1" />}
                      <span className="capitalize">{type === 'pdf' ? 'PDF' : type}</span>
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-blue-500 rounded-2xl p-6 cursor-pointer hover:bg-blue-50/20 dark:hover:bg-blue-500/5 transition-all">
                <input type="file" multiple
                  accept={mediaType === 'image' ? 'image/*' : mediaType === 'video' ? 'video/*' : mediaType === 'pdf' ? '.pdf' : '*'}
                  className="hidden" onChange={handleFileUpload} disabled={uploading} />
                {uploading ? (
                  <>
                    <Loader2 className="w-7 h-7 text-blue-500 animate-spin mb-2" />
                    <span className="text-sm text-zinc-500 font-bold">Mengupload file...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-7 h-7 text-zinc-300 dark:text-zinc-600 mb-2" />
                    <span className="text-xs text-zinc-700 dark:text-zinc-300 font-extrabold">Klik atau seret file ke sini</span>
                    <span className="text-[10px] text-zinc-400 mt-1">
                      {mediaType === 'image' ? 'JPG, PNG, WEBP, GIF' : mediaType === 'video' ? 'MP4, MOV, AVI' : mediaType === 'pdf' ? 'PDF' : 'Semua tipe file'} · Maks. 16MB
                    </span>
                  </>
                )}
              </label>

              {/* External URL - alternative */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest shrink-0">atau tempel tautan</span>
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
              </div>
              <div className="flex gap-2">
                <input type="url" value={inputUrl} onChange={e => setInputUrl(e.target.value)}
                  placeholder="https://cdn.example.com/gambar.jpg"
                  className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddUrl(); } }} />
                <button type="button" onClick={handleAddUrl}
                  className="px-4 bg-gradient-brand hover:opacity-95 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0">
                  <Plus className="w-4 h-4" />
                  <span>Tambah</span>
                </button>
              </div>

              {/* Attachments List */}
              {mediaUrls.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <span className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Daftar File Terlampir</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {mediaUrls.map((url, idx) => (
                      <div key={idx} className="group relative border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between shadow-sm min-h-[90px] animate-in slide-in-from-bottom-2 duration-150">
                        {mediaType === 'image' ? (
                          <div className="w-full h-14 bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                            <img src={url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350" onError={e => { (e.target as HTMLElement).style.display = 'none'; }} />
                          </div>
                        ) : (
                          <div className="w-full h-14 bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
                            {mediaType === 'video' ? <Video className="w-5 h-5 text-zinc-400" /> : <FileText className="w-5 h-5 text-blue-500" />}
                          </div>
                        )}
                        <div className="p-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900">
                          <span className="text-[9px] text-zinc-500 font-mono truncate max-w-[80%]">{url.split('/').pop() || `file-${idx + 1}`}</span>
                          <button type="button" onClick={() => setMediaUrls(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 p-0.5 rounded cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Schedule Box */}
            <div className={`bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 ${activeTab === 'editor' ? 'block' : 'hidden md:block'}`}>
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800/50">
                <Calendar className="w-4 h-4 text-blue-500" />
                <h3 className="font-extrabold text-xs text-zinc-900 dark:text-white uppercase tracking-wider">Jadwal Pengiriman</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Waktu Kirim (Kosongkan = Instan)</label>
                  <input type="datetime-local" value={scheduledAt} min={minDateTime} onChange={e => setScheduledAt(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500 shadow-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Pola Pengulangan</label>
                  <select value={recurring} onChange={e => setRecurring(e.target.value as any)} disabled={!scheduledAt}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500 disabled:opacity-50 cursor-pointer shadow-sm">
                    <option value="none">Satu Kali</option>
                    <option value="daily">Setiap Hari</option>
                    <option value="weekly">Setiap Minggu</option>
                    <option value="monthly">Setiap Bulan</option>
                  </select>
                </div>
              </div>

              {scheduledAt && (
                <div className="flex items-center gap-2.5 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-550/20 rounded-2xl px-4 py-3">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>
                    Akan dikirim otomatis pada{' '}
                    <strong>{new Date(scheduledAt).toLocaleString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
                    {recurring !== 'none' && <span> · Pola pengulangan: <strong>{recurring === 'daily' ? 'Harian' : recurring === 'weekly' ? 'Mingguan' : 'Bulanan'}</strong></span>}
                  </span>
                </div>
              )}
            </div>

            {/* AI Assistant Box */}
            <div className={`bg-gradient-to-br from-white to-zinc-50/30 dark:from-[#0c0c0e] dark:to-zinc-950/40 border border-zinc-200 dark:border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5 relative overflow-hidden ${activeTab === 'ai' ? 'block' : 'hidden md:block'}`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/50">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <h3 className="font-extrabold text-xs text-zinc-900 dark:text-white uppercase tracking-wider">Asisten Penulisan AI</h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                    ✦ AI Live
                  </span>
                </div>
              </div>
               {/* AI Inner Tabs */}
              <div className="flex p-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl">
                {(['rewrite', 'generate', 'optimize'] as const).map(tab => (
                  <button key={tab} type="button" onClick={() => setAiTab(tab)}
                    className={`flex-1 py-2 text-center rounded-xl text-[10px] font-bold capitalize transition-all cursor-pointer ${
                      aiTab === tab
                        ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-zinc-550 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}>
                    {tab === 'rewrite' ? 'Gaya Bahasa' : tab === 'generate' ? 'Buat Baru' : 'Audit'}
                  </button>
                ))}
              </div>

              {/* Rewrite Tone */}
              {aiTab === 'rewrite' && (
                <div className="space-y-4">
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Tulis pesan Anda di form editor utama terlebih dahulu, lalu klik tombol gaya di bawah untuk memolesnya secara otomatis menggunakan AI.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {[
                      { id: 'marketing',    label: 'Marketing',    emoji: '🔥' },
                      { id: 'formal',       label: 'Formal',       emoji: '💼' },
                      { id: 'santai',       label: 'Santai',       emoji: '🥤' },
                      { id: 'professional', label: 'Profesional',  emoji: '📈' },
                      { id: 'urgent',       label: 'Mendesak',     emoji: '🚨' },
                      { id: 'friendly',     label: 'Ramah',        emoji: '🤗' },
                    ].map(tone => (
                      <button key={tone.id} type="button" onClick={() => handleAiRewrite(tone.id)}
                        disabled={aiGenerating || !content.trim()}
                        className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 hover:bg-blue-50 dark:hover:bg-blue-500/10 border border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-700 dark:text-zinc-200 font-bold transition-all disabled:bg-zinc-150/40 dark:disabled:bg-zinc-950/20 disabled:text-zinc-400 dark:disabled:text-zinc-650 disabled:border-zinc-200/50 dark:disabled:border-zinc-900/50 disabled:cursor-not-allowed cursor-pointer shadow-sm">
                        <span className="text-xs">{tone.emoji}</span>
                        <span>{tone.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Generate */}
              {aiTab === 'generate' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-widest">Tipe Pesan</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['promo', 'announcement', 'reminder', 'caption'] as const).map(t => (
                        <button key={t} type="button" onClick={() => setAiGenType(t)}
                          className={`py-2 text-[10px] font-bold text-center rounded-xl border transition-all cursor-pointer ${
                            aiGenType === t
                              ? 'bg-gradient-brand text-white border-blue-500 shadow-sm'
                              : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-550'
                          }`}>
                          {t === 'promo' ? 'Promo' : t === 'announcement' ? 'Info' : t === 'reminder' ? 'Ingat' : 'Kapsen'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-widest">Tujuan / Konsep Draft Anda</label>
                    <textarea value={aiGenContext} onChange={e => setAiGenContext(e.target.value)}
                      placeholder="Contoh: promosi diskon 50% menyambut hari raya Idul Adha, masukan kode kupon BERKAH50, terbatas untuk 100 pembeli pertama saja..."
                      rows={3}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-3 py-2.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500 placeholder-zinc-400 resize-none leading-relaxed" />
                  </div>

                  <button type="button" onClick={handleAiGenerate} disabled={aiGenLoading || !aiGenContext.trim()}
                    className="w-full py-3 bg-gradient-brand hover:opacity-95 disabled:opacity-50 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/15">
                    {aiGenLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Sedang menulis draft...</span></> : <><Sparkles className="w-3.5 h-3.5" /><span>Tulis Konsep dengan AI</span></>}
                  </button>

                  {aiGenResult && (
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                        <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Hasil Draft AI</span>
                        <button type="button" onClick={() => { navigator.clipboard.writeText(aiGenResult); showToast('Teks berhasil disalin!', 'success'); }} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">{aiGenResult}</p>
                      <button type="button" onClick={() => { setContent(aiGenResult); setActiveTab('editor'); showToast('Draf AI berhasil diterapkan ke editor!', 'success'); }}
                        className="w-full py-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-450 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1">
                        <span>Terapkan Ke Editor Utama</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Optimize */}
              {aiTab === 'optimize' && (
                <div className="space-y-4">
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-500 leading-relaxed">
                    Kirimkan teks yang sudah Anda tulis di atas untuk dianalisis oleh AI. AI akan mendeteksi kelemahan teks dan memberikan draf versi optimasi.
                  </p>

                  <button type="button" onClick={handleAiOptimize} disabled={aiOptLoading || !content.trim()}
                    className="w-full py-3 bg-gradient-brand hover:opacity-95 disabled:opacity-50 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm">
                    {aiOptLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Sedang Menganalisis...</span></> : <><Lightbulb className="w-3.5 h-3.5" /><span>Audit & Optimasi Sekarang</span></>}
                  </button>

                  {showOptResult && (
                    <div className="space-y-3.5">
                      {aiOptSuggestions.length > 0 && (
                        <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-2">
                          <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest block">Saran Perbaikan:</span>
                          <ul className="space-y-1">
                            {aiOptSuggestions.map((s, idx) => (
                              <li key={idx} className="text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                                <span className="text-amber-500 mt-0.5">•</span>
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {aiOptResult && (
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3 animate-in fade-in">
                          <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Teks Optimasi AI</span>
                            <button type="button" onClick={() => { navigator.clipboard.writeText(aiOptResult); showToast('Teks berhasil disalin!', 'success'); }} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">{aiOptResult}</p>
                          <button type="button" onClick={() => { setContent(aiOptResult); setActiveTab('editor'); showToast('Teks optimasi berhasil diterapkan!', 'success'); }}
                            className="w-full py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1">
                            <span>Ganti Dengan Versi Optimasi</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: CHANNELS & PREVIEW & ACTIONS */}
          <div className={`md:col-span-5 lg:col-span-4 space-y-6 ${activeTab === 'preview' ? 'block' : 'hidden md:block'}`}>
            
            {/* Target Channels */}
            <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800/80 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/50">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-500" />
                  <h3 className="font-extrabold text-xs text-zinc-900 dark:text-white uppercase tracking-wider">Channel Tujuan</h3>
                </div>
                {channels.length > 0 && (
                  <button type="button" onClick={handleSelectAllChannels}
                    className="text-[9px] text-blue-600 dark:text-blue-450 font-bold uppercase tracking-widest bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-100 dark:border-blue-500/20 transition-all cursor-pointer">
                    {selectedChannels.length === channels.length ? 'Reset' : 'Pilih Semua'}
                  </button>
                )}
              </div>

              {channels.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <Globe className="w-7 h-7 text-zinc-300 dark:text-zinc-700 mx-auto" />
                  <p className="text-xs text-zinc-400">Belum ada channel terhubung</p>
                  <a href="/channels" className="inline-block px-4 py-2 bg-gradient-brand hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-500/10">
                    + Hubungkan Channel
                  </a>
                </div>
              ) : (
                <div className="space-y-2">
                  {channels.map(ch => {
                    const isChecked = selectedChannels.includes(ch.id);
                    const state = recipientState[ch.id];
                    const totalSelected = state?.selected.size ?? 0;
                    return (
                      <div key={ch.id} className={`rounded-2xl border transition-all overflow-hidden ${
                        isChecked ? 'border-blue-200 dark:border-blue-500/35 bg-blue-50/10 dark:bg-blue-900/[0.03]' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950'
                      }`}>
                        <label className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none">
                          <input type="checkbox" checked={isChecked} onChange={() => toggleChannel(ch.id)}
                            className="w-4 h-4 accent-blue-600 rounded cursor-pointer" />
                          <PlatformIcon platform={ch.platform} className="w-4 h-4 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="block text-xs font-bold text-zinc-800 dark:text-zinc-250 truncate">{ch.name}</span>
                          </div>
                          {totalSelected > 0 && (
                            <span className="text-[9px] bg-gradient-brand text-white font-extrabold px-2 py-0.5 rounded-full shrink-0">
                              {totalSelected} target
                            </span>
                          )}
                        </label>

                        {isChecked && (
                          <div className="border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30">
                            <button type="button" onClick={() => openRecipientModal(ch)}
                              className="w-full py-2.5 px-4 flex items-center justify-between text-[10px] font-bold text-zinc-550 dark:text-zinc-400 hover:text-blue-500 dark:hover:text-blue-400 cursor-pointer">
                              {totalSelected > 0 ? (
                                <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400"><UserCheck className="w-3.5 h-3.5" />{totalSelected} Penerima Terpilih</span>
                              ) : (
                                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />Pilih Kontak Spesifik</span>
                              )}
                              <span>Ubah →</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* WA Live Preview */}
            <div className="bg-[#e5ddd5] dark:bg-[#0b141a] border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[400px] relative">
              {/* WA Header */}
              <div className="bg-[#075e54] dark:bg-[#1f2c34] px-4 py-3 flex items-center gap-3 text-white shrink-0">
                <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center text-xs shrink-0 font-bold">💬</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate">Pratinjau Pesan WA</div>
                  <div className="text-[9px] opacity-80 mt-0.5">Online</div>
                </div>
              </div>

              {/* WA Chat Wallpaper */}
              <div className="flex-1 overflow-y-auto p-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">
                <div className="min-h-full flex flex-col justify-end">
                  <div className="max-w-[90%] self-end bg-[#dcf8c6] dark:bg-[#005c4b] border border-[#d2f3b7]/30 rounded-xl rounded-tr-none p-3 shadow-xs text-zinc-800 dark:text-zinc-100 flex flex-col gap-1.5 relative">
                    
                    {mediaUrls.length > 0 && (
                      <div className="rounded-lg overflow-hidden border border-black/5 bg-black/10 shrink-0 mb-1 max-h-[120px] flex items-center justify-center">
                        {mediaType === 'image' ? (
                          <img src={mediaUrls[0]} alt="" className="w-full h-full object-cover max-h-[120px]" onError={e => { (e.target as HTMLElement).style.display = 'none'; }} />
                        ) : mediaType === 'video' ? (
                          <div className="flex flex-col items-center justify-center py-4 px-6 text-center text-xs gap-1">
                            <Video className="w-5 h-5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                            <span className="font-semibold truncate max-w-[120px]">{mediaUrls[0].split('/').pop()}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-4 px-6 text-center text-xs gap-1">
                            <FileText className="w-5 h-5 text-blue-500" />
                            <span className="font-semibold truncate max-w-[120px]">{mediaUrls[0].split('/').pop()}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="text-xs whitespace-pre-wrap leading-relaxed break-words pr-10 pb-0.5"
                      dangerouslySetInnerHTML={{ __html: parseWhatsAppFormatting(content || 'Tulis draf pesan untuk memunculkan pratinjau di sini...') }} />

                    <div className="absolute bottom-1 right-2 flex items-center gap-1 text-[8px] text-zinc-400 dark:text-zinc-300 select-none">
                      <span>{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                      <svg className="w-2.5 h-2.5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button type="button" onClick={handleSend}
              disabled={sending || !content.trim() || selectedChannels.length === 0}
              className="w-full btn-primary py-3.5 font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-xs">
              {sending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Memproses antrean...</span></>
              ) : isScheduled ? (
                <><Calendar className="w-4 h-4" /><span>Jadwalkan Broadcast</span></>
              ) : (
                <><Send className="w-4 h-4" /><span>Kirim Broadcast Sekarang</span></>
              )}
            </button>

            {/* Instruction Card */}
            <div className="bg-zinc-100/50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 text-xs text-zinc-550 dark:text-zinc-400 space-y-2">
              <h4 className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-500" />
                Panduan Cepat
              </h4>
              <ul className="space-y-1 list-disc list-inside text-[11px] leading-relaxed">
                <li>Bisa melampirkan media foto/video/dokumen.</li>
                <li>Pilih kontak spesifik untuk target lebih sempit.</li>
                <li>Gunakan AI asisten di tab AI untuk memoles teks.</li>
              </ul>
            </div>

          </div>

        </div>
      </div>

      {/* Dynamic Variables Tutorial Modal */}
      {showVarHelpModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 dark:bg-black/85 backdrop-blur-xs" onClick={() => setShowVarHelpModal(false)} />
          
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150 relative z-10">
            {/* Header */}
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-500" />
                <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white uppercase tracking-wider">Tutorial Variable Dinamis</h3>
              </div>
              <button onClick={() => setShowVarHelpModal(false)} className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 transition-all cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed max-h-[70vh]">
              <p>
                <strong>Variabel Dinamis</strong> memungkinkan Anda mengirim pesan yang disesuaikan secara otomatis untuk setiap penerima. Autoin mendeteksi placeholder (tag double kurung kurawal) dan menggantinya secara dinamis.
              </p>

              {/* Table of variables with Source explanations */}
              <div className="space-y-3">
                <span className="block font-bold text-[10px] uppercase text-zinc-400 tracking-wider">Sumber & Pengaturan Variabel</span>
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800 bg-zinc-50 dark:bg-zinc-950/40">
                  <div className="p-3.5 space-y-1">
                    <div className="flex justify-between items-center">
                      <code className="text-blue-600 dark:text-blue-400 font-bold font-mono">{"{{nama}}"}</code>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md">Otomatis Terisi</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                      Diambil langsung dari <strong>Nama Kontak WhatsApp HP Anda</strong> (atau nama profil WhatsApp publik mereka jika tidak tersimpan di HP).
                    </p>
                  </div>

                  <div className="p-3.5 space-y-1">
                    <div className="flex justify-between items-center">
                      <code className="text-blue-600 dark:text-blue-400 font-bold font-mono">{"{{tagihan}}"}</code>
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-md">API / Integrasi</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                      Nominal tagihan (contoh: <code>Rp 150.000</code>). Diisi secara dinamis jika pesan dipicu oleh <strong>Integrasi API Billing / Webhook Autoin</strong>.
                    </p>
                  </div>

                  <div className="p-3.5 space-y-1">
                    <div className="flex justify-between items-center">
                      <code className="text-blue-600 dark:text-blue-400 font-bold font-mono">{"{{tanggal}}"}</code>
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-md">API / Integrasi</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                      Tanggal jatuh tempo atau tanggal kustom penting. Diisi secara otomatis ketika mengirimkan pesan pemberitahuan melalui sistem API Autoin Anda.
                    </p>
                  </div>

                  <div className="p-3.5 space-y-1">
                    <div className="flex justify-between items-center">
                      <code className="text-blue-600 dark:text-blue-400 font-bold font-mono">{"{{link}}"}</code>
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-md">API / Integrasi</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                      Tautan/URL pembayaran unik per pelanggan (contoh: <code>https://invoice.com/pay/abc</code>). Dikirimkan dari integrasi API backend Anda.
                    </p>
                  </div>

                  <div className="p-3.5 space-y-1">
                    <div className="flex justify-between items-center">
                      <code className="text-blue-600 dark:text-blue-400 font-bold font-mono">{"{{username}}"}</code>
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-md">API / Integrasi</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                      ID akun / username pelanggan di sistem/website Anda untuk konfirmasi pencocokan data akun.
                    </p>
                  </div>
                </div>
              </div>

              {/* How to use & setup */}
              <div className="p-4 bg-blue-500/[0.03] border border-blue-500/15 rounded-2xl space-y-2">
                <span className="font-extrabold text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-wider block">📌 Panduan Pengaturan Data</span>
                <ul className="list-disc list-inside space-y-1.5 text-[11px] text-zinc-650 dark:text-zinc-400">
                  <li><strong>Kirim Manual via Dashboard:</strong> Hanya variabel <code>{"{{nama}}"}</code> yang akan diganti secara otomatis dari kontak WhatsApp Anda. Variabel billing lainnya (tagihan, tanggal, link, username) akan dibiarkan kosong atau menggunakan data dummy simulasi karena WhatsApp tidak menyimpan data keuangan kontak Anda.</li>
                  <li><strong>Kirim Otomatis via API (Sangat Direkomendasikan):</strong> Untuk mengisi <code>{"{{tagihan}}"}</code>, <code>{"{{tanggal}}"}</code>, dll secara dinamis dan otomatis, gunakan <strong>API Autoin</strong>. Hubungkan website billing Anda (seperti WHMCS, payment gateway, dll) ke endpoint API Autoin dan sertakan data-data variabel tersebut sebagai payload pesan.</li>
                </ul>
              </div>

              {/* Step-by-Step Example */}
              <div className="space-y-3">
                <span className="block font-bold text-[10px] uppercase text-zinc-400 tracking-wider">Simulasi Penggantian Variabel</span>
                
                {/* Before */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">1. Draft Pesan (Template)</span>
                  <div className="p-3.5 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                    Halo *{"{{nama}}"}*, tagihan Anda sebesar *{"{{tagihan}}"}* jatuh tempo pada *{"{{tanggal}}"}*. Silakan bayar melalui link berikut: {"{{link}}"}
                  </div>
                </div>

                {/* After */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block">2. Hasil Pesan yang Diterima</span>
                  <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/25 rounded-2xl text-[11px] text-zinc-800 dark:text-zinc-200">
                    Halo <strong>Budi</strong>, tagihan Anda sebesar <strong>Rp 150.000</strong> jatuh tempo pada <strong>25 Juni 2026</strong>. Silakan bayar melalui link berikut: <span className="text-blue-500 underline">https://autoin.link/pay/102</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-end shrink-0">
              <button onClick={() => setShowVarHelpModal(false)}
                className="px-4 py-2 bg-gradient-brand hover:opacity-95 text-white rounded-xl text-xs font-bold transition-all cursor-pointer">
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </AdminLayout>
  );
}
