<?php

namespace App\Services;

use App\Models\User;

class PlanLimits
{
    /**
     * Limits per plan.
     * null = unlimited
     */
    const LIMITS = [
        'free' => [
            'channels'          => 1,    // 1 device
            'broadcasts'        => 3,    // 3 broadcasts total (lifetime)
            'templates'         => 1,    // 1 saved template
            'messages_per_day'  => 50,   // 50 WA direct messages/day
            'chatbot_rules'     => 0,    // no chatbot
            'webhooks'          => 1,    // 1 webhook
        ],
        'daily' => [
            'channels'          => null,
            'broadcasts'        => null,
            'templates'         => null,
            'messages_per_day'  => null,
            'chatbot_rules'     => 5,
            'webhooks'          => 3,
        ],
        'monthly' => [
            'channels'          => null,
            'broadcasts'        => null,
            'templates'         => null,
            'messages_per_day'  => null,
            'chatbot_rules'     => null,
            'webhooks'          => null,
        ],
        'yearly' => [
            'channels'          => null,
            'broadcasts'        => null,
            'templates'         => null,
            'messages_per_day'  => null,
            'chatbot_rules'     => null,
            'webhooks'          => null,
        ],
    ];

    /**
     * Resolve the active plan key for a user.
     */
    public static function activePlan(User $user): string
    {
        $sub = $user->subscription;

        if (!$sub) return 'free';

        // If subscription has expired, treat as free
        if ($sub->expires_at && now()->isAfter($sub->expires_at)) {
            return 'free';
        }

        return $sub->plan ?? 'free';
    }

    /**
     * Get the limit value for a feature.
     * Returns null if unlimited.
     */
    public static function limit(User $user, string $feature): ?int
    {
        $plan = self::activePlan($user);
        return self::LIMITS[$plan][$feature] ?? null;
    }

    /**
     * Check if a user can perform an action, given current count.
     */
    public static function can(User $user, string $feature, int $currentCount = 0): bool
    {
        $limit = self::limit($user, $feature);
        if ($limit === null) return true;
        return $currentCount < $limit;
    }

    /**
     * Return a 403 JSON response with upgrade message.
     */
    public static function denyResponse(string $feature): \Illuminate\Http\JsonResponse
    {
        $messages = [
            'channels'         => 'Batas perangkat tercapai. Upgrade ke paket berbayar untuk menghubungkan lebih banyak device.',
            'broadcasts'       => 'Batas 3 broadcast gratis tercapai. Upgrade untuk broadcast tanpa batas.',
            'templates'        => 'Batas 1 template gratis tercapai. Upgrade untuk menyimpan lebih banyak template.',
            'messages_per_day' => 'Batas 50 pesan/hari tercapai. Upgrade untuk pengiriman pesan tanpa batas.',
            'chatbot_rules'    => 'Fitur Chatbot tidak tersedia di paket gratis. Upgrade untuk mengaktifkan Auto-Reply.',
            'webhooks'         => 'Batas webhook tercapai. Upgrade untuk webhook tanpa batas.',
        ];

        return response()->json([
            'error'   => 'plan_limit_exceeded',
            'message' => $messages[$feature] ?? 'Limit paket gratis tercapai. Silakan upgrade.',
            'feature' => $feature,
            'upgrade_url' => '/invoice',
        ], 403);
    }

    /**
     * Return a summary of current usage for the frontend.
     */
    public static function usageSummary(User $user): array
    {
        $plan = self::activePlan($user);
        $limits = self::LIMITS[$plan];

        return [
            'plan'   => $plan,
            'limits' => $limits,
            'usage'  => [
                'channels'      => $user->channels()->count(),
                'broadcasts'    => $user->broadcasts()->count(),
                'chatbot_rules' => $user->chatbotRules()->count(),
                'webhooks'      => $user->webhooks()->count(),
            ],
        ];
    }
}
