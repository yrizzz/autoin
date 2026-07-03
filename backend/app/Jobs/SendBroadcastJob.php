<?php

namespace App\Jobs;

use App\Events\BroadcastStatusUpdated;
use App\Models\Broadcast;
use App\Models\BroadcastLog;
use App\Services\WhatsAppService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class SendBroadcastJob implements ShouldQueue
{
    use Queueable;

    public int $tries   = 3;
    public int $timeout = 7200; // 2 jam maksimum

    public function __construct(public Broadcast $broadcast) {}

    public function handle(): void
    {
        // Reload fresh dari DB agar cancel_requested selalu up-to-date
        $this->broadcast->refresh();

        if ($this->broadcast->cancel_requested) {
            $this->broadcast->update(['status' => 'cancelled']);
            Log::info("[Broadcast #{$this->broadcast->id}] Dibatalkan sebelum dimulai.");
            return;
        }

        $this->broadcast->update(['status' => 'sending']);

        $logs = BroadcastLog::where('broadcast_id', $this->broadcast->id)
            ->where('status', 'pending')
            ->with('channel')
            ->get();

        if ($logs->isEmpty()) {
            $this->broadcast->update(['status' => 'sent', 'sent_at' => now()]);
            return;
        }

        // ── Anti-ban settings ─────────────────────────────────────────────────
        $delayMin      = max(1, $this->broadcast->delay_min      ?? 3);
        $delayMax      = max($delayMin, $this->broadcast->delay_max      ?? 7);
        $chunkSize     = max(1, $this->broadcast->chunk_size     ?? 10);
        $chunkDelayMin = max(5, $this->broadcast->chunk_delay_min ?? 15);
        $chunkDelayMax = max($chunkDelayMin, $this->broadcast->chunk_delay_max ?? 30);

        $useSpintax         = $this->broadcast->spintax_enabled    ?? false;
        $shuffleRecipients  = $this->broadcast->shuffle_recipients  ?? true;
        $typingSimulation   = $this->broadcast->typing_simulation   ?? true;

        // ── Acak urutan penerima ──────────────────────────────────────────────
        $logItems = $logs->all();
        if ($shuffleRecipients) {
            shuffle($logItems);
        }

        $sentCount   = 0;
        $failedCount = 0;

        foreach ($logItems as $index => $log) {
            // ── Cek cancel di tengah proses ───────────────────────────────────
            if ($index > 0 && $index % 5 === 0) {
                $this->broadcast->refresh();
                if ($this->broadcast->cancel_requested) {
                    // Tandai yang belum terkirim sebagai cancelled
                    $pendingIds = collect($logItems)
                        ->skip($index)
                        ->pluck('id');
                    BroadcastLog::whereIn('id', $pendingIds)
                        ->where('status', 'pending')
                        ->update(['status' => 'cancelled']);
                    $this->broadcast->update(['status' => 'cancelled']);
                    Log::info("[Broadcast #{$this->broadcast->id}] Dibatalkan di indeks {$index}.");
                    return;
                }
            }

            // ── Delay anti-ban ────────────────────────────────────────────────
            if ($index > 0) {
                if ($index % $chunkSize === 0) {
                    // Jeda panjang antar chunk — tambahkan jitter acak
                    $delay = rand($chunkDelayMin, $chunkDelayMax);
                    Log::debug("[Broadcast #{$this->broadcast->id}] Chunk pause: {$delay}s (chunk #{$index})");
                    sleep($delay);
                } else {
                    // Jeda normal antar pesan — jitter untuk hindari pola tetap
                    $delay = rand($delayMin, $delayMax);
                    sleep($delay);
                }
            }

            $channel     = $log->channel;
            $recipientId = $log->recipient_id;

            // ── Spintax: variasi konten agar tidak identik ────────────────────
            $content = $this->broadcast->content ?? '';
            if ($useSpintax && !empty($content)) {
                $content = Broadcast::parseSpintax($content);
            }

            $result = $this->sendToChannel($channel, $recipientId, $content, $typingSimulation);

            $log->update([
                'status'   => $result['ok'] ? 'success' : 'failed',
                'response' => $result['response'],
                'sent_at'  => now(),
            ]);

            $channel->update(['last_used_at' => now()]);
            event(new BroadcastStatusUpdated($this->broadcast, $log));

            if ($result['ok']) {
                $sentCount++;
            } else {
                $failedCount++;
                // Back-off ekstra jika ada error (429, rate limit, dsb)
                $responseData = $result['response'];
                $errorMsg     = is_array($responseData) ? ($responseData['error'] ?? '') : (string) $responseData;
                if (str_contains(strtolower($errorMsg), 'rate') || str_contains(strtolower($errorMsg), '429')) {
                    Log::warning("[Broadcast #{$this->broadcast->id}] Rate limit detected, back-off 60s");
                    sleep(60);
                }
            }
        }

        $allFailed = BroadcastLog::where('broadcast_id', $this->broadcast->id)
            ->where('status', 'success')
            ->doesntExist();

        $this->broadcast->update([
            'status'  => $allFailed ? 'failed' : 'sent',
            'sent_at' => now(),
        ]);

        Log::info("[Broadcast #{$this->broadcast->id}] Selesai: sent={$sentCount} failed={$failedCount}");

        // ── Auto-schedule recurring ───────────────────────────────────────────
        if (in_array($this->broadcast->recurring, ['daily', 'weekly', 'monthly'])) {
            $this->scheduleNextOccurrence($this->broadcast);
        }
    }

    /**
     * Clone dan jadwalkan occurrence berikutnya untuk broadcast recurring.
     */
    private function scheduleNextOccurrence(Broadcast $broadcast): void
    {
        $baseDate        = $broadcast->scheduled_at ?? $broadcast->created_at ?? now();
        $nextScheduledAt = \Carbon\Carbon::parse($baseDate);

        while ($nextScheduledAt->isPast()) {
            match ($broadcast->recurring) {
                'daily'   => $nextScheduledAt->addDay(),
                'weekly'  => $nextScheduledAt->addWeek(),
                'monthly' => $nextScheduledAt->addMonth(),
                default   => null,
            };
        }

        $nextBroadcast = Broadcast::create([
            'user_id'             => $broadcast->user_id,
            'title'               => $broadcast->title,
            'content'             => $broadcast->content,
            'media_url'           => $broadcast->media_url,
            'media_type'          => $broadcast->media_type,
            'scheduled_at'        => $nextScheduledAt,
            'recurring'           => $broadcast->recurring,
            'status'              => 'scheduled',
            'delay_min'           => $broadcast->delay_min,
            'delay_max'           => $broadcast->delay_max,
            'chunk_size'          => $broadcast->chunk_size,
            'chunk_delay_min'     => $broadcast->chunk_delay_min,
            'chunk_delay_max'     => $broadcast->chunk_delay_max,
            'spintax_enabled'     => $broadcast->spintax_enabled,
            'shuffle_recipients'  => $broadcast->shuffle_recipients,
            'typing_simulation'   => $broadcast->typing_simulation,
            'auto_tag_members'    => $broadcast->auto_tag_members,
        ]);

        foreach ($broadcast->targets as $target) {
            \App\Models\BroadcastTarget::create([
                'broadcast_id' => $nextBroadcast->id,
                'channel_id'   => $target->channel_id,
                'recipients'   => $target->recipients,
            ]);
        }
    }

    /**
     * Replace dynamic placeholders ({{name}}, {{nama}}, {{phone}}, ...) in the
     * message body with the recipient's resolved details. Unknown placeholders
     * are left untouched. Matching is case-insensitive and tolerant of spaces,
     * e.g. {{ Name }}.
     */
    private function personalize(string $content, $channel, ?string $recipientId): string
    {
        if ($content === '' || !str_contains($content, '{{')) {
            return $content;
        }

        $name  = $this->resolveRecipientName($channel, $recipientId);
        $phone = $recipientId ? explode('@', $recipientId)[0] : '';

        $vars = [
            'name'   => $name,
            'nama'   => $name,
            'phone'  => $phone,
            'number' => $phone,
            'nomor'  => $phone,
            // Billing placeholders are only populated when sending via the API
            // with a data payload. On manual dashboard broadcasts there is no
            // source for them, so blank them out instead of leaking the literal
            // "{{tagihan}}" text to recipients (matches the in-app variable help).
            'tagihan'  => '',
            'tanggal'  => '',
            'link'     => '',
            'username' => '',
        ];

        return preg_replace_callback('/\{\{\s*([a-zA-Z_]+)\s*\}\}/', function ($m) use ($vars) {
            $key = strtolower($m[1]);
            return array_key_exists($key, $vars) ? $vars[$key] : $m[0];
        }, $content);
    }

    /**
     * Best-effort lookup of a recipient's display name from the channel's
     * synced contacts/groups (handles LID → phone JID resolution). Returns an
     * empty string when no name is known.
     */
    private function resolveRecipientName($channel, ?string $recipientId): string
    {
        if (!$recipientId || !$channel) {
            return '';
        }

        $synced   = $channel->synced_data ?? [];
        $lidMap   = $synced['lidMap'] ?? [];
        $contacts = $synced['contacts'] ?? [];
        $key      = explode('@', $recipientId)[0];

        // Resolve a LID to its phone JID if we have a mapping.
        $resolved    = $lidMap[$recipientId] ?? $lidMap[$key] ?? null;
        $resolvedKey = $resolved ? explode('@', $resolved)[0] : null;

        foreach ($contacts as $contact) {
            $cid = $contact['id'] ?? '';
            if ($cid === $recipientId || $cid === $key
                || ($resolved && ($cid === $resolved || $cid === $resolvedKey))) {
                $name = trim($contact['name'] ?? '');
                if ($name !== '') {
                    return $name;
                }
            }
        }

        foreach (($synced['groups'] ?? []) as $group) {
            if (($group['id'] ?? '') === $recipientId || ($group['id'] ?? '') === $key) {
                return trim($group['name'] ?? $group['subject'] ?? '');
            }
        }

        return '';
    }

    private function sendToChannel($channel, ?string $recipientId, string $content, bool $typingSimulation = true): array
    {
        $mediaUrl  = $this->broadcast->media_url;
        $mediaType = $this->broadcast->media_type;

        $mentions    = null;
        $autoTag     = $this->broadcast->auto_tag_members;
        $isEnabled   = false;
        $tagMode     = 'all';
        $customMembers = [];

        if ($channel->platform === 'whatsapp' && $recipientId && str_ends_with($recipientId, '@g.us')) {
            if (is_bool($autoTag) && $autoTag) {
                $isEnabled = true;
            } elseif (is_array($autoTag)) {
                if (isset($autoTag['enabled']) && $autoTag['enabled']) {
                    $isEnabled = true;
                }
                if (isset($autoTag[$recipientId])) {
                    $groupConf   = $autoTag[$recipientId];
                    $isEnabled   = $groupConf['enabled'] ?? true;
                    $tagMode     = $groupConf['mode']    ?? 'all';
                    $customMembers = $groupConf['custom_members'] ?? [];
                }
            }
        }

        if ($isEnabled) {
            $groupMetadata = app(WhatsAppService::class)->getGroupMetadata($channel, $recipientId);
            if ($groupMetadata && isset($groupMetadata['participants'])) {
                $participants      = $groupMetadata['participants'];
                $targetParticipants = [];

                foreach ($participants as $p) {
                    if ($tagMode === 'all') {
                        $targetParticipants[] = $p['id'];
                    } elseif ($tagMode === 'admin') {
                        if (!empty($p['admin'])) {
                            $targetParticipants[] = $p['id'];
                        }
                    } elseif ($tagMode === 'custom') {
                        $pId    = $p['id'];
                        $pPhone = explode('@', $pId)[0];
                        foreach ($customMembers as $cm) {
                            $cmPhone = explode('@', $cm)[0];
                            if ($cm === $pId || $cmPhone === $pPhone) {
                                $targetParticipants[] = $pId;
                                break;
                            }
                        }
                    }
                }
                $mentions = $targetParticipants;
            }
        }

        // Status broadcast: terapkan blacklist privasi device dan buat statusJidList
        $statusExclude = null;
        $statusJidList = null;
        if ($recipientId === 'status@broadcast') {
            $blacklist = $channel->status_blacklist ?? [];
            if (!empty($blacklist)) {
                $statusExclude = array_values($blacklist);
            }
            $statusJidList = $this->buildStatusJidList($channel);
        }

        return match ($channel->platform) {
            'whatsapp' => app(WhatsAppService::class)->send(
                $channel, $content, $mediaUrl, $mediaType, $recipientId,
                $statusJidList, $mentions, $statusExclude, $typingSimulation
            ),
            'telegram' => $this->sendTelegram($channel, $content),
            default    => ['ok' => false, 'response' => ['error' => "Platform {$channel->platform} not yet supported"]],
        };
    }

    private function sendTelegram($channel, string $content = ''): array
    {
        $token  = $channel->credentials['bot_token'] ?? '';
        $chatId = $channel->target_id;

        $response = \Illuminate\Support\Facades\Http::post(
            "https://api.telegram.org/bot{$token}/sendMessage",
            ['chat_id' => $chatId, 'text' => $content]
        );

        return [
            'ok'       => $response->successful() && $response->json('ok'),
            'response' => $response->json(),
        ];
    }

    /**
     * Rebuild statusJidList based on contacts and chats synced in the channel.
     */
    private function buildStatusJidList($channel): array
    {
        $synced = $channel->synced_data ?? [];
        $contacts = $synced['contacts'] ?? [];
        $chats = $synced['chats'] ?? [];
        $lidMap = $synced['lidMap'] ?? [];

        $jidSet = [];

        foreach ($contacts as $c) {
            $jid = $c['id'] ?? $c['jid'] ?? null;
            if ($jid) {
                if (str_ends_with($jid, '@lid') && isset($lidMap[$jid])) {
                    $jid = $lidMap[$jid];
                }
                if (str_ends_with($jid, '@s.whatsapp.net')) {
                    $jidSet[$jid] = true;
                }
            }
        }

        foreach ($chats as $ch) {
            $jid = $ch['id'] ?? null;
            if ($jid) {
                if (str_ends_with($jid, '@lid') && isset($lidMap[$jid])) {
                    $jid = $lidMap[$jid];
                }
                if (str_ends_with($jid, '@s.whatsapp.net')) {
                    $jidSet[$jid] = true;
                }
            }
        }

        return array_keys($jidSet);
    }
}
