import React, { useState } from 'react';
import AdminLayout from '../layout/AdminLayout';
import { BookOpen, Key, Globe, Send, RefreshCw, Check, Copy, Code, Terminal, Server } from 'lucide-react';

type Lang = 'curl' | 'javascript' | 'php' | 'python';

export default function ApiDocs() {
  const [activeLang, setActiveLang] = useState<Lang>('curl');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const codeBlocks = {
    auth: {
      curl: `curl -X GET http://localhost:8000/api/me \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      javascript: `fetch('http://localhost:8000/api/me', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => console.log(data));`,
      php: `<?php
$ch = curl_init('http://localhost:8000/api/me');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer YOUR_API_KEY',
    'Content-Type: application/json'
]);
$response = curl_exec($ch);
$data = json_decode($response, true);`,
      python: `import requests

headers = {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
}
response = requests.get('http://localhost:8000/api/me', headers=headers)
print(response.json())`
    },
    channels: {
      curl: `curl -X GET http://localhost:8000/api/channels \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      javascript: `fetch('http://localhost:8000/api/channels', {
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
})
.then(res => res.json())
.then(channels => console.log(channels));`,
      php: `<?php
$ch = curl_init('http://localhost:8000/api/channels');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer YOUR_API_KEY'
]);
$response = curl_exec($ch);
$channels = json_decode($response, true);`,
      python: `import requests

headers = {'Authorization': 'Bearer YOUR_API_KEY'}
response = requests.get('http://localhost:8000/api/channels', headers=headers)
print(response.json())`
    },
    send: {
      curl: `curl -X POST http://localhost:8000/api/broadcasts \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Promo Weekend",
    "content": "Diskon 50% khusus hari ini!",
    "channel_ids": [1, 2],
    "media_url": "https://example.com/image.jpg",
    "media_type": "image"
  }'`,
      javascript: `fetch('http://localhost:8000/api/broadcasts', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Promo Weekend',
    content: 'Diskon 50% khusus hari ini!',
    channel_ids: [1, 2],
    media_url: 'https://example.com/image.jpg',
    media_type: 'image'
  })
})
.then(res => res.json())
.then(result => console.log(result));`,
      php: `<?php
$payload = [
    'title' => 'Promo Weekend',
    'content' => 'Diskon 50% khusus hari ini!',
    'channel_ids' => [1, 2],
    'media_url' => 'https://example.com/image.jpg',
    'media_type' => 'image'
];

$ch = curl_init('http://localhost:8000/api/broadcasts');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer YOUR_API_KEY',
    'Content-Type: application/json'
]);
$response = curl_exec($ch);
$result = json_decode($response, true);`,
      python: `import requests

payload = {
    'title': 'Promo Weekend',
    'content': 'Diskon 50% khusus hari ini!',
    'channel_ids': [1, 2],
    'media_url': 'https://example.com/image.jpg',
    'media_type': 'image'
}
headers = {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
}
response = requests.post('http://localhost:8000/api/broadcasts', json=payload, headers=headers)
print(response.json())`
    }
  };

  return (
    <AdminLayout activePage="api_docs" title="Dokumentasi API">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Left Side: API Documentation Text */}
        <div className="flex-1 space-y-8 max-w-3xl">
          <div>
            <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              Dokumentasi Developer API
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Gunakan REST API AUTOIN untuk mengirim pesan broadcast secara otomatis langsung dari program atau website backend Anda.
            </p>
          </div>

          {/* Section 1: Authentication */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center text-[10px] font-bold">1</span>
              Autentikasi Token
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Seluruh request API wajib menyertakan HTTP header <code className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[10px] text-blue-600 dark:text-blue-400">Authorization: Bearer &lt;YOUR_API_KEY&gt;</code>. 
              Anda dapat memperoleh API Key melalui halaman pengaturan Kredensial API Key di dashboard ini.
            </p>
          </div>

          {/* Section 2: Get Channels */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center text-[10px] font-bold">2</span>
              Mendapatkan ID Channel Broadcast
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Sebelum mengirimkan pesan broadcast, Anda perlu mengetahui list device atau channel sosial media yang aktif di akun Anda. Gunakan endpoint ini untuk list channel beserta parameter ID-nya.
            </p>

            <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-850 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[9px] font-extrabold uppercase">GET</span>
                <span className="font-mono text-xs text-zinc-700 dark:text-zinc-350">/api/channels</span>
              </div>
              <div className="text-[10px] text-zinc-400 font-mono">
                Response format: Array of Channel objects.
              </div>
            </div>
          </div>

          {/* Section 3: Send Broadcast */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center text-[10px] font-bold">3</span>
              Mengirimkan Broadcast Campaign
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Kirim request POST ke endpoint ini dengan payload JSON untuk membuat draf broadcast. Lanjutkan dengan trigger pengiriman untuk mendistribusikan pesan ke seluruh channel.
            </p>

            <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-850 space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[9px] font-extrabold uppercase">POST</span>
                <span className="font-mono text-xs text-zinc-700 dark:text-zinc-350">/api/broadcasts</span>
              </div>
              
              <div className="border-t border-zinc-200/40 dark:border-zinc-800/40 pt-3 space-y-1.5">
                <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Parameter Body (JSON)</span>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider border-b border-zinc-200/40 dark:border-zinc-800/40">
                      <th className="pb-1.5 font-bold">Field</th>
                      <th className="pb-1.5 font-bold">Tipe</th>
                      <th className="pb-1.5 font-bold">Deskripsi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/20 dark:divide-zinc-800/20 text-[11px] text-zinc-500 dark:text-zinc-400 font-sans">
                    <tr>
                      <td className="py-2 font-mono text-zinc-700 dark:text-zinc-300 font-bold">content</td>
                      <td className="py-2 text-blue-500 font-mono">string</td>
                      <td className="py-2">Pesan teks utama (Mendukung HTML tags). *Wajib</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono text-zinc-700 dark:text-zinc-300 font-bold">channel_ids</td>
                      <td className="py-2 text-blue-500 font-mono">array</td>
                      <td className="py-2">List ID target channel dari endpoint GET /api/channels. *Wajib</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono text-zinc-700 dark:text-zinc-300">title</td>
                      <td className="py-2 text-blue-500 font-mono">string</td>
                      <td className="py-2">Judul kampanye broadcast (Opsional).</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono text-zinc-700 dark:text-zinc-300">media_url</td>
                      <td className="py-2 text-blue-500 font-mono">string</td>
                      <td className="py-2">URL lampiran file/gambar (Opsional).</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono text-zinc-700 dark:text-zinc-300">media_type</td>
                      <td className="py-2 text-blue-500 font-mono">string</td>
                      <td className="py-2">Tipe lampiran: <code className="px-1 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px]">image, video, pdf, document</code>.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Code Playground Box */}
        <div className="w-full md:w-96 shrink-0 bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm space-y-4 h-fit">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-zinc-850 dark:text-zinc-100 uppercase tracking-wider">Playground Contoh</span>
            </div>
            
            {/* Language Selector Buttons */}
            <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-lg text-[9px] font-bold">
              {(['curl', 'javascript', 'php', 'python'] as Lang[]).map(lang => (
                <button
                  key={lang}
                  onClick={() => setActiveLang(lang)}
                  className={`px-1.5 py-1 rounded transition-all capitalize cursor-pointer ${
                    activeLang === lang
                      ? 'bg-white dark:bg-zinc-850 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                  }`}
                >
                  {lang === 'javascript' ? 'JS' : lang}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {/* Auth Snippet */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                <span>1. Tes Autentikasi</span>
                <button
                  onClick={() => copyToClipboard('auth', codeBlocks.auth[activeLang])}
                  className="text-blue-500 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  {copiedId === 'auth' ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : 'Salin'}
                </button>
              </div>
              <pre className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl border border-zinc-100 dark:border-zinc-850/60 text-[9px] font-mono text-zinc-605 dark:text-zinc-350 overflow-x-auto">
                {codeBlocks.auth[activeLang]}
              </pre>
            </div>

            {/* List Channels Snippet */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                <span>2. List Channels</span>
                <button
                  onClick={() => copyToClipboard('channels', codeBlocks.channels[activeLang])}
                  className="text-blue-500 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  {copiedId === 'channels' ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : 'Salin'}
                </button>
              </div>
              <pre className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl border border-zinc-100 dark:border-zinc-850/60 text-[9px] font-mono text-zinc-605 dark:text-zinc-350 overflow-x-auto">
                {codeBlocks.channels[activeLang]}
              </pre>
            </div>

            {/* Create Broadcast Snippet */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                <span>3. Kirim Broadcast</span>
                <button
                  onClick={() => copyToClipboard('send', codeBlocks.send[activeLang])}
                  className="text-blue-500 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  {copiedId === 'send' ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : 'Salin'}
                </button>
              </div>
              <pre className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl border border-zinc-100 dark:border-zinc-850/60 text-[9px] font-mono text-zinc-605 dark:text-zinc-350 overflow-x-auto">
                {codeBlocks.send[activeLang]}
              </pre>
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
