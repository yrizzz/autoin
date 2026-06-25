import { Share2, Calendar, BarChart3, Sparkles, Webhook, Code, Bot, Puzzle, Users } from 'lucide-react';

const features = [
  {
    icon: Share2,
    iconColor: 'text-blue-500 dark:text-blue-400',
    hoverBorder: 'hover:border-blue-500/40 dark:hover:border-blue-500/30',
    hoverGlow: 'group-hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.22)]',
    title: 'Instant Broadcast',
    desc: 'Kirim satu pesan ke banyak nomor WhatsApp sekaligus dalam satu klik. Cepat & sinkron.',
  },
  {
    icon: Bot,
    iconColor: 'text-blue-500 dark:text-blue-400',
    hoverBorder: 'hover:border-blue-500/40 dark:hover:border-blue-500/30',
    hoverGlow: 'group-hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.22)]',
    title: 'Chatbot Auto-Reply',
    desc: 'Balas pesan pelanggan otomatis 24/7 dari kata kunci — balasan teks, AI, atau jalankan plugin. CS jalan terus tanpa kamu standby.',
  },
  {
    icon: Puzzle,
    iconColor: 'text-violet-500 dark:text-violet-400',
    hoverBorder: 'hover:border-violet-500/40 dark:hover:border-violet-500/30',
    hoverGlow: 'group-hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.22)]',
    title: 'Plugin / Bot Tools',
    desc: 'Tambah kemampuan bot tanpa ngoding: download TikTok/IG/YouTube, cek profil IG/TikTok, hapus background gambar, dan banyak lagi — sekali klik dari galeri plugin siap pakai.',
  },
  {
    icon: Calendar,
    iconColor: 'text-purple-500 dark:text-purple-400',
    hoverBorder: 'hover:border-purple-500/40 dark:hover:border-purple-500/30',
    hoverGlow: 'group-hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.22)]',
    title: 'Scheduled & Recurring',
    desc: 'Jadwalkan broadcast untuk besok jam 9, atau atur pengiriman otomatis setiap Senin secara terjadwal.',
  },
  {
    icon: BarChart3,
    iconColor: 'text-cyan-500 dark:text-cyan-400',
    hoverBorder: 'hover:border-cyan-500/40 dark:hover:border-cyan-500/30',
    hoverGlow: 'group-hover:shadow-[0_0_30px_-5px_rgba(6,182,212,0.22)]',
    title: 'Analytics & Insights',
    desc: 'Pantau delivery rate, status pengiriman, performa channel, dan log history secara detail dan real-time.',
  },
  {
    icon: Sparkles,
    iconColor: 'text-amber-500 dark:text-amber-400',
    hoverBorder: 'hover:border-amber-500/40 dark:hover:border-amber-500/30',
    hoverGlow: 'group-hover:shadow-[0_0_30px_-5px_rgba(245,158,11,0.22)]',
    title: 'AI Rewrite & Generator',
    desc: 'Ubah gaya bahasa pesan atau buat draf teks promosi menarik dengan kecerdasan buatan dalam sekejap.',
  },
  {
    icon: Webhook,
    iconColor: 'text-emerald-500 dark:text-emerald-400',
    hoverBorder: 'hover:border-emerald-500/40 dark:hover:border-emerald-500/30',
    hoverGlow: 'group-hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.22)]',
    title: 'Webhook Automation',
    desc: 'Integrasikan workflow: order masuk, pembayaran sukses, atau sign up baru langsung memicu broadcast otomatis.',
  },
  {
    icon: Code,
    iconColor: 'text-rose-500 dark:text-rose-400',
    hoverBorder: 'hover:border-rose-500/40 dark:hover:border-rose-500/30',
    hoverGlow: 'group-hover:shadow-[0_0_30px_-5px_rgba(244,63,94,0.22)]',
    title: 'REST API Access',
    desc: 'Kembangkan integrasi kustom kamu dengan REST API kami yang cepat, aman, dan terdokumentasi lengkap.',
  },
  {
    icon: Users,
    iconColor: 'text-orange-500 dark:text-orange-400',
    hoverBorder: 'hover:border-orange-500/40 dark:hover:border-orange-500/30',
    hoverGlow: 'group-hover:shadow-[0_0_30px_-5px_rgba(249,115,22,0.22)]',
    title: 'Contact & Group Manager',
    desc: 'Kelola database kontak dan grup secara terorganisir. Impor instan via Excel/CSV dan kelompokkan dengan label untuk target promosi yang presisi.',
  },
];

export default function LandingFeatures() {
  return (
    <section id="features" className="relative py-16 sm:py-28 px-4 sm:px-6 bg-[#f8fafc] dark:bg-[#030712] transition-colors duration-300 overflow-hidden">
      {/* Aurora Bleed/Transition Glow at the top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-80 bg-gradient-to-b from-blue-500/8 via-purple-500/4 to-transparent blur-3xl pointer-events-none opacity-80 z-0" />
      
      {/* Wavy Aurora Background (Flow style) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-45 dark:opacity-65">
        <div className="absolute inset-0 aurora-bg-flow" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 font-display text-zinc-900 dark:text-white">
            Semua Fitur Dalam Satu Genggaman
          </h2>
          <div className="h-1.5 w-20 bg-gradient-brand mx-auto rounded-full mb-6" />
          <p className="text-zinc-600 dark:text-white/60 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Satu dashboard terpusat untuk broadcast, chatbot otomatis, dan plugin bot WhatsApp — tanpa perlu setup server yang rumit.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className={`group relative rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white/70 dark:bg-[#0a0f1d]/50 p-8 backdrop-blur-md transition-all duration-300 ${f.hoverBorder} hover:bg-zinc-50/90 dark:hover:bg-[#0c142c]/65 hover:-translate-y-1 ${f.hoverGlow} shadow-sm dark:shadow-none`}
              >
                {/* Accent glow on hover */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-600/0 to-purple-600/0 opacity-0 group-hover:from-blue-600/5 group-hover:to-purple-600/5 group-hover:opacity-100 transition-all duration-300 pointer-events-none" />
                
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-zinc-100 dark:bg-white/5 border border-zinc-200/80 dark:border-white/8 mb-6 group-hover:scale-110 transition-transform duration-300 ${f.iconColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                
                <h3 className="font-semibold text-lg text-zinc-900 dark:text-white mb-3 tracking-tight group-hover:text-gradient-brand transition-colors duration-300">
                  {f.title}
                </h3>
                
                <p className="text-zinc-500 dark:text-white/50 text-sm leading-relaxed">
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
