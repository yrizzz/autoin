import React, { useState, useEffect } from 'react';
import AdminLayout from '../layout/AdminLayout';
import { Receipt, FileText, Download, CheckCircle, AlertCircle, Clock, ExternalLink } from 'lucide-react';
import { api } from '../../lib/api';

interface Invoice {
  id: string;
  planName: string;
  amount: number;
  paymentMethod: string;
  status: 'paid' | 'pending' | 'failed';
  createdAt: string;
  paymentId: string;
}

const DEFAULT_INVOICES: Invoice[] = [
  {
    id: 'INV-2026-003',
    planName: 'Monthly Pass Premium',
    amount: 25000,
    paymentMethod: 'GoPay / QRIS',
    status: 'paid',
    createdAt: '2026-06-20T08:14:52Z',
    paymentId: 'pay_wa9018230912'
  },
  {
    id: 'INV-2026-002',
    planName: 'Daily Pass',
    amount: 1000,
    paymentMethod: 'ShopeePay',
    status: 'paid',
    createdAt: '2026-06-15T12:00:00Z',
    paymentId: 'pay_wa8910283012'
  },
  {
    id: 'INV-2026-001',
    planName: 'Daily Pass',
    amount: 1000,
    paymentMethod: 'QRIS',
    status: 'failed',
    createdAt: '2026-06-10T14:30:00Z',
    paymentId: 'pay_wa7890123890'
  }
];

export default function InvoiceHistory() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Attempt to load from billing history endpoint
    api.get<Invoice[]>('/api/billing/history')
      .then(res => {
        setInvoices(res || []);
        setLoading(false);
      })
      .catch(() => {
        // Fallback to local storage or defaults
        const saved = localStorage.getItem('autoin_invoices');
        if (saved) {
          setInvoices(JSON.parse(saved));
        } else {
          setInvoices(DEFAULT_INVOICES);
          localStorage.setItem('autoin_invoices', JSON.stringify(DEFAULT_INVOICES));
        }
        setLoading(false);
      });
  }, []);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
            <CheckCircle className="w-3 h-3" /> Lunas
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded">
            <AlertCircle className="w-3 h-3" /> Gagal
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded animate-pulse">
            <Clock className="w-3 h-3 animate-spin" /> Menunggu
          </span>
        );
    }
  };

  const handleDownload = (invoiceId: string) => {
    alert(`Mengunduh PDF untuk Invoice ${invoiceId}... (Fitur Cetak Demo)`);
  };

  return (
    <AdminLayout activePage="invoice" title="Invoice Riwayat Pembayaran">
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
          Riwayat Invoice & Tagihan
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Daftar seluruh transaksi pembayaran paket langganan Anda di platform AUTOIN.
        </p>
      </div>

      <div className="bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-zinc-500">Memuat riwayat invoice...</div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-400 dark:text-zinc-500 px-4">
            <Receipt className="w-10 h-10 mb-2 opacity-50 text-blue-500" />
            <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Belum ada transaksi</h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-xs mt-1">
              Anda belum melakukan pembelian paket langganan apapun di platform ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/40 text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  <th className="px-6 py-3.5">ID Invoice</th>
                  <th className="px-6 py-3.5">Nama Paket</th>
                  <th className="px-6 py-3.5">Tanggal</th>
                  <th className="px-6 py-3.5">Metode</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Total Tagihan</th>
                  <th className="px-6 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-zinc-850 dark:text-zinc-250">{inv.id}</td>
                    <td className="px-6 py-4 font-semibold text-zinc-800 dark:text-zinc-200">{inv.planName}</td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">
                      {new Date(inv.createdAt).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{inv.paymentMethod}</td>
                    <td className="px-6 py-4">{getStatusBadge(inv.status)}</td>
                    <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white">{formatRupiah(inv.amount)}</td>
                    <td className="px-6 py-4 text-right">
                      {inv.status === 'paid' ? (
                        <button
                          onClick={() => handleDownload(inv.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white dark:text-blue-400 dark:hover:text-white rounded-lg text-[10px] font-bold border border-blue-500/25 transition-all cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>Unduh PDF</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-zinc-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
