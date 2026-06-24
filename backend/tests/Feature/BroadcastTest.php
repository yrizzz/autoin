<?php

namespace Tests\Feature;

use App\Models\Channel;
use App\Models\User;
use App\Models\Broadcast;
use App\Models\BroadcastLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BroadcastTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_and_send_broadcast_successfully(): void
    {
        // 1. Get or create the demo user
        $user = User::firstOrCreate(
            ['email' => 'demo@autoin.dev'],
            [
                'name'        => 'Demo User',
                'google_id'   => 'demo',
                'avatar'      => null,
            ]
        );

        // 2. Create a channel
        $channel = Channel::create([
            'user_id'     => $user->id,
            'name'        => 'My Telegram Channel',
            'platform'    => 'telegram',
            'credentials' => [
                'bot_token' => '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
            ],
            'target_id'   => '@my_test_chat_id',
            'status'      => 'active',
        ]);

        // 3. Authenticate as the user with API guard
        $this->actingAs($user, 'api');

        // 4. Create the broadcast
        $response = $this->postJson('/api/broadcasts', [
            'title'       => 'Promo Weekend',
            'content'     => 'Diskon 50% untuk seluruh produk!',
            'channel_ids' => [$channel->id],
        ]);

        $response->assertStatus(201);
        $broadcastId = $response->json('id');

        $this->assertDatabaseHas('broadcasts', [
            'id'      => $broadcastId,
            'title'   => 'Promo Weekend',
            'status'  => 'draft',
        ]);

        // Mock Telegram HTTP request
        \Illuminate\Support\Facades\Http::fake([
            'https://api.telegram.org/*' => \Illuminate\Support\Facades\Http::response(['ok' => true, 'result' => []], 200),
        ]);

        // 5. Send the broadcast (it will run synchronously because QUEUE_CONNECTION=sync)
        $sendResponse = $this->postJson("/api/broadcasts/{$broadcastId}/send");

        $sendResponse->assertStatus(200);
        $sendResponse->assertJson(['status' => 'queued']);

        // 6. Verify that it was sent and logged
        $this->assertDatabaseHas('broadcasts', [
            'id'     => $broadcastId,
            'status' => 'sent',
        ]);

        $this->assertDatabaseHas('broadcast_logs', [
            'broadcast_id' => $broadcastId,
            'channel_id'   => $channel->id,
            'status'       => 'success',
        ]);
    }

    public function test_can_send_broadcast_with_aliases_and_media(): void
    {
        $user = User::factory()->create();

        $channel = Channel::create([
            'user_id'     => $user->id,
            'name'        => 'My WA Channel',
            'platform'    => 'whatsapp',
            'credentials' => [
                'session_id' => 'wa_session_123',
            ],
            'target_id'   => '6281234567890@c.us',
            'status'      => 'active',
        ]);

        // Mock Baileys/WhatsApp Node service request
        \Illuminate\Support\Facades\Http::fake([
            'http://localhost:3001/*' => \Illuminate\Support\Facades\Http::response(['ok' => true, 'message' => 'sent'], 200),
        ]);

        $this->actingAs($user, 'api');

        // Post with Developer API aliases and media
        $response = $this->postJson('/api/broadcasts', [
            'title'      => 'Promo Image API',
            'message'    => 'Lihat promo spesial kami!',
            'channel_id' => $channel->id,
            'mediaUrl'   => 'https://example.com/promo.jpg',
            'mediaType'  => 'image',
            'recipients' => ['6281234567890'],
            'send_now'   => true, // Trigger immediate send
        ]);

        $response->assertStatus(201);
        $broadcastId = $response->json('id');

        // Verify broadcast was created with mapped content & media
        $this->assertDatabaseHas('broadcasts', [
            'id'        => $broadcastId,
            'content'   => 'Lihat promo spesial kami!',
            'media_url' => 'https://example.com/promo.jpg',
            'media_type'=> 'image',
            'status'    => 'sent', // Auto-sent because of send_now
        ]);

        // Verify broadcast logs
        $this->assertDatabaseHas('broadcast_logs', [
            'broadcast_id' => $broadcastId,
            'channel_id'   => $channel->id,
            'recipient_id' => '6281234567890',
            'status'       => 'success',
        ]);
    }
}
