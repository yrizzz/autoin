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
            'chatbot_rules'     => 1,    // 1 chatbot rule for trial
            'webhooks'          => 1,    // 1 webhook
            'plugins'           => 1,    // 1 plugin for trial
            'public_plugins_used' => 5,  // maks 5 plugin publik (milik orang lain) yg dipakai di rule
        ],
        'daily' => [
            'channels'          => 1,    // 1 device on Daily Pass
            'broadcasts'        => null,
            'templates'         => null,
            'messages_per_day'  => null,
            'chatbot_rules'     => 5,
            'webhooks'          => 3,
            'plugins'           => 5,
            'public_plugins_used' => null,
        ],
        'weekly' => [
            'channels'          => 1,    // 1 device on Weekly Pass
            'broadcasts'        => null,
            'templates'         => null,
            'messages_per_day'  => null,
            'chatbot_rules'     => 10,
            'webhooks'          => 5,
            'plugins'           => 10,
            'public_plugins_used' => null,
        ],
        'monthly' => [
            'channels'          => 5,    // Max 5 devices on Monthly Pass
            'broadcasts'        => null,
            'templates'         => null,
            'messages_per_day'  => null,
            'chatbot_rules'     => null,
            'webhooks'          => null,
            'plugins'           => null,
            'public_plugins_used' => null,
        ],
        'yearly' => [
            'channels'          => 10,   // Max 10 devices on Yearly Pass
            'broadcasts'        => null,
            'templates'         => null,
            'messages_per_day'  => null,
            'chatbot_rules'     => null,
            'webhooks'          => null,
            'plugins'           => null,
            'public_plugins_used' => null,
        ],
    ];

    /**
     * Email yang selalu aktif premium tanpa batas (selamanya).
     */
    const ADMIN_EMAILS = ['arisedyhandoko@gmail.com'];

    public static function isAdmin(User $user): bool
    {
        return in_array(strtolower((string) $user->email), self::ADMIN_EMAILS, true);
    }

    /**
     * Resolve the active plan key for a user.
     */
    public static function activePlan(User $user): string
    {
        // Admin: selalu premium aktif (tidak pernah kedaluwarsa)
        if (self::isAdmin($user)) return 'monthly';

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
        // Admin: tanpa batas untuk semua fitur
        if (self::isAdmin($user)) return null;

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
            'chatbot_rules'    => 'Batas 1 auto-reply gratis tercapai. Upgrade untuk mengaktifkan lebih banyak Auto-Reply.',
            'webhooks'         => 'Batas webhook tercapai. Upgrade untuk webhook tanpa batas.',
            'plugins'          => 'Batas 1 plugin gratis tercapai. Upgrade untuk memasang lebih banyak plugin.',
            'public_plugins_used' => 'Batas 5 plugin publik tercapai untuk paket gratis. Upgrade untuk memakai plugin publik tanpa batas.',
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
        // Bangun limit lewat self::limit() supaya bypass admin (unlimited) ikut terpakai.
        $limits = [];
        foreach (array_keys(self::LIMITS[$plan]) as $feature) {
            $limits[$feature] = self::limit($user, $feature);
        }

        return [
            'plan'   => $plan,
            'limits' => $limits,
            'usage'  => [
                'channels'         => $user->channels()->count(),
                'broadcasts'       => $user->broadcasts()->count(),
                'chatbot_rules'    => $user->chatbotRules()->count(),
                'webhooks'         => $user->webhooks()->count(),
                'plugins'          => $user->plugins()->count(),
                'public_plugins_used' => self::publicPluginsUsedCount($user),
                'messages_per_day' => \App\Models\ApiLog::where('user_id', $user->id)->whereDate('created_at', today())->count(),
            ],
        ];
    }

    /**
     * Jumlah plugin publik (milik orang lain) yang sedang dipakai user di rule-nya.
     */
    public static function publicPluginsUsedCount(User $user): int
    {
        $usedPluginIds = $user->chatbotRules()
            ->whereNotNull('plugin_id')
            ->pluck('plugin_id')
            ->unique();

        if ($usedPluginIds->isEmpty()) return 0;

        return \App\Models\Plugin::whereIn('id', $usedPluginIds)
            ->where('is_public', true)
            ->where('user_id', '!=', $user->id)
            ->count();
    }
}
