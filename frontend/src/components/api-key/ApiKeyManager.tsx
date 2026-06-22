import React, { useState, useEffect } from 'react';
import AdminLayout from '../layout/AdminLayout';
import { Key, Copy, Check, RefreshCw, Trash2, Code, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function ApiKeyManager() {
  const [apiKey, setApiKey] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem('autoin_api_key');
    if (saved) {
      setApiKey(saved);
    }
  }, []);

  const handleGenerate = () => {
    const randomKey = 'atk_' + Array.from({ length: 40 }, () => 
      Math.floor(Math.random() * 36).toString(36)
    ).join('');
    setApiKey(randomKey);
    localStorage.setItem('autoin_api_key', randomKey);
  };

  const handleRevoke = () => {
    setDeleteConfirmOpen(true);
  };

  const handleCopyKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const codeSnippets = {
    curl: `curl -X POST http://localhost:8000/api/broadcast \\
  -H "Authorization: Bearer ${apiKey || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "channel": ["wa"],
    "text": "Promo hari ini..."
  }'`,
    js: `// Mengirim broadcast menggunakan broadcast engine AUTOIN
await broadcast.send({
  channel: ["wa"],
  text: "Promo hari ini..."
});`
  };

  const handleCopyCode = (key: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(key);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <AdminLayout activePage="api_key" title="API Key">
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
          Integrasi API Key
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Gunakan API Key untuk mengintegrasikan pengiriman pesan broadcast otomatis dari backend aplikasi Anda sendiri.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* API Credentials */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-500" />
              <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-800 dark:text-zinc-200">
                Kredensial API
              </h2>
            </div>

            {apiKey ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    API Secret Key
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 font-mono text-xs flex items-center justify-between min-w-0">
                      <span className="truncate text-zinc-700 dark:text-zinc-300">
                        {showKey ? apiKey : '••••••••••••••••••••••••••••••••••••••••••••••••'}
                      </span>
                      <button
                        onClick={() => setShowKey(!showKey)}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 ml-2 cursor-pointer shrink-0"
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      onClick={handleCopyKey}
                      className="px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl transition-all flex items-center justify-center cursor-pointer border border-zinc-200 dark:border-zinc-700/60 shrink-0"
                      title="Salin API Key"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span>API Key aktif dan siap digunakan. Amankan API Key ini dari publik.</span>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleRevoke}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:text-white hover:bg-red-600 dark:hover:bg-red-500/10 border border-red-200 dark:border-red-500/10 bg-red-50 dark:bg-red-500/5 rounded-xl transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Revoke API Key</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mx-auto text-zinc-400">
                  <Key className="w-5 h-5" />
                </div>
                <div className="space-y-1 max-w-xs mx-auto">
                  <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Belum ada API Key</h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Mulai integrasi backend dengan membuat API Key unik untuk workspace Anda.
                  </p>
                </div>
                <button
                  onClick={handleGenerate}
                  className="btn-primary inline-flex items-center gap-2 px-4 py-2 font-bold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Buat API Key
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Code Snippets */}
        <div className="bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 space-y-4 shadow-sm h-fit">
          <div className="flex items-center gap-2 text-zinc-850 dark:text-zinc-100">
            <Code className="w-4.5 h-4.5 text-blue-500" />
            <h2 className="text-xs font-bold uppercase tracking-wide">Developer Snippets</h2>
          </div>

          <div className="space-y-4">
            {/* cURL Example */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase">
                <span>cURL Request</span>
                <button
                  onClick={() => handleCopyCode('curl', codeSnippets.curl)}
                  className="text-blue-500 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  {copiedCode === 'curl' ? <Check className="w-3 h-3 text-emerald-500" /> : 'Salin'}
                </button>
              </div>
              <pre className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-850 text-[9px] font-mono text-zinc-600 dark:text-zinc-350 overflow-x-auto">
                {codeSnippets.curl}
              </pre>
            </div>

            {/* JS Node Example */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase">
                <span>Node.js / Broadcast Engine SDK</span>
                <button
                  onClick={() => handleCopyCode('js', codeSnippets.js)}
                  className="text-blue-500 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  {copiedCode === 'js' ? <Check className="w-3 h-3 text-emerald-500" /> : 'Salin'}
                </button>
              </div>
              <pre className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-850 text-[9px] font-mono text-zinc-600 dark:text-zinc-350 overflow-x-auto">
                {codeSnippets.js}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Custom delete confirmation modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-zinc-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl dark:shadow-black/60 w-full max-w-sm overflow-hidden p-6 text-center animate-in zoom-in-95 duration-200 relative">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-5 h-5" />
            </div>
            
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2">Revoke API Key?</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
              Apakah Anda yakin ingin membatalkan (revoke) API Key ini? Semua integrasi eksternal yang berjalan menggunakan key ini akan terputus seketika.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl transition-all cursor-pointer border border-zinc-200 dark:border-zinc-700/60"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setApiKey('');
                  localStorage.removeItem('autoin_api_key');
                  setDeleteConfirmOpen(false);
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Ya, Revoke
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
