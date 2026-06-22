import React, { useState, useEffect } from 'react';
import AdminLayout from '../layout/AdminLayout';
import { Users, CreditCard, Search, Calendar, ChevronRight, Activity, Smartphone, Cpu, Link as LinkIcon, RefreshCw, BadgeAlert } from 'lucide-react';
import { api } from '../../lib/api';

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

  // Calculate statistics
  const totalUsers = subscribers.length;
  const activeSubs = subscribers.filter(s => s.subscription && s.subscription.plan !== 'free').length;
  
  // Calculate estimated monthly revenue
  const monthlyRevenue = subscribers.reduce((acc, curr) => {
    if (!curr.subscription) return acc;
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
        return <span className="px-2.5 py-1 text-[10px] font-extrabold text-blue-500 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full uppercase tracking-wider">Yearly Premium</span>;
      case 'monthly':
        return <span className="px-2.5 py-1 text-[10px] font-extrabold text-purple-500 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-full uppercase tracking-wider">Monthly</span>;
      case 'daily':
        return <span className="px-2.5 py-1 text-[10px] font-extrabold text-amber-500 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full uppercase tracking-wider">Daily Pass</span>;
      default:
        return <span className="px-2.5 py-1 text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 bg-zinc-500/10 border border-zinc-500/20 rounded-full uppercase tracking-wider">Free Trial</span>;
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
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                        <th className="px-6 py-4">Nama & Email</th>
                        <th className="px-6 py-4">Paket Langganan</th>
                        <th className="px-6 py-4">Mulai / Berakhir</th>
                        <th className="px-6 py-4 text-center">Integrasi Aktif</th>
                        <th className="px-6 py-4 text-center">Limit Trial</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                      {filtered.map((user) => (
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
