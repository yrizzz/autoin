import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { Channel, User } from '../../types';
import AdminLayout from '../layout/AdminLayout';
import {
  Loader2,
  Trash2,
  AlertCircle,
  CheckCircle,
  Globe,
  Layers,
  PlusCircle,
  MessageSquare,
  Users,
  RefreshCw,
  X,
  Copy,
  Check,
  Settings,
  Edit3
} from 'lucide-react';

type Platform = Channel['platform'];

const PLATFORMS: { id: Platform; label: string; icon: string; fields: { key: string; label: string; placeholder: string; type?: string }[] }[] = [
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
  return (
    <svg className={`${className} text-zinc-500`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export default function ChannelManager() {
  const [user, setUser] = useState<User | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<Platform | null>(null);
  const [form, setForm] = useState<Record<string, string>>({ name: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Custom delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);

  // Custom flush/soft-reset confirmation
  const [flushConfirmOpen, setFlushConfirmOpen] = useState(false);
  const [channelToFlush, setChannelToFlush] = useState<Channel | null>(null);
  const [flushing, setFlushing] = useState<number | null>(null);

  // Unified Settings (Rename + Chatbot settings)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsChannel, setSettingsChannel] = useState<Channel | null>(null);
  const [settingsName, setSettingsName] = useState('');
  const [replySelf, setReplySelf] = useState(false);
  const [replyOthers, setReplyOthers] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  function handleOpenSettings(ch: Channel) {
    setSettingsChannel(ch);
    setSettingsName(ch.name);
    const chatSettings = ch.chatbot_settings || { reply_self: false, reply_others: true };
    setReplySelf(!!chatSettings.reply_self);
    setReplyOthers(chatSettings.reply_others !== false);
    setSettingsModalOpen(true);
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!settingsChannel || !settingsName.trim()) return;
    setSavingSettings(true);
    try {
      await api.put(`/api/channels/${settingsChannel.id}`, {
        name: settingsName,
      });
      setMsg({ ok: true, text: 'Pengaturan device berhasil disimpan.' });
      setSettingsModalOpen(false);
      setSettingsChannel(null);
      fetchChannels();
    } catch (err: any) {
      setMsg({ ok: false, text: err.message ?? 'Gagal menyimpan pengaturan.' });
    } finally {
      setSavingSettings(false);
    }
  }

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
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [expandedGroupMembers, setExpandedGroupMembers] = useState<{ [groupId: string]: any[] }>({});
  const [loadingGroupMembers, setLoadingGroupMembers] = useState<string | null>(null);

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
      .catch(() => setChannels([]))
      .finally(() => setLoading(false));

    api.get<User>('/api/me')
      .then(setUser)
      .catch((err) => console.error('Gagal mengambil data user:', err));
  }

  async function handleAdd() {
    if (!adding) return;
    
    const newErrors: Record<string, string> = {};
    if (!form.name || form.name.trim() === '') {
      newErrors.name = 'Nama Device wajib diisi!';
    }
    
    if (adding === 'whatsapp' && waMethod === 'code' && (!waPhoneNumber || waPhoneNumber.trim() === '')) {
      newErrors.phone_number = 'Nomor HP WhatsApp wajib diisi jika menggunakan metode Pairing Code!';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
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

  function handleCopyId(id: number) {
    navigator.clipboard.writeText(String(id));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
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

  function handleDelete(ch: Channel) {
    setChannelToDelete(ch);
    setDeleteConfirmOpen(true);
  }

  async function confirmDeleteChannel() {
    if (!channelToDelete) return;
    const ch = channelToDelete;
    setDeleteConfirmOpen(false);
    setChannelToDelete(null);
    try {
      await api.delete(`/api/channels/${ch.id}`);
      setMsg({ ok: true, text: `Koneksi device "${ch.name}" berhasil diputus dan dihapus.` });
      fetchChannels();
    } catch (e: any) {
      setMsg({ ok: false, text: 'Gagal memutuskan koneksi device.' });
    }
  }

  async function confirmFlushChannel() {
    if (!channelToFlush) return;
    const ch = channelToFlush;
    setFlushing(ch.id);
    setFlushConfirmOpen(false);
    setChannelToFlush(null);
    try {
      await api.post(`/api/whatsapp/${ch.id}/flush`);
      setMsg({ ok: true, text: `✓ Sesi device "${ch.name}" berhasil ditata ulang. Cache dibersihkan & soft-reconnect dipicu.` });
      fetchChannels();
    } catch (e: any) {
      setMsg({ ok: false, text: e.message ?? 'Gagal menata ulang sesi device.' });
    } finally {
      setFlushing(null);
    }
  }

  async function handleOpenSyncModal(ch: Channel) {
    setSyncChannel(ch);
    setSyncLoading(true);
    setSyncTab('chats');
    const prefix = 'whatsapp';
    try {
      const [chatsRes, groupsRes, contactsRes] = await Promise.all([
        api.get<{ chats: any[] }>(`/api/${prefix}/${ch.id}/chats`).catch(() => ({ chats: [] })),
        api.get<{ groups: any[] }>(`/api/${prefix}/${ch.id}/groups`).catch(() => ({ groups: [] })),
        api.get<{ contacts: any[] }>(`/api/${prefix}/${ch.id}/contacts`).catch(() => ({ contacts: [] }))
      ]);
      setSyncData({
        chats: chatsRes.chats || [],
        groups: groupsRes.groups || [],
        contacts: contactsRes.contacts || []
      });
    } catch (err) {
      console.error('Failed to sync data:', err);
    } finally {
      setSyncLoading(false);
    }
  }

  async function handleRefreshSync() {
    if (!syncChannel) return;
    setSyncLoading(true);
    const prefix = 'whatsapp';
    try {
      const [chatsRes, groupsRes, contactsRes] = await Promise.all([
        api.get<{ chats: any[] }>(`/api/${prefix}/${syncChannel.id}/chats`).catch(() => ({ chats: [] })),
        api.get<{ groups: any[] }>(`/api/${prefix}/${syncChannel.id}/groups`).catch(() => ({ groups: [] })),
        api.get<{ contacts: any[] }>(`/api/${prefix}/${syncChannel.id}/contacts`).catch(() => ({ contacts: [] }))
      ]);
      setSyncData({
        chats: chatsRes.chats || [],
        groups: groupsRes.groups || [],
        contacts: contactsRes.contacts || []
      });
    } catch (err) {
      console.error('Failed to refresh data:', err);
    } finally {
      setSyncLoading(false);
    }
  }

  async function handleDeleteContact(jid: string) {
    if (!syncChannel) return;
    if (!confirm('Apakah Anda yakin ingin menghapus kontak ini?')) return;
    try {
      const res = await api.delete<{ contacts: any[] }>(
        `/api/whatsapp/${syncChannel.id}/contacts/${encodeURIComponent(jid)}`
      );
      if (res.contacts) {
        setSyncData((prev) => ({
          ...prev,
          contacts: res.contacts,
        }));
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus kontak.');
    }
  }

  async function toggleExpandGroup(groupId: string) {
    if (!syncChannel) return;
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
      return;
    }
    setExpandedGroupId(groupId);
    if (!expandedGroupMembers[groupId]) {
      setLoadingGroupMembers(groupId);
      try {
        const res = await api.get<any>(`/api/whatsapp/${syncChannel.id}/groups/${encodeURIComponent(groupId)}`);
        if (res.metadata && res.metadata.participants) {
          setExpandedGroupMembers(prev => ({
            ...prev,
            [groupId]: res.metadata.participants
          }));
        }
      } catch (err) {
        console.error('Failed to load group members:', err);
      } finally {
        setLoadingGroupMembers(null);
      }
    }
  }

  const platformDef = PLATFORMS.find((p) => p.id === adding);

  return (
    <AdminLayout activePage="channels" title="Device Connected">
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
            <h2 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 uppercase tracking-wider font-sans">Hubungkan Device Baru</h2>
          </div>

          {user?.email === 'demo@autoin.dev' ? (
            <div className="flex flex-col items-center justify-center text-center py-10 px-4 bg-zinc-50/30 dark:bg-zinc-950/20 border border-dashed border-zinc-200 dark:border-zinc-800/80 rounded-2xl">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-500 fill-current" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 5.92 1 1 5.92 1 12s4.92 11 11.24 11c6.6 0 11-4.647 11-11.19 0-.756-.08-1.333-.177-1.905H12.24z"/>
                </svg>
              </div>
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-1">Koneksi Device Memerlukan Google SSO</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mb-6 leading-relaxed">
                Untuk menghubungkan device WhatsApp ke platform Autoin, Anda wajib masuk menggunakan akun Google Anda terlebih dahulu.
              </p>
              <button
                type="button"
                onClick={() => {
                  const apiUrl = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:8001';
                  window.location.href = `${apiUrl}/auth/google`;
                }}
                className="btn-primary font-bold px-6 py-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-2"
              >
                Masuk dengan Google SSO
              </button>
            </div>
          ) : adding === null ? (
            <div className="flex flex-col items-center justify-center text-center py-10 px-4 bg-zinc-50/30 dark:bg-zinc-950/20 border border-dashed border-zinc-200 dark:border-zinc-800/80 rounded-2xl">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                <PlatformIcon platform="whatsapp" className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-1">Hubungkan Akun WhatsApp Baru</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mb-6 leading-relaxed">
                Tautkan akun WhatsApp Anda untuk mulai mengirim pesan broadcast, membuat auto-reply, dan sinkronisasi obrolan secara instan.
              </p>
              <button
                type="button"
                onClick={() => { setAdding('whatsapp'); setForm({ name: '' }); setMsg(null); setWaSession(null); }}
                className="btn-primary font-bold px-6 py-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-2"
              >
                <PlusCircle className="w-4.5 h-4.5" />
                Hubungkan Device WhatsApp
              </button>
            </div>
          ) : waSession ? (
            /* ── WhatsApp Device Connector ── */
            <div className="animate-fadeIn">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <PlatformIcon platform="whatsapp" className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-zinc-800 dark:text-zinc-200">Hubungkan WhatsApp</p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Scan QR atau masukkan kode pairing</p>
                  </div>
                </div>
                <button
                  onClick={handleCancelWa}
                  className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/5 hover:bg-red-100/10 dark:hover:bg-red-500/10 px-3.5 py-1.5 rounded-lg border border-red-100 dark:border-red-500/10 transition-all cursor-pointer font-bold"
                >
                  Batal & Hapus
                </button>
              </div>

              {/* Connecting State */}
              {waSession.status === 'connecting' && (
                <div className="flex flex-col items-center py-12 gap-5">
                  <div className="relative w-24 h-24">
                    <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" />
                    <div className="relative w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <PlatformIcon platform="whatsapp" className="w-12 h-12" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 mb-1">Menginisialisasi Sesi...</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Menghubungi server WhatsApp</p>
                  </div>
                  <div className="flex gap-1.5">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}

              {/* QR Code State */}
              {waSession.status === 'qr_pending' && waSession.qr && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  {/* QR Card */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      {/* Glow effect */}
                      <div className="absolute -inset-3 bg-emerald-500/10 rounded-3xl blur-xl" />
                      <div className="relative bg-white p-4 rounded-2xl shadow-xl border border-emerald-100 dark:border-emerald-500/20">
                        {/* Corner marks */}
                        <div className="absolute top-2 left-2 w-5 h-5 border-t-3 border-l-3 border-emerald-500 rounded-tl-lg" style={{borderWidth:'3px 0 0 3px'}} />
                        <div className="absolute top-2 right-2 w-5 h-5 border-t-3 border-r-3 border-emerald-500 rounded-tr-lg" style={{borderWidth:'3px 3px 0 0'}} />
                        <div className="absolute bottom-2 left-2 w-5 h-5 border-b-3 border-l-3 border-emerald-500 rounded-bl-lg" style={{borderWidth:'0 0 3px 3px'}} />
                        <div className="absolute bottom-2 right-2 w-5 h-5 border-b-3 border-r-3 border-emerald-500 rounded-br-lg" style={{borderWidth:'0 3px 3px 0'}} />
                        <img src={waSession.qr} alt="WhatsApp QR Code" className="w-56 h-56 rounded-xl" />
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full max-w-[240px] space-y-1">
                      <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000 ease-linear"
                          style={{ width: `${qrProgress}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-1.5 justify-center">
                        <RefreshCw className="w-3 h-3 text-emerald-500 animate-spin" />
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold">QR diperbarui otomatis</span>
                      </div>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="space-y-4">
                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Scan QR dengan WhatsApp di HP Anda</p>
                    <ol className="space-y-3">
                      {[
                        { step: 1, text: 'Buka WhatsApp di HP Anda' },
                        { step: 2, text: 'Ketuk Menu ⋮ atau Pengaturan' },
                        { step: 3, text: 'Pilih Perangkat Tertaut → Tautkan Perangkat' },
                        { step: 4, text: 'Arahkan kamera ke QR Code di kiri' },
                      ].map(({ step, text }) => (
                        <li key={step} className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">{step}</span>
                          <span className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{text}</span>
                        </li>
                      ))}
                    </ol>
                    <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                      <span className="text-amber-500 shrink-0">⚡</span>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">Pastikan HP terhubung internet. QR berlaku 60 detik.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Pairing Code State */}
              {waSession.status === 'pairing_pending' && waSession.code && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  {/* Code Display */}
                  <div className="flex flex-col items-center gap-5">
                    <div className="relative">
                      <div className="absolute -inset-4 bg-blue-500/10 rounded-3xl blur-xl" />
                      <div className="relative bg-white dark:bg-zinc-950 border-2 border-blue-200 dark:border-blue-500/30 rounded-2xl px-10 py-8 shadow-xl text-center">
                        <p className="text-[9px] font-extrabold text-blue-400 uppercase tracking-[0.3em] mb-4">Kode Pairing</p>
                        <div className="flex items-center gap-3 font-mono text-4xl font-extrabold text-zinc-800 dark:text-zinc-100 tracking-widest">
                          <span className="text-blue-600 dark:text-blue-400">
                            {waSession.code.includes('-') ? waSession.code.split('-')[0] : waSession.code.slice(0, 4)}
                          </span>
                          <span className="text-zinc-300 dark:text-zinc-600 text-3xl">—</span>
                          <span className="text-blue-600 dark:text-blue-400">
                            {waSession.code.includes('-') ? waSession.code.split('-')[1] : waSession.code.slice(4)}
                          </span>
                        </div>
                        <div className="mt-4 flex items-center justify-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold">Menunggu verifikasi...</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="space-y-4">
                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Masukkan kode pairing di WhatsApp</p>
                    <ol className="space-y-3">
                      {[
                        { step: 1, text: 'Buka WhatsApp di HP Anda' },
                        { step: 2, text: 'Masuk ke Perangkat Tertaut' },
                        { step: 3, text: 'Pilih Tautkan dengan Nomor HP' },
                        { step: 4, text: 'Masukkan 8 karakter kode di kiri' },
                      ].map(({ step, text }) => (
                        <li key={step} className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">{step}</span>
                          <span className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{text}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}

              {/* Other Status */}
              {waSession.status !== 'connecting' && waSession.status !== 'qr_pending' && waSession.status !== 'pairing_pending' && (
                <div className="flex flex-col items-center py-12 gap-4">
                  <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-purple-600 dark:text-purple-400 animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 mb-1">
                      Status: <span className="text-purple-600 dark:text-purple-400 uppercase">{waSession.status}</span>
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Menunggu respons koneksi dari HP Anda...</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handleAdd(); }} className="space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <PlatformIcon platform="whatsapp" className="w-4.5 h-4.5 text-emerald-500" />
                  </div>
                  <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">Pengaturan Device WhatsApp Baru</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Nama Device / WhatsApp *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => {
                      setForm({ ...form, name: e.target.value });
                      if (errors.name) {
                        setErrors({ ...errors, name: '' });
                      }
                    }}
                    placeholder="Contoh: WhatsApp Utama / CS Alert"
                    className={`w-full bg-white dark:bg-zinc-950 border rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-all ${
                      errors.name ? 'border-red-500 focus:border-red-500' : 'border-zinc-200 dark:border-zinc-800'
                    }`}
                  />
                  {errors.name && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1.5 animate-fadeIn">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-semibold">{errors.name}</span>
                    </p>
                  )}
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


                {adding === 'whatsapp' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Nomor Penerima Default (Opsional)</label>
                      <input
                        type="text"
                        value={form.target_id ?? ''}
                        onChange={(e) => setForm({ ...form, target_id: e.target.value })}
                        placeholder="Contoh: 628123456789"
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all"
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
                              ? 'bg-blue-600/10 border-blue-500/40 text-blue-600 dark:text-blue-400 shadow-sm'
                              : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          📱 Scan QR Code
                        </button>
                        <button
                          type="button"
                          onClick={() => setWaMethod('code')}
                          className={`py-3.5 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            waMethod === 'code'
                              ? 'bg-blue-600/10 border-blue-500/40 text-blue-600 dark:text-blue-400 shadow-sm'
                              : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
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
                          onChange={(e) => {
                            setWaPhoneNumber(e.target.value);
                            if (errors.phone_number) {
                              setErrors({ ...errors, phone_number: '' });
                            }
                          }}
                          placeholder="Masukkan nomor WA akun Anda (contoh: 628123456789)"
                          className={`w-full bg-white dark:bg-zinc-950 border rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all ${
                            errors.phone_number ? 'border-red-500 focus:border-red-500' : 'border-zinc-200 dark:border-zinc-800'
                          }`}
                        />
                        {errors.phone_number && (
                          <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1.5 animate-fadeIn">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span className="font-semibold">{errors.phone_number}</span>
                          </p>
                        )}
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
                  onClick={() => { setAdding(null); setWaSession(null); setErrors({}); }}
                  className="bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold px-5 py-2 rounded-xl text-xs transition-all cursor-pointer"
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
            <h2 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 uppercase tracking-wider font-sans">Device Terkoneksi</h2>
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
          ) : channels.filter(ch => ch.platform === 'whatsapp').length === 0 ? (
            <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/20 dark:bg-zinc-950/20">
              <Layers className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">Belum ada device WhatsApp yang terhubung. Hubungkan di atas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {channels.filter(ch => ch.platform === 'whatsapp').map((ch) => (
                <div 
                  key={ch.id} 
                  className="flex flex-col p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-950/40 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200 gap-3"
                >
                  {/* Top: icon + name + status badge */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/10 mt-0.5">
                      <PlatformIcon platform={ch.platform} className="w-5.5 h-5.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {/* Name row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate">{ch.name}</div>
                          <button
                            type="button"
                            onClick={() => handleOpenSettings(ch)}
                            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                            title="Rename / Atur Device"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {/* Status badge — top right */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {ch.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />}
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border tracking-wide whitespace-nowrap ${statusBadgeStyle(ch.status)}`}>
                            {ch.status === 'active' ? 'TERHUBUNG' : ch.status === 'error' ? 'ERROR' : ch.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      {/* Platform + ID row — now on its own line, won't collide */}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">WhatsApp</span>
                        <button
                          type="button"
                          onClick={() => handleCopyId(ch.id)}
                          title="Salin Channel ID"
                          className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20 hover:bg-blue-100/70 dark:hover:bg-blue-500/20 transition-all cursor-pointer"
                        >
                          <span>ID: {ch.id}</span>
                          {copiedId === ch.id
                            ? <Check className="w-2.5 h-2.5 text-emerald-500" />
                            : <Copy className="w-2.5 h-2.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: action buttons */}
                  <div className="flex items-center gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
                    {ch.platform === 'whatsapp' && ch.status === 'active' && (
                      <button
                        onClick={() => handleOpenSyncModal(ch)}
                        className="flex-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/5 hover:bg-emerald-100/10 dark:hover:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/10 px-2 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 min-w-0"
                      >
                        <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Chats & Grup</span>
                      </button>
                    )}

                    {ch.platform === 'whatsapp' && ch.status === 'active' && (
                      <button
                        onClick={() => { setChannelToFlush(ch); setFlushConfirmOpen(true); }}
                        disabled={flushing === ch.id}
                        className="flex-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-500 bg-amber-50/50 dark:bg-amber-500/5 hover:bg-amber-100/10 dark:hover:bg-amber-500/10 border border-amber-100 dark:border-amber-500/10 px-2 py-2 rounded-lg transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5 min-w-0"
                        title="Tata ulang sesi device & data cache (tanpa reconnect)"
                      >
                        {flushing === ch.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span className="truncate">Tata Ulang</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleTest(ch)}
                      disabled={testing === ch.id}
                      className="flex-1 text-xs font-bold text-blue-600 hover:text-blue-500 bg-blue-50/50 dark:bg-blue-500/5 hover:bg-blue-100/10 dark:hover:bg-blue-500/10 border border-blue-100 dark:border-blue-500/10 px-2 py-2 rounded-lg transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5 min-w-0"
                    >
                      {testing === ch.id ? <Loader2 className="w-3 h-3 animate-spin shrink-0" /> : null}
                      <span className="truncate">Test Koneksi</span>
                    </button>

                    <button
                      onClick={() => handleOpenSettings(ch)}
                      className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100/70 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 transition-all cursor-pointer shrink-0 animate-none"
                      title="Pengaturan Device"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(ch)}
                      className="p-2 rounded-lg bg-red-50 dark:bg-red-500/5 hover:bg-red-100/10 dark:hover:bg-red-500/10 border border-red-100 dark:border-red-500/10 hover:border-red-200 dark:hover:border-red-500/20 text-red-600 dark:text-red-400 transition-all cursor-pointer shrink-0"
                      title="Hapus Integrasi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-zinc-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl dark:shadow-black/60 animate-scaleIn">
            {/* Modal Header */}
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-100/80 dark:bg-zinc-950/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-emerald-50 dark:bg-emerald-500/10">
                  <PlatformIcon platform="whatsapp" className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 uppercase tracking-wide">
                    Sync Data WhatsApp
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium font-mono truncate max-w-[250px] mt-0.5">{syncChannel.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefreshSync}
                  disabled={syncLoading}
                  className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-all cursor-pointer disabled:opacity-50"
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
            <div className="grid grid-cols-3 border-b border-zinc-200 dark:border-zinc-800 p-2 bg-zinc-50 dark:bg-zinc-950/20 gap-1">
              {(['chats', 'groups', 'contacts'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSyncTab(tab)}
                  className={`py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer text-center capitalize ${
                    syncTab === tab
                      ? 'tab-active'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200'
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
                    <div key={idx} className="flex items-center justify-between p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/20">
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
                          <div key={idx} className="flex items-center justify-between p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/20 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400 font-bold text-sm uppercase">
                                {c.name?.charAt(0) || 'U'}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{c.name || c.id}</div>
                                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{c.lastMessage}</div>
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
                        syncData.groups.map((g: any, idx) => {
                          const isExpanded = expandedGroupId === g.id;
                          const members = expandedGroupMembers[g.id] || [];
                          const isLoading = loadingGroupMembers === g.id;
                          return (
                            <div key={idx} className="p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/20 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all space-y-3">
                              <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleExpandGroup(g.id)}>
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400 font-bold text-sm uppercase">
                                    {g.name?.charAt(0) || 'G'}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{g.name}</div>
                                    <div className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono truncate mt-0.5">{g.id}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-4">
                                  <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-zinc-200/50 dark:border-zinc-700/50">
                                    {g.participantsCount} Member
                                  </span>
                                </div>
                              </div>
                              
                              {isExpanded && (
                                <div className="pt-3 border-t border-zinc-200/60 dark:border-zinc-800/80 space-y-2">
                                  <h4 className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Daftar Anggota Grup:</h4>
                                  {isLoading ? (
                                    <div className="flex items-center gap-2 py-4 justify-center text-xs text-zinc-400">
                                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                      <span>Memuat anggota grup...</span>
                                    </div>
                                  ) : members.length === 0 ? (
                                    <p className="text-[11px] text-zinc-500 text-center py-2">Gagal memuat atau tidak ada anggota.</p>
                                  ) : (
                                    <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 font-mono text-[10px]">
                                      {members.map((m: any, mIdx) => {
                                        const num = m.id.split('@')[0];
                                        return (
                                          <div key={mIdx} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-zinc-100/50 dark:hover:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400">
                                            <span className="truncate">{m.name || num}</span>
                                            <span className="text-[9px] text-zinc-450 dark:text-zinc-500 shrink-0 font-bold ml-2">+{num}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {syncTab === 'contacts' && (
                    <div className="space-y-3.5">
                      {syncData.contacts.length === 0 ? (
                        <p className="text-center py-8 text-zinc-500 text-xs font-medium">Tidak ada kontak tersinkron.</p>
                      ) : (
                        syncData.contacts.map((c: any, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/20 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center shrink-0 text-purple-600 dark:text-purple-400 font-bold text-xs uppercase">
                                {c.name?.charAt(0) || 'C'}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{c.name}</div>
                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5 min-w-0">
                                  <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono shrink-0">{c.id.split('@')[0]}</span>
                                  {c.groups && c.groups.map((gName: string, gIdx: number) => (
                                    <span key={gIdx} className="text-[8px] font-black px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-blue-550/20 truncate max-w-[120px]" title={gName}>
                                      {gName}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteContact(c.id)}
                              className="p-1.5 text-zinc-455 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 hover:bg-red-50/60 dark:hover:bg-red-500/10 rounded-xl transition shrink-0 ml-4 cursor-pointer"
                              title="Hapus Kontak"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-950/30 flex justify-end">
              <button
                onClick={() => setSyncChannel(null)}
                className="bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-200 dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-bold px-5 py-2.5 rounded-2xl text-xs transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Device Settings Modal (Rename & Chatbot settings) */}
      {settingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-zinc-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl dark:shadow-black/60 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/40 dark:bg-zinc-900/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-500" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Pengaturan Device</h3>
              </div>
              <button 
                onClick={() => { setSettingsModalOpen(false); setSettingsChannel(null); }}
                className="text-zinc-400 hover:text-zinc-500 dark:hover:text-zinc-300 transition-colors p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveSettings}>
              <div className="p-5 space-y-4">
                {/* Device Name input */}
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Nama Device</label>
                  <input
                    type="text"
                    value={settingsName}
                    onChange={e => setSettingsName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-800 dark:text-zinc-100"
                    placeholder="Nama Device"
                    required
                  />
                </div>


              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => { setSettingsModalOpen(false); setSettingsChannel(null); }}
                  className="px-4 py-2.5 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-60"
                >
                  {savingSettings ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Simpan Perubahan</span>
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
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-2">Putuskan Device</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
              Apakah Anda yakin ingin memutuskan koneksi device <strong>{channelToDelete?.name}</strong>? Kontak dan riwayat pesan akan terhapus dari sistem.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setDeleteConfirmOpen(false); setChannelToDelete(null); }}
                className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all cursor-pointer border border-zinc-200 dark:border-zinc-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteChannel}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-500/10 transition-all cursor-pointer"
              >
                Hapus &amp; Putus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flush Confirmation Modal */}
      {flushConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-zinc-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl dark:shadow-black/60 w-full max-w-sm overflow-hidden p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-2">Tata Ulang Sesi</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
              Apakah Anda yakin ingin menata ulang sesi device <strong>{channelToFlush?.name}</strong>?
              <br />
              <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-2">
                Ini akan membersihkan cache lokal dan melakukan soft-reset koneksi agar chat terstruktur ulang dengan segar tanpa memutuskan/scan QR code.
              </span>
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setFlushConfirmOpen(false); setChannelToFlush(null); }}
                className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all cursor-pointer border border-zinc-200 dark:border-zinc-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmFlushChannel}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-500/10 transition-all cursor-pointer"
              >
                Tata Ulang Sesi
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}



function statusBadgeStyle(status: string): string {
  if (status === 'active') return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20';
  if (status === 'error')  return 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20';
  return 'bg-zinc-100 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800';
}
