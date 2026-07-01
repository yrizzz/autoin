<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use App\Models\Broadcast;
use App\Models\BroadcastTarget;
use App\Services\BroadcastService;
use Carbon\Carbon;

class ProcessScheduledBroadcast implements ShouldQueue
{
    use Queueable;

    public function __construct() {}

    public function handle(): void
    {
        $broadcasts = Broadcast::where('status', 'scheduled')
            ->where('scheduled_at', '<=', now())
            ->get();

        $service = app(BroadcastService::class);

        foreach ($broadcasts as $broadcast) {
            $service->send($broadcast);

            // ── Recurring: jadwalkan ulang setelah dikirim ──────────────────
            if ($broadcast->recurring && $broadcast->recurring !== 'none') {
                $nextAt = $this->nextScheduledAt($broadcast->scheduled_at, $broadcast->recurring);

                // Buat salinan broadcast baru untuk jadwal berikutnya
                $next = Broadcast::create([
                    'user_id'            => $broadcast->user_id,
                    'title'              => $broadcast->title,
                    'content'            => $broadcast->content,
                    'media_url'          => $broadcast->media_url,
                    'media_type'         => $broadcast->media_type,
                    'status'             => 'scheduled',
                    'scheduled_at'       => $nextAt,
                    'recurring'          => $broadcast->recurring,
                    'delay_min'          => $broadcast->delay_min,
                    'delay_max'          => $broadcast->delay_max,
                    'chunk_size'         => $broadcast->chunk_size,
                    'chunk_delay_min'    => $broadcast->chunk_delay_min,
                    'chunk_delay_max'    => $broadcast->chunk_delay_max,
                    'spintax_enabled'    => $broadcast->spintax_enabled,
                    'shuffle_recipients' => $broadcast->shuffle_recipients,
                    'typing_simulation'  => $broadcast->typing_simulation,
                    'auto_tag_members'   => $broadcast->auto_tag_members,
                ]);

                // Salin targets (termasuk recipients / status@broadcast)
                foreach ($broadcast->targets as $target) {
                    BroadcastTarget::create([
                        'broadcast_id' => $next->id,
                        'channel_id'   => $target->channel_id,
                        'recipients'   => $target->recipients,
                    ]);
                }
            }
        }
    }

    /**
     * Hitung jadwal berikutnya berdasarkan recurring setting.
     */
    private function nextScheduledAt(?Carbon $from, string $recurring): Carbon
    {
        $base = $from ?? now();

        return match ($recurring) {
            'daily'   => (clone $base)->addDay(),
            'weekly'  => (clone $base)->addWeek(),
            'monthly' => (clone $base)->addMonth(),
            default   => (clone $base)->addDay(),
        };
    }
}
