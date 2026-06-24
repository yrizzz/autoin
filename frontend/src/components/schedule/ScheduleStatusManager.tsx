import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import AdminLayout from '../layout/AdminLayout';
import {
  Calendar, Clock, RefreshCw, Trash2, Play, Loader2,
  X, BarChart3, CheckCircle2, AlertCircle, XCircle,
  MessageSquare, Users, FileText, Video,
  ChevronRight, Send, Hash, Copy, Check, Info, Layers, Smartphone, Upload, Plus, Trash
} from 'lucide-react';
import type { Channel } from '../../types';

// Curated WhatsApp Status Background Colors
const STATUS_COLORS = [
  { name: 'WA Green', hex: '#075e54', class: 'bg-[#075e54]' },
  { name: 'Teal', hex: '#008080', class: 'bg-[#008080]' },
  { name: 'Royal Blue', hex: '#2563eb', class: 'bg-[#2563eb]' },
  { name: 'Midnight Purple', hex: '#6d28d9', class: 'bg-[#6d28d9]' },
  { name: 'Soft Rose', hex: '#ec4899', class: 'bg-[#ec4899]' },
  { name: 'Sunset Orange', hex: '#ea580c', class: 'bg-[#ea580c]' },
  { name: 'Charcoal', hex: '#1f2937', class: 'bg-[#1f2937]' },
  { name: 'Ruby Red', hex: '#be123c', class: 'bg-[#be123c]' },
];

interface BroadcastLog {
  id: number;
  channel_id: number;
  recipient_id: string | null;
  status: string;
  error: string | null;
  sent_at: string | null;
  channel?: { id: number; name: string; platform: string };
}

interface BroadcastTarget {
  channel_id: number;
  recipients: string[] | null;
  channel?: { id: number; name: string; platform: string };
}

interface Broadcast {
  id: number;
  title: string | null;
  content: string;
  status: string;
  media_url: string | null;
  media_type: string | null;
  scheduled_at: string | null;
  recurring: string;
  sent_at: string | null;
  created_at: string;
  targets?: BroadcastTarget[];
  logs?: BroadcastLog[];
}

interface Paginated<T> { data: T[]; total: number; current_page: number; last_page: number; }

type Tab = 'scheduled' | 'sent' | 'failed' | 'all';

const TAB_LABELS: Record<Tab, string> = {
  scheduled: 'Terjadwal',
  sent: 'Terkirim',
  failed: 'Gagal',
  all: 'Semua',
};

const STATUS_STYLE: Record<string, string> = {
  scheduled: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
  sent:      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
  sending:   'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  queued:    'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20',
  failed:    'bg-rose-500/10 text-rose-500 border border-rose-500/20',
  cancelled: 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20',
  draft:     'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20',
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Terjadwal', sent: 'Terkirim', sending: 'Mengirim',
  queued: 'Antrean', failed: 'Gagal', cancelled: 'Dibatalkan', draft: 'Draft',
};

export default function ScheduleStatusManager() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('all');

  // Left panel tab: 'form' | 'preview'
  const [leftTab, setLeftTab] = useState<'form' | 'preview'>('form');

  // Form States
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [statusType, setStatusType] = useState<'text' | 'media'>('text');
  const [content, setContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(STATUS_COLORS[0].hex);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [uploading, setUploading] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [sendImmediately, setSendImmediately] = useState(false);

  // Search Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: React.ReactNode;
    confirmText: string;
    cancelText: string;
    type: 'red' | 'blue';
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    type: 'blue',
    onConfirm: () => {},
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [bcRes, chRes] = await Promise.all([
        api.get<Paginated<Broadcast> | Broadcast[]>('/api/broadcasts'),
        api.get<Channel[]>('/api/channels')
      ]);

      // Handle both paginated ({data: []}) and direct array responses
      const allBroadcasts: Broadcast[] = Array.isArray(bcRes)
        ? bcRes
        : (bcRes as Paginated<Broadcast>).data ?? [];

      // Filter broadcasts that are WhatsApp Statuses
      const statusBCs = allBroadcasts.filter(b =>
        b.targets?.some(t => t.recipients?.includes('status@broadcast'))
      );
      setBroadcasts(statusBCs);

      // Connected WhatsApp Channels
      const activeWA = (Array.isArray(chRes) ? chRes : []).filter((ch: Channel) => ch.platform === 'whatsapp' && ch.status === 'active');
      setChannels(activeWA);
      if (activeWA.length > 0 && !selectedChannelId) {
        setSelectedChannelId(activeWA[0].id.toString());
      }
    } catch (err) {
      console.error('Failed to load schedule status data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedChannelId]);

  useEffect(() => {
    loadData();
  }, []);

  const triggerConfirm = (opts: typeof confirmModal) => {
    setConfirmModal(opts);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const token = localStorage.getItem('autoin_token');
      const formData = new FormData();
      formData.append('file', files[0]);

      const res = await fetch(`${import.meta.env.PUBLIC_API_URL ?? 'http://localhost:8001'}/api/upload`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setMediaUrl(data.url);

      const mime = files[0].type;
      if (mime.startsWith('video/')) {
        setMediaType('video');
      } else {
        setMediaType('image');
      }
    } catch (err: any) {
      alert(err.message ?? 'Gagal mengunggah file.');
    } finally {
      setUploading(false);
    }
  };

  const handleScheduleStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannelId) {
      alert('Pilih device WhatsApp terlebih dahulu!');
      return;
    }
    if (!content.trim() && statusType === 'text') {
      alert('Isi status text tidak boleh kosong!');
      return;
    }
    if (statusType === 'media' && !mediaUrl) {
      alert('Upload file gambar atau video terlebih dahulu!');
      return;
    }
    if (!sendImmediately && !scheduledAt) {
      alert('Tentukan tanggal & waktu penjadwalan!');
      return;
    }

    setSubmitting(true);
    try {
      const scheduledAtUtc = sendImmediately ? null : new Date(scheduledAt).toISOString();
      const statusTitle = statusType === 'text' 
        ? `Status Text: ${content.substring(0, 20)}...`
        : `Status Media: ${content.substring(0, 20) || 'Attachment'}`;

      // If text status, we store the background color in media_url (prefixed with #)
      const targetMediaUrl = statusType === 'text' ? selectedColor : mediaUrl;
      const targetMediaType = statusType === 'text' ? null : mediaType;

      await api.post('/api/broadcasts', {
        title: statusTitle,
        content: content,
        media_url: targetMediaUrl,
        media_type: targetMediaType,
        channel_ids: [parseInt(selectedChannelId)],
        recipients: ['status@broadcast'],
        scheduled_at: scheduledAtUtc,
        recurring: 'none',
        send_now: sendImmediately,
      });

      // Clear Form
      setContent('');
      setMediaUrl('');
      setScheduledAt('');
      setSendImmediately(false);
      
      // Reload list
      await loadData();
    } catch (err: any) {
      alert(err.message ?? 'Gagal menjadwalkan status.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendNow = async (b: Broadcast) => {
    triggerConfirm({
      open: true,
      title: 'Kirim Status Sekarang',
      message: (
        <>Apakah Anda yakin ingin memposting status <strong>"{b.title || 'Status Update'}"</strong> sekarang juga?</>
      ),
      confirmText: 'Kirim Sekarang',
      cancelText: 'Batal',
      type: 'blue',
      onConfirm: async () => {
        setActionId(b.id);
        try {
          await api.post(`/api/broadcasts/${b.id}/send`);
          await loadData();
        } catch (e: any) {
          alert(e.message ?? 'Gagal mengirim.');
        } finally {
          setActionId(null);
        }
      }
    });
  };

  const handleCancel = async (b: Broadcast) => {
    triggerConfirm({
      open: true,
      title: 'Batalkan Jadwal Status',
      message: (
        <>Apakah Anda yakin ingin membatalkan jadwal status <strong>"{b.title || 'Status Update'}"</strong>?</>
      ),
      confirmText: 'Batalkan',
      cancelText: 'Kembali',
      type: 'red',
      onConfirm: async () => {
        setActionId(b.id);
        try {
          await api.post(`/api/broadcasts/${b.id}/cancel`);
          await loadData();
        } catch (e: any) {
          alert(e.message ?? 'Gagal membatalkan.');
        } finally {
          setActionId(null);
        }
      }
    });
  };

  const handleDelete = async (b: Broadcast) => {
    triggerConfirm({
      open: true,
      title: 'Hapus Jadwal Status',
      message: (
        <>Apakah Anda yakin ingin menghapus status <strong>"{b.title || 'Status Update'}"</strong>? Tindakan ini tidak dapat dibatalkan.</>
      ),
      confirmText: 'Hapus',
      cancelText: 'Batal',
      type: 'red',
      onConfirm: async () => {
        setActionId(b.id);
        try {
          await api.delete(`/api/broadcasts/${b.id}`);
          await loadData();
        } catch (e: any) {
          alert(e.message ?? 'Gagal menghapus.');
        } finally {
          setActionId(null);
        }
      }
    });
  };

  // Filter lists based on tab & search query
  const filteredBroadcasts = broadcasts.filter(b => {
    // Tab filtering
    if (activeTab === 'scheduled' && b.status !== 'scheduled') return false;
    if (activeTab === 'sent' && b.status !== 'sent') return false;
    if (activeTab === 'failed' && b.status !== 'failed') return false;

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const contentMatch = b.content?.toLowerCase().includes(q);
      const titleMatch = b.title?.toLowerCase().includes(q);
      return contentMatch || titleMatch;
    }
    return true;
  });

  return (
    <AdminLayout activePage="schedule_status" title="Jadwal Status WA" fullWidth>
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-950 dark:text-white tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-emerald-500 animate-pulse" />
            Jadwal Status WhatsApp
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Jadwalkan posting status text atau media ke WhatsApp Story secara otomatis.
          </p>
        </div>
        <button onClick={loadData} disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN: Tabbed Card (Form / Preview) */}
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-[#0c0c0e]/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden">

            {/* Card Tab Header */}
            <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-1 pt-1">
              <button
                type="button"
                onClick={() => setLeftTab('form')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  leftTab === 'form'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                Buat Status
              </button>
              <button
                type="button"
                onClick={() => setLeftTab('preview')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  leftTab === 'preview'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                Preview
              </button>
            </div>

            {/* ── TAB: FORM ── */}
            {leftTab === 'form' && (
            <div className="p-5">

            <form onSubmit={handleScheduleStatus} className="space-y-4">
              {/* Device Selector */}
              <div>
                <label className="block text-[11px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                  Device WhatsApp
                </label>
                <select
                  value={selectedChannelId}
                  onChange={e => setSelectedChannelId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500 font-medium"
                >
                  {channels.length === 0 ? (
                    <option value="">Tidak ada device aktif</option>
                  ) : (
                    channels.map(ch => (
                      <option key={ch.id} value={ch.id}>
                        {ch.name} (+{ch.target_id?.split('@')[0]})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Status Type Selector */}
              <div>
                <label className="block text-[11px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                  Tipe Status
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-950 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50">
                  <button
                    type="button"
                    onClick={() => setStatusType('text')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      statusType === 'text'
                        ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-450 shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    Text Status
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusType('media')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      statusType === 'media'
                        ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-450 shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    Media (Foto / Video)
                  </button>
                </div>
              </div>

              {/* TEXT STATUS SPECIFIC FIELDS */}
              {statusType === 'text' && (
                <>
                  <div>
                    <label className="block text-[11px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                      Pesan Status
                    </label>
                    <textarea
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder="Tulis status Anda..."
                      rows={4}
                      className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500 font-medium placeholder-zinc-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                      Warna Background
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {STATUS_COLORS.map(col => (
                        <button
                          key={col.hex}
                          type="button"
                          onClick={() => setSelectedColor(col.hex)}
                          className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${col.class} ${
                            selectedColor === col.hex 
                              ? 'border-white ring-2 ring-blue-500' 
                              : 'border-transparent hover:scale-105'
                          }`}
                          title={col.name}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* MEDIA STATUS SPECIFIC FIELDS */}
              {statusType === 'media' && (
                <>
                  <div>
                    <label className="block text-[11px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                      Media File
                    </label>
                    {mediaUrl ? (
                      <div className="relative rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-50 dark:bg-zinc-950 p-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {mediaType === 'image' ? (
                            <img src={mediaUrl} className="w-10 h-10 object-cover rounded-lg border border-zinc-200 dark:border-zinc-800" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center border border-purple-500/20">
                              <Video className="w-5 h-5" />
                            </div>
                          )}
                          <span className="text-[11px] font-bold text-zinc-650 dark:text-zinc-350 truncate max-w-[150px]">
                            {mediaUrl.split('/').pop()}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMediaUrl('')}
                          className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-250 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-6 text-center hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 transition-all relative">
                        <input
                          type="file"
                          accept="image/*,video/*"
                          onChange={handleFileUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          disabled={uploading}
                        />
                        {uploading ? (
                          <div className="flex flex-col items-center justify-center">
                            <Loader2 className="w-6 h-6 text-blue-500 animate-spin mb-1.5" />
                            <span className="text-[11px] font-bold text-zinc-500">Mengupload media...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <Upload className="w-6 h-6 text-zinc-300 dark:text-zinc-700 mb-1.5" />
                            <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                              Klik untuk Upload Foto / Video
                            </span>
                            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                              Format: JPG, PNG, MP4. Maks 16MB.
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                      Caption (Opsional)
                    </label>
                    <input
                      type="text"
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder="Masukkan caption status..."
                      className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500 font-medium placeholder-zinc-400"
                    />
                  </div>
                </>
              )}

              {/* Schedule / Send Immediately Option */}
              <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-[11px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                      Kirim Sekarang
                    </span>
                    <span className="text-[10px] text-zinc-500">Kirim status langsung tanpa antrean jadwal.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSendImmediately(!sendImmediately)}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      sendImmediately ? 'bg-blue-600' : 'bg-zinc-200 dark:bg-zinc-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        sendImmediately ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {!sendImmediately && (
                  <div>
                    <label className="block text-[11px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                      Waktu Pengiriman
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={e => setScheduledAt(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500 font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || uploading}
                className="w-full flex items-center justify-center gap-2 py-2.5 btn-primary text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    {sendImmediately ? <Send className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                    {sendImmediately ? 'Posting Status Sekarang' : 'Jadwalkan Status'}
                  </>
                )}
              </button>
            </form>
            </div>
            )} {/* end leftTab === 'form' */}

            {/* ── TAB: PREVIEW ── */}
            {leftTab === 'preview' && (
            <div className="p-5 flex flex-col items-center gap-4">
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium text-center -mb-1">
                Preview tampilan status WhatsApp secara real-time
              </p>

              {/* Phone mockup */}
              <div className="bg-[#0b141a] rounded-3xl border-8 border-zinc-300 dark:border-zinc-700 shadow-2xl w-[230px] aspect-[9/16] relative overflow-hidden flex flex-col justify-between text-white">
                {/* Top progress bar */}
                <div className="absolute top-0 left-0 right-0 flex gap-0.5 px-2 pt-1.5 z-20">
                  <span className="flex-1 h-[2px] rounded-full bg-white/70" />
                  <span className="flex-1 h-[2px] rounded-full bg-white/30" />
                  <span className="flex-1 h-[2px] rounded-full bg-white/30" />
                </div>

                {/* Header row */}
                <div className="flex items-center justify-between z-10 pt-5 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-zinc-700 border border-zinc-600 overflow-hidden flex items-center justify-center font-black text-[9px] text-white">
                      WA
                    </div>
                    <div>
                      <div className="text-[10px] font-bold leading-none">Status Saya</div>
                      <div className="text-[8px] text-zinc-400 mt-0.5">Baru saja</div>
                    </div>
                  </div>
                  <div className="flex gap-1 text-zinc-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                  </div>
                </div>

                {/* Main content */}
                <div
                  className="absolute inset-0 flex items-center justify-center p-6 text-center select-none"
                  style={{ backgroundColor: statusType === 'text' ? selectedColor : '#000' }}
                >
                  {statusType === 'text' ? (
                    <div className="text-sm font-semibold break-words w-full leading-relaxed font-sans max-h-[60%] overflow-hidden">
                      {content || 'Tulis status di tab Buat Status...'}
                    </div>
                  ) : (
                    mediaUrl ? (
                      mediaType === 'image' ? (
                        <img src={mediaUrl} className="absolute inset-0 w-full h-full object-cover" alt="preview" />
                      ) : (
                        <video src={mediaUrl} className="absolute inset-0 w-full h-full object-cover" autoPlay muted loop />
                      )
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-500">
                        <Upload className="w-7 h-7 mb-2" />
                        <span className="text-[10px]">Upload media di tab Buat Status</span>
                      </div>
                    )
                  )}
                </div>

                {/* Caption overlay (media) */}
                {statusType === 'media' && content && (
                  <div className="absolute bottom-10 left-0 right-0 px-3 py-2 bg-black/40 backdrop-blur-sm text-center text-[9px] text-white z-10 leading-normal break-words max-h-14 overflow-hidden">
                    {content}
                  </div>
                )}

                {/* Reply footer */}
                <div className="flex flex-col items-center justify-center gap-0.5 z-10 pb-3">
                  <svg className="w-3 h-3 text-white/80 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                  </svg>
                  <span className="text-[8px] font-medium text-white/85">Balas</span>
                </div>
              </div>

              {/* Color chip / media info below phone */}
              {statusType === 'text' ? (
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400">
                  <span
                    className="w-4 h-4 rounded-full border border-white/30 shadow-sm shrink-0"
                    style={{ backgroundColor: selectedColor }}
                  />
                  <span>Background: <strong className="text-zinc-700 dark:text-zinc-300">{STATUS_COLORS.find(c => c.hex === selectedColor)?.name ?? selectedColor}</strong></span>
                </div>
              ) : mediaUrl ? (
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400">
                  {mediaType === 'video' ? <Video className="w-3.5 h-3.5 text-purple-500" /> : <Upload className="w-3.5 h-3.5 text-blue-500" />}
                  <span className="truncate max-w-[180px]">{mediaUrl.split('/').pop()}</span>
                </div>
              ) : null}
            </div>
            )} {/* end leftTab === 'preview' */}

          </div>
        </div>


        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white dark:bg-[#0c0c0e]/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-visible p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h2 className="text-sm font-extrabold text-zinc-950 dark:text-white uppercase tracking-wider">
                Jadwal & Riwayat Status
              </h2>

              {/* Search input */}
              <input
                type="text"
                placeholder="Cari status..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500 placeholder-zinc-400 max-w-[200px]"
              />
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-4">
              {(['scheduled', 'sent', 'failed', 'all'] as const).map(tabKey => (
                <button
                  key={tabKey}
                  onClick={() => setActiveTab(tabKey)}
                  className={`px-4 py-2 border-b-2 text-xs font-bold transition-all cursor-pointer ${
                    activeTab === tabKey
                      ? 'border-blue-500 text-blue-600 dark:text-blue-450'
                      : 'border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  {TAB_LABELS[tabKey]}
                </button>
              ))}
            </div>

            {/* Table wrapper with padding-bottom to allow absolute dropdowns if any (we will use inline buttons for cleaner design) */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="py-20 text-center flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                  <span className="text-xs text-zinc-500 font-bold">Memuat status broadcast...</span>
                </div>
              ) : filteredBroadcasts.length === 0 ? (
                <div className="py-16 text-center text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                  Tidak ada jadwal status yang ditemukan pada kategori ini.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Status / Media</th>
                      <th className="px-4 py-3">Tanggal Pengiriman</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                    {filteredBroadcasts.map(b => {
                      const isText = !b.media_type;
                      const colorHex = isText && b.media_url?.startsWith('#') ? b.media_url : '#075e54';
                      const deviceName = b.targets?.[0]?.channel?.name || 'Device';

                      return (
                        <tr key={b.id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/10 transition-colors">
                          <td className="px-4 py-3 max-w-[200px] sm:max-w-xs">
                            <div className="flex items-start gap-2.5">
                              {/* Small status visual indicator */}
                              {isText ? (
                                <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-[8px] font-black text-white p-1 overflow-hidden"
                                  style={{ backgroundColor: colorHex }}>
                                  TXT
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-lg shrink-0 border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-black flex items-center justify-center">
                                  {b.media_type === 'video' ? (
                                    <Video className="w-4 h-4 text-purple-400" />
                                  ) : (
                                    <img src={b.media_url || ''} className="w-full h-full object-cover" />
                                  )}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-bold text-zinc-900 dark:text-white truncate">
                                  {b.content || '—'}
                                </div>
                                <div className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium flex items-center gap-1 mt-0.5">
                                  <Smartphone className="w-2.5 h-2.5" />
                                  <span>{deviceName}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-zinc-500 dark:text-zinc-450 font-medium">
                            {b.scheduled_at ? (
                              <div className="flex items-center gap-1 text-[11px]">
                                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                                <span>{new Date(b.scheduled_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            ) : (
                              <span>Langsung Kirim</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${STATUS_STYLE[b.status] ?? 'bg-zinc-500/10 text-zinc-500'}`}>
                              {STATUS_LABEL[b.status] ?? b.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {b.status === 'scheduled' && (
                                <>
                                  <button
                                    onClick={() => handleSendNow(b)}
                                    disabled={actionId === b.id}
                                    title="Kirim Sekarang"
                                    className="p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 cursor-pointer"
                                  >
                                    {actionId === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                                  </button>
                                  <button
                                    onClick={() => handleCancel(b)}
                                    disabled={actionId === b.id}
                                    title="Batalkan Jadwal"
                                    className="p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleDelete(b)}
                                disabled={actionId === b.id}
                                title="Hapus Riwayat"
                                className="p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* CONFIRMATION MODAL */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-zinc-950/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-extrabold text-zinc-950 dark:text-white uppercase tracking-wider mb-2">
              {confirmModal.title}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5 leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                {confirmModal.cancelText}
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(prev => ({ ...prev, open: false }));
                }}
                className={`px-4 py-2 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors ${
                  confirmModal.type === 'red' 
                    ? 'bg-rose-600 hover:bg-rose-700' 
                    : 'btn-primary'
                }`}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
