import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../lib/api';
import type { Channel } from '../../types';
import AdminLayout from '../layout/AdminLayout';
import { Search, RefreshCw, MessageSquare, Loader2, Phone, Users, User } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
}

function avatarColor(str: string) {
  const palette = ['bg-blue-500','bg-violet-500','bg-pink-500','bg-orange-500',
    'bg-emerald-500','bg-sky-500','bg-purple-500','bg-cyan-500','bg-rose-500','bg-teal-500'];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

function formatPhone(jid: string) {
  const n = jid.split('@')[0];
  return n.startsWith('62') ? `+${n}` : `+${n}`;
}

export default function ContactManager() {
  const [contacts, setContacts]         = useState<Contact[]>([]);
  const [channels, setChannels]         = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [loading, setLoading]           = useState(true);
  const [syncing, setSyncing]           = useState(false);
  const [search, setSearch]             = useState('');

  const fetchContacts = async (ch: Channel) => {
    try {
      const res = await api.get<{ contacts: Contact[] }>(`/api/whatsapp/${ch.id}/contacts`);
      const real = (res.contacts || []).filter(c =>
        c.id.endsWith('@s.whatsapp.net') && !c.id.startsWith('status@') && !c.id.startsWith('0@')
      );
      setContacts(real);
    } catch { setContacts([]); }
  };

  const load = async () => {
    setLoading(true);
    try {
      const chs = await api.get<Channel[]>('/api/channels');
      const wa  = chs.filter(c => c.platform === 'whatsapp' && c.status === 'active');
      setChannels(wa);
      if (wa.length > 0) { setActiveChannel(wa[0]); await fetchContacts(wa[0]); }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleChannelSwitch = async (ch: Channel) => {
    setActiveChannel(ch);
    setLoading(true);
    await fetchContacts(ch);
    setLoading(false);
  };

  const handleSync = async () => {
    if (!activeChannel) return;
    setSyncing(true);
    await fetchContacts(activeChannel);
    setSyncing(false);
  };

  const grouped = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = contacts.filter(c =>
      (c.name || '').toLowerCase().includes(q) || c.id.includes(q)
    );
    const map: Record<string, Contact[]> = {};
    filtered.forEach(c => {
      const letter = c.name?.[0]?.toUpperCase() || '#';
      const key = /[A-Z]/.test(letter) ? letter : '#';
      (map[key] = map[key] || []).push(c);
    });
    return Object.entries(map).sort(([a], [b]) => a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b));
  }, [contacts, search]);

  const totalFiltered = grouped.reduce((s, [, arr]) => s + arr.length, 0);

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
          <button onClick={handleSync} disabled={syncing || loading}
            className="flex items-center gap-2 px-4 py-2 btn-primary font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer">
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Sinkronisasi
          </button>
        </div>
      </div>

      {/* ── Search bar ────────────────────────────────────────────────────── */}
      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
        <input
          type="text"
          placeholder="Cari nama atau nomor telepon..."
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
            <p className="font-bold text-sm text-zinc-700 dark:text-zinc-300">Tidak ada channel WhatsApp aktif</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs">
              Sambungkan WhatsApp di <strong>Integrasi Platform</strong> terlebih dahulu.
            </p>
          </div>

        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center py-24 gap-3 text-center px-8">
            <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <User className="w-7 h-7 text-zinc-400 dark:text-zinc-500" />
            </div>
            <p className="font-bold text-sm text-zinc-700 dark:text-zinc-300">Belum ada kontak tersinkronisasi</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs">
              Kontak muncul otomatis setelah WhatsApp terhubung. Klik Sinkronisasi untuk memperbarui.
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
              {/* Alphabet section header */}
              <div className="sticky top-0 z-10 px-5 py-2 bg-zinc-50 dark:bg-zinc-950/60 backdrop-blur-sm border-b border-zinc-100 dark:border-zinc-800/50">
                <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest">{letter}</span>
              </div>

              {/* Contacts in this group */}
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {items.map(c => {
                  const displayName = c.name || formatPhone(c.id);
                  const phone       = formatPhone(c.id);
                  const initial     = displayName[0].toUpperCase();
                  const bg          = avatarColor(c.id);
                  return (
                    <div key={c.id}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                        {initial}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{displayName}</div>
                        {c.name && (
                          <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            <Phone className="w-3 h-3 shrink-0" />
                            <span className="font-mono">{phone}</span>
                          </div>
                        )}
                      </div>
                      {/* Action — visible on hover */}
                      <a href={`/chats?to=${encodeURIComponent(c.id.split('@')[0])}`}
                        className="opacity-0 group-hover:opacity-100 p-2 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-all border border-transparent hover:border-blue-100 dark:hover:border-blue-500/20"
                        title="Kirim Pesan">
                        <MessageSquare className="w-4 h-4" />
                      </a>
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
