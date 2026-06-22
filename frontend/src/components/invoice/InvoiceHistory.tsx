import React, { useState, useEffect } from 'react';
import AdminLayout from '../layout/AdminLayout';
import { Receipt, FileText, Download, CheckCircle, AlertCircle, Clock, CreditCard, Sparkles, Check, QrCode, X, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

interface Invoice {
  id: number;
  plan: 'daily' | 'monthly' | 'yearly';
  started_at: string;
  expires_at: string | null;
  payment_id: string | null;
  created_at: string;
}

interface Subscription {
  id: number;
  plan: 'free' | 'daily' | 'monthly' | 'yearly';
  started_at: string;
  expires_at: string | null;
}

export default function InvoiceHistory() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeSub, setActiveSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyingPlan, setBuyingPlan] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  const PLANS = [
    {
      id: 'daily',
      name: 'Daily Pass',
      price: 1000,
      priceLabel: 'Rp 1.000',
      period: '/ hari',
      desc: 'Solusi paling fleksibel. Aktifkan hanya saat kamu butuh broadcast.',
      features: ['Pesan Broadcast Unlimited', 'Semua Device Connected', 'Prioritas Pengiriman Tinggi', 'Full Auto-Reply & Webhook'],
      badge: 'Fleksibel'
    },
    {
      id: 'monthly',
      name: 'Monthly Pass',
      price: 25000,
      priceLabel: 'Rp 25.000',
      period: '/ bulan',
      desc: 'Untuk bisnis & UMKM dengan intensitas broadcast harian tinggi.',
      features: ['Semua Fitur Daily Pass', 'Priority Queue System', 'Priority Support 24/7', 'Advanced Webhook logs'],
      badge: 'Terpopuler',
      highlight: true
    },
    {
      id: 'yearly',
      name: 'Yearly Pass',
      price: 199000,
      priceLabel: 'Rp 199.000',
      period: '/ tahun',
      desc: 'Investasi terbaik untuk operasional bisnis jangka panjang Anda.',
      features: ['Semua Fitur Monthly', 'Menghemat hingga 35%', 'Sesi Konsultasi Setup awal', 'Free Update Selamanya'],
      badge: 'Terbaik'
    }
  ];

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [historyData, activeData] = await Promise.all([
        api.get<Invoice[]>('/api/billing/history'),
        api.get<Subscription>('/api/billing/active')
      ]);
      setInvoices(historyData || []);
      setActiveSub(activeData || null);
    } catch (err) {
      console.error('Failed to load billing details:', err);
    } finally {
      setLoading(false);
    }
  }

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const getStatusBadge = (expiresAt: string | null) => {
    if (!expiresAt) {
      return (
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          <CheckCircle className="w-3 h-3" /> Aktif Selamanya
        </span>
      );
    }
    const isFuture = new Date(expiresAt).getTime() > Date.now();
    if (isFuture) {
      return (
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          <CheckCircle className="w-3 h-3" /> Aktif
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 bg-zinc-500/10 px-2 py-0.5 rounded border border-zinc-500/20">
        <AlertCircle className="w-3 h-3" /> Berakhir
      </span>
    );
  };

  async function handleConfirmPurchase() {
    if (!buyingPlan) return;
    setSubmitting(true);
    try {
      // Simulating a payment reference
      const paymentId = 'pay_' + Math.random().toString(36).slice(2, 11).toUpperCase();
      await api.post('/api/billing/purchase', {
        plan: buyingPlan.id,
        payment_id: paymentId
      });
      setPurchaseSuccess(true);
      setTimeout(() => {
        setPurchaseSuccess(false);
        setBuyingPlan(null);
        loadData();
      }, 2000);
    } catch (err) {
      alert('Gagal memproses pembayaran. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

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

          {/* Current Subscription Card */}
          <div className="bg-white dark:bg-[#0c0c0e]/80 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl px-5 py-3.5 flex items-center gap-4 shadow-sm shrink-0">
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
        </div>

        {/* Pricing Upgrade Grid */}
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider font-sans">Upgrade Langganan Premium</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Pilih paket langganan terbaik untuk memaksimalkan performa broadcast Anda.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
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
                
                <div className="flex items-baseline gap-1 mt-4 mb-5">
                  <span className="text-2xl font-extrabold text-zinc-950 dark:text-white tracking-tight">{plan.priceLabel}</span>
                  <span className="text-zinc-400 dark:text-zinc-500 text-[11px] font-semibold">{plan.period}</span>
                </div>

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
                  onClick={() => setBuyingPlan(plan)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
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

        {/* Invoice Table Section */}
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider font-sans">Riwayat Pembayaran</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Daftar transaksi billing dan invoice pembelian yang tercatat di akun Anda.</p>
          </div>

          <div className="bg-white dark:bg-[#0c0c0e]/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden">
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
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                      <th className="px-6 py-4">Invoice ID</th>
                      <th className="px-6 py-4">Paket</th>
                      <th className="px-6 py-4">Metode & ID Pembayaran</th>
                      <th className="px-6 py-4">Tanggal Transaksi</th>
                      <th className="px-6 py-4">Total</th>
                      <th className="px-6 py-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                    {invoices.map((inv) => {
                      const matchedPlan = PLANS.find(p => p.id === inv.plan);
                      return (
                        <tr key={inv.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-zinc-800 dark:text-zinc-200">
                            INV-BILL-{inv.id}
                          </td>
                          <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-white capitalize">
                            {matchedPlan?.name ?? inv.plan}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-zinc-800 dark:text-zinc-300">QRIS / Bank Transfer</div>
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
                            {formatRupiah(matchedPlan?.price ?? 0)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider">
                              Lunas
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Purchase Simulation Modal */}
        {buyingPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-zinc-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl dark:shadow-black/60 w-full max-w-sm overflow-hidden p-6 text-center animate-in zoom-in-95 duration-200 relative">
              <button
                type="button"
                onClick={() => setBuyingPlan(null)}
                className="absolute top-4 right-4 text-zinc-400 dark:text-zinc-500 hover:text-zinc-650 dark:hover:text-zinc-300 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {purchaseSuccess ? (
                <div className="py-8 flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/5">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-extrabold text-zinc-950 dark:text-white">Pembayaran Berhasil!</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed">
                    Paket <strong>{buyingPlan.name}</strong> Anda telah berhasil diaktifkan. Mengalihkan...
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center mx-auto">
                    <QrCode className="w-6 h-6" />
                  </div>

                  <div>
                    <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white">Metode Pembayaran QRIS</h3>
                    <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-1">Scan QRIS di bawah dengan e-wallet atau bank app Anda.</p>
                  </div>

                  {/* QRIS Simulated Code */}
                  <div className="bg-white p-3.5 rounded-xl border border-zinc-150 inline-block mx-auto relative shadow-inner">
                    <div className="w-48 h-48 bg-zinc-100 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 relative overflow-hidden">
                      {/* Simulated QR block layout */}
                      <div className="absolute inset-0 bg-[radial-gradient(#1e3a8a_2px,transparent_2px)] [background-size:12px_12px] opacity-40" />
                      <div className="absolute top-2 left-2 w-8 h-8 border-t-4 border-l-4 border-zinc-950 rounded-tl" />
                      <div className="absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4 border-zinc-950 rounded-tr" />
                      <div className="absolute bottom-2 left-2 w-8 h-8 border-b-4 border-l-4 border-zinc-950 rounded-bl" />
                      <div className="absolute bottom-2 right-2 w-8 h-8 border-b-4 border-r-4 border-zinc-950 rounded-br" />
                      <span className="text-[10px] font-extrabold text-zinc-950 uppercase tracking-widest relative z-10 bg-white/95 px-3 py-1 rounded shadow">AUTOIN QRIS</span>
                    </div>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 text-left">
                    <div className="flex justify-between items-center text-xs font-bold text-zinc-805 dark:text-zinc-205">
                      <span>Total Bayar:</span>
                      <span className="text-blue-600 dark:text-blue-400">{formatRupiah(buyingPlan.price)}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setBuyingPlan(null)}
                      className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all border border-zinc-200 dark:border-zinc-800 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmPurchase}
                      disabled={submitting}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                    >
                      {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Konfirmasi Bayar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
