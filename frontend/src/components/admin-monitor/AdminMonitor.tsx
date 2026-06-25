import React, { useState, useEffect } from 'react';
import AdminLayout from '../layout/AdminLayout';
import { api } from '../../lib/api';
import {
  Activity, Rocket, Wifi, Users, Globe, Search, RefreshCw,
  Clock, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight,
  Eye, CornerDownRight, Smartphone, Mail, Calendar, MessageSquare, Terminal
} from 'lucide-react';

interface UserBrief {
  id: number;
  name: string;
  email: string;
}

interface ChannelBrief {
  id: number;
  name: string;
  platform: string;
}

interface BroadcastItem {
  id: number;
  user_id: number;
  title: string | null;
  content: string;
  status: string;
  scheduled_at: string | null;
  created_at: string;
  user?: UserBrief | null;
  channels?: ChannelBrief[] | null;
}

interface ApiLogItem {
  id: number;
  user_id: number;
  channel_id: number | null;
  to: string;
  message: string | null;
  media_url: string | null;
  media_type: string | null;
  status: string;
  error: string | null;
  created_at: string;
  user?: UserBrief | null;
  channel?: ChannelBrief | null;
}

interface ChannelItem {
  id: number;
  user_id: number;
  name: string;
  platform: string;
  phone: string | null;
  status: string;
  updated_at: string;
  user?: UserBrief | null;
}

interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export default function AdminMonitor() {
  const [activeTab, setActiveTab] = useState<'overview' | 'broadcasts' | 'api_logs' | 'channels'>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search filter query
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [broadcastsPage, setBroadcastsPage] = useState<PaginatedResponse<BroadcastItem> | null>(null);
  const [apiLogsPage, setApiLogsPage] = useState<PaginatedResponse<ApiLogItem> | null>(null);
  const [channelsList, setChannelsList] = useState<ChannelItem[]>([]);

  // Pagination states
  const [bcCurrentPage, setBcCurrentPage] = useState(1);
  const [apiCurrentPage, setApiCurrentPage] = useState(1);

  // Detail Modal states
  const [selectedBroadcast, setSelectedBroadcast] = useState<BroadcastItem | null>(null);
  const [selectedApiLog, setSelectedApiLog] = useState<ApiLogItem | null>(null);

  const fetchData = async () => {
    try {
      if (activeTab === 'overview') {
        // For overview, we load page 1 of both datasets and the entire channel list to calculate totals
        const [bcRes, apiRes, chRes] = await Promise.all([
          api.get<PaginatedResponse<BroadcastItem>>(`/api/admin/broadcasts?page=1`),
          api.get<PaginatedResponse<ApiLogItem>>(`/api/admin/api-logs?page=1`),
          api.get<ChannelItem[]>(`/api/admin/channels`)
        ]);
        setBroadcastsPage(bcRes);
        setApiLogsPage(apiRes);
        setChannelsList(chRes || []);
      } else if (activeTab === 'broadcasts') {
        const bcRes = await api.get<PaginatedResponse<BroadcastItem>>(`/api/admin/broadcasts?page=${bcCurrentPage}`);
        setBroadcastsPage(bcRes);
      } else if (activeTab === 'api_logs') {
        const apiRes = await api.get<PaginatedResponse<ApiLogItem>>(`/api/admin/api-logs?page=${apiCurrentPage}`);
        setApiLogsPage(apiRes);
      } else if (activeTab === 'channels') {
        const chRes = await api.get<ChannelItem[]>(`/api/admin/channels`);
        setChannelsList(chRes || []);
      }
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Hanya Administrator utama (arisedyhandoko@gmail.com) yang diizinkan mengakses halaman ini.');
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [activeTab, bcCurrentPage, apiCurrentPage]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Status styling helpers
  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'sent' || s === 'success') {
      return 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400';
    }
    if (s === 'failed' || s === 'error') {
      return 'bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400';
    }
    if (s === 'scheduled' || s === 'pending') {
      return 'bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400';
    }
    return 'bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400';
  };

  // Filtering calculations
  const filteredBroadcasts = (broadcastsPage?.data || []).filter(item => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      item.content.toLowerCase().includes(q) ||
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.user && item.user.name.toLowerCase().includes(q)) ||
      (item.user && item.user.email.toLowerCase().includes(q)) ||
      (item.channels && item.channels.some(c => c.name.toLowerCase().includes(q)))
    );
  });

  const filteredApiLogs = (apiLogsPage?.data || []).filter(item => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      item.to.includes(q) ||
      (item.message && item.message.toLowerCase().includes(q)) ||
      (item.user && item.user.name.toLowerCase().includes(q)) ||
      (item.user && item.user.email.toLowerCase().includes(q)) ||
      (item.error && item.error.toLowerCase().includes(q))
    );
  });

  const filteredChannels = channelsList.filter(item => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      (item.phone && item.phone.includes(q)) ||
      (item.user && item.user.name.toLowerCase().includes(q)) ||
      (item.user && item.user.email.toLowerCase().includes(q))
    );
  });

  return (
    <AdminLayout activePage="admin_monitor" title="Monitor Aktivitas" onRefresh={handleRefresh} refreshing={refreshing}>
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg mb-3">
            <Activity className="w-3.5 h-3.5" />
            System Activity Monitor
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight font-display">
            Pemantau Aktivitas Pengguna
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 max-w-lg">
            Pantau semua antrean broadcast, pesan instan via API, dan konektivitas perangkat WhatsApp dari seluruh pengguna.
          </p>
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-2xl p-6 text-center max-w-2xl mx-auto space-y-4">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <h3 className="text-sm font-bold text-red-800 dark:text-red-400">Akses Ditolak</h3>
          <p className="text-xs text-red-700/80 dark:text-red-300/85 leading-relaxed">
            {error}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Search Bar & Tab Selection */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            {/* Tabs */}
            <div className="flex bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 gap-0.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
              {[
                { id: 'overview', label: 'Ringkasan', icon: Activity },
                { id: 'broadcasts', label: 'Broadcasts', icon: Rocket },
                { id: 'api_logs', label: 'API Messages', icon: Terminal },
                { id: 'channels', label: 'Devices Connected', icon: Smartphone }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id as any); setSearchQuery(''); }}
                    className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex-1 sm:flex-none ${
                      activeTab === tab.id
                        ? 'tab-active'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            {activeTab !== 'overview' && (
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={`Cari di halaman ini...`}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors placeholder:text-zinc-400"
                />
              </div>
            )}
          </div>

          {/* Skeletons Loading state */}
          {loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                {[...Array(4)].map((_, idx) => (
                  <div key={idx} className="h-28 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 animate-pulse" />
                ))}
              </div>
              <div className="h-64 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 animate-pulse" />
            </div>
          ) : (
            <>
              {/* ── TAB: OVERVIEW ─────────────────────────────────── */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {/* Total User Broadcasts */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/[0.03] rounded-full blur-lg pointer-events-none" />
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Broadcasts</span>
                        <Rocket className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="text-3xl font-black text-zinc-900 dark:text-white">
                        {broadcastsPage?.total ?? 0}
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1.5">Kampanye massal dari semua pengguna</p>
                    </div>

                    {/* Total API Messages */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/[0.03] rounded-full blur-lg pointer-events-none" />
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">API Messages</span>
                        <Terminal className="w-5 h-5 text-purple-500" />
                      </div>
                      <div className="text-3xl font-black text-zinc-900 dark:text-white">
                        {apiLogsPage?.total ?? 0}
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1.5">Pesan instan dipicu via API Key</p>
                    </div>

                    {/* Connected WhatsApp Devices */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/[0.03] rounded-full blur-lg pointer-events-none" />
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Active Devices</span>
                        <Wifi className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div className="text-3xl font-black text-zinc-900 dark:text-white">
                        {channelsList.filter(c => c.status === 'active').length}
                        <span className="text-xs text-zinc-400 font-bold ml-1.5">/ {channelsList.length}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1.5">Perangkat WhatsApp yang terhubung</p>
                    </div>

                    {/* Total System Users */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/[0.03] rounded-full blur-lg pointer-events-none" />
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Active Users</span>
                        <Users className="w-5 h-5 text-cyan-500" />
                      </div>
                      <div className="text-3xl font-black text-zinc-900 dark:text-white">
                        {/* Unique user count in channel list / logs */}
                        {new Set(channelsList.map(c => c.user_id)).size}
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1.5">Pengguna aktif yang memiliki channel</p>
                    </div>
                  </div>

                  {/* Dual Grid: Recent Broadcasts vs Recent API Logs */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Recent Broadcasts */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm">
                      <div className="flex items-center justify-between mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                          <Rocket className="w-4 h-4 text-blue-500" /> Broadcast Terbaru Lintas User
                        </h3>
                        <button onClick={() => setActiveTab('broadcasts')} className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline">
                          Lihat Semua
                        </button>
                      </div>
                      <div className="space-y-3.5">
                        {(broadcastsPage?.data || []).slice(0, 5).map((item) => (
                          <div key={item.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 transition-colors">
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{item.user?.name || 'Unknown'}</span>
                                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium truncate max-w-[120px]">({item.user?.email})</span>
                              </div>
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{item.title || item.content}</p>
                              <div className="flex items-center gap-1.5 text-[9px] text-zinc-400">
                                <Clock className="w-3 h-3" />
                                <span>{new Date(item.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                {item.channels && item.channels.length > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="font-semibold text-zinc-500 dark:text-zinc-400">{item.channels.map(c => c.name).join(', ')}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${getStatusBadge(item.status)}`}>
                              {item.status.toUpperCase()}
                            </span>
                          </div>
                        ))}
                        {(broadcastsPage?.data || []).length === 0 && (
                          <p className="text-center py-6 text-xs text-zinc-400">Belum ada data broadcast.</p>
                        )}
                      </div>
                    </div>

                    {/* Recent API Messages */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm">
                      <div className="flex items-center justify-between mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                          <Terminal className="w-4 h-4 text-purple-500" /> API Messages Terbaru Lintas User
                        </h3>
                        <button onClick={() => setActiveTab('api_logs')} className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline">
                          Lihat Semua
                        </button>
                      </div>
                      <div className="space-y-3.5">
                        {(apiLogsPage?.data || []).slice(0, 5).map((item) => (
                          <div key={item.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 transition-colors">
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{item.user?.name || 'Unknown'}</span>
                                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium truncate max-w-[120px]">({item.user?.email})</span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                                <span className="font-bold text-blue-500 shrink-0">Ke: {item.to}</span>
                                <span className="text-zinc-300 dark:text-zinc-800">|</span>
                                <span className="truncate">{item.message || '(Media Attachment)'}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[9px] text-zinc-400">
                                <Clock className="w-3 h-3" />
                                <span>{new Date(item.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${getStatusBadge(item.status)}`}>
                              {item.status.toUpperCase()}
                            </span>
                          </div>
                        ))}
                        {(apiLogsPage?.data || []).length === 0 && (
                          <p className="text-center py-6 text-xs text-zinc-400">Belum ada data pesan API.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB: BROADCASTS ─────────────────────────────────── */}
              {activeTab === 'broadcasts' && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">
                          <th className="px-6 py-4">Pengguna</th>
                          <th className="px-6 py-4">Channel</th>
                          <th className="px-6 py-4">Konten / Judul</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Dibuat</th>
                          <th className="px-6 py-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/65 text-xs text-zinc-700 dark:text-zinc-300">
                        {filteredBroadcasts.map(item => (
                          <tr key={item.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-zinc-900 dark:text-zinc-150">{item.user?.name || 'Unknown'}</div>
                              <div className="text-[10px] text-zinc-400 mt-0.5">{item.user?.email || '—'}</div>
                            </td>
                            <td className="px-6 py-4">
                              {item.channels && item.channels.length > 0 ? (
                                <div>
                                  <div className="font-medium text-zinc-800 dark:text-zinc-200">
                                    {item.channels.map(c => c.name).join(', ')}
                                  </div>
                                  <div className="text-[9px] text-zinc-400 uppercase font-mono mt-0.5">
                                    {item.channels[0].platform}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-zinc-400">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4 max-w-xs">
                              {item.title && <div className="font-semibold text-zinc-800 dark:text-zinc-100 truncate">{item.title}</div>}
                              <div className="text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{item.content}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full ${getStatusBadge(item.status)}`}>
                                {item.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-zinc-400 font-mono text-[10px]">
                              {new Date(item.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => setSelectedBroadcast(item)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors font-semibold text-[10px] cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" /> Detail
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredBroadcasts.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center py-12 text-zinc-400">
                              Tidak ada data broadcast yang ditemukan.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {broadcastsPage && broadcastsPage.last_page > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/20">
                      <div className="text-[10px] text-zinc-400 font-bold">
                        Halaman {broadcastsPage.current_page} dari {broadcastsPage.last_page} ({broadcastsPage.total} data)
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          disabled={bcCurrentPage <= 1}
                          onClick={() => setBcCurrentPage(prev => Math.max(1, prev - 1))}
                          className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          disabled={bcCurrentPage >= broadcastsPage.last_page}
                          onClick={() => setBcCurrentPage(prev => Math.min(broadcastsPage.last_page, prev + 1))}
                          className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB: API LOGS ─────────────────────────────────── */}
              {activeTab === 'api_logs' && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">
                          <th className="px-6 py-4">Pengguna</th>
                          <th className="px-6 py-4">Penerima</th>
                          <th className="px-6 py-4">Pesan / Media</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Waktu</th>
                          <th className="px-6 py-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/65 text-xs text-zinc-700 dark:text-zinc-300">
                        {filteredApiLogs.map(item => (
                          <tr key={item.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-zinc-900 dark:text-zinc-150">{item.user?.name || 'Unknown'}</div>
                              <div className="text-[10px] text-zinc-400 mt-0.5">{item.user?.email || '—'}</div>
                            </td>
                            <td className="px-6 py-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                              {item.to}
                            </td>
                            <td className="px-6 py-4 max-w-xs">
                              {item.message ? (
                                <div className="text-zinc-500 dark:text-zinc-400 truncate">{item.message}</div>
                              ) : item.media_url ? (
                                <div className="text-[10px] bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 rounded inline-flex items-center gap-1 text-zinc-500">
                                  📎 {item.media_type || 'Media'} Attachment
                                </div>
                              ) : (
                                <span className="text-zinc-400">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full ${getStatusBadge(item.status)}`}>
                                {item.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-zinc-400 font-mono text-[10px]">
                              {new Date(item.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => setSelectedApiLog(item)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors font-semibold text-[10px] cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" /> Detail
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredApiLogs.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center py-12 text-zinc-400">
                              Tidak ada log pesan API yang ditemukan.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {apiLogsPage && apiLogsPage.last_page > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/20">
                      <div className="text-[10px] text-zinc-400 font-bold">
                        Halaman {apiLogsPage.current_page} dari {apiLogsPage.last_page} ({apiLogsPage.total} data)
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          disabled={apiCurrentPage <= 1}
                          onClick={() => setApiCurrentPage(prev => Math.max(1, prev - 1))}
                          className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          disabled={apiCurrentPage >= apiLogsPage.last_page}
                          onClick={() => setApiCurrentPage(prev => Math.min(apiLogsPage.last_page, prev + 1))}
                          className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB: CHANNELS (DEVICES) ───────────────────────── */}
              {activeTab === 'channels' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-fadeIn">
                  {filteredChannels.map(ch => (
                    <div key={ch.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200/40 dark:border-zinc-850 flex items-center justify-center text-lg">
                            💬
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-zinc-900 dark:text-white leading-snug">{ch.name}</h3>
                            <p className="text-[9px] text-zinc-400 uppercase font-mono tracking-wider mt-0.5">{ch.platform}</p>
                          </div>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(ch.status)}`}>
                          {ch.status.toUpperCase()}
                        </span>
                      </div>

                      {/* Info lines */}
                      <div className="space-y-2.5 pt-1 text-[11px] border-t border-zinc-100 dark:border-zinc-800/80">
                        {/* Owner */}
                        <div className="flex items-start gap-2">
                          <Users className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-zinc-400">Pemilik:</span>
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200 ml-1.5">{ch.user?.name}</span>
                            <div className="text-[9px] text-zinc-400 mt-0.5">{ch.user?.email}</div>
                          </div>
                        </div>

                        {/* Phone */}
                        {ch.phone && (
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span className="text-zinc-400">Nomor HP:</span>
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 ml-1.5">{ch.phone}</span>
                          </div>
                        )}

                        {/* Updated At */}
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="text-zinc-400">Aktifitas Terakhir:</span>
                          <span className="text-zinc-500 dark:text-zinc-300 font-medium ml-1.5">
                            {new Date(ch.updated_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredChannels.length === 0 && (
                    <div className="col-span-full py-12 text-center text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                      Tidak ada perangkat WhatsApp yang ditemukan.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── BROADCAST DETAIL MODAL ───────────────────────── */}
      {selectedBroadcast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-scaleIn">
            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white flex items-center gap-2 uppercase tracking-wide">
                <Rocket className="w-4 h-4 text-blue-500" /> Detail Broadcast
              </h3>
              <button onClick={() => setSelectedBroadcast(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer text-xs font-bold bg-zinc-100 dark:bg-zinc-800/60 px-2.5 py-1.5 rounded-lg">
                Tutup
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-zinc-400 block mb-0.5">Pembuat:</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-150">{selectedBroadcast.user?.name}</span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">{selectedBroadcast.user?.email}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block mb-0.5">Device:</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-150">
                    {selectedBroadcast.channels && selectedBroadcast.channels.length > 0
                      ? selectedBroadcast.channels.map(c => c.name).join(', ')
                      : '—'}
                  </span>
                  <span className="text-[9px] text-zinc-400 block uppercase font-mono mt-0.5">
                    {selectedBroadcast.channels && selectedBroadcast.channels.length > 0
                      ? selectedBroadcast.channels[0].platform
                      : ''}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block mb-0.5">Status:</span>
                  <span className={`inline-flex text-[10px] font-black px-2.5 py-0.5 rounded-full ${getStatusBadge(selectedBroadcast.status)}`}>
                    {selectedBroadcast.status.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block mb-0.5">Waktu Kirim:</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono text-[11px]">
                    {new Date(selectedBroadcast.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {selectedBroadcast.title && (
                <div className="space-y-1.5">
                  <span className="text-xs text-zinc-400 font-bold block">Judul/Nama Kampanye:</span>
                  <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    {selectedBroadcast.title}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <span className="text-xs text-zinc-400 font-bold block">Pesan Pesan (Content):</span>
                <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800/80 rounded-xl p-4 text-xs text-zinc-800 dark:text-zinc-200 font-mono whitespace-pre-wrap leading-relaxed">
                  {selectedBroadcast.content}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── API LOG DETAIL MODAL ─────────────────────────── */}
      {selectedApiLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-scaleIn">
            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white flex items-center gap-2 uppercase tracking-wide">
                <Terminal className="w-4 h-4 text-purple-500" /> Detail Pesan API
              </h3>
              <button onClick={() => setSelectedApiLog(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer text-xs font-bold bg-zinc-100 dark:bg-zinc-800/60 px-2.5 py-1.5 rounded-lg">
                Tutup
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-zinc-400 block mb-0.5">Pengirim:</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-150">{selectedApiLog.user?.name}</span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">{selectedApiLog.user?.email}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block mb-0.5">Penerima (WhatsApp):</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">{selectedApiLog.to}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block mb-0.5">Status:</span>
                  <span className={`inline-flex text-[10px] font-black px-2.5 py-0.5 rounded-full ${getStatusBadge(selectedApiLog.status)}`}>
                    {selectedApiLog.status.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block mb-0.5">Waktu Request:</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono text-[11px]">
                    {new Date(selectedApiLog.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {selectedApiLog.message && (
                <div className="space-y-1.5">
                  <span className="text-xs text-zinc-400 font-bold block">Pesan Teks:</span>
                  <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800/80 rounded-xl p-4 text-xs text-zinc-800 dark:text-zinc-200 font-mono whitespace-pre-wrap leading-relaxed">
                    {selectedApiLog.message}
                  </div>
                </div>
              )}

              {selectedApiLog.media_url && (
                <div className="space-y-1.5">
                  <span className="text-xs text-zinc-400 font-bold block">Media Attachment:</span>
                  <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800/80 rounded-xl p-3.5 text-xs flex flex-col gap-2">
                    <div className="flex justify-between items-center text-[10px] text-zinc-500">
                      <span>Tipe: <strong className="uppercase font-mono">{selectedApiLog.media_type || 'image'}</strong></span>
                      <a href={selectedApiLog.media_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline flex items-center gap-0.5 font-bold">
                        Buka Link <Globe className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <div className="font-mono text-[10px] break-all bg-white dark:bg-zinc-900 p-2 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {selectedApiLog.media_url}
                    </div>
                  </div>
                </div>
              )}

              {selectedApiLog.error && (
                <div className="space-y-1.5">
                  <span className="text-xs text-red-500 font-bold block">Error Log (Gagal Kirim):</span>
                  <div className="bg-red-50/50 dark:bg-red-950/20 border border-red-200/40 dark:border-red-900/30 rounded-xl p-4 text-xs text-red-600 dark:text-red-400 font-mono whitespace-pre-wrap">
                    {selectedApiLog.error}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
