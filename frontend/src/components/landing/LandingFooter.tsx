import { ShieldCheck, Heart } from 'lucide-react';

export default function LandingFooter() {
  return (
    <footer className="relative py-12 px-4 sm:px-6 bg-white dark:bg-[#030712] border-t border-zinc-200 dark:border-white/5 transition-colors duration-300">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center border shadow-md backdrop-blur-md bg-white/5 border-zinc-200 dark:border-white/10 shrink-0">
            <img src="/autoin-logo.webp" alt="AUTOIN Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <span className="block font-black text-sm tracking-tight font-display text-zinc-900 dark:text-white">
              AutoIn
            </span>
            <span className="block text-[10px] text-zinc-400 dark:text-zinc-500">
              WhatsApp Broadcast & Automation Platform
            </span>
          </div>
        </div>

        {/* Links Navigation */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-bold text-zinc-500 dark:text-white/50">
          <a href="#features" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Fitur</a>
          <a href="#pricing" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Harga</a>
          <a href="#faq" className="hover:text-zinc-900 dark:hover:text-white transition-colors">FAQ</a>
          <a href="/terms" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Syarat & Ketentuan</a>
          <a href="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Kebijakan Privasi</a>
        </div>

        {/* Copyright notice */}
        <div className="text-center md:text-right text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
          <div className="flex items-center justify-center md:justify-end gap-1.5 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            <span>Kepatuhan Keamanan & Privasi Terjamin</span>
          </div>
          <span>&copy; {new Date().getFullYear()} AutoIn. Dibuat dengan <Heart className="w-2.5 h-2.5 inline text-rose-500 fill-rose-500" /> untuk UMKM Indonesia.</span>
        </div>

      </div>
    </footer>
  );
}
