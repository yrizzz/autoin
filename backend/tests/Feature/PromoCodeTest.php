<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\PromoCode;
use App\Models\PromoCodeUsage;
use App\Models\Subscription;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PromoCodeTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_manage_promo_codes()
    {
        $admin = User::factory()->create(['email' => 'Arisedyhandoko@gmail.com']);
        $user = User::factory()->create(['email' => 'user@example.com']);

        // Check unauthorized user cannot access
        $this->actingAs($user, 'api')
            ->getJson('/api/admin/promo-codes')
            ->assertStatus(403);

        // Admin create promo code
        $this->actingAs($admin, 'api')
            ->postJson('/api/admin/promo-codes', [
                'code' => 'PROMO30',
                'type' => 'free_sub',
                'value' => 30,
                'max_uses' => 5,
            ])
            ->assertStatus(200)
            ->assertJsonPath('promo_code.code', 'PROMO30');

        $promo = PromoCode::where('code', 'PROMO30')->first();
        $this->assertNotNull($promo);
        $this->assertTrue($promo->is_active);

        // Admin toggle status
        $this->actingAs($admin, 'api')
            ->postJson("/api/admin/promo-codes/{$promo->id}/toggle")
            ->assertStatus(200);

        $promo->refresh();
        $this->assertFalse($promo->is_active);

        // Admin toggle back to active
        $promo->is_active = true;
        $promo->save();

        // Check listing
        $this->actingAs($admin, 'api')
            ->getJson('/api/admin/promo-codes')
            ->assertStatus(200)
            ->assertJsonFragment(['code' => 'PROMO30']);

        // Admin delete
        $this->actingAs($admin, 'api')
            ->deleteJson("/api/admin/promo-codes/{$promo->id}")
            ->assertStatus(200);

        $this->assertDatabaseMissing('promo_codes', ['id' => $promo->id]);
    }

    public function test_user_can_redeem_free_sub_code()
    {
        $user = User::factory()->create();
        
        $promo = PromoCode::create([
            'code' => 'FREE30DAYS',
            'type' => 'free_sub',
            'value' => 30,
            'max_uses' => 10,
        ]);

        // Redeem promo code
        $this->actingAs($user, 'api')
            ->postJson('/api/billing/promo/redeem', [
                'code' => 'FREE30DAYS'
            ])
            ->assertStatus(200);

        $this->assertDatabaseHas('subscriptions', [
            'user_id' => $user->id,
            'plan' => 'monthly',
            'payment_id' => 'PROMO-FREE30DAYS'
        ]);

        $this->assertDatabaseHas('promo_code_usages', [
            'promo_code_id' => $promo->id,
            'user_id' => $user->id,
        ]);

        $promo->refresh();
        $this->assertEquals(1, $promo->uses_count);

        // Cannot redeem same code twice
        $this->actingAs($user, 'api')
            ->postJson('/api/billing/promo/redeem', [
                'code' => 'FREE30DAYS'
            ])
            ->assertStatus(400)
            ->assertJsonPath('error', 'already_used');
    }
}
