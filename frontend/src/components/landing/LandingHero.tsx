import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Zap, CheckCircle, Sun, Moon, LayoutDashboard, MessageSquare, Play, FileText, Image as ImageIcon, Send, Code, Terminal } from 'lucide-react';

const aiSuggestions = [
  "Halo Kak! Terima kasih sudah menghubungi AUTOIN. Ini adalah contoh pesan otomatis menggunakan API AUTOIN. Keren kan? 😎",
  "🚨 PENGINGAT TAGIHAN: Yth. Kak Budi, tagihan Anda sebesar Rp 25.000 akan jatuh tempo besok. Silakan lakukan pembayaran ke rekening Virtual Account Anda. Terima kasih! 🙏",
  "🎉 PROMO SPESIAL GAJIAN! Dapatkan diskon hingga 50% untuk produk kecantikan favorit Anda hari ini saja. Gunakan kode promo: GAJIAN50 saat checkout. Beli sekarang: autoin.my.id/promo",
  "Halo Kak! 👋 Tim CS kami telah menerima tiket kendala Anda (#1092). Kami akan segera menghubungi Anda kembali dalam waktu maksimal 10 menit. Terima kasih atas kesabaran Anda. - AutoIn AI Assistant"
];

export default function LandingHero() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeTab, setActiveTab] = useState<'simulator' | 'dashboard' | 'api'>('simulator');
  const [apiLang, setApiLang] = useState<'curl' | 'js' | 'php' | 'python'>('curl');
  
  // Simulator states
  const [simMessage, setSimMessage] = useState('Halo Kak! Terima kasih sudah menghubungi AUTOIN. Ini adalah contoh pesan otomatis menggunakan API AUTOIN. Keren kan? 😎');
  const [simMediaType, setSimMediaType] = useState<'none' | 'image' | 'video' | 'pdf'>('image');
  const [simMediaPreset, setSimMediaPreset] = useState('promo');

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
    const initial = saved ?? 'dark';
    setTheme(initial);
    if (initial === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    if (next === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    }
  };

  const isDark = theme === 'dark';

  // Handle media presets
  const selectPreset = (type: 'none' | 'image' | 'video' | 'pdf', preset: string) => {
    setSimMediaType(type);
    setSimMediaPreset(preset);
  };

  const handleAiWrite = () => {
    const randomIndex = Math.floor(Math.random() * aiSuggestions.length);
    setSimMessage(aiSuggestions[randomIndex]);
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 pt-24 sm:pt-32 pb-16 sm:pb-24 text-center overflow-hidden transition-colors duration-300 bg-[#f8fafc] dark:bg-[#030712]">
      {/* Wavy Aurora Background (Northern Lights wave curtains) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-70 dark:opacity-85">
        <div className="absolute inset-0 aurora-bg-wave-1" />
        <div className="absolute inset-0 aurora-bg-wave-2" />
      </div>
      
      {/* Moving Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.05)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] pointer-events-none" />

      {/* Floating Header Navbar */}
      <header className="absolute top-0 left-0 right-0 z-50 h-20 px-4 sm:px-12 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center border shadow-lg backdrop-blur-md bg-white/5 border-zinc-200 dark:border-white/10">
            <img src="/autoin-logo.webp" alt="AUTOIN Logo" className="w-full h-full object-cover" />
          </div>
          <span className="block font-black text-base tracking-tight font-display text-zinc-900 dark:text-white">
            AutoIn
          </span>
        </div>

        {/* Navigation Menu Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-zinc-650 dark:text-white/70">
          <a href="#features" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Fitur</a>
          <a href="#pricing" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Harga</a>
          <a href="#faq" className="hover:text-zinc-900 dark:hover:text-white transition-colors">FAQ</a>
          <a href="/terms" className="hover:text-zinc-900 dark:hover:text-white transition-colors text-blue-600 dark:text-blue-400">Syarat & Ketentuan</a>
          <a href="/privacy" className="hover:text-zinc-900 dark:hover:text-white transition-colors text-blue-600 dark:text-blue-400">Kebijakan Privasi</a>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border transition-all duration-300 cursor-pointer bg-white dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-650 dark:text-white/70 hover:bg-zinc-150 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white"
            title={isDark ? 'Mode Terang' : 'Mode Gelap'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <a
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-xl px-4.5 py-2.5 text-xs font-bold transition-all duration-300 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-850 dark:text-white/90 hover:bg-zinc-100 dark:hover:bg-white/10 shadow-sm cursor-pointer"
          >
            <span>Masuk Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      <div className="relative z-10 flex flex-col items-center max-w-6xl mx-auto w-full">
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 bg-blue-500/10 dark:bg-white/5 border border-blue-500/20 dark:border-white/8 backdrop-blur-md rounded-full px-4.5 py-1.5 text-xs sm:text-sm text-blue-600 dark:text-white/75 mb-8 hover:border-blue-550 dark:hover:border-white/15 transition-all duration-300 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-blue-500 dark:text-cyan-400 animate-pulse" />
          <span className="font-semibold tracking-wide">Platform Broadcasting WhatsApp Premium</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight max-w-4xl mb-6 font-display leading-[1.08] text-zinc-900 dark:text-white">
          Broadcast Sekali, <br />
          <span className="text-gradient-brand">
            Terkirim Instan & Otomatis.
          </span>
        </h1>

        {/* Hero Description */}
        <p className="text-zinc-650 dark:text-white/60 text-sm sm:text-base md:text-lg max-w-2xl mb-10 leading-relaxed px-2">
          Koneksikan WhatsApp Anda secara langsung tanpa perlu repot mengatur VPS sendiri. Kirim kampanye promosi massal atau integrasikan API notifikasi real-time dalam hitungan menit.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-row items-center justify-center gap-3 mb-16 w-full sm:w-auto px-4">
          <a
            href="/dashboard"
            className="group relative inline-flex items-center justify-center gap-1.5 bg-gradient-brand text-white font-bold px-6 sm:px-8 py-3.5 rounded-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(37,99,235,0.3)] hover:scale-[1.02] cursor-pointer text-xs w-1/2 sm:w-auto"
          >
            <span>Mulai Uji Coba</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </a>
          <a
            href="#features"
            className="inline-flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-white/8 bg-white dark:bg-white/5 text-zinc-700 dark:text-white/80 px-6 sm:px-8 py-3.5 rounded-2xl hover:border-zinc-300 dark:hover:border-white/20 hover:bg-zinc-50 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white transition-all duration-300 cursor-pointer text-xs shadow-sm dark:shadow-none w-1/2 sm:w-auto"
          >
            <span>Eksplor Fitur</span>
          </a>
        </div>

        {/* Key Features Icons bar */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mb-16 text-xs sm:text-sm text-zinc-500 dark:text-white/50 font-bold">
          <span className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            Gratis 3 Broadcast
          </span>
          <span className="flex items-center gap-2 text-zinc-500 dark:text-white/50">
            <Sparkles className="w-4 h-4 text-purple-500" />
            AI Writer Assistant
          </span>
          <span className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500 animate-pulse" />
            Pairing Instan Cepat
          </span>
        </div>

        {/* Dual Tab Mockup Preview (Dashboard vs Live Simulator) */}
        <div className="relative w-full max-w-4xl mx-auto rounded-3xl border border-zinc-200 dark:border-white/8 bg-white dark:bg-[#0a0f1d]/50 p-2 sm:p-4 shadow-2xl dark:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl blur opacity-20 pointer-events-none" />
          
          {/* Tab Selector Header */}
          <div className="relative rounded-2xl overflow-hidden border border-zinc-150 dark:border-white/5 bg-white dark:bg-[#030712] flex flex-col text-left transition-colors duration-300">
            
            {/* Toolbar Area */}
            <div className="border-b border-zinc-150 dark:border-white/5 bg-zinc-50/80 dark:bg-[#090d16]/80 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors duration-300">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                <span className="text-[10px] text-zinc-400 dark:text-white/30 ml-2 font-mono truncate max-w-[150px] sm:max-w-none">
                  demo-dashboard.autoin.id
                </span>
              </div>
              
              {/* Tabs Switcher */}
              <div className="flex bg-zinc-200/60 dark:bg-white/5 p-0.5 rounded-xl border border-zinc-250 dark:border-white/5 text-[10px] font-bold">
                <button
                  onClick={() => setActiveTab('simulator')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'simulator'
                      ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Live Simulator WA</span>
                </button>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'dashboard'
                      ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Dashboard Preview</span>
                </button>
                <button
                  onClick={() => setActiveTab('api')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'api'
                      ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>Developer REST API</span>
                </button>
              </div>
            </div>

            {/* TAB CONTENT: SIMULATOR */}
            {activeTab === 'simulator' && (
              <div className="p-4 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch font-sans animate-fadeIn">
                {/* Control Panel */}
                <div className="space-y-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full mb-2">
                        Langkah 1
                      </span>
                      <h3 className="text-sm font-bold text-zinc-800 dark:text-white">Pilih Lampiran Media</h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed mb-3">
                        Kirim pesan dengan gambar promosi, invoice PDF, atau tanpa berkas media sama sekali.
                      </p>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-bold">
                        <button
                          onClick={() => selectPreset('none', 'none')}
                          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border transition-all cursor-pointer ${
                            simMediaType === 'none'
                              ? 'bg-blue-650/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
                              : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500'
                          }`}
                        >
                          Teks Saja
                        </button>
                        <button
                          onClick={() => selectPreset('image', 'promo')}
                          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border transition-all cursor-pointer ${
                            simMediaType === 'image'
                              ? 'bg-blue-650/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
                              : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500'
                          }`}
                        >
                          <ImageIcon className="w-3 h-3" />
                          Gambar Banner
                        </button>
                        <button
                          onClick={() => selectPreset('pdf', 'invoice')}
                          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border transition-all cursor-pointer ${
                            simMediaType === 'pdf'
                              ? 'bg-blue-650/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
                              : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500'
                          }`}
                        >
                          <FileText className="w-3 h-3" />
                          Invoice PDF
                        </button>
                        <button
                          onClick={() => selectPreset('video', 'tutorial')}
                          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border transition-all cursor-pointer ${
                            simMediaType === 'video'
                              ? 'bg-blue-650/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
                              : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500'
                          }`}
                        >
                          <Play className="w-3 h-3" />
                          Video Tutorial
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full mb-2">
                        Langkah 2
                      </span>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-zinc-800 dark:text-white">Tulis Teks Pesan</h3>
                        <button
                          type="button"
                          onClick={handleAiWrite}
                          className="flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 px-2 py-1 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 animate-pulse" />
                          <span>AI Tulis Pesan</span>
                        </button>
                      </div>
                      <textarea
                        value={simMessage}
                        onChange={(e) => setSimMessage(e.target.value)}
                        placeholder="Ketik sesuatu..."
                        className="w-full h-28 p-3 rounded-xl border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-950 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-650 focus:outline-none focus:border-blue-500 transition-all font-sans resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 rounded-xl text-[10.5px] text-emerald-800 dark:text-emerald-400 font-medium">
                    <span>💡</span>
                    <span>Tipe pesan di samping akan terkirim secara otomatis melalui device WA kamu!</span>
                  </div>
                </div>

                {/* WhatsApp Mobile Mockup */}
                <div className="flex items-center justify-center">
                  <div className="w-[280px] h-[480px] rounded-[36px] border-8 border-zinc-800 dark:border-zinc-900 bg-zinc-100 dark:bg-[#070b14] shadow-2xl relative overflow-hidden flex flex-col font-sans">
                    
                    {/* Mockup Camera notch */}
                    <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-20 h-4 rounded-full bg-zinc-800 dark:bg-zinc-900 z-50 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-700/80 mr-3" />
                      <span className="w-1 h-1 rounded-full bg-zinc-700/80" />
                    </div>

                    {/* WA Header */}
                    <div className="bg-[#075e54] dark:bg-[#128c7e]/80 pt-6 pb-2.5 px-3 flex items-center justify-between text-white shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-white/20 overflow-hidden flex items-center justify-center border border-white/10">
                          <img src="/autoin-logo.webp" alt="AUTOIN" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="font-bold text-[10px] leading-tight">AUTOIN API</p>
                          <p className="text-[7.5px] text-white/70 leading-none">Online</p>
                        </div>
                      </div>
                      <div className="text-[9px] font-bold opacity-60">10:45 AM</div>
                    </div>

                    {/* WA Chat Wallpaper Area */}
                    <div className="flex-1 p-3 overflow-y-auto space-y-3 flex flex-col justify-end bg-[#efeae2] dark:bg-[#0b101c]/90 relative">
                      
                      {/* Incoming Message Bubble */}
                      <div className="max-w-[85%] bg-white dark:bg-[#1f2c34] text-zinc-950 dark:text-zinc-100 p-2 rounded-xl rounded-tl-none shadow-xs border border-zinc-200/50 dark:border-transparent text-[10px] leading-relaxed self-start">
                        <p>Bagaimana cara integrasi media di AUTOIN?</p>
                        <span className="block text-right text-[7px] text-zinc-400 dark:text-zinc-500 mt-1">10:44 AM</span>
                      </div>

                      {/* Outgoing Message Bubble (Generated by simulator) */}
                      <div className="max-w-[85%] bg-[#dcf8c6] dark:bg-[#005c4b] text-zinc-950 dark:text-zinc-100 p-2 rounded-xl rounded-tr-none shadow-sm text-[10px] leading-relaxed self-end space-y-2 border border-emerald-100/40 dark:border-transparent animate-fadeIn">
                        
                        {/* Media Preview Box */}
                        {simMediaType === 'image' && (
                          <div className="rounded-lg overflow-hidden border border-emerald-200/20 bg-zinc-150/40 dark:bg-black/20 aspect-video relative flex items-center justify-center">
                            <img src="/autoin-logo.webp" alt="Media Preview" className="w-full h-full object-cover" />
                          </div>
                        )}

                        {simMediaType === 'pdf' && (
                          <div className="rounded-lg p-2 bg-[#bfeab3] dark:bg-[#025041] flex items-center gap-2 font-semibold">
                            <FileText className="w-7 h-7 text-red-500" />
                            <div className="min-w-0">
                              <p className="text-[8.5px] font-bold truncate">Invoice_Receipt_1092.pdf</p>
                              <p className="text-[7.5px] text-zinc-550 dark:text-zinc-400">124 KB · PDF Document</p>
                            </div>
                          </div>
                        )}

                        {simMediaType === 'video' && (
                          <div className="rounded-lg overflow-hidden bg-black/40 aspect-video relative flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-white border border-white/20">
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            </div>
                            <span className="absolute bottom-1 right-1 text-[7.5px] bg-black/60 px-1 py-0.2 rounded text-white font-mono">0:45</span>
                          </div>
                        )}

                        {/* Text */}
                        <p className="whitespace-pre-wrap">{simMessage || ' '}</p>
                        
                        {/* Time & Read Tick */}
                        <div className="flex items-center justify-end gap-0.5 text-[7px] text-zinc-500 dark:text-white/40 mt-1">
                          <span>10:45 AM</span>
                          <span className="text-blue-500">✓✓</span>
                        </div>
                      </div>

                    </div>

                    {/* WA Input Bar */}
                    <div className="bg-zinc-100 dark:bg-[#1f2c34] p-1.5 flex items-center gap-1 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
                      <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-full px-2.5 py-1 text-[9px] text-zinc-400 dark:text-zinc-500 font-medium">
                        Ketik pesan...
                      </div>
                      <div className="w-6 h-6 rounded-full bg-[#128c7e] flex items-center justify-center text-white cursor-default">
                        <Send className="w-2.5 h-2.5 fill-current ml-0.5" />
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: ANALYTICS DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="p-4 sm:p-6 grid grid-cols-3 gap-4 font-sans text-xs select-none animate-fadeIn">
                {/* Sidebar */}
                <div className="space-y-4 border-r border-zinc-150 dark:border-white/5 pr-4 hidden sm:block">
                  <div className="font-bold text-zinc-400 dark:text-white tracking-wider text-[10px] uppercase dark:opacity-40">Main Menu</div>
                  <div className="space-y-1">
                    <div className="bg-zinc-100 dark:bg-white/5 text-zinc-900 dark:text-white px-3 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> Dashboard
                    </div>
                    <div className="text-zinc-500 dark:text-white/50 px-3 py-2 rounded-lg flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-transparent" /> Broadcasts
                    </div>
                    <div className="text-zinc-500 dark:text-white/50 px-3 py-2 rounded-lg flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-transparent" /> Channels
                    </div>
                    <div className="text-zinc-500 dark:text-white/50 px-3 py-2 rounded-lg flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-transparent" /> Billing
                    </div>
                  </div>
                </div>
                
                {/* Content Panel */}
                <div className="col-span-3 sm:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-zinc-800 dark:text-white">Broadcast Overview</h3>
                      <p className="text-[10px] text-zinc-400 dark:text-white/40">Real-time status of WhatsApp logs</p>
                    </div>
                    <span className="bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] px-2.5 py-0.5 rounded-full font-semibold">
                      v1.2 Active
                    </span>
                  </div>
                  
                  {/* Micro Widgets */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="bg-zinc-50 dark:bg-[#111827]/60 border border-zinc-150 dark:border-white/5 rounded-xl p-3 transition-colors">
                      <div className="text-[9px] text-zinc-400 dark:text-white/40">Total Broadcast</div>
                      <div className="text-sm sm:text-base font-bold mt-1 text-zinc-800 dark:text-white">1,482</div>
                      <div className="text-[8px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">↑ 12% vs last week</div>
                    </div>
                    <div className="bg-zinc-50 dark:bg-[#111827]/60 border border-zinc-150 dark:border-white/5 rounded-xl p-3 transition-colors">
                      <div className="text-[9px] text-zinc-400 dark:text-white/40">Delivery Rate</div>
                      <div className="text-sm sm:text-base font-bold mt-1 text-zinc-800 dark:text-white">99.2%</div>
                      <div className="text-[8px] text-blue-600 dark:text-blue-400 mt-0.5 font-medium">Optimal health</div>
                    </div>
                    <div className="bg-zinc-50 dark:bg-[#111827]/60 border border-zinc-150 dark:border-white/5 rounded-xl p-3 transition-colors">
                      <div className="text-[9px] text-zinc-400 dark:text-white/40">Active Channels</div>
                      <div className="text-sm sm:text-base font-bold mt-1 text-zinc-800 dark:text-white">8 / 8</div>
                      <div className="text-[8px] text-purple-600 dark:text-purple-400 mt-0.5 font-medium">All connected</div>
                    </div>
                  </div>
                  
                  {/* Micro Chart Mockup */}
                  <div className="bg-zinc-50 dark:bg-[#111827]/60 border border-zinc-150 dark:border-white/5 rounded-xl p-3 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] text-zinc-550 dark:text-white/55">Delivery Analytics (Last 7 Days)</span>
                      <span className="text-[8px] text-zinc-400 dark:text-white/30">Updated just now</span>
                    </div>
                    <div className="h-16 flex items-end gap-1.5 pt-4">
                      {[35, 45, 30, 60, 85, 70, 95].map((val, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full bg-gradient-to-t from-blue-600 to-purple-500 rounded-t-sm transition-all duration-300" style={{ height: `${val}%` }} />
                          <span className="text-[8px] text-zinc-400 dark:text-white/30 scale-75">H-{6-idx}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: DEVELOPER REST API */}
            {activeTab === 'api' && (
              <div className="p-4 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch font-sans animate-fadeIn text-left">
                {/* Features list */}
                <div className="space-y-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full mb-2">
                        Integrasi Developer
                      </span>
                      <h3 className="text-lg font-bold text-zinc-800 dark:text-white">API Ready & Fleksibel</h3>
                      <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed">
                        Hubungkan sistem pembayaran, CRM, web toko online, atau aplikasi buatan Anda sendiri langsung ke WhatsApp dengan satu REST API sederhana.
                      </p>
                    </div>

                    <div className="space-y-3.5">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-zinc-800 dark:text-white">Autentikasi Bearer Token</h4>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Amankan integrasi endpoint Anda dengan kredensial API Key dari dashboard.</p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-zinc-800 dark:text-white">Multi-Media Dukungan</h4>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Kirim teks pesan biasa, lampiran gambar promosi, invoice PDF, hingga video tutorial.</p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 flex items-center justify-center shrink-0 text-purple-600 dark:text-purple-400">
                          <Code className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-zinc-800 dark:text-white">Webhook Callback Status</h4>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Terima response balik secara instan ketika pesan sukses atau gagal dikirim.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <a 
                    href="/dashboard"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Dapatkan API Key Gratis di Dashboard &rarr;
                  </a>
                </div>

                {/* Interactive Code Playground Panel */}
                <div className="bg-[#030712] border border-zinc-250 dark:border-white/5 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xl">
                  {/* Language selectors */}
                  <div className="bg-[#090d16] border-b border-white/5 px-4 py-2 flex items-center gap-2 overflow-x-auto">
                    {[
                      { id: 'curl', label: 'cURL' },
                      { id: 'js', label: 'JavaScript' },
                      { id: 'php', label: 'PHP' },
                      { id: 'python', label: 'Python' }
                    ].map(lang => (
                      <button
                        key={lang.id}
                        onClick={() => setApiLang(lang.id as any)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                          apiLang === lang.id
                            ? 'bg-white/10 text-white'
                            : 'text-zinc-500 hover:text-zinc-350'
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>

                  {/* Code editor body */}
                  <div className="p-4 flex-1 font-mono text-[10.5px] leading-relaxed text-zinc-300 overflow-y-auto max-h-[220px]">
                    {apiLang === 'curl' && (
                      <pre className="whitespace-pre-wrap select-all">
{`curl -X POST "https://api.autoin.my.id/api/v1/send" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "628123456789",
    "message": "Halo! Ini adalah notifikasi otomatis dari API AutoIn 🚀",
    "mediaUrl": "https://r2.autoin.my.id/media/promo.png"
  }'`}
                      </pre>
                    )}
                    {apiLang === 'js' && (
                      <pre className="whitespace-pre-wrap select-all">
{`fetch('https://api.autoin.my.id/api/v1/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    to: '628123456789',
    message: 'Halo! Ini adalah notifikasi otomatis dari API AutoIn 🚀',
    mediaUrl: 'https://r2.autoin.my.id/media/promo.png'
  })
})
.then(res => res.json())
.then(data => console.log('Pesan terkirim:', data));`}
                      </pre>
                    )}
                    {apiLang === 'php' && (
                      <pre className="whitespace-pre-wrap select-all">
{`<?php
$curl = curl_init();
curl_setopt_array($curl, [
  CURLOPT_URL => "https://api.autoin.my.id/api/v1/send",
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_CUSTOMREQUEST => "POST",
  CURLOPT_POSTFIELDS => json_encode([
    "to" => "628123456789",
    "message" => "Halo! Ini adalah notifikasi otomatis dari API AutoIn 🚀",
    "mediaUrl" => "https://r2.autoin.my.id/media/promo.png"
  ]),
  CURLOPT_HTTPHEADER => [
    "Authorization: Bearer YOUR_API_KEY",
    "Content-Type: application/json"
  ],
]);
$response = curl_exec($curl);
curl_close($curl);
echo $response;`}
                      </pre>
                    )}
                    {apiLang === 'python' && (
                      <pre className="whitespace-pre-wrap select-all">
{`import requests

url = "https://api.autoin.my.id/api/v1/send"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}
payload = {
    "to": "628123456789",
    "message": "Halo! Ini adalah notifikasi otomatis dari API AutoIn 🚀",
    "mediaUrl": "https://r2.autoin.my.id/media/promo.png"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`}
                      </pre>
                    )}
                  </div>

                  {/* Terminal bar footer */}
                  <div className="bg-[#090d16]/60 border-t border-white/5 px-4 py-2.5 flex items-center justify-between text-[9px] text-zinc-550">
                    <div className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-zinc-600" />
                      <span>Response: 200 OK</span>
                    </div>
                    <span>Klik kode untuk menyalin</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </section>
  );
}
