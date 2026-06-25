import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { Broadcast, Channel, User } from '../../types';
import AdminLayout from '../layout/AdminLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, 
  History, 
  PlusCircle, 
  LogOut, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  RefreshCw, 
  BarChart2, 
  Layers, 
  User as UserIcon, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Activity,
  Zap,
  Globe
} from 'lucide-react';

interface OverviewData {
  total_broadcasts: number;
  sent_broadcasts: number;
  failed_broadcasts: number;
  scheduled_broadcasts: number;
  total_channels: number;
  active_channels: number;
}

interface BroadcastAnalytic {
  date: string;
  total: number;
  sent: number;
}

interface ChannelAnalytic {
  channel: { id: number; name: string; platform: string } | null;
  total: number;
  success: number;
  success_rate: number;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [broadcastsAnalytic, setBroadcastsAnalytic] = useState<BroadcastAnalytic[]>([]);
  const [channelsAnalytic, setChannelsAnalytic] = useState<ChannelAnalytic[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [copiedPromo, setCopiedPromo] = useState(false);

  const handleCopyPromo = () => {
    navigator.clipboard.writeText('AUTOIN1MINGGU');
    setCopiedPromo(true);
    setTimeout(() => setCopiedPromo(false), 2000);
  };

  const fetchData = async () => {
    try {
      const [u, ch, bc, ov, bcAnalytic, chAnalytic] = await Promise.all([
        api.get<User>('/api/me'),
        api.get<Channel[]>('/api/channels'),
        api.get<{ data: Broadcast[] }>('/api/broadcasts'),
        api.get<OverviewData>('/api/analytics/overview').catch(() => ({
          total_broadcasts: 0,
          sent_broadcasts: 0,
          failed_broadcasts: 0,
          scheduled_broadcasts: 0,
          total_channels: 0,
          active_channels: 0
        })),
        api.get<BroadcastAnalytic[]>('/api/analytics/broadcasts').catch(() => []),
        api.get<ChannelAnalytic[]>('/api/analytics/channels').catch(() => [])
      ]);

      setUser(u);
      setChannels(ch);
      setBroadcasts(bc.data);
      setOverview(ov);
      setBroadcastsAnalytic(bcAnalytic);
      setChannelsAnalytic(chAnalytic);
    } catch (error) {
      console.error("Gagal memuat data dashboard:", error);
    }
  };

  useEffect(() => {
    fetchData().finally(() => setLoading(false));

    // Polling data every 5 seconds for real-time updates
    const interval = setInterval(() => {
      fetchData();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    try {
      await api.post('/api/logout');
      localStorage.removeItem('autoin_token');
      window.location.href = '/';
    } catch {
      localStorage.removeItem('autoin_token');
      window.location.href = '/';
    }
  };

  if (loading) {
    return (
      <AdminLayout activePage="dashboard" title="Dashboard">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 animate-pulse">
          <div>
            <div className="h-7 w-56 bg-zinc-200 dark:bg-zinc-800 rounded-lg mb-2" />
            <div className="h-3 w-80 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </div>
          <div className="h-9 w-44 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
        </div>

        {/* Stat Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8 animate-pulse">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
              </div>
              <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
              <div className="h-3 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
            </div>
          ))}
        </div>

        {/* Chart Skeleton */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 mb-8 animate-pulse space-y-4">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-4 w-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
              <div className="h-3 w-64 bg-zinc-200 dark:bg-zinc-800 rounded" />
            </div>
            <div className="h-4 w-36 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </div>
          <div className="h-64 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl" />
        </div>

        {/* Akses Cepat & Bottom section skeletons */}
        <div className="space-y-8 animate-pulse">
          <div>
            <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, idx) => (
                <div key={idx} className="h-16 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900" />
              ))}
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Fallback calculations in case overview/analytics endpoints return zero or fail
  const totalBc = overview?.total_broadcasts || broadcasts.length;
  const sentCount = overview?.sent_broadcasts || broadcasts.filter((b) => b.status === 'sent').length;
  const failedCount = overview?.failed_broadcasts || broadcasts.filter((b) => b.status === 'failed').length;
  const scheduledCount = overview?.scheduled_broadcasts || broadcasts.filter((b) => b.status === 'scheduled').length;
  const activeCh = overview?.active_channels || channels.filter((c) => c.status === 'active').length;
  const totalCh = overview?.total_channels || channels.length;

  const successRate = totalBc > 0 ? Math.round((sentCount / totalBc) * 100) : 0;

  // Preprocess/format the 7-day broadcasts analytic
  const processedBcAnalytic = (() => {
    const days = [];
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Generate the last 7 days (up to today)
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0]; // e.g. "2026-06-23"
      const dayName = names[d.getDay()];
      days.push({
        dateStr,
        date: dayName, // Short day name, e.g. "Mon"
        total: 0,
        sent: 0
      });
    }

    // Merge actual backend analytics data if exists
    if (broadcastsAnalytic && broadcastsAnalytic.length > 0) {
      broadcastsAnalytic.forEach((item: any) => {
        const match = days.find((day) => day.dateStr === item.date);
        if (match) {
          match.total = Number(item.total || 0);
          match.sent = Number(item.sent || 0);
        }
      });
    }

    return days;
  })();

  // Render dummy channel analytics if empty
  const finalChAnalytic = channelsAnalytic.length > 0 ? channelsAnalytic : channels.map(c => ({
    channel: { id: c.id, name: c.name, platform: c.platform },
    total: 0,
    success: 0,
    success_rate: 0
  }));

  // Max value for y-axis calculation on chart
  const maxAnalyticVal = Math.max(...processedBcAnalytic.map(d => d.total), 5);

  // Pre-calculated paths for the SVG chart
  const totalPathD = processedBcAnalytic.map((day, idx) => {
    const x = 30 + (idx / 6) * 660;
    const y = 140 - (day.total / maxAnalyticVal) * 110;
    return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const totalAreaD = `M 30 140 ${processedBcAnalytic.map((day, idx) => {
    const x = 30 + (idx / 6) * 660;
    const y = 140 - (day.total / maxAnalyticVal) * 110;
    return `L ${x} ${y}`;
  }).join(' ')} L 690 140 Z`;

  const sentPathD = processedBcAnalytic.map((day, idx) => {
    const x = 30 + (idx / 6) * 660;
    const y = 140 - (day.sent / maxAnalyticVal) * 110;
    return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const sentAreaD = `M 30 140 ${processedBcAnalytic.map((day, idx) => {
    const x = 30 + (idx / 6) * 660;
    const y = 140 - (day.sent / maxAnalyticVal) * 110;
    return `L ${x} ${y}`;
  }).join(' ')} L 690 140 Z`;

  return (
    <AdminLayout activePage="dashboard" title="Dashboard" onRefresh={handleRefresh} refreshing={refreshing}>
      {/* Promo Banner */}
      <div className="mb-6 relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-600/5 to-transparent border border-blue-500/20 dark:border-blue-500/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/[0.02] rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center gap-3">
          <span className="text-2xl sm:text-3xl shrink-0 select-none">🎉</span>
          <div>
            <h4 className="font-extrabold text-sm text-zinc-900 dark:text-white uppercase tracking-wider">
              Free 7 Hari Langganan
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Gunakan kode promo berikut untuk mendapatkan gratis 7 hari akses premium. Klik kode untuk menyalin.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopyPromo}
            title="Klik untuk menyalin kode"
            className="group relative flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-950 border-2 border-dashed border-blue-500/40 dark:border-blue-500/30 hover:border-blue-500 rounded-xl transition-all duration-300 cursor-pointer shadow-sm active:scale-95"
          >
            <span className="font-mono font-black text-sm tracking-widest text-blue-600 dark:text-blue-450 group-hover:text-blue-700 dark:group-hover:text-blue-300">
              AUTOIN1MINGGU
            </span>
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors uppercase">
              {copiedPromo ? 'Tersalin! ✓' : 'Salin'}
            </span>
          </button>
        </div>
      </div>

      {/* Welcome Section */}
      <div className="flex flex-col gap-4 mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white font-display">
            Ringkasan Dashboard
          </h1>
          <p className="text-zinc-400 text-xs mt-1">
            Pantau kampanye broadcasting multi-channel dan integrasi otomatisasi kamu.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-zinc-100 dark:bg-zinc-950 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 self-start">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === 'overview' 
                ? 'tab-active' 
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === 'analytics' 
                ? 'tab-active' 
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Analisis Detail
          </button>
        </div>
      </div>

      <div className="relative">
        <div className={!channels.some(c => c.status === 'active') ? "filter blur-md select-none pointer-events-none opacity-45 transition-all duration-500" : "transition-all duration-500"}>
          {activeTab === 'overview' ? (
              <>
            {/* Overview Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              
              {/* Total Broadcasts */}
              <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 overflow-hidden group shadow-sm">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/[0.03] dark:bg-blue-500/[0.05] rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Total Broadcast</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">{totalBc}</div>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
                  <span>Aktif & Terkirim</span>
                </div>
              </div>

              {/* Success Rate Radial Progress */}
              <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 overflow-hidden group shadow-sm">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.05] rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Success Rate</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">{successRate}%</div>
                  {/* Radial Ring */}
                  <svg className="w-10 h-10 transform -rotate-90 shrink-0" viewBox="0 0 36 36">
                    <path
                      className="text-zinc-100 dark:text-zinc-800"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-emerald-500 transition-all duration-1000"
                      strokeWidth="3.5"
                      strokeDasharray={`${successRate}, 100`}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                </div>
                <div className="text-[10px] text-zinc-500 dark:text-zinc-500 mt-2">
                  {sentCount} sukses dari {totalBc} broadcast
                </div>
              </div>

              {/* Scheduled/Queued */}
              <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 overflow-hidden group shadow-sm">
                <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/[0.03] dark:bg-yellow-500/[0.05] rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Terjadwal</span>
                  <div className="w-8 h-8 rounded-lg bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-100 dark:border-yellow-500/20 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">{scheduledCount}</div>
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-2">
                  Menunggu jadwal pengiriman otomatis
                </div>
              </div>

              {/* Active Channels */}
              <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 overflow-hidden group shadow-sm">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/[0.03] dark:bg-purple-500/[0.05] rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Channel Aktif</span>
                  <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Globe className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">{activeCh} <span className="text-lg text-zinc-400 dark:text-zinc-500 font-normal">/ {totalCh}</span></div>
                <div className="text-[10px] text-zinc-500 dark:text-zinc-500 mt-2">
                  Channel terhubung & siap digunakan
                </div>
              </div>

            </div>

            {/* Chart Section */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 mb-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="font-bold text-xs text-zinc-900 dark:text-white uppercase tracking-wider font-sans">Aktivitas Broadcasting (7 Hari Terakhir)</h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Visualisasi realtime frekuensi pengiriman pesan</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-blue-500/20 border border-blue-500/50 rounded-full" />
                    Total Broadcast
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                    Sukses
                  </span>
                </div>
              </div>

              {/* Dynamic SVG Area Chart with interactive tooltips */}
              <div className="h-48 relative">
                
                {/* SVG Area Chart */}
                <svg className="w-full h-full" viewBox="0 0 720 160" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="totalGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15"/>
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.00"/>
                    </linearGradient>
                    <linearGradient id="sentGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25"/>
                      <stop offset="100%" stopColor="#2563eb" stopOpacity="0.00"/>
                    </linearGradient>
                  </defs>

                  {/* Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                    const y = 20 + p * 120;
                    return (
                      <line 
                        key={idx}
                        x1="30" 
                        y1={y} 
                        x2="690" 
                        y2={y} 
                        stroke="currentColor" 
                        strokeWidth="1"
                        className="text-zinc-200 dark:text-zinc-800/40" 
                        strokeDasharray="4 4"
                      />
                    );
                  })}

                  {/* Vertical Guideline on Hover */}
                  {hoveredIdx !== null && (
                    <line
                      x1={30 + (hoveredIdx / 6) * 660}
                      y1="20"
                      x2={30 + (hoveredIdx / 6) * 660}
                      y2="140"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="text-blue-500/30 dark:text-blue-400/30"
                      strokeDasharray="4 4"
                    />
                  )}

                  {/* Total Area & Line */}
                  <motion.path 
                    d={totalAreaD} 
                    fill="url(#totalGlow)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.2 }}
                  />
                  <motion.path 
                    d={totalPathD} 
                    fill="none" 
                    stroke="#3b82f6" 
                    strokeWidth="2.5" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.6"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />

                  {/* Success Area & Line */}
                  <motion.path 
                    d={sentAreaD} 
                    fill="url(#sentGlow)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.4 }}
                  />
                  <motion.path 
                    d={sentPathD} 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="3" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-blue-600 dark:text-blue-400"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />

                  {/* Interactive Nodes and hover triggers */}
                  {processedBcAnalytic.map((day, idx) => {
                    const x = 30 + (idx / 6) * 660;
                    const totalY = 140 - (day.total / maxAnalyticVal) * 110;
                    const sentY = 140 - (day.sent / maxAnalyticVal) * 110;
                    const isHovered = hoveredIdx === idx;
                    
                    return (
                      <g key={idx} className="group/dot cursor-pointer">
                        {/* Hidden tall capture rectangle for easier hover experience */}
                        <rect
                          x={x - 45}
                          y="10"
                          width="90"
                          height="140"
                          fill="transparent"
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredIdx(idx)}
                          onMouseLeave={() => setHoveredIdx(null)}
                        />
                        
                        {/* Glowing ping effect under success dot when hovered */}
                        {isHovered && (
                          <circle cx={x} cy={sentY} r="8" className="fill-blue-500/30 dark:fill-blue-400/30 animate-ping pointer-events-none" />
                        )}

                        <circle 
                          cx={x} 
                          cy={totalY} 
                          r={isHovered ? "6" : "4"} 
                          fill="#3b82f6" 
                          stroke="white" 
                          strokeWidth="1.5" 
                          className="transition-all duration-200 pointer-events-none" 
                        />
                        <circle 
                          cx={x} 
                          cy={sentY} 
                          r={isHovered ? "6" : "4"} 
                          className="fill-blue-600 dark:fill-blue-400 transition-all duration-200 pointer-events-none" 
                          stroke="white" 
                          strokeWidth="1.5" 
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Floating Tooltip Card */}
                <AnimatePresence>
                  {hoveredIdx !== null && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bg-zinc-950/95 dark:bg-white text-white dark:text-zinc-950 px-3.5 py-2.5 rounded-2xl shadow-xl border border-zinc-800 dark:border-zinc-200/20 text-xs pointer-events-none z-10"
                      style={{
                        left: `${((30 + (hoveredIdx / 6) * 660) / 720) * 100}%`,
                        top: '-10px',
                        transform: 'translateX(-50%)',
                      }}
                    >
                      <div className="font-bold text-zinc-400 dark:text-zinc-550 border-b border-zinc-800 dark:border-zinc-150 pb-1 mb-1 font-mono uppercase tracking-wider">
                        {processedBcAnalytic[hoveredIdx].dateStr}
                      </div>
                      <div className="space-y-0.5 min-w-[110px]">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-zinc-400 dark:text-zinc-500 font-medium">Total:</span>
                          <span className="font-bold text-blue-400 dark:text-blue-600">{processedBcAnalytic[hoveredIdx].total}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-emerald-450 dark:text-emerald-650 font-medium">Sukses:</span>
                          <span className="font-bold text-emerald-450 dark:text-emerald-600">{processedBcAnalytic[hoveredIdx].sent}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-red-400 dark:text-red-650 font-medium">Gagal:</span>
                          <span className="font-bold text-red-400 dark:text-red-600">
                            {processedBcAnalytic[hoveredIdx].total - processedBcAnalytic[hoveredIdx].sent}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* X Axis Labels */}
                <div className="flex justify-between px-7 mt-2">
                  {processedBcAnalytic.map((day, idx) => (
                    <span key={idx} className="text-[11px] text-zinc-400 dark:text-zinc-550 font-bold uppercase font-mono">{day.date}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="mb-8">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-4">Akses Cepat</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { href: '/broadcast', label: 'Buat Broadcast Baru', icon: PlusCircle, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20', desc: 'Kirim pesan instan ke banyak platform' },
                  { href: '/channels', label: 'Tambah & Hubungkan Channel', icon: Globe, color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border-purple-100 dark:border-purple-500/20', desc: 'WhatsApp' },
                  { href: '/broadcast/history', label: 'Riwayat Broadcast Lengkap', icon: History, color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 border-cyan-100 dark:border-cyan-500/20', desc: 'Log detail pengiriman dan response' },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={idx}
                      href={item.href}
                      className="group relative flex items-center gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 transition-all duration-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:-translate-y-0.5 shadow-sm"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${item.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <div className="font-semibold text-sm text-zinc-800 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.label}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate">{item.desc}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-500 dark:group-hover:text-zinc-300 transition-colors" />
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Main Double Grid: Channels & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Connected Channels Widget */}
              <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-bold text-base text-zinc-900 dark:text-white">Channel Terhubung</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Integrasi aktif messenger & API</p>
                  </div>
                  <a href="/channels" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 flex items-center gap-1 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-500/20 transition-all">
                    Kelola <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {channels.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/20">
                    <Globe className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mb-3" />
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">Belum ada channel terhubung</p>
                    <a href="/channels" className="bg-gradient-brand hover:opacity-95 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all">
                      + Tambah Channel
                    </a>
                  </div>
                ) : (
                  <div className="space-y-3 flex-1">
                    {channels.slice(0, 5).map((ch) => (
                      <div key={ch.id} className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50/50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-lg">
                            {platformIcon(ch.platform)}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{ch.name}</div>
                            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-mono tracking-wider mt-0.5">{ch.platform}</div>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${statusBadgeStyle(ch.status)}`}>
                          {ch.status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                    {channels.length > 5 && (
                      <a href="/channels" className="block text-center text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 py-2 transition-colors">
                        Lihat {channels.length - 5} channel lainnya →
                      </a>
                    )}
                  </div>
                )}
              </section>

              {/* Recent Broadcasts Widget */}
              <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-bold text-base text-zinc-900 dark:text-white">Log Broadcast Terbaru</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Riwayat kampanye pesan terakhir</p>
                  </div>
                  <a href="/broadcast" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 flex items-center gap-1 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-500/20 transition-all">
                    Buat Baru <PlusCircle className="w-3 h-3" />
                  </a>
                </div>

                {broadcasts.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/20">
                    <Layers className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mb-3" />
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">Belum ada broadcast terkirim</p>
                    <a href="/broadcast" className="bg-gradient-brand hover:opacity-95 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all">
                      Kirim Broadcast Pertama
                    </a>
                  </div>
                ) : (
                  <div className="space-y-3 flex-1">
                    {broadcasts.slice(0, 5).map((bc) => (
                      <div key={bc.id} className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50/50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                            {bc.title || bc.content}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                            <span>{new Date(bc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                            {bc.scheduled_at && (
                              <>
                                <span>•</span>
                                <span className="text-yellow-600 dark:text-yellow-500/80 font-medium">Scheduled</span>
                              </>
                            )}
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${broadcastStatusBadge(bc.status)}`}>
                          {bc.status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                    {broadcasts.length > 5 && (
                      <a href="/broadcast/history" className="block text-center text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 py-2 transition-colors">
                        Lihat {broadcasts.length - 5} broadcast lainnya →
                      </a>
                    )}
                  </div>
                )}
              </section>

            </div>
          </>
        ) : (
          /* Advanced Analytics Tab */
          <div className="space-y-8 animate-fadeIn">
            
            {/* Analytics Widgets Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Daily Delivery Area/Bar Chart */}
              <div className="lg:col-span-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-bold text-base text-zinc-900 dark:text-white">Frekuensi Pengiriman</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Jumlah broadcast terkirim 7 hari terakhir</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                      Total Broadcast
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                      Sukses
                    </span>
                  </div>
                </div>

                {/* SVG Area Chart */}
                <div className="h-64 relative pt-4">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none py-1">
                    {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => (
                      <div key={idx} className="w-full flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 h-0">
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-550 select-none bg-white dark:bg-zinc-900 px-1 -translate-y-2">
                          {Math.round(maxAnalyticVal * (1 - p))}
                        </span>
                        <div className="w-full h-px bg-zinc-200/20 dark:bg-zinc-800/10 border-t border-dashed border-zinc-200 dark:border-zinc-800" />
                      </div>
                    ))}
                  </div>

                  {/* Chart Bars */}
                  <div className="relative h-full flex items-end justify-between gap-3 pt-6 z-10 px-2">
                    {processedBcAnalytic.map((day, idx) => {
                      const totalPercent = (day.total / maxAnalyticVal) * 80 + 5; // scaled 0-80% height + 5% offset
                      const sentPercent = (day.sent / maxAnalyticVal) * 80 + 5;
                      
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer">
                          <div className="w-full flex items-end justify-center gap-1 h-[80%] relative">
                            {/* Hover tooltip */}
                            <div className="absolute bottom-full mb-2 bg-zinc-900 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-white rounded-lg p-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl min-w-[80px] text-center">
                              <div className="font-bold mb-0.5">{day.date}</div>
                              <div className="text-blue-400">Total: {day.total}</div>
                              <div className="text-emerald-400">Sent: {day.sent}</div>
                            </div>

                            {/* Total Bar */}
                            <div 
                              className="w-2 sm:w-3.5 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 dark:border-blue-500/40 rounded-t-sm group-hover:bg-blue-500/30 dark:group-hover:bg-blue-500/40 transition-all duration-300"
                              style={{ height: `${totalPercent}%` }}
                            />
                            {/* Sent/Success Bar */}
                            <div 
                              className="w-2 sm:w-3.5 bg-blue-600 dark:bg-blue-500 rounded-t-sm group-hover:bg-blue-500 dark:group-hover:bg-blue-400 transition-all duration-300"
                              style={{ height: `${sentPercent}%` }}
                            />
                          </div>
                          
                          {/* Date Label */}
                          <span className="text-xs text-zinc-500 dark:text-zinc-500 mt-3 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors">{day.date}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Delivery Stats Breakdowns */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col justify-between shadow-sm">
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-white mb-2">Statistik Pengiriman</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">Analisis kuantitatif dari log database</p>
                </div>

                <div className="space-y-4 flex-1 flex flex-col justify-center">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-600 dark:text-zinc-400">Terkirim (Sukses)</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{sentCount} ({successRate}%)</span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${successRate}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-600 dark:text-zinc-400">Gagal Kirim</span>
                      <span className="font-bold text-red-600 dark:text-red-400">{failedCount} ({totalBc > 0 ? Math.round((failedCount/totalBc)*100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800">
                      <div className="bg-red-500 h-full rounded-full" style={{ width: `${totalBc > 0 ? (failedCount/totalBc)*100 : 0}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-600 dark:text-zinc-400">Terjadwal/Antre</span>
                      <span className="font-bold text-yellow-600 dark:text-yellow-500">{scheduledCount}</span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800">
                      <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${totalBc > 0 ? (scheduledCount/totalBc)*100 : 0}%` }} />
                    </div>
                  </div>
                </div>

                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 mt-6 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span>Pembaruan otomatis</span>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" /> LIVE
                  </span>
                </div>
              </div>

            </div>

            {/* Performance per Channel Analytics */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
              <div className="mb-6">
                <h3 className="font-bold text-base text-zinc-900 dark:text-white">Kinerja Per Channel</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Delivery count dan success rate per platform</p>
              </div>

              {finalChAnalytic.length === 0 ? (
                <div className="text-center py-10 text-zinc-400 dark:text-zinc-500 text-sm">
                  Belum ada log pengiriman pada channel untuk dianalisis.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {finalChAnalytic.map((ch, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-800 transition-all duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{platformIcon(ch.channel?.platform || '')}</span>
                          <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200 truncate max-w-[120px]">{ch.channel?.name || 'Unknown'}</span>
                        </div>
                        <span className="text-[10px] bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold px-2 py-0.5 rounded">
                          {ch.channel?.platform.toUpperCase() || 'API'}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-500 dark:text-zinc-400">Total Broadcast:</span>
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">{ch.total}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-500 dark:text-zinc-400">Success Rate:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{ch.success_rate}%</span>
                        </div>
                        <div className="w-full bg-zinc-100 dark:bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${ch.success_rate}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        </div>

        {!channels.some(c => c.status === 'active') && (
          <div className="absolute inset-x-0 top-12 z-20 flex justify-center p-4">
            <div className="w-full max-w-lg bg-white/85 dark:bg-zinc-900/85 backdrop-blur-2xl border border-zinc-250 dark:border-zinc-800 rounded-3xl p-8 shadow-2xl text-center space-y-6 relative overflow-hidden">
              {/* Decorative glow */}
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
              
              {/* Glowing Icon */}
              <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <span className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 opacity-30 blur-sm animate-pulse" />
                <Radio className="w-10 h-10 text-white animate-pulse" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight font-display">
                  Hubungkan Perangkat Pertama Anda
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                  Untuk mulai menggunakan AutoIn, silakan hubungkan nomor WhatsApp Anda terlebih dahulu. Prosesnya cepat, aman, dan hanya membutuhkan scan QR code.
                </p>
              </div>
              
              <div className="pt-2">
                <a
                  href="/channels"
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-brand hover:opacity-95 text-white text-xs font-extrabold rounded-2xl transition-all shadow-lg shadow-blue-500/25 cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
                >
                  <PlusCircle className="w-4 h-4" />
                  Hubungkan Perangkat Sekarang
                </a>
              </div>
              
              <div className="flex items-center justify-center gap-6 text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  E2E Encrypted
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  Scan QR Instan
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                  Multi-Device
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function platformIcon(platform: string): string {
  const m: Record<string, string> = {
    whatsapp: '💬',
  };
  return m[platform] ?? '💬';
}

function statusBadgeStyle(status: string): string {
  if (status === 'active') return 'badge-emerald-gradient';
  if (status === 'error')  return 'badge-rose-gradient';
  return 'badge-gradient';
}

function broadcastStatusBadge(status: string): string {
  const m: Record<string, string> = {
    sent:      'badge-emerald-gradient',
    failed:    'badge-rose-gradient',
    scheduled: 'badge-amber-gradient',
    queued:    'badge-gradient',
    sending:   'badge-gradient animate-pulse',
    draft:     'badge-gradient',
  };
  return m[status] ?? 'badge-gradient';
}
