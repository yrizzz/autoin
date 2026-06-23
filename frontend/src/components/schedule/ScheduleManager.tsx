import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import AdminLayout from '../layout/AdminLayout';
import {
  Calendar, Clock, RefreshCw, Trash2, Play, Loader2,
  X, BarChart3, CheckCircle2, AlertCircle, XCircle,
  MessageSquare, Users, FileText, Video,
  ChevronRight, Send, Hash, Copy, Check, Info
} from 'lucide-react';

// ── Interfaces ────────────────────────────────────────────────────────────────

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

interface Overview {
  total_broadcasts: number;
  sent_broadcasts: number;
  failed_broadcasts: number;
  scheduled_broadcasts: number;
  total_channels: number;
  active_channels: number;
}

type Tab = 'scheduled' | 'sent' | 'failed' | 'all';

const TAB_LABELS: Record<Tab, string> = {
  scheduled: 'Mendatang',
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

const PLATFORM_COLOR: Record<string, string> = {
  whatsapp: 'text-emerald-500',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function PlatformIcon({ platform, className = 'w-4 h-4' }: { platform: string; className?: string }) {
  if (platform === 'whatsapp') return (
    <svg className={`${className} text-emerald-500`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.908.533 3.69 1.465 5.215L2 22l4.928-1.412A9.97 9.97 0 0012.004 22c5.524 0 10.004-4.48 10.004-10.004C22.008 6.48 17.528 2 12.004 2zm0 18.008c-1.67 0-3.238-.456-4.6-1.25L4.4 19.6l.858-2.928a8.004 8.004 0 116.746 3.336zM15.908 13.4c-.22-.11-1.3-.642-1.503-.715-.2-.074-.347-.11-.495.11-.147.22-.57.715-.7.863-.128.147-.257.165-.477.055a6.002 6.002 0 01-1.77-1.093c-.633-.564-1.062-1.26-1.186-1.48-.124-.22-.013-.34.097-.45.1-.1.22-.257.33-.385.11-.128.147-.22.22-.367.073-.147.037-.275-.018-.385-.055-.11-.495-1.193-.68-1.637-.18-.433-.36-.374-.495-.38l-.42-.008c-.147 0-.386.055-.588.275-.2.22-.77.752-.77 1.834 0 1.082.788 2.128.9 2.275.11.147 1.55 2.365 3.755 3.318.524.226.934.362 1.254.464.526.167 1.004.143 1.382.087.42-.062 1.3-.532 1.485-1.046.183-.513.183-.953.128-1.046-.055-.093-.202-.147-.422-.257z" />
    </svg>
  );
  return null;
}

function fmtId(id: string | null, platform?: string): string {
  if (!id) return '—';
  if (platform === 'whatsapp') return `+${id.split('@')[0]}`;
  if (id.length > 20) return id.slice(0, 18) + '…';
  return id;
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ── Detail Modal ──────────────────────────────────────────────────────────────

function DetailModal({
  broadcast,
  onClose,
  onDelete,
  onSendNow,
  onCancel,
  onUpdate,
  onSaveSuccess,
  acting,
}: {
  broadcast: Broadcast;
  onClose: () => void;
  onDelete: (b: Broadcast) => void;
  onSendNow: (b: Broadcast) => void;
  onCancel: (b: Broadcast) => void;
  onUpdate: () => Promise<void>;
  onSaveSuccess: (b: Broadcast) => void;
  acting: boolean;
}) {
  const [tab, setTab] = useState<'info' | 'log'>('info');
  const [logs, setLogs] = useState<BroadcastLog[] | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);

  // Edit States
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(broadcast.title || '');
  const [editContent, setEditContent] = useState(broadcast.content || '');
  const [editScheduledAt, setEditScheduledAt] = useState('');
  const [editRecurring, setEditRecurring] = useState(broadcast.recurring || 'none');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatForInput = (d: string | null): string => {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
    return adjustedDate.toISOString().slice(0, 16);
  };

  useEffect(() => {
    setEditTitle(broadcast.title || '');
    setEditContent(broadcast.content || '');
    setEditScheduledAt(formatForInput(broadcast.scheduled_at));
    setEditRecurring(broadcast.recurring || 'none');
  }, [broadcast, isEditing]);

  useEffect(() => {
    if (tab === 'log' && logs === null) {
      setLogsLoading(true);
      api.get<BroadcastLog[]>(`/api/broadcasts/${broadcast.id}/logs`)
        .then(data => setLogs(data))
        .catch(() => setLogs([]))
        .finally(() => setLogsLoading(false));
    }
  }, [tab, broadcast.id, logs]);

  const handleSaveEdit = async () => {
    if (!editContent.trim()) {
      alert('Isi pesan tidak boleh kosong!');
      return;
    }
    setSaving(true);
    try {
      const scheduledAtUtc = editScheduledAt && !isNaN(new Date(editScheduledAt).getTime())
        ? new Date(editScheduledAt).toISOString()
        : null;

      const updated = await api.put<Broadcast>(`/api/broadcasts/${broadcast.id}`, {
        title: editTitle || null,
        content: editContent,
        scheduled_at: scheduledAtUtc,
        recurring: scheduledAtUtc ? editRecurring : 'none',
      });
      setIsEditing(false);
      await onUpdate();
      onSaveSuccess(updated);
    } catch (e: any) {
      alert(e.message ?? 'Gagal menyimpan perubahan.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(broadcast.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const logSuccess = (logs ?? []).filter(l => l.status === 'success').length;
  const logFailed  = (logs ?? []).filter(l => l.status === 'failed').length;
  const logPending = (logs ?? []).filter(l => l.status === 'pending').length;
  const logTotal   = (logs ?? []).length;

  const targets = broadcast.targets ?? [];
  const isScheduleable = broadcast.status === 'scheduled' || broadcast.status === 'draft';
  const isDeletable = !['scheduled', 'draft', 'queued', 'sending'].includes(broadcast.status);

  const mediaUrls: string[] = (() => {
    if (!broadcast.media_url) return [];
    try { return JSON.parse(broadcast.media_url); } catch { return [broadcast.media_url]; }
  })();

  // Group logs by channel
  const logsByChannel = (logs ?? []).reduce<Record<number, BroadcastLog[]>>((acc, log) => {
    const key = log.channel_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-zinc-950/80 backdrop-blur-md transition-opacity duration-300">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl sm:rounded-3xl w-full max-w-2xl shadow-2xl dark:shadow-black/70 flex flex-col max-h-[90vh] overflow-hidden transform scale-100 transition-all duration-300">
        
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-zinc-950 dark:text-white tracking-tight uppercase">
                    Edit Broadcast
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Ubah judul, isi pesan, dan jadwal broadcast Anda.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-extrabold text-zinc-950 dark:text-white truncate max-w-[240px] sm:max-w-md">
                      {broadcast.title || `Broadcast #${broadcast.id}`}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${STATUS_STYLE[broadcast.status] ?? 'bg-zinc-500/10 text-zinc-500'}`}>
                      {STATUS_LABEL[broadcast.status] ?? broadcast.status}
                    </span>
                    {broadcast.recurring && broadcast.recurring !== 'none' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-[10px] font-bold flex items-center gap-1 uppercase shrink-0 border border-purple-500/20">
                        <RefreshCw className="w-2.5 h-2.5" /> {broadcast.recurring}
                      </span>
                    )}
                  </div>
                  {/* Platform tags */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    {targets.map((t, i) => t.channel && (
                      <div key={i} className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-lg border border-zinc-200/50 dark:border-zinc-700/50">
                        <PlatformIcon platform={t.channel.platform} className="w-3 h-3" />
                        <span className="text-[10px] text-zinc-600 dark:text-zinc-300 font-bold">{t.channel.name}</span>
                      </div>
                    ))}
                    {targets.length === 0 && (
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 italic">Tidak ada platform tujuan</span>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/60 rounded-xl transition-all cursor-pointer shrink-0">
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Sub Navigation Tabs */}
          {!isEditing && (
            <div className="flex items-center gap-1 mt-4">
              {([
                { id: 'info', label: 'Detail Broadcast', icon: FileText },
                { id: 'log',  label: 'Laporan Pengiriman', icon: Users },
              ] as const).map(t => (
                <button key={t.id} type="button" onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                    tab === t.id
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                      : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/60 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}>
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 bg-white dark:bg-zinc-900 custom-scrollbar">
          {isEditing ? (
            <div className="space-y-4">
              {/* Title input */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Judul Broadcast</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-sm"
                  placeholder="Masukkan judul broadcast (opsional)..."
                  disabled={saving}
                />
              </div>

              {/* Content input */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Isi Pesan</label>
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={6}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all resize-none leading-relaxed shadow-sm font-sans"
                  placeholder="Ketik pesan Anda..."
                  disabled={saving}
                />
                <div className="flex justify-between items-center text-[10px] text-zinc-400 dark:text-zinc-500 px-1">
                  <span>Gunakan template tag <code>{`{{nama}}`}</code> untuk nama penerima.</span>
                  <span>{editContent.length} karakter</span>
                </div>
              </div>

              {/* Scheduled At & Recurring fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Waktu Kirim (Kosong = Instan/Draft)</label>
                  <input
                    type="datetime-local"
                    value={editScheduledAt}
                    onChange={e => setEditScheduledAt(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-sm"
                    disabled={saving}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Pola Pengulangan</label>
                  <select
                    value={editRecurring}
                    onChange={e => setEditRecurring(e.target.value)}
                    disabled={!editScheduledAt || saving}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50 cursor-pointer transition-all shadow-sm"
                  >
                    <option value="none">Satu Kali (Sekali Kirim)</option>
                    <option value="daily">Setiap Hari</option>
                    <option value="weekly">Setiap Minggu</option>
                    <option value="monthly">Setiap Bulan</option>
                  </select>
                </div>
              </div>
            </div>
          ) : tab === 'info' ? (
            <div className="space-y-5">
              {/* Date details row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800 rounded-xl p-3">
                  <div className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-400" /> Dibuat
                  </div>
                  <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{fmtDate(broadcast.created_at)}</div>
                </div>
                {broadcast.scheduled_at && (
                  <div className="bg-blue-50/50 dark:bg-blue-500/5 border border-blue-200/50 dark:border-blue-500/10 rounded-xl p-3">
                    <div className="text-[9px] font-bold text-blue-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Terjadwal
                    </div>
                    <div className="text-xs font-bold text-blue-600 dark:text-blue-400">{fmtDate(broadcast.scheduled_at)}</div>
                  </div>
                )}
                {broadcast.sent_at && (
                  <div className="bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-200/50 dark:border-emerald-500/10 rounded-xl p-3 col-span-1 sm:col-span-2 md:col-span-1">
                    <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Terkirim Pada
                    </div>
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{fmtDate(broadcast.sent_at)}</div>
                  </div>
                )}
              </div>

              {/* Target Platforms list */}
              <div>
                <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Platform & Saluran Tujuan</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {targets.length === 0 ? (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 italic px-1 col-span-2">Tidak ada channel tujuan tercatat.</p>
                  ) : targets.map((t, i) => {
                    const recps = t.recipients ?? [];
                    return (
                      <div key={i} className="flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-950/30 border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl px-3.5 py-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          {t.channel && <PlatformIcon platform={t.channel.platform} className="w-4 h-4 shrink-0" />}
                          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                            {t.channel?.name ?? `Saluran #${t.channel_id}`}
                          </span>
                        </div>
                        <span className="text-[10px] bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold px-2 py-0.5 rounded-full shrink-0">
                          {recps.length > 0 ? `${recps.length} Penerima` : 'Semua Kontak'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Message content with Copy button */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" /> Konten Pesan
                  </div>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-zinc-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500 animate-in zoom-in" />
                        <span className="text-emerald-500">Disalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Salin Pesan</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-4 text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed font-sans shadow-inner">
                  {broadcast.content}
                </div>
              </div>

              {/* Media Attachments */}
              {mediaUrls.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2.5">
                    Lampiran Media ({broadcast.media_type?.toUpperCase()}) · {mediaUrls.length} file
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {mediaUrls.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noreferrer"
                        className="group relative border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center h-24 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md transition-all">
                        {broadcast.media_type === 'image' ? (
                          <img src={url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={e => { (e.target as HTMLElement).style.display = 'none'; }} />
                        ) : broadcast.media_type === 'video' ? (
                          <Video className="w-6 h-6 text-zinc-400" />
                        ) : (
                          <FileText className="w-6 h-6 text-blue-500" />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                          <span className="text-[10px] text-white font-bold bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">Buka File</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Log Tab Content */
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Summary Stats Cards */}
              {logs !== null && logs.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total', value: logTotal, color: 'text-zinc-800 dark:text-zinc-100', bg: 'bg-zinc-50 dark:bg-zinc-950/40 border-zinc-200/80 dark:border-zinc-800/80' },
                    { label: 'Sukses', value: logSuccess, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50/30 dark:bg-emerald-500/5 border-emerald-200/50 dark:border-emerald-500/10' },
                    { label: 'Gagal',  value: logFailed,  color: 'text-rose-500', bg: 'bg-rose-50/30 dark:bg-rose-500/5 border-rose-200/50 dark:border-rose-500/10' },
                    { label: 'Pending', value: logPending, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50/30 dark:bg-amber-500/5 border-amber-200/50 dark:border-amber-500/10' },
                  ].map(s => (
                    <div key={s.label} className={`border rounded-2xl p-3 flex flex-col items-center justify-center text-center ${s.bg}`}>
                      <div className={`text-xl font-extrabold tracking-tight ${s.color}`}>{s.value}</div>
                      <div className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {logsLoading ? (
                /* Loading State Skeleton */
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-800 animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-40 bg-zinc-200 dark:bg-zinc-800 rounded" />
                        <div className="h-2.5 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : logs === null || logs.length === 0 ? (
                /* Empty Log */
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 rounded-full bg-zinc-50 dark:bg-zinc-850 flex items-center justify-center mb-3">
                    <Users className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                  </div>
                  <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Belum Ada Log Pengiriman</p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                    {broadcast.status === 'scheduled' ? 'Laporan detail akan tampil saat broadcast sudah dikirim.' : 'Detail pengiriman tidak ditemukan.'}
                  </p>
                </div>
              ) : (
                /* Log List by Channel */
                <div className="space-y-4">
                  {Object.entries(logsByChannel).map(([chId, chLogs]) => {
                    const ch = chLogs[0]?.channel;
                    const chSuccess = chLogs.filter(l => l.status === 'success').length;
                    const chFailed  = chLogs.filter(l => l.status === 'failed').length;
                    return (
                      <div key={chId} className="border border-zinc-200 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-sm">
                        {/* Channel Subheader */}
                        <div className="flex items-center justify-between px-3.5 py-2.5 bg-zinc-50/80 dark:bg-zinc-950/60 border-b border-zinc-200/80 dark:border-zinc-800">
                          <div className="flex items-center gap-2 min-w-0">
                            {ch && <PlatformIcon platform={ch.platform} className="w-4 h-4 shrink-0" />}
                            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{ch?.name ?? `Saluran #${chId}`}</span>
                            <span className="text-[9px] bg-zinc-200 dark:bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded font-bold uppercase">{ch?.platform}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold">
                            <span className="text-emerald-600 dark:text-emerald-400">{chSuccess} Sukses</span>
                            {chFailed > 0 && <span className="text-rose-500">{chFailed} Gagal</span>}
                          </div>
                        </div>

                        {/* Log Rows */}
                        <div className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                          {chLogs.map(log => (
                            <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                              <div className="flex items-start gap-2.5 min-w-0">
                                <div className="shrink-0 mt-0.5">
                                  {log.status === 'success' ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  ) : log.status === 'failed' ? (
                                    <XCircle className="w-4 h-4 text-rose-500" />
                                  ) : (
                                    <Clock className="w-4 h-4 text-amber-500" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  {log.recipient_id ? (
                                    <span className="text-xs text-zinc-850 dark:text-zinc-150 font-bold block">
                                      {log.recipient_name ? `${log.recipient_name} (${fmtId(log.recipient_id, ch?.platform)})` : fmtId(log.recipient_id, ch?.platform)}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-zinc-400 dark:text-zinc-500 italic block">Penerima default</span>
                                  )}
                                  {log.error && (
                                    <span className="text-[10px] text-rose-500 mt-0.5 block max-w-sm sm:max-w-md break-words font-medium">
                                      Error: {log.error}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-2.5 self-stretch sm:self-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
                                {log.sent_at && (
                                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                                    {new Date(log.sent_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                                  </span>
                                )}
                                <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full shrink-0 border ${
                                  log.status === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10' :
                                  log.status === 'failed'  ? 'bg-rose-500/10 text-rose-500 border-rose-500/10' :
                                  'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/10'
                                }`}>{log.status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-zinc-150 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold text-center sm:text-left">
            ID: #{broadcast.id} · Dibuat {fmtDate(broadcast.created_at)}
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
            {isEditing ? (
              <>
                <button type="button" onClick={() => setIsEditing(false)} disabled={saving}
                  className="px-4 py-2 text-xs font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl transition-all cursor-pointer disabled:opacity-50 flex-1 sm:flex-initial text-center">
                  Batal
                </button>
                <button type="button" onClick={handleSaveEdit} disabled={saving}
                  className="flex items-center justify-center gap-1.5 px-5 py-2 bg-gradient-brand hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 flex-1 sm:flex-initial">
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan...
                    </>
                  ) : (
                    'Simpan Jadwal'
                  )}
                </button>
              </>
            ) : (
              <>
                {acting ? (
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                ) : (
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {/* Add Edit button if broadcast is editable */}
                    {['scheduled', 'draft', 'cancelled', 'failed'].includes(broadcast.status) && (
                      <button type="button" onClick={() => setIsEditing(true)}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-4 py-2 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold transition-all cursor-pointer border border-blue-200 dark:border-blue-500/20">
                        Edit Jadwal
                      </button>
                    )}
                    {isScheduleable && (
                      <>
                        <button type="button" onClick={() => onSendNow(broadcast)}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-brand hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 hover:shadow-lg transition-all cursor-pointer">
                          <Send className="w-3.5 h-3.5" /> Kirim Sekarang
                        </button>
                        <button type="button" onClick={() => onCancel(broadcast)}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-4 py-2 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-all cursor-pointer border border-rose-200/20 dark:border-rose-500/20">
                          Batalkan
                        </button>
                      </>
                    )}
                    {isDeletable && (
                      <button type="button" onClick={() => onDelete(broadcast)}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl text-xs font-bold transition-all cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" /> Hapus
                      </button>
                    )}
                  </div>
                )}
                <button type="button" onClick={onClose}
                  className="px-5 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl transition-all cursor-pointer w-full sm:w-auto text-center border border-zinc-200/50 dark:border-zinc-700/50 mt-1 sm:mt-0">
                  Tutup
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ScheduleManager() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading]       = useState(true);
  const [actionId, setActionId]     = useState<number | null>(null);
  const [activeTab, setActiveTab]   = useState<Tab>('scheduled');
  const [detail, setDetail]         = useState<Broadcast | null>(null);
  const [overview, setOverview]     = useState<Overview | null>(null);

  // Custom action confirmation modal states
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: React.ReactNode;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
    type: 'blue' | 'red';
  }>({
    open: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    onConfirm: () => {},
    type: 'blue',
  });

  function triggerConfirm({
    title,
    message,
    confirmText,
    cancelText,
    onConfirm,
    type,
  }: {
    title: string;
    message: React.ReactNode;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
    type: 'blue' | 'red';
  }) {
    setConfirmModal({
      open: true,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, open: false }));
      },
      type,
    });
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = activeTab !== 'all' ? `?status=${activeTab}` : '';
      const [res, ov] = await Promise.all([
        api.get<Paginated<Broadcast>>(`/api/broadcasts${params}`),
        overview === null ? api.get<Overview>('/api/analytics/overview').catch(() => null) : Promise.resolve(null),
      ]);
      setBroadcasts(res.data ?? []);
      if (ov) setOverview(ov);
    } catch {
      setBroadcasts([]);
    }
    setLoading(false);
  }, [activeTab]);

  useEffect(() => { load(); }, [load]);

  async function handleSendNow(b: Broadcast) {
    triggerConfirm({
      title: 'Kirim Broadcast Sekarang',
      message: (
        <>
          Apakah Anda yakin ingin mengirim broadcast <strong>"{b.title || `Broadcast #${b.id}`}"</strong> sekarang? Pesan akan langsung dimasukkan ke dalam antrean pengiriman.
        </>
      ),
      confirmText: 'Kirim Sekarang',
      cancelText: 'Batal',
      type: 'blue',
      onConfirm: async () => {
        setActionId(b.id);
        try {
          await api.post(`/api/broadcasts/${b.id}/send`);
          await load();
          setDetail(null);
        } catch (e: any) {
          alert(e.message ?? 'Gagal mengirim.');
        }
        setActionId(null);
      }
    });
  }

  async function handleCancel(b: Broadcast) {
    triggerConfirm({
      title: 'Batalkan Jadwal Broadcast',
      message: (
        <>
          Apakah Anda yakin ingin membatalkan jadwal broadcast <strong>"{b.title || `Broadcast #${b.id}`}"</strong>? Status broadcast akan diubah menjadi dibatalkan.
        </>
      ),
      confirmText: 'Batalkan',
      cancelText: 'Batal',
      type: 'red',
      onConfirm: async () => {
        setActionId(b.id);
        try {
          await api.post(`/api/broadcasts/${b.id}/cancel`);
          await load();
          setDetail(null);
        } catch (e: any) {
          alert(e.message ?? 'Gagal membatalkan.');
        }
        setActionId(null);
      }
    });
  }

  async function handleDelete(b: Broadcast) {
    triggerConfirm({
      title: 'Hapus Riwayat Broadcast',
      message: (
        <>
          Apakah Anda yakin ingin menghapus broadcast <strong>"{b.title || `Broadcast #${b.id}`}"</strong> dari riwayat? Tindakan ini tidak dapat dibatalkan.
        </>
      ),
      confirmText: 'Hapus',
      cancelText: 'Batal',
      type: 'red',
      onConfirm: async () => {
        setActionId(b.id);
        try {
          await api.delete(`/api/broadcasts/${b.id}`);
          await load();
          setDetail(null);
        } catch (e: any) {
          alert(e.message ?? 'Gagal menghapus.');
        }
        setActionId(null);
      }
    });
  }

  async function openDetail(b: Broadcast) {
    try {
      const full = await api.get<Broadcast>(`/api/broadcasts/${b.id}`);
      setDetail(full);
    } catch {
      setDetail(b);
    }
  }

  const STAT_CARDS = [
    { label: 'Total Broadcast',  value: overview?.total_broadcasts ?? '—',     icon: BarChart3,     cls: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50/50 dark:bg-blue-500/5 border-blue-200/50 dark:border-blue-500/10' },
    { label: 'Terkirim',         value: overview?.sent_broadcasts ?? '—',       icon: CheckCircle2,  cls: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-200/50 dark:border-emerald-500/10' },
    { label: 'Mendatang',        value: overview?.scheduled_broadcasts ?? '—',  icon: Calendar,      cls: 'text-violet-600 dark:text-violet-400',  bg: 'bg-violet-50/50 dark:bg-violet-500/5 border-violet-200/50 dark:border-violet-500/10' },
    { label: 'Gagal',            value: overview?.failed_broadcasts ?? '—',     icon: AlertCircle,   cls: 'text-rose-600 dark:text-rose-400',        bg: 'bg-rose-50/50 dark:bg-rose-500/5 border-rose-200/50 dark:border-rose-500/10' },
  ];

  return (
    <AdminLayout activePage="schedule" title="Jadwal Broadcast">
      {detail && (
        <DetailModal
          broadcast={detail}
          onClose={() => setDetail(null)}
          onDelete={b => handleDelete(b)}
          onSendNow={b => handleSendNow(b)}
          onCancel={b => handleCancel(b)}
          onUpdate={load}
          onSaveSuccess={full => setDetail(full)}
          acting={actionId === detail.id}
        />
      )}

      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-950 dark:text-white tracking-tight">Jadwal Broadcast</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {loading ? 'Memuat data...' : `${broadcasts.length} broadcast ditemukan pada tab ini`}
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer self-start sm:self-auto">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Stats Cards Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {STAT_CARDS.map(s => (
          <div key={s.label} className={`border border-zinc-200/60 dark:border-zinc-800 rounded-2xl p-4 flex items-center gap-3 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 ${s.bg}`}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200/30 dark:border-zinc-800">
              <s.icon className={`w-5 h-5 ${s.cls}`} />
            </div>
            <div>
              <div className={`text-xl sm:text-2xl font-extrabold tracking-tight ${s.cls}`}>{s.value}</div>
              <div className="text-[9px] sm:text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider leading-tight">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-xl mb-6 w-full sm:w-max overflow-x-auto no-scrollbar">
        {(Object.keys(TAB_LABELS) as Tab[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 sm:flex-none px-4.5 py-2 rounded-lg text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm border border-zinc-200/20 dark:border-zinc-700/20'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}>
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* ── Broadcast Cards List ── */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 animate-pulse">
              <div className="flex gap-4">
                <div className="w-11 h-11 rounded-xl bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-40 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-2.5 w-64 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-2 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl text-center px-4">
          <div className="w-12 h-12 rounded-full bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center mb-3">
            <Calendar className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
          </div>
          <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Tidak ada broadcast</h3>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-xs">
            {activeTab === 'scheduled' ? 'Jadwalkan broadcast saat membuat pesan baru.' : 'Belum ada broadcast di kategori ini.'}
          </p>
          <a href="/broadcast" className="mt-4 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 px-4.5 py-2 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all">
            + Buat Broadcast
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {broadcasts.map(b => {
            const isActing = actionId === b.id;
            const pts = (b.targets ?? []).map(t => t.channel).filter(Boolean);

            return (
              <div key={b.id}
                onClick={() => openDetail(b)}
                className="bg-white dark:bg-[#0e0e11] border border-zinc-200/70 dark:border-zinc-800/80 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-blue-400/40 hover:shadow-md dark:hover:shadow-black/35 hover:-translate-y-0.5 transition-all duration-300 shadow-sm cursor-pointer group">

                <div className="flex items-start gap-3.5 min-w-0">
                  <div className={`p-3 rounded-xl shrink-0 ${STATUS_STYLE[b.status] ?? 'bg-zinc-500/10 text-zinc-500'}`}>
                    <Clock className="w-5 h-5" />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-extrabold text-zinc-850 dark:text-zinc-150 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate max-w-[200px] sm:max-w-md">
                        {b.title || `Broadcast #${b.id}`}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${STATUS_STYLE[b.status] ?? ''}`}>
                        {STATUS_LABEL[b.status] ?? b.status}
                      </span>
                      {b.recurring && b.recurring !== 'none' && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[9px] font-extrabold flex items-center gap-0.5 uppercase border border-purple-500/10">
                          <RefreshCw className="w-2.5 h-2.5" /> {b.recurring}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 pr-4">{b.content}</p>

                    <div className="flex items-center gap-3.5 flex-wrap pt-0.5">
                      {b.scheduled_at && (
                        <div className="flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{fmtDate(b.scheduled_at)}</span>
                        </div>
                      )}
                      {b.sent_at && (
                        <div className="flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                          <Clock className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Terkirim:</span>
                          <span className="font-bold">{fmtDate(b.sent_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 border-t md:border-t-0 border-zinc-100 dark:border-zinc-800/60 pt-3 md:pt-0">
                  {/* Platforms */}
                  {pts.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {pts.map((p, i) => p && (
                        <div key={i} title={p.platform} className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-850 px-2.5 py-1 rounded-lg border border-zinc-200/50 dark:border-zinc-800">
                          <PlatformIcon platform={p.platform} className="w-3.5 h-3.5" />
                          <span className={`text-[9px] font-extrabold capitalize ${PLATFORM_COLOR[p.platform] ?? 'text-zinc-500'}`}>{p.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    {isActing ? (
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                    ) : (
                      <>
                        {(b.status === 'scheduled' || b.status === 'draft') && (
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => handleSendNow(b)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white dark:text-blue-400 dark:hover:text-white rounded-xl text-[10px] font-bold transition-all border border-blue-500/20 cursor-pointer shadow-sm">
                              <Play className="w-3 h-3" /><span>Kirim</span>
                            </button>
                            <button onClick={() => handleCancel(b)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-rose-600/10 hover:bg-rose-600 text-rose-600 hover:text-white dark:text-rose-400 dark:hover:text-white rounded-xl text-[10px] font-bold transition-all border border-rose-500/20 cursor-pointer shadow-sm">
                              <X className="w-3 h-3" /><span>Batalkan</span>
                            </button>
                          </div>
                        )}
                        {!['scheduled', 'draft', 'queued', 'sending'].includes(b.status) && (
                          <button onClick={() => handleDelete(b)}
                            className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                            title="Hapus">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <div className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                          <ChevronRight className="w-4.5 h-4.5 text-zinc-300 dark:text-zinc-600 group-hover:text-blue-500 transition-colors" />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-zinc-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl dark:shadow-black/70 w-full max-w-sm overflow-hidden p-6 text-center animate-in zoom-in-95 duration-200">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
              confirmModal.type === 'red' ? 'bg-rose-500/10 text-rose-600' : 'bg-blue-500/10 text-blue-600'
            }`}>
              {confirmModal.type === 'red' ? <Trash2 className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-zinc-950 dark:text-white mb-2">{confirmModal.title}</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
                className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all cursor-pointer border border-zinc-200 dark:border-zinc-850"
              >
                {confirmModal.cancelText}
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`flex-1 py-2.5 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer ${
                  confirmModal.type === 'red'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/10'
                    : 'bg-gradient-brand hover:opacity-95 shadow-blue-500/10'
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
