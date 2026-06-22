import React, { useState, useEffect } from 'react';
import AdminLayout from '../layout/AdminLayout';
import { Send, Smartphone, Globe, Mail, Link2, Paperclip, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

interface Channel {
  id: string;
  name: string;
  platform: 'whatsapp';
  status: 'active' | 'inactive' | 'error';
}

interface LogEntry {
  id: string;
  target: string;
  platform: string;
  status: 'success' | 'failed' | 'sending';
  time: string;
}

export default function QuickSend() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [destinations, setDestinations] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    // Load active channels
    api.get<Channel[]>('/api/channels')
      .then(res => {
        const active = res.filter(c => c.status === 'active' && c.platform === 'whatsapp');
        setChannels(active);
        if (active.length > 0) setSelectedChannel(active[0].id);
      })
      .catch(() => {
        // Fallback mock active channels
        const mockChannels: Channel[] = [
          { id: 'c1', name: 'WhatsApp CS Utama', platform: 'whatsapp', status: 'active' }
        ];
        setChannels(mockChannels);
        setSelectedChannel(mockChannels[0].id);
      });
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannel || !destinations.trim() || !message.trim()) return;

    setSending(true);
    const channelObj = channels.find(c => c.id === selectedChannel);
    const targetList = destinations
      .split(/[\n,]+/)
      .map(t => t.trim())
      .filter(t => t.length > 0);

    // Initial logs as sending
    const newLogs: LogEntry[] = targetList.map((target, idx) => ({
      id: `${Date.now()}-${idx}`,
      target,
      platform: channelObj?.platform || 'unknown',
      status: 'sending' as const,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }));

    setLogs(prev => [...newLogs, ...prev]);

    // Simulate sending progress with small delays
    for (let i = 0; i < targetList.length; i++) {
      const target = targetList[i];
      const logId = newLogs[i].id;

      try {
        // Simple mock API call or real send if backend endpoints exist
          await api.post(`/api/whatsapp/${selectedChannel}/send`, {
            jid: target.includes('@') ? target : `${target}@s.whatsapp.net`,
            message: { text: message }
          });

        // Update log as success
        setLogs(prev => prev.map(log => log.id === logId ? { ...log, status: 'success' } : log));
      } catch (err) {
        // Update log as failed
        setLogs(prev => prev.map(log => log.id === logId ? { ...log, status: 'failed' } : log));
      }
    }

    setSending(false);
    setDestinations('');
    setMessage('');
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'whatsapp': return <Smartphone className="w-4 h-4 text-emerald-500" />;
      default: return <Globe className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <AdminLayout activePage="quick_send" title="Kirim Cepat">
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
          Kirim Cepat (Quick Send)
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Kirim pesan ke beberapa kontak/tujuan sekaligus secara instan tanpa membuat campaign.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Send Form */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSend} className="space-y-4">
            {/* Select Channel */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Pilih Akun / Channel Pengirim
              </label>
              <select
                value={selectedChannel}
                onChange={e => setSelectedChannel(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-100 cursor-pointer"
                required
              >
                {channels.length === 0 ? (
                  <option value="">Tidak ada channel aktif</option>
                ) : (
                  channels.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.platform.toUpperCase()})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Destination Input */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Nomor Tujuan / Kontak Penerima
              </label>
              <textarea
                placeholder="Masukkan nomor telepon (format: 628xxx) atau target ID lainnya.&#10;Gunakan koma atau baris baru untuk memisahkan banyak tujuan."
                value={destinations}
                onChange={e => setDestinations(e.target.value)}
                rows={4}
                className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-100 resize-none font-mono"
                required
                disabled={sending}
              />
              <span className="text-[10px] text-zinc-400 block mt-1">
                Contoh: <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono">628123456789, 628987654321</code>
              </span>
            </div>

            {/* Message Area */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Isi Pesan
              </label>
              <textarea
                placeholder="Ketik isi pesan Anda di sini..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={6}
                className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-100 resize-none"
                required
                disabled={sending}
              />
            </div>

            {/* Attachment Sim (UI Only) */}
            <div className="flex items-center gap-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-all cursor-pointer w-max">
              <Paperclip className="w-4 h-4" />
              <span className="text-xs font-semibold">Tambahkan Media (Gambar / Dokumen)</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={sending || channels.length === 0}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3 font-bold text-xs rounded-xl shadow-md cursor-pointer"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengirim Pesan...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Kirim Sekarang</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Real-time Status / Activity Logs */}
        <div className="bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 flex flex-col h-full max-h-[580px] shadow-sm">
          <h2 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide mb-4">
            Riwayat Kirim Sesi Ini
          </h2>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-400 dark:text-zinc-500">
                <Send className="w-8 h-8 mb-2 opacity-55" />
                <span className="text-xs">Belum ada aktivitas pengiriman.</span>
              </div>
            ) : (
              logs.map(log => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-850/80 rounded-xl"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {getPlatformIcon(log.platform)}
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 truncate font-mono">
                        {log.target}
                      </div>
                      <div className="text-[9px] text-zinc-400">{log.time}</div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {log.status === 'success' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                        <CheckCircle className="w-3.5 h-3.5" /> Sukses
                      </span>
                    )}
                    {log.status === 'failed' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-red-500">
                        <AlertCircle className="w-3.5 h-3.5" /> Gagal
                      </span>
                    )}
                    {log.status === 'sending' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-blue-500 animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Proses
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
