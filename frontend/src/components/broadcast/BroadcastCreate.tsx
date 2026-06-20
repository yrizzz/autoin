import { useEffect, useState, useMemo } from 'react';
import { api } from '../../lib/api';
import type { Channel } from '../../types';
import AdminLayout from '../layout/AdminLayout';
import {
  Send, Sparkles, Check, AlertCircle, MessageSquare, Globe,
  Loader2, Bookmark, Image as ImageIcon, Video, FileText, Plus,
  Trash2, Paperclip, Upload, X, Calendar, Clock, Users, Search,
  Phone, Hash, UserCheck,
} from 'lucide-react';

const AI_TEMPLATES = {
  formal:       { label: 'Formal',          emoji: '💼', rewrite: (t: string) => `Yth. Pelanggan,\n\nDengan hormat, kami ingin menyampaikan bahwa: ${t}\n\nTerima kasih atas perhatian dan kerja sama Anda.\n\nHormat kami,\nTim Layanan Autoin` },
  santai:       { label: 'Santai',          emoji: '🥤', rewrite: (t: string) => `Halo guys! 👋\n\nAda info seru nih buat kalian: ${t}\n\nJangan lupa kepoin terus ya! Have a great day! ✨` },
  marketing:    { label: 'Marketing / Promo', emoji: '🔥', rewrite: (t: string) => `🔥 PROMO KHUSUS HARI INI! 🔥\n\nKabar gembira! ${t}\n\n⚡ Slot Terbatas! Klik link di bio sekarang juga sebelum kehabisan! ⚡` },
  professional: { label: 'Professional',    emoji: '📈', rewrite: (t: string) => `Rekan Bisnis,\n\nKami menginformasikan perkembangan terbaru mengenai: ${t}\n\nSilakan tinjau detail lengkap pada tautan yang tersedia.\n\nSalam,\nAutoin Operations` },
};

interface Recipient { id: string; name: string; phone?: string; type: 'contact' | 'group'; }

interface ChannelRecipientState {
  loading: boolean;
  items: Recipient[];       // all contacts + groups merged
  selected: Set<string>;
}

// ── helpers ──────────────────────────────────────────────────────────────────

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

function PlatformIcon({ platform, className = 'w-5 h-5' }: { platform: string; className?: string }) {
  if (platform === 'whatsapp') return (
    <svg className={`${className} text-emerald-500`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.908.533 3.69 1.465 5.215L2 22l4.928-1.412A9.97 9.97 0 0012.004 22c5.524 0 10.004-4.48 10.004-10.004C22.008 6.48 17.528 2 12.004 2zm0 18.008c-1.67 0-3.238-.456-4.6-1.25L4.4 19.6l.858-2.928a8.004 8.004 0 116.746 3.336zM15.908 13.4c-.22-.11-1.3-.642-1.503-.715-.2-.074-.347-.11-.495.11-.147.22-.57.715-.7.863-.128.147-.257.165-.477.055a6.002 6.002 0 01-1.77-1.093c-.633-.564-1.062-1.26-1.186-1.48-.124-.22-.013-.34.097-.45.1-.1.22-.257.33-.385.11-.128.147-.22.22-.367.073-.147.037-.275-.018-.385-.055-.11-.495-1.193-.68-1.637-.18-.433-.36-.374-.495-.38l-.42-.008c-.147 0-.386.055-.588.275-.2.22-.77.752-.77 1.834 0 1.082.788 2.128.9 2.275.11.147 1.55 2.365 3.755 3.318.524.226.934.362 1.254.464.526.167 1.004.143 1.382.087.42-.062 1.3-.532 1.485-1.046.183-.513.183-.953.128-1.046-.055-.093-.202-.147-.422-.257z" />
    </svg>
  );
  if (platform === 'telegram') return (
    <svg className={`${className} text-sky-500`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.16 1.56-.86 5.72-1.22 7.64-.15.81-.45 1.08-.74 1.1-.63.06-1.11-.41-1.72-.8-1-.62-1.55-1-2.52-1.64-1.12-.74-.39-1.14.24-1.8.17-.17 3.08-2.83 3.14-3.09.01-.03.01-.16-.07-.22-.08-.07-.2-.05-.28-.03-.12.02-2.03 1.28-5.73 3.77-.54.37-1.03.55-1.47.54-.48-.01-1.4-.27-2.08-.5-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.75 4-1.74 6.67-2.88 8.01-3.43 3.81-1.56 4.6-1.83 5.12-1.84.11 0 .37.03.54.17.14.12.18.28.2.44-.02.07-.02.14-.03.22z" />
    </svg>
  );
  if (platform === 'discord') return (
    <svg className={`${className} text-indigo-500`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.27 4.73a16.1 16.1 0 00-3.97-1.23.08.08 0 00-.08.04 11.23 11.23 0 00-.5 1.02.08.08 0 00.07.12 14.88 14.88 0 014.58 0 .08.08 0 00.07-.12 11.24 11.24 0 00-.5-1.02.08.08 0 00-.08-.04 16.09 16.09 0 00-3.97 1.23.07.07 0 00-.03.03 15.22 15.22 0 00-.32 1.34.07.07 0 00.07.08 14.3 14.3 0 004.9-.44.07.07 0 00.04-.06 18.06 18.06 0 00-1.89-6.3.07.07 0 00-.06-.04 16.22 16.22 0 00-4.8 1.48.08.08 0 00-.03.05c-.32.55-.66 1.13-.93 1.73a.08.08 0 01-.14 0c-.27-.6-.6-1.18-.93-1.73a.08.08 0 00-.03-.05 16.22 16.22 0 00-4.8-1.48.07.07 0 00-.06.04 18.06 18.06 0 00-1.89 6.3.07.07 0 00.04.06 14.3 14.3 0 004.9.44.07.07 0 00.07-.08 15.22 15.22 0 00-.32-1.34.07.07 0 00-.03-.03zM8.52 14.85c-.9 0-1.63-.82-1.63-1.83 0-1.02.72-1.83 1.63-1.83.91 0 1.64.82 1.64 1.83 0 1.01-.72 1.83-1.64 1.83zm6.96 0c-.9 0-1.63-.82-1.63-1.83 0-1.02.72-1.83 1.63-1.83.91 0 1.64.82 1.64 1.83 0 1.01-.72 1.83-1.64 1.83z" />
    </svg>
  );
  return <Globe className={`${className} text-zinc-500`} />;
}

// ── Recipient Modal ───────────────────────────────────────────────────────────

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

  const platformLabel = channel.platform === 'whatsapp' ? 'WhatsApp' : 'Telegram';
  const platformColor = channel.platform === 'whatsapp'
    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
    : 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/20';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-zinc-950/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl dark:shadow-black/60 flex flex-col max-h-[90vh] overflow-hidden">

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${platformColor} shrink-0`}>
              <PlatformIcon platform={channel.platform} className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate">Pilih Penerima</h3>
                <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${platformColor} shrink-0`}>{platformLabel}</span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{channel.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {state.selected.size > 0 && (
              <span className="text-[10px] bg-blue-600 text-white font-bold px-2.5 py-1 rounded-lg">
                {state.selected.size} dipilih
              </span>
            )}
            <button onClick={onClose} className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search + Tabs */}
        <div className="px-6 pt-4 pb-3 space-y-3 shrink-0 bg-white dark:bg-zinc-900">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama, nomor, atau username..."
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            {([
              { id: 'contacts', label: 'Kontak', count: contacts.length, icon: Phone },
              { id: 'groups',   label: 'Grup',   count: groups.length,   icon: Hash },
              { id: 'selected', label: 'Dipilih', count: state.selected.size, icon: UserCheck },
            ] as const).map(t => (
              <button key={t.id} type="button" onClick={() => { setTab(t.id); setSearch(''); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  tab === t.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}>
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                  tab === t.id ? 'bg-white/20 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                }`}>{t.count}</span>
              </button>
            ))}

            <div className="ml-auto flex items-center gap-1">
              {tab !== 'selected' && allInTab.length > 0 && (
                <button type="button" onClick={toggleTabAll}
                  className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer px-2 py-1">
                  {allTabSelected ? 'Batal Semua' : `Pilih Semua (${allInTab.length})`}
                </button>
              )}
              {state.selected.size > 0 && (
                <button type="button" onClick={onClearAll}
                  className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer px-2 py-1">
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 pb-3 bg-white dark:bg-zinc-900">
          {state.loading ? (
            <div className="space-y-2 pt-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
                  <div className="w-5 h-5 rounded bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                  <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    <div className="h-2.5 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                {tab === 'selected'
                  ? <UserCheck className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                  : <Users className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                }
              </div>
              <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                {search
                  ? `Tidak ada hasil untuk "${search}"`
                  : tab === 'selected'
                    ? 'Belum ada penerima dipilih'
                    : tab === 'contacts'
                      ? 'Tidak ada kontak'
                      : 'Tidak ada grup'
                }
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                {tab === 'selected' && 'Pilih kontak atau grup dari tab di atas'}
              </p>
            </div>
          ) : (
            <div className="space-y-1 pt-1">
              {filtered.map(r => {
                const isSelected = state.selected.has(r.id);
                const initial = (r.name[0] || '?').toUpperCase();
                const bg = avatarColor(r.id);
                const isGroup = r.type === 'group';
                return (
                  <label key={r.id}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all group ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-600/10 border border-blue-200 dark:border-blue-500/30'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60 border border-transparent'
                    }`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggle(r.id)}
                      className="w-4 h-4 accent-blue-600 rounded shrink-0 cursor-pointer"
                    />

                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-sm ${isGroup ? 'rounded-xl bg-gradient-to-br from-violet-500 to-purple-600' : bg}`}>
                      {isGroup ? <Hash className="w-4 h-4" /> : initial}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">{r.name}</span>
                        {isGroup && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20 shrink-0">
                            Grup
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono truncate mt-0.5">
                        {r.phone || r.id}
                      </div>
                    </div>

                    {/* Checked indicator */}
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 shrink-0 flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {state.selected.size === 0
              ? <span className="italic">Tidak memilih = kirim ke default target channel</span>
              : <span><strong className="text-zinc-800 dark:text-zinc-200">{state.selected.size}</strong> penerima dipilih dari {state.items.length} total</span>
            }
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-all cursor-pointer">
              Batal
            </button>
            <button type="button" onClick={onClose}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all cursor-pointer shadow-sm shadow-blue-500/20">
              {state.selected.size > 0 ? `Konfirmasi ${state.selected.size} Penerima` : 'Tutup'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function BroadcastCreate() {
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

  const [aiTone, setAiTone]               = useState<keyof typeof AI_TEMPLATES | null>(null);
  const [aiGenerating, setAiGenerating]   = useState(false);

  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [templates, setTemplates]         = useState<Array<{ id: string; title: string; content: string; platform: string }>>([]);

  useEffect(() => {
    api.get<Channel[]>('/api/channels').then(chs =>
      setChannels(chs.filter(c => c.status === 'active'))
    );
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('autoin_templates');
    if (saved) {
      try { setTemplates(JSON.parse(saved)); } catch {}
    }
  }, [templatePickerOpen]);

  function toggleChannel(id: number) {
    setSelectedChannels(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  }

  function handleSelectAllChannels() {
    setSelectedChannels(selectedChannels.length === channels.length ? [] : channels.map(c => c.id));
  }

  async function openRecipientModal(ch: Channel) {
    const id = ch.id;
    // If not yet loaded, load now
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
            .filter((c: any) => c.id?.endsWith('@s.whatsapp.net') && !c.id.startsWith('status@'))
            .map((c: any) => ({ id: c.id, name: c.name || c.id.split('@')[0], phone: `+${c.id.split('@')[0]}`, type: 'contact' as const }));
          const groups: Recipient[] = (gRes.groups || [])
            .map((g: any) => ({ id: g.id, name: g.name || g.subject || g.id, type: 'group' as const }));
          items = [...contacts, ...groups];
        } else if (ch.platform === 'telegram') {
          const [cRes, gRes] = await Promise.all([
            api.get<{ contacts: any[] }>(`/api/telegram/${id}/contacts`).catch(() => ({ contacts: [] })),
            api.get<{ groups: any[] }>(`/api/telegram/${id}/groups`).catch(() => ({ groups: [] })),
          ]);
          const contacts: Recipient[] = (cRes.contacts || []).map((c: any) => ({
            id: String(c.id),
            name: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.username || String(c.id),
            phone: c.phone ? `+${c.phone}` : undefined,
            type: 'contact' as const,
          }));
          const groups: Recipient[] = (gRes.groups || []).map((g: any) => ({
            id: String(g.id),
            name: g.title || g.name || String(g.id),
            type: 'group' as const,
          }));
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
        const res = await fetch(`${import.meta.env.PUBLIC_API_URL ?? 'http://localhost:8000'}/api/upload`, {
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

      const broadcast = await api.post<{ id: number }>('/api/broadcasts', {
        title: title || undefined,
        content,
        media_url: mediaUrls.length > 0 ? JSON.stringify(mediaUrls) : undefined,
        media_type: mediaUrls.length > 0 ? mediaType : undefined,
        channel_ids: selectedChannels,
        recipients: Object.keys(recipientsMap).length > 0 ? recipientsMap : undefined,
        scheduled_at: scheduledAt || undefined,
        recurring: scheduledAt ? recurring : undefined,
      });

      if (!isScheduled) {
        await api.post(`/api/broadcasts/${broadcast.id}/send`);
        setResult({ ok: true, message: '🚀 Broadcast sukses dikirim ke antrean platform!' });
      } else {
        setResult({ ok: true, message: `📅 Broadcast dijadwalkan pada ${new Date(scheduledAt).toLocaleString('id-ID')}` });
      }

      setContent(''); setTitle(''); setMediaUrls([]); setSelectedChannels([]);
      setScheduledAt(''); setRecurring('none'); setRecipientState({});
    } catch (e: any) {
      setResult({ ok: false, message: e.message ?? 'Gagal memproses broadcast.' });
    } finally {
      setSending(false);
    }
  }

  const handleAiRewrite = (tone: keyof typeof AI_TEMPLATES) => {
    if (!content.trim()) { alert('Tulis pesan terlebih dahulu!'); return; }
    setAiTone(tone); setAiGenerating(true);
    setTimeout(() => { setContent(AI_TEMPLATES[tone].rewrite(content)); setAiGenerating(false); setAiTone(null); }, 900);
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">

        {/* ── Left ── */}
        <div className="lg:col-span-2 space-y-6">
          {result && (
            <div className={`rounded-xl p-4 border text-sm flex items-start gap-3 ${
              result.ok ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
            }`}>
              {result.ok ? <Check className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
              <div>
                <p className="font-semibold">{result.ok ? 'Sukses' : 'Gagal'}</p>
                <p className="text-xs mt-1 opacity-90">{result.message}</p>
              </div>
            </div>
          )}

          {/* Message */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h2 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 uppercase tracking-wider">Detail Pesan</h2>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Judul Broadcast (Opsional)</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Contoh: Promo Flash Sale Weekend"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500 transition-all" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Konten Pesan Utama *</label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold">{content.length} karakter</span>
                  <div className="relative">
                    <button type="button" onClick={() => setTemplatePickerOpen(v => !v)}
                      className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all cursor-pointer">
                      <Bookmark className="w-3 h-3" />
                      Pakai Template
                    </button>
                    {templatePickerOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setTemplatePickerOpen(false)} />
                        <div className="absolute right-0 top-full mt-1.5 z-20 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl dark:shadow-black/40 overflow-hidden">
                          <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Pilih Template</span>
                            <span className="text-[9px] text-zinc-400">{templates.length} template</span>
                          </div>
                          <div className="max-h-60 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
                            {templates.length === 0 ? (
                              <div className="px-4 py-6 text-center">
                                <p className="text-xs text-zinc-400 dark:text-zinc-500">Belum ada template tersimpan.</p>
                                <a href="/templates" className="text-[10px] text-blue-500 underline mt-1 block">Buat template →</a>
                              </div>
                            ) : templates.map(t => (
                              <button key={t.id} type="button"
                                onClick={() => { setContent(t.content); setTemplatePickerOpen(false); }}
                                className="w-full text-left px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-all group">
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{t.title}</span>
                                  <span className="text-[8px] font-bold uppercase shrink-0 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">{t.platform === 'all' ? 'Semua' : t.platform}</span>
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
              <div className="relative">
                <textarea value={content} onChange={e => setContent(e.target.value)}
                  placeholder="Tulis detail promosi, pengumuman, atau notifikasi kamu di sini..."
                  rows={8}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3.5 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500 transition-all resize-none leading-relaxed" />
                {aiGenerating && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-col gap-2">
                    <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                    <span className="text-xs text-white/80 font-semibold">AI memproses tone {aiTone}...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Media */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 uppercase tracking-wider">Lampiran Media / File</h2>
              </div>
              {mediaUrls.length > 0 && (
                <span className="text-[10px] bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-semibold px-2 py-0.5 rounded">
                  {mediaUrls.length} File
                </span>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Tipe Media</label>
              <div className="grid grid-cols-4 gap-2">
                {(['image', 'video', 'pdf', 'document'] as const).map(type => (
                  <button key={type} type="button" onClick={() => setMediaType(type)}
                    className={`flex flex-col items-center justify-center py-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                      mediaType === type
                        ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                    }`}>
                    {type === 'image' && <ImageIcon className="w-4 h-4 mb-1" />}
                    {type === 'video' && <Video className="w-4 h-4 mb-1" />}
                    {(type === 'pdf' || type === 'document') && <FileText className="w-4 h-4 mb-1" />}
                    <span className="capitalize">{type === 'pdf' ? 'PDF' : type}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-blue-500 rounded-xl p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-950/40 transition-all">
                <input type="file" multiple
                  accept={mediaType === 'image' ? 'image/*' : mediaType === 'video' ? 'video/*' : mediaType === 'pdf' ? '.pdf' : '*'}
                  className="hidden" onChange={handleFileUpload} disabled={uploading} />
                {uploading
                  ? <><Loader2 className="w-5 h-5 text-blue-600 animate-spin mb-1.5" /><span className="text-xs text-zinc-500 font-medium">Mengunggah...</span></>
                  : <><Upload className="w-5 h-5 text-zinc-400 mb-1.5" /><span className="text-xs text-zinc-700 dark:text-zinc-300 font-semibold">Upload dari Komputer</span><span className="text-[9px] text-zinc-400 mt-0.5">Mendukung multiple files</span></>
                }
              </label>
              <div className="flex flex-col justify-between border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-950/20">
                <div>
                  <span className="text-xs text-zinc-700 dark:text-zinc-300 font-semibold block mb-1">Tambah Link URL</span>
                  <span className="text-[9px] text-zinc-400 block mb-3">Punya file hosting eksternal?</span>
                </div>
                <div className="flex gap-2">
                  <input type="url" value={inputUrl} onChange={e => setInputUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 text-zinc-800 dark:text-zinc-200"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddUrl(); } }} />
                  <button type="button" onClick={handleAddUrl}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
            {mediaUrls.length > 0 && (
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Daftar Lampiran</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {mediaUrls.map((url, idx) => (
                    <div key={idx} className="group relative border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between shadow-sm min-h-[100px]">
                      {mediaType === 'image'
                        ? <div className="w-full h-16 bg-zinc-100 dark:bg-zinc-900 overflow-hidden"><img src={url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={e => { (e.target as HTMLElement).style.display = 'none'; }} /></div>
                        : <div className="w-full h-16 bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">{mediaType === 'video' ? <Video className="w-6 h-6 text-zinc-400" /> : <FileText className="w-6 h-6 text-blue-500" />}</div>
                      }
                      <div className="p-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900">
                        <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[80%]">{url.split('/').pop() || `file-${idx + 1}`}</span>
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

          {/* Schedule */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h2 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 uppercase tracking-wider">Jadwal Pengiriman</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Waktu Kirim (Kosongkan = Kirim Sekarang)</label>
                <input type="datetime-local" value={scheduledAt} min={minDateTime} onChange={e => setScheduledAt(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Pengulangan</label>
                <select value={recurring} onChange={e => setRecurring(e.target.value as any)} disabled={!scheduledAt}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-all disabled:opacity-50 cursor-pointer">
                  <option value="none">Satu kali</option>
                  <option value="daily">Setiap hari</option>
                  <option value="weekly">Setiap minggu</option>
                  <option value="monthly">Setiap bulan</option>
                </select>
              </div>
            </div>
            {scheduledAt && (
              <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl px-4 py-2.5">
                <Clock className="w-4 h-4 shrink-0" />
                <span>
                  Akan dikirim otomatis pada{' '}
                  <strong>{new Date(scheduledAt).toLocaleString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
                  {recurring !== 'none' && <span> · <strong>{recurring === 'daily' ? 'Harian' : recurring === 'weekly' ? 'Mingguan' : 'Bulanan'}</strong></span>}
                </span>
              </div>
            )}
          </div>

          {/* AI */}
          <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-100">AI Assistant Rewrite v1</h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed">
              Tulis draf kasar pesanmu di atas, lalu pilih tone gaya bahasa di bawah untuk format otomatis.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(Object.keys(AI_TEMPLATES) as Array<keyof typeof AI_TEMPLATES>).map(key => (
                <button key={key} type="button" onClick={() => handleAiRewrite(key)}
                  disabled={aiGenerating || !content.trim()}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white dark:bg-zinc-950 hover:bg-blue-50 dark:hover:bg-blue-500/10 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 font-medium transition-all disabled:opacity-40 cursor-pointer">
                  <span>{AI_TEMPLATES[key].emoji}</span><span>{AI_TEMPLATES[key].label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Channel selection ── */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 uppercase tracking-wider">Platform Tujuan</h2>
              </div>
              {channels.length > 0 && (
                <button type="button" onClick={handleSelectAllChannels}
                  className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded border border-blue-100 dark:border-blue-500/20 transition-all cursor-pointer">
                  {selectedChannels.length === channels.length ? 'Reset' : 'Pilih Semua'}
                </button>
              )}
            </div>

            {channels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Globe className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-3" />
                <p className="text-zinc-500 dark:text-zinc-400 text-xs mb-4">Belum ada channel terhubung</p>
                <a href="/channels" className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 px-4 py-2 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all">
                  + Hubungkan Dulu
                </a>
              </div>
            ) : (
              <div className="space-y-2">
                {channels.map(ch => {
                  const isChecked = selectedChannels.includes(ch.id);
                  const state = recipientState[ch.id];
                  const totalSelected = state?.selected.size ?? 0;
                  const supportsRecipients = ch.platform === 'whatsapp' || ch.platform === 'telegram';

                  return (
                    <div key={ch.id} className={`rounded-2xl border transition-all overflow-hidden ${
                      isChecked ? 'border-blue-300 dark:border-blue-500/40' : 'border-zinc-200 dark:border-zinc-800'
                    }`}>
                      {/* Channel row */}
                      <label className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all ${
                        isChecked ? 'bg-blue-50 dark:bg-blue-600/10' : 'bg-zinc-50/50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-900/60'
                      }`}>
                        <input type="checkbox" checked={isChecked} onChange={() => toggleChannel(ch.id)}
                          className="w-4 h-4 accent-blue-600 rounded shrink-0 cursor-pointer" />
                        <span className="shrink-0"><PlatformIcon platform={ch.platform} className="w-5 h-5" /></span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold truncate text-zinc-800 dark:text-zinc-200">{ch.name}</div>
                          <div className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mt-0.5">{ch.platform}</div>
                        </div>
                        {totalSelected > 0 && (
                          <span className="text-[9px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full shrink-0">
                            {totalSelected}
                          </span>
                        )}
                      </label>

                      {/* Recipient picker button — WA + TG only */}
                      {isChecked && supportsRecipients && (
                        <div className="border-t border-zinc-100 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/30">
                          {totalSelected > 0 ? (
                            <button type="button" onClick={() => openRecipientModal(ch)}
                              className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-[11px] font-semibold hover:bg-blue-50 dark:hover:bg-blue-500/5 transition-all cursor-pointer group">
                              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>{totalSelected} penerima dipilih</span>
                              </div>
                              <span className="text-zinc-400 dark:text-zinc-500 group-hover:text-blue-500 text-[10px]">Ubah →</span>
                            </button>
                          ) : (
                            <button type="button" onClick={() => openRecipientModal(ch)}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/5 transition-all cursor-pointer">
                              <Users className="w-3.5 h-3.5" />
                              <span>Pilih Penerima Spesifik</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Send button */}
          <button onClick={handleSend}
            disabled={sending || !content.trim() || selectedChannels.length === 0}
            className="w-full btn-primary font-bold py-3.5 rounded-xl transition-all duration-200 shadow-sm flex items-center justify-center gap-2.5 cursor-pointer">
            {sending
              ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Memproses...</span></>
              : isScheduled
                ? <><Calendar className="w-4 h-4" /><span>Jadwalkan Broadcast</span></>
                : <><Send className="w-4 h-4" /><span>Kirim ke {selectedChannels.length} Platform</span></>
            }
          </button>

          {/* Info */}
          <div className="bg-zinc-100/50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            <h4 className="font-semibold text-zinc-800 dark:text-zinc-300 mb-2 flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Petunjuk Pengiriman
            </h4>
            <ul className="space-y-1.5 list-disc list-inside">
              <li>Klik <strong>Pilih Penerima Spesifik</strong> untuk milih kontak / grup tertentu</li>
              <li>Kosongkan penerima = kirim ke default target channel</li>
              <li>Isi jadwal untuk kirim terjadwal / berulang</li>
            </ul>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
