import React, { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '../../lib/api';
import type { Channel } from '../../types';
import AdminLayout from '../layout/AdminLayout';
import {
  Search, Send as SendIcon, Loader2, CheckCheck, Check,
  RefreshCw, Users, MessageSquare, Paperclip, X,
  FileText, Film, Music
} from 'lucide-react';

interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  ts?: number;
  type?: 'private' | 'group' | 'channel';
}
interface Msg {
  id: string;
  sender: 'me' | 'them';
  text: string;
  time: string;
  status: 'sending' | 'sent' | 'delivered';
  mediaUrl?: string;
  mediaType?: string;
}
interface Att { url: string; mediaType: string; name: string; preview?: string; }

const API_URL = (import.meta as any).env?.PUBLIC_API_URL ?? 'http://localhost:8001';

function hue(s: string) {
  const p = ['bg-blue-500','bg-violet-500','bg-pink-500','bg-orange-500','bg-emerald-500','bg-sky-500','bg-purple-500','bg-teal-500','bg-rose-500'];
  let h = 0; for (const c of s) h = c.charCodeAt(0) + ((h<<5)-h);
  return p[Math.abs(h) % p.length];
}
const isWaGrp = (id: string) => id.endsWith('@g.us');
const isTgGrp = (c: Chat) => c.type === 'group' || c.type === 'channel';
const isGrp   = (c: Chat) => isWaGrp(c.id) || isTgGrp(c);
const waPhone  = (id: string) => '+' + id.split('@')[0];
const fmtTs    = (ts: number) => ts ? new Date(ts * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';

function PlatformBadge({ platform }: { platform: string }) {
  if (platform === 'whatsapp')
    return <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">WA</span>;
  return <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-sky-500/10 text-sky-600 dark:text-sky-400">TG</span>;
}

function MediaBubble({ url, type }: { url: string; type: string }) {
  if (type === 'image') return <img src={url} className="max-w-[200px] rounded-lg mb-1" alt="" />;
  if (type === 'video') return <video src={url} controls className="max-w-[200px] rounded-lg mb-1" />;
  if (type === 'audio') return <audio src={url} controls className="w-full mb-1" />;
  return <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 mb-1 text-xs underline"><FileText className="w-3.5 h-3.5" />{url.split('/').pop()}</a>;
}

type Tab = 'all' | 'personal' | 'group';

export default function ChatManager() {
  const [channels, setChannels]   = useState<Channel[]>([]);
  const [ch, setCh]               = useState<Channel | null>(null);
  const [chats, setChats]         = useState<Chat[]>([]);
  const [active, setActive]       = useState<Chat | null>(null);
  const [msgs, setMsgs]           = useState<Msg[]>([]);
  const [input, setInput]         = useState('');
  const [chatsLoading, setChatsL] = useState(true);
  const [msgsLoading, setMsgsL]   = useState(false);
  const [sending, setSending]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch]       = useState('');
  const [tab, setTab]             = useState<Tab>('all');
  const [att, setAtt]             = useState<Att | null>(null);
  const [syncing, setSyncing]     = useState(false);
  const endRef     = useRef<HTMLDivElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);
  const inRef      = useRef<HTMLInputElement>(null);
  const pollMsgRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollChatsRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef  = useRef<Chat | null>(null);
  const chRef      = useRef<Channel | null>(null);

  // Keep refs in sync for use inside intervals
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { chRef.current = ch; }, [ch]);

  // Load all active channels
  useEffect(() => {
    api.get<Channel[]>('/api/channels').then(chs => {
      const actives = chs.filter(c => c.status === 'active');
      setChannels(actives);
      if (actives.length) setCh(actives[0]); else setChatsL(false);
    }).catch(() => setChatsL(false));
  }, []);

  const fetchChats = useCallback(async (channel: Channel) => {
    const endpoint = channel.platform === 'telegram'
      ? `/api/telegram/${channel.id}/chats`
      : `/api/whatsapp/${channel.id}/chats`;
    try {
      const r = await api.get<{ chats: Chat[] }>(endpoint);
      const list = (r.chats || []).map(c => ({
        ...c,
        time: c.time || (c.ts ? fmtTs(c.ts) : ''),
      }));
      setChats(list);
      return list;
    } catch {
      setChats([]);
      return [];
    }
  }, []);

  // Load chats on channel change + start polling chats every 30s (no SSE to avoid blocking PHP)
  useEffect(() => {
    if (!ch) return;
    setChatsL(true);
    setChats([]);
    setActive(null);
    setMsgs([]);

    if (pollChatsRef.current) clearInterval(pollChatsRef.current);
    if (pollMsgRef.current) clearInterval(pollMsgRef.current);

    fetchChats(ch).finally(() => setChatsL(false));

    // Poll chats every 30s
    pollChatsRef.current = setInterval(() => {
      if (chRef.current) fetchChats(chRef.current);
    }, 30000);

    return () => {
      if (pollChatsRef.current) { clearInterval(pollChatsRef.current); pollChatsRef.current = null; }
    };
  }, [ch?.id]);

  // Deep-link ?to= (WhatsApp only)
  useEffect(() => {
    if (!chats.length || ch?.platform !== 'whatsapp') return;
    const to = new URLSearchParams(window.location.search).get('to');
    if (!to) return;
    const found = chats.find(c => c.id.includes(to));
    if (found) { setActive(found); return; }
    const nc: Chat = { id: `${to}@s.whatsapp.net`, name: to, lastMessage: '', time: '', unread: 0 };
    setChats(p => [nc, ...p]);
    setActive(nc);
  }, [chats, ch?.platform]);

  const loadMsgs = useCallback(async (channel: Channel, chat: Chat) => {
    try {
      const endpoint = channel.platform === 'telegram'
        ? `/api/telegram/${channel.id}/messages/${encodeURIComponent(chat.id)}`
        : `/api/whatsapp/${channel.id}/messages/${encodeURIComponent(chat.id)}`;
      const r = await api.get<{ messages: Msg[] }>(endpoint);
      const incoming = r.messages || [];
      setMsgs(prev => {
        // keep optimistic "sending" messages, merge with incoming
        const sending = prev.filter(m => m.status === 'sending');
        const ids = new Set(incoming.map(m => m.id));
        return [...incoming, ...sending.filter(m => !ids.has(m.id))];
      });
    } catch { /* silent */ }
  }, []);

  // Poll messages every 5s while a chat is active (no SSE)
  useEffect(() => {
    if (pollMsgRef.current) { clearInterval(pollMsgRef.current); pollMsgRef.current = null; }

    if (!active || !ch) {
      setMsgs([]);
      return;
    }

    setMsgsL(true);
    loadMsgs(ch, active).finally(() => setMsgsL(false));

    // Only poll messages for WhatsApp (TG is load-once)
    if (ch.platform === 'whatsapp') {
      pollMsgRef.current = setInterval(() => {
        const curCh   = chRef.current;
        const curChat = activeRef.current;
        if (curCh && curChat) loadMsgs(curCh, curChat);
      }, 5000);
    }

    return () => {
      if (pollMsgRef.current) { clearInterval(pollMsgRef.current); pollMsgRef.current = null; }
    };
  }, [active?.id, ch?.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  // Upload (WA only)
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const token = localStorage.getItem('autoin_token');
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: fd,
      });
      if (!res.ok) throw new Error('Upload gagal');
      const d = await res.json();
      setAtt({ url: d.url, mediaType: d.mediaType, name: d.name || file.name, preview: d.mediaType === 'image' ? d.url : undefined });
    } catch (err: any) { alert(err.message); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  // Sync groups from WA server
  const handleSync = async () => {
    if (!ch || ch.platform !== 'whatsapp' || syncing) return;
    setSyncing(true);
    try {
      const r = await api.post<{ ok: boolean; chats: Chat[] }>(`/api/whatsapp/${ch.id}/sync`);
      if (r.chats?.length) {
        const list = r.chats.map(c => ({ ...c, time: c.time || (c.ts ? fmtTs(c.ts) : '') }));
        setChats(list);
      } else {
        await fetchChats(ch);
      }
    } catch { await fetchChats(ch); }
    setSyncing(false);
  };

  // Send
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !att) || !active || !ch) return;
    const t = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const tmp: Msg = { id: `tmp-${Date.now()}`, sender: 'me', text: input, time: t, status: 'sending', mediaUrl: att?.url, mediaType: att?.mediaType };
    setMsgs(p => [...p, tmp]);
    const text = input; const a = att;
    setInput(''); setAtt(null); inRef.current?.focus();
    try {
      setSending(true);
      if (ch.platform === 'telegram') {
        await api.post(`/api/telegram/${ch.id}/send`, { to: active.id, message: text || '', mediaUrl: a?.url ?? null });
      } else {
        await api.post(`/api/whatsapp/${ch.id}/send`, { to: active.id, message: text || '', mediaUrl: a?.url ?? null, mediaType: a?.mediaType ?? null });
      }
      setMsgs(p => p.map(m => m.id === tmp.id ? { ...m, status: 'delivered' } : m));
      setChats(p => p.map(c => c.id === active.id ? { ...c, lastMessage: text || `[${a?.mediaType}]`, time: t } : c));
    } catch {
      setMsgs(p => p.map(m => m.id === tmp.id ? { ...m, status: 'sent' } : m));
    } finally { setSending(false); }
  };

  const visible = chats.filter(c => {
    if (tab === 'personal' && isGrp(c)) return false;
    if (tab === 'group' && !isGrp(c)) return false;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.id.includes(q);
  });

  const TabBtn = ({ value, label }: { value: Tab; label: string }) => (
    <button onClick={() => setTab(value)}
      className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${tab === value ? 'bg-blue-600 text-white' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
      {label}
    </button>
  );

  return (
    <AdminLayout activePage="chats" title="Obrolan Aktif">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Obrolan Aktif</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
            WhatsApp &amp; Telegram · polling otomatis setiap 5–30 detik
          </p>
        </div>
        {channels.length > 0 && (
          <div className="flex gap-2 flex-wrap items-center">
            {channels.map(c => (
              <button key={c.id} onClick={() => setCh(c)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${ch?.id === c.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'active' ? 'bg-emerald-400' : 'bg-zinc-400'}`} />
                <span className={`text-[9px] font-extrabold uppercase mr-0.5 ${c.platform === 'whatsapp' ? 'text-emerald-500' : 'text-sky-500'} ${ch?.id === c.id ? '!text-white/80' : ''}`}>
                  {c.platform === 'whatsapp' ? 'WA' : 'TG'}
                </span>
                {c.name}
              </button>
            ))}
            {ch?.platform === 'whatsapp' && (
              <button onClick={handleSync} disabled={syncing || chatsLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-all">
                <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                Sync Grup
              </button>
            )}
          </div>
        )}
      </div>

      {!chatsLoading && channels.length === 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm flex flex-col items-center py-24 gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center"><Users className="w-7 h-7 text-zinc-400" /></div>
          <p className="font-bold text-sm text-zinc-700 dark:text-zinc-300">Tidak ada channel aktif</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Hubungkan akun WhatsApp atau Telegram terlebih dahulu.</p>
        </div>
      )}

      {(channels.length > 0 || chatsLoading) && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex" style={{ height: '74vh' }}>

          {/* Chat list */}
          <div className="w-80 shrink-0 border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
            <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                <input type="text" placeholder="Cari obrolan..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all" />
              </div>
              <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg">
                <TabBtn value="all" label="Semua" />
                <TabBtn value="personal" label="Personal" />
                <TabBtn value="group" label="Grup" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {chatsLoading ? (
                <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800/50">
                  {[...Array(6)].map((_, idx) => (
                    <div key={idx} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
                          <div className="h-2 w-8 bg-zinc-200 dark:bg-zinc-800 rounded" />
                        </div>
                        <div className="h-2 w-40 bg-zinc-200 dark:bg-zinc-800 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : visible.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center">
                  <MessageSquare className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {search ? 'Tidak ada hasil.' : tab === 'group' ? 'Tidak ada grup.' : tab === 'personal' ? 'Tidak ada chat personal.' : 'Belum ada obrolan.'}
                  </p>
                </div>
              ) : (
                visible.map(c => {
                  const isA = active?.id === c.id;
                  const bg  = hue(c.id);
                  const grp = isGrp(c);
                  const name = c.name || (ch?.platform === 'whatsapp' ? waPhone(c.id) : c.id);
                  return (
                    <div key={c.id} onClick={() => setActive(c)}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border-l-[3px] ${isA ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-600' : 'border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/40'}`}>
                      <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                        {grp ? <Users className="w-4 h-4" /> : name[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{name}</span>
                          <span className="text-[9px] text-zinc-400 shrink-0 ml-2">{c.time}</span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{c.lastMessage}</span>
                          {c.unread > 0 && <span className="ml-1 min-w-[16px] h-4 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 shrink-0">{c.unread > 99 ? '99+' : c.unread}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat window */}
          <div className="flex-1 flex flex-col min-w-0 bg-zinc-50 dark:bg-zinc-950/30">
            {active ? (
              <>
                {/* Header */}
                <div className="h-14 px-5 flex items-center gap-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                  <div className={`w-9 h-9 rounded-full ${hue(active.id)} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                    {isGrp(active) ? <Users className="w-4 h-4" /> : ((active.name || active.id)[0]?.toUpperCase() ?? '?')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-2">
                      {active.name || (ch?.platform === 'whatsapp' ? waPhone(active.id) : active.id)}
                      <PlatformBadge platform={ch?.platform ?? ''} />
                      {isGrp(active)
                        ? <span className="text-[9px] font-bold bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded">GRUP</span>
                        : <span className="text-[9px] font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">PERSONAL</span>
                      }
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      {ch?.platform === 'whatsapp' ? waPhone(active.id) : active.id}
                    </div>
                  </div>
                  {ch?.platform === 'whatsapp' && (
                    <a href={`/broadcast?to=${active.id.split('@')[0]}`}
                      className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all">
                      <SendIcon className="w-3 h-3" />Broadcast
                    </a>
                  )}
                  <button onClick={() => ch && loadMsgs(ch, active)} className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1.5">
                  {msgsLoading ? (
                    <div className="flex flex-col gap-4 animate-pulse">
                      {[...Array(6)].map((_, idx) => {
                        const isMe = idx % 2 === 0;
                        const widths = ['w-48', 'w-32', 'w-56', 'w-40', 'w-60', 'w-36'];
                        return (
                          <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`${widths[idx % widths.length]} h-10 rounded-2xl bg-zinc-200 dark:bg-zinc-800 ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`} />
                          </div>
                        );
                      })}
                    </div>
                  ) : msgs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                      <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center"><MessageSquare className="w-6 h-6 text-zinc-400 dark:text-zinc-500" /></div>
                      <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Belum ada pesan</p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500">Ketik di bawah untuk mulai.</p>
                    </div>
                  ) : (
                    msgs.map(m => {
                      const me = m.sender === 'me';
                      return (
                        <div key={m.id} className={`flex ${me ? 'justify-end' : 'justify-start'}`}>
                          <div className={`relative max-w-[65%] px-3.5 py-2 rounded-2xl text-sm shadow-sm ${me ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-bl-sm'}`}>
                            {m.mediaUrl && <MediaBubble url={m.mediaUrl} type={m.mediaType || 'document'} />}
                            {m.text && <div className={m.mediaUrl ? 'text-xs mt-1' : 'pr-12 leading-relaxed'}>{m.text}</div>}
                            <div className={`flex items-center justify-end gap-1 text-[9px] mt-1 ${me ? 'text-blue-200' : 'text-zinc-400 dark:text-zinc-500'}`}>
                              <span>{m.time}</span>
                              {me && (<>{m.status==='sending'&&<Loader2 className="w-2.5 h-2.5 animate-spin"/>}{m.status==='sent'&&<Check className="w-3 h-3"/>}{m.status==='delivered'&&<CheckCheck className="w-3 h-3 text-sky-300"/>}</>)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={endRef} />
                </div>

                {/* Attachment preview (WA only) */}
                {att && (
                  <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      {att.preview ? <img src={att.preview} className="w-10 h-10 object-cover rounded-lg shrink-0" alt="" />
                        : <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-lg flex items-center justify-center shrink-0">
                          {att.mediaType==='video' ? <Film className="w-5 h-5 text-purple-500"/> : att.mediaType==='audio' ? <Music className="w-5 h-5 text-green-500"/> : <FileText className="w-5 h-5 text-orange-500"/>}
                        </div>}
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate">{att.name}</div>
                        <div className="text-[10px] text-zinc-400 capitalize">{att.mediaType}</div>
                      </div>
                    </div>
                    <button onClick={() => setAtt(null)} className="p-1 text-zinc-400 hover:text-red-500 transition-all"><X className="w-4 h-4" /></button>
                  </div>
                )}

                {/* Input */}
                <form onSubmit={send} className="px-4 py-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2 shrink-0">
                  {ch?.platform === 'whatsapp' && (
                    <>
                      <input ref={fileRef} type="file" className="hidden"
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
                        onChange={handleFile} />
                      <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                        className={`p-2 rounded-lg transition-all shrink-0 disabled:opacity-50 ${att ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10' : 'text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                        {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                      </button>
                    </>
                  )}
                  <input ref={inRef} type="text" placeholder={att ? 'Tambahkan keterangan...' : 'Ketik pesan...'}
                    value={input} onChange={e => setInput(e.target.value)} disabled={sending}
                    onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(e as any); } }}
                    className="flex-1 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-all" />
                  <button type="submit" disabled={(!input.trim() && !att) || sending || uploading}
                    className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center shadow-sm transition-all disabled:opacity-40 cursor-pointer shrink-0">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendIcon className="w-4 h-4" />}
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Pilih Obrolan</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 max-w-xs">Klik obrolan dari daftar di sebelah kiri untuk mulai chatting.</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-zinc-400">
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />WA: Auto-refresh 5 detik</span>
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-sky-500" />TG: Load sekali</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
