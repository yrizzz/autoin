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

        // Delete any existing logs to prevent duplicates on retry/resend
        BroadcastLog::where('broadcast_id', $broadcast->id)->delete();

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

        if (config('queue.default') === 'sync') {
            $this->dispatchInBackground($broadcast);
        } else {
            SendBroadcastJob::dispatch($broadcast);
        }
    }

    /**
     * Kick off the actual sending without blocking — or failing — the HTTP
     * response. Prefer a detached CLI process (no execution-time limit, best for
     * large broadcasts); fall back to running after the response is flushed when
     * exec() is unavailable. Previously an unguarded exec() raised a fatal
     * "Server Error" whenever the host had exec() in disable_functions.
     */
    private function dispatchInBackground(Broadcast $broadcast): void
    {
        $disabled = array_map('trim', explode(',', (string) ini_get('disable_functions')));
        $execAvailable = function_exists('exec') && !in_array('exec', $disabled, true);

        if ($execAvailable) {
            try {
                $artisan = base_path('artisan');
                exec("php {$artisan} broadcast:run {$broadcast->id} > /dev/null 2>&1 &");
                return;
            } catch (\Throwable $e) {
                // Fall through to running the job after the response is sent.
            }
        }

        SendBroadcastJob::dispatchAfterResponse($broadcast);
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
