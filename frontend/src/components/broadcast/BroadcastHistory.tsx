import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { Broadcast } from '../../types';
import AdminLayout from '../layout/AdminLayout';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Calendar, 
  History, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ChevronRight,
  ExternalLink,
  Loader2,
  Trash2
} from 'lucide-react';

export default function BroadcastHistory() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const fetchBroadcasts = () => {
    setLoading(true);
    api.get<{ data: Broadcast[] }>('/api/broadcasts')
      .then((r) => setBroadcasts(r.data))
      .finally(() => setLoading(false));
  };

  // Filter logic
  const filteredBroadcasts = broadcasts.filter((bc) => {
    const matchesSearch = 
      (bc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) || 
      bc.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || bc.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout activePage="broadcast" title="Riwayat Broadcast">
      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari kata kunci pesan..."
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-900 dark:text-zinc-150 placeholder-zinc-400 dark:placeholder-zinc-650 focus:outline-none focus:border-blue-500 transition-all"
          />
        </div>

        {/* Status Chips */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto overflow-x-auto justify-end">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'sent', label: 'Sukses' },
            { id: 'failed', label: 'Gagal' },
            { id: 'scheduled', label: 'Terjadwal' },
            { id: 'queued', label: 'Antre' }
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setStatusFilter(chip.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                statusFilter === chip.id 
                  ? 'bg-blue-50 dark:bg-blue-600/10 border-blue-200 dark:border-blue-500/40 text-blue-600 dark:text-blue-400' 
                  : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-405 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-850'
              }`}
            >
              {chip.label}
            </button>
          ))}
          
          <button 
            onClick={fetchBroadcasts} 
            disabled={loading}
            className="text-xs bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer text-zinc-700 dark:text-zinc-300 ml-2"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <History className="w-3.5 h-3.5" />}
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="animate-pulse rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
                </div>
                <div className="h-4 w-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-3.5 w-64 bg-zinc-200 dark:bg-zinc-800 rounded" />
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="h-8 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
                <div className="h-8 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredBroadcasts.length === 0 ? (
        /* Empty State */
        <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-950/20 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl p-8">
          <History className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">Tidak ada riwayat broadcast yang cocok</p>
          <a 
            href="/broadcast" 
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-all text-xs cursor-pointer"
          >
            Buat Campaign Baru
          </a>
        </div>
      ) : (
        /* Broadcast Log List */
        <div className="space-y-4">
          {filteredBroadcasts.map((bc) => (
            <div 
              key={bc.id} 
              className="group relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              {/* Left Section */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-blue-600 dark:text-blue-400 text-[10px] font-bold tracking-wider font-mono">ID: #{bc.id}</span>
                  <span className="text-zinc-300 dark:text-zinc-750 text-xs">•</span>
                  <span className="flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                    <Calendar className="w-3 h-3" />
                    {new Date(bc.created_at).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 truncate max-w-xl group-hover:text-blue-600 dark:group-hover:text-blue-450 transition-colors">
                  {bc.title || 'Broadcast Tanpa Judul'}
                </h3>
                
                <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1.5 leading-relaxed line-clamp-2 pr-4 font-normal">
                  {bc.content}
                </p>

                {bc.scheduled_at && (
                  <div className="flex items-center gap-1.5 mt-3 text-[10px] text-yellow-650 bg-yellow-50 dark:bg-yellow-500/10 px-2.5 py-1 rounded-md border border-yellow-250 dark:border-yellow-500/20 w-fit font-medium">
                    <Clock className="w-3 h-3" />
                    <span>Terjadwal: {new Date(bc.scheduled_at).toLocaleString('id-ID')}</span>
                  </div>
                )}
              </div>

              {/* Right Badge Status & Action */}
              <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800 pt-3 sm:pt-0">
                <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border tracking-wide uppercase ${statusColor(bc.status)}`}>
                  {bc.status}
                </span>
                
                <div className="flex items-center gap-2">
                  <span className="text-zinc-200 dark:text-zinc-800 text-xs hidden sm:inline">•</span>
                  <div className="w-8 h-8 rounded-lg bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center border border-zinc-200 dark:border-zinc-800 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-850 group-hover:border-zinc-300 dark:group-hover:border-zinc-750 transition-all">
                    <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

function statusColor(s: string): string {
  const m: Record<string, string> = {
    sent:      'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20 shadow-sm',
    failed:    'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20 shadow-sm',
    scheduled: 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-100 dark:border-yellow-500/20',
    queued:    'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-450 border-blue-100 dark:border-blue-500/20',
    sending:   'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-450 border-blue-100 dark:border-blue-500/20 animate-pulse',
    draft:     'bg-zinc-100 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800',
  };
  return m[s] ?? 'bg-zinc-100 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800';
}
