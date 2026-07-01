import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import AdminLayout from '../layout/AdminLayout';
import {
  Calendar, Clock, RefreshCw, Trash2, Play, Loader2,
  X, BarChart3, CheckCircle2, AlertCircle, XCircle,
  MessageSquare, Users, FileText, Video,
  ChevronRight, Send, Hash, Copy, Check, Info, Layers, Smartphone, Upload, Plus, Trash, EyeOff, Search
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

// Bentuk media status. 'full' = apa adanya (cover, perilaku default WhatsApp).
type MediaShape = 'full' | 'fit' | 'square' | 'rect';
const MEDIA_SHAPES: { id: MediaShape; label: string; hint: string }[] = [
  { id: 'full',   label: 'Penuh',           hint: 'Memenuhi layar (terpotong)' },
  { id: 'fit',    label: 'Utuh',            hint: 'Seluruh gambar tampil' },
  { id: 'square', label: 'Kotak',           hint: 'Persegi 1:1 di tengah' },
  { id: 'rect',   label: 'Persegi panjang', hint: 'Potret 4:5 di tengah' },
];

// Gambar foto ke kotak target dengan mode "cover" (penuhi kotak, kelebihan dipotong).
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, dx: number, dy: number, dw: number, dh: number) {
  const ir = img.width / img.height;
  const br = dw / dh;
  let sw: number, sh: number, sx: number, sy: number;
  if (ir > br) { sh = img.height; sw = sh * br; sx = (img.width - sw) / 2; sy = 0; }
  else { sw = img.width; sh = sw / br; sx = 0; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

// Render file gambar ke kanvas 9:16 (1080x1920) sesuai bentuk pilihan, latar hitam.
// Mengembalikan Blob JPEG agar status yang TERKIRIM benar-benar berbentuk demikian.
function compositeStatusImage(file: File, shape: MediaShape, bg = '#000000'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const CW = 1080, CH = 1920;
      const canvas = document.createElement('canvas');
      canvas.width = CW; canvas.height = CH;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas tidak didukung')); return; }
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, CW, CH);

      if (shape === 'fit') {
        const ir = img.width / img.height, cr = CW / CH;
        let dw: number, dh: number;
        if (ir > cr) { dw = CW; dh = CW / ir; } else { dh = CH; dw = CH * ir; }
        ctx.drawImage(img, (CW - dw) / 2, (CH - dh) / 2, dw, dh);
      } else if (shape === 'square') {
        const box = CW;
        drawCover(ctx, img, 0, (CH - box) / 2, CW, box);
      } else if (shape === 'rect') {
        const boxH = CW * 5 / 4; // rasio 4:5
        drawCover(ctx, img, 0, (CH - boxH) / 2, CW, boxH);
      } else {
        drawCover(ctx, img, 0, 0, CW, CH); // full / cover
      }

      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Gagal memproses gambar')), 'image/jpeg', 0.92);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Gagal memuat gambar')); };
    img.src = url;
  });
}

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
  const [mediaShape, setMediaShape] = useState<MediaShape>('full');
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [sendImmediately, setSendImmediately] = useState(false);
  const [recurring, setRecurring] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');

  // Status privacy — persistent per-device blacklist ("Kontak saya, kecuali…")
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [privacyContacts, setPrivacyContacts] = useState<{ id: string; name: string }[]>([]);
  const [privacyBlacklist, setPrivacyBlacklist] = useState<Set<string>>(new Set());
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacySearch, setPrivacySearch] = useState('');

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

  // Normalise any contact id/JID/number to a digits-only key so the blacklist
  // matches regardless of stored format (matches the backend's normalisation).
  const numKey = (id: string) => (id || '').split('@')[0].split(':')[0].replace(/\D/g, '');

  const selectedChannel = channels.find(c => c.id.toString() === selectedChannelId);
  const hiddenCount = Array.isArray(selectedChannel?.status_blacklist) ? selectedChannel!.status_blacklist!.length : 0;

  const openPrivacy = async () => {
    if (!selectedChannelId) { alert('Pilih device WhatsApp terlebih dahulu!'); return; }
    setPrivacyOpen(true);
    setPrivacyLoading(true);
    setPrivacySearch('');
    const current = Array.isArray(selectedChannel?.status_blacklist) ? selectedChannel!.status_blacklist! : [];
    setPrivacyBlacklist(new Set(current.map(numKey)));
    try {
      const res = await api.get<{ contacts: { id: string; name: string }[] }>(`/api/whatsapp/${selectedChannelId}/contacts`);
      setPrivacyContacts(res.contacts || []);
    } catch (e) {
      console.error('Gagal memuat kontak untuk privasi status:', e);
      setPrivacyContacts([]);
    } finally {
      setPrivacyLoading(false);
    }
  };

  const togglePrivacyContact = (id: string) => {
    const key = numKey(id);
    if (!key) return;
    setPrivacyBlacklist(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const savePrivacy = async () => {
    if (!selectedChannelId) return;
    setPrivacySaving(true);
    try {
      const list = Array.from(privacyBlacklist).filter(Boolean);
      const updated = await api.put<Channel>(`/api/channels/${selectedChannelId}`, { status_blacklist: list });
      setChannels(prev => prev.map(c =>
        c.id.toString() === selectedChannelId ? { ...c, status_blacklist: updated.status_blacklist ?? list } : c
      ));
      setPrivacyOpen(false);
    } catch (e) {
      console.error('Gagal menyimpan privasi status:', e);
      alert('Gagal menyimpan privasi status. Coba lagi.');
    } finally {
      setPrivacySaving(false);
    }
  };

  // Upload sebuah Blob/File ke server, kembalikan URL publiknya.
  const uploadFile = async (file: Blob, filename: string): Promise<string> => {
    const token = localStorage.getItem('autoin_token');
    const formData = new FormData();
    formData.append('file', file, filename);
    const res = await fetch(`${import.meta.env.PUBLIC_API_URL ?? 'http://localhost:8001'}/api/upload`, {
      method: 'POST',
      headers: { 'Accept': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    return (await res.json()).url;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const file = files[0];
      const isVideo = file.type.startsWith('video/');
      setOriginalFile(isVideo ? null : file); // simpan file asli (gambar) utk composite
      setMediaShape('full');
      const url = await uploadFile(file, file.name);
      setMediaUrl(url);
      setMediaType(isVideo ? 'video' : 'image');
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

      // Bentuk media (selain 'full') diproses dulu dari file asli ke kanvas 9:16
      // lalu diupload, supaya status yang TERKIRIM benar-benar berbentuk pilihan.
      let finalMediaUrl = mediaUrl;
      if (statusType === 'media' && mediaType === 'image' && mediaShape !== 'full' && originalFile) {
        try {
          const blob = await compositeStatusImage(originalFile, mediaShape);
          finalMediaUrl = await uploadFile(blob, 'status.jpg');
        } catch {
          // Gagal proses -> pakai media asli (fallback aman).
          finalMediaUrl = mediaUrl;
        }
      }

      // If text status, we store the background color in media_url (prefixed with #)
      const targetMediaUrl = statusType === 'text' ? selectedColor : finalMediaUrl;
      const targetMediaType = statusType === 'text' ? null : mediaType;

      await api.post('/api/broadcasts', {
        title: statusTitle,
        content: content,
        media_url: targetMediaUrl,
        media_type: targetMediaType,
        channel_ids: [parseInt(selectedChannelId)],
        recipients: ['status@broadcast'],
        scheduled_at: scheduledAtUtc,
        recurring: sendImmediately ? 'none' : recurring,
        send_now: sendImmediately,
      });

      // Clear Form
      setContent('');
      setMediaUrl('');
      setOriginalFile(null);
      setMediaShape('full');
      setScheduledAt('');
      setSendImmediately(false);
      setRecurring('none');
      
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
    <AdminLayout activePage="schedule_status" title="Jadwal Status WA">
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

              {/* Status Privacy — persistent blacklist per device */}
              <button
                type="button"
                onClick={openPrivacy}
                className="w-full flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-blue-400 dark:hover:border-blue-500/50 transition-all cursor-pointer group"
              >
                <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-300">
                  <EyeOff className="w-3.5 h-3.5 text-blue-500" />
                  Privasi Status
                </span>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-zinc-400 group-hover:text-blue-500 transition-colors">
                  {hiddenCount > 0 ? `${hiddenCount} kontak disembunyikan` : 'Tampil ke semua kontak'}
                  <ChevronRight className="w-3 h-3" />
                </span>
              </button>

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
                          onClick={() => { setMediaUrl(''); setOriginalFile(null); setMediaShape('full'); }}
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

                  {/* Bentuk media (khusus gambar) */}
                  {mediaUrl && mediaType === 'image' && (
                    <div>
                      <label className="block text-[11px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                        Bentuk Media
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {MEDIA_SHAPES.map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setMediaShape(s.id)}
                            title={s.hint}
                            className={`flex flex-col items-center gap-1.5 px-1 py-2 rounded-xl border text-[10px] font-bold transition-all ${mediaShape === s.id
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900'}`}
                          >
                            <span className={`flex items-center justify-center w-7 h-7 rounded ${mediaShape === s.id ? 'bg-blue-500/15' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                              <span className={`bg-current rounded-[2px] ${
                                s.id === 'full' ? 'w-3.5 h-5'
                                : s.id === 'fit' ? 'w-4 h-3.5'
                                : s.id === 'square' ? 'w-4 h-4'
                                : 'w-3.5 h-4'}`} />
                            </span>
                            {s.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-1.5">
                        {MEDIA_SHAPES.find(s => s.id === mediaShape)?.hint} · area sisa diisi latar hitam.
                      </p>
                    </div>
                  )}

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
                  <div className="space-y-3">
                    {/* Waktu Pertama */}
                    <div>
                      <label className="block text-[11px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                        Waktu Pengiriman Pertama
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

                    {/* Pengulangan */}
                    <div>
                      <label className="block text-[11px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                        Pengulangan
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {([
                          { id: 'none',    label: 'Sekali',   icon: '—' },
                          { id: 'daily',   label: 'Harian',   icon: '📅' },
                          { id: 'weekly',  label: 'Mingguan', icon: '🗓️' },
                          { id: 'monthly', label: 'Bulanan',  icon: '📆' },
                        ] as const).map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setRecurring(opt.id)}
                            className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border text-[9px] font-bold transition-all cursor-pointer ${
                              recurring === opt.id
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                            }`}
                          >
                            <span className="text-sm leading-none">{opt.icon}</span>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {recurring !== 'none' && (
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1.5 flex items-center gap-1">
                          <RefreshCw className="w-3 h-3" />
                          Status akan otomatis diulang setiap{' '}
                          {recurring === 'daily' ? 'hari' : recurring === 'weekly' ? 'minggu' : 'bulan'}
                          {' '}pada jam yang sama.
                        </p>
                      )}
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
                        mediaShape === 'full' ? (
                          <img src={mediaUrl} className="absolute inset-0 w-full h-full object-cover" alt="preview" />
                        ) : mediaShape === 'fit' ? (
                          <img src={mediaUrl} className="absolute inset-0 w-full h-full object-contain" alt="preview" />
                        ) : (
                          // Kotak (1:1) / Persegi panjang (4:5): kotak di tengah, sisanya latar hitam
                          <div className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 ${mediaShape === 'square' ? 'aspect-square' : 'aspect-[4/5]'}`}>
                            <img src={mediaUrl} className="w-full h-full object-cover" alt="preview" />
                          </div>
                        )
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
                                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                  <div className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium flex items-center gap-1">
                                    <Smartphone className="w-2.5 h-2.5" />
                                    <span>{deviceName}</span>
                                  </div>
                                  {b.recurring && b.recurring !== 'none' && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20 uppercase">
                                      <RefreshCw className="w-2 h-2 animate-spin-slow" />
                                      {b.recurring === 'daily' ? 'Harian' : b.recurring === 'weekly' ? 'Mingguan' : 'Bulanan'}
                                    </span>
                                  )}
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

      {/* ── Status Privacy Modal — "Kontak saya, kecuali…" ── */}
      {privacyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-zinc-950/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-extrabold text-zinc-950 dark:text-white">
                  <EyeOff className="w-4 h-4 text-blue-500" />
                  Privasi Status
                </h3>
                <button
                  type="button"
                  onClick={() => setPrivacyOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                Kontak yang dicentang <strong>tidak akan melihat</strong> status dari device <strong>{selectedChannel?.name}</strong>. Berlaku untuk semua status berikutnya.
              </p>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                <input
                  type="text"
                  value={privacySearch}
                  onChange={e => setPrivacySearch(e.target.value)}
                  placeholder="Cari kontak…"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-center justify-between mt-2.5 text-[10px] font-semibold">
                <span className="text-zinc-400">{privacyBlacklist.size} disembunyikan</span>
                {privacyBlacklist.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setPrivacyBlacklist(new Set())}
                    className="text-rose-500 hover:text-rose-600 cursor-pointer"
                  >
                    Kosongkan
                  </button>
                )}
              </div>
            </div>

            {/* Contact list */}
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              {privacyLoading ? (
                <div className="flex items-center justify-center py-12 text-zinc-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : privacyContacts.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <Users className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Belum ada kontak tersinkron. Sync device WhatsApp dulu di menu Device.</p>
                </div>
              ) : (
                (() => {
                  const q = privacySearch.trim().toLowerCase();
                  const filtered = privacyContacts.filter(c =>
                    !q || (c.name || '').toLowerCase().includes(q) || numKey(c.id).includes(q.replace(/\D/g, ''))
                  );
                  if (filtered.length === 0) {
                    return <p className="text-center py-10 text-xs text-zinc-400">Kontak tidak ditemukan.</p>;
                  }
                  return filtered.map(c => {
                    const checked = privacyBlacklist.has(numKey(c.id));
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => togglePrivacyContact(c.id)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all cursor-pointer text-left ${
                          checked ? 'bg-blue-50 dark:bg-blue-500/10' : 'hover:bg-zinc-50 dark:hover:bg-zinc-850'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                          checked ? 'bg-blue-500 border-blue-500' : 'border-zinc-300 dark:border-zinc-600'
                        }`}>
                          {checked && <Check className="w-3 h-3 text-white" />}
                        </span>
                        <span className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase shrink-0">
                          {(c.name || c.id).charAt(0)}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{c.name || numKey(c.id)}</span>
                          <span className="block text-[10px] text-zinc-400 font-mono truncate">{numKey(c.id)}</span>
                        </span>
                      </button>
                    );
                  });
                })()
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPrivacyOpen(false)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={savePrivacy}
                disabled={privacySaving}
                className="px-4 py-2 btn-primary text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {privacySaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
