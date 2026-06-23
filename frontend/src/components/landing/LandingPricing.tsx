import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Free Plan',
    price: 'Gratis',
    period: 'Selamanya',
    description: 'Bisa pairing device untuk uji coba performa Autoin.',
    features: [
      { text: 'Koneksi 1 Device WhatsApp', included: true },
      { text: 'Maksimal 3 Campaign Broadcast', included: true },
      { text: 'Maksimal 1 Template Pesan', included: true },
      { text: 'Limit 10 Pesan / Broadcast', included: true },
      { text: 'Akses Terbatas Asisten AI', included: true },
      { text: 'Laporan Pengiriman Dasar', included: true },
    ],
    cta: 'Mulai Gratis',
    highlight: false,
    themeClass: 'bg-white dark:bg-[#0a0f1d]/40 border-zinc-200 dark:border-zinc-800/60 text-zinc-900 dark:text-white hover:border-zinc-300 dark:hover:border-zinc-700'
  },
  {
    name: 'Daily Pass',
    price: 'Rp 1.000',
    period: '/ hari',
    description: 'Sangat fleksibel. Aktifkan fitur premium hanya saat dibutuhkan.',
    features: [
      { text: 'Koneksi 3 Device WhatsApp', included: true, highlight: true },
      { text: 'Broadcast Tanpa Batas', included: true, highlight: true },
      { text: 'Template Pesan Tanpa Batas', included: true, highlight: true },
      { text: 'Pesan Terkirim Tanpa Limit', included: true, highlight: true },
      { text: 'Akses Penuh Asisten AI', included: true, highlight: true },
      { text: 'Analisis Detail & Logs', included: true },
    ],
    cta: 'Aktifkan Daily Pass',
    highlight: true,
    themeClass: 'bg-gradient-to-b from-blue-50/50 via-white to-white dark:from-[#141b35]/80 dark:via-[#0b1022]/80 dark:to-[#0b1022]/80 border-blue-500/50 dark:border-blue-500/40 shadow-[0_15px_40px_rgba(37,99,235,0.08)] dark:shadow-[0_20px_50px_rgba(37,99,235,0.15)] scale-[1.03] z-10 text-zinc-900 dark:text-white'
  },
  {
    name: 'Monthly Pass',
    price: 'Rp 25.000',
    period: '/ bulan',
    description: 'Pilihan hemat untuk UMKM dan bisnis skala menengah.',
    features: [
      { text: 'Koneksi 5 Device WhatsApp', included: true, highlight: true },
      { text: 'Semua Fitur Daily Pass', included: true },
      { text: 'Akses Penuh Asisten AI', included: true },
      { text: 'Developer API & Webhook', included: true },
      { text: 'Sistem Antrean Prioritas', included: true },
      { text: 'Hemat 20% dibanding Harian', included: true, badge: 'Hemat' },
      { text: 'Support Prioritas 24/7', included: true },
    ],
    cta: 'Berlangganan Bulanan',
    highlight: false,
    themeClass: 'bg-white dark:bg-[#0a0f1d]/40 border-zinc-200 dark:border-zinc-800/60 text-zinc-900 dark:text-white hover:border-zinc-300 dark:hover:border-zinc-700'
  },
];

export default function LandingPricing() {
  return (
    <section id="pricing" className="relative py-16 sm:py-28 px-4 sm:px-6 bg-[#f8fafc] dark:bg-[#030712] transition-colors duration-300 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[20%] left-[-10%] w-[400px] h-[400px] bg-blue-900/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[400px] h-[400px] bg-purple-900/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 font-display text-zinc-900 dark:text-white">
            Harga yang Sangat Hemat
          </h2>
          <div className="h-1.5 w-16 bg-gradient-brand mx-auto rounded-full mb-6" />
          <p className="text-zinc-650 dark:text-white/60 text-base sm:text-lg">
            Pay-as-you-go. Tanpa kontrak panjang, batalkan kapan saja.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-3xl p-8 border flex flex-col transition-all duration-350 ${plan.themeClass}`}
            >
              {plan.highlight && (
                <span className="absolute top-0 right-8 -translate-y-1/2 bg-blue-600 dark:bg-blue-500 text-white text-[10px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-sm">
                  Paling Populer
                </span>
              )}
              
              <h3 className="font-extrabold text-xl mb-2">{plan.name}</h3>
              <p className="text-zinc-500 dark:text-white/40 text-xs mb-6 leading-relaxed">{plan.description}</p>
              
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-black tracking-tight">{plan.price}</span>
                <span className="text-zinc-500 dark:text-white/45 text-sm font-semibold">{plan.period}</span>
              </div>

              <div className="h-px bg-zinc-200 dark:bg-white/5 w-full mb-8" />

              <ul className="flex-1 space-y-4 mb-8">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                      f.highlight ? 'badge-gradient' : 'badge-emerald-gradient'
                    }`}>
                      <Check className="w-3 h-3" />
                    </div>
                    <span className={`text-zinc-700 dark:text-white/80 ${f.highlight ? 'font-bold' : ''}`}>
                      {f.text}
                    </span>
                    {f.badge && (
                      <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ml-1 badge-rose-gradient">
                        {f.badge}
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => window.location.href = '/subscription'}
                className={`w-full py-3.5 rounded-2xl font-bold transition-all duration-300 hover:scale-[1.02] cursor-pointer text-xs ${
                  plan.highlight
                    ? 'btn-primary shadow-lg shadow-blue-500/20'
                    : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-800 dark:text-white border border-zinc-200 dark:border-white/10'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
