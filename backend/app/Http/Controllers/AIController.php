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
