<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AIController extends Controller
{
    /**
     * Helper to get OpenAI API key.
     */
    private function getApiKey(): ?string
    {
        return config('services.openai.key') ?: env('OPENAI_API_KEY');
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
        $tone = $request->input('tone');
        $apiKey = $this->getApiKey();

        if (!$apiKey) {
            // Return simulation mode response
            $simulated = $this->simulateRewrite($content, $tone);
            return response()->json([
                'original'     => $content,
                'rewritten'    => $simulated,
                'is_simulated' => true,
            ]);
        }

        $toneDescriptions = [
            'formal'       => 'formal and polite (menggunakan bahasa baku/resmi Indonesia, Yth., Dengan hormat)',
            'santai'       => 'casual and friendly (menggunakan bahasa gaul/santai perkotaan, halo guys, yuk, pake emoji)',
            'marketing'    => 'persuasive and hype marketing (menggunakan teknik penawaran, huruf kapital menarik, emoji api, promo)',
            'professional' => 'clear business professional (menggunakan bahasa bisnis profesional Indonesia, berorientasi hasil, ringkas)',
            'urgent'       => 'highly urgent (menggunakan penanda penting/segera, batas waktu, emoji lonceng/peringatan)',
            'friendly'     => 'warm and friendly (menggunakan sapaan ramah sahabat, hangat, emoji senyum/pelukan)',
        ];

        $desc = $toneDescriptions[$tone] ?? $tone;

        $prompt = "You are a copywriter expert in writing broadcast messages and chats (e.g. WhatsApp, Telegram). Rewrite the following text to sound more {$desc} in Indonesian. Keep any placeholders (like {name}, {invoice}, {link}, etc.) exactly as they are. Output only the rewritten text, without quotes, without greeting card headers or footers unless appropriate, and no additional remarks.\n\nText: {$content}";

        try {
            $response = Http::timeout(10)->withHeaders([
                'Authorization' => "Bearer {$apiKey}",
                'Content-Type'  => 'application/json',
            ])->post('https://api.openai.com/1/chat/completions', [
                'model' => 'gpt-4o-mini',
                'messages' => [
                    ['role' => 'user', 'content' => $prompt]
                ],
                'temperature' => 0.75,
            ]);

            if ($response->failed()) {
                $errMsg = $response->json('error.message') ?? 'Unknown OpenAI error';
                return response()->json([
                    'error' => "OpenAI Error: {$errMsg}. Fallback to simulated response.",
                    'original' => $content,
                    'rewritten' => $this->simulateRewrite($content, $tone),
                    'is_simulated' => true,
                ]);
            }

            $rewritten = trim($response->json('choices.0.message.content'));

            return response()->json([
                'original'     => $content,
                'rewritten'    => $rewritten,
                'is_simulated' => false,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => "Connection Error: {$e->getMessage()}. Fallback to simulated response.",
                'original' => $content,
                'rewritten' => $this->simulateRewrite($content, $tone),
                'is_simulated' => true,
            ]);
        }
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

        $type = $request->input('type');
        $context = $request->input('context');
        $apiKey = $this->getApiKey();

        if (!$apiKey) {
            $simulated = $this->simulateGenerate($context, $type);
            return response()->json([
                'generated'    => $simulated,
                'is_simulated' => true,
            ]);
        }

        $typePrompts = [
            'promo'        => 'engaging promotional broadcast message (marketing promo, discounts, Call to Action, rich emojis)',
            'announcement' => 'official announcement broadcast (clear structure, announcement header, informative, professional)',
            'reminder'     => 'gentle and clear payment/event reminder (polite notification, call to action/complete payment, friendly tone)',
            'caption'      => 'social media caption/post update (engaging hook, summary details, hashtags list)',
        ];

        $desc = $typePrompts[$type] ?? $type;

        $prompt = "Write a broadcast message of type '{$desc}' in Indonesian, based on this user context description: '{$context}'. Make it highly engaging, readable with emojis, use bold markdown sparingly for key points, and keep it ready to copy and send. You can use standard placeholders like {name} if relevant. Output only the generated message content, with no introductory explanation, no quotes, and no closing notes.";

        try {
            $response = Http::timeout(10)->withHeaders([
                'Authorization' => "Bearer {$apiKey}",
                'Content-Type'  => 'application/json',
            ])->post('https://api.openai.com/1/chat/completions', [
                'model' => 'gpt-4o-mini',
                'messages' => [
                    ['role' => 'user', 'content' => $prompt]
                ],
                'temperature' => 0.8,
            ]);

            if ($response->failed()) {
                return response()->json([
                    'generated'    => $this->simulateGenerate($context, $type),
                    'is_simulated' => true,
                ]);
            }

            $generated = trim($response->json('choices.0.message.content'));

            return response()->json([
                'generated'    => $generated,
                'is_simulated' => false,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'generated'    => $this->simulateGenerate($context, $type),
                'is_simulated' => true,
            ]);
        }
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
        $apiKey = $this->getApiKey();

        if (!$apiKey) {
            $simulated = $this->simulateOptimize($content);
            return response()->json(array_merge($simulated, ['is_simulated' => true]));
        }

        $prompt = "Analyze the following broadcast/chat message. Provide constructive, brief suggestions in Indonesian to improve its conversion rate, clarity, and engagement. Specifically:
1. Highlight any issues (e.g. too wordy, missing call to action, hard to read).
2. Give a list of 2-3 specific improvements.
3. Provide an optimized version of the message.
Format the output as a clean JSON object with keys: 'suggestions' (array of strings) and 'optimized' (string). Output only the raw JSON, no markdown formatting blocks, no backticks, no comments.";

        try {
            $response = Http::timeout(10)->withHeaders([
                'Authorization' => "Bearer {$apiKey}",
                'Content-Type'  => 'application/json',
            ])->post('https://api.openai.com/1/chat/completions', [
                'model' => 'gpt-4o-mini',
                'messages' => [
                    ['role' => 'user', 'content' => $prompt]
                ],
                'temperature' => 0.6,
            ]);

            if ($response->failed()) {
                return response()->json(array_merge($this->simulateOptimize($content), ['is_simulated' => true]));
            }

            $resultText = trim($response->json('choices.0.message.content'));
            
            // Clean markdown wrapper if any
            $resultText = preg_replace('/^```json\s*/i', '', $resultText);
            $resultText = preg_replace('/```$/', '', $resultText);
            $resultText = trim($resultText);

            $data = json_decode($resultText, true);

            if (json_last_error() !== JSON_ERROR_NONE || !isset($data['optimized'])) {
                return response()->json(array_merge($this->simulateOptimize($content), ['is_simulated' => true]));
            }

            return response()->json(array_merge($data, ['is_simulated' => false]));

        } catch (\Exception $e) {
            return response()->json(array_merge($this->simulateOptimize($content), ['is_simulated' => true]));
        }
    }

    // ── Local Simulation Engines ──────────────────────────────────────────────

    private function simulateRewrite(string $text, string $tone): string
    {
        $cleaned = trim($text);
        
        switch ($tone) {
            case 'formal':
                return "Yth. Pelanggan,\n\nDengan hormat, kami ingin menyampaikan informasi berikut:\n\n{$cleaned}\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu sekalian.\n\nHormat kami,\nManagement Autoin";
            case 'santai':
                return "Halo guys! 👋\n\nAda info seru nih buat kamu: \n\n{$cleaned}\n\nJangan sampai kelewatan ya! Have a great day! ✨";
            case 'marketing':
                return "🔥 PENGUMUMAN SPESIAL UNTUKMU! 🔥\n\nKabar gembira! \n\n⚡ *{$cleaned}* ⚡\n\nSlot terbatas & penawaran spesial ini hanya berlaku singkat! Jangan sampai kehabisan, klik link hubungi kami sekarang juga! 🚀";
            case 'professional':
                return "Rekan Bisnis,\n\nKami menginformasikan detail penting berikut untuk perhatian Anda:\n\n- {$cleaned}\n\nSilakan hubungi Customer Success kami jika memerlukan klarifikasi tambahan.\n\nSalam,\nAutoin Operations";
            case 'urgent':
                return "🚨 PERINGATAN PENTING & SEGERA! 🚨\n\nHarap diperhatikan:\n\n👉 *{$cleaned}*\n\nTindakan segera diperlukan agar transaksi Anda tetap berjalan lancar. Terima kasih.";
            case 'friendly':
                return "Halo Sahabat Autoin! 🤗\n\nKami senang sekali mengabarkan bahwa:\n\n{$cleaned}\n\nSemoga hari kamu menyenangkan dan lancar selalu ya! Kami selalu ada di sini untuk membantumu. 💕";
            default:
                return $text;
        }
    }

    private function simulateGenerate(string $context, string $type): string
    {
        switch ($type) {
            case 'promo':
                return "🎉 PROMO SPESIAL AUTOIN! 🎉\n\nApakah kamu siap untuk penawaran terbaik bulan ini?\n\n📢 *Kabar Baik:* {$context}\n\nJangan lewatkan promo istimewa ini! \n\n👇 *Dapatkan sekarang sebelum kehabisan:* \n📲 Hubungi admin atau klik link di profil kami!\n\n⚡ *Penawaran Terbatas!*";
            case 'announcement':
                return "📢 PENGUMUMAN RESMI 📢\n\nHalo Pelanggan Setia,\n\nKami ingin menginformasikan pengumuman penting terkait:\n\n👉 {$context}\n\nKami berkomitmen untuk terus memberikan layanan terbaik untuk Anda. Terima kasih atas pengertian dan kerja samanya! 🙏";
            case 'reminder':
                return "⏰ PENGINGAT RAMAH (REMINDER) ⏰\n\nHalo kak,\n\nIni adalah pengingat ramah untuk jadwal/transaksi Anda:\n\n📌 *Detail:* {$context}\n\nMohon segera diselesaikan agar dapat diproses ke tahap selanjutnya ya. Jika butuh bantuan, jangan ragu untuk chat admin! 😊";
            case 'caption':
                return "✨ Special Update Hari Ini ✨\n\n{$context}\n\nBagaimana menurut kamu tentang info di atas? Share di kolom komentar ya! 👇\n\n---\n#autoin #broadcastplatform #digitalmarketing #businessowner #automation";
            default:
                return "Hasil generate untuk konteks: {$context}";
        }
    }

    private function simulateOptimize(string $text): array
    {
        return [
            'suggestions' => [
                'Tambahkan Call to Action (CTA) berupa link atau petunjuk tindakan di akhir pesan.',
                'Gunakan pembatas baris / newline lebih banyak agar pesan tidak terasa menumpuk saat dibaca di layar HP.',
                'Tambahkan emoji yang relevan untuk menarik perhatian dan meningkatkan keterbacaan pesan.',
            ],
            'optimized' => "🔥 *INFO PENTING UNTUK ANDA!* 🔥\n\nHalo,\n\n{$text}\n\n👇 *Segera lakukan tindakan berikut:* \n🔗 Klik link: http://autoin.dev/action\n\n_Hubungi CS kami jika ada kendala._"
        ];
    }
}
