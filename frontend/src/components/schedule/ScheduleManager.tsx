import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import AdminLayout from '../layout/AdminLayout';
import {
  Calendar, Clock, RefreshCw, Trash2, Play, Loader2,
  X, BarChart3, CheckCircle2, AlertCircle, XCircle,
  MessageSquare, Users, FileText, Video,
  ChevronRight, Send, Hash,
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
  scheduled: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  sent:      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  sending:   'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  queued:    'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  failed:    'bg-red-500/10 text-red-500',
  cancelled: 'bg-zinc-500/10 text-zinc-500',
  draft:     'bg-zinc-500/10 text-zinc-500',
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Terjadwal', sent: 'Terkirim', sending: 'Mengirim',
  queued: 'Antrian', failed: 'Gagal', cancelled: 'Dibatalkan', draft: 'Draft',
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
  acting,
}: {
  broadcast: Broadcast;
  onClose: () => void;
  onDelete: (b: Broadcast) => void;
  onSendNow: (b: Broadcast) => void;
  onCancel: (b: Broadcast) => void;
  acting: boolean;
}) {
  const [tab, setTab] = useState<'info' | 'log'>('info');
  const [logs, setLogs] = useState<BroadcastLog[] | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    if (tab === 'log' && logs === null) {
      setLogsLoading(true);
      api.get<BroadcastLog[]>(`/api/broadcasts/${broadcast.id}/logs`)
        .then(data => setLogs(data))
        .catch(() => setLogs([]))
        .finally(() => setLogsLoading(false));
    }
  }, [tab, broadcast.id, logs]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-zinc-950/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl dark:shadow-black/60 flex flex-col max-h-[92vh] overflow-hidden">

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/60 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                  {broadcast.title || `Broadcast #${broadcast.id}`}
                </h3>
                <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase shrink-0 ${STATUS_STYLE[broadcast.status] ?? 'bg-zinc-500/10 text-zinc-500'}`}>
                  {STATUS_LABEL[broadcast.status] ?? broadcast.status}
                </span>
                {broadcast.recurring && broadcast.recurring !== 'none' && (
                  <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[9px] font-extrabold flex items-center gap-1 uppercase shrink-0">
                    <RefreshCw className="w-2.5 h-2.5" /> {broadcast.recurring}
                  </span>
                )}
              </div>
              {/* Platform row */}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {targets.map((t, i) => t.channel && (
                  <div key={i} className="flex items-center gap-1">
                    <PlatformIcon platform={t.channel.platform} className="w-3.5 h-3.5" />
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">{t.channel.name}</span>
                  </div>
                ))}
                {targets.length === 0 && (
                  <span className="text-[10px] text-zinc-400">Tidak ada channel</span>
                )}
              </div>
            </div>
            <button onClick={onClose}
              className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-3">
            {([
              { id: 'info', label: 'Detail Broadcast', icon: FileText },
              { id: 'log',  label: 'Laporan Pengiriman', icon: Users },
            ] as const).map(t => (
              <button key={t.id} type="button" onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  tab === t.id
                    ? 'tab-active'
                    : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                }`}>
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-white dark:bg-zinc-900">

          {/* ── Info Tab ── */}
          {tab === 'info' && (
            <>
              {/* Time info row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3">
                  <div className="text-[9px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Dibuat</div>
                  <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{fmtDate(broadcast.created_at)}</div>
                </div>
                {broadcast.scheduled_at && (
                  <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-3">
                    <div className="text-[9px] font-extrabold text-blue-400 uppercase tracking-widest mb-1">Terjadwal</div>
                    <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">{fmtDate(broadcast.scheduled_at)}</div>
                  </div>
                )}
                {broadcast.sent_at && (
                  <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-3">
                    <div className="text-[9px] font-extrabold text-emerald-500 uppercase tracking-widest mb-1">Terkirim Pada</div>
                    <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{fmtDate(broadcast.sent_at)}</div>
                  </div>
                )}
              </div>

              {/* Channels */}
              <div>
                <div className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Platform Tujuan</div>
                <div className="space-y-2">
                  {targets.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic">Tidak ada channel tercatat.</p>
                  ) : targets.map((t, i) => {
                    const recps = t.recipients ?? [];
                    return (
                      <div key={i} className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {t.channel && <PlatformIcon platform={t.channel.platform} className="w-4 h-4" />}
                          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                            {t.channel?.name ?? `Channel #${t.channel_id}`}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                          {recps.length > 0 ? `${recps.length} penerima spesifik` : 'Default target'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Message content */}
              <div>
                <div className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> Konten Pesan
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed font-sans">
                  {broadcast.content}
                </div>
              </div>

              {/* Media */}
              {mediaUrls.length > 0 && (
                <div>
                  <div className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">
                    Lampiran Media ({broadcast.media_type?.toUpperCase()}) · {mediaUrls.length} file
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {mediaUrls.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noreferrer"
                        className="group relative border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center h-20 hover:border-blue-400 transition-all">
                        {broadcast.media_type === 'image' ? (
                          <img src={url} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLElement).style.display = 'none'; }} />
                        ) : broadcast.media_type === 'video' ? (
                          <Video className="w-6 h-6 text-zinc-400" />
                        ) : (
                          <FileText className="w-6 h-6 text-blue-500" />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-[9px] text-white font-bold">Buka</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Log Tab ── */}
          {tab === 'log' && (
            <>
              {/* Summary stats */}
              {logs !== null && logs.length > 0 && (
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Total', value: logTotal, cls: 'text-zinc-700 dark:text-zinc-300', bg: 'bg-zinc-50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800' },
                    { label: 'Sukses', value: logSuccess, cls: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' },
                    { label: 'Gagal',  value: logFailed,  cls: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20' },
                    { label: 'Pending', value: logPending, cls: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20' },
                  ].map(s => (
                    <div key={s.label} className={`border rounded-xl p-3 text-center ${s.bg}`}>
                      <div className={`text-xl font-extrabold ${s.cls}`}>{s.value}</div>
                      <div className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {logsLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-36 bg-zinc-200 dark:bg-zinc-800 rounded" />
                        <div className="h-2.5 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : logs === null || logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                    <Users className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Belum ada log pengiriman</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                    {broadcast.status === 'scheduled' ? 'Broadcast belum terkirim.' : 'Data log tidak tersedia.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(logsByChannel).map(([chId, chLogs]) => {
                    const ch = chLogs[0]?.channel;
                    const chSuccess = chLogs.filter(l => l.status === 'success').length;
                    const chFailed  = chLogs.filter(l => l.status === 'failed').length;
                    return (
                      <div key={chId} className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                        {/* Channel header */}
                        <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800">
                          <div className="flex items-center gap-2">
                            {ch && <PlatformIcon platform={ch.platform} className="w-4 h-4" />}
                            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{ch?.name ?? `Channel #${chId}`}</span>
                            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono">{ch?.platform}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{chSuccess} sukses</span>
                            {chFailed > 0 && <span className="font-bold text-red-500">{chFailed} gagal</span>}
                          </div>
                        </div>

                        {/* Log rows */}
                        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {chLogs.map(log => (
                            <div key={log.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-all">
                              {/* Status icon */}
                              <div className="shrink-0">
                                {log.status === 'success' ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                ) : log.status === 'failed' ? (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                ) : (
                                  <Clock className="w-4 h-4 text-yellow-500" />
                                )}
                              </div>

                              {/* Recipient */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {log.recipient_id ? (
                                    <>
                                      <Users className="w-3 h-3 text-zinc-400 shrink-0" />
                                      <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300 truncate">
                                        {fmtId(log.recipient_id, ch?.platform)}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-xs text-zinc-400 italic">Default target</span>
                                  )}
                                </div>
                                {log.error && (
                                  <p className="text-[10px] text-red-500 mt-0.5 truncate">{log.error}</p>
                                )}
                              </div>

                              {/* Sent time */}
                              {log.sent_at && (
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0 font-mono">
                                  {new Date(log.sent_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}

                              {/* Status badge */}
                              <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded shrink-0 ${
                                log.status === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                log.status === 'failed'  ? 'bg-red-500/10 text-red-500' :
                                'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                              }`}>{log.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 shrink-0 flex items-center justify-between gap-3">
          <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
            ID: #{broadcast.id} · Dibuat {fmtDate(broadcast.created_at)}
          </div>
          <div className="flex items-center gap-2">
            {acting ? (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
            ) : (
              <>
                {isScheduleable && (
                  <>
                    <button type="button" onClick={() => onSendNow(broadcast)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gradient-brand hover:opacity-95 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm">
                      <Send className="w-3.5 h-3.5" /> Kirim Sekarang
                    </button>
                    <button type="button" onClick={() => onCancel(broadcast)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold transition-all cursor-pointer border border-red-200 dark:border-red-500/20">
                      <XCircle className="w-3.5 h-3.5" /> Batalkan
                    </button>
                  </>
                )}
                {isDeletable && (
                  <button type="button" onClick={() => onDelete(broadcast)}
                    className="flex items-center gap-1.5 px-3 py-2 text-zinc-500 dark:text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl text-xs font-bold transition-all cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                  </button>
                )}
              </>
            )}
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-all cursor-pointer">
              Tutup
            </button>
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
    // Fetch full detail (includes targets with recipients + logs)
    try {
      const full = await api.get<Broadcast>(`/api/broadcasts/${b.id}`);
      setDetail(full);
    } catch {
      setDetail(b);
    }
  }

  const STAT_CARDS = [
    { label: 'Total Broadcast',  value: overview?.total_broadcasts ?? '—',     icon: BarChart3,     cls: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20' },
    { label: 'Terkirim',         value: overview?.sent_broadcasts ?? '—',       icon: CheckCircle2,  cls: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' },
    { label: 'Terjadwal',        value: overview?.scheduled_broadcasts ?? '—',  icon: Calendar,      cls: 'text-violet-600 dark:text-violet-400',  bg: 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20' },
    { label: 'Gagal',            value: overview?.failed_broadcasts ?? '—',     icon: AlertCircle,   cls: 'text-red-600 dark:text-red-400',        bg: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20' },
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
          acting={actionId === detail.id}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Jadwal Broadcast</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {loading ? 'Memuat...' : `${broadcasts.length} broadcast pada tab ini`}
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 btn-primary font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer self-start sm:self-auto">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {STAT_CARDS.map(s => (
          <div key={s.label} className={`border rounded-2xl p-4 flex items-center gap-3 ${s.bg}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white/60 dark:bg-black/20`}>
              <s.icon className={`w-5 h-5 ${s.cls}`} />
            </div>
            <div>
              <div className={`text-2xl font-extrabold ${s.cls}`}>{s.value}</div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider leading-tight">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-xl mb-6 w-max overflow-x-auto">
        {(Object.keys(TAB_LABELS) as Tab[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab
                ? 'tab-active'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}>
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* ── List ── */}
      {loading ? (
        <div className="space-y-4">
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
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-center px-4">
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center mb-3">
            <Calendar className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
          </div>
          <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Tidak ada broadcast</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">
            {activeTab === 'scheduled' ? 'Jadwalkan broadcast saat membuat pesan baru.' : 'Belum ada broadcast di kategori ini.'}
          </p>
          <a href="/broadcast" className="mt-4 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 px-4 py-2 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all">
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
                className="bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-blue-400/40 hover:shadow-md dark:hover:shadow-black/30 transition-all shadow-sm cursor-pointer group">

                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl shrink-0 ${STATUS_STYLE[b.status] ?? 'bg-zinc-500/10 text-zinc-500'}`}>
                    <Clock className="w-5 h-5" />
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                        {b.title || `Broadcast #${b.id}`}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold capitalize ${STATUS_STYLE[b.status] ?? ''}`}>
                        {STATUS_LABEL[b.status] ?? b.status}
                      </span>
                      {b.recurring && b.recurring !== 'none' && (
                        <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[9px] font-extrabold flex items-center gap-1 uppercase">
                          <RefreshCw className="w-2.5 h-2.5" /> {b.recurring}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 max-w-lg">{b.content}</p>

                    <div className="flex items-center gap-3 flex-wrap">
                      {b.scheduled_at && (
                        <div className="flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                          <Calendar className="w-3 h-3" />
                          <span className="font-semibold">{fmtDate(b.scheduled_at)}</span>
                        </div>
                      )}
                      {b.sent_at && (
                        <div className="flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                          <Clock className="w-3 h-3" />
                          <span>Terkirim:</span>
                          <span className="font-semibold">{fmtDate(b.sent_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 border-t md:border-t-0 border-zinc-100 dark:border-zinc-800/60 pt-3 md:pt-0">
                  {/* Platforms */}
                  {pts.length > 0 && (
                    <div className="flex items-center gap-1">
                      {pts.map((p, i) => p && (
                        <div key={i} title={p.platform} className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/60 px-2 py-1 rounded-lg">
                          <PlatformIcon platform={p.platform} className="w-3.5 h-3.5" />
                          <span className={`text-[9px] font-bold capitalize ${PLATFORM_COLOR[p.platform] ?? 'text-zinc-400'}`}>{p.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    {isActing ? (
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                    ) : (
                      <>
                        {(b.status === 'scheduled' || b.status === 'draft') && (
                          <>
                            <button onClick={() => handleSendNow(b)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white dark:text-blue-400 dark:hover:text-white rounded-lg text-[10px] font-bold transition-all border border-blue-500/20 cursor-pointer">
                              <Play className="w-3 h-3" /><span>Kirim Sekarang</span>
                            </button>
                            <button onClick={() => handleCancel(b)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-500/5 hover:bg-red-600 text-red-500 hover:text-white rounded-lg text-[10px] font-bold transition-all border border-red-500/10 cursor-pointer">
                              <Trash2 className="w-3 h-3" /><span>Batalkan</span>
                            </button>
                          </>
                        )}
                        {!['scheduled', 'draft', 'queued', 'sending'].includes(b.status) && (
                          <button onClick={() => handleDelete(b)}
                            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                            title="Hapus">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 group-hover:text-blue-400 transition-colors" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-zinc-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl dark:shadow-black/60 w-full max-w-sm overflow-hidden p-6 text-center animate-in zoom-in-95 duration-200">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
              confirmModal.type === 'red' ? 'bg-rose-500/10 text-rose-600' : 'bg-blue-500/10 text-blue-600'
            }`}>
              {confirmModal.type === 'red' ? <Trash2 className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-2">{confirmModal.title}</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
                className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all cursor-pointer border border-zinc-200 dark:border-zinc-800"
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
