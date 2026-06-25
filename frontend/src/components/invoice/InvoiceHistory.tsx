import React, { useState, useEffect } from 'react';
import AdminLayout from '../layout/AdminLayout';
import { Receipt, FileText, Download, CheckCircle, AlertCircle, Clock, CreditCard, Sparkles, Check, QrCode, X, Loader2, Search, ChevronLeft, ChevronRight, Ticket } from 'lucide-react';
import { api } from '../../lib/api';

interface Invoice {
  id: number;
  plan: 'daily' | 'weekly' | 'monthly' | 'yearly';
  started_at: string;
  expires_at: string | null;
  payment_id: string | null;
  created_at: string;
  promo_code?: string | null;
  discount_amount?: number;
  price_paid?: number | null;
}

interface Subscription {
  id: number;
  plan: 'free' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  started_at: string;
  expires_at: string | null;
}

export default function InvoiceHistory() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeSub, setActiveSub] = useState<Subscription | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyingPlan, setBuyingPlan] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [duitkuEnabled, setDuitkuEnabled] = useState(false);
  const [paymentWhatsappNumber, setPaymentWhatsappNumber] = useState('6281296451923');

  // Promo code states
  const [promoCode, setPromoCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string>('');
  const [appliedPromoDetails, setAppliedPromoDetails] = useState<any>(null);

  // Search & Pagination states
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);

  const PLANS = [
    {
      id: 'daily',
      name: 'Daily Pass',
      price: 1000,
      priceLabel: 'Rp 1.000',
      period: '/ hari',
      desc: 'Solusi paling fleksibel. Aktifkan hanya saat kamu butuh broadcast.',
      features: ['1 Device WhatsApp', 'Broadcast & Pesan Tanpa Batas', '5 Chatbot & 5 Plugin', '3 Webhook'],
      badge: 'Fleksibel'
    },
    {
      id: 'weekly',
      name: 'Weekly Pass',
      price: 7000,
      priceLabel: 'Rp 7.000',
      period: '/ minggu',
      desc: 'Hemat untuk pemakaian rutin sepanjang minggu.',
      features: ['1 Device WhatsApp', 'Broadcast & Pesan Tanpa Batas', '10 Chatbot & 10 Plugin', '5 Webhook'],
      badge: 'Hemat'
    },
    {
      id: 'monthly',
      name: 'Monthly Pass',
      price: 25000,
      priceLabel: 'Rp 25.000',
      period: '/ bulan',
      desc: 'Untuk bisnis & UMKM dengan intensitas broadcast harian tinggi.',
      features: ['5 Device WhatsApp', 'Chatbot, Plugin & Webhook Tanpa Batas', 'Semua Fitur Daily Pass', 'Antrean & Support Prioritas'],
      badge: 'Terpopuler',
      highlight: true
    }
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  async function loadData() {
    setLoading(true);
    try {
      const [historyData, activeData, configData, userData] = await Promise.all([
        api.get<Invoice[]>('/api/billing/history'),
        api.get<Subscription>('/api/billing/active'),
        api.get<{ duitku_enabled: boolean; payment_whatsapp_number?: string }>('/api/billing/config'),
        api.get<any>('/api/me')
      ]);
      setInvoices(historyData || []);
      setActiveSub(activeData || null);
      setDuitkuEnabled(configData?.duitku_enabled ?? false);
      if (configData?.payment_whatsapp_number) {
        setPaymentWhatsappNumber(configData.payment_whatsapp_number);
      }
      setCurrentUser(userData);
    } catch (err) {
      console.error('Failed to load billing details:', err);
    } finally {
      setLoading(false);
    }
  }

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const getPaymentMethod = (inv: Invoice) => {
    if (inv.payment_id === 'DIRECT-ADMIN') {
      return 'Direct Admin';
    }
    if (inv.price_paid === 0 || (inv.payment_id && inv.payment_id.startsWith('PROMO-'))) {
      return 'Redeem Kode';
    }
    return 'QRIS / Bank Transfer';
  };

  const getPricePaid = (inv: Invoice) => {
    if (inv.price_paid === 0 || (inv.payment_id && (inv.payment_id.startsWith('PROMO-') || inv.payment_id === 'DIRECT-ADMIN'))) {
      return 0;
    }
    if (inv.price_paid !== undefined && inv.price_paid !== null) {
      return inv.price_paid;
    }
    const matchedPlan = PLANS.find(p => p.id === inv.plan);
    return matchedPlan?.price ?? 0;
  };

  const getStatusBadge = (expiresAt: string | null) => {
    if (!expiresAt) {
      return (
        <span className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded badge-emerald-gradient">
          <CheckCircle className="w-3 h-3" /> Aktif Selamanya
        </span>
      );
    }
    const isFuture = new Date(expiresAt).getTime() > Date.now();
    if (isFuture) {
      return (
        <span className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded badge-emerald-gradient">
          <CheckCircle className="w-3 h-3" /> Aktif
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded badge-rose-gradient">
        <AlertCircle className="w-3 h-3" /> Berakhir
      </span>
    );
  };

  async function handleRedeemPromo(e: React.FormEvent) {
    e.preventDefault();
    if (!promoCode.trim()) return;

    setRedeeming(true);
    setPromoError('');
    setPromoSuccess('');

    try {
      const checkRes = await api.post<any>('/api/billing/promo/check', {
        code: promoCode.trim()
      });

      if (checkRes.valid) {
        if (checkRes.type === 'free_sub') {
          const redeemRes = await api.post<any>('/api/billing/promo/redeem', {
            code: promoCode.trim()
          });
          setPromoSuccess(redeemRes.message || 'Voucher gratis berhasil di-redeem!');
          setPromoCode('');
          loadData();
        } else if (checkRes.type === 'discount') {
          setAppliedPromo(checkRes.code);
          setAppliedPromoDetails(checkRes);
          setPromoSuccess(`Diskon ${checkRes.value}% berhasil diterapkan! Diskon akan aktif saat Anda checkout paket di bawah.`);
          setPromoCode('');
        }
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || 'Kode promo tidak valid atau sudah kedaluwarsa.';
      setPromoError(errMsg);
    } finally {
      setRedeeming(false);
    }
  }

  async function handleBuyPlan(plan: any) {
    if (!duitkuEnabled) {
      const text = encodeURIComponent(`Halo Admin, saya tertarik untuk berlangganan paket Autoin (${plan.name}).`);
      window.open(`https://wa.me/${paymentWhatsappNumber}?text=${text}`, '_blank');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post<{ token?: string; is_sandbox?: boolean; success_activated?: boolean; message?: string }>('/api/billing/purchase', {
        plan: plan.id,
        promo_code: appliedPromo || undefined
      });
      
      if (res && res.success_activated) {
        alert(res.message || 'Kode promo berhasil digunakan! Paket Anda telah aktif.');
        setAppliedPromo('');
        setAppliedPromoDetails(null);
        loadData();
        return;
      }

      if (res && res.token) {
        if (typeof (window as any).checkout !== 'undefined') {
          (window as any).checkout.process(res.token, {
            successHandler: function (result: any) {
              console.log('Success:', result);
              alert('Pembayaran sukses! Langganan Anda akan segera aktif.');
              setAppliedPromo('');
              setAppliedPromoDetails(null);
              loadData();
            },
            pendingHandler: function (result: any) {
              console.log('Pending:', result);
              alert('Pembayaran pending. Silakan selesaikan pembayaran Anda.');
            },
            errorHandler: function (result: any) {
              console.error('Error:', result);
              alert('Pembayaran gagal atau dibatalkan.');
            },
            closeHandler: function () {
              console.log('Popup closed');
            }
          });
        } else {
          alert('Duitku payment library failed to load. Please refresh and try again.');
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || err.message || 'Gagal memproses pembayaran. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  const filteredInvoices = invoices.filter((inv) => {
    const matchedPlan = PLANS.find(p => p.id === inv.plan);
    const planName = (matchedPlan?.name ?? inv.plan).toLowerCase();
    const invoiceId = `INV-BILL-${inv.id}`.toLowerCase();
    const paymentId = (inv.payment_id || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return planName.includes(query) || invoiceId.includes(query) || paymentId.includes(query);
  });

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <AdminLayout activePage="invoice" title="Invoice & Tagihan">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Top Info */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <div>
            <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              Upgrade & Invoice Tagihan
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Kelola subscription premium Autoin dan pantau riwayat invoice pembayaran Anda.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
            {/* Current Subscription Card */}
            <div className="bg-white dark:bg-[#0c0c0e]/80 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl px-5 py-3.5 flex items-center gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Paket Saat Ini</div>
                <div className="text-xs font-extrabold text-zinc-950 dark:text-white mt-0.5 flex items-center gap-2">
                  <span className="capitalize">{activeSub?.plan ?? 'Free Trial'}</span>
                  {getStatusBadge(activeSub?.expires_at ?? null)}
                </div>
                {activeSub?.expires_at && (
                  <div className="text-[9px] text-zinc-500 dark:text-zinc-500 mt-1">
                    Hingga: {new Date(activeSub.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                )}
              </div>
            </div>

            {/* Redeem Voucher Card */}
            <div className="bg-white dark:bg-[#0c0c0e]/80 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl px-5 py-3.5 flex flex-col justify-center gap-2 shadow-sm min-w-[260px]">
              <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Punya Kode Promo / Voucher?</div>
              <form onSubmit={handleRedeemPromo} className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                  placeholder="KODEPROMO"
                  className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-all font-mono w-full"
                />
                <button
                  type="submit"
                  disabled={redeeming}
                  className="px-4 py-1.5 btn-primary text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  Apply
                </button>
              </form>
              {promoError && <p className="text-[9px] text-rose-500 font-medium">{promoError}</p>}
              {promoSuccess && <p className="text-[9px] text-emerald-500 font-medium">{promoSuccess}</p>}
            </div>
          </div>
        </div>

        {/* Pricing Upgrade Grid */}
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider font-sans">Upgrade Langganan Premium</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Pilih paket langganan terbaik untuk memaksimalkan performa broadcast Anda.</p>
          </div>

          {appliedPromoDetails && (
            <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-between shadow-sm animate-pulse">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4" />
                <span>Voucher aktif: <strong className="font-mono">{appliedPromoDetails.code}</strong> (Potongan {appliedPromoDetails.value}% pada checkout paket)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAppliedPromo('');
                  setAppliedPromoDetails(null);
                }}
                className="text-[10px] uppercase font-bold text-rose-500 hover:text-rose-600 cursor-pointer"
              >
                Hapus
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-stretch max-w-4xl mx-auto">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-6 border flex flex-col transition-all duration-300 ${
                  plan.highlight
                    ? 'bg-gradient-to-b from-blue-50/50 to-white dark:from-blue-950/20 dark:to-zinc-950/40 border-blue-500/50 shadow-[0_0_30px_rgba(37,99,235,0.06)]'
                    : 'bg-white dark:bg-[#0c0c0e]/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                {plan.badge && (
                  <span className="absolute top-4 right-4 bg-blue-600/10 text-blue-600 dark:text-blue-400 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-lg border border-blue-500/20">
                    {plan.badge}
                  </span>
                )}
                
                <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">{plan.name}</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-[10px] mt-1 leading-relaxed">{plan.desc}</p>
                
                {/* Price Display */}
                {appliedPromoDetails && 
                 appliedPromoDetails.type === 'discount' && 
                 (!appliedPromoDetails.plan_id || appliedPromoDetails.plan_id === plan.id) ? (
                  <div className="flex flex-col mt-4 mb-5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold text-emerald-500 tracking-tight">
                        {formatRupiah(plan.price - Math.round(plan.price * (appliedPromoDetails.value / 100)))}
                      </span>
                      <span className="text-zinc-400 dark:text-zinc-500 text-[11px] font-semibold">{plan.period}</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1 mt-0.5">
                      <span className="line-through">{plan.priceLabel}</span>
                      <span className="text-emerald-500 font-bold bg-emerald-500/10 px-1 py-0.2 rounded text-[9px] uppercase tracking-wider">
                        Diskon {appliedPromoDetails.value}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1 mt-4 mb-5">
                    <span className="text-2xl font-extrabold text-zinc-950 dark:text-white tracking-tight">{plan.priceLabel}</span>
                    <span className="text-zinc-400 dark:text-zinc-500 text-[11px] font-semibold">{plan.period}</span>
                  </div>
                )}

                <div className="h-px bg-zinc-100 dark:bg-zinc-800/80 w-full mb-5" />

                <ul className="flex-1 space-y-3 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[11px] text-zinc-600 dark:text-zinc-400 leading-normal">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                 <button
                   type="button"
                   onClick={() => handleBuyPlan(plan)}
                   disabled={submitting}
                   className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer disabled:opacity-60 ${
                     plan.highlight
                       ? 'btn-primary text-white shadow-md'
                       : 'bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-250 dark:border-zinc-800'
                   }`}
                 >
                   Beli Paket
                 </button>
              </div>
            ))}
          </div>
        </div>

        {/* Invoice Section */}
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider font-sans">Riwayat Pembayaran</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Daftar transaksi billing dan invoice pembelian yang tercatat di akun Anda.</p>
          </div>

          <div className="bg-white dark:bg-[#0c0c0e]/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            {/* Search Bar */}
            {invoices.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-900/10 p-4 border-b border-zinc-200 dark:border-zinc-800">
                <div className="relative flex-1 max-w-sm">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari ID invoice atau paket..."
                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-all shadow-sm"
                  />
                </div>
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-wider">
                  Total: {filteredInvoices.length} Invoice
                </span>
              </div>
            )}

            {loading ? (
              <div className="p-12 text-center text-xs text-zinc-500 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                <span>Memuat riwayat invoice...</span>
              </div>
            ) : invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-400 dark:text-zinc-500 px-4">
                <Receipt className="w-9 h-9 mb-2 opacity-50 text-blue-500" />
                <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Belum ada invoice</h3>
                <p className="text-[10px] text-zinc-550 dark:text-zinc-400 max-w-xs mt-1 leading-relaxed">
                  Semua transaksi upgrade langganan Anda akan tercatat secara otomatis di sini.
                </p>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400 dark:text-zinc-500 px-4">
                <Search className="w-8 h-8 mb-2 opacity-40 text-zinc-400" />
                <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Tidak ada hasil ditemukan</h3>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 max-w-xs mt-1 leading-relaxed">
                  Coba gunakan kata kunci pencarian yang berbeda.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop view (Hidden on mobile) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                        <th className="px-6 py-4">Invoice ID</th>
                        <th className="px-6 py-4">Paket</th>
                        <th className="px-6 py-4">Metode & ID Pembayaran</th>
                        <th className="px-6 py-4">Tanggal Transaksi</th>
                        <th className="px-6 py-4">Total</th>
                        <th className="px-6 py-4 text-center">Status</th>
                        <th className="px-6 py-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                      {paginatedInvoices.map((inv) => {
                        const matchedPlan = PLANS.find(p => p.id === inv.plan);
                        return (
                          <tr key={inv.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-zinc-800 dark:text-zinc-200">
                              INV-BILL-{inv.id}
                            </td>
                            <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-white capitalize">
                              <div>{matchedPlan?.name ?? inv.plan}</div>
                              {inv.promo_code && (
                                <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 uppercase tracking-wider font-mono">
                                  Promo: {inv.promo_code}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-zinc-800 dark:text-zinc-300">
                                {getPaymentMethod(inv)}
                              </div>
                              <div className="text-[9px] font-mono text-zinc-400 mt-0.5">{inv.payment_id || '—'}</div>
                            </td>
                            <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">
                              {new Date(inv.created_at).toLocaleString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="px-6 py-4 font-extrabold text-zinc-900 dark:text-white">
                              {getPricePaid(inv) === 0 ? (
                                <span className="text-emerald-500 font-mono">Rp 0</span>
                              ) : (
                                <>
                                  <span>{formatRupiah(getPricePaid(inv))}</span>
                                  {inv.discount_amount && inv.discount_amount > 0 ? (
                                    <span className="block text-[9px] text-zinc-400 dark:text-zinc-500 line-through font-normal">
                                      {formatRupiah(matchedPlan?.price ?? 0)}
                                    </span>
                                  ) : null}
                                </>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider">
                                Lunas
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                type="button"
                                onClick={() => setPrintingInvoice(inv)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white dark:text-blue-400 dark:hover:text-white border border-blue-500/10 hover:border-transparent rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Cetak</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile list view (Hidden on desktop) */}
                <div className="block md:hidden divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                  {paginatedInvoices.map((inv) => {
                    const matchedPlan = PLANS.find(p => p.id === inv.plan);
                    return (
                      <div key={inv.id} className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                            INV-BILL-{inv.id}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider">
                            Lunas
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="block text-zinc-400 dark:text-zinc-500 font-bold uppercase text-[9px] tracking-wider">Paket</span>
                            <span className="font-semibold text-zinc-900 dark:text-white capitalize block">
                              {matchedPlan?.name ?? inv.plan}
                            </span>
                            {inv.promo_code && (
                              <span className="mt-1 inline-flex items-center gap-1 text-[8px] font-bold text-blue-500 bg-blue-500/10 px-1 py-0.5 rounded border border-blue-500/20 uppercase tracking-wider font-mono">
                                Promo: {inv.promo_code}
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="block text-zinc-400 dark:text-zinc-500 font-bold uppercase text-[9px] tracking-wider">Total</span>
                            <span className="font-extrabold text-zinc-900 dark:text-white">
                              {getPricePaid(inv) === 0 ? (
                                <span className="text-emerald-500 font-mono">Rp 0</span>
                              ) : (
                                <>
                                  <span>{formatRupiah(getPricePaid(inv))}</span>
                                  {inv.discount_amount && inv.discount_amount > 0 ? (
                                    <span className="block text-[9px] text-zinc-400 dark:text-zinc-500 line-through font-normal">
                                      {formatRupiah(matchedPlan?.price ?? 0)}
                                    </span>
                                  ) : null}
                                </>
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="text-[11px] space-y-1.5 pt-2 border-t border-dashed border-zinc-100 dark:border-zinc-800/80">
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-400 dark:text-zinc-500 font-semibold">Metode: </span>
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{getPaymentMethod(inv)}</span>
                          </div>
                          <div>
                            <span className="text-zinc-400 dark:text-zinc-500 font-semibold">Payment ID: </span>
                            <span className="font-mono text-zinc-700 dark:text-zinc-300">{inv.payment_id || '—'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-500 text-[10px]">
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              {new Date(inv.created_at).toLocaleString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPrintingInvoice(inv)}
                            className="w-full mt-2 py-2 bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white dark:text-blue-400 dark:hover:text-white border border-blue-500/10 hover:border-transparent font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Cetak PDF Invoice</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10">
                    <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-455 uppercase tracking-wider">
                      Halaman {currentPage} dari {totalPages}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        className="p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-650 dark:text-zinc-350 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-zinc-900 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        className="p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-650 dark:text-zinc-350 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-zinc-900 cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        {/* Loading Overlay */}
        {submitting && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 dark:bg-zinc-950/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-4 text-center max-w-xs">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Menghubungkan Duitku</h4>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                  Harap tunggu selagi kami mempersiapkan halaman pembayaran aman Anda.
                </p>
              </div>
            </div>
          </div>
        )}

        {printingInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-zinc-950/85 backdrop-blur-xs p-4 overflow-y-auto">
            <style dangerouslySetInnerHTML={{__html: `
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #printable-invoice-modal, #printable-invoice-modal * {
                  visibility: visible !important;
                }
                #printable-invoice-modal {
                  position: fixed !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  height: auto !important;
                  margin: 0 !important;
                  padding: 24px !important;
                  background: white !important;
                  color: black !important;
                  z-index: 99999 !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            `}} />
            
            <div id="printable-invoice-modal" className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl max-w-xl w-full space-y-6 text-zinc-900 dark:text-zinc-100">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-zinc-200 dark:border-zinc-800 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-sm border border-zinc-200 dark:border-zinc-700">
                    <img src="/autoin-logo.webp" alt="Autoin Logo" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white">AUTOIN INDONESIA</h3>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">WhatsApp Automation & Chatbot Platform</p>
                    <p className="text-[9px] text-zinc-400 dark:text-zinc-550 mt-0.5">Bukti Transaksi & Pembayaran Resmi</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 uppercase tracking-widest">
                    LUNAS / PAID
                  </span>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Diterbitkan Untuk</span>
                  <span className="font-bold block text-zinc-800 dark:text-zinc-200">{currentUser?.name || 'Pelanggan Autoin'}</span>
                  <span className="text-[10px] text-zinc-450 dark:text-zinc-500 block mt-0.5">{currentUser?.email || 'Pembelian via Portal Mandiri'}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Nomor Invoice</span>
                  <span className="font-mono font-bold block text-zinc-800 dark:text-zinc-250">INV-BILL-{printingInvoice.id}</span>
                  <span className="text-[10px] text-zinc-450 dark:text-zinc-500 block mt-1">Tanggal Transaksi:</span>
                  <span className="text-[10px] text-zinc-700 dark:text-zinc-300 font-semibold">
                    {new Date(printingInvoice.created_at).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              {/* Item details */}
              <div className="border border-zinc-150 dark:border-zinc-800 rounded-2xl overflow-hidden bg-zinc-50/50 dark:bg-zinc-950/20">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-150 dark:border-zinc-800 text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      <th className="px-4 py-2.5">Item Deskripsi</th>
                      <th className="px-4 py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-zinc-150 dark:border-zinc-850/40">
                      <td className="px-4 py-3">
                        <span className="font-bold text-zinc-800 dark:text-white capitalize">
                          Langganan Autoin - {PLANS.find(p => p.id === printingInvoice.plan)?.name ?? printingInvoice.plan}
                        </span>
                        <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                          Akses ke semua fitur premium, broadcast, rules chatbot, dan webhook API.
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-zinc-900 dark:text-white">
                        {getPricePaid(printingInvoice) === 0 
                          ? 'Rp 0' 
                          : formatRupiah(PLANS.find(p => p.id === printingInvoice.plan)?.price ?? 0)}
                      </td>
                    </tr>
                    <tr className="bg-zinc-100/50 dark:bg-zinc-950/40 font-bold text-zinc-900 dark:text-white">
                      <td className="px-4 py-2.5 text-right uppercase text-[9px] text-zinc-400 dark:text-zinc-500">Subtotal:</td>
                      <td className="px-4 py-2.5 text-right">
                        {getPricePaid(printingInvoice) === 0 
                          ? 'Rp 0' 
                          : formatRupiah(PLANS.find(p => p.id === printingInvoice.plan)?.price ?? 0)}
                      </td>
                    </tr>
                    {printingInvoice.promo_code && (
                      <tr className="bg-blue-50/20 dark:bg-blue-950/10 font-bold text-blue-600 dark:text-blue-400 border-b border-zinc-150 dark:border-zinc-800/80">
                        <td className="px-4 py-2.5 text-right uppercase text-[9px] font-bold text-zinc-500 dark:text-zinc-400">
                          Kode Promo ({printingInvoice.promo_code}):
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          -{formatRupiah(printingInvoice.discount_amount ?? 0)}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-zinc-200/50 dark:bg-zinc-900/60 font-black text-zinc-950 dark:text-white text-sm">
                      <td className="px-4 py-3 text-right uppercase text-[10px] text-zinc-500 dark:text-zinc-400">Total Akhir:</td>
                      <td className="px-4 py-3 text-right">
                        {formatRupiah(getPricePaid(printingInvoice))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Payment Details info */}
              <div className="bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/10 p-3.5 rounded-2xl space-y-1">
                <span className="block text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Detail Pembayaran</span>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-zinc-500 dark:text-zinc-400 font-medium">Metode Pembayaran:</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    {getPaymentMethod(printingInvoice)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-zinc-500 dark:text-zinc-400 font-medium">ID Pembayaran:</span>
                  <span className="font-mono font-bold text-zinc-800 dark:text-zinc-250">{printingInvoice.payment_id || 'Manual Order'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-150 dark:border-zinc-800 no-print">
                <button
                  type="button"
                  onClick={() => setPrintingInvoice(null)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2 btn-primary text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Cetak Sekarang
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
