import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import AdminLayout from '../layout/AdminLayout';
import { 
  Ticket, Plus, Search, Trash2, ToggleLeft, ToggleRight, 
  Calendar, Users, Percent, HelpCircle, Loader2, CheckCircle2, AlertTriangle, Clock, X
} from 'lucide-react';

interface PromoUsage {
  id: number;
  user_id: number;
  redeemed_at: string;
  discount_amount: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

interface PromoCode {
  id: number;
  code: string;
  type: 'free_sub' | 'discount';
  value: number;
  plan_id: string | null;
  max_uses: number | null;
  uses_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  usages: PromoUsage[];
}

export default function PromoCodesManager() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // New promo form state
  const [code, setCode] = useState('');
  const [type, setType] = useState<'free_sub' | 'discount'>('free_sub');
  const [value, setValue] = useState(30);
  const [planId, setPlanId] = useState<string>('');
  const [maxUses, setMaxUses] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Selected promo usage modal
  const [selectedPromo, setSelectedPromo] = useState<PromoCode | null>(null);
  const [visibleUsagesCount, setVisibleUsagesCount] = useState(10);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    fetchCodes();
  }, []);

  useEffect(() => {
    setVisibleUsagesCount(10);
  }, [selectedPromo]);

  async function fetchCodes() {
    setLoading(true);
    try {
      const data = await api.get<PromoCode[]>('/api/admin/promo-codes');
      setCodes(data || []);
    } catch (err) {
      console.error('Failed to load promo codes:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code) return;
    
    setSubmitting(true);
    setMessage(null);

    try {
      const payload = {
        code: code.trim().toUpperCase(),
        type,
        value,
        plan_id: planId || null,
        max_uses: maxUses ? parseInt(maxUses) : null,
        expires_at: expiresAt || null
      };

      await api.post('/api/admin/promo-codes', payload);
      setMessage({ type: 'success', text: 'Kode promo berhasil dibuat!' });
      
      // Reset form
      setCode('');
      setPlanId('');
      setMaxUses('');
      setExpiresAt('');
      
      fetchCodes();
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || 'Gagal membuat kode promo.';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(promo: PromoCode) {
    try {
      await api.post(`/api/admin/promo-codes/${promo.id}/toggle`);
      setCodes(codes.map(c => c.id === promo.id ? { ...c, is_active: !c.is_active } : c));
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  }

  async function handleDeleteCode(id: number) {
    if (!confirm('Apakah Anda yakin ingin menghapus kode promo ini?')) return;
    try {
      await api.delete(`/api/admin/promo-codes/${id}`);
      setCodes(codes.filter(c => c.id !== id));
    } catch (err) {
      console.error('Failed to delete promo code:', err);
    }
  }

  // Filtered lists
  const filteredCodes = codes.filter(c => 
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.type.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination slicing
  const totalPages = Math.ceil(filteredCodes.length / itemsPerPage);
  const paginatedCodes = filteredCodes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getTargetPlanBadge = (plan: string | null) => {
    if (!plan) return <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-500 uppercase">Semua Paket</span>;
    return <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-500 uppercase">{plan}</span>;
  };

  return (
    <AdminLayout activePage="promo_codes" title="Kelola Kode Promo">
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white uppercase flex items-center gap-2">
              <Ticket className="w-5 h-5 text-blue-500" />
              Kode Promo & Voucher
            </h1>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
              Buat, aktifkan/nonaktifkan, dan lacak penggunaan kode promo gratis atau potongan harga.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Create Code Form */}
          <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-3xl p-5 md:p-6 shadow-xl h-fit">
            <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-blue-500" />
              Buat Kode Promo Baru
            </h3>
            
            {message && (
              <div className={`p-3.5 rounded-2xl border text-xs font-semibold mb-4 flex items-start gap-2.5 ${
                message.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
              }`}>
                {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleCreateCode} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">Kode Unik</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                  placeholder="Contoh: MERDEKA30, DISKON20"
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">Tipe Promo</label>
                <select
                  value={type}
                  onChange={(e) => {
                    const newType = e.target.value as 'free_sub' | 'discount';
                    setType(newType);
                    setValue(newType === 'free_sub' ? 30 : 20);
                  }}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-all"
                >
                  <option value="free_sub">Langganan Gratis (Hari)</option>
                  <option value="discount">Potongan Harga (%)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                  {type === 'free_sub' ? 'Jumlah Hari Gratis' : 'Persentase Potongan (%)'}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={value}
                  onChange={(e) => setValue(parseInt(e.target.value) || 0)}
                  placeholder={type === 'free_sub' ? 'Contoh: 30' : 'Contoh: 20'}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">Batasan Paket (Opsional)</label>
                <select
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-all"
                >
                  <option value="">Berlaku untuk semua paket</option>
                  <option value="daily">Daily Pass</option>
                  <option value="weekly">Weekly Pass</option>
                  <option value="monthly">Monthly Pass</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">Max Penggunaan</label>
                  <input
                    type="number"
                    min="1"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder="Tak terbatas"
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">Tgl Kedaluwarsa</label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-all font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 mt-2 btn-primary text-white rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Buat Kode Promo</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* List Promo Codes */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Filter and Search */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-4 shadow-md flex items-center gap-3">
              <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              <input
                type="text"
                placeholder="Cari kode promo..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none outline-none text-xs text-zinc-800 dark:text-zinc-200 w-full focus:ring-0"
              />
            </div>

            {/* List */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-3xl overflow-hidden shadow-xl">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <span className="text-xs text-zinc-400">Memuat data kode promo...</span>
                </div>
              ) : paginatedCodes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                  <Ticket className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-3" />
                  <h4 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-wider">Tidak ada kode promo</h4>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 max-w-xs">
                    Gunakan panel sebelah kiri untuk menambahkan voucher promo pertama Anda.
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop View Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                          <th className="px-6 py-4">Kode Promo</th>
                          <th className="px-6 py-4">Tipe & Value</th>
                          <th className="px-6 py-4">Target Paket</th>
                          <th className="px-6 py-4 text-center">Penggunaan</th>
                          <th className="px-6 py-4 text-center">Status</th>
                          <th className="px-6 py-4 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                        {paginatedCodes.map(promo => (
                          <tr key={promo.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-zinc-900 dark:text-white">
                              {promo.code}
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-semibold text-zinc-800 dark:text-zinc-300">
                                {promo.type === 'free_sub' ? `${promo.value} Hari Langganan` : `${promo.value}% Diskon`}
                              </span>
                              {promo.expires_at && (
                                <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                                  Exp: {new Date(promo.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {getTargetPlanBadge(promo.plan_id)}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => setSelectedPromo(promo)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-500/10 hover:border-transparent rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                              >
                                <Users className="w-3.5 h-3.5" />
                                <span>{promo.uses_count} {promo.max_uses ? `/ ${promo.max_uses}` : ''}</span>
                              </button>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => handleToggleStatus(promo)}
                                className="focus:outline-none transition-all cursor-pointer inline-flex"
                              >
                                {promo.is_active ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider">
                                    Aktif
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-zinc-400 bg-zinc-500/10 px-2 py-0.5 rounded border border-zinc-550/20 uppercase tracking-wider">
                                    Nonaktif
                                  </span>
                                )}
                              </button>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => handleDeleteCode(promo.id)}
                                className="p-1.5 text-rose-500 hover:text-white hover:bg-rose-500 border border-rose-500/10 hover:border-transparent rounded-lg transition-all cursor-pointer inline-flex"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile View Cards */}
                  <div className="block md:hidden p-4 space-y-4">
                    {paginatedCodes.map(promo => (
                      <div key={promo.id} className="bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-150 dark:border-zinc-800/80 rounded-2xl p-4 space-y-3 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-zinc-950 dark:text-white text-sm">
                            {promo.code}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleStatus(promo)}
                              className="focus:outline-none cursor-pointer"
                            >
                              {promo.is_active ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider">
                                  Aktif
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-zinc-400 bg-zinc-500/10 px-2 py-0.5 rounded border border-zinc-800/20 uppercase tracking-wider">
                                  Nonaktif
                                </span>
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteCode(promo.id)}
                              className="p-1.5 text-rose-500 hover:text-white hover:bg-rose-500 border border-rose-500/10 hover:border-transparent rounded-lg transition-all cursor-pointer inline-flex"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-[11px] py-1">
                          <div>
                            <span className="block text-zinc-400 dark:text-zinc-500 font-bold uppercase text-[9px] tracking-wider mb-0.5">Tipe & Value</span>
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                              {promo.type === 'free_sub' ? `${promo.value} Hari` : `${promo.value}% Diskon`}
                            </span>
                          </div>
                          <div>
                            <span className="block text-zinc-400 dark:text-zinc-500 font-bold uppercase text-[9px] tracking-wider mb-0.5">Target Paket</span>
                            {getTargetPlanBadge(promo.plan_id)}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-dashed border-zinc-200 dark:border-zinc-850">
                          <button
                            onClick={() => setSelectedPromo(promo)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                          >
                            <Users className="w-3 h-3" />
                            <span>Detail Pengguna ({promo.uses_count})</span>
                          </button>

                          {promo.expires_at && (
                            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono">
                              Exp: {new Date(promo.expires_at).toLocaleDateString('id-ID')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination Footer */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-zinc-100 dark:border-zinc-800/80 text-xs">
                      <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                        Halaman <span className="font-bold text-zinc-800 dark:text-zinc-200">{currentPage}</span> dari <span className="font-bold text-zinc-800 dark:text-zinc-200">{totalPages}</span>
                      </span>
                      <div className="flex gap-2">
                        <button
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(prev => prev - 1)}
                          className="p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-zinc-600 dark:text-zinc-400"
                        >
                          Sebelumnya
                        </button>
                        <button
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(prev => prev + 1)}
                          className="p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-zinc-600 dark:text-zinc-400"
                        >
                          Selanjutnya
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Selected Promo Users Details Modal */}
        {selectedPromo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-zinc-950/85 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl max-w-lg w-full space-y-5 text-zinc-900 dark:text-zinc-100">
              <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-blue-500" />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-zinc-800 dark:text-white">
                      Pengguna Kode: {selectedPromo.code}
                    </h3>
                    <p className="text-[9px] text-zinc-400 dark:text-zinc-500">Daftar pengguna yang telah meredeem voucher ini</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPromo(null)}
                  className="p-1 text-zinc-400 hover:text-zinc-655 cursor-pointer rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {selectedPromo.usages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-2" />
                  <span className="text-xs text-zinc-450 dark:text-zinc-500">Belum ada pengguna yang menggunakan kode ini.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div 
                    onScroll={(e) => {
                      const target = e.currentTarget;
                      if (target.scrollHeight - target.scrollTop <= target.clientHeight + 15) {
                        setVisibleUsagesCount(prev => Math.min(prev + 10, selectedPromo.usages.length));
                      }
                    }}
                    className="max-h-60 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/80 text-xs pr-1"
                  >
                    {selectedPromo.usages.slice(0, visibleUsagesCount).map(usage => (
                      <div key={usage.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-zinc-800 dark:text-white">{usage.user?.name || 'User'}</span>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{usage.user?.email || 'email@example.com'}</p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5 text-zinc-400" />
                            {new Date(usage.redeemed_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {visibleUsagesCount < selectedPromo.usages.length && (
                    <div className="flex justify-center items-center py-2 text-[10px] text-zinc-400 dark:text-zinc-500 animate-pulse">
                      <span>Scroll kebawah untuk memuat lebih banyak...</span>
                    </div>
                  )}
                  <div className="text-[9px] text-zinc-400 dark:text-zinc-500 text-right font-medium">
                    Menampilkan {Math.min(visibleUsagesCount, selectedPromo.usages.length)} dari {selectedPromo.usages.length} pemakai
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-zinc-150 dark:border-zinc-800">
                <button
                  onClick={() => setSelectedPromo(null)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
