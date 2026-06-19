import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Free Trial',
    price: 'Gratis',
    period: 'Selamanya',
    description: 'Untuk mencoba kehebatan broadcast lintas platform.',
    features: ['5 Broadcast Trial', 'Semua Channel Aktif', 'Analytics Dasar', 'Tanpa perlu kartu kredit'],
    cta: 'Mulai Gratis',
    highlight: false,
  },
  {
    name: 'Daily Pass',
    price: 'Rp 1.000',
    period: '/ hari',
    description: 'Solusi paling fleksibel. Aktifkan hanya saat kamu butuh.',
    features: ['Unlimited Campaign', 'Unlimited Channel', 'Full Features', 'Fair Usage Policy', 'Prioritas Pengiriman'],
    cta: 'Beli Daily Pass',
    highlight: true,
  },
  {
    name: 'Monthly Pass',
    price: 'Rp 25.000',
    period: '/ bulan',
    description: 'Untuk bisnis & UMKM dengan intensitas broadcast tinggi.',
    features: ['Semua Fitur Daily Pass', 'Priority Queue System', 'Advanced Analytics logs', 'Dukungan Prioritas 24/7'],
    cta: 'Beli Monthly',
    highlight: false,
  },
];

export default function LandingPricing() {
  return (
    <section id="pricing" className="relative py-28 px-6 bg-[#030712]">
      {/* Background decorations */}
      <div className="absolute top-[20%] left-[-10%] w-[400px] h-[400px] bg-blue-900/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[400px] h-[400px] bg-purple-900/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 font-display">Harga yang Sangat Hemat</h2>
          <div className="h-1.5 w-16 bg-gradient-brand mx-auto rounded-full mb-6" />
          <p className="text-white/60 text-base sm:text-lg">Pay-as-you-go. Tanpa kontrak panjang, batalkan kapan saja.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-3xl p-8 border flex flex-col transition-all duration-300 ${
                plan.highlight
                  ? 'bg-gradient-to-b from-[#141b35]/80 to-[#0b1022]/80 border-blue-500/50 shadow-[0_0_40px_rgba(37,99,235,0.15)] scale-[1.03] z-10'
                  : 'bg-[#0a0f1d]/40 border-white/5 hover:border-white/10 hover:bg-[#0c142c]/50'
              }`}
            >
              {plan.highlight && (
                <span className="absolute top-0 right-8 -translate-y-1/2 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Paling Populer
                </span>
              )}
              
              <h3 className="font-bold text-xl text-white mb-2">{plan.name}</h3>
              <p className="text-white/40 text-xs mb-6 leading-relaxed">{plan.description}</p>
              
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-extrabold text-white tracking-tight">{plan.price}</span>
                <span className="text-white/40 text-sm">{plan.period}</span>
              </div>

              <div className="h-px bg-white/5 w-full mb-8" />

              <ul className="flex-1 space-y-4 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-white/70">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => window.location.href = '/dashboard'}
                className={`w-full py-3.5 rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02] cursor-pointer ${
                  plan.highlight
                    ? 'bg-gradient-brand text-white shadow-lg hover:shadow-[0_0_20px_rgba(124,58,237,0.3)]'
                    : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
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

