import React, { useState, useEffect } from 'react';
import AdminLayout from '../layout/AdminLayout';
import { api } from '../../lib/api';
import {
  Key, Copy, Check, RefreshCw, Trash2, ShieldCheck, Eye, EyeOff,
  Terminal, Code2, Globe, AlertTriangle, ChevronRight, Zap, Lock,
  Activity, Clock, Plus, Shield, X as XIcon, Wifi
} from 'lucide-react';

const API_BASE = typeof window !== 'undefined'
  ? ((import.meta as any).env?.PUBLIC_API_URL ?? 'http://localhost:8001')
  : 'http://localhost:8001';

export default function ApiKeyManager() {
  const [apiKey, setApiKey] = useState<string>('');
  const [keyMeta, setKeyMeta] = useState<{ created: string; requests: number } | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'examples' | 'whitelist' | 'security'>('overview');
  const [activeSnippet, setActiveSnippet] = useState<'curl' | 'js' | 'php' | 'python'>('curl');
  const [generating, setGenerating] = useState(false);
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [ipInput, setIpInput] = useState('');
  const [ipError, setIpError] = useState('');

  useEffect(() => {
    api.get<{ api_key: string | null; created: string | null; whitelist?: string[] }>('/api/api-key')
      .then(res => {
        if (res.api_key) {
          setApiKey(res.api_key);
          setKeyMeta({ created: res.created || new Date().toISOString(), requests: 0 });
          if (res.whitelist) {
            setWhitelist(res.whitelist);
          }
        } else {
          setApiKey('');
          setKeyMeta(null);
          setWhitelist([]);
        }
      })
      .catch(err => {
        console.error('Gagal mengambil API Key dari server:', err);
      });
  }, []);

  const isValidIP = (ip: string) => {
    const ipv4 = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    const ipv6 = /^[0-9a-fA-F:]+(\/\d{1,3})?$/;
    return ipv4.test(ip) || ipv6.test(ip) || ip === '*';
  };

  const addIP = async () => {
    const ip = ipInput.trim();
    if (!ip) return;
    if (!isValidIP(ip)) { setIpError('Format IP tidak valid. Contoh: 192.168.1.1 atau 103.0.0.0/24'); return; }
    if (whitelist.includes(ip)) { setIpError('IP sudah ada di whitelist'); return; }
    const next = [...whitelist, ip];
    
    try {
      const res = await api.post<{ whitelist: string[] }>('/api/api-key/whitelist', { whitelist: next });
      setWhitelist(res.whitelist);
      setIpInput('');
      setIpError('');
    } catch (err: any) {
      setIpError('Gagal menyimpan whitelist ke server: ' + (err.message || 'Unknown error'));
    }
  };

  const removeIP = async (ip: string) => {
    const next = whitelist.filter(w => w !== ip);
    try {
      const res = await api.post<{ whitelist: string[] }>('/api/api-key/whitelist', { whitelist: next });
      setWhitelist(res.whitelist);
    } catch (err: any) {
      alert('Gagal menghapus IP dari server: ' + (err.message || 'Unknown error'));
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await api.post<{ api_key: string; created: string }>('/api/api-key');
      setApiKey(res.api_key);
      setKeyMeta({ created: res.created, requests: 0 });
    } catch (err: any) {
      alert('Gagal membuat API Key: ' + (err.message || 'Unknown error'));
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopySnippet = (key: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(key);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const handleRevoke = async () => {
    try {
      await api.delete('/api/api-key');
      setApiKey('');
      setKeyMeta(null);
      setDeleteConfirm(false);
    } catch (err: any) {
      alert('Gagal menghapus API Key: ' + (err.message || 'Unknown error'));
    }
  };

  const maskedKey = apiKey
    ? (showKey ? apiKey : apiKey.slice(0, 8) + '•'.repeat(32) + apiKey.slice(-4))
    : '';

  const snippets: Record<string, string> = {
    curl: `curl -X POST ${API_BASE}/api/broadcast \\
  -H "Authorization: Bearer ${apiKey || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "channel_id": 1,
    "recipients": ["+6281234567890"],
    "message": "Halo dari AUTOIN Broadcast!"
  }'`,
    js: `// npm install axios
import axios from 'axios';

const AUTOIN_KEY = '${apiKey || 'YOUR_API_KEY'}';

const res = await axios.post('${API_BASE}/api/broadcast', {
  channel_id: 1,
  recipients: ['+6281234567890'],
  message: 'Halo dari AUTOIN Broadcast!',
}, {
  headers: { Authorization: \`Bearer \${AUTOIN_KEY}\` }
});

console.log('Broadcast sent:', res.data);`,
    php: `<?php
$key = '${apiKey || 'YOUR_API_KEY'}';

$response = file_get_contents('${API_BASE}/api/broadcast', false, stream_context_create([
  'http' => [
    'method' => 'POST',
    'header' => implode("\\r\\n", [
      "Authorization: Bearer $key",
      "Content-Type: application/json",
    ]),
    'content' => json_encode([
      'channel_id' => 1,
      'recipients' => ['+6281234567890'],
      'message' => 'Halo dari AUTOIN!',
    ]),
  ]
]));

$data = json_decode($response, true);
echo $data['message'];`,
    python: `import requests

key = '${apiKey || 'YOUR_API_KEY'}'
url = '${API_BASE}/api/broadcast'

res = requests.post(url,
    headers={'Authorization': f'Bearer {key}'},
    json={
        'channel_id': 1,
        'recipients': ['+6281234567890'],
        'message': 'Halo dari AUTOIN!'
    }
)
print(res.json())`
  };

  const TABS = [
    { id: 'overview', label: 'Kredensial', icon: Key },
    { id: 'examples', label: 'Contoh Kode', icon: Code2 },
    { id: 'whitelist', label: 'IP Whitelist', icon: Wifi },
    { id: 'security', label: 'Keamanan', icon: Lock },
  ] as const;

  const SNIPPET_TABS = [
    { id: 'curl', label: 'cURL' },
    { id: 'js', label: 'Node.js' },
    { id: 'php', label: 'PHP' },
    { id: 'python', label: 'Python' },
  ] as const;

  return (
    <AdminLayout activePage="api_key" title="API Key">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg mb-3">
            <Zap className="w-3 h-3" />
            Developer Access
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight font-display">
            API Key & Integrasi
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 max-w-lg">
            Kelola kredensial API untuk mengintegrasikan AUTOIN Broadcast Engine langsung ke sistem backend Anda.
          </p>
        </div>

        {apiKey && (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-3 py-2 rounded-xl shrink-0">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Key Aktif & Siap Digunakan
          </div>
        )}
      </div>

      {/* Tab Bar — scrollable on mobile, no visible scrollbar */}
      <div className="overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 mb-6">
        <div className="flex bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 gap-0.5 w-max md:w-fit min-w-full md:min-w-0">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'tab-active'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TAB: OVERVIEW ─────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main key card */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
              {/* Card header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/30">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wide">Secret API Key</span>
                </div>
                {apiKey && keyMeta && (
                  <span className="text-[9px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Dibuat {new Date(keyMeta.created).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>

              <div className="p-6">
                {apiKey ? (
                  <div className="space-y-5">
                    {/* Key display */}
                    <div className="relative group">
                      <div className="flex items-center gap-2 bg-zinc-950 dark:bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-3.5 font-mono text-xs overflow-hidden">
                        <Key className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="flex-1 min-w-0 truncate text-zinc-300 tracking-wider select-all text-[10px] sm:text-xs">
                          {maskedKey}
                        </span>
                        <button
                          onClick={() => setShowKey(!showKey)}
                          className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer shrink-0 ml-1"
                          title={showKey ? 'Sembunyikan' : 'Tampilkan'}
                        >
                          {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gradient-brand hover:opacity-95 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer flex-1 sm:flex-none justify-center"
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Tersalin!' : 'Salin Key'}
                      </button>

                      <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="flex items-center gap-1.5 px-4 py-2 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl transition-all border border-zinc-200 dark:border-zinc-700 cursor-pointer flex-1 sm:flex-none justify-center"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
                        Regenerate
                      </button>

                      <button
                        onClick={() => setDeleteConfirm(true)}
                        className="flex items-center gap-1.5 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs font-bold rounded-xl transition-all cursor-pointer justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Revoke
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Empty state */
                  <div className="py-12 text-center space-y-5">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/10 border border-blue-500/20 flex items-center justify-center mx-auto">
                      <Key className="w-7 h-7 text-blue-500" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Belum ada API Key</h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
                        Generate API Key pertama Anda untuk mulai mengintegrasikan AUTOIN Broadcast Engine ke aplikasi Anda.
                      </p>
                    </div>
                    <button
                      onClick={handleGenerate}
                      disabled={generating}
                      className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-60"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
                      {generating ? 'Membuat Key...' : 'Generate API Key'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Endpoint reference */}
            {apiKey && (
              <div className="bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Base URL & Endpoints
                </h3>
                <div className="space-y-2">
                  {[
                    { method: 'POST', path: '/api/broadcast', desc: 'Kirim broadcast pesan' },
                    { method: 'GET', path: '/api/broadcasts', desc: 'Riwayat broadcast' },
                    { method: 'GET', path: '/api/channels', desc: 'Daftar channel aktif' },
                    { method: 'GET', path: '/api/contacts', desc: 'Manajemen kontak' },
                  ].map(ep => (
                    <div key={ep.path} className="flex items-center gap-3 text-[11px] font-mono bg-zinc-50 dark:bg-zinc-900/50 rounded-lg px-3 py-2 border border-zinc-100 dark:border-zinc-800">
                      <span className={`shrink-0 font-bold px-1.5 py-0.5 rounded text-[9px] ${ep.method === 'POST' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        {ep.method}
                      </span>
                      <span className="text-zinc-700 dark:text-zinc-300 flex-1">{ep.path}</span>
                      <span className="text-zinc-400 dark:text-zinc-500 hidden sm:block">{ep.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Side info */}
          <div className="space-y-4">
            {/* Quick actions */}
            <div className="bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> Mulai Cepat
              </h3>
              <div className="space-y-2.5">
                {[
                  { label: 'Lihat Contoh Kode', sub: 'cURL, JS, PHP, Python', tab: 'examples' as const },
                  { label: 'Panduan Keamanan', sub: 'Tips menjaga API Key', tab: 'security' as const },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => setActiveTab(item.tab)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 transition-all group cursor-pointer text-left"
                  >
                    <div>
                      <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{item.label}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">{item.sub}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
                  </button>
                ))}
              </div>
            </div>

            {/* Info card */}
            <div className="bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-5">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-blue-700 dark:text-blue-300">Penting!</p>
                  <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80 leading-relaxed">
                    API Key bersifat rahasia. Jangan pernah menyimpannya di frontend atau repository publik. Gunakan environment variable.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: EXAMPLES ─────────────────────────── */}
      {activeTab === 'examples' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            {/* Snippet tab bar — scrollable on mobile */}
            <div className="flex items-center border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex overflow-x-auto no-scrollbar flex-1 min-w-0">
                {SNIPPET_TABS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveSnippet(t.id)}
                    className={`px-4 py-3.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                      activeSnippet === t.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => handleCopySnippet(activeSnippet, snippets[activeSnippet])}
                className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all cursor-pointer shrink-0 mr-2"
              >
                {copiedSnippet === activeSnippet ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copiedSnippet === activeSnippet ? 'Tersalin!' : 'Salin'}</span>
              </button>
            </div>

            {/* Code block */}
            <div className="bg-zinc-950 p-6 overflow-x-auto">
              <pre className="text-[11px] font-mono text-zinc-300 leading-relaxed whitespace-pre">
                {snippets[activeSnippet]}
              </pre>
            </div>
          </div>

          {!apiKey && (
            <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Ganti <code className="font-mono bg-amber-100 dark:bg-amber-500/10 px-1 rounded">YOUR_API_KEY</code> dengan API Key aktif Anda.{' '}
                <button onClick={() => setActiveTab('overview')} className="underline font-bold cursor-pointer">Generate sekarang →</button>
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: IP WHITELIST ─────────────────────── */}
      {activeTab === 'whitelist' && (
        <div className="max-w-2xl space-y-5">
          {/* Info banner */}
          <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-4">
            <Shield className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-0.5">IP Whitelist Aktif</p>
              <p className="text-[11px] text-blue-600/80 dark:text-blue-400/80 leading-relaxed">
                Hanya request dari IP yang terdaftar yang akan diterima. Gunakan <code className="bg-blue-100 dark:bg-blue-500/10 px-1 rounded font-mono">*</code> untuk mengizinkan semua IP (tidak disarankan untuk produksi). CIDR notation didukung, contoh: <code className="bg-blue-100 dark:bg-blue-500/10 px-1 rounded font-mono">103.0.0.0/24</code>.
              </p>
            </div>
          </div>

          {/* Add IP form */}
          <div className="bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-4">Tambah IP Address</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={ipInput}
                onChange={e => { setIpInput(e.target.value); setIpError(''); }}
                onKeyDown={e => e.key === 'Enter' && addIP()}
                placeholder="Contoh: 203.0.113.1 atau 192.168.0.0/24"
                className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
              />
              <button
                onClick={addIP}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-brand hover:opacity-95 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah
              </button>
            </div>
            {ipError && (
              <p className="text-[10px] text-red-500 mt-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {ipError}
              </p>
            )}
          </div>

          {/* Whitelist table */}
          <div className="bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">IP Terdaftar</span>
              <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                {whitelist.length} IP
              </span>
            </div>

            {whitelist.length === 0 ? (
              <div className="py-12 text-center">
                <Wifi className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-400 dark:text-zinc-500">Belum ada IP yang ditambahkan.</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5">Saat kosong, semua IP diizinkan.</p>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {whitelist.map((ip, idx) => (
                  <li key={idx} className="flex items-center justify-between px-5 py-3 group hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">{ip}</span>
                    </div>
                    <button
                      onClick={() => removeIP(ip)}
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                      title="Hapus"
                    >
                      <XIcon className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: SECURITY ─────────────────────────── */}
      {activeTab === 'security' && (
        <div className="max-w-2xl space-y-4">
          {[
            {
              icon: Lock,
              color: 'text-blue-500',
              bg: 'bg-blue-500/10',
              title: 'Gunakan Environment Variable',
              desc: 'Simpan API Key di server-side env var (`.env`), bukan di kode sumber atau file yang di-commit ke Git.'
            },
            {
              icon: Globe,
              color: 'text-purple-500',
              bg: 'bg-purple-500/10',
              title: 'Batasi dari Sisi Server',
              desc: 'Panggil API AUTOIN hanya dari backend/server Anda. Jangan pernah expose API Key langsung ke browser pengguna.'
            },
            {
              icon: RefreshCw,
              color: 'text-emerald-500',
              bg: 'bg-emerald-500/10',
              title: 'Rotasi Berkala',
              desc: 'Lakukan regenerate API Key secara berkala (misal setiap 90 hari) untuk meminimalkan risiko kebocoran.'
            },
            {
              icon: AlertTriangle,
              color: 'text-amber-500',
              bg: 'bg-amber-500/10',
              title: 'Revoke Jika Bocor',
              desc: 'Jika Anda curiga API Key telah bocor atau disalahgunakan, segera revoke dan generate ulang key baru.'
            },
            {
              icon: Terminal,
              color: 'text-zinc-400',
              bg: 'bg-zinc-500/10',
              title: 'Monitor Penggunaan API',
              desc: 'Pantau log broadcast dan history secara rutin untuk mendeteksi aktivitas yang tidak biasa atau tidak dikenal.'
            },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex gap-4 bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                <div className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">{item.title}</h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Revoke Confirm Modal ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2">Revoke API Key?</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
              Semua integrasi yang menggunakan key ini akan langsung terputus. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl transition-all cursor-pointer border border-zinc-200 dark:border-zinc-700"
              >
                Batal
              </button>
              <button
                onClick={handleRevoke}
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
