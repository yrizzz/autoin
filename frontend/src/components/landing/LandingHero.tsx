import { Sparkles, ArrowRight, Zap, CheckCircle, Shield } from 'lucide-react';

export default function LandingHero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-32 pb-20 text-center overflow-hidden bg-[#030712]">
      {/* Decorative Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[30%] left-[50%] -translate-x-1/2 w-[800px] h-[300px] bg-glow-radial pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-5xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/8 backdrop-blur-md rounded-full px-4.5 py-1.5 text-xs sm:text-sm text-white/70 mb-8 hover:border-white/15 transition-all duration-300">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="font-medium">Platform Broadcasting Multi-Channel Modern</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight max-w-4xl mb-6 font-display leading-[1.1]">
          Broadcast Sekali, <br />
          <span className="text-gradient-brand">
            Terkirim ke Semua Platform.
          </span>
        </h1>

        {/* Description */}
        <p className="text-white/60 text-base sm:text-lg md:text-xl max-w-2xl mb-10 leading-relaxed">
          Hubungkan WhatsApp, Telegram, Discord, Email, dan Webhook dalam hitungan detik. 
          Kirim kampanye pesan secara serentak dari satu dashboard tanpa setup VPS yang rumit.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-16 w-full sm:w-auto px-4">
          <a
            href="/dashboard"
            className="group relative inline-flex items-center justify-center gap-2 bg-gradient-brand text-white font-semibold px-8 py-3.5 rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(37,99,235,0.3)] hover:scale-[1.02]"
          >
            <span>Mulai Gratis Sekarang</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
          <a
            href="#features"
            className="inline-flex items-center justify-center gap-2 border border-white/8 bg-white/5 text-white/80 px-8 py-3.5 rounded-xl hover:border-white/20 hover:bg-white/10 hover:text-white transition-all duration-300"
          >
            <span>Eksplor Fitur</span>
          </a>
        </div>

        {/* Key Points */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mb-20 text-xs sm:text-sm text-white/50">
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            5 Free Trial Broadcast
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-yellow-500" />
            Setup kurang dari 2 menit
          </span>
          <span className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-blue-500" />
            Tanpa perlu Kartu Kredit
          </span>
        </div>

        {/* Interactive App Mockup Preview */}
        <div className="relative w-full max-w-4xl mx-auto rounded-2xl border border-white/8 bg-[#0a0f1d]/50 p-2 sm:p-3 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000" />
          <div className="relative rounded-xl overflow-hidden border border-white/5 bg-[#030712] aspect-[16/10] flex flex-col text-left">
            {/* Mockup Header */}
            <div className="border-b border-white/5 bg-[#090d16] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                <span className="text-[11px] text-white/30 ml-2 font-mono">dashboard.autoin.id</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-white/50 font-medium">Auto-Sync Active</span>
              </div>
            </div>
            {/* Mockup Body */}
            <div className="flex-1 p-4 sm:p-6 grid grid-cols-3 gap-4 font-sans text-xs select-none">
              {/* Sidebar */}
              <div className="space-y-4 border-r border-white/5 pr-4 hidden sm:block">
                <div className="font-bold text-white tracking-wider text-[11px] uppercase opacity-40">Main Menu</div>
                <div className="space-y-1">
                  <div className="bg-white/5 text-white px-3 py-2 rounded-lg font-medium flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Dashboard
                  </div>
                  <div className="text-white/50 px-3 py-2 rounded-lg flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-transparent" /> Broadcasts
                  </div>
                  <div className="text-white/50 px-3 py-2 rounded-lg flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-transparent" /> Channels
                  </div>
                  <div className="text-white/50 px-3 py-2 rounded-lg flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-transparent" /> Billing
                  </div>
                </div>
              </div>
              
              {/* Content Panel */}
              <div className="col-span-3 sm:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-white">Broadcast Overview</h3>
                    <p className="text-[10px] text-white/40">Real-time status of multi-channel logs</p>
                  </div>
                  <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] px-2.5 py-0.5 rounded-full font-semibold">
                    v1.2 Active
                  </span>
                </div>
                
                {/* Micro Widgets */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-[#111827]/60 border border-white/5 rounded-xl p-3">
                    <div className="text-[10px] text-white/40">Total Broadcast</div>
                    <div className="text-base font-bold mt-1 text-white">1,482</div>
                    <div className="text-[8px] text-emerald-400 mt-0.5 font-medium">↑ 12% vs last week</div>
                  </div>
                  <div className="bg-[#111827]/60 border border-white/5 rounded-xl p-3">
                    <div className="text-[10px] text-white/40">Delivery Rate</div>
                    <div className="text-base font-bold mt-1 text-white">99.2%</div>
                    <div className="text-[8px] text-blue-400 mt-0.5 font-medium">Optimal health</div>
                  </div>
                  <div className="bg-[#111827]/60 border border-white/5 rounded-xl p-3">
                    <div className="text-[10px] text-white/40">Active Channels</div>
                    <div className="text-base font-bold mt-1 text-white">8 / 8</div>
                    <div className="text-[8px] text-purple-400 mt-0.5 font-medium">All connected</div>
                  </div>
                </div>
                
                {/* Micro Chart Mockup */}
                <div className="bg-[#111827]/60 border border-white/5 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-white/50">Delivery Analytics (Last 7 Days)</span>
                    <span className="text-[8px] text-white/30">Updated just now</span>
                  </div>
                  <div className="h-16 flex items-end gap-1.5 pt-4">
                    {[35, 45, 30, 60, 85, 70, 95].map((val, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-gradient-to-t from-blue-600 to-purple-500 rounded-t-sm" style={{ height: `${val}%` }} />
                        <span className="text-[8px] text-white/30 scale-75">H-{6-idx}</span>
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

