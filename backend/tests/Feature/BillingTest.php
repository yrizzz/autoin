<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Subscription;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BillingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Create admin settings with mock Duitku keys
        $settingsPath = storage_path('app/admin_settings.json');
        if (!file_exists(dirname($settingsPath))) {
            mkdir(dirname($settingsPath), 0755, true);
        }
        file_put_contents($settingsPath, json_encode([
            'duitku_merchant_code' => 'D1234',
            'duitku_api_key' => 'mock_api_key_123',
            'duitku_sandbox' => true,
            'payment_gateway_enabled' => true,
        ]));
    }

    protected function tearDown(): void
    {
        $settingsPath = storage_path('app/admin_settings.json');
        if (file_exists($settingsPath)) {
            unlink($settingsPath);
        }
        parent::tearDown();
    }

    public function test_billing_config_returns_duitku_enabled()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'api')
            ->getJson('/api/billing/config');

        $response->assertStatus(200)
            ->assertJson([
                'duitku_enabled' => true
            ]);
    }

    public function test_duitku_callback_with_valid_signature_activates_subscription()
    {
        $user = User::factory()->create();

        $merchantCode = 'D1234';
        $amount = 25000;
        $merchantOrderId = 'user_' . $user->id . '_plan_monthly_' . time();
        $apiKey = 'mock_api_key_123';
        $reference = 'REF-12345';

        // MD5 signature: merchantCode + amount + merchantOrderId + apiKey
        $signature = md5($merchantCode . $amount . $merchantOrderId . $apiKey);

        $response = $this->postJson('/api/duitku/callback', [
            'merchantCode' => $merchantCode,
            'amount' => $amount,
            'merchantOrderId' => $merchantOrderId,
            'signature' => $signature,
            'reference' => $reference,
            'resultCode' => '00',
        ]);

        $response->assertStatus(200);
        $this->assertEquals('OK', $response->getContent());

        // Check if subscription was created/updated in the database
        $this->assertDatabaseHas('subscriptions', [
            'user_id' => $user->id,
            'plan' => 'monthly',
            'payment_id' => $reference,
        ]);
    }

    public function test_duitku_callback_with_invalid_signature_returns_400()
    {
        $user = User::factory()->create();

        $merchantCode = 'D1234';
        $amount = 25000;
        $merchantOrderId = 'user_' . $user->id . '_plan_monthly_' . time();
        $reference = 'REF-12345';
        $signature = 'invalid_signature_string';

        $response = $this->postJson('/api/duitku/callback', [
            'merchantCode' => $merchantCode,
            'amount' => $amount,
            'merchantOrderId' => $merchantOrderId,
            'signature' => $signature,
            'reference' => $reference,
            'resultCode' => '00',
        ]);

        $response->assertStatus(400);
        $this->assertEquals('Invalid signature', $response->getContent());
    }
}
