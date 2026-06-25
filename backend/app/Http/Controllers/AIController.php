<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AIController extends Controller
{
    private string $apiUrl   = 'https://api.yrizzz.my.id/api/execute/v1/ai/chatGpt';
    private string $apiKey   = 'pk_3876f9c71b90f5000e9f3b626298e4e34ae446dfe0a918342602e63f364709aa';

    /**
     * Call yrizzz ChatGPT proxy.
     * Returns the response text, or null on failure.
     */
    private function callAI(string $prompt, int $timeoutSeconds = 20): ?string
    {
        try {
            $response = Http::timeout($timeoutSeconds)
                ->withHeader('x-api-key', $this->apiKey)
                ->get($this->apiUrl, ['prompt' => $prompt]);

            if ($response->failed()) {
                return null;
            }

            $body = $response->json();

            // Support various response shapes
            $val = $body['response']
                ?? $body['result']
                ?? $body['data']
                ?? $body['text']
                ?? $body['message']
                ?? (is_string($body) ? $body : null);

            if (is_array($val)) {
                return json_encode($val);
            }

            return $val;

        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Tone Rewrite Endpoint.
     */
    public function rewrite(Request $request)
    {
        $request->validate([
            'content' => 'required|string',
            'tone'    => 'required|in:formal,santai,marketing,professional,urgent,friendly',
        ]);

        $content = $request->input('content');
        $tone    = $request->input('tone');

        $toneDescriptions = [
            'formal'       => 'formal dan sopan (bahasa baku/resmi Indonesia, Yth., Dengan hormat)',
            'santai'       => 'santai dan ramah (bahasa gaul perkotaan, halo guys, yuk, gunakan emoji)',
            'marketing'    => 'persuasif dan bersemangat (teknik penawaran, huruf kapital menarik, emoji api, promo)',
            'professional' => 'profesional bisnis (bahasa bisnis Indonesia, berorientasi hasil, ringkas)',
            'urgent'       => 'sangat mendesak (tanda penting/segera, batas waktu, emoji lonceng/peringatan)',
            'friendly'     => 'hangat dan bersahabat (sapaan ramah, hangat, emoji senyum)',
        ];

        $desc = $toneDescriptions[$tone] ?? $tone;

        $prompt = "Kamu adalah copywriter ahli pesan broadcast (WhatsApp/Telegram). Tulis ulang teks berikut agar terdengar lebih {$desc}. Pertahankan semua placeholder seperti {{nama}}, {{tagihan}}, {{link}} persis apa adanya. Strukturkan pesan dengan baik menggunakan baris baru (newline / \\n) di antara poin, langkah, atau paragraf agar rapi dan mudah dibaca di WhatsApp. Output hanya teks hasil penulisan ulang, tanpa tanda kutip, tanpa penjelasan tambahan.\n\nTeks asli:\n{$content}";

        $rewritten = $this->callAI($prompt);

        if (!$rewritten) {
            return response()->json([
                'original'     => $content,
                'rewritten'    => $this->simulateRewrite($content, $tone),
                'is_simulated' => true,
                'error'        => 'AI tidak merespons, menggunakan template fallback.',
            ]);
        }

        return response()->json([
            'original'     => $content,
            'rewritten'    => trim($rewritten),
            'is_simulated' => false,
        ]);
    }

    /**
     * AI Message/Campaign Generator Endpoint.
     */
    public function generate(Request $request)
    {
        $request->validate([
            'type'    => 'required|in:caption,promo,announcement,reminder',
            'context' => 'required|string',
        ]);

        $type    = $request->input('type');
        $context = $request->input('context');

        $typePrompts = [
            'promo'        => 'pesan broadcast promosi yang menarik (promo, diskon, Call to Action, emoji beragam)',
            'announcement' => 'pengumuman resmi (struktur jelas, header pengumuman, informatif, profesional)',
            'reminder'     => 'pengingat ramah (pemberitahuan sopan, ajakan tindakan, nada bersahabat)',
            'caption'      => 'caption media sosial (hook menarik, ringkasan, hashtag relevan)',
        ];

        $desc = $typePrompts[$type] ?? $type;

        $prompt = "Buat pesan broadcast bertipe '{$desc}' dalam bahasa Indonesia, berdasarkan konteks berikut: '{$context}'. Buat semenarik mungkin, mudah dibaca, gunakan baris baru (newline / \\n) secara terstruktur untuk memisahkan paragraf, poin-poin penting, atau langkah-langkah agar rapi di WhatsApp. Gunakan emoji secukupnya, gunakan teks tebal markdown (*bold*) untuk poin penting. Output hanya isi pesan, tanpa penjelasan atau catatan tambahan.";

        $generated = $this->callAI($prompt);

        if (!$generated) {
            return response()->json([
                'generated'    => $this->simulateGenerate($context, $type),
                'is_simulated' => true,
                'error'        => 'AI tidak merespons, menggunakan template fallback.',
            ]);
        }

        return response()->json([
            'generated'    => trim($generated),
            'is_simulated' => false,
        ]);
    }

    /**
     * AI Message Optimizer/Auditor Endpoint.
     */
    public function optimize(Request $request)
    {
        $request->validate([
            'content' => 'required|string',
        ]);

        $content = $request->input('content');

        $prompt = "Analisis pesan broadcast/chat WhatsApp berikut dan berikan respons HANYA dalam format JSON murni (tanpa markdown, tanpa backtick, tanpa penjelasan).\n\nJSON yang diharapkan:\n{\"suggestions\":[\"saran 1\",\"saran 2\",\"saran 3\"],\"optimized\":\"versi pesan yang dioptimalkan\"}\n\nPastikan:\n- 'suggestions' berisi 2-3 poin saran konkret dalam bahasa Indonesia\n- 'optimized' berisi versi pesan yang lebih baik, terstruktur rapi dengan baris baru (newline / \\n) untuk memisahkan poin penting atau langkah-langkah agar pesan mudah dibaca oleh pelanggan di WhatsApp\n\nPesan yang dianalisis:\n{$content}";

        $resultText = $this->callAI($prompt, 25);

        if ($resultText) {
            // Strip markdown code blocks if any
            $cleaned = preg_replace('/^```(?:json)?\s*/i', '', trim($resultText));
            $cleaned = preg_replace('/```\s*$/', '', $cleaned);
            $cleaned = trim($cleaned);

            $data = json_decode($cleaned, true);

            if (json_last_error() === JSON_ERROR_NONE && isset($data['optimized'])) {
                return response()->json(array_merge($data, ['is_simulated' => false]));
            }
        }

        return response()->json(array_merge($this->simulateOptimize($content), [
            'is_simulated' => true,
            'error'        => 'AI tidak merespons dengan format yang tepat, menggunakan template fallback.',
        ]));
    }

    /**
     * AI Plugin Script Builder.
     * User menempel snippet fetch + contoh respons (atau deskripsi), AI mengubahnya
     * jadi body handler plugin yang siap pakai sesuai kontrak runtime (sandbox worker).
     */
    public function generatePlugin(Request $request)
    {
        $request->validate([
            'input'   => 'required|string|max:20000',
            'context' => 'nullable|string|max:8000', // kode lama (opsional) utk diperbaiki
        ]);

        $input   = $request->input('input');
        $context = trim((string) $request->input('context', ''));

        // Kontrak runtime — HARUS sesuai whatsapp-service/src/pluginWorker.js
        $contract = <<<'TXT'
Kamu adalah generator script PLUGIN untuk bot WhatsApp. Tugasmu: ubah input user (snippet fetch/cURL + contoh respons JSON, atau deskripsi) menjadi BODY HANDLER JavaScript yang siap dijalankan di sandbox.

ATURAN RUNTIME (WAJIB dipatuhi, sandbox ketat):
- Kode kamu adalah ISI dari `(async () => { ... })()`. Jadi boleh pakai top-level `await` dan `return`.
- DILARANG memakai: require, import, fetch, axios, process, fs, Buffer, setTimeout, console, window, global. Tidak ada akses jaringan/file selain lewat `helpers`.
- Variabel yang TERSEDIA: `ctx`, `helpers`, JSON, Math, Date, Promise, RegExp, Error, String, Number, Boolean, Array, Object, parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent, encodeURI, decodeURI.
- `ctx` = { args: string[], rawArgs: string, text: string, sender, chatId, sessionId, media? }. Argumen setelah trigger ada di `ctx.args` (mis. ".xprofile budi" -> ctx.args[0] = "budi").
- HTTP HANYA via `helpers`:
  • `await helpers.getJson(url, { headers })` -> parsed JSON
  • `await helpers.getText(url, { headers })` -> string
  • `await helpers.getBuffer(url, { headers })` -> Buffer
  • `await helpers.post(url, bodyObject, { headers })` -> JSON/teks
  • `await helpers.upload(url, { data, field, filename, contentType }, { fields, headers })` -> untuk kirim file (mis. ctx.media)
  • `helpers.log(...)` untuk debug (BUKAN console.log)
- Output WAJIB: `return` sebuah string, ATAU object `{ text, mediaUrl, mediaType }` (mediaType: 'image' | 'video' | 'audio' | 'document'). mediaUrl boleh URL gambar/file.
- Validasi argumen: jika argumen wajib kosong, `return` pesan cara pakai (mis. 'Pemakaian: .xprofile <username>').
- Jika ada API key di snippet user, simpan di `const API_KEY = '...'` lalu kirim lewat headers. Jangan hardcode token rahasia lain.
- Tangani error/respons kosong dengan ramah (bahasa Indonesia), jangan throw mentah.
- Format teks balasan rapi untuk WhatsApp (boleh *bold*, emoji secukupnya, baris baru).

PENTING OUTPUT: Balas HANYA kode JavaScript murni (body handler). TANPA penjelasan, TANPA komentar pembuka/penutup berlebihan, TANPA pembungkus ```/markdown, TANPA mendefinisikan fungsi pembungkus async. Mulai langsung dari baris kode pertama.
TXT;

        $task = $context !== ''
            ? "Perbaiki / lengkapi script plugin berikut agar sesuai kontrak runtime dan permintaan user.\n\n--- SCRIPT SAAT INI ---\n{$context}\n\n--- PERMINTAAN / INPUT USER (fetch + contoh respons) ---\n{$input}"
            : "Buat script plugin dari input user berikut (snippet fetch + contoh respons / deskripsi):\n\n{$input}";

        $prompt = $contract . "\n\n" . $task;

        $result = $this->callAI($prompt, 40);

        if (!$result) {
            return response()->json([
                'code'  => null,
                'error' => 'AI tidak merespons. Coba lagi sebentar.',
            ], 422);
        }

        // Bersihkan pembungkus markdown bila AI tetap menambahkannya.
        $code = trim($result);
        $code = preg_replace('/^```(?:js|javascript)?\s*/i', '', $code);
        $code = preg_replace('/```\s*$/', '', $code);
        $code = trim($code);

        return response()->json([
            'code'         => $code,
            'is_simulated' => false,
        ]);
    }

    // ── Local Simulation Engines (fallback) ───────────────────────────────────

    private function simulateRewrite(string $text, string $tone): string
    {
        $cleaned = trim($text);

        switch ($tone) {
            case 'formal':
                return "Yth. Pelanggan,\n\nDengan hormat, kami ingin menyampaikan informasi berikut:\n\n{$cleaned}\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu sekalian.\n\nHormat kami,\nManagement";
            case 'santai':
                return "Halo guys! 👋\n\nAda info seru nih buat kamu:\n\n{$cleaned}\n\nJangan sampai kelewatan ya! Have a great day! ✨";
            case 'marketing':
                return "🔥 PENGUMUMAN SPESIAL UNTUKMU! 🔥\n\n⚡ *{$cleaned}* ⚡\n\nSlot terbatas & penawaran ini hanya berlaku singkat! Hubungi kami sekarang! 🚀";
            case 'professional':
                return "Rekan Bisnis,\n\nKami menginformasikan hal berikut:\n\n- {$cleaned}\n\nSilakan hubungi kami jika memerlukan klarifikasi.\n\nSalam,\nTeam";
            case 'urgent':
                return "🚨 PERINGATAN PENTING & SEGERA! 🚨\n\nHarap diperhatikan:\n\n👉 *{$cleaned}*\n\nTindakan segera diperlukan. Terima kasih.";
            case 'friendly':
                return "Halo Sahabat! 🤗\n\nKami senang mengabarkan:\n\n{$cleaned}\n\nSemoga hari kamu menyenangkan! 💕";
            default:
                return $text;
        }
    }

    private function simulateGenerate(string $context, string $type): string
    {
        switch ($type) {
            case 'promo':
                return "🎉 PROMO SPESIAL! 🎉\n\n📢 *{$context}*\n\nJangan lewatkan penawaran istimewa ini!\n\n👇 Hubungi admin sekarang!\n\n⚡ *Penawaran Terbatas!*";
            case 'announcement':
                return "📢 PENGUMUMAN RESMI 📢\n\nHalo Pelanggan Setia,\n\nKami menginformasikan:\n\n👉 {$context}\n\nTerima kasih atas pengertian Anda! 🙏";
            case 'reminder':
                return "⏰ PENGINGAT 📌\n\nHalo kak,\n\n*Detail:* {$context}\n\nMohon segera diselesaikan ya. Hubungi admin jika butuh bantuan! 😊";
            case 'caption':
                return "✨ Update Hari Ini ✨\n\n{$context}\n\nShare pendapat kamu di kolom komentar! 👇\n\n---\n#update #info";
            default:
                return "Pesan untuk: {$context}";
        }
    }

    private function simulateOptimize(string $text): array
    {
        return [
            'suggestions' => [
                'Tambahkan Call to Action (CTA) berupa link atau petunjuk tindakan di akhir pesan.',
                'Gunakan baris baru lebih banyak agar pesan tidak terasa menumpuk di layar HP.',
                'Tambahkan emoji relevan untuk meningkatkan keterbacaan.',
            ],
            'optimized' => "🔥 *INFO PENTING!* 🔥\n\nHalo,\n\n{$text}\n\n👇 *Segera ambil tindakan:*\n📲 Hubungi kami sekarang!\n\n_CS kami siap membantu._",
        ];
    }
}
