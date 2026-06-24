import React, { useState, useEffect } from 'react';
import AdminLayout from '../layout/AdminLayout';
import { Users, CreditCard, Search, Calendar, ChevronLeft, ChevronRight, Activity, Smartphone, Cpu, Link as LinkIcon, RefreshCw, BadgeAlert, Plus, X, Check, Trash, MoreVertical } from 'lucide-react';
import { api } from '../../lib/api';
import { AlertBanner } from '../ui/Toast';

interface SubscriberUser {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  trial_count: number;
  channels_count: number;
  chatbot_rules_count: number;
  webhooks_count: number;
  subscription: {
    id: number;
    plan: 'free' | 'daily' | 'monthly' | 'yearly';
    started_at: string;
    expires_at: string | null;
  } | null;
}

export default function SubscribersManager() {
  const [subscribers, setSubscribers] = useState<SubscriberUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Extend Modal State
  const [selectedUser, setSelectedUser] = useState<SubscriberUser | null>(null);
  const [extendPlan, setExtendPlan] = useState<'free' | 'daily' | 'monthly' | 'yearly'>('monthly');
  const [extendDays, setExtendDays] = useState(30);
  const [overwriteExpiry, setOverwriteExpiry] = useState(false);
  const [extending, setExtending] = useState(false);
  const [extendSuccess, setExtendSuccess] = useState<string | null>(null);
  const [extendError, setExtendError] = useState<string | null>(null);

  // Delete User State
  const [deletingUser, setDeletingUser] = useState<SubscriberUser | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Cancel Subscription State
  const [cancelingUser, setCancelingUser] = useState<SubscriberUser | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);

  // Active Dropdown state
  const [activeDropdownUserId, setActiveDropdownUserId] = useState<number | null>(null);

  const getDefaultDays = (plan: string): number => {
    switch (plan) {
      case 'yearly': return 365;
      case 'monthly': return 30;
      case 'daily': return 1;
      case 'free': return 7;
      default: return 30;
    }
  };

  const getRemainingDays = (expiresAt: string | null): string => {
    if (!expiresAt) return 'Aktif Selamanya';
    const expireDate = new Date(expiresAt);
    const now = new Date();
    const diffTime = expireDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Expired';
    return `Sisa ${diffDays} hari`;
  };

  const handleDeleteUser = (user: SubscriberUser) => {
    setDeletingUser(user);
    setDeleteConfirmOpen(true);
  };

  const handleCancelSubscription = (user: SubscriberUser) => {
    setCancelingUser(user);
    setCancelConfirmOpen(true);
  };

  const confirmCancelSubscription = async () => {
    if (!cancelingUser) return;
    setCanceling(true);
    try {
      await api.delete(`/api/admin/subscribers/${cancelingUser.id}/subscription`);
      loadData();
      setCancelConfirmOpen(false);
      setCancelingUser(null);
    } catch (err: any) {
      alert(err.message ?? 'Gagal menghapus langganan.');
    } finally {
      setCanceling(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    try {
      await api.delete(`/api/admin/subscribers/${deletingUser.id}`);
      loadData();
      setDeleteConfirmOpen(false);
      setDeletingUser(null);
    } catch (err: any) {
      alert(err.message ?? 'Gagal menghapus pengguna.');
    } finally {
      setDeleting(false);
    }
  };

  async function handleExtend(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    setExtending(true);
    setExtendSuccess(null);
    setExtendError(null);
    try {
      await api.post(`/api/admin/subscribers/${selectedUser.id}/extend`, {
        plan: extendPlan,
        days: extendDays,
        overwrite: overwriteExpiry,
      });
      setExtendSuccess('Langganan berhasil diperbarui!');
      loadData();
      setTimeout(() => {
        setSelectedUser(null);
        setExtendSuccess(null);
        setOverwriteExpiry(false);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setExtendError(err.message ?? 'Gagal memperpanjang langganan.');
    } finally {
      setExtending(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<SubscriberUser[]>('/api/admin/subscribers');
      setSubscribers(data || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? 'Hanya Admin (Arisedyhandoko@gmail.com) yang dapat memantau halaman ini.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const data = await api.get<SubscriberUser[]>('/api/admin/subscribers');
      setSubscribers(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  }

  // Filtered subscribers
  const filtered = subscribers.filter(sub => {
    const term = search.toLowerCase();
    return sub.name.toLowerCase().includes(term) || sub.email.toLowerCase().includes(term);
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedSubscribers = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Calculate statistics
  const totalUsers = subscribers.length;
  const activeSubs = subscribers.filter(s => s.subscription && s.subscription.plan !== 'free').length;
  
  // Calculate estimated monthly revenue
  const monthlyRevenue = subscribers.reduce((acc, curr) => {
    if (!curr.subscription) return acc;
    if (curr.subscription.plan === 'free') return acc;
    if (curr.subscription.payment_id && curr.subscription.payment_id.startsWith('PROMO-')) return acc;
    
    if (curr.subscription.plan === 'daily') return acc + 30000; // 30 days * 1000
    if (curr.subscription.plan === 'monthly') return acc + 25000;
    if (curr.subscription.plan === 'yearly') return acc + Math.round(199000 / 12);
    return acc;
  }, 0);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const getPlanBadge = (plan: string | undefined) => {
    switch (plan) {
      case 'yearly':
        return <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-full uppercase tracking-wider badge-active whitespace-nowrap">Yearly Premium</span>;
      case 'monthly':
        return <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-full uppercase tracking-wider badge-purple-gradient whitespace-nowrap">Monthly</span>;
      case 'daily':
        return <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-full uppercase tracking-wider badge-amber-gradient whitespace-nowrap">Daily Pass</span>;
      default:
        return <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-full uppercase tracking-wider badge-gradient whitespace-nowrap">Free Trial</span>;
    }
  };

  return (
    <AdminLayout activePage="subscribers" title="Daftar Pelanggan" onRefresh={handleRefresh} refreshing={refreshing}>
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Pemantauan Pelanggan (Admin Panel)
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Halaman khusus untuk memantau status subscription, limit trial, dan integrasi aktif pelanggan Autoin.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="self-start md:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl transition-all border border-zinc-200 dark:border-zinc-800 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Segarkan Data</span>
          </button>
        </div>

        {error ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-8 rounded-2xl text-center space-y-4 max-w-md mx-auto">
            <BadgeAlert className="w-12 h-12 mx-auto text-red-500" />
            <h3 className="font-bold text-sm">Akses Ditolak</h3>
            <p className="text-xs leading-relaxed">
              {error}
            </p>
          </div>
        ) : (
          <>
            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="bg-white dark:bg-[#0c0c0e]/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Total Pengguna</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Users className="w-4.5 h-4.5" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-zinc-900 dark:text-white leading-none">{totalUsers}</div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-2 font-medium">Terdaftar melalui Google SSO</p>
              </div>

              <div className="bg-white dark:bg-[#0c0c0e]/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Pelanggan Aktif</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-600/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <CreditCard className="w-4.5 h-4.5" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-zinc-900 dark:text-white leading-none">{activeSubs}</div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-2 font-medium">Pengguna dengan paket Premium aktif</p>
              </div>

              <div className="bg-white dark:bg-[#0c0c0e]/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Estimasi MRR</span>
                  <div className="w-8 h-8 rounded-lg bg-purple-600/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Activity className="w-4.5 h-4.5" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-zinc-900 dark:text-white leading-none">{formatRupiah(monthlyRevenue)}</div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-2 font-medium">Estimasi Pendapatan Bulanan</p>
              </div>
            </div>

            {/* List and Search */}
            <div className="bg-white dark:bg-[#0c0c0e]/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-zinc-200 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Daftar Akun Pengguna</h3>
                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nama atau email..."
                    className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-all placeholder-zinc-400 dark:placeholder-zinc-650"
                  />
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center text-xs text-zinc-500 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                  <span>Memuat daftar pelanggan...</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-12 text-center text-xs text-zinc-500">
                  Tidak ada pengguna yang cocok dengan kueri Anda.
                </div>
              ) : (
                <div>
                  {/* Card-based layout for mobile viewports */}
                  <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
                    {paginatedSubscribers.map((user) => (
                      <div key={user.id} className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200">
                        {/* Header: User avatar, name, and email */}
                        <div className="flex items-center gap-3">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-800" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="text-left min-w-0">
                            <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                              <span className="truncate">{user.name}</span>
                              {user.email === 'Arisedyhandoko@gmail.com' && (
                                <span className="text-[9px] font-black text-rose-500 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20 uppercase tracking-wider scale-90">Owner</span>
                              )}
                            </div>
                            <div className="text-[10px] text-zinc-500 dark:text-zinc-500 font-medium truncate">{user.email}</div>
                          </div>
                        </div>

                        {/* Plan & Trial Limit */}
                        <div className="flex items-center justify-between gap-4 border-t border-b border-zinc-150 dark:border-zinc-800 py-3 text-xs">
                          <div>
                            <span className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Paket Langganan</span>
                            {getPlanBadge(user.subscription?.plan)}
                          </div>
                          <div className="text-right">
                            <span className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Limit Trial</span>
                            <span className="font-bold text-zinc-800 dark:text-zinc-200">{user.trial_count} Pesan</span>
                          </div>
                        </div>

                        {/* Dates & Integrations */}
                        <div className="flex flex-col gap-3 text-xs">
                          {user.subscription && (
                            <div className="space-y-1">
                              <span className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Masa Aktif</span>
                              <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-medium">
                                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                                <span>
                                  {new Date(user.subscription.started_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  {' — '}
                                  {user.subscription.expires_at ? new Date(user.subscription.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Selamanya'}
                                </span>
                              </div>
                              <div className={`text-[10px] font-extrabold flex items-center gap-1 mt-0.5 ${
                                user.subscription.expires_at && (new Date(user.subscription.expires_at).getTime() - new Date().getTime()) < 3 * 24 * 60 * 60 * 1000
                                  ? 'text-red-500 animate-pulse'
                                  : 'text-blue-500 dark:text-blue-450'
                              }`}>
                                <Activity className="w-3 h-3" />
                                <span>{getRemainingDays(user.subscription.expires_at)}</span>
                              </div>
                            </div>
                          )}
                          
                          <div className="space-y-1.5">
                            <span className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Integrasi Aktif</span>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-750 dark:text-zinc-250 bg-white dark:bg-zinc-950 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                                <Smartphone className="w-3 h-3 text-emerald-500" /> WhatsApp: {user.channels_count}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-750 dark:text-zinc-250 bg-white dark:bg-zinc-950 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                                <Cpu className="w-3 h-3 text-purple-500" /> Rules: {user.chatbot_rules_count}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-750 dark:text-zinc-250 bg-white dark:bg-zinc-950 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                                <LinkIcon className="w-3 h-3 text-blue-500" /> Webhook: {user.webhooks_count}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUser(user);
                              const defaultPlan = user.subscription?.plan || 'monthly';
                              setExtendPlan(defaultPlan);
                              setExtendDays(getDefaultDays(defaultPlan));
                            }}
                            className="flex-1 py-2 bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white dark:text-blue-400 dark:hover:text-white border border-blue-500/10 hover:border-transparent font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Extend</span>
                          </button>
                          {user.subscription && (
                            <button
                              type="button"
                              onClick={() => handleCancelSubscription(user)}
                              className="flex-1 py-2 bg-amber-600/10 hover:bg-amber-600 text-amber-600 hover:text-white dark:text-amber-400 dark:hover:text-white border border-amber-500/10 hover:border-transparent font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Hapus Sub</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user)}
                            className="flex-1 py-2 bg-rose-600/10 hover:bg-rose-600 text-rose-600 hover:text-white dark:text-rose-400 dark:hover:text-white border border-rose-500/10 hover:border-transparent font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Trash className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        </div>

                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto pb-16">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                          <th className="px-6 py-4">Nama & Email</th>
                          <th className="px-6 py-4">Paket Langganan</th>
                          <th className="px-6 py-4">Mulai / Berakhir</th>
                          <th className="px-6 py-4 text-center">Integrasi Aktif</th>
                          <th className="px-6 py-4 text-center">Limit Trial</th>
                          <th className="px-6 py-4 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                        {paginatedSubscribers.map((user, idx) => (
                          <tr key={user.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {user.avatar ? (
                                  <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-800" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                                    {user.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div className="text-left">
                                  <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                                    {user.name}
                                    {user.email === 'Arisedyhandoko@gmail.com' && (
                                      <span className="text-[9px] font-black text-rose-500 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20 uppercase tracking-wider scale-90">Owner</span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-zinc-500 dark:text-zinc-500 font-medium">{user.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {getPlanBadge(user.subscription?.plan)}
                            </td>
                            <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 font-medium">
                              {user.subscription ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1 text-[11px] text-zinc-700 dark:text-zinc-300">
                                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                                    <span>{new Date(user.subscription.started_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                  </div>
                                  <div className="text-[9px] text-zinc-450 dark:text-zinc-500">
                                    Selesai: {user.subscription.expires_at ? new Date(user.subscription.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Selamanya'}
                                  </div>
                                  <div className={`text-[10px] font-extrabold flex items-center gap-1 mt-0.5 ${
                                    user.subscription.expires_at && (new Date(user.subscription.expires_at).getTime() - new Date().getTime()) < 3 * 24 * 60 * 60 * 1000
                                      ? 'text-red-500 animate-pulse'
                                      : 'text-blue-500 dark:text-blue-450'
                                  }`}>
                                    <Activity className="w-3 h-3 animate-pulse" />
                                    <span>{getRemainingDays(user.subscription.expires_at)}</span>
                                  </div>
                                </div>
                              ) : (
                                <span>—</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-3">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-750 dark:text-zinc-250 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.8 rounded-lg border border-zinc-200 dark:border-zinc-800">
                                  <Smartphone className="w-3 h-3 text-emerald-500" /> {user.channels_count}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-750 dark:text-zinc-250 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.8 rounded-lg border border-zinc-200 dark:border-zinc-800">
                                  <Cpu className="w-3 h-3 text-purple-500" /> {user.chatbot_rules_count}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-750 dark:text-zinc-250 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.8 rounded-lg border border-zinc-200 dark:border-zinc-800">
                                  <LinkIcon className="w-3 h-3 text-blue-500" /> {user.webhooks_count}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center text-zinc-500 dark:text-zinc-450 font-bold">
                              {user.trial_count} Pesan
                            </td>
                            <td className={`px-6 py-4 text-center whitespace-nowrap ${activeDropdownUserId === user.id ? 'z-30 relative' : ''}`}>
                              <div className="flex items-center justify-center">
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveDropdownUserId(activeDropdownUserId === user.id ? null : user.id);
                                    }}
                                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all cursor-pointer"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>

                                  {activeDropdownUserId === user.id && (
                                    <>
                                      {/* Backdrop to close the dropdown when clicking outside */}
                                      <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setActiveDropdownUserId(null)}
                                      />
                                      <div className="absolute right-0 mt-1.5 w-36 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg z-50 py-1 text-left animate-in fade-in slide-in-from-top-1 duration-150">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveDropdownUserId(null);
                                            setSelectedUser(user);
                                            const defaultPlan = user.subscription?.plan || 'monthly';
                                            setExtendPlan(defaultPlan);
                                            setExtendDays(getDefaultDays(defaultPlan));
                                          }}
                                          className="w-full px-3 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-850/60 font-semibold text-[10.5px] uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors"
                                        >
                                          <Plus className="w-3.5 h-3.5 text-blue-500" />
                                          <span>Extend</span>
                                        </button>
                                        
                                        {user.subscription && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveDropdownUserId(null);
                                              handleCancelSubscription(user);
                                            }}
                                            className="w-full px-3 py-2 text-amber-600 hover:bg-zinc-50 dark:hover:bg-zinc-850/60 font-semibold text-[10.5px] uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                            <span>Hapus Sub</span>
                                          </button>
                                        )}
                                        
                                        <div className="border-t border-zinc-100 dark:border-zinc-800/80 my-1" />
                                        
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveDropdownUserId(null);
                                            handleDeleteUser(user);
                                          }}
                                          className="w-full px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-semibold text-[10.5px] uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors"
                                        >
                                          <Trash className="w-3.5 h-3.5" />
                                          <span>Hapus</span>
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10">
                      <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-450 uppercase tracking-wider">
                        Halaman {currentPage} dari {totalPages}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          className="p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-655 dark:text-zinc-355 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-zinc-900 cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          className="p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-655 dark:text-zinc-355 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-zinc-900 cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs">
            <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
              
              {/* Close Button */}
              <button
                onClick={() => setSelectedUser(null)}
                className="absolute top-4 right-4 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-all cursor-pointer bg-white dark:bg-zinc-900 z-10"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Title */}
              <div className="shrink-0 mb-4 pr-8">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                  Perpanjang Langganan
                </h3>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                  Pilih paket dan durasi perpanjangan untuk {selectedUser.name} ({selectedUser.email}).
                </p>
              </div>

              {/* Feedback messages */}
              <AlertBanner message={extendError} type="error" />
              <AlertBanner message={extendSuccess} type="success" />

              {/* Form */}
              <form onSubmit={handleExtend} className="flex-1 overflow-y-auto space-y-4 pr-1">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-455 uppercase tracking-wider mb-1.5">Tipe Paket</label>
                  <select
                    value={extendPlan}
                    onChange={(e: any) => {
                      const val = e.target.value;
                      setExtendPlan(val);
                      setExtendDays(getDefaultDays(val));
                    }}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-all"
                  >
                    <option value="free">Free Plan</option>
                    <option value="daily">Daily Pass</option>
                    <option value="weekly">Weekly Pass</option>
                    <option value="monthly">Monthly Pass</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-450 uppercase tracking-wider mb-1.5">Jumlah Hari</label>
                  <input
                    type="number"
                    min="1"
                    value={extendDays}
                    onChange={(e) => setExtendDays(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-all font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="overwrite"
                    checked={overwriteExpiry}
                    onChange={(e) => setOverwriteExpiry(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-200 dark:border-zinc-800 text-blue-600 focus:ring-blue-500 bg-zinc-50 dark:bg-zinc-950"
                  />
                  <label htmlFor="overwrite" className="text-xs font-semibold text-zinc-600 dark:text-zinc-450 cursor-pointer select-none">
                    Mulai baru dari sekarang (Overwrite Expiry)
                  </label>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={extending}
                    className="px-4 py-2 bg-gradient-brand text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 cursor-pointer disabled:opacity-60"
                  >
                    {extending ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                    <span>Simpan</span>
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmOpen && deletingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs">
            <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Hapus Pengguna?
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                  Apakah Anda yakin ingin menghapus akun <strong>{deletingUser.name}</strong> ({deletingUser.email})? Tindakan ini permanen dan tidak dapat dibatalkan.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    setDeletingUser(null);
                  }}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteUser}
                  disabled={deleting}
                  className="px-4 py-2 bg-rose-650 hover:bg-rose-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 cursor-pointer disabled:opacity-60"
                >
                  {deleting ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash className="w-3.5 h-3.5" />
                  )}
                  <span>Hapus Permanen</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Subscription Confirmation Modal */}
        {cancelConfirmOpen && cancelingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs">
            <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Hapus Langganan?
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                  Apakah Anda yakin ingin menghapus/membatalkan paket langganan aktif milik <strong>{cancelingUser.name}</strong> ({cancelingUser.email})? Pengguna akan kembali ke status Free Trial.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setCancelConfirmOpen(false);
                    setCancelingUser(null);
                  }}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmCancelSubscription}
                  disabled={canceling}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 cursor-pointer disabled:opacity-60"
                >
                  {canceling ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <X className="w-3.5 h-3.5" />
                  )}
                  <span>Hapus Langganan</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
