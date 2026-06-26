import React, { useState } from 'react';
import AdminLayout from '../layout/AdminLayout';
import CodeEditor from '../ui/CodeEditor';
import { BookOpen, Key, Globe, Send, RefreshCw, Check, Copy, Code, Terminal, Server, Upload } from 'lucide-react';

type Lang = 'curl' | 'javascript' | 'php' | 'python';

const API_BASE = ((import.meta as any).env?.PUBLIC_API_URL ?? 'http://localhost:8001');

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
      curl: `curl -X GET ${API_BASE}/api/me \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      javascript: `fetch('${API_BASE}/api/me', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => console.log(data));`,
      php: `<?php
$ch = curl_init('${API_BASE}/api/me');
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
response = requests.get('${API_BASE}/api/me', headers=headers)
print(response.json())`
    },
    upload: {
      curl: `curl -X POST ${API_BASE}/api/upload \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@/path/to/your/image.jpg"`,
      javascript: `const formData = new FormData();
// fileInput adalah HTML input type="file"
formData.append('file', fileInput.files[0]);

fetch('${API_BASE}/api/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: formData
})
.then(res => res.json())
.then(data => {
  console.log('URL Lampiran:', data.url);
  console.log('Tipe Media:', data.mediaType); // image, video, pdf, document
});`,
      php: `<?php
$cfile = new CURLFile('/path/to/your/image.jpg', 'image/jpeg', 'file');
$payload = ['file' => $cfile];

$ch = curl_init('${API_BASE}/api/upload');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer YOUR_API_KEY'
]);
$response = curl_exec($ch);
$result = json_decode($response, true);
echo "URL: " . $result['url'];`,
      python: `import requests

files = {'file': open('/path/to/your/image.jpg', 'rb')}
headers = {'Authorization': 'Bearer YOUR_API_KEY'}

response = requests.post('${API_BASE}/api/upload', files=files, headers=headers)
print(response.json())`
    },
    send_direct: {
      curl: `curl -X POST ${API_BASE}/api/whatsapp/CHANNEL_ID/send \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "628123456789",
    "message": "Halo, ini pesan langsung dengan gambar!",
    "mediaUrl": "https://example.com/image.jpg",
    "mediaType": "image"
  }'`,
      javascript: `fetch('${API_BASE}/api/whatsapp/CHANNEL_ID/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    to: '628123456789',
    message: 'Halo, ini pesan langsung dengan gambar!',
    mediaUrl: 'https://example.com/image.jpg',
    mediaType: 'image'
  })
})
.then(res => res.json())
.then(result => console.log(result));`,
      php: `<?php
$payload = [
    'to' => '628123456789',
    'message' => 'Halo, ini pesan langsung dengan gambar!',
    'mediaUrl' => 'https://example.com/image.jpg',
    'mediaType' => 'image'
];

$ch = curl_init('${API_BASE}/api/whatsapp/CHANNEL_ID/send');
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
    'to': '628123456789',
    'message': 'Halo, ini pesan langsung dengan gambar!',
    'mediaUrl': 'https://example.com/image.jpg',
    'mediaType': 'image'
}
headers = {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
}
response = requests.post('${API_BASE}/api/whatsapp/CHANNEL_ID/send', json=payload, headers=headers)
print(response.json())`
    },
    broadcast: {
      curl: `curl -X POST ${API_BASE}/api/broadcasts \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Promo Campaign",
    "content": "Halo, diskon 50% khusus hari ini!",
    "channel_ids": [1, 2],
    "media_url": "https://example.com/image.jpg",
    "media_type": "image"
  }'`,
      javascript: `fetch('${API_BASE}/api/broadcasts', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Promo Campaign',
    content: 'Halo, diskon 50% khusus hari ini!',
    channel_ids: [1, 2],
    media_url: 'https://example.com/image.jpg',
    media_type: 'image'
  })
})
.then(res => res.json())
.then(result => console.log(result));`,
      php: `<?php
$payload = [
    'title' => 'Promo Campaign',
    'content' => 'Halo, diskon 50% khusus hari ini!',
    'channel_ids' => [1, 2],
    'media_url' => 'https://example.com/image.jpg',
    'media_type' => 'image'
];

$ch = curl_init('${API_BASE}/api/broadcasts');
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
    'title': 'Promo Campaign',
    'content': 'Halo, diskon 50% khusus hari ini!',
    'channel_ids': [1, 2],
    'media_url': 'https://example.com/image.jpg',
    'media_type': 'image'
}
headers = {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
}
response = requests.post('${API_BASE}/api/broadcasts', json=payload, headers=headers)
print(response.json())`
    }
  };

  return (
    <AdminLayout activePage="api_docs" title="Dokumentasi API">
      <div className="flex flex-col xl:flex-row gap-8 max-w-7xl mx-auto w-full">
        
        {/* Left Side: API Documentation Text */}
        <div className="flex-1 space-y-8 max-w-4xl">
          <div>
            <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              Dokumentasi Developer API
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Gunakan REST API AUTOIN untuk mengirim pesan WhatsApp (Pesan Instan maupun Campaign) secara otomatis langsung dari program atau website backend Anda.
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

          {/* Section 2: Upload File / Media */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center text-[10px] font-bold">2</span>
              Upload File / Media (Lampiran Pesan)
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Sebelum mengirimkan pesan bergambar, video, atau dokumen PDF, Anda harus mengupload file tersebut ke server AUTOIN terlebih dahulu melalui endpoint upload ini untuk mendapatkan <code className="font-mono text-[10px] text-zinc-700 dark:text-zinc-300">url</code> dan <code className="font-mono text-[10px] text-zinc-700 dark:text-zinc-300">mediaType</code>.
            </p>

            <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-850 space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[9px] font-extrabold uppercase">POST</span>
                <span className="font-mono text-xs text-zinc-700 dark:text-zinc-350">/api/upload</span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Kirim data menggunakan format <code className="font-mono text-[10px]">multipart/form-data</code> dengan parameter field <code className="font-bold font-mono text-[10px]">file</code> (Maksimal ukuran file: 64MB).
              </p>
              <div className="border-t border-zinc-205/40 dark:border-zinc-800/40 pt-3">
                <span className="block text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Struktur Response Sukses (JSON)</span>
                <pre className="code-block p-3 text-[10px] font-mono leading-relaxed">
{`{
  "url": "${API_BASE}/uploads/abc123xyz.jpg",
  "mediaType": "image", // Nilai: image, video, audio, pdf, document
  "mime": "image/jpeg",
  "name": "nama_file_asli.jpg",
  "size": 1048576
}`}
                </pre>
              </div>
            </div>
          </div>

          {/* Section 3: Send Direct WhatsApp Message */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center text-[10px] font-bold">3</span>
              Kirim Pesan Instan (Direct WhatsApp)
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Gunakan endpoint ini untuk mengirimkan satu pesan WhatsApp secara langsung (real-time) tanpa harus membuat campaign broadcast terlebih dahulu. Sangat cocok untuk notifikasi sistem, OTP, atau auto-response.
            </p>

            <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-850 space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[9px] font-extrabold uppercase">POST</span>
                <span className="font-mono text-xs text-zinc-700 dark:text-zinc-350">/api/whatsapp/{"{channel_id}"}/send</span>
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
                      <td className="py-2 font-mono text-zinc-700 dark:text-zinc-300 font-bold">to</td>
                      <td className="py-2 text-blue-500 font-mono">string</td>
                      <td className="py-2">Nomor telepon tujuan dengan kode negara (contoh: <code className="font-mono">628123456789</code>). *Wajib</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono text-zinc-700 dark:text-zinc-300">message</td>
                      <td className="py-2 text-blue-500 font-mono">string</td>
                      <td className="py-2">Pesan teks utama (Opsional jika mediaUrl disertakan).</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono text-zinc-700 dark:text-zinc-300">mediaUrl</td>
                      <td className="py-2 text-blue-500 font-mono">string</td>
                      <td className="py-2">URL lampiran media yang didapatkan dari POST /api/upload. (Opsional)</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono text-zinc-700 dark:text-zinc-300">mediaType</td>
                      <td className="py-2 text-blue-500 font-mono">string</td>
                      <td className="py-2">Tipe file lampiran: <code className="px-1 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px]">image, video, audio, pdf, document</code>. (Opsional)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 4: Send Campaign / Broadcast */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center text-[10px] font-bold">4</span>
              Kirim Campaign Broadcast (Massal / Multi-Channel)
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Gunakan endpoint ini untuk membuat campaign massal yang dapat dikirimkan ke banyak nomor penerima sekaligus melalui satu atau lebih device / channel terhubung secara paralel.
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
                      <td className="py-2">Isi pesan broadcast utama. *Wajib</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono text-zinc-700 dark:text-zinc-300 font-bold">channel_ids</td>
                      <td className="py-2 text-blue-500 font-mono">array</td>
                      <td className="py-2">Array integer dari list ID target channel (contoh: <code className="font-mono">[1, 2]</code>). *Wajib</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono text-zinc-700 dark:text-zinc-300">recipients</td>
                      <td className="py-2 text-blue-500 font-mono">array</td>
                      <td className="py-2">Array nomor penerima (contoh: <code className="font-mono">["62812xxx", "62877xxx"]</code>). (Opsional)</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono text-zinc-700 dark:text-zinc-300">media_url</td>
                      <td className="py-2 text-blue-500 font-mono">string</td>
                      <td className="py-2">URL lampiran media hasil upload. (Opsional)</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono text-zinc-700 dark:text-zinc-300">media_type</td>
                      <td className="py-2 text-blue-500 font-mono">string</td>
                      <td className="py-2">Tipe file lampiran: <code className="px-1 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px]">image, video, pdf, document</code>. (Opsional)</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono text-zinc-700 dark:text-zinc-300">scheduled_at</td>
                      <td className="py-2 text-blue-500 font-mono">string</td>
                      <td className="py-2">Format ISO Date jika ingin dijadwalkan (contoh: <code className="font-mono">"2026-06-30T10:00:00"</code>). (Opsional)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 5: Get Channels */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center text-[10px] font-bold">5</span>
              Mendapatkan ID Channel Broadcast
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Gunakan endpoint ini untuk mengambil list channel WhatsApp yang aktif pada akun Anda beserta data ID-nya guna dimasukkan ke parameter target pengiriman.
            </p>

            <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-850 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[9px] font-extrabold uppercase">GET</span>
                <span className="font-mono text-xs text-zinc-700 dark:text-zinc-350">/api/channels</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Code Playground Box */}
        <div className="w-full xl:w-96 shrink-0 bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm space-y-4 h-fit">
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
              <CodeEditor value={codeBlocks.auth[activeLang]} onChange={() => {}} readOnly minRows={Math.max(codeBlocks.auth[activeLang].split('\n').length, 1)} />
            </div>

            {/* Upload Media Snippet */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                <span>2. Upload Media</span>
                <button
                  onClick={() => copyToClipboard('upload', codeBlocks.upload[activeLang])}
                  className="text-blue-500 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  {copiedId === 'upload' ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : 'Salin'}
                </button>
              </div>
              <CodeEditor value={codeBlocks.upload[activeLang]} onChange={() => {}} readOnly minRows={Math.max(codeBlocks.upload[activeLang].split('\n').length, 1)} />
            </div>

            {/* Send Direct Message Snippet */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                <span>3. Kirim Pesan Instan</span>
                <button
                  onClick={() => copyToClipboard('send_direct', codeBlocks.send_direct[activeLang])}
                  className="text-blue-500 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  {copiedId === 'send_direct' ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : 'Salin'}
                </button>
              </div>
              <CodeEditor value={codeBlocks.send_direct[activeLang]} onChange={() => {}} readOnly minRows={Math.max(codeBlocks.send_direct[activeLang].split('\n').length, 1)} />
            </div>

            {/* Create Broadcast Snippet */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                <span>4. Kirim Campaign Broadcast</span>
                <button
                  onClick={() => copyToClipboard('broadcast', codeBlocks.broadcast[activeLang])}
                  className="text-blue-500 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  {copiedId === 'broadcast' ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : 'Salin'}
                </button>
              </div>
              <CodeEditor value={codeBlocks.broadcast[activeLang]} onChange={() => {}} readOnly minRows={Math.max(codeBlocks.broadcast[activeLang].split('\n').length, 1)} />
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
