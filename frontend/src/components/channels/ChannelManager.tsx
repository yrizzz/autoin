import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { Channel } from '../../types';
import AdminLayout from '../layout/AdminLayout';
import { 
  ArrowLeft, 
  Loader2, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  Globe, 
  Smartphone, 
  Cpu, 
  Layers,
  HelpCircle,
  Activity,
  PlusCircle,
  ExternalLink,
  MessageSquare,
  Users,
  RefreshCw,
  X
} from 'lucide-react';

type Platform = Channel['platform'];

const PLATFORMS: { id: Platform; label: string; icon: string; fields: { key: string; label: string; placeholder: string; type?: string }[] }[] = [
  {
    id: 'telegram',
    label: 'Telegram Bot',
    icon: '✈️',
    fields: [
      { key: 'bot_token', label: 'Bot Token', placeholder: '1234567890:ABCdef...' },
    ],
  },
  {
    id: 'discord',
    label: 'Discord Webhook',
    icon: '🎮',
    fields: [
      { key: 'webhook_url', label: 'Webhook URL', placeholder: 'https://discord.com/api/webhooks/...' },
    ],
  },
  {
    id: 'webhook',
    label: 'Custom Webhook',
    icon: '🔗',
    fields: [
      { key: 'webhook_url', label: 'Webhook URL', placeholder: 'https://your-server.com/webhook' },
      { key: 'method', label: 'Method (GET/POST)', placeholder: 'POST' },
    ],
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp Client',
    icon: '💬',
    fields: [],
  },
];

function PlatformIcon({ platform, className = "w-5 h-5" }: { platform: string; className?: string }) {
  if (platform === 'whatsapp') {
    return (
      <svg className={`${className} text-emerald-500`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.908.533 3.69 1.465 5.215L2 22l4.928-1.412A9.97 9.97 0 0012.004 22c5.524 0 10.004-4.48 10.004-10.004C22.008 6.48 17.528 2 12.004 2zm0 18.008c-1.67 0-3.238-.456-4.6-1.25L4.4 19.6l.858-2.928a8.004 8.004 0 116.746 3.336zM15.908 13.4c-.22-.11-1.3-.642-1.503-.715-.2-.074-.347-.11-.495.11-.147.22-.57.715-.7.863-.128.147-.257.165-.477.055a6.002 6.002 0 01-1.77-1.093c-.633-.564-1.062-1.26-1.186-1.48-.124-.22-.013-.34.097-.45.1-.1.22-.257.33-.385.11-.128.147-.22.22-.367.073-.147.037-.275-.018-.385-.055-.11-.495-1.193-.68-1.637-.18-.433-.36-.374-.495-.38l-.42-.008c-.147 0-.386.055-.588.275-.2.22-.77.752-.77 1.834 0 1.082.788 2.128.9 2.275.11.147 1.55 2.365 3.755 3.318.524.226.934.362 1.254.464.526.167 1.004.143 1.382.087.42-.062 1.3-.532 1.485-1.046.183-.513.183-.953.128-1.046-.055-.093-.202-.147-.422-.257z" />
      </svg>
    );
  }
  if (platform === 'telegram') {
    return (
      <svg className={`${className} text-sky-500`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.16 1.56-.86 5.72-1.22 7.64-.15.81-.45 1.08-.74 1.1-.63.06-1.11-.41-1.72-.8-1-.62-1.55-1-2.52-1.64-1.12-.74-.39-1.14.24-1.8.17-.17 3.08-2.83 3.14-3.09.01-.03.01-.16-.07-.22-.08-.07-.2-.05-.28-.03-.12.02-2.03 1.28-5.73 3.77-.54.37-1.03.55-1.47.54-.48-.01-1.4-.27-2.08-.5-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.75 4-1.74 6.67-2.88 8.01-3.43 3.81-1.56 4.6-1.83 5.12-1.84.11 0 .37.03.54.17.14.12.18.28.2.44-.02.07-.02.14-.03.22z" />
      </svg>
    );
  }
  if (platform === 'discord') {
    return (
      <svg className={`${className} text-indigo-500`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.27 4.73a16.1 16.1 0 00-3.97-1.23.08.08 0 00-.08.04 11.23 11.23 0 00-.5 1.02.08.08 0 00.07.12 14.88 14.88 0 014.58 0 .08.08 0 00.07-.12 11.24 11.24 0 00-.5-1.02.08.08 0 00-.08-.04 16.09 16.09 0 00-3.97 1.23.07.07 0 00-.03.03 15.22 15.22 0 00-.32 1.34.07.07 0 00.07.08 14.3 14.3 0 004.9-.44.07.07 0 00.04-.06 18.06 18.06 0 00-1.89-6.3.07.07 0 00-.06-.04 16.22 16.22 0 00-4.8 1.48.08.08 0 00-.03.05c-.32.55-.66 1.13-.93 1.73a.08.08 0 01-.14 0c-.27-.6-.6-1.18-.93-1.73a.08.08 0 00-.03-.05 16.22 16.22 0 00-4.8-1.48.07.07 0 00-.06.04 18.06 18.06 0 00-1.89 6.3.07.07 0 00.04.06 14.3 14.3 0 004.9.44.07.07 0 00.07-.08 15.22 15.22 0 00-.32-1.34.07.07 0 00-.03-.03zM8.52 14.85c-.9 0-1.63-.82-1.63-1.83 0-1.02.72-1.83 1.63-1.83.91 0 1.64.82 1.64 1.83 0 1.01-.72 1.83-1.64 1.83zm6.96 0c-.9 0-1.63-.82-1.63-1.83 0-1.02.72-1.83 1.63-1.83.91 0 1.64.82 1.64 1.83 0 1.01-.72 1.83-1.64 1.83z" />
      </svg>
    );
  }
  return (
    <svg className={`${className} text-zinc-500`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export default function ChannelManager() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<Platform | null>(null);
  const [form, setForm] = useState<Record<string, string>>({ name: '' });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // WhatsApp states
  const [waMethod, setWaMethod] = useState<'qr' | 'code'>('qr');
  const [waPhoneNumber, setWaPhoneNumber] = useState('');
  const [waSession, setWaSession] = useState<{ channelId: number; qr: string | null; code: string | null; status: string } | null>(null);
  const [qrProgress, setQrProgress] = useState(100);

  // WhatsApp Sync Modal states
  const [syncChannel, setSyncChannel] = useState<Channel | null>(null);
  const [syncTab, setSyncTab] = useState<'chats' | 'groups' | 'contacts'>('chats');
  const [syncData, setSyncData] = useState<{ chats: any[]; groups: any[]; contacts: any[] }>({ chats: [], groups: [], contacts: [] });
  const [syncLoading, setSyncLoading] = useState(false);

  useEffect(() => {
    fetchChannels();
  }, []);

  useEffect(() => {
    let interval: any;
    if (waSession && waSession.status !== 'connected') {
      interval = setInterval(async () => {
        try {
          const res = await api.get<{ status: string; code: string | null; qr: string | null; channel_status: string }>(
            `/api/whatsapp/${waSession.channelId}/status`
          );
          
          if (res.status === 'connected' || res.channel_status === 'active') {
            clearInterval(interval);
            setWaSession(null);
            setAdding(null);
            setForm({ name: '' });
            setWaPhoneNumber('');
            setMsg({ ok: true, text: '🎉 WhatsApp berhasil terhubung!' });
            fetchChannels();
          } else {
            setWaSession((prev: any) => {
              if (!prev) return null;
              return {
                ...prev,
                status: res.status,
                qr: res.qr || prev.qr,
                code: res.code || prev.code,
              };
            });
          }
        } catch (e) {
          console.error('Gagal memantau status WhatsApp:', e);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [waSession]);

  useEffect(() => {
    if (!waSession || waSession.status !== 'qr_pending') return;

    const totalSeconds = 20;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += 1;
      const progress = Math.max(0, 100 - (elapsed / totalSeconds) * 100);
      setQrProgress(progress);

      if (elapsed >= totalSeconds) {
        api.get<{ status: string; code: string | null; qr: string | null; channel_status: string }>(
          `/api/whatsapp/${waSession.channelId}/status`
        ).then(res => {
          setWaSession(prev => {
            if (!prev) return null;
            return {
              ...prev,
              qr: res.qr || prev.qr
            };
          });
        }).catch(() => {});
        elapsed = 0;
        setQrProgress(100);
      }
    }, 1000);

    return () => {
      clearInterval(timer);
      setQrProgress(100);
    };
  }, [waSession?.qr, waSession?.status]);

  function fetchChannels() {
    api.get<Channel[]>('/api/channels')
      .then(setChannels)
      .finally(() => setLoading(false));
  }

  async function handleAdd() {
    if (!adding || !form.name) return;
    setSaving(true);
    setMsg(null);

    if (adding === 'whatsapp') {
      try {
        const payload = {
          name: form.name,
          target_id: form.target_id || '',
          use_pairing_code: waMethod === 'code',
          phone_number: waPhoneNumber || '',
        };

        const res = await api.post<{ channel: Channel; qr: string | null; code: string | null; status: string }>('/api/whatsapp/connect', payload);
        
        setWaSession({
          channelId: res.channel.id,
          qr: res.qr,
          code: res.code,
          status: res.status,
        });

        setMsg({ ok: true, text: 'Sesi WhatsApp diinisialisasi. Silakan tautkan perangkat di bawah.' });
      } catch (e: any) {
        setMsg({ ok: false, text: e.message ?? 'Gagal menginisialisasi sesi WhatsApp. Coba pastikan port 3001 aktif.' });
      } finally {
        setSaving(false);
      }
      return;
    }

    const platformDef = PLATFORMS.find((p) => p.id === adding)!;
    const credentials: Record<string, string> = {};
    for (const f of platformDef.fields) {
      credentials[f.key] = form[f.key] ?? '';
    }

    try {
      await api.post('/api/channels', {
        name: form.name,
        platform: adding,
        credentials,
        target_id: form.target_id || undefined,
      });
      setMsg({ ok: true, text: '🎉 Channel baru berhasil terintegrasi!' });
      setAdding(null);
      setForm({ name: '' });
      fetchChannels();
    } catch (e: any) {
      setMsg({ ok: false, text: e.message ?? 'Gagal menambahkan channel. Coba cek format kredensial.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelWa() {
    if (!waSession) return;
    try {
      await api.delete(`/api/channels/${waSession.channelId}`);
      setWaSession(null);
      setMsg({ ok: true, text: 'Koneksi WhatsApp dibatalkan.' });
      fetchChannels();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleTest(ch: Channel) {
    setTesting(ch.id);
    setMsg(null);
    try {
      const res = await api.post<{ ok: boolean; status: string }>(`/api/channels/${ch.id}/test`);
      setMsg({ 
        ok: res.ok, 
        text: res.ok 
          ? `✓ Koneksi ${ch.name} berhasil terverifikasi aktif!` 
          : `✗ Koneksi ${ch.name} gagal terverifikasi. Coba periksa kembali kredensial Anda.` 
      });
      fetchChannels();
    } catch {
      setMsg({ ok: false, text: '✗ Gagal melakukan tes koneksi. Coba lagi dalam beberapa saat.' });
    } finally {
      setTesting(null);
    }
  }

  async function handleDelete(ch: Channel) {
    if (!confirm(`Apakah Anda yakin ingin menghapus integrasi channel "${ch.name}"?`)) return;
    try {
      await api.delete(`/api/channels/${ch.id}`);
      setMsg({ ok: true, text: `Channel "${ch.name}" berhasil dihapus.` });
      fetchChannels();
    } catch (e: any) {
      setMsg({ ok: false, text: 'Gagal menghapus channel.' });
    }
  }

  async function handleOpenSyncModal(ch: Channel) {
    setSyncChannel(ch);
    setSyncLoading(true);
    setSyncTab('chats');
    try {
      const [chatsRes, groupsRes, contactsRes] = await Promise.all([
        api.get<{ chats: any[] }>(`/api/whatsapp/${ch.id}/chats`).catch(() => ({ chats: [] })),
        api.get<{ groups: any[] }>(`/api/whatsapp/${ch.id}/groups`).catch(() => ({ groups: [] })),
        api.get<{ contacts: any[] }>(`/api/whatsapp/${ch.id}/contacts`).catch(() => ({ contacts: [] }))
      ]);
      setSyncData({
        chats: chatsRes.chats || [],
        groups: groupsRes.groups || [],
        contacts: contactsRes.contacts || []
      });
    } catch (err) {
      console.error('Failed to sync WA data:', err);
    } finally {
      setSyncLoading(false);
    }
  }

  async function handleRefreshSync() {
    if (!syncChannel) return;
    setSyncLoading(true);
    try {
      const [chatsRes, groupsRes, contactsRes] = await Promise.all([
        api.get<{ chats: any[] }>(`/api/whatsapp/${syncChannel.id}/chats`).catch(() => ({ chats: [] })),
        api.get<{ groups: any[] }>(`/api/whatsapp/${syncChannel.id}/groups`).catch(() => ({ groups: [] })),
        api.get<{ contacts: any[] }>(`/api/whatsapp/${syncChannel.id}/contacts`).catch(() => ({ contacts: [] }))
      ]);
      setSyncData({
        chats: chatsRes.chats || [],
        groups: groupsRes.groups || [],
        contacts: contactsRes.contacts || []
      });
    } catch (err) {
      console.error('Failed to refresh WA data:', err);
    } finally {
      setSyncLoading(false);
    }
  }

  const platformDef = PLATFORMS.find((p) => p.id === adding);

  return (
    <AdminLayout activePage="channels" title="Kelola Channel">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Status Messages */}
        {msg && (
          <div className={`rounded-xl p-4 border text-sm flex items-start gap-3 animate-fadeIn ${
            msg.ok 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]' 
              : 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.05)]'
          }`}>
            {msg.ok ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
            <div className="text-xs font-semibold leading-relaxed">
              {msg.text}
            </div>
          </div>
        )}

        {/* Add Channel Widget */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <PlusCircle className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
            <h2 className="font-bold text-sm text-zinc-800 dark:text-zinc-150 uppercase tracking-wider font-sans">Hubungkan Platform Baru</h2>
          </div>

          {adding === null ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setAdding(p.id); setForm({ name: '' }); setMsg(null); setWaSession(null); }}
                  className="flex flex-col items-center gap-3 bg-zinc-50/50 dark:bg-zinc-950/40 hover:bg-blue-50 dark:hover:bg-blue-950/10 border border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-500/30 rounded-xl py-6 transition-all duration-300 hover:scale-[1.02] cursor-pointer hover:shadow-md group"
                >
                  <PlatformIcon platform={p.id} className="w-8 h-8 group-hover:scale-110 transition-transform duration-300" />
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-350 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{p.label}</span>
                </button>
              ))}
            </div>
          ) : waSession ? (
            /* WhatsApp Pairing/QR Session Wizard */
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <PlatformIcon platform="whatsapp" className="w-6 h-6" />
                  <span className="font-bold text-sm text-zinc-800 dark:text-zinc-150">Hubungkan WhatsApp</span>
                </div>
                <button 
                  onClick={handleCancelWa} 
                  className="text-xs text-red-650 dark:text-red-400 bg-red-50 dark:bg-red-500/5 hover:bg-red-100/10 dark:hover:bg-red-500/10 px-3.5 py-1.5 rounded-lg border border-red-100 dark:border-red-500/10 transition-all cursor-pointer font-bold"
                >
                  Batal & Hapus
                </button>
              </div>

              <div className="bg-zinc-50/20 dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-col items-center">
                {waSession.status === 'connecting' && (
                  <div className="flex flex-col items-center py-6 gap-4 animate-pulse">
                    <div className="w-64 h-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl flex items-center justify-center">
                      <PlatformIcon platform="whatsapp" className="w-12 h-12 text-zinc-400 dark:text-zinc-600" />
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">Menginisialisasi sesi WhatsApp...</p>
                  </div>
                )}

                {waSession.status === 'qr_pending' && waSession.qr && (
                  <div className="text-center space-y-5">
                    <div className="bg-white p-3 rounded-2xl inline-block shadow-lg relative overflow-hidden">
                      <img src={waSession.qr} alt="WhatsApp QR Code" className="w-64 h-64" />
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-100 overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 transition-all duration-1000 ease-linear"
                          style={{ width: `${qrProgress}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-550 dark:text-emerald-400" />
                      <span>QR Code diperbarui otomatis...</span>
                    </div>
                    <div className="space-y-2 max-w-sm mx-auto text-xs text-zinc-650 dark:text-zinc-400 leading-relaxed text-left bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                      <p className="font-bold text-zinc-800 dark:text-zinc-250 mb-1">📱 Petunjuk Scan QR:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Buka WhatsApp di HP Anda.</li>
                        <li>Buka Menu/Pengaturan {"->"} Perangkat Tertaut.</li>
                        <li>Pilih Tautkan Perangkat.</li>
                        <li>Arahkan kamera ke kode QR di atas.</li>
                      </ol>
                    </div>
                  </div>
                )}

                {waSession.status === 'pairing_pending' && waSession.code && (
                  <div className="text-center space-y-6">
                    <div className="py-4">
                      <div className="text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-widest font-extrabold mb-3 font-sans">AUTOIN PAIRING GATEWAY</div>
                      <div className="inline-flex items-center gap-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-8 py-5 rounded-3xl tracking-widest shadow-xl animate-pulse font-mono text-3xl font-extrabold text-zinc-850 dark:text-zinc-50">
                        <span>{waSession.code.includes('-') ? waSession.code.split('-')[0] : waSession.code.slice(0, 4)}</span>
                        <span className="text-zinc-350 dark:text-zinc-700">-</span>
                        <span>{waSession.code.includes('-') ? waSession.code.split('-')[1] : waSession.code.slice(4)}</span>
                      </div>
                    </div>
                    <div className="space-y-2 max-w-sm mx-auto text-xs text-zinc-650 dark:text-zinc-400 leading-relaxed text-left bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                      <p className="font-bold text-zinc-800 dark:text-zinc-250 mb-1">🔑 Petunjuk Memasukkan Kode:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Buka WhatsApp di HP Anda.</li>
                        <li>Buka Menu/Pengaturan {"->"} Perangkat Tertaut.</li>
                        <li>Ketuk Tautkan Perangkat {"->"} Tautkan dengan No. HP.</li>
                        <li>Masukkan 8 karakter kode di atas.</li>
                      </ol>
                    </div>
                  </div>
                )}

                {waSession.status !== 'connecting' && waSession.status !== 'qr_pending' && waSession.status !== 'pairing_pending' && (
                  <div className="flex flex-col items-center py-10 gap-3">
                    <Loader2 className="w-8 h-8 text-purple-600 dark:text-purple-400 animate-spin" />
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Status: <span className="text-zinc-800 dark:text-zinc-200 font-bold uppercase">{waSession.status}</span></p>
                    <p className="text-[10px] text-zinc-405 dark:text-zinc-500">Menunggu respons koneksi dari HP Anda...</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handleAdd(); }} className="space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 flex items-center justify-center">
                    <PlatformIcon platform={adding || ''} className="w-5 h-5" />
                  </span>
                  <span className="font-bold text-sm text-zinc-800 dark:text-zinc-150">{platformDef?.label} Setup</span>
                </div>
                <button 
                  type="button"
                  onClick={() => setAdding(null)} 
                  className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-850 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 transition-all cursor-pointer"
                >
                  Batal
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Nama Channel *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Contoh: WhatsApp Utama / CS Alert"
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                {platformDef?.fields.map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">{f.label} *</label>
                    <input
                      type={f.type ?? 'text'}
                      value={form[f.key] ?? ''}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                ))}

                {adding === 'telegram' && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Chat ID / Group ID *</label>
                    <input
                      type="text"
                      value={form.target_id ?? ''}
                      onChange={(e) => setForm({ ...form, target_id: e.target.value })}
                      placeholder="-1001234567890 (atau username grup/channel)"
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-650 focus:outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                )}

                {adding === 'whatsapp' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Nomor Penerima Default (Opsional)</label>
                      <input
                        type="text"
                        value={form.target_id ?? ''}
                        onChange={(e) => setForm({ ...form, target_id: e.target.value })}
                        placeholder="Contoh: 628123456789"
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-650 focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Metode Penautan WhatsApp *</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setWaMethod('qr')}
                          className={`py-3.5 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            waMethod === 'qr'
                              ? 'bg-blue-605/10 border-blue-500/40 text-blue-600 dark:text-blue-400 shadow-sm'
                              : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850'
                          }`}
                        >
                          📱 Scan QR Code
                        </button>
                        <button
                          type="button"
                          onClick={() => setWaMethod('code')}
                          className={`py-3.5 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            waMethod === 'code'
                              ? 'bg-blue-605/10 border-blue-500/40 text-blue-600 dark:text-blue-400 shadow-sm'
                              : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850'
                          }`}
                        >
                          🔑 Pairing Code
                        </button>
                      </div>
                    </div>

                    {waMethod === 'code' && (
                      <div className="animate-fadeIn">
                        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Nomor HP WhatsApp Anda *</label>
                        <input
                          type="text"
                          value={waPhoneNumber}
                          onChange={(e) => setWaPhoneNumber(e.target.value)}
                          placeholder="Masukkan nomor WA akun Anda (contoh: 628123456789)"
                          className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-650 focus:outline-none focus:border-blue-500 transition-all"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving || (adding === 'whatsapp' && waSession !== null)}
                  className="btn-primary font-bold px-5 py-2 rounded-xl text-xs transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>{adding === 'whatsapp' ? 'Mulai Hubungkan' : 'Simpan Channel'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setAdding(null); setWaSession(null); }}
                  className="bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-850 border border-zinc-250 dark:border-zinc-800 text-zinc-655 dark:text-zinc-400 font-bold px-5 py-2 rounded-xl text-xs transition-all cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Channels List Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Globe className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
            <h2 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 uppercase tracking-wider font-sans">Channel Terkoneksi</h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-3.5 animate-pulse">
              {[...Array(3)].map((_, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-950/40 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                    <div className="space-y-2">
                      <div className="h-3 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
                      <div className="h-2.5 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
                    <div className="h-8 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : channels.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/20 dark:bg-zinc-950/20">
              <Layers className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">Belum ada channel yang terhubung. Hubungkan salah satu di atas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {channels.map((ch) => (
                <div 
                  key={ch.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-950/40 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200 gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center shrink-0">
                      <PlatformIcon platform={ch.platform} className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate">{ch.name}</div>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">
                        <span>{ch.platform}</span>
                        {ch.target_id && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-zinc-500 dark:text-zinc-650 truncate max-w-[150px]">Target: {ch.target_id}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 justify-end border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800 pt-3 sm:pt-0">
                    <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full border ${statusBadgeStyle(ch.status)}`}>
                      {ch.status.toUpperCase()}
                    </span>

                    {ch.platform === 'whatsapp' && ch.status === 'active' && (
                      <button
                        onClick={() => handleOpenSyncModal(ch)}
                        className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 bg-emerald-50 dark:bg-emerald-500/5 hover:bg-emerald-100/10 dark:hover:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/10 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chats & Grup</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleTest(ch)}
                      disabled={testing === ch.id}
                      className="text-xs font-bold text-blue-600 hover:text-blue-500 bg-blue-50 dark:bg-blue-500/5 hover:bg-blue-100/10 dark:hover:bg-blue-500/10 border border-blue-100 dark:border-blue-500/10 px-3.5 py-1.5 rounded-lg transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                    >
                      {testing === ch.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      <span>Test Koneksi</span>
                    </button>

                    <button
                      onClick={() => handleDelete(ch)}
                      className="p-2 rounded-lg bg-red-50 dark:bg-red-500/5 hover:bg-red-100/10 dark:hover:bg-red-500/10 border border-red-100 dark:border-red-500/10 hover:border-red-200 dark:hover:border-red-550/20 text-red-650 dark:text-red-400 transition-all cursor-pointer"
                      title="Hapus Integrasi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sync Data Modal */}
      {syncChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-scaleIn">
            {/* Modal Header */}
            <div className="p-6 border-b border-zinc-250 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                  <PlatformIcon platform="whatsapp" className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-850 dark:text-zinc-100 uppercase tracking-wide">Sync Data WhatsApp</h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium font-mono truncate max-w-[250px] mt-0.5">{syncChannel.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefreshSync}
                  disabled={syncLoading}
                  className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-all cursor-pointer disabled:opacity-50"
                  title="Refresh Data"
                >
                  <RefreshCw className={`w-4 h-4 ${syncLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setSyncChannel(null)}
                  className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-all cursor-pointer"
                  title="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-3 border-b border-zinc-200 dark:border-zinc-800 p-2 bg-zinc-50/20 dark:bg-zinc-950/10 gap-1">
              {(['chats', 'groups', 'contacts'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSyncTab(tab)}
                  className={`py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer text-center capitalize ${
                    syncTab === tab
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-850 hover:dark:text-zinc-200'
                  }`}
                >
                  {tab === 'chats' ? '💬 Chats' : tab === 'groups' ? '👥 Groups' : '👤 Contacts'}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="p-6 max-h-[350px] overflow-y-auto custom-scrollbar">
              {syncLoading ? (
                <div className="space-y-3 animate-pulse">
                  {[...Array(4)].map((_, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-2xl border border-zinc-150 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/20">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3 w-28 bg-zinc-200 dark:bg-zinc-800 rounded" />
                          <div className="h-2.5 w-40 bg-zinc-200 dark:bg-zinc-800 rounded" />
                        </div>
                      </div>
                      <div className="h-2.5 w-8 bg-zinc-200 dark:bg-zinc-800 rounded shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {syncTab === 'chats' && (
                    <div className="space-y-3">
                      {syncData.chats.length === 0 ? (
                        <p className="text-center py-8 text-zinc-500 text-xs font-medium">Tidak ada chat tersinkron.</p>
                      ) : (
                        syncData.chats.map((c: any, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-2xl border border-zinc-150 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/20 hover:border-zinc-250 dark:hover:border-zinc-700 transition-all">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400 font-bold text-sm uppercase">
                                {c.name?.charAt(0) || 'U'}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-zinc-850 dark:text-zinc-150 truncate">{c.name || c.id}</div>
                                <div className="text-[10px] text-zinc-500 dark:text-zinc-450 truncate mt-0.5">{c.lastMessage}</div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end shrink-0 gap-1.5 ml-4">
                              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold">{c.time}</span>
                              {c.unread > 0 && (
                                <span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 min-w-4 text-center">
                                  {c.unread}
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {syncTab === 'groups' && (
                    <div className="space-y-3">
                      {syncData.groups.length === 0 ? (
                        <p className="text-center py-8 text-zinc-500 text-xs font-medium">Tidak ada grup tersinkron.</p>
                      ) : (
                        syncData.groups.map((g: any, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-2xl border border-zinc-150 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/20 hover:border-zinc-250 dark:hover:border-zinc-700 transition-all">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400 font-bold text-sm uppercase">
                                {g.name?.charAt(0) || 'G'}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-zinc-850 dark:text-zinc-150 truncate">{g.name}</div>
                                <div className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono truncate mt-0.5">{g.id}</div>
                              </div>
                            </div>
                            <div className="shrink-0 ml-4">
                              <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-450 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-zinc-200/50 dark:border-zinc-700/50">
                                {g.participantsCount} Member
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {syncTab === 'contacts' && (
                    <div className="space-y-3.5">
                      {syncData.contacts.length === 0 ? (
                        <p className="text-center py-8 text-zinc-500 text-xs font-medium">Tidak ada kontak tersinkron.</p>
                      ) : (
                        syncData.contacts.map((c: any, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-2.5 rounded-2xl border border-zinc-150 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/20 hover:border-zinc-250 dark:hover:border-zinc-700 transition-all">
                            <div className="w-9 h-9 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-xs uppercase">
                              {c.name?.charAt(0) || 'C'}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-zinc-850 dark:text-zinc-150 truncate">{c.name}</div>
                              <div className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono truncate mt-0.5">{c.id.split('@')[0]}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/30 flex justify-end">
              <button
                onClick={() => setSyncChannel(null)}
                className="bg-zinc-900 hover:bg-zinc-850 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold px-5 py-2.5 rounded-2xl text-xs transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}



function statusBadgeStyle(status: string): string {
  if (status === 'active') return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20';
  if (status === 'error')  return 'bg-red-50 dark:bg-red-500/10 text-red-650 dark:text-red-400 border-red-100 dark:border-red-500/20';
  return 'bg-zinc-100 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800';
}
