<?php

namespace App\Jobs;

use App\Events\BroadcastStatusUpdated;
use App\Models\Broadcast;
use App\Models\BroadcastLog;
use App\Services\WhatsAppService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SendBroadcastJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public int $timeout = 3600;

    public function __construct(public Broadcast $broadcast) {}

    public function handle(): void
    {
        $this->broadcast->update(['status' => 'sending']);

        $logs = BroadcastLog::where('broadcast_id', $this->broadcast->id)
            ->where('status', 'pending')
            ->with('channel')
            ->get();

        $delayMin = $this->broadcast->delay_min ?? 2;
        $delayMax = $this->broadcast->delay_max ?? 5;
        $chunkSize = $this->broadcast->chunk_size ?? 10;
        $chunkDelayMin = $this->broadcast->chunk_delay_min ?? 10;
        $chunkDelayMax = $this->broadcast->chunk_delay_max ?? 20;

        foreach ($logs as $index => $log) {
            if ($index > 0) {
                if ($index % $chunkSize === 0) {
                    $delay = rand($chunkDelayMin, $chunkDelayMax);
                    sleep($delay);
                } else {
                    $delay = rand($delayMin, $delayMax);
                    sleep($delay);
                }
            }

            $channel     = $log->channel;
            $recipientId = $log->recipient_id;
            $result      = $this->sendToChannel($channel, $recipientId);

            $log->update([
                'status'   => $result['ok'] ? 'success' : 'failed',
                'response' => $result['response'],
                'sent_at'  => now(),
            ]);

            $channel->update(['last_used_at' => now()]);

            event(new BroadcastStatusUpdated($this->broadcast, $log));
        }

        $allFailed = BroadcastLog::where('broadcast_id', $this->broadcast->id)
            ->where('status', 'success')->doesntExist();

        $this->broadcast->update([
            'status'  => $allFailed ? 'failed' : 'sent',
            'sent_at' => now(),
        ]);

        // If this broadcast is recurring, automatically schedule the next occurrence
        if (in_array($this->broadcast->recurring, ['daily', 'weekly', 'monthly'])) {
            $this->scheduleNextOccurrence($this->broadcast);
        }
    }

    /**
     * Helper to clone and schedule the next occurrence of a recurring broadcast.
     */
    private function scheduleNextOccurrence(Broadcast $broadcast): void
    {
        $baseDate = $broadcast->scheduled_at ?? $broadcast->created_at ?? now();
        $nextScheduledAt = \Carbon\Carbon::parse($baseDate);
        
        while ($nextScheduledAt->isPast()) {
            if ($broadcast->recurring === 'daily') {
                $nextScheduledAt->addDay();
            } elseif ($broadcast->recurring === 'weekly') {
                $nextScheduledAt->addWeek();
            } elseif ($broadcast->recurring === 'monthly') {
                $nextScheduledAt->addMonth();
            } else {
                break;
            }
        }

        // Create next scheduled broadcast
        $nextBroadcast = Broadcast::create([
            'user_id'      => $broadcast->user_id,
            'title'        => $broadcast->title,
            'content'      => $broadcast->content,
            'media_url'    => $broadcast->media_url,
            'media_type'   => $broadcast->media_type,
            'scheduled_at' => $nextScheduledAt,
            'recurring'    => $broadcast->recurring,
            'status'       => 'scheduled',
        ]);

        foreach ($broadcast->targets as $target) {
            \App\Models\BroadcastTarget::create([
                'broadcast_id' => $nextBroadcast->id,
                'channel_id'   => $target->channel_id,
                'recipients'   => $target->recipients,
            ]);
        }
    }

    private function sendToChannel($channel, ?string $recipientId): array
    {
        $content   = $this->broadcast->content ?? '';
        $mediaUrl  = $this->broadcast->media_url;
        $mediaType = $this->broadcast->media_type;

        $mentions = null;
        $autoTag = $this->broadcast->auto_tag_members;
        
        $isEnabled = false;
        $tagMode = 'all';
        $customMembers = [];

        if ($channel->platform === 'whatsapp' && $recipientId && str_ends_with($recipientId, '@g.us')) {
            if (is_bool($autoTag) && $autoTag) {
                $isEnabled = true;
            } elseif (is_array($autoTag)) {
                if (isset($autoTag['enabled']) && $autoTag['enabled']) {
                    $isEnabled = true;
                }
                
                if (isset($autoTag[$recipientId])) {
                    $groupConf = $autoTag[$recipientId];
                    $isEnabled = $groupConf['enabled'] ?? true;
                    $tagMode = $groupConf['mode'] ?? 'all';
                    $customMembers = $groupConf['custom_members'] ?? [];
                }
            }
        }

        if ($isEnabled) {
            $groupMetadata = app(WhatsAppService::class)->getGroupMetadata($channel, $recipientId);
            if ($groupMetadata && isset($groupMetadata['participants'])) {
                $participants = $groupMetadata['participants'];
                
                $targetParticipants = [];
                foreach ($participants as $p) {
                    if ($tagMode === 'all') {
                        $targetParticipants[] = $p['id'];
                    } elseif ($tagMode === 'admin') {
                        if (!empty($p['admin'])) {
                            $targetParticipants[] = $p['id'];
                        }
                    } elseif ($tagMode === 'custom') {
                        $pId = $p['id'];
                        $pPhone = explode('@', $pId)[0];
                        
                        $isMatched = false;
                        foreach ($customMembers as $cm) {
                            $cmPhone = explode('@', $cm)[0];
                            if ($cm === $pId || $cmPhone === $pPhone) {
                                $isMatched = true;
                                break;
                            }
                        }
                        if ($isMatched) {
                            $targetParticipants[] = $pId;
                        }
                    }
                }

                $mentions = $targetParticipants;
                // Hidden mentions: We send the mentions array so participants are notified, but do not append visible @tags to the message body text.
            }
        }

        return match($channel->platform) {
            'whatsapp'  => app(WhatsAppService::class)->send($channel, $content, $mediaUrl, $mediaType, $recipientId, null, $mentions),
            'telegram'  => $this->sendTelegram($channel, $content),
            default     => ['ok' => false, 'response' => ['error' => "Platform {$channel->platform} not yet supported"]],
        };
    }

    private function sendTelegram($channel, ?string $content = ''): array
    {
        $content = $content ?? '';
        $token = $channel->credentials['bot_token'] ?? '';
        $chatId = $channel->target_id;

        $response = \Illuminate\Support\Facades\Http::post("https://api.telegram.org/bot{$token}/sendMessage", [
            'chat_id' => $chatId,
            'text'    => $content,
        ]);

        return [
            'ok'       => $response->successful() && $response->json('ok'),
            'response' => $response->json(),
        ];
    }
}
