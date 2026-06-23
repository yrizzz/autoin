<?php

namespace App\Services;

use App\Jobs\SendBroadcastJob;
use App\Models\Broadcast;
use App\Models\BroadcastLog;

class BroadcastService
{
    public function send(Broadcast $broadcast): void
    {
        // If still scheduled in future, just ensure status is set
        if ($broadcast->scheduled_at && $broadcast->scheduled_at->isFuture()) {
            $broadcast->update(['status' => 'scheduled']);
            return;
        }

        $broadcast->update(['status' => 'queued']);

        foreach ($broadcast->targets as $target) {
            $recipients = $target->recipients;

            if (!empty($recipients)) {
                // Create one log entry per individual recipient
                foreach ($recipients as $recipientId) {
                    BroadcastLog::create([
                        'broadcast_id' => $broadcast->id,
                        'channel_id'   => $target->channel_id,
                        'recipient_id' => $recipientId,
                        'status'       => 'pending',
                        'created_at'   => now(),
                    ]);
                }
            } else {
                // No specific recipients — send to channel default target_id
                BroadcastLog::create([
                    'broadcast_id' => $broadcast->id,
                    'channel_id'   => $target->channel_id,
                    'recipient_id' => null,
                    'status'       => 'pending',
                    'created_at'   => now(),
                ]);
            }
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
            'total'     => (clone $broadcasts)->count(),
            'sent'      => (clone $broadcasts)->where('status', 'sent')->count(),
            'failed'    => (clone $broadcasts)->where('status', 'failed')->count(),
            'scheduled' => (clone $broadcasts)->where('status', 'scheduled')->count(),
        ];
    }
}
