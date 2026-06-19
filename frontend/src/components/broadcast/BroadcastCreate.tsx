import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { Channel } from '../../types';
import AdminLayout from '../layout/AdminLayout';
import { 
  ArrowLeft, 
  Send, 
  Sparkles, 
  Check, 
  HelpCircle,
  AlertCircle,
  MessageSquare,
  Globe,
  Loader2,
  Bookmark,
  Image as ImageIcon,
  Video,
  FileText,
  Plus,
  Trash2,
  Paperclip,
  Upload,
  X,
  Link as LinkIcon
} from 'lucide-react';

const AI_TEMPLATES = {
  formal: {
    label: 'Formal',
    emoji: '💼',
    rewrite: (txt: string) => `Yth. Pelanggan,\n\nDengan hormat, kami ingin menyampaikan bahwa: ${txt}\n\nTerima kasih atas perhatian dan kerja sama Anda.\n\nHormat kami,\nTim Layanan Autoin`
  },
  santai: {
    label: 'Santai',
    emoji: '🥤',
    rewrite: (txt: string) => `Halo guys! 👋\n\nAda info seru nih buat kalian: ${txt}\n\nJangan lupa kepoin terus ya! Have a great day! ✨`
  },
  marketing: {
    label: 'Marketing / Promo',
    emoji: '🔥',
    rewrite: (txt: string) => `🔥 PROMO KHUSUS HARI INI! 🔥\n\nKabar gembira! ${txt}\n\n⚡ Slot Terbatas! Klik link di bio sekarang juga sebelum kehabisan! ⚡`
  },
  professional: {
    label: 'Professional',
    emoji: '📈',
    rewrite: (txt: string) => `Rekan Bisnis,\n\nKami menginformasikan perkembangan terbaru mengenai: ${txt}\n\nSilakan tinjau detail lengkap pada tautan yang tersedia.\n\nSalam,\nAutoin Operations`
  }
};

function PlatformIcon({ platform, className = "w-5 h-5" }: { platform: string; className?: string }) {
  if (platform === 'whatsapp') {
    return (
      <svg className={`${className} text-emerald-500`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.908.533 3.69 1.465 5.215L2 22l4.928-1.412A9.97 9.97 0 0012.004 22c5.524 0 10.004-4.48 10.004-10.004C22.008 6.48 17.528 2 12.004 2zm0 18.008c-1.67 0-3.238-.456-4.6-1.25L4.4 19.6l.858-2.928a8.004 8.004 0 116.746 3.336zM15.908 13.4c-.22-.11-1.3-.642-1.503-.715-.2-.074-.347-.11-.495.11-.147.22-.57.715-.7.863-.128.147-.257.165-.477.055a6.002 6.002 0 01-1.77-1.093c-.633-.564-1.062-1.26-1.186-1.48-.124-.22-.013-.34.097-.45.1-.1.22-.257.33-.385.11-.128.147-.22.22-.367.073-.147.037-.275-.018-.385-.055-.11-.495-1.193-.68-1.637-.18-.433-.36-.374-.495-.38l-.42-.008c-.147 0-.386.055-.588.275-.2.22-.77.752-.77 1.834 0 1.082.788 2.128.9 2.275.11.147 1.55 2.365 3.755 3.318.524.226.934.362 1.254.464.526.167 1.004.143 1.382.087.42-.062 1.3-.532 1.485-1.046.183-.513.183-.953.128-1.046-.055-.093-.202-.147-.422-.257z" />
      </svg>
    );
  }
  if (platform === 'telegram') {
    return (
      <svg className={`${className} text-sky-500`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.16 1.56-.86 5.72-1.22 7.64-.15.81-.45 1.08-.74 1.1-.63.06-1.11-.41-1.72-.8-1-.62-1.55-1-2.52-1.64-1.12-.74-.39-1.14.24-1.8.17-.17 3.08-2.83 3.14-3.09.01-.03.01-.16-.07-.22-.08-.07-.2-.05-.28-.03-.12.02-2.03 1.28-5.73 3.77-.54.37-1.03.55-1.47.54-.48-.01-1.4-.27-2.08-.5-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.75 4-1.74 6.67-2.88 8.01-3.43 3.81-1.56 4.6-1.83 5.12-1.84.11 0 .37.03.54.17.14.12.18.28.2.44-.02.07-.02.14-.03.22z" />
      </svg>
    );
  }
  if (platform === 'discord') {
    return (
      <svg className={`${className} text-indigo-500`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.27 4.73a16.1 16.1 0 00-3.97-1.23.08.08 0 00-.08.04 11.23 11.23 0 00-.5 1.02.08.08 0 00.07.12 14.88 14.88 0 014.58 0 .08.08 0 00.07-.12 11.24 11.24 0 00-.5-1.02.08.08 0 00-.08-.04 16.09 16.09 0 00-3.97 1.23.07.07 0 00-.03.03 15.22 15.22 0 00-.32 1.34.07.07 0 00.07.08 14.3 14.3 0 004.9-.44.07.07 0 00.04-.06 18.06 18.06 0 00-1.89-6.3.07.07 0 00-.06-.04 16.22 16.22 0 00-4.8 1.48.08.08 0 00-.03.05c-.32.55-.66 1.13-.93 1.73a.08.08 0 01-.14 0c-.27-.6-.6-1.18-.93-1.73a.08.08 0 00-.03-.05 16.22 16.22 0 00-4.8-1.48.07.07 0 00-.06.04 18.06 18.06 0 00-1.89 6.3.07.07 0 00.04.06 14.3 14.3 0 004.9.44.07.07 0 00.07-.08 15.22 15.22 0 00-.32-1.34.07.07 0 00-.03-.03zM8.52 14.85c-.9 0-1.63-.82-1.63-1.83 0-1.02.72-1.83 1.63-1.83.91 0 1.64.82 1.64 1.83 0 1.01-.72 1.83-1.64 1.83zm6.96 0c-.9 0-1.63-.82-1.63-1.83 0-1.02.72-1.83 1.63-1.83.91 0 1.64.82 1.64 1.83 0 1.01-.72 1.83-1.64 1.83z" />
      </svg>
    );
  }
  return (
    <svg className={`${className} text-zinc-500`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export default function BroadcastCreate() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<number[]>([]);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  
  // Media states
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'pdf' | 'document'>('image');
  const [inputUrl, setInputUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  // AI assistant states
  const [aiTone, setAiTone] = useState<keyof typeof AI_TEMPLATES | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    api.get<Channel[]>('/api/channels').then(setChannels);
  }, []);

  function toggleChannel(id: number) {
    setSelectedChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function handleSelectAllChannels() {
    if (selectedChannels.length === channels.length) {
      setSelectedChannels([]);
    } else {
      setSelectedChannels(channels.map((c) => c.id));
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      const token = localStorage.getItem('autoin_token');
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${import.meta.env.PUBLIC_API_URL ?? 'http://localhost:8000'}/api/upload`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        });

        if (!res.ok) {
          throw new Error('Upload failed');
        }

        const data = await res.json();
        uploadedUrls.push(data.url);

        // Auto-detect type from first file
        if (i === 0) {
          const mime = file.type;
          if (mime.startsWith('image/')) {
            setMediaType('image');
          } else if (mime.startsWith('video/')) {
            setMediaType('video');
          } else if (mime.endsWith('pdf')) {
            setMediaType('pdf');
          } else {
            setMediaType('document');
          }
        }
      }

      setMediaUrls((prev) => [...prev, ...uploadedUrls]);
    } catch (err: any) {
      alert(err.message ?? 'Gagal mengunggah file.');
    } finally {
      setUploading(false);
    }
  };

  const handleAddUrl = () => {
    if (!inputUrl.trim()) return;
    if (!inputUrl.startsWith('http://') && !inputUrl.startsWith('https://')) {
      alert('Tolong masukkan URL yang valid (harus dimulai dengan http:// atau https://)');
      return;
    }
    setMediaUrls((prev) => [...prev, inputUrl.trim()]);
    setInputUrl('');
  };

  const handleRemoveUrl = (index: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== index));
  };

  async function handleSend() {
    if (!content.trim() || selectedChannels.length === 0) return;
    setSending(true);
    setResult(null);

    try {
      const broadcast = await api.post<{ id: number }>('/api/broadcasts', {
        title: title || undefined,
        content,
        media_url: mediaUrls.length > 0 ? JSON.stringify(mediaUrls) : undefined,
        media_type: mediaUrls.length > 0 ? mediaType : undefined,
        channel_ids: selectedChannels,
      });

      await api.post(`/api/broadcasts/${broadcast.id}/send`);
      setResult({ ok: true, message: '🚀 Broadcast sukses dikirim ke antrean platform!' });
      setContent('');
      setTitle('');
      setMediaUrls([]);
      setSelectedChannels([]);
    } catch (e: any) {
      setResult({ ok: false, message: e.message ?? 'Gagal memproses broadcast ke beberapa channel.' });
    } finally {
      setSending(false);
    }
  }

  // AI Generation simulation
  const handleAiRewrite = (tone: keyof typeof AI_TEMPLATES) => {
    if (!content.trim()) {
      alert('Tulis beberapa kata di kotak pesan terlebih dahulu agar AI bisa menyusun ulang!');
      return;
    }
    setAiTone(tone);
    setAiGenerating(true);
    
    // Simulate smart completion delay
    setTimeout(() => {
      const rewrittenText = AI_TEMPLATES[tone].rewrite(content);
      setContent(rewrittenText);
      setAiGenerating(false);
      setAiTone(null);
    }, 900);
  };

  return (
    <AdminLayout activePage="broadcast" title="Buat Broadcast">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Left Form: Details & Message (Colspan 2) */}
        <div className="lg:col-span-2 space-y-6">
          {result && (
            <div className={`rounded-xl p-4 border text-sm flex items-start gap-3 animate-fadeIn ${
              result.ok 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]' 
                : 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.05)]'
            }`}>
              {result.ok ? <Check className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
              <div>
                <p className="font-semibold">{result.ok ? 'Sukses' : 'Gagal'}</p>
                <p className="text-xs mt-1 opacity-90">{result.message}</p>
              </div>
            </div>
          )}

          {/* Form Fields Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h2 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 uppercase tracking-wider">Detail Pesan</h2>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Judul Broadcast (Opsional)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Promo Flash Sale Weekend"
                className="w-full bg-zinc-55 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-650 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-900 transition-all"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Konten Pesan Utama *</label>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold">{content.length} karakter</span>
              </div>
              
              <div className="relative">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Tulis detail promosi, pengumuman, atau notifikasi webhook kamu di sini..."
                  rows={8}
                  className="w-full bg-zinc-55 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3.5 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-650 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-900 transition-all resize-none leading-relaxed"
                />
                
                {aiGenerating && (
                  <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-col gap-2">
                    <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
                    <span className="text-xs text-white/80 dark:text-white/60 font-semibold font-sans">AI sedang memproses tone {aiTone}...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Media Attachment Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 uppercase tracking-wider">Lampiran Media / File</h2>
              </div>
              {mediaUrls.length > 0 && (
                <span className="text-[10px] bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 font-semibold px-2 py-0.5 rounded">
                  {mediaUrls.length} File Terpilih
                </span>
              )}
            </div>

            {/* Media Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Tipe Media</label>
              <div className="grid grid-cols-4 gap-2">
                {(['image', 'video', 'pdf', 'document'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setMediaType(type)}
                    className={`flex flex-col items-center justify-center py-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                      mediaType === type
                        ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                    }`}
                  >
                    {type === 'image' && <ImageIcon className="w-4 h-4 mb-1" />}
                    {type === 'video' && <Video className="w-4 h-4 mb-1" />}
                    {type === 'pdf' && <FileText className="w-4 h-4 mb-1" />}
                    {type === 'document' && <FileText className="w-4 h-4 mb-1" />}
                    <span className="capitalize">{type === 'pdf' ? 'PDF' : type}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Upload & Url Input Area */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* File Upload Button */}
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-950/40 transition-all">
                  <input
                    type="file"
                    multiple
                    accept={
                      mediaType === 'image' ? 'image/*' :
                      mediaType === 'video' ? 'video/*' :
                      mediaType === 'pdf' ? '.pdf' :
                      '*'
                    }
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin mb-1.5" />
                      <span className="text-xs text-zinc-550 dark:text-zinc-400 font-medium">Mengunggah...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-zinc-400 dark:text-zinc-500 mb-1.5" />
                      <span className="text-xs text-zinc-700 dark:text-zinc-300 font-semibold">Upload dari Komputer</span>
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-0.5">Mendukung multiple files</span>
                    </>
                  )}
                </label>

                {/* URL Direct Add */}
                <div className="flex flex-col justify-between border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-950/20">
                  <div>
                    <span className="text-xs text-zinc-700 dark:text-zinc-300 font-semibold block mb-1">Tambah Link URL</span>
                    <span className="text-[9px] text-zinc-450 dark:text-zinc-500 block mb-3">Punya file hosting eksternal?</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 text-zinc-800 dark:text-zinc-200"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddUrl();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddUrl}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Previews grid */}
              {mediaUrls.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-zinc-450 dark:text-zinc-505 uppercase tracking-widest">Daftar Lampiran</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {mediaUrls.map((url, idx) => (
                      <div key={idx} className="group relative border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between shadow-sm min-h-[100px]">
                        {mediaType === 'image' ? (
                          <div className="w-full h-16 relative bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center overflow-hidden">
                            <img
                              src={url}
                              alt={`Preview ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-full h-16 bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
                            {mediaType === 'video' && <Video className="w-6 h-6 text-zinc-450" />}
                            {mediaType === 'pdf' && <FileText className="w-6 h-6 text-red-500" />}
                            {mediaType === 'document' && <FileText className="w-6 h-6 text-blue-500" />}
                          </div>
                        )}
                        
                        {/* URL snippet footer */}
                        <div className="p-2 border-t border-zinc-150 dark:border-zinc-850 flex items-center justify-between bg-white dark:bg-zinc-900">
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono truncate max-w-[80%]">
                            {url.split('/').pop() || `file-${idx + 1}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveUrl(idx)}
                            className="text-red-500 hover:text-red-700 p-0.5 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Helper Card */}
          <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/[0.02] dark:bg-blue-500/[0.04] rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-sm text-zinc-850 dark:text-zinc-100">AI Assistant Rewrite v1</h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed">
              Tulis draf kasar pesanmu di atas, lalu pilih salah satu tombol tone gaya bahasa di bawah untuk melakukan format otomatis secara instan.
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(Object.keys(AI_TEMPLATES) as Array<keyof typeof AI_TEMPLATES>).map((key) => {
                const item = AI_TEMPLATES[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleAiRewrite(key)}
                    disabled={aiGenerating || !content.trim()}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white dark:bg-zinc-950 hover:bg-blue-50 dark:hover:bg-blue-500/10 border border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-500/30 text-xs text-zinc-700 dark:text-zinc-300 font-medium transition-all duration-300 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-zinc-950 cursor-pointer"
                  >
                    <span>{item.emoji}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Form: Channels Selection (Colspan 1) */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col min-h-[350px]">
            
            {/* Header select */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-150 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 uppercase tracking-wider">Platform Tujuan</h2>
              </div>
              
              {channels.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllChannels}
                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold uppercase tracking-wider bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded border border-blue-100 dark:border-blue-500/20 transition-all cursor-pointer"
                >
                  {selectedChannels.length === channels.length ? 'Reset All' : 'Select All'}
                </button>
              )}
            </div>

            {/* Channels List */}
            {channels.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                <Globe className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-3" />
                <p className="text-zinc-450 dark:text-zinc-500 text-xs mb-4">Belum ada channel terhubung</p>
                <a 
                  href="/channels" 
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 px-4 py-2 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all"
                >
                  + Hubungkan Dulu
                </a>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {channels.map((ch) => {
                  const isChecked = selectedChannels.includes(ch.id);
                  return (
                    <label 
                      key={ch.id} 
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        isChecked 
                          ? 'bg-blue-50 dark:bg-blue-600/10 border-blue-300 dark:border-blue-500/40 shadow-sm' 
                          : 'bg-zinc-50/50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleChannel(ch.id)}
                        className="w-4 h-4 accent-blue-600 rounded shrink-0 cursor-pointer"
                      />
                      <span className="shrink-0"><PlatformIcon platform={ch.platform} className="w-5 h-5" /></span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate text-zinc-800 dark:text-zinc-200">{ch.name}</div>
                        <div className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mt-0.5">{ch.platform}</div>
                      </div>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                        ch.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20'
                      }`}>
                        {ch.status.toUpperCase()}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Trigger Button */}
          <button
            onClick={handleSend}
            disabled={sending || !content.trim() || selectedChannels.length === 0}
            className="w-full btn-primary font-bold py-3.5 rounded-xl transition-all duration-200 shadow-sm flex items-center justify-center gap-2.5 cursor-pointer"
          >
            {sending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Memproses Broadcast...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Kirim Campaign ke {selectedChannels.length} Platform</span>
              </>
            )}
          </button>

          {/* Information Card */}
          <div className="bg-zinc-100/50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-5 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            <h4 className="font-semibold text-zinc-800 dark:text-zinc-300 mb-2 flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Petunjuk Pengiriman
            </h4>
            <p>
              Autoin menggunakan sistem antrean cerdas (smart queue). Pesan kamu akan diproses dan dikirim ke seluruh platform terpilih secara paralel. Anda dapat memantau status detail logs di menu Riwayat.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}


