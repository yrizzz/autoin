<?php

namespace App\Http\Controllers;

use App\Models\Channel;
use App\Models\ChatbotRule;
use App\Models\Plugin;
use Illuminate\Http\Request;

class ChatbotRuleController extends Controller
{
    // ── CRUD ──────────────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        return response()->json(
            $request->user()->chatbotRules()->orderByDesc('created_at')->get()
        );
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $count = $user->chatbotRules()->count();
        if (!\App\Services\PlanLimits::can($user, 'chatbot_rules', $count)) {
            return \App\Services\PlanLimits::denyResponse('chatbot_rules');
        }

        $data = $request->validate([
            'trigger'    => 'required|string|max:255',
            'match_type' => 'required|in:exact,contains,starts_with',
            'reply'      => 'required_without:plugin_id|nullable|string',
            'media_url'  => 'nullable|string',
            'media_type' => 'nullable|string',
            'platform'   => 'required|in:all,whatsapp',
            'reply_type' => 'sometimes|in:normal,quote',
            'prefix'     => 'sometimes|in:any,none,.,/,!,#',
            'is_ai'      => 'sometimes|boolean',
            'is_active'  => 'sometimes|boolean',
            'plugin_id'  => 'sometimes|nullable|integer',
        ]);

        $this->assertOwnsPlugin($user, $data['plugin_id'] ?? null);
        if ($resp = $this->checkPublicPluginQuota($user, $data['plugin_id'] ?? null)) {
            return $resp;
        }
        $data['reply'] = $data['reply'] ?? '';
        // Default: chatbot baru langsung aktif (ON) kecuali diminta lain.
        $data['is_active'] = $data['is_active'] ?? true;

        $rule = $user->chatbotRules()->create($data);

        return response()->json($rule, 201);
    }

    public function update(Request $request, ChatbotRule $chatbotRule)
    {
        abort_if($chatbotRule->user_id !== $request->user()->id, 403);

        $data = $request->validate([
            'trigger'    => 'sometimes|string|max:255',
            'match_type' => 'sometimes|in:exact,contains,starts_with',
            'reply'      => 'sometimes|nullable|string',
            'media_url'  => 'nullable|string',
            'media_type' => 'nullable|string',
            'platform'   => 'sometimes|in:all,whatsapp',
            'is_active'  => 'sometimes|boolean',
            'is_ai'      => 'sometimes|boolean',
            'reply_type' => 'sometimes|in:normal,quote',
            'prefix'     => 'sometimes|in:any,none,.,/,!,#',
            'plugin_id'  => 'sometimes|nullable|integer',
        ]);

        if (array_key_exists('plugin_id', $data)) {
            $this->assertOwnsPlugin($request->user(), $data['plugin_id']);
            if ($resp = $this->checkPublicPluginQuota($request->user(), $data['plugin_id'], $chatbotRule->id)) {
                return $resp;
            }
        }
        if (array_key_exists('reply', $data) && $data['reply'] === null) {
            $data['reply'] = '';
        }

        $chatbotRule->update($data);

        return response()->json($chatbotRule);
    }

    public function destroy(Request $request, ChatbotRule $chatbotRule)
    {
        abort_if($chatbotRule->user_id !== $request->user()->id, 403);
        $chatbotRule->delete();
        return response()->json(null, 204);
    }

    // Pastikan plugin yang dipilih milik user ybs ATAU plugin publik (boleh dipakai
    // lintas user via referensi). null = tidak pakai plugin.
    private function assertOwnsPlugin($user, ?int $pluginId): void
    {
        if ($pluginId === null) {
            return;
        }
        $canUse = Plugin::where('id', $pluginId)
            ->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhere('is_public', true);
            })
            ->exists();
        abort_unless($canUse, 422, 'Plugin tidak ditemukan.');
    }

    /**
     * Batasi jumlah plugin PUBLIK (milik orang lain) yang dipakai user di rule-nya,
     * sesuai paket (free = 5). Mengembalikan JsonResponse penolakan, atau null bila boleh.
     */
    private function checkPublicPluginQuota($user, ?int $pluginId, ?int $excludeRuleId = null)
    {
        if ($pluginId === null) {
            return null;
        }

        // Hanya plugin publik milik orang lain yang dihitung kuota. Plugin sendiri bebas.
        $plugin = Plugin::find($pluginId);
        if (!$plugin || !$plugin->is_public || $plugin->user_id === $user->id) {
            return null;
        }

        // ID plugin publik-eksternal yang SUDAH dipakai di rule user (selain rule ini).
        $usedPluginIds = $user->chatbotRules()
            ->when($excludeRuleId, fn ($q) => $q->where('id', '!=', $excludeRuleId))
            ->whereNotNull('plugin_id')
            ->pluck('plugin_id')
            ->unique();

        $usedExternal = Plugin::whereIn('id', $usedPluginIds)
            ->where('is_public', true)
            ->where('user_id', '!=', $user->id)
            ->pluck('id')
            ->all();

        // Sudah dipakai sebelumnya -> tidak menambah kuota.
        if (in_array($pluginId, $usedExternal, true)) {
            return null;
        }

        if (!\App\Services\PlanLimits::can($user, 'public_plugins_used', count($usedExternal))) {
            return \App\Services\PlanLimits::denyResponse('public_plugins_used');
        }

        return null;
    }

    // ── Pengaturan chatbot per-akun ───────────────────────────────────────────

    public function getSettings(Request $request)
    {
        $settings = $request->user()->settings ?? [];
        return response()->json([
            'plugin_react_feedback' => (bool) data_get($settings, 'plugin_react_feedback', false),
        ]);
    }

    public function saveSettings(Request $request)
    {
        $data = $request->validate([
            'plugin_react_feedback' => 'required|boolean',
        ]);

        $user = $request->user();
        $settings = $user->settings ?? [];
        $settings['plugin_react_feedback'] = $data['plugin_react_feedback'];
        $user->settings = $settings;
        $user->save();

        return response()->json([
            'plugin_react_feedback' => (bool) $settings['plugin_react_feedback'],
        ]);
    }

    // ── Internal: called by Node services on every incoming message ───────────

    public function matchInternal(Request $request)
    {
        $secret = $request->header('X-Internal-Secret');
        if ($secret !== config('services.internal.secret', 'autoin-internal-secret') && 
            $secret !== config('services.whatsapp.secret', 'autoin-wa-secret')) {
            return response()->json(['reply' => null], 401);
        }

        $sessionId = $request->input('session_id');
        $text      = (string) $request->input('text', '');
        $platform  = $request->input('platform', 'whatsapp');

        // Find channel by session_id stored in credentials (which is encrypted in DB)
        $channel = Channel::whereIn('platform', ['whatsapp'])
            ->get()
            ->first(function ($c) use ($sessionId) {
                return ($c->credentials['session_id'] ?? null) === $sessionId;
            });

        if (!$channel) {
            return response()->json(['reply' => null]);
        }

        // Plugin TIDAK lagi punya prefix/command sendiri. Pemicunya diatur lewat
        // chatbot rule (prefix + trigger + plugin_id) yang dicek di loop di bawah.

        // Setting per-akun: beri reaction feedback (⏳ saat command terdeteksi,
        // ✅ saat balasan plugin terkirim). Dibaca service WhatsApp dari respons ini.
        $owner = \App\Models\User::find($channel->user_id);
        $reactFeedback = (bool) data_get($owner?->settings, 'plugin_react_feedback', false);

        $rules = ChatbotRule::where('user_id', $channel->user_id)
            ->where('is_active', true)
            ->where(function ($q) use ($platform) {
                $q->where('platform', 'all')->orWhere('platform', $platform);
            })
            ->orderBy('created_at')
            ->get();

        foreach ($rules as $rule) {
            if ($rule->matches($text)) {
                // Rule memakai plugin dari pustaka -> jalankan plugin sbg balasan
                if ($rule->plugin_id) {
                    $plugin = $rule->plugin;
                    // Boleh dijalankan jika: plugin ada, aktif, DAN (milik pemilik rule
                    // ATAU masih publik). Plugin publik milik orang lain yang kemudian
                    // di-set privat / dihapus akan otomatis dilewati (skip).
                    $canRun = $plugin
                        && $plugin->is_active
                        && ($plugin->user_id === $rule->user_id || $plugin->is_public);
                    if ($canRun) {
                        $extracted = $rule->extractArgs($text);
                        return response()->json([
                            'type'   => 'plugin',
                            'plugin' => [
                                'id'         => $plugin->id,
                                'name'       => $plugin->name,
                                'code'       => $plugin->code,
                                'timeout_ms' => $plugin->timeout_ms,
                            ],
                            'args'           => $extracted['args'],
                            'raw_args'       => $extracted['raw_args'],
                            'sender'         => $request->input('sender'),
                            'react_feedback' => $reactFeedback,
                            'reply_type'     => $rule->reply_type ?? 'normal',
                        ]);
                    }
                    // plugin nonaktif/terhapus -> lanjut pakai reply biasa
                }

                $finalReply = $rule->reply;

                if ($rule->is_ai) {
                    $prompt = "Kamu adalah asisten chat otomatis (chatbot). Gunakan panduan berikut untuk menjawab pesan pelanggan:\n"
                            . "--- PANDUAN ---\n"
                            . $rule->reply . "\n"
                            . "---------------\n\n"
                            . "Pesan pelanggan: \"{$text}\"\n\n"
                            . "Berikan jawaban langsung, ramah, profesional, dan dalam bahasa Indonesia. HANYA berikan isi jawaban tanpa penjelasan tambahan.";
                    
                    try {
                        $apiUrl = 'https://api.yrizzz.my.id/api/execute/v1/ai/chatGpt';
                        $apiKey = 'pk_3876f9c71b90f5000e9f3b626298e4e34ae446dfe0a918342602e63f364709aa';
                        $response = \Illuminate\Support\Facades\Http::timeout(20)
                            ->withHeader('x-api-key', $apiKey)
                            ->get($apiUrl, ['prompt' => $prompt]);

                        if ($response->successful()) {
                            $body = $response->json();
                            $val = $body['response']
                                ?? $body['result']
                                ?? $body['data']
                                ?? $body['text']
                                ?? $body['message']
                                ?? (is_string($body) ? $body : null);

                            if ($val) {
                                $finalReply = trim($val);
                            }
                        }
                    } catch (\Exception $e) {
                        // Fallback to static rule reply
                    }
                }

                return response()->json([
                    'type'       => 'reply',
                    'reply'      => $finalReply,
                    'reply_type' => $rule->reply_type ?? 'normal',
                    'media_url'  => $rule->media_url,
                    'media_type' => $rule->media_type,
                ]);
            }
        }

        return response()->json(['reply' => null]);
    }
}
