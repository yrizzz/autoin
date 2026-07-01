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
        $sendResponse->assertJson(['status' => 'queued']);

        // 6. Verify status is 'queued' and broadcast_logs dibuat
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
            'status'    => 'queued', // queued because send_now=true
        ]);

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
}
