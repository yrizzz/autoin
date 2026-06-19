<?php

namespace App\Services;

use App\Events\BroadcastStatusUpdated;
use App\Jobs\SendBroadcastJob;
use App\Models\Broadcast;
use App\Models\BroadcastLog;
use App\Models\BroadcastTarget;

class BroadcastService
{
    public function send(Broadcast $broadcast): void
    {
        $broadcast->update(['status' => 'queued']);

        foreach ($broadcast->targets as $target) {
            BroadcastLog::create([
                'broadcast_id' => $broadcast->id,
                'channel_id'   => $target->channel_id,
                'status'       => 'pending',
                'created_at'   => now(),
            ]);
        }

        SendBroadcastJob::dispatch($broadcast);
    }

    public function schedule(Broadcast $broadcast): void
    {
        $broadcast->update(['status' => 'scheduled']);
    }

    public function getStats(int $userId): array
    {
        $broadcasts = Broadcast::where('user_id', $userId);

        return [
            'total'        => $broadcasts->count(),
            'sent'         => $broadcasts->where('status', 'sent')->count(),
            'failed'       => $broadcasts->where('status', 'failed')->count(),
            'scheduled'    => $broadcasts->where('status', 'scheduled')->count(),
        ];
    }
}
