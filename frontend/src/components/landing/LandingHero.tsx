import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Zap, CheckCircle, Shield, Sun, Moon } from 'lucide-react';

export default function LandingHero() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

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

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 pt-24 sm:pt-32 pb-16 sm:pb-20 text-center overflow-hidden transition-colors duration-300 bg-[#f8fafc] dark:bg-[#030712]">
      {/* Decorative Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[30%] left-[50%] -translate-x-1/2 w-[800px] h-[300px] bg-glow-radial pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.04)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* Floating Header Navbar */}
      <header className="absolute top-0 left-0 right-0 z-50 h-20 px-4 sm:px-12 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center border shadow-lg backdrop-blur-md bg-white/5 border-zinc-200 dark:border-white/10">
            <img src="/autoin-logo.webp" alt="AUTOIN Logo" className="w-full h-full object-cover" />
          </div>
          <span className="hidden xs:block font-extrabold text-base tracking-tight uppercase font-display text-zinc-900 dark:text-white">
            AUTOIN
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border transition-all duration-300 cursor-pointer bg-white dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-650 dark:text-white/70 hover:bg-zinc-150 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white"
            title={isDark ? 'Mode Terang' : 'Mode Gelap'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <a
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-300 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-850 dark:text-white/90 hover:bg-zinc-100 dark:hover:bg-white/10 shadow-sm cursor-pointer"
          >
            <span>Masuk Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      <div className="relative z-10 flex flex-col items-center max-w-5xl mx-auto w-full">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/8 backdrop-blur-md rounded-full px-4.5 py-1.5 text-xs sm:text-sm text-zinc-650 dark:text-white/70 mb-8 hover:border-zinc-300 dark:hover:border-white/15 transition-all duration-300 shadow-sm dark:shadow-none">
          <Sparkles className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400 animate-pulse" />
          <span className="font-medium">Platform Broadcasting WhatsApp Modern</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight max-w-4xl mb-6 font-display leading-[1.1] text-zinc-900 dark:text-white">
          Broadcast Sekali, <br />
          <span className="text-gradient-brand">
            Terkirim Secara Instan & Otomatis.
          </span>
        </h1>

        {/* Description */}
        <p className="text-zinc-600 dark:text-white/60 text-base sm:text-lg md:text-xl max-w-2xl mb-10 leading-relaxed px-2">
          Hubungkan WhatsApp dan mulai kirim pesan otomatis dalam hitungan detik.
          Kirim kampanye pesan secara serentak dari satu dashboard tanpa setup VPS yang rumit.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-row items-center justify-center gap-3 mb-16 w-full sm:w-auto px-2">
          <a
            href="/dashboard"
            className="group relative inline-flex items-center justify-center gap-1.5 bg-gradient-brand text-white font-semibold px-3 sm:px-8 py-3.5 rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(37,99,235,0.3)] hover:scale-[1.02] cursor-pointer text-xs w-1/2 sm:w-auto"
          >
            <span>Mulai Gratis</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </a>
          <a
            href="#features"
            className="inline-flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-white/8 bg-white dark:bg-white/5 text-zinc-700 dark:text-white/80 px-3 sm:px-8 py-3.5 rounded-xl hover:border-zinc-300 dark:hover:border-white/20 hover:bg-zinc-50 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white transition-all duration-300 cursor-pointer text-xs shadow-sm dark:shadow-none w-1/2 sm:w-auto"
          >
            <span>Eksplor Fitur</span>
          </a>
        </div>

        {/* Key Points */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mb-20 text-xs sm:text-sm text-zinc-500 dark:text-white/50 font-medium">
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            Trial 3 Broadcast & 1 Template
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-purple-500" />
            Asisten AI Penulis Pesan
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-yellow-500" />
            Pairing WhatsApp Instan
          </span>
        </div>

        {/* Interactive App Mockup Preview */}
        <div className="relative w-full max-w-4xl mx-auto rounded-2xl border border-zinc-200 dark:border-white/8 bg-white dark:bg-[#0a0f1d]/50 p-1.5 sm:p-3 shadow-xl dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000" />
          <div className="relative rounded-xl overflow-hidden border border-zinc-150 dark:border-white/5 bg-white dark:bg-[#030712] aspect-auto min-h-[300px] sm:aspect-[16/10] sm:min-h-0 flex flex-col text-left transition-colors duration-300">
            {/* Mockup Header */}
            <div className="border-b border-zinc-150 dark:border-white/5 bg-zinc-50 dark:bg-[#090d16] px-4 py-3 flex items-center justify-between transition-colors duration-300">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                <span className="text-[11px] text-zinc-400 dark:text-white/30 ml-2 font-mono">dashboard.autoin.id</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-zinc-500 dark:text-white/50 font-medium">Auto-Sync Active</span>
              </div>
            </div>
            {/* Mockup Body */}
            <div className="flex-1 p-4 sm:p-6 grid grid-cols-3 gap-4 font-sans text-xs select-none">
              {/* Sidebar */}
              <div className="space-y-4 border-r border-zinc-150 dark:border-white/5 pr-4 hidden sm:block">
                <div className="font-bold text-zinc-400 dark:text-white tracking-wider text-[11px] uppercase dark:opacity-40">Main Menu</div>
                <div className="space-y-1">
                  <div className="bg-zinc-100 dark:bg-white/5 text-zinc-900 dark:text-white px-3 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Dashboard
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
                    <div className="text-[10px] text-zinc-400 dark:text-white/40">Total Broadcast</div>
                    <div className="text-base font-bold mt-1 text-zinc-800 dark:text-white">1,482</div>
                    <div className="text-[8px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">↑ 12% vs last week</div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-[#111827]/60 border border-zinc-150 dark:border-white/5 rounded-xl p-3 transition-colors">
                    <div className="text-[10px] text-zinc-400 dark:text-white/40">Delivery Rate</div>
                    <div className="text-base font-bold mt-1 text-zinc-800 dark:text-white">99.2%</div>
                    <div className="text-[8px] text-blue-600 dark:text-blue-400 mt-0.5 font-medium">Optimal health</div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-[#111827]/60 border border-zinc-150 dark:border-white/5 rounded-xl p-3 transition-colors">
                    <div className="text-[10px] text-zinc-400 dark:text-white/40">Active Channels</div>
                    <div className="text-base font-bold mt-1 text-zinc-800 dark:text-white">8 / 8</div>
                    <div className="text-[8px] text-purple-600 dark:text-purple-400 mt-0.5 font-medium">All connected</div>
                  </div>
                </div>
                
                {/* Micro Chart Mockup */}
                <div className="bg-zinc-50 dark:bg-[#111827]/60 border border-zinc-150 dark:border-white/5 rounded-xl p-3 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-zinc-500 dark:text-white/50">Delivery Analytics (Last 7 Days)</span>
                    <span className="text-[8px] text-zinc-450 dark:text-white/30">Updated just now</span>
                  </div>
                  <div className="h-16 flex items-end gap-1.5 pt-4">
                    {[35, 45, 30, 60, 85, 70, 95].map((val, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-gradient-to-t from-blue-600 to-purple-500 rounded-t-sm" style={{ height: `${val}%` }} />
                        <span className="text-[8px] text-zinc-400 dark:text-white/30 scale-75">H-{6-idx}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
