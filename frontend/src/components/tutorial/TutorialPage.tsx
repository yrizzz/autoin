import React from 'react';
import AdminLayout from '../layout/AdminLayout';
import { PlayCircle, CheckCircle, Smartphone, Globe, Mail, Link2, BookOpen } from 'lucide-react';

interface TutorialVideo {
  id: string;
  title: string;
  duration: string;
  category: 'whatsapp' | 'general';
  description: string;
}

const TUTORIALS: TutorialVideo[] = [
  {
    id: 't1',
    title: 'Cara Menghubungkan Sesi WhatsApp (Baileys)',
    duration: '3:45',
    category: 'whatsapp',
    description: 'Panduan lengkap scan QR Code dari menu integrasi perangkat untuk mengaktifkan sesi pengirim WhatsApp menggunakan library Baileys.'
  },
  {
    id: 't4',
    title: 'Membuat Broadcast WhatsApp Pertama Anda',
    duration: '5:10',
    category: 'general',
    description: 'Cara menggunakan menu Broadcast untuk mengirimkan satu pesan promosi ke banyak nomor WhatsApp sekaligus dengan cepat.'
  },
  {
    id: 't5',
    title: 'Menggunakan Chatbot Auto-Reply',
    duration: '4:00',
    category: 'whatsapp',
    description: 'Konfigurasi aturan auto-reply berbasis kata kunci agar chatbot menjawab pesan WhatsApp masuk secara otomatis 24/7.'
  },
  {
    id: 't6',
    title: 'Setup Webhook untuk Notifikasi Otomatis',
    duration: '3:30',
    category: 'general',
    description: 'Hubungkan sistem back-office (WooCommerce, Laravel, Zapier) ke AUTOIN untuk mengirim pesan WhatsApp secara programatik.'
  }
];

export default function TutorialPage() {
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'whatsapp': return 'bg-emerald-500/10 text-emerald-500';
      default: return 'bg-zinc-500/10 text-zinc-500';
    }
  };

  return (
    <AdminLayout activePage="tutorial" title="Video Tutorial">
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
          Video Tutorial & Panduan
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Pelajari cara menghubungkan akun sosial media dan mengoptimalkan fitur broadcast engine AUTOIN.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {TUTORIALS.map((t) => (
          <div
            key={t.id}
            className="bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 hover:border-blue-500/20 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              {/* Fake Video Player Placeholder */}
              <div className="aspect-video bg-zinc-900 rounded-xl relative overflow-hidden group flex items-center justify-center border border-zinc-200/10 mb-4 shadow-inner">
                {/* Radial Glow */}
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 to-transparent pointer-events-none" />
                
                <PlayCircle className="w-12 h-12 text-blue-500 group-hover:scale-110 transition-transform cursor-pointer drop-shadow-md" />
                <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                  {t.duration}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold capitalize ${getCategoryColor(t.category)}`}>
                    {t.category}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-zinc-850 dark:text-zinc-150 leading-snug">{t.title}</h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {t.description}
                </p>
              </div>
            </div>

            <div className="border-t border-zinc-100 dark:border-zinc-800/60 pt-4 mt-4 flex items-center gap-1.5 text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Buka Panduan Tertulis</span>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
