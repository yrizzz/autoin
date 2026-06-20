import { useEffect, useState, useMemo } from 'react';
import { api } from '../../lib/api';
import type { Channel } from '../../types';
import AdminLayout from '../layout/AdminLayout';
import { Search, RefreshCw, MessageSquare, Phone, Users, User } from 'lucide-react';

interface WaContact {
  id: string;
  name: string;
}

interface TgContact {
  id: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
}

type NormalContact = { id: string; name: string; phone?: string };

function avatarColor(str: string) {
  const palette = ['bg-blue-500','bg-violet-500','bg-pink-500','bg-orange-500',
    'bg-emerald-500','bg-sky-500','bg-purple-500','bg-cyan-500','bg-rose-500','bg-teal-500'];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

function formatWaPhone(jid: string) {
  const n = jid.split('@')[0];
  return `+${n}`;
}

function PlatformTab({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all border ${
        active
          ? `${color} text-white border-transparent`
          : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
      }`}
    >
      {label}
    </button>
  );
}

export default function ContactManager() {
  const [platform, setPlatform]           = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [contacts, setContacts]           = useState<NormalContact[]>([]);
  const [waChannels, setWaChannels]       = useState<Channel[]>([]);
  const [tgChannels, setTgChannels]       = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [loading, setLoading]             = useState(true);
  const [syncing, setSyncing]             = useState(false);
  const [search, setSearch]               = useState('');

  const fetchWaContacts = async (ch: Channel) => {
    try {
      const res = await api.get<{ contacts: WaContact[] }>(`/api/whatsapp/${ch.id}/contacts`);
      const real = (res.contacts || []).filter(c =>
        c.id.endsWith('@s.whatsapp.net') && !c.id.startsWith('status@') && !c.id.startsWith('0@')
      );
      setContacts(real.map(c => ({ id: c.id, name: c.name || '', phone: formatWaPhone(c.id) })));
    } catch { setContacts([]); }
  };

  const fetchTgContacts = async (ch: Channel) => {
    try {
      const res = await api.get<{ contacts: TgContact[] }>(`/api/telegram/${ch.id}/contacts`);
      const list = (res.contacts || []).map((c: TgContact) => ({
        id: String(c.id),
        name: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.username || String(c.id),
        phone: c.phone ? `+${c.phone}` : undefined,
      }));
      setContacts(list);
    } catch { setContacts([]); }
  };

  const fetchContacts = async (ch: Channel, pt: 'whatsapp' | 'telegram') => {
    if (pt === 'whatsapp') await fetchWaContacts(ch);
    else await fetchTgContacts(ch);
  };

  const load = async () => {
    setLoading(true);
    setContacts([]);
    try {
      const chs = await api.get<Channel[]>('/api/channels');
      const wa  = chs.filter(c => c.platform === 'whatsapp' && c.status === 'active');
      const tg  = chs.filter(c => c.platform === 'telegram' && c.status === 'active');
      setWaChannels(wa);
      setTgChannels(tg);

      const activePlatform = platform;
      const candidates = activePlatform === 'whatsapp' ? wa : tg;
      if (candidates.length > 0) {
        setActiveChannel(candidates[0]);
        await fetchContacts(candidates[0], activePlatform);
      } else {
        setActiveChannel(null);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [platform]);

  const handleChannelSwitch = async (ch: Channel) => {
    setActiveChannel(ch);
    setLoading(true);
    await fetchContacts(ch, platform);
    setLoading(false);
  };

  const handleSync = async () => {
    if (!activeChannel) return;
    setSyncing(true);
    await fetchContacts(activeChannel, platform);
    setSyncing(false);
  };

  const channels = platform === 'whatsapp' ? waChannels : tgChannels;

  const grouped = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = contacts.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      c.id.includes(q) ||
      (c.phone || '').includes(q)
    );
    const map: Record<string, NormalContact[]> = {};
    filtered.forEach(c => {
      const letter = c.name?.[0]?.toUpperCase() || '#';
      const key = /[A-Z]/.test(letter) ? letter : '#';
      (map[key] = map[key] || []).push(c);
    });
    return Object.entries(map).sort(([a], [b]) => a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b));
  }, [contacts, search]);

  const totalFiltered = grouped.reduce((s, [, arr]) => s + arr.length, 0);

  const emptyPlatformLabel = platform === 'whatsapp' ? 'WhatsApp' : 'Telegram';

  return (
    <AdminLayout activePage="contacts" title="Daftar Kontak">
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Daftar Kontak
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {loading ? 'Memuat...' : `${totalFiltered.toLocaleString()} kontak`}
            {activeChannel && (
              <span className="ml-2 font-semibold text-blue-600 dark:text-blue-400">
                • {activeChannel.name}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleSync} disabled={syncing || loading || !activeChannel}
            className="flex items-center gap-2 px-4 py-2 btn-primary font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer">
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Sinkronisasi
          </button>
        </div>
      </div>

      {/* ── Platform tabs ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-4">
        <PlatformTab
          active={platform === 'whatsapp'}
          onClick={() => { setPlatform('whatsapp'); setSearch(''); }}
          label="WhatsApp"
          color="bg-emerald-500"
        />
        <PlatformTab
          active={platform === 'telegram'}
          onClick={() => { setPlatform('telegram'); setSearch(''); }}
          label="Telegram"
          color="bg-sky-500"
        />

        {/* Channel switcher (multiple channels on same platform) */}
        {channels.length > 1 && channels.map(ch => (
          <button key={ch.id} onClick={() => handleChannelSwitch(ch)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              activeChannel?.id === ch.id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}>
            {ch.name}
          </button>
        ))}
      </div>

      {/* ── Search bar ────────────────────────────────────────────────────── */}
      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
        <input
          type="text"
          placeholder={`Cari nama atau ${platform === 'whatsapp' ? 'nomor telepon' : 'username'}...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-all shadow-sm"
        />
      </div>

      {/* ── Content card ──────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {[...Array(6)].map((_, idx) => (
              <div key={idx} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-3 w-36 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-2.5 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
                </div>
              </div>
            ))}
          </div>

        ) : channels.length === 0 ? (
          <div className="flex flex-col items-center py-24 gap-3 text-center px-8">
            <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <Users className="w-7 h-7 text-zinc-400 dark:text-zinc-500" />
            </div>
            <p className="font-bold text-sm text-zinc-700 dark:text-zinc-300">
              Tidak ada channel {emptyPlatformLabel} aktif
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs">
              Sambungkan {emptyPlatformLabel} di <strong>Integrasi Platform</strong> terlebih dahulu.
            </p>
          </div>

        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center py-24 gap-3 text-center px-8">
            <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <User className="w-7 h-7 text-zinc-400 dark:text-zinc-500" />
            </div>
            <p className="font-bold text-sm text-zinc-700 dark:text-zinc-300">Belum ada kontak tersinkronisasi</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs">
              Kontak muncul otomatis setelah {emptyPlatformLabel} terhubung. Klik Sinkronisasi untuk memperbarui.
            </p>
          </div>

        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center py-24 gap-3">
            <Search className="w-10 h-10 text-zinc-300 dark:text-zinc-700" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Tidak ada hasil untuk "{search}"</p>
          </div>

        ) : (
          grouped.map(([letter, items]) => (
            <div key={letter}>
              <div className="sticky top-0 z-10 px-5 py-2 bg-zinc-50 dark:bg-zinc-950/60 backdrop-blur-sm border-b border-zinc-100 dark:border-zinc-800/50">
                <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest">{letter}</span>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {items.map(c => {
                  const displayName = c.name || c.phone || c.id;
                  const initial     = displayName[0]?.toUpperCase() || '?';
                  const bg          = avatarColor(c.id);
                  return (
                    <div key={c.id}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group">
                      <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{displayName}</div>
                        {c.phone && c.name && (
                          <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            <Phone className="w-3 h-3 shrink-0" />
                            <span className="font-mono">{c.phone}</span>
                          </div>
                        )}
                      </div>
                      {platform === 'whatsapp' && (
                        <a href={`/chats?to=${encodeURIComponent(c.id.split('@')[0])}`}
                          className="opacity-0 group-hover:opacity-100 p-2 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-all border border-transparent hover:border-blue-100 dark:hover:border-blue-500/20"
                          title="Kirim Pesan">
                          <MessageSquare className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
