<?php

namespace App\Jobs;

use App\Events\BroadcastStatusUpdated;
use App\Models\Broadcast;
use App\Models\BroadcastLog;
use App\Services\DiscordService;
use App\Services\TelegramService;
use App\Services\WebhookService;
use App\Services\WhatsAppService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SendBroadcastJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(public Broadcast $broadcast) {}

    public function handle(): void
    {
        $this->broadcast->update(['status' => 'sending']);

        $logs = BroadcastLog::where('broadcast_id', $this->broadcast->id)
            ->where('status', 'pending')
            ->with('channel')
            ->get();

        foreach ($logs as $log) {
            $channel = $log->channel;
            $result  = $this->sendToChannel($channel);

            $log->update([
                'status'   => $result['ok'] ? 'success' : 'failed',
                'response' => $result['response'],
                'sent_at'  => now(),
            ]);

            $channel->update(['last_used_at' => now()]);

            event(new BroadcastStatusUpdated($this->broadcast, $log));
        }

        $hasFailure = BroadcastLog::where('broadcast_id', $this->broadcast->id)
            ->where('status', 'failed')->exists();

        $allFailed = BroadcastLog::where('broadcast_id', $this->broadcast->id)
            ->where('status', 'success')->doesntExist();

        $this->broadcast->update([
            'status'  => $allFailed ? 'failed' : 'sent',
            'sent_at' => now(),
        ]);

        // Deduct trial if on free plan
        $user = $this->broadcast->user;
        if (!$user->subscription || $user->subscription->plan === 'free') {
            $user->decrement('trial_count');
        }
    }

    private function sendToChannel($channel): array
    {
        $content   = $this->broadcast->content;
        $mediaUrl  = $this->broadcast->media_url;
        $mediaType = $this->broadcast->media_type;

        return match($channel->platform) {
            'telegram'  => app(TelegramService::class)->send($channel, $content, $mediaUrl, $mediaType),
            'discord'   => app(DiscordService::class)->send($channel, $content, $mediaUrl),
            'webhook'   => app(WebhookService::class)->send($channel, $content, $mediaUrl),
            'whatsapp'  => app(WhatsAppService::class)->send($channel, $content, $mediaUrl, $mediaType),
            default     => ['ok' => false, 'response' => ['error' => "Platform {$channel->platform} not yet supported"]],
        };
    }
}
