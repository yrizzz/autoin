import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, MessageSquare, ShieldCheck, Cpu, CreditCard } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  icon: any;
}

export default function LandingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FAQItem[] = [
    {
      icon: ShieldCheck,
      question: 'Apakah AutoIn aman dari risiko blokir (banned) WhatsApp?',
      answer: 'WhatsApp memiliki kebijakan anti-spam yang ketat. Namun, AutoIn dilengkapi dengan sistem Smart Queue, delay pengiriman acak (random humanized delay), serta pembatasan chunk pesan untuk meminimalkan pola bot otomatis dan menjaga kesehatan akun WhatsApp Anda.'
    },
    {
      icon: Cpu,
      question: 'Apakah saya membutuhkan VPS atau server sendiri?',
      answer: 'Tidak sama sekali. AutoIn berjalan sepenuhnya di cloud server kami. Anda tidak perlu menyewa VPS atau menginstall aplikasi apa pun di komputer/server Anda. Cukup hubungkan WhatsApp Anda melalui scan QR Code, dan sistem kami akan bekerja otomatis.'
    },
    {
      icon: MessageSquare,
      question: 'Format file media apa saja yang didukung untuk pengiriman?',
      answer: 'AutoIn mendukung pengiriman teks pesan reguler, gambar (JPEG, PNG, WebP), video tutorial (MP4), hingga dokumen formal (PDF). Semua file media yang Anda unggah disimpan di Cloudflare R2 dengan retensi otomatis 7 hari untuk menjaga kapasitas server tetap optimal.'
    },
    {
      icon: CreditCard,
      question: 'Apakah ada masa percobaan gratis?',
      answer: 'Ya! Setiap pengguna baru yang mendaftar melalui Google SSO akan mendapatkan 3 kuota broadcast gratis secara instan untuk mencoba seluruh fitur AutoIn tanpa biaya komitmen.'
    }
  ];

  return (
    <section id="faq" className="relative py-20 sm:py-28 px-4 sm:px-6 bg-[#f8fafc] dark:bg-[#030712] transition-colors duration-300 overflow-hidden border-t border-zinc-200 dark:border-white/5">
      {/* Wavy Aurora Background (Borealis style) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-45 dark:opacity-65">
        <div className="absolute inset-0 aurora-borealis-glow" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Title */}
        <div className="text-center mb-16 space-y-4">
          <span className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase px-3 py-1 rounded-full">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>F.A.Q Section</span>
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 dark:text-white font-display">
            Pertanyaan Yang Sering Diajukan
          </h2>
          <p className="text-zinc-550 dark:text-white/60 text-sm max-w-lg mx-auto">
            Semua hal penting yang perlu Anda ketahui tentang otomatisasi WhatsApp dan integrasi API AutoIn.
          </p>
        </div>

        {/* FAQ Grid/Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const Icon = faq.icon;
            const isOpen = openIndex === index;

            return (
              <div
                key={index}
                className={`rounded-2xl border transition-all duration-300 backdrop-blur-md ${
                  isOpen
                    ? 'border-blue-500/50 dark:border-blue-500/40 bg-white/90 dark:bg-white/[0.04] shadow-md shadow-blue-500/[0.03]'
                    : 'border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-[#0a0f1d]/50 hover:border-blue-500/35 dark:hover:border-purple-500/35'
                }`}
              >
                {/* Accordion Trigger Button */}
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between p-5 text-left transition-colors cursor-pointer select-none"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all shrink-0 ${
                        isOpen
                          ? 'bg-blue-500/10 border-blue-500/25 text-blue-600 dark:text-blue-400'
                          : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-white/5 text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs sm:text-sm text-zinc-800 dark:text-white leading-snug">
                      {faq.question}
                    </span>
                  </div>
                  <div className="text-zinc-405 dark:text-zinc-500 shrink-0 ml-4">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {/* Accordion Content body */}
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-[11px] sm:text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 pl-[3.25rem] border-t border-zinc-100 dark:border-white/5 mt-[-2px] animate-fadeIn">
                    <p className="whitespace-pre-line">{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
