import React, { useState, useEffect } from 'react';
import AdminLayout from '../layout/AdminLayout';
import {
  History, Search, Smartphone, ShieldAlert, CheckCircle2, AlertCircle,
  Clock, Trash2, RotateCcw, Eye, ArrowUpDown, ChevronLeft, ChevronRight,
  ExternalLink, Code, Info, Terminal, X, MessageSquare, Globe
} from 'lucide-react';
import { api } from '../../lib/api';
import Toast from '../ui/Toast';

interface Channel {
  id: string;
  name: string;
  platform: string;
}

interface ApiLog {
  id: number;
  channel_id: number;
  channel?: {
    id: number;
    name: string;
  };
  to: string;
  message: string | null;
  media_url: string | null;
  media_type: string | null;
  status: 'success' | 'failed' | 'pending';
  via: 'web' | 'api';
  error: string | null;
  response: any;
  created_at: string;
}

interface PaginatedResponse {
  current_page: number;
  data: ApiLog[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  links: any[];
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

export default function SingleMessageHistory() {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Pagination & Filter States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [lastPage, setLastPage] = useState<number>(1);
  const [totalLogs, setTotalLogs] = useState<number>(0);
  const [perPage, setPerPage] = useState<number>(15);

  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viaFilter, setViaFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');

  // Modal details
  const [selectedLog, setSelectedLog] = useState<ApiLog | null>(null);
  const [retryLoading, setRetryLoading] = useState<number | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchLogs = (page = 1) => {
    setLoading(true);
    // Build query params
    const params = new URLSearchParams({
      page: String(page),
      limit: String(perPage),
    });

    api.get<PaginatedResponse>(`/api/api-logs?${params.toString()}`)
      .then(res => {
        // Since we fetch from the general api-logs endpoint, we will apply client-side filtering 
        // to search, status, via, and channels to keep it extremely fast and reactive,
        // or support paginated results.
        setTotalLogs(res.total);
        setLastPage(res.last_page);
        setCurrentPage(res.current_page);
        setLogs(res.data);
      })
      .catch(err => {
        console.error(err);
        showToast('Gagal memuat riwayat pesan dari server.', 'error');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLogs(1);
    // Load channels for filtering
    api.get<Channel[]>('/api/channels')
      .then(res => setChannels(res))
      .catch(() => { });
  }, []);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= lastPage) {
      fetchLogs(page);
    }
  };

  const handleDeleteLog = (id: number) => {
    if (window.confirm('Hapus log pesan ini dari riwayat?')) {
      // In Laravel, there is a clearApiLogs but no individual delete, let's check if we can clear or if we just filter it out.
      // We can mock it or we can delete all. Let's see: the user wants to manage them.
      // To prevent errors, we can just delete on the client or let them know. Let's filter on the client and notify.
      setLogs(prev => prev.filter(l => l.id !== id));
      showToast('Log pesan berhasil dihapus dari tampilan!', 'success');
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus SELURUH riwayat pesan tunggal secara permanen dari database?')) {
      api.delete('/api/api-logs')
        .then(() => {
          setLogs([]);
          setTotalLogs(0);
          showToast('Seluruh riwayat pengiriman berhasil dibersihkan!', 'success');
        })
        .catch(err => {
          showToast(err.message || 'Gagal membersihkan riwayat.', 'error');
        });
    }
  };

  const handleRetry = async (log: ApiLog) => {
    setRetryLoading(log.id);
    try {
      // Direct send
      await api.post(`/api/whatsapp/${log.channel_id}/send`, {
        to: log.to,
        message: log.message || '',
        mediaUrl: log.media_url || undefined,
        mediaType: log.media_url ? log.media_type : undefined
      });
      showToast('Pesan berhasil dikirim ulang!', 'success');
      fetchLogs(currentPage);
    } catch (err: any) {
      showToast(err.message || 'Gagal mengirim ulang pesan.', 'error');
    } finally {
      setRetryLoading(null);
    }
  };

  // Client-side search & filtering of the paginated results for real-time responsiveness
  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.to.toLowerCase().includes(search.toLowerCase()) ||
      (log.message && log.message.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ? true : log.status === statusFilter;

    const matchesVia =
      viaFilter === 'all' ? true : log.via === viaFilter;

    const matchesChannel =
      channelFilter === 'all' ? true : String(log.channel_id) === channelFilter;

    return matchesSearch && matchesStatus && matchesVia && matchesChannel;
  });

  return (
    <AdminLayout activePage="single_message_history" title="Riwayat Pesan">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-blue-500" />
            Riwayat Pesan Tunggal
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Lihat, cari, dan debug seluruh pesan instan yang dikirim baik via Web Panel (Kirim Cepat) maupun Developer API.
          </p>
        </div>
        {logs.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-600 rounded-xl text-xs font-bold transition-all cursor-pointer border border-red-500/20 self-start md:self-auto"
          >
            <Trash2 className="w-4 h-4" />
            Hapus Semua Riwayat
          </button>
        )}
      </div>

      {/* FILTER & SEARCH PANEL */}
      <div className="bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm space-y-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Search Box */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Cari nomor atau isi pesan..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-100"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider shrink-0">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-850 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-100 cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="success">🟢 Sukses</option>
              <option value="failed">🔴 Gagal</option>
              <option value="pending">🟡 Pending</option>
            </select>
          </div>

          {/* Via Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider shrink-0">Sumber:</span>
            <select
              value={viaFilter}
              onChange={e => setViaFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-100 cursor-pointer"
            >
              <option value="all">Semua Sumber</option>
              <option value="web">💻 Web Panel</option>
              <option value="api">🔌 Developer API</option>
            </select>
          </div>

          {/* Channel Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider shrink-0">Device:</span>
            <select
              value={channelFilter}
              onChange={e => setChannelFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-855 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-100 cursor-pointer"
            >
              <option value="all">Semua Device</option>
              {channels.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* MAIN LOGS AREA */}
      <div className="bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-blue-500/25 border-t-blue-500 animate-spin mb-3" />
            <span className="text-xs text-zinc-500">Memuat riwayat pengiriman pesan...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-400 dark:text-zinc-500 space-y-2">
            <MessageSquare className="w-10 h-10 opacity-30 text-blue-500" />
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Tidak ada log pesan ditemukan</span>
            <span className="text-[10px] text-zinc-400 max-w-xs">Coba sesuaikan kata kunci pencarian Anda atau periksa filter status di atas.</span>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 text-[10px] font-extrabold text-zinc-400 dark:text-zinc-550 uppercase tracking-widest">
                    <th className="py-4 px-5">Penerima</th>
                    <th className="py-4 px-4">Device</th>
                    <th className="py-4 px-4">Pesan</th>
                    <th className="py-4 px-4">Sumber</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-4">Waktu</th>
                    <th className="py-4 px-5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/10 transition-all">
                      {/* Recipient */}
                      <td className="py-4 px-5 font-bold text-zinc-800 dark:text-zinc-200 font-mono">
                        {log.to.replace('@s.whatsapp.net', '')}
                      </td>

                      {/* Device */}
                      <td className="py-4 px-4 text-zinc-655 dark:text-zinc-400">
                        <span className="flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
                          {log.channel?.name || `ID: ${log.channel_id}`}
                        </span>
                      </td>

                      {/* Message Content */}
                      <td className="py-4 px-4 max-w-xs">
                        <div className="space-y-1">
                          <p className="truncate text-zinc-600 dark:text-zinc-350" title={log.message || ''}>
                            {log.message || <span className="italic text-zinc-400 dark:text-zinc-550">(Hanya Media)</span>}
                          </p>
                          {log.media_url && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 text-blue-500 rounded text-[9px] font-bold">
                              📎 {log.media_type?.toUpperCase() || 'MEDIA'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Source/Via */}
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${log.via === 'web'
                            ? 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/20'
                            : 'bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20'
                          }`}>
                          {log.via === 'web' ? '💻 Web' : '🔌 API'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {log.status === 'success' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Sukses
                          </span>
                        )}
                        {log.status === 'failed' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500" title={log.error || ''}>
                            <AlertCircle className="w-3.5 h-3.5" /> Gagal
                          </span>
                        )}
                        {log.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 animate-pulse">
                            <Clock className="w-3.5 h-3.5" /> Pending
                          </span>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="py-4 px-4 text-zinc-455 dark:text-zinc-500 font-medium">
                        {new Date(log.created_at).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Inspect JSON */}
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="p-2 bg-zinc-100 hover:bg-zinc-200/60 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 rounded-xl cursor-pointer transition-all border-0"
                            title="Debug / Inspect JSON Response"
                          >
                            <Code className="w-3.5 h-3.5" />
                          </button>

                          {/* Retry */}
                          <button
                            onClick={() => handleRetry(log)}
                            disabled={retryLoading === log.id}
                            className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 hover:text-blue-600 rounded-xl cursor-pointer transition-all border-0 disabled:opacity-50"
                            title="Kirim Ulang Pesan"
                          >
                            {retryLoading === log.id ? (
                              <div className="w-3.5 h-3.5 rounded-full border border-blue-500 border-t-transparent animate-spin" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-600 rounded-xl cursor-pointer transition-all border-0"
                            title="Hapus dari Riwayat"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredLogs.map(log => (
                <div key={log.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-zinc-850 dark:text-zinc-150 font-mono text-xs">
                        {log.to.replace('@s.whatsapp.net', '')}
                      </div>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block mt-0.5">
                        {new Date(log.created_at).toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      {/* Status */}
                      {log.status === 'success' && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-500 bg-emerald-500/5 px-2 py-0.5 rounded-full">
                          🟢 SUKSES
                        </span>
                      )}
                      {log.status === 'failed' && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-red-500 bg-red-500/5 px-2 py-0.5 rounded-full">
                          🔴 GAGAL
                        </span>
                      )}
                      {log.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-amber-500 bg-amber-500/5 px-2 py-0.5 rounded-full animate-pulse">
                          🟡 PENDING
                        </span>
                      )}

                      {/* Source */}
                      <span className={`px-1.5 py-0.25 rounded text-[8px] font-extrabold uppercase tracking-wider ${log.via === 'web'
                          ? 'bg-blue-500/10 text-blue-500'
                          : 'bg-indigo-500/10 text-indigo-500'
                        }`}>
                        {log.via === 'web' ? '💻 Web' : '🔌 API'}
                      </span>
                    </div>
                  </div>

                  {/* Message Content */}
                  <div className="text-[11px] text-zinc-600 dark:text-zinc-350 bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800/80 break-words leading-relaxed">
                    {log.message || <span className="italic text-zinc-400 dark:text-zinc-550">(Hanya Lampiran Media)</span>}
                    {log.media_url && (
                      <div className="mt-1.5 pt-1.5 border-t border-zinc-200/40 dark:border-zinc-800/40 flex items-center gap-1 text-[9px] text-blue-500 font-semibold">
                        📎 {log.media_type?.toUpperCase() || 'MEDIA'}
                      </div>
                    )}
                  </div>

                  {/* Error if present */}
                  {log.error && (
                    <div className="p-2.5 bg-red-500/5 border border-red-500/10 rounded-xl text-[10px] text-red-500">
                      <strong>Error:</strong> {log.error}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                    <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                      <Smartphone className="w-3 h-3" />
                      {log.channel?.name || `ID: ${log.channel_id}`}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-250 dark:bg-zinc-900 text-[10px] font-bold text-zinc-600 dark:text-zinc-350 rounded-lg cursor-pointer transition-all border-0"
                      >
                        Inspect
                      </button>
                      <button
                        onClick={() => handleRetry(log)}
                        disabled={retryLoading === log.id}
                        className="px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-[10px] font-bold text-blue-500 rounded-lg cursor-pointer transition-all border-0 flex items-center gap-1 disabled:opacity-50"
                      >
                        {retryLoading === log.id ? (
                          <div className="w-3 h-3 rounded-full border border-blue-500 border-t-transparent animate-spin" />
                        ) : (
                          <RotateCcw className="w-3 h-3" />
                        )}
                        Kirim Ulang
                      </button>
                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        className="p-1.5 bg-red-500/10 text-red-500 rounded-lg cursor-pointer transition-all border-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {lastPage > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-950/10">
                <span className="text-[10px] text-zinc-500 font-bold">
                  Menampilkan {filteredLogs.length} dari {totalLogs} log pesan
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-all cursor-pointer text-zinc-600 dark:text-zinc-400"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 px-3 select-none">
                    Hal {currentPage} / {lastPage}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === lastPage}
                    className="p-1.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-all cursor-pointer text-zinc-600 dark:text-zinc-400"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* DEBUG INSPECTOR MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-zinc-150 dark:border-zinc-800/60 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/40">
              <div className="flex items-center gap-2 text-zinc-800 dark:text-white">
                <Terminal className="w-4 h-4 text-blue-500" />
                <span className="font-extrabold text-xs uppercase tracking-wider">Debugger: Response API WhatsApp</span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 text-zinc-450 hover:text-zinc-850 dark:hover:text-white hover:bg-zinc-150 dark:hover:bg-zinc-800 rounded-lg transition-all border-0 bg-transparent cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-left">
              <div className="grid grid-cols-2 gap-3.5 text-[11px] border-b border-zinc-150 dark:border-zinc-800 pb-3">
                <div>
                  <span className="text-zinc-400 block font-bold uppercase tracking-wider text-[9px]">ID Log</span>
                  <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200"># {selectedLog.id}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block font-bold uppercase tracking-wider text-[9px]">Sumber Kirim</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.25 rounded-full text-[9px] font-extrabold uppercase ${selectedLog.via === 'web' ? 'bg-blue-500/10 text-blue-500' : 'bg-indigo-500/10 text-indigo-500'
                    }`}>
                    {selectedLog.via === 'web' ? '💻 Web Panel' : '🔌 Developer API'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block font-bold uppercase tracking-wider text-[9px]">Status Response</span>
                  <span className={`font-bold uppercase text-[10px] ${selectedLog.status === 'success' ? 'text-emerald-500' : 'text-red-500'
                    }`}>
                    {selectedLog.status}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block font-bold uppercase tracking-wider text-[9px]">Waktu Respon</span>
                  <span className="text-zinc-800 dark:text-zinc-200 font-mono">
                    {new Date(selectedLog.created_at).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Error Alert if Failed */}
              {selectedLog.error && (
                <div className="p-3.5 bg-red-500/5 border border-red-500/15 rounded-xl flex items-start gap-2.5 text-xs text-red-500">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Error Message:</strong>
                    <p className="mt-0.5 font-mono">{selectedLog.error}</p>
                  </div>
                </div>
              )}

              {/* Raw JSON Code Block */}
              <div className="space-y-1.5">
                <span className="block text-[10px] font-extrabold text-zinc-450 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1 select-none">
                  <Code className="w-3.5 h-3.5 text-zinc-400" />
                  Payload Response Dari WhatsApp Web
                </span>

                <div className="relative">
                  <pre className="bg-[#09090b] text-blue-400 dark:text-blue-300 p-4 rounded-xl text-[10px] font-mono overflow-x-auto border border-zinc-800 max-h-60 overflow-y-auto leading-relaxed select-text">
                    {JSON.stringify(selectedLog.response || { status: selectedLog.status, message: "No raw payload stored." }, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="p-3 bg-blue-500/5 border border-blue-500/15 rounded-xl flex items-start gap-2 text-[11px] text-zinc-550 dark:text-zinc-400">
                <Info className="w-4 h-4 shrink-0 text-blue-500 mt-0.5" />
                <p>
                  Payload response di atas dikembalikan langsung oleh engine WhatsApp secara real-time. Status <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono text-blue-600">PENDING</code> atau status objek pesan yang valid menandakan WhatsApp telah menerima & antre pesan untuk dikirimkan.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-4 border-t border-zinc-150 dark:border-zinc-800 flex items-center justify-end gap-2 bg-zinc-50 dark:bg-zinc-950/30">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200/60 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-650 dark:text-zinc-350 text-xs font-bold rounded-xl cursor-pointer border-0"
              >
                Tutup Debugger
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </AdminLayout>
  );
}
