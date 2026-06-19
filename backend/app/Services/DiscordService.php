<?php

namespace App\Services;

use App\Models\Channel;
use Illuminate\Support\Facades\Http;

class DiscordService
{
    public function send(Channel $channel, string $content, ?string $mediaUrl = null): array
    {
        $credentials  = $channel->credentials;
        $webhookUrl   = $credentials['webhook_url'];

        $payload = ['content' => $content];

        if ($mediaUrl) {
            $mediaUrls = [];
            $decoded = json_decode($mediaUrl, true);
            if (is_array($decoded)) {
                $mediaUrls = $decoded;
            } elseif (str_contains($mediaUrl, ',')) {
                $mediaUrls = array_filter(array_map('trim', explode(',', $mediaUrl)));
            } else {
                $mediaUrls = [trim($mediaUrl)];
            }

            if (!empty($mediaUrls)) {
                $payload['embeds'] = [];
                foreach ($mediaUrls as $url) {
                    $payload['embeds'][] = [
                        'image' => ['url' => $url],
                    ];
                }
            }
        }

        $response = Http::post($webhookUrl, $payload);

        return [
            'ok'       => $response->successful(),
            'response' => $response->status() === 204 ? ['status' => 'sent'] : $response->json(),
        ];
    }

    public function test(Channel $channel): bool
    {
        $credentials = $channel->credentials;
        $webhookUrl  = $credentials['webhook_url'];

        $response = Http::get($webhookUrl);
        return $response->successful();
    }
}
