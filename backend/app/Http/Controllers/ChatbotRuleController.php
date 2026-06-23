<?php

namespace App\Http\Controllers;

use App\Models\Channel;
use App\Models\ChatbotRule;
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
            'reply'      => 'required|string',
            'platform'   => 'required|in:all,whatsapp',
            'reply_type' => 'sometimes|in:normal,quote',
            'prefix'     => 'sometimes|in:any,none,.,/,!,#',
        ]);

        $rule = $user->chatbotRules()->create($data);

        return response()->json($rule, 201);
    }

    public function update(Request $request, ChatbotRule $chatbotRule)
    {
        abort_if($chatbotRule->user_id !== $request->user()->id, 403);

        $data = $request->validate([
            'trigger'    => 'sometimes|string|max:255',
            'match_type' => 'sometimes|in:exact,contains,starts_with',
            'reply'      => 'sometimes|string',
            'platform'   => 'sometimes|in:all,whatsapp',
            'is_active'  => 'sometimes|boolean',
            'reply_type' => 'sometimes|in:normal,quote',
            'prefix'     => 'sometimes|in:any,none,.,/,!,#',
        ]);

        $chatbotRule->update($data);

        return response()->json($chatbotRule);
    }

    public function destroy(Request $request, ChatbotRule $chatbotRule)
    {
        abort_if($chatbotRule->user_id !== $request->user()->id, 403);
        $chatbotRule->delete();
        return response()->json(null, 204);
    }

    // ── Internal: called by Node services on every incoming message ───────────

    public function matchInternal(Request $request)
    {
        $secret = $request->header('X-Internal-Secret');
        if ($secret !== config('services.internal.secret', 'autoin-internal-secret')) {
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

        $rules = ChatbotRule::where('user_id', $channel->user_id)
            ->where('is_active', true)
            ->where(function ($q) use ($platform) {
                $q->where('platform', 'all')->orWhere('platform', $platform);
            })
            ->orderBy('created_at')
            ->get();

        foreach ($rules as $rule) {
            if ($rule->matches($text)) {
                return response()->json([
                    'reply' => $rule->reply,
                    'reply_type' => $rule->reply_type ?? 'normal'
                ]);
            }
        }

        return response()->json(['reply' => null]);
    }
}
