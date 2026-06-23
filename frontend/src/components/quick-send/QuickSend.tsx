import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '../layout/AdminLayout';
import { Send, Smartphone, Globe, Mail, Link2, Paperclip, CheckCircle, AlertCircle, Loader2, Upload, Trash2, FileText, X, ChevronLeft, ChevronRight, RotateCcw, Sparkles, Copy, ArrowRight, Lightbulb } from 'lucide-react';
import { api } from '../../lib/api';
import Toast from '../ui/Toast';

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
  message?: string;
  mediaUrl?: string;
  mediaType?: string;
}

export default function QuickSend() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [destinations, setDestinations] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);

  // AI Assistant States
  const [activeTab, setActiveTab] = useState<'editor' | 'ai'>('editor');
  const [aiTab, setAiTab] = useState<'rewrite' | 'generate' | 'optimize'>('rewrite');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiTone, setAiTone] = useState<string | null>(null);
  const [aiGenType, setAiGenType] = useState<'promo' | 'announcement' | 'reminder' | 'caption'>('promo');
  const [aiGenContext, setAiGenContext] = useState('');
  const [aiGenResult, setAiGenResult] = useState('');
  const [aiGenLoading, setAiGenLoading] = useState(false);
  const [aiOptLoading, setAiOptLoading] = useState(false);
  const [aiOptSuggestions, setAiOptSuggestions] = useState<string[]>([]);
  const [aiOptResult, setAiOptResult] = useState('');
  const [showOptResult, setShowOptResult] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // AI Assistant Handlers
  const handleAiRewrite = async (tone: string) => {
    if (!message.trim()) { alert('Tulis draf pesan di editor terlebih dahulu!'); return; }
    setAiTone(tone);
    setAiGenerating(true);
    try {
      const res = await api.post<{ rewritten: string; is_simulated: boolean }>('/api/ai/rewrite', {
        content: message,
        tone,
      });
      setMessage(res.rewritten);
      showToast('Gaya bahasa berhasil diperbarui oleh AI!', 'success');
    } catch (err: any) {
      alert(err.message ?? 'Gagal memproses gaya bahasa.');
    } finally {
      setAiGenerating(false);
      setAiTone(null);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiGenContext.trim()) { alert('Masukkan konsep / konteks pesan terlebih dahulu!'); return; }
    setAiGenLoading(true);
    try {
      const res = await api.post<{ generated: string; is_simulated: boolean }>('/api/ai/generate', {
        type: aiGenType,
        context: aiGenContext,
      });
      setAiGenResult(res.generated);
      showToast('Draf pesan berhasil dibuat oleh AI!', 'success');
    } catch (err: any) {
      alert(err.message ?? 'Gagal membuat pesan.');
    } finally {
      setAiGenLoading(false);
    }
  };

  const handleAiOptimize = async () => {
    if (!message.trim()) { alert('Tulis draf pesan di editor terlebih dahulu!'); return; }
    setAiOptLoading(true);
    try {
      const res = await api.post<{ suggestions: string[]; optimized: string; is_simulated: boolean }>('/api/ai/optimize', {
        content: message,
      });
      setAiOptSuggestions(res.suggestions);
      setAiOptResult(res.optimized);
      setShowOptResult(true);
      showToast('Audit & optimasi AI selesai!', 'success');
    } catch (err: any) {
      alert(err.message ?? 'Gagal mengoptimalkan pesan.');
    } finally {
      setAiOptLoading(false);
    }
  };

  const [quickAiLoading, setQuickAiLoading] = useState(false);

  const handleQuickAiAction = async (action: 'optimize' | 'marketing' | 'santai' | 'formal') => {
    if (!message.trim()) { alert('Tulis draf pesan di editor terlebih dahulu!'); return; }
    setQuickAiLoading(true);
    try {
      if (action === 'optimize') {
        const res = await api.post<{ optimized: string; suggestions: string[]; is_simulated: boolean }>('/api/ai/optimize', { content: message });
        setMessage(res.optimized);
        showToast('Pesan berhasil dioptimasi oleh AI!', 'success');
      } else {
        const res = await api.post<{ rewritten: string; is_simulated: boolean }>('/api/ai/rewrite', { content: message, tone: action });
        setMessage(res.rewritten);
        showToast('Gaya bahasa berhasil diperbarui oleh AI!', 'success');
      }
    } catch (err: any) {
      alert(err.message ?? 'Gagal memproses AI helper.');
    } finally {
      setQuickAiLoading(false);
    }
  };

  function applyFormat(type: 'bold' | 'italic' | 'strike' | 'code') {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    let prefix = '';
    let suffix = '';
    if (type === 'bold') { prefix = '*'; suffix = '*'; }
    else if (type === 'italic') { prefix = '_'; suffix = '_'; }
    else if (type === 'strike') { prefix = '~'; suffix = '~'; }
    else if (type === 'code') { prefix = '```'; suffix = '```'; }

    const selectedText = text.substring(start, end);
    const before = text.substring(0, start);
    const after = text.substring(end);
    const newContent = before + prefix + selectedText + suffix + after;
    setMessage(newContent);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 0);
  }
  const [logs, setLogs] = useState<LogEntry[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('autoin_quick_send_logs');
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'pdf' | 'document'>('image');
  const [uploading, setUploading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const logsPerPage = 5;

  const handleClearLogs = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus semua riwayat pengiriman cepat ini?')) {
      setLogs([]);
      try {
        localStorage.removeItem('autoin_quick_send_logs');
      } catch (e) {
        console.error(e);
      }
    }
  };

  const totalPages = Math.ceil(logs.length / logsPerPage) || 1;
  const paginatedLogs = logs.slice((currentPage - 1) * logsPerPage, currentPage * logsPerPage);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [logs.length, totalPages, currentPage]);

  const handleRetry = async (log: LogEntry) => {
    if (!selectedChannel) {
      alert('Silakan pilih channel pengirim terlebih dahulu!');
      return;
    }
    
    // Set status to sending
    setLogs(prev => {
      const updated = prev.map(l => l.id === log.id ? { ...l, status: 'sending' as const } : l);
      try {
        localStorage.setItem('autoin_quick_send_logs', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      await api.post(`/api/whatsapp/${selectedChannel}/send`, {
        to: log.target.includes('@') ? log.target : `${log.target}@s.whatsapp.net`,
        message: log.message || '',
        mediaUrl: log.mediaUrl || undefined,
        mediaType: log.mediaUrl ? log.mediaType : undefined
      });

      // Update log to success
      setLogs(prev => {
        const updated = prev.map(l => l.id === log.id ? { ...l, status: 'success' as const } : l);
        try {
          localStorage.setItem('autoin_quick_send_logs', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
    } catch (err) {
      // Update log to failed
      setLogs(prev => {
        const updated = prev.map(l => l.id === log.id ? { ...l, status: 'failed' as const } : l);
        try {
          localStorage.setItem('autoin_quick_send_logs', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const file = files[0];
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('autoin_token');
      const res = await fetch(`${import.meta.env.PUBLIC_API_URL ?? 'http://localhost:8001'}/api/upload`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setMediaUrl(data.url);
      
      const mime = file.type;
      if (mime.startsWith('image/')) setMediaType('image');
      else if (mime.startsWith('video/')) setMediaType('video');
      else if (mime.endsWith('pdf')) setMediaType('pdf');
      else setMediaType('document');
    } catch (err: any) {
      alert(err.message ?? 'Gagal mengunggah file.');
    } finally {
      setUploading(false);
    }
  };

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

  const insertVariable = (variable: string) => {
    const el = textareaRef.current;
    if (!el) {
      setMessage(prev => prev + ` {{${variable}}}`);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const insertText = `{{${variable}}}`;
    setMessage(before + insertText + after);
    
    // Focus back and set selection position
    setTimeout(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + insertText.length;
    }, 0);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannel || !destinations.trim() || (!message.trim() && !mediaUrl)) return;

    setSending(true);
    const channelObj = channels.find(c => c.id === selectedChannel);
    
    // Parse target destinations
    const lines = destinations.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let parsedDestinations: { phone: string; name: string }[] = [];
    
    if (lines.length === 1 && destinations.includes(',')) {
      parsedDestinations = destinations.split(',').map(d => ({ phone: d.trim(), name: '' })).filter(d => d.phone.length > 0);
    } else {
      parsedDestinations = lines.map(line => {
        const parts = line.split(/[|;]/);
        if (parts.length > 1) {
          return { phone: parts[0].trim(), name: parts[1].trim() };
        }
        const commaParts = line.split(',');
        if (commaParts.length > 1 && !commaParts[0].includes('@')) {
          return { phone: commaParts[0].trim(), name: commaParts[1].trim() };
        }
        return { phone: line, name: '' };
      }).filter(d => d.phone.length > 0);
    }

    // Initial logs as sending (with dynamic variable replacement)
    const newLogs: LogEntry[] = parsedDestinations.map((targetObj, idx) => {
      let personalizedMessage = message || '';
      personalizedMessage = personalizedMessage.replace(/\{\{nama\}\}/gi, targetObj.name || 'Pelanggan');
      personalizedMessage = personalizedMessage.replace(/\{\{nomor\}\}/gi, targetObj.phone);
      
      const now = new Date();
      const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      personalizedMessage = personalizedMessage.replace(/\{\{tanggal\}\}/gi, dateStr);
      personalizedMessage = personalizedMessage.replace(/\{\{waktu\}\}/gi, timeStr);

      return {
        id: `${Date.now()}-${idx}`,
        target: targetObj.phone,
        platform: channelObj?.platform || 'unknown',
        status: 'sending' as const,
        time: now.toLocaleString('id-ID', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        message: personalizedMessage,
        mediaUrl: mediaUrl || '',
        mediaType: mediaUrl ? mediaType : ''
      };
    });

    setLogs(prev => {
      const updated = [...newLogs, ...prev];
      try {
        localStorage.setItem('autoin_quick_send_logs', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // Send messages
    for (let i = 0; i < parsedDestinations.length; i++) {
      const logId = newLogs[i].id;
      const logItem = newLogs[i];

      try {
        await api.post(`/api/whatsapp/${selectedChannel}/send`, {
          to: logItem.target.includes('@') ? logItem.target : `${logItem.target}@s.whatsapp.net`,
          message: logItem.message,
          mediaUrl: mediaUrl || undefined,
          mediaType: mediaUrl ? mediaType : undefined
        });

        // Update log as success
        setLogs(prev => {
          const updated = prev.map(log => log.id === logId ? { ...log, status: 'success' as const } : log);
          try {
            localStorage.setItem('autoin_quick_send_logs', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      } catch (err) {
        // Update log as failed
        setLogs(prev => {
          const updated = prev.map(log => log.id === logId ? { ...log, status: 'failed' as const } : log);
          try {
            localStorage.setItem('autoin_quick_send_logs', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
    }

    setSending(false);
    setDestinations('');
    setMessage('');
    setMediaUrl('');
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

      {/* Tab Selector (Mobile view only to avoid vertical clutter) */}
      <div className="flex md:hidden p-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full mb-5">
        <button type="button" onClick={() => setActiveTab('editor')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold cursor-pointer transition-all ${
            activeTab === 'editor' ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-zinc-500 dark:text-zinc-400'
          }`}>
          <Send className="w-4 h-4" />
          Kirim Cepat
        </button>
        <button type="button" onClick={() => setActiveTab('ai')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold cursor-pointer transition-all ${
            activeTab === 'ai' ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-zinc-500 dark:text-zinc-400'
          }`}>
          <Sparkles className="w-4 h-4" />
          AI Asisten
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT COLUMN: FORM & AI ASISTEN */}
        <div className="lg:col-span-2 space-y-6">
          {/* Send Form */}
          <div className={`bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm ${activeTab === 'editor' ? 'block' : 'hidden md:block'}`}>
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
                  Gunakan format <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono">nomor|nama</code> untuk variabel dinamis. Contoh: <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono">628123456789|Budi</code>
                </span>
              </div>

              {/* Message Area */}
              <div>
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Isi Pesan
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Sisipkan:</span>
                    {['nama', 'nomor', 'tanggal', 'waktu'].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insertVariable(v)}
                        className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-950/30 border border-zinc-200 dark:border-zinc-700 hover:border-blue-500/30 text-[9px] font-bold text-zinc-600 dark:text-zinc-450 hover:text-blue-500 rounded-lg transition-all cursor-pointer"
                      >
                        {`{{${v}}}`}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Formatter Toolbar */}
                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl mb-2">
                  <button type="button" onClick={() => applyFormat('bold')} className="w-8 h-8 flex items-center justify-center text-xs font-extrabold text-zinc-600 dark:text-zinc-400 hover:text-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all cursor-pointer" title="Tebal (Bold)">B</button>
                  <button type="button" onClick={() => applyFormat('italic')} className="w-8 h-8 flex items-center justify-center text-xs italic font-semibold text-zinc-600 dark:text-zinc-400 hover:text-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all cursor-pointer" title="Miring (Italic)">I</button>
                  <button type="button" onClick={() => applyFormat('strike')} className="w-8 h-8 flex items-center justify-center text-xs line-through text-zinc-600 dark:text-zinc-400 hover:text-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all cursor-pointer" title="Coret">S</button>
                  <button type="button" onClick={() => applyFormat('code')} className="px-2.5 h-8 flex items-center justify-center text-[10px] font-mono text-zinc-600 dark:text-zinc-400 hover:text-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all cursor-pointer" title="Code Format">&lt;/&gt;</button>
                  <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />
                  
                  {/* Inline AI Quick Helpers */}
                  <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 flex items-center gap-1 select-none">
                    <Sparkles className="w-3 h-3 text-blue-500" />
                    AI Quick:
                  </span>
                  <button type="button" onClick={() => handleQuickAiAction('optimize')} disabled={quickAiLoading || !message.trim()}
                    className="px-2.5 py-1 text-[9px] font-bold bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/35 hover:border-blue-500 text-blue-600 dark:text-blue-400 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1">
                    {quickAiLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : '✨ Optimalkan'}
                  </button>
                  <button type="button" onClick={() => handleQuickAiAction('marketing')} disabled={quickAiLoading || !message.trim()}
                    className="px-2.5 py-1 text-[9px] font-bold bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/35 hover:border-amber-500 text-amber-600 dark:text-amber-400 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                    🔥 Marketing
                  </button>
                  <button type="button" onClick={() => handleQuickAiAction('santai')} disabled={quickAiLoading || !message.trim()}
                    className="px-2.5 py-1 text-[9px] font-bold bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/35 hover:border-emerald-500 text-emerald-600 dark:text-emerald-400 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                    🥤 Santai
                  </button>
                  <button type="button" onClick={() => handleQuickAiAction('formal')} disabled={quickAiLoading || !message.trim()}
                    className="px-2.5 py-1 text-[9px] font-bold bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/35 hover:border-indigo-500 text-indigo-600 dark:text-indigo-400 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                    💼 Formal
                  </button>
                </div>
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    placeholder="Ketik isi pesan Anda di sini...&#10;Gunakan {{nama}} untuk menyisipkan nama penerima secara dinamis."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={6}
                    className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-100 resize-y min-h-[120px] leading-relaxed"
                    required
                    disabled={sending || quickAiLoading}
                  />
                  {quickAiLoading && (
                    <div className="absolute inset-0 bg-zinc-900/60 dark:bg-zinc-950/70 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-2 animate-in fade-in z-10">
                      <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                      <span className="text-[10px] text-white font-bold">AI sedang mengoptimasi pesan Anda...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Media Attachment */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Media / Lampiran (Gambar atau Dokumen)
                </label>
                
                {!mediaUrl ? (
                  <label className="flex items-center gap-2 px-4 py-3 bg-zinc-50 dark:bg-zinc-900/60 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl hover:border-blue-500 transition-all cursor-pointer text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200">
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading || sending}
                    />
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        <span className="text-xs font-bold">Mengunggah berkas...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-zinc-400" />
                        <span className="text-xs font-semibold">Pilih file Gambar atau Dokumen</span>
                      </>
                    )}
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {mediaType === 'image' ? (
                        <img
                          src={mediaUrl}
                          alt="Preview"
                          className="w-10 h-10 object-cover rounded-lg border border-zinc-200 dark:border-zinc-800"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-10 h-10 bg-zinc-150 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-500" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-250 truncate block">
                          {mediaUrl.split('/').pop() || 'file_lampiran'}
                        </span>
                        <span className="text-[9px] text-zinc-400 capitalize block mt-0.5">
                          Tipe: {mediaType === 'pdf' ? 'PDF' : mediaType}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMediaUrl('')}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg cursor-pointer transition-all border-0 bg-transparent"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
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

          {/* AI Assistant Box */}
          <div className={`bg-gradient-to-br from-white to-[#121215]/30 dark:from-[#0e0e11] dark:to-zinc-950/40 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-5 relative overflow-hidden ${activeTab === 'ai' ? 'block' : 'hidden md:block'}`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <h3 className="font-extrabold text-xs text-zinc-900 dark:text-white uppercase tracking-wider">Asisten Penulisan AI</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                ✦ AI Live
              </span>
            </div>

            {/* AI Inner Tabs */}
            <div className="flex p-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl">
              {(['rewrite', 'generate', 'optimize'] as const).map(tab => (
                <button key={tab} type="button" onClick={() => setAiTab(tab)}
                  className={`flex-1 py-2 text-center rounded-xl text-[10px] font-bold capitalize transition-all cursor-pointer ${
                    aiTab === tab
                      ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-zinc-550 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}>
                  {tab === 'rewrite' ? 'Gaya Bahasa' : tab === 'generate' ? 'Buat Baru' : 'Audit'}
                </button>
              ))}
            </div>

            {/* Rewrite Tone */}
            {aiTab === 'rewrite' && (
              <div className="space-y-4">
                <p className="text-[11px] text-zinc-550 dark:text-zinc-400 leading-relaxed">
                  Tulis pesan Anda di form editor utama terlebih dahulu, lalu klik tombol gaya di bawah untuk memolesnya secara otomatis menggunakan AI.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'marketing',    label: 'Marketing',    emoji: '🔥' },
                    { id: 'formal',       label: 'Formal',       emoji: '💼' },
                    { id: 'santai',       label: 'Santai',       emoji: '🥤' },
                    { id: 'professional', label: 'Profesional',  emoji: '📈' },
                    { id: 'urgent',       label: 'Mendesak',     emoji: '🚨' },
                    { id: 'friendly',     label: 'Ramah',        emoji: '🤗' },
                  ].map(tone => (
                    <button key={tone.id} type="button" onClick={() => handleAiRewrite(tone.id)}
                      disabled={aiGenerating || !message.trim()}
                      className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 hover:bg-blue-50 dark:hover:bg-blue-500/10 border border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-700 dark:text-zinc-200 font-bold transition-all disabled:bg-zinc-150/40 dark:disabled:bg-zinc-950/20 disabled:text-zinc-400 dark:disabled:text-zinc-650 disabled:border-zinc-200/50 dark:disabled:border-zinc-900/50 disabled:cursor-not-allowed cursor-pointer shadow-sm">
                      <span className="text-xs">{tone.emoji}</span>
                      <span>{tone.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Generate */}
            {aiTab === 'generate' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-widest">Tipe Pesan</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['promo', 'announcement', 'reminder', 'caption'] as const).map(t => (
                      <button key={t} type="button" onClick={() => setAiGenType(t)}
                        className={`py-2 text-[10px] font-bold text-center rounded-xl border transition-all cursor-pointer ${
                          aiGenType === t
                            ? 'bg-gradient-brand text-white border-blue-500 shadow-sm'
                            : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-550'
                        }`}>
                        {t === 'promo' ? 'Promo' : t === 'announcement' ? 'Info' : t === 'reminder' ? 'Ingat' : 'Kapsen'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-widest">Tujuan / Konsep Draft Anda</label>
                  <textarea value={aiGenContext} onChange={e => setAiGenContext(e.target.value)}
                    placeholder="Contoh: promosi diskon 50% menyambut hari raya Idul Adha, masukan kode kupon BERKAH50, terbatas untuk 100 pembeli pertama saja..."
                    rows={3}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-3 py-2.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500 placeholder-zinc-400 resize-none leading-relaxed" />
                </div>

                <button type="button" onClick={handleAiGenerate} disabled={aiGenLoading || !aiGenContext.trim()}
                  className="w-full py-3 bg-gradient-brand hover:opacity-95 disabled:opacity-50 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/15">
                  {aiGenLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Sedang menulis draft...</span></> : <><Sparkles className="w-3.5 h-3.5" /><span>Tulis Konsep dengan AI</span></>}
                </button>
                {aiGenResult && (
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                      <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Hasil Draft AI</span>
                      <button type="button" onClick={() => { navigator.clipboard.writeText(aiGenResult); showToast('Teks berhasil disalin!', 'success'); }} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">{aiGenResult}</p>
                    <button type="button" onClick={() => { setMessage(aiGenResult); setActiveTab('editor'); showToast('Draf AI berhasil diterapkan ke editor!', 'success'); }}
                      className="w-full py-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-450 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1">
                      <span>Terapkan Ke Editor Utama</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Optimize */}
            {aiTab === 'optimize' && (
              <div className="space-y-4">
                <p className="text-[11px] text-zinc-550 dark:text-zinc-500 leading-relaxed">
                  Kirimkan teks yang sudah Anda tulis di atas untuk dianalisis oleh AI. AI akan mendeteksi kelemahan teks dan memberikan draf versi optimasi.
                </p>

                <button type="button" onClick={handleAiOptimize} disabled={aiOptLoading || !message.trim()}
                  className="w-full py-3 bg-gradient-brand hover:opacity-95 disabled:opacity-50 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm">
                  {aiOptLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Sedang Menganalisis...</span></> : <><Lightbulb className="w-3.5 h-3.5" /><span>Audit & Optimasi Sekarang</span></>}
                </button>

                {showOptResult && (
                  <div className="space-y-3.5">
                    {aiOptSuggestions.length > 0 && (
                      <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-2">
                        <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest block">Saran Perbaikan:</span>
                        <ul className="space-y-1">
                          {aiOptSuggestions.map((s, idx) => (
                            <li key={idx} className="text-xs text-zinc-650 dark:text-zinc-400 flex items-start gap-2">
                              <span className="text-amber-500 mt-0.5">•</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {aiOptResult && (
                      <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3 animate-in fade-in">
                        <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Teks Optimasi AI</span>
                          <button type="button" onClick={() => { navigator.clipboard.writeText(aiOptResult); showToast('Teks berhasil disalin!', 'success'); }} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">{aiOptResult}</p>
                        <button type="button" onClick={() => { setMessage(aiOptResult); setActiveTab('editor'); showToast('Teks optimasi berhasil diterapkan!', 'success'); }}
                          className="w-full py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1">
                          <span>Ganti Dengan Versi Optimasi</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Real-time Status / Activity Logs */}
        <div className="bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 flex flex-col h-full min-h-[580px] shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800/50">
            <h2 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">
              Riwayat Pengiriman
            </h2>
            {logs.length > 0 && (
              <button
                type="button"
                onClick={handleClearLogs}
                className="text-[10px] font-bold text-red-500 hover:text-red-750 hover:bg-red-50 dark:hover:bg-red-500/10 px-2 py-1 rounded-lg transition-all border-0 bg-transparent cursor-pointer"
              >
                Hapus Semua
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-400 dark:text-zinc-500">
                <Send className="w-8 h-8 mb-2 opacity-55" />
                <span className="text-xs">Belum ada aktivitas pengiriman.</span>
              </div>
            ) : (
              paginatedLogs.map(log => (
                <div
                  key={log.id}
                  className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-150 dark:border-zinc-800/85 rounded-xl space-y-2 text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {getPlatformIcon(log.platform)}
                      <div className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 truncate font-mono">
                        {log.target}
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

                  <div className="flex items-center justify-between pt-1 border-t border-zinc-150/40 dark:border-zinc-800/40 text-[9px] text-zinc-400">
                    <div className="font-semibold flex items-center gap-1">
                      <span>Waktu:</span>
                      <span className="font-mono">{log.time}</span>
                    </div>
                    {log.status !== 'sending' && (
                      <button
                        type="button"
                        onClick={() => handleRetry(log)}
                        className="flex items-center gap-1 text-[9px] font-bold text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-500/10 px-2 py-0.5 rounded transition-all border-0 bg-transparent cursor-pointer"
                      >
                        <RotateCcw className="w-2.5 h-2.5" /> Kirim Ulang
                      </button>
                    )}
                  </div>

                  {log.message && (
                    <div className="text-[10px] text-zinc-650 dark:text-zinc-400 bg-white dark:bg-zinc-950 p-2 rounded-lg border border-zinc-200/60 dark:border-zinc-800/80 font-normal break-words whitespace-pre-wrap">
                      {log.message}
                    </div>
                  )}

                  {log.mediaUrl && (
                    <div className="flex items-center gap-1 text-[9px] bg-blue-50/50 dark:bg-blue-500/5 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-lg border border-blue-100/50 dark:border-blue-500/10 min-w-0">
                      <Link2 className="w-3 h-3 shrink-0" />
                      <span className="truncate flex-1">{log.mediaUrl.split('/').pop()}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Pagination Controls */}
          {logs.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-zinc-150 dark:border-zinc-800/80 shrink-0">
              <span className="text-[10px] text-zinc-500 font-bold">
                Hal {currentPage} dari {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-all cursor-pointer text-zinc-600 dark:text-zinc-400"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-all cursor-pointer text-zinc-600 dark:text-zinc-400"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </AdminLayout>
  );
}
