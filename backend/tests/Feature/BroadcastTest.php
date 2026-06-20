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
                'trial_count' => 5,
            ]
        );
        $user->update(['trial_count' => 5]);

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

        // 3. Authenticate as the user
        $this->actingAs($user);

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

        // 7. Verify trial quota was decremented
        $user->refresh();
        $this->assertEquals(4, $user->trial_count);
    }
}
