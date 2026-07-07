<?php

namespace App\Services;

use App\Models\Channel;
use Illuminate\Support\Facades\Http;

class WhatsAppService
{
    private string $baseUrl;
    private string $secret;

    public function __construct()
    {
        $this->baseUrl = config('services.whatsapp.url', 'http://localhost:3001');
        $this->secret  = config('services.whatsapp.secret', 'autoin-wa-secret');
    }

    public function send(Channel $channel, ?string $content = '', ?string $mediaUrl = null, ?string $mediaType = null, ?string $recipientId = null, ?array $statusJidList = null, ?array $mentions = null, ?array $statusExcludeJidList = null, bool $typingSimulation = false): array
    {
        $content = $content ?? '';
        $credentials = $channel->credentials;
        $sessionId   = $credentials['session_id'];
        $to          = $recipientId ?? $channel->target_id;
        $to          = $this->resolveJid($channel, $to);

        $mediaUrls = [];
        if ($mediaUrl) {
            $decoded = json_decode($mediaUrl, true);
            if (is_array($decoded)) {
                $mediaUrls = $decoded;
            } elseif (str_contains($mediaUrl, ',')) {
                $mediaUrls = array_filter(array_map('trim', explode(',', $mediaUrl)));
            } else {
                $mediaUrls = [trim($mediaUrl)];
            }
        }

        if (empty($mediaUrls)) {
            $payload = [
                'to'                => $to,
                'message'           => $content,
                'typingSimulation'  => $typingSimulation,
            ];
            if ($statusJidList !== null) {
                $payload['statusJidList'] = $statusJidList;
            }
            if ($statusExcludeJidList !== null) {
                $payload['statusExcludeJidList'] = $statusExcludeJidList;
            }
            if ($mentions !== null) {
                $payload['mentions'] = $mentions;
            }
            $response = Http::withHeader('x-api-secret', $this->secret)
                ->timeout(60)
                ->post("{$this->baseUrl}/sessions/{$sessionId}/send", $payload);
            return [
                'ok'       => $response->successful() && $response->json('ok'),
                'response' => $response->json(),
            ];
        }

        // Send first image with the caption/message
        $payload = [
            'to'               => $to,
            'message'          => $content,
            'mediaUrl'         => $mediaUrls[0],
            'mediaType'        => $mediaType,
            'typingSimulation' => $typingSimulation,
        ];
        if ($statusJidList !== null) {
            $payload['statusJidList'] = $statusJidList;
        }
        if ($statusExcludeJidList !== null) {
            $payload['statusExcludeJidList'] = $statusExcludeJidList;
        }
        if ($mentions !== null) {
            $payload['mentions'] = $mentions;
        }
        $response = Http::withHeader('x-api-secret', $this->secret)
            ->timeout(60)
            ->post("{$this->baseUrl}/sessions/{$sessionId}/send", $payload);

        $success      = $response->successful() && $response->json('ok');
        $lastResponse = $response->json();

        // Send remaining images without caption
        for ($i = 1; $i < count($mediaUrls); $i++) {
            $payload = [
                'to'        => $to,
                'message'   => '',
                'mediaUrl'  => $mediaUrls[$i],
                'mediaType' => $mediaType,
            ];
            if ($statusJidList !== null) {
                $payload['statusJidList'] = $statusJidList;
            }
            if ($statusExcludeJidList !== null) {
                $payload['statusExcludeJidList'] = $statusExcludeJidList;
            }
            Http::withHeader('x-api-secret', $this->secret)
                ->timeout(60)
                ->post("{$this->baseUrl}/sessions/{$sessionId}/send", $payload);
        }

        return [
            'ok'       => $success,
            'response' => $lastResponse,
        ];
    }

    public function getGroupMetadata(Channel $channel, string $groupId): ?array
    {
        $credentials = $channel->credentials;
        if (!$credentials || !isset($credentials['session_id'])) {
            return null;
        }

        try {
            $response = Http::withHeader('x-api-secret', $this->secret)
                ->get("{$this->baseUrl}/sessions/{$credentials['session_id']}/groups/" . urlencode($groupId));

            if ($response->successful()) {
                $metadata = $response->json('metadata');
                if ($metadata && isset($metadata['participants'])) {
                    $synced = $channel->synced_data ?? [];
                    $lidMap = $synced['lidMap'] ?? [];
                    $contacts = $synced['contacts'] ?? [];

                    $contactLookup = [];
                    foreach ($contacts as $contact) {
                        if (isset($contact['id'])) {
                            $contactLookup[$contact['id']] = $contact;
                        }
                    }

                    foreach ($metadata['participants'] as &$p) {
                        if (isset($p['id'])) {
                            $p['id'] = $this->resolveJid($channel, $p['id']);

                            if (empty($p['name']) || str_contains($p['name'], '@')) {
                                if (isset($contactLookup[$p['id']])) {
                                    $p['name'] = $contactLookup[$p['id']]['name'] ?? null;
                                }
                            }
                        }
                    }
                }
                return $metadata;
            }
        } catch (\Throwable $e) {
            // Ignore
        }

        return null;
    }

    /**
     * Resolve a JID ending with @lid to a phone JID ending with @s.whatsapp.net if mapped.
     * Otherwise, fallback to name-matching or return the JID as-is.
     */
    public function resolveJid(Channel $channel, ?string $jid): ?string
    {
        if (!$jid) {
            return null;
        }

        // Normalize raw phone numbers (digits, + prefix, e.g. +628123 or 08123)
        $clean = preg_replace('/\D/', '', $jid);
        if (preg_match('/^[0-9]{9,15}$/', $clean)) {
            if (str_starts_with($clean, '0')) {
                $clean = '62' . substr($clean, 1);
            }
            return $clean . '@s.whatsapp.net';
        }

        if (!str_ends_with($jid, '@lid')) {
            return $jid;
        }

        $synced = $channel->synced_data ?? [];
        $lidMap = $synced['lidMap'] ?? [];
        $key = explode('@', $jid)[0];

        // 1. Direct translation
        $resolved = $lidMap[$jid] ?? $lidMap[$key] ?? null;
        if ($resolved) {
            return str_contains($resolved, '@') ? $resolved : $resolved . '@s.whatsapp.net';
        }

        // 2. Name-matching fallback in contacts list
        $contacts = $synced['contacts'] ?? [];
        $searchName = null;

        // Find the name of the LID contact
        foreach ($contacts as $contact) {
            if (($contact['id'] ?? '') === $jid) {
                $searchName = strtolower(trim($contact['name'] ?? ''));
                break;
            }
        }

        if ($searchName !== null && $searchName !== '') {
            // Check if name itself is a phone number
            $cleanName = preg_replace('/\D/', '', $searchName);
            if (strlen($cleanName) >= 9 && strlen($cleanName) <= 15) {
                if (str_starts_with($cleanName, '0')) {
                    $cleanName = '62' . substr($cleanName, 1);
                }
                return $cleanName . '@s.whatsapp.net';
            }

            foreach ($contacts as $contact) {
                $cid = $contact['id'] ?? '';
                if (str_ends_with($cid, '@s.whatsapp.net') && strtolower(trim($contact['name'] ?? '')) === $searchName) {
                    return $cid;
                }
            }
        }

        return $jid;
    }

    public function createSession(string $sessionId, bool $usePairingCode = false, string $phoneNumber = ''): array
    {
        $response = Http::withHeader('x-api-secret', $this->secret)
            ->post("{$this->baseUrl}/sessions/{$sessionId}", [
                'usePairingCode' => $usePairingCode,
                'phoneNumber'    => $phoneNumber,
            ]);

        return $response->json() ?? [];
    }

    public function getQr(string $sessionId): ?string
    {
        $response = Http::withHeader('x-api-secret', $this->secret)
            ->get("{$this->baseUrl}/sessions/{$sessionId}/qr");

        return $response->successful() ? $response->json('qr') : null;
    }

    public function getStatus(string $sessionId): array
    {
        $response = Http::withHeader('x-api-secret', $this->secret)
            ->get("{$this->baseUrl}/sessions/{$sessionId}/status");

        return $response->successful() ? ($response->json() ?? []) : ['status' => 'unknown'];
    }

    public function deleteSession(string $sessionId): void
    {
        Http::withHeader('x-api-secret', $this->secret)
            ->delete("{$this->baseUrl}/sessions/{$sessionId}");
    }

    public function flushSession(string $sessionId): array
    {
        $response = Http::withHeader('x-api-secret', $this->secret)
            ->post("{$this->baseUrl}/sessions/{$sessionId}/flush");

        return $response->json() ?? [];
    }

    public function test(Channel $channel): bool
    {
        $credentials = $channel->credentials;
        $sessionId   = $credentials['session_id'];

        $statusData = $this->getStatus($sessionId);
        return ($statusData['status'] ?? '') === 'connected';
    }
}
