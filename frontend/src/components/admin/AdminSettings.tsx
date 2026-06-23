import React, { useState, useEffect } from 'react';
import AdminLayout from '../layout/AdminLayout';
import { api } from '../../lib/api';
import { Settings, Shield, CreditCard, Megaphone, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { AlertBanner } from '../ui/Toast';

interface SettingsData {
  duitku_merchant_code: string;
  duitku_api_key: string;
  duitku_project_id: string;
  duitku_sandbox: boolean;
  payment_gateway_enabled: boolean;
  payment_whatsapp_number: string;
  announcement_text: string;
  announcement_enabled: boolean;
  announcement_type: 'info' | 'warning' | 'success';
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<SettingsData>({
    duitku_merchant_code: '',
    duitku_api_key: '',
    duitku_project_id: '',
    duitku_sandbox: true,
    payment_gateway_enabled: true,
    payment_whatsapp_number: '6281296451923',
    announcement_text: '',
    announcement_enabled: false,
    announcement_type: 'info',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<SettingsData>('/api/admin/settings');
      if (data) {
        setSettings(data);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? 'Gagal memuat pengaturan.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post('/api/admin/settings', settings);
      setSuccess('Pengaturan berhasil disimpan!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout activePage="admin_settings" title="Admin Settings">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Konfigurasi Sistem (Admin Panel)
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Atur kredensial payment gateway Duitku dan buat pengumuman global untuk seluruh pengguna platform.
          </p>
        </div>

        <AlertBanner message={error} type="error" />
        <AlertBanner message={success} type="success" />

        {loading ? (
          <div className="py-20 text-center text-xs text-zinc-500 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
            <span>Memuat pengaturan...</span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Duitku payment gateway settings */}
            <div className="bg-white dark:bg-[#0c0c0e]/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <CreditCard className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-850 dark:text-zinc-200 uppercase tracking-wider">Payment Gateway Duitku</h3>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Konfigurasi API merchant Duitku</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Merchant Code</label>
                  <input
                    type="text"
                    value={settings.duitku_merchant_code}
                    onChange={(e) => setSettings({ ...settings, duitku_merchant_code: e.target.value })}
                    placeholder="Contoh: D12345"
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">API Merchant Key</label>
                  <input
                    type="password"
                    value={settings.duitku_api_key}
                    onChange={(e) => setSettings({ ...settings, duitku_api_key: e.target.value })}
                    placeholder="Masukkan API Key Duitku"
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Project ID</label>
                  <input
                    type="text"
                    value={settings.duitku_project_id}
                    onChange={(e) => setSettings({ ...settings, duitku_project_id: e.target.value })}
                    placeholder="Project ID Duitku"
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-all font-mono"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Aktifkan Payment Gateway</h4>
                    <p className="text-[9px] text-zinc-400 dark:text-zinc-500">Aktifkan pembayaran otomatis via Duitku</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.payment_gateway_enabled}
                      onChange={(e) => setSettings({ ...settings, payment_gateway_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-200 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">No. WhatsApp Admin (Manual Order / Direct)</label>
                    <input
                      type="text"
                      value={settings.payment_whatsapp_number}
                      onChange={(e) => setSettings({ ...settings, payment_whatsapp_number: e.target.value })}
                      placeholder="Contoh: 6281296451923"
                      className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-all font-mono"
                    />
                    <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-1">Digunakan untuk manual order via WhatsApp ketika payment gateway dinonaktifkan.</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Sandbox Mode</h4>
                    <p className="text-[9px] text-zinc-400 dark:text-zinc-500">Gunakan lingkungan testing Duitku</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.duitku_sandbox}
                      onChange={(e) => setSettings({ ...settings, duitku_sandbox: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-200 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Announcement settings */}
            <div className="bg-white dark:bg-[#0c0c0e]/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="w-8 h-8 rounded-lg bg-purple-600/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Megaphone className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-850 dark:text-zinc-200 uppercase tracking-wider">Pengumuman Global</h3>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Banner notifikasi atas dashboard</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Aktifkan Pengumuman</h4>
                    <p className="text-[9px] text-zinc-400 dark:text-zinc-500">Tampilkan banner untuk semua user</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.announcement_enabled}
                      onChange={(e) => setSettings({ ...settings, announcement_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-200 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Tipe Banner</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['info', 'warning', 'success'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSettings({ ...settings, announcement_type: type })}
                        className={`py-2 px-3 rounded-xl text-xs font-bold capitalize border cursor-pointer transition-all ${
                          settings.announcement_type === type
                            ? type === 'info'
                              ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400'
                              : type === 'warning'
                              ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400'
                              : 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                            : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Pesan Pengumuman</label>
                  <textarea
                    rows={4}
                    value={settings.announcement_text}
                    onChange={(e) => setSettings({ ...settings, announcement_text: e.target.value })}
                    placeholder="Masukkan teks pengumuman yang akan tampil di atas dashboard user..."
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-purple-500 transition-all leading-relaxed resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-6 py-3 bg-gradient-brand hover:opacity-95 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-60"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Simpan Pengaturan</span>
              </button>
            </div>

          </form>
        )}
      </div>
    </AdminLayout>
  );
}
