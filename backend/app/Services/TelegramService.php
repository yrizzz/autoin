<?php

namespace App\Services;

use App\Models\BroadcastLog;
use App\Models\Channel;
use Illuminate\Support\Facades\Http;

class TelegramService
{
    public function send(Channel $channel, string $content, ?string $mediaUrl = null, ?string $mediaType = null): array
    {
        $credentials = $channel->credentials;
        $botToken    = $credentials['bot_token'];
        $chatId      = $channel->target_id;

        $base = "https://api.telegram.org/bot{$botToken}";

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

        if (count($mediaUrls) > 1 && $mediaType === 'image') {
            $media = [];
            foreach ($mediaUrls as $idx => $url) {
                $media[] = [
                    'type' => 'photo',
                    'media' => $url,
                    'caption' => $idx === 0 ? $content : '',
                ];
            }
            $response = Http::post("{$base}/sendMediaGroup", [
                'chat_id' => $chatId,
                'media'   => $media,
            ]);
        } elseif (count($mediaUrls) === 1 && $mediaType === 'image') {
            $response = Http::post("{$base}/sendPhoto", [
                'chat_id' => $chatId,
                'photo'   => $mediaUrls[0],
                'caption' => $content,
            ]);
        } else {
            $response = Http::post("{$base}/sendMessage", [
                'chat_id'    => $chatId,
                'text'       => $content,
                'parse_mode' => 'HTML',
            ]);
        }

        return [
            'ok'       => $response->successful(),
            'response' => $response->json(),
        ];
    }

    public function test(Channel $channel): bool
    {
        $credentials = $channel->credentials;
        $botToken    = $credentials['bot_token'];

        $response = Http::get("https://api.telegram.org/bot{$botToken}/getMe");
        return $response->successful() && $response->json('ok');
    }
}
