import { Share2, Calendar, BarChart3, Sparkles, Webhook, Code } from 'lucide-react';

const features = [
  {
    icon: Share2,
    iconColor: 'text-blue-500 dark:text-blue-400',
    title: 'Instant Broadcast',
    desc: 'Kirim satu pesan ke banyak nomor WhatsApp sekaligus dalam satu klik. Cepat & sinkron.',
  },
  {
    icon: Calendar,
    iconColor: 'text-purple-500 dark:text-purple-400',
    title: 'Scheduled & Recurring',
    desc: 'Jadwalkan broadcast untuk besok jam 9, atau atur pengiriman otomatis setiap Senin secara terjadwal.',
  },
  {
    icon: BarChart3,
    iconColor: 'text-cyan-500 dark:text-cyan-400',
    title: 'Analytics & Insights',
    desc: 'Pantau delivery rate, status pengiriman, performa channel, dan log history secara detail dan real-time.',
  },
  {
    icon: Sparkles,
    iconColor: 'text-amber-500 dark:text-amber-400',
    title: 'AI Rewrite & Generator',
    desc: 'Ubah gaya bahasa pesan atau buat draf teks promosi menarik dengan kecerdasan buatan dalam sekejap.',
  },
  {
    icon: Webhook,
    iconColor: 'text-emerald-500 dark:text-emerald-400',
    title: 'Webhook Automation',
    desc: 'Integrasikan workflow: order masuk, pembayaran sukses, atau sign up baru langsung memicu broadcast otomatis.',
  },
  {
    icon: Code,
    iconColor: 'text-rose-500 dark:text-rose-400',
    title: 'REST API Access',
    desc: 'Kembangkan integrasi kustom kamu dengan REST API kami yang cepat, aman, dan terdokumentasi lengkap.',
  },
];

export default function LandingFeatures() {
  return (
    <section id="features" className="relative py-16 sm:py-28 px-4 sm:px-6 bg-[#f8fafc] dark:bg-[#030712] transition-colors duration-300 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] bg-purple-900/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-[-10%] w-[500px] h-[500px] bg-blue-900/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 font-display text-zinc-900 dark:text-white">
            Semua Fitur Dalam Satu Genggaman
          </h2>
          <div className="h-1.5 w-20 bg-gradient-brand mx-auto rounded-full mb-6" />
          <p className="text-zinc-600 dark:text-white/60 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Satu dashboard terpusat untuk mengelola pengiriman pesan WhatsApp secara optimal tanpa perlu setup server yang rumit.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="group relative rounded-2xl border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0a0f1d]/40 p-8 backdrop-blur-sm transition-all duration-300 hover:border-zinc-300 dark:hover:border-white/10 hover:bg-zinc-50 dark:hover:bg-[#0c142c]/50 hover:-translate-y-1 hover:shadow-2xl shadow-sm dark:shadow-none"
              >
                {/* Accent glow on hover */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-600/0 to-purple-600/0 opacity-0 group-hover:from-blue-600/5 group-hover:to-purple-600/5 group-hover:opacity-100 transition-all duration-300" />
                
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
