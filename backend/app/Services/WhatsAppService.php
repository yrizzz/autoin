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

    public function send(Channel $channel, string $content, ?string $mediaUrl = null, ?string $mediaType = null): array
    {
        $credentials = $channel->credentials;
        $sessionId   = $credentials['session_id'];
        $to          = $channel->target_id;

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
            $response = Http::withHeader('x-api-secret', $this->secret)
                ->post("{$this->baseUrl}/sessions/{$sessionId}/send", [
                    'to'        => $to,
                    'message'   => $content,
                ]);
            return [
                'ok'       => $response->successful() && $response->json('ok'),
                'response' => $response->json(),
            ];
        }

        // Send first image with the caption/message
        $response = Http::withHeader('x-api-secret', $this->secret)
            ->post("{$this->baseUrl}/sessions/{$sessionId}/send", [
                'to'        => $to,
                'message'   => $content,
                'mediaUrl'  => $mediaUrls[0],
                'mediaType' => $mediaType,
            ]);

        $success = $response->successful() && $response->json('ok');
        $lastResponse = $response->json();

        // Send remaining images without caption
        for ($i = 1; $i < count($mediaUrls); $i++) {
            Http::withHeader('x-api-secret', $this->secret)
                ->post("{$this->baseUrl}/sessions/{$sessionId}/send", [
                    'to'        => $to,
                    'message'   => '',
                    'mediaUrl'  => $mediaUrls[$i],
                    'mediaType' => $mediaType,
                ]);
        }

        return [
            'ok'       => $success,
            'response' => $lastResponse,
        ];
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

    public function test(Channel $channel): bool
    {
        $credentials = $channel->credentials;
        $sessionId   = $credentials['session_id'];

        $statusData = $this->getStatus($sessionId);
        return ($statusData['status'] ?? '') === 'connected';
    }
}
