import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { Broadcast } from '../../types';
import AdminLayout from '../layout/AdminLayout';
import Toast from '../ui/Toast';
import { 
  Search, 
  Calendar, 
  History, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Loader2,
  Trash2,
  Eye,
  RefreshCw,
  X,
  Copy,
  User,
  AlertTriangle,
  Send,
  Sparkles
} from 'lucide-react';

interface BroadcastLog {
  id: number;
  recipient_id: string;
  recipient_name: string | null;
  status: 'sent' | 'failed' | 'queued' | 'pending';
  error: string | null;
  created_at: string;
  sent_at?: string | null;
  channel?: {
    id: number;
    name: string;
    platform: string;
  };
}

interface DetailedBroadcast extends Broadcast {
  targets?: Array<{
    id: number;
    channel_id: number;
    recipients: string[] | null;
    channel?: {
      id: number;
      name: string;
      platform: string;
    };
  }>;
  logs?: BroadcastLog[];
}

export default function BroadcastHistory() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Detail Modal State
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] = useState<DetailedBroadcast | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [logSearchTerm, setLogSearchTerm] = useState('');

  // Delete Confirmation State
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Action Loading states
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    fetchBroadcasts(currentPage);
  }, [currentPage, statusFilter]);

  useEffect(() => {
    const hasActiveBroadcasts = broadcasts.some(b => ['sending', 'queued'].includes(b.status));
    if (!hasActiveBroadcasts) return;

    const intervalId = setInterval(() => {
      let url = `/api/broadcasts?page=${currentPage}`;
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      api.get<{ data: Broadcast[]; current_page: number; last_page: number; total: number }>(url)
        .then((r) => {
          setBroadcasts(r.data);
          setLastPage(r.last_page);
          setTotalItems(r.total);
        })
        .catch(() => {});
    }, 3000);

    return () => clearInterval(intervalId);
  }, [broadcasts, currentPage, statusFilter]);

  const fetchBroadcasts = (page = 1) => {
    setLoading(true);
    let url = `/api/broadcasts?page=${page}`;
    if (statusFilter !== 'all') {
      url += `&status=${statusFilter}`;
    }

    api.get<{ data: Broadcast[]; current_page: number; last_page: number; total: number }>(url)
      .then((r) => {
        setBroadcasts(r.data);
        setCurrentPage(r.current_page);
        setLastPage(r.last_page);
        setTotalItems(r.total);
      })
      .catch(() => {
        setBroadcasts([]);
        setCurrentPage(1);
        setLastPage(1);
        setTotalItems(0);
      })
      .finally(() => setLoading(false));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Local filter on top of the paginated query
  const filteredBroadcasts = broadcasts.filter((bc) => {
    const matchesSearch = 
      (bc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) || 
      bc.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const openDetails = async (id: number) => {
    setDetailLoading(true);
    setSelectedBroadcast(null);
    setDetailOpen(true);
    setLogSearchTerm('');

    try {
      const data = await api.get<DetailedBroadcast>(`/api/broadcasts/${id}`);
      setSelectedBroadcast(data);
    } catch (err) {
      showToast('Gagal memuat detail log penerima', 'error');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(true);
    try {
      await api.delete(`/api/broadcasts/${id}`);
      showToast('Riwayat broadcast berhasil dihapus!', 'success');
      setDeleteConfirmId(null);
      fetchBroadcasts(currentPage);
    } catch {
      showToast('Gagal menghapus riwayat broadcast', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleResend = async (id: number) => {
    setActionLoadingId(id);
    try {
      await api.post(`/api/broadcasts/${id}/send`);
      showToast('Broadcast berhasil diantrekan kembali!', 'success');
      fetchBroadcasts(currentPage);
    } catch {
      showToast('Gagal mengirim ulang broadcast', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (id: number) => {
    setActionLoadingId(id);
    try {
      await api.post(`/api/broadcasts/${id}/cancel`);
      showToast('Jadwal broadcast berhasil dibatalkan!', 'success');
      fetchBroadcasts(currentPage);
    } catch {
      showToast('Gagal membatalkan jadwal broadcast', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Teks pesan disalin ke clipboard!', 'success');
  };

  // Helper to format phone number or group JID without @s.whatsapp.net / @g.us / @lid
  const formatPhoneOrJid = (jid: string) => {
    if (!jid) return '';
    return jid.replace(/@s\.whatsapp\.net|@g\.us|@lid/g, '');
  };

  // Calculate detailed logs stats
  const getLogStats = (logs: BroadcastLog[] = []) => {
    const total = logs.length;
    const sent = logs.filter(l => l.status === 'sent').length;
    const failed = logs.filter(l => l.status === 'failed').length;
    const pending = logs.filter(l => l.status === 'queued' || l.status === 'pending').length;
    const rate = total > 0 ? Math.round((sent / total) * 100) : 0;
    return { total, sent, failed, pending, rate };
  };

  return (
    <AdminLayout activePage="history" title="Riwayat Broadcast">
      
      {/* Premium Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-950 dark:text-white tracking-tight uppercase">
            Riwayat Broadcast
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Daftar pengiriman pesan broadcasting multi-channel Anda secara ringkas dan teratur.
          </p>
        </div>

        {/* Global Stats */}
        <div className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 px-4 py-2 rounded-2xl">
          <div className="text-center px-1">
            <span className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase">Total Campaign</span>
            <span className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200">{totalItems}</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center mb-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Cari judul atau isi pesan..."
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all shadow-inner"
          />
        </div>

        {/* Status Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'Semua Status' },
            { id: 'sent', label: 'Sukses' },
            { id: 'failed', label: 'Gagal' },
            { id: 'scheduled', label: 'Terjadwal' },
            { id: 'queued', label: 'Antre' }
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => { setStatusFilter(chip.id); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                statusFilter === chip.id 
                  ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-450 shadow-sm' 
                  : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-555 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {chip.label}
            </button>
          ))}
          
          <button 
            onClick={() => fetchBroadcasts(currentPage)} 
            disabled={loading}
            className="text-xs font-bold bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer text-zinc-700 dark:text-zinc-300 ml-1"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {loading ? (
        /* Loading Skeleton for Table */
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4 animate-pulse">
          <div className="h-6 w-full bg-zinc-100 dark:bg-zinc-800 rounded" />
          <div className="h-10 w-full bg-zinc-50 dark:bg-zinc-800 rounded" />
          <div className="h-10 w-full bg-zinc-50 dark:bg-zinc-800 rounded" />
          <div className="h-10 w-full bg-zinc-50 dark:bg-zinc-800 rounded" />
        </div>
      ) : filteredBroadcasts.length === 0 ? (
        /* Empty State */
        <div className="text-center py-20 bg-zinc-50/50 dark:bg-zinc-950/20 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 max-w-lg mx-auto">
          <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <History className="w-5 h-5 text-zinc-400 dark:text-zinc-550" />
          </div>
          <h3 className="font-extrabold text-xs text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">Data Kosong</h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1.5 mb-6 max-w-xs mx-auto leading-relaxed">
            Tidak ada riwayat broadcast yang terdaftar untuk filter status "{statusFilter}".
          </p>
          <a href="/broadcast" className="inline-flex items-center gap-1.5 bg-gradient-brand hover:opacity-95 text-white font-bold px-5 py-2.5 rounded-2xl transition-all text-xs cursor-pointer shadow-md shadow-blue-500/15">
            <Send className="w-3.5 h-3.5" />
            <span>Kirim Broadcast</span>
          </a>
        </div>
      ) : (
        /* Redesigned Compact Table View */
        <div className="space-y-4">
          <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800/80 text-xs font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-widest">
                    <th className="px-5 py-3.5 font-bold">Campaign ID</th>
                    <th className="px-5 py-3.5 font-bold">Tanggal Kirim</th>
                    <th className="px-5 py-3.5 font-bold">Judul & Pesan</th>
                    <th className="px-5 py-3.5 font-bold text-center">Status</th>
                    <th className="px-5 py-3.5 font-bold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80 text-xs">
                  {filteredBroadcasts.map((bc) => (
                    <tr key={bc.id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-950/20 transition-colors">
                      {/* ID */}
                      <td className="px-5 py-4 whitespace-nowrap font-mono font-bold text-blue-600 dark:text-blue-450">
                        #{bc.id}
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                          <span>
                            {new Date(bc.created_at).toLocaleString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        {bc.scheduled_at && (
                          <div className="flex items-center gap-1 text-[11px] text-yellow-600 dark:text-yellow-500/85 font-semibold mt-1">
                            <Clock className="w-2.5 h-2.5" />
                            <span>Jadwal: {new Date(bc.scheduled_at).toLocaleString('id-ID')}</span>
                          </div>
                        )}
                      </td>

                      {/* Campaign details */}
                      <td className="px-5 py-4 max-w-xs md:max-w-md">
                        <div className="font-bold text-zinc-800 dark:text-zinc-250 truncate">
                          {bc.title || 'Broadcast Tanpa Judul'}
                        </div>
                        <div className="text-zinc-400 dark:text-zinc-550 truncate mt-0.5 max-w-sm font-normal">
                          {bc.content}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`inline-block text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border tracking-wide uppercase ${statusColor(bc.status)}`}>
                            {bc.status}
                          </span>
                          {bc.total_logs !== undefined && bc.total_logs > 0 && (
                            <div className="w-24 mt-1">
                              <div className="flex justify-between text-[9px] text-zinc-400 dark:text-zinc-500 font-bold mb-0.5">
                                <span>{(bc.sent_logs || 0) + (bc.failed_logs || 0)}/{bc.total_logs}</span>
                                <span>{Math.round((((bc.sent_logs || 0) + (bc.failed_logs || 0)) / bc.total_logs) * 100)}%</span>
                              </div>
                              <div className="w-full h-1 bg-zinc-150 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    bc.status === 'sending' ? 'bg-blue-500 animate-pulse' :
                                    bc.status === 'failed' ? 'bg-red-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.round((((bc.sent_logs || 0) + (bc.failed_logs || 0)) / bc.total_logs) * 100)}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openDetails(bc.id)}
                            className="p-2 bg-zinc-50 dark:bg-zinc-950 hover:bg-blue-50 dark:hover:bg-blue-500/10 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/20 text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-450 rounded-xl transition-all cursor-pointer"
                            title="Detail & Penerima"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {['failed', 'draft'].includes(bc.status) && (
                            <button
                              type="button"
                              onClick={() => handleResend(bc.id)}
                              disabled={actionLoadingId === bc.id}
                              className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                              title="Kirim Ulang"
                            >
                              {actionLoadingId === bc.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          {bc.status === 'scheduled' && (
                            <button
                              type="button"
                              onClick={() => handleCancel(bc.id)}
                              disabled={actionLoadingId === bc.id}
                              className="p-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                              title="Batalkan Jadwal"
                            >
                              {actionLoadingId === bc.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <X className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(bc.id)}
                            className="p-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-xl transition-all cursor-pointer"
                            title="Hapus"
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
          </div>

          {/* Pagination Controls */}
          {lastPage > 1 && (
            <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-5 mt-4">
              <span className="text-xs text-zinc-500 font-medium">
                Menampilkan <span className="font-bold text-zinc-800 dark:text-zinc-200">{currentPage}</span> dari <span className="font-bold text-zinc-800 dark:text-zinc-200">{lastPage}</span> halaman ({totalItems} campaign)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1 || loading}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="px-3.5 py-2 border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-all cursor-pointer"
                >
                  Sebelumnya
                </button>
                <button
                  type="button"
                  disabled={currentPage === lastPage || loading}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="px-3.5 py-2 border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-all cursor-pointer"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800/80 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white uppercase tracking-wider">Hapus Riwayat?</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Aksi ini tidak dapat dibatalkan.</p>
              </div>
            </div>
            <p className="text-xs text-zinc-650 dark:text-zinc-400 leading-relaxed font-normal">
              Apakah Anda yakin ingin menghapus data campaign broadcast ini beserta seluruh log pengiriman penerima di dalamnya?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 border border-zinc-250 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Detail Drawer/Sliding Panel */}
      {detailOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setDetailOpen(false)}
          />

          <div className="relative w-full max-w-2xl bg-white dark:bg-[#0e0e11] border-l border-zinc-200 dark:border-zinc-800/80 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-350 z-10">
            
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/40">
              <div>
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-450 uppercase tracking-widest font-mono">
                  LOG DETAIL PENERIMA
                </span>
                <h2 className="font-extrabold text-sm text-zinc-900 dark:text-white uppercase mt-0.5 truncate max-w-md">
                  {selectedBroadcast?.title || 'Log Detail Campaign'}
                </h2>
              </div>
              <button 
                onClick={() => setDetailOpen(false)}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {detailLoading ? (
                <div className="h-full flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  <span className="text-xs text-zinc-555 font-bold">Memuat data penerima...</span>
                </div>
              ) : selectedBroadcast ? (
                <>
                  {/* Message Detail preview */}
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-zinc-450 uppercase tracking-wider">Isi Pesan Broadcast</span>
                      <button 
                        type="button" 
                        onClick={() => copyToClipboard(selectedBroadcast.content)}
                        className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-900 text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-300 rounded-lg cursor-pointer transition-all"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-xs text-zinc-800 dark:text-zinc-250 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto pr-2 font-normal">
                      {selectedBroadcast.content}
                    </div>
                  </div>

                  {/* Progress Stats Summary */}
                  {(() => {
                    const stats = getLogStats(selectedBroadcast.logs);
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl">
                        <div className="text-center py-1">
                          <span className="block text-[11px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase">Total Target</span>
                          <span className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200">{stats.total}</span>
                        </div>
                        <div className="text-center py-1 border-l border-zinc-200 dark:border-zinc-800/80">
                          <span className="block text-[11px] font-extrabold text-emerald-600 dark:text-emerald-450 uppercase">Sukses</span>
                          <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{stats.sent}</span>
                        </div>
                        <div className="text-center py-1 border-l border-zinc-200 dark:border-zinc-800/80">
                          <span className="block text-[11px] font-extrabold text-red-600 dark:text-red-455 uppercase">Gagal</span>
                          <span className="text-sm font-extrabold text-red-650 dark:text-red-400">{stats.failed}</span>
                        </div>
                        <div className="text-center py-1 border-l border-zinc-200 dark:border-zinc-800/80">
                          <span className="block text-[11px] font-extrabold text-blue-600 dark:text-blue-450 uppercase">Antrean</span>
                          <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">{stats.pending}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Recipients List Header with Search */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <h3 className="font-extrabold text-xs text-zinc-900 dark:text-white uppercase tracking-wider">
                        Daftar Penerima Detail
                      </h3>
                      
                      {/* Search recipients */}
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                        <input
                          type="text"
                          value={logSearchTerm}
                          onChange={(e) => setLogSearchTerm(e.target.value)}
                          placeholder="Cari nama atau nomor..."
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-blue-500 placeholder-zinc-450"
                        />
                      </div>
                    </div>

                    {/* Table presentation for log targets */}
                    {(() => {
                      const list = (selectedBroadcast.logs || []).filter(l => {
                        const term = logSearchTerm.toLowerCase();
                        return (
                          l.recipient_id.includes(term) ||
                          (l.recipient_name?.toLowerCase().includes(term) ?? false)
                        );
                      });

                      if (list.length === 0) {
                        return (
                          <div className="text-center py-10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/20">
                            <User className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Tidak ada log penerima yang cocok</p>
                          </div>
                        );
                      }

                      return (
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-zinc-50/50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-widest">
                                  <th className="px-4 py-3">Nama Kontak</th>
                                  <th className="px-4 py-3">Nomor Telepon</th>
                                  <th className="px-4 py-3">Status</th>
                                  <th className="px-4 py-3 text-right">Waktu</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                                {list.map((log) => (
                                  <tr key={log.id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-950/20 transition-colors">
                                    {/* Name */}
                                    <td className="px-4 py-3 font-bold text-zinc-800 dark:text-zinc-200">
                                      <div className="flex items-center gap-1.5">
                                        <span>{log.recipient_name || 'Kontak Tanpa Nama'}</span>
                                        {log.channel && (
                                          <span className="text-[8px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-bold px-1 py-0.5 rounded uppercase">
                                            {log.channel.name}
                                          </span>
                                        )}
                                      </div>
                                      {log.error && (
                                        <div className="text-[11px] text-red-500 mt-1 font-semibold flex items-start gap-1 max-w-[200px]">
                                          <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                                          <span>{log.error}</span>
                                        </div>
                                      )}
                                    </td>

                                    {/* Number / ID without JID suffix */}
                                    <td className="px-4 py-3 font-mono text-[11px] text-zinc-550 dark:text-zinc-400">
                                      {formatPhoneOrJid(log.recipient_id)}
                                    </td>

                                    {/* Status */}
                                    <td className="px-4 py-3">
                                      <span className={`inline-block text-[8px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${
                                        log.status === 'sent' 
                                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-100 dark:border-emerald-500/25'
                                          : log.status === 'failed'
                                            ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-455 border-red-100 dark:border-red-500/20'
                                            : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-450 border-blue-100 dark:border-blue-500/20'
                                      }`}>
                                        {log.status === 'sent' ? 'Sukses' : log.status === 'failed' ? 'Gagal' : log.status}
                                      </span>
                                    </td>

                                    {/* Time */}
                                    <td className="px-4 py-3 text-right text-zinc-400 dark:text-zinc-500 font-mono text-xs">
                                      {new Date(log.sent_at || log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />

    </AdminLayout>
  );
}

function statusColor(s: string): string {
  const m: Record<string, string> = {
    sent:      'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-100 dark:border-emerald-500/20 shadow-sm',
    failed:    'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20 shadow-sm',
    scheduled: 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-550 border-yellow-100 dark:border-yellow-500/20',
    queued:    'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-455 border-blue-100 dark:border-blue-500/20',
    sending:   'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-455 border-blue-100 dark:border-blue-500/20 animate-pulse',
    draft:     'bg-zinc-100 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800',
  };
  return m[s] ?? 'bg-zinc-100 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800';
}
