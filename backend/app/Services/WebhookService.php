<?php

namespace App\Services;

use App\Models\Channel;
use Illuminate\Support\Facades\Http;

class WebhookService
{
    public function send(Channel $channel, string $content, ?string $mediaUrl = null): array
    {
        $credentials = $channel->credentials;
        $webhookUrl  = $credentials['webhook_url'];
        $method      = strtolower($credentials['method'] ?? 'post');

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

        $payload = [
            'message'    => $content,
            'media_url'  => $mediaUrl,
            'media_urls' => $mediaUrls,
            'timestamp'  => now()->toISOString(),
        ];

        $response = Http::$method($webhookUrl, $payload);

        return [
            'ok'       => $response->successful(),
            'response' => $response->json() ?? ['status' => $response->status()],
        ];
    }

    public function test(Channel $channel): bool
    {
        $credentials = $channel->credentials;
        $webhookUrl  = $credentials['webhook_url'];

        $response = Http::post($webhookUrl, ['test' => true]);
        return $response->successful();
    }
}
