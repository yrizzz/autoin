<?php

namespace Tests\Feature;

use App\Jobs\SendBroadcastJob;
use App\Models\Channel;
use App\Models\User;
use App\Models\Broadcast;
use App\Models\BroadcastLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class BroadcastTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_and_send_broadcast_successfully(): void
    {
        // Fake queue agar job tidak benar-benar dijalankan (avoid exec() background)
        Queue::fake();

        // 1. Get or create the demo user
        $user = User::firstOrCreate(
            ['email' => 'demo@autoin.dev'],
            [
                'name'      => 'Demo User',
                'google_id' => 'demo',
                'avatar'    => null,
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
            'id'     => $broadcastId,
            'title'  => 'Promo Weekend',
            'status' => 'draft',
        ]);

        // 5. Send the broadcast (queued)
        $sendResponse = $this->postJson("/api/broadcasts/{$broadcastId}/send");

        $sendResponse->assertStatus(200);
        $sendResponse->assertJson(['status' => 'scheduled']);

        // 6. Verify status is 'scheduled'
        $this->assertDatabaseHas('broadcasts', [
            'id'     => $broadcastId,
            'status' => 'scheduled',
        ]);

        // Manually run BroadcastService send to transition to queued and create logs
        app(\App\Services\BroadcastService::class)->send(Broadcast::find($broadcastId));

        // Now verify status is 'queued' and logs are created
        $this->assertDatabaseHas('broadcasts', [
            'id'     => $broadcastId,
            'status' => 'queued',
        ]);

        // Logs dibuat oleh BroadcastService::send()
        $this->assertDatabaseHas('broadcast_logs', [
            'broadcast_id' => $broadcastId,
            'channel_id'   => $channel->id,
            'status'       => 'pending',
        ]);
    }

    public function test_can_send_broadcast_with_aliases_and_media(): void
    {
        Queue::fake();

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

        $this->actingAs($user, 'api');

        // Post with Developer API aliases and media
        $response = $this->postJson('/api/broadcasts', [
            'title'      => 'Promo Image API',
            'message'    => 'Lihat promo spesial kami!',
            'channel_id' => $channel->id,
            'mediaUrl'   => 'https://example.com/promo.jpg',
            'mediaType'  => 'image',
            'recipients' => ['6281234567890'],
            'send_now'   => true,
        ]);

        $response->assertStatus(201);
        $broadcastId = $response->json('id');

        // Verify broadcast was created with mapped content & media
        $this->assertDatabaseHas('broadcasts', [
            'id'        => $broadcastId,
            'content'   => 'Lihat promo spesial kami!',
            'media_url' => 'https://example.com/promo.jpg',
            'media_type'=> 'image',
            'status'    => 'scheduled', // scheduled because send_now=true
        ]);

        // Manually run BroadcastService send to transition to queued and create logs
        app(\App\Services\BroadcastService::class)->send(Broadcast::find($broadcastId));

        // Verify broadcast log was created
        $this->assertDatabaseHas('broadcast_logs', [
            'broadcast_id' => $broadcastId,
            'channel_id'   => $channel->id,
            'recipient_id' => '6281234567890',
            'status'       => 'pending',
        ]);
    }

    public function test_spintax_parsing(): void
    {
        $text   = '{Halo|Selamat pagi|Halo} Bapak/Ibu, ada {penawaran|informasi} {menarik|penting} dari kami.';
        $result = Broadcast::parseSpintax($text);

        // Must NOT contain any curly braces after parsing
        $this->assertStringNotContainsString('{', $result);
        $this->assertStringNotContainsString('}', $result);

        // Tidak boleh ada pipe '|' tersisa
        $this->assertStringNotContainsString('|', $result);

        // Hasil harus string non-kosong
        $this->assertNotEmpty($result);
    }

    public function test_cancel_sending_broadcast_sets_cancel_flag(): void
    {
        Queue::fake();

        $user    = User::factory()->create();
        $channel = Channel::create([
            'user_id'     => $user->id,
            'name'        => 'WA Test',
            'platform'    => 'whatsapp',
            'credentials' => ['session_id' => 'test_sess'],
            'target_id'   => '62812@c.us',
            'status'      => 'active',
        ]);

        $broadcast = Broadcast::create([
            'user_id' => $user->id,
            'title'   => 'Running Test',
            'content' => 'Test',
            'status'  => 'sending',
        ]);

        $this->actingAs($user, 'api');
        $response = $this->postJson("/api/broadcasts/{$broadcast->id}/cancel");

        $response->assertStatus(200);
        $response->assertJson(['status' => 'cancel_requested']);

        $this->assertDatabaseHas('broadcasts', [
            'id'               => $broadcast->id,
            'cancel_requested' => 1,
        ]);
    }

    public function test_can_update_broadcast_channels_and_recipients(): void
    {
        $user = User::factory()->create();
        $channel1 = Channel::create([
            'user_id'     => $user->id,
            'name'        => 'Channel 1',
            'platform'    => 'whatsapp',
            'credentials' => ['session_id' => 'sess1'],
            'target_id'   => '1@c.us',
            'status'      => 'active',
        ]);
        $channel2 = Channel::create([
            'user_id'     => $user->id,
            'name'        => 'Channel 2',
            'platform'    => 'whatsapp',
            'credentials' => ['session_id' => 'sess2'],
            'target_id'   => '2@c.us',
            'status'      => 'active',
        ]);

        $broadcast = Broadcast::create([
            'user_id' => $user->id,
            'title'   => 'Original Title',
            'content' => 'Original Content',
            'status'  => 'draft',
        ]);

        // Add initial target
        \App\Models\BroadcastTarget::create([
            'broadcast_id' => $broadcast->id,
            'channel_id'   => $channel1->id,
            'recipients'   => ['123@s.whatsapp.net'],
        ]);

        $this->actingAs($user, 'api');

        // Update title, content, target channels, and recipients
        $response = $this->putJson("/api/broadcasts/{$broadcast->id}", [
            'title'            => 'Updated Title',
            'content'          => 'Updated Content',
            'channel_ids'      => [$channel2->id],
            'recipients'       => [
                $channel2->id  => ['456@s.whatsapp.net', '789@s.whatsapp.net'],
            ],
        ]);

        $response->assertStatus(200);

        // Assert broadcast updated
        $this->assertDatabaseHas('broadcasts', [
            'id'      => $broadcast->id,
            'title'   => 'Updated Title',
            'content' => 'Updated Content',
        ]);

        // Assert old target deleted
        $this->assertDatabaseMissing('broadcast_targets', [
            'broadcast_id' => $broadcast->id,
            'channel_id'   => $channel1->id,
        ]);

        // Assert new target added
        $this->assertDatabaseHas('broadcast_targets', [
            'broadcast_id' => $broadcast->id,
            'channel_id'   => $channel2->id,
        ]);

        $target = \App\Models\BroadcastTarget::where('broadcast_id', $broadcast->id)
            ->where('channel_id', $channel2->id)
            ->first();

        $this->assertNotNull($target);
        $this->assertEquals(['456@s.whatsapp.net', '789@s.whatsapp.net'], $target->recipients);
    }
}
