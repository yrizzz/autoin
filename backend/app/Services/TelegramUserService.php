<?php

namespace App\Services;

use App\Models\Channel;
use Illuminate\Support\Facades\Http;

class TelegramUserService
{
    private string $baseUrl;
    private string $secret;

    public function __construct()
    {
        $this->baseUrl = config('services.telegram.url', 'http://localhost:3002');
        $this->secret  = config('services.telegram.secret', 'autoin-tg-secret');
    }

    public function startLogin(string $sessionId, string $phoneNumber): array
    {
        $response = Http::timeout(25)
            ->withHeader('x-api-secret', $this->secret)
            ->post("{$this->baseUrl}/sessions/{$sessionId}", [
                'phoneNumber' => $phoneNumber,
            ]);

        return $response->json() ?? ['status' => 'error'];
    }

    public function verifyCode(string $sessionId, string $code): array
    {
        $response = Http::withHeader('x-api-secret', $this->secret)
            ->post("{$this->baseUrl}/sessions/{$sessionId}/verify", [
                'code' => $code,
            ]);

        return $response->json() ?? ['status' => 'error'];
    }

    public function verify2FA(string $sessionId, string $password): array
    {
        $response = Http::withHeader('x-api-secret', $this->secret)
            ->post("{$this->baseUrl}/sessions/{$sessionId}/verify-2fa", [
                'password' => $password,
            ]);

        return $response->json() ?? ['status' => 'error'];
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

    public function send(Channel $channel, string $content, ?string $mediaUrl = null, ?string $recipientId = null): array
    {
        $credentials = $channel->credentials;
        $sessionId   = $credentials['session_id'];
        $to          = $recipientId ?? $channel->target_id;

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
                    'to'      => $to,
                    'message' => $content,
                ]);
        } else {
            // Kirim gambar pertama dengan caption
            $response = Http::withHeader('x-api-secret', $this->secret)
                ->post("{$this->baseUrl}/sessions/{$sessionId}/send", [
                    'to'       => $to,
                    'message'  => $content,
                    'mediaUrl' => $mediaUrls[0],
                ]);

            // Kirim gambar sisanya tanpa caption
            for ($i = 1; $i < count($mediaUrls); $i++) {
                Http::withHeader('x-api-secret', $this->secret)
                    ->post("{$this->baseUrl}/sessions/{$sessionId}/send", [
                        'to'       => $to,
                        'message'  => '',
                        'mediaUrl' => $mediaUrls[$i],
                    ]);
            }
        }

        return [
            'ok'       => $response->successful() && $response->json('ok'),
            'response' => $response->json(),
        ];
    }

    public function test(Channel $channel): bool
    {
        $credentials = $channel->credentials;
        $statusData  = $this->getStatus($credentials['session_id']);

        return ($statusData['status'] ?? '') === 'connected';
    }
}
