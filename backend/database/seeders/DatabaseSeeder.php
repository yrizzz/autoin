<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        $demo = User::factory()->create([
            'name' => 'Demo User',
            'email' => 'demo@autoin.dev',
            'google_id' => 'demo',
        ]);
        $demo->subscription()->create([
            'plan' => 'free',
            'started_at' => now(),
        ]);

        $admin = User::factory()->create([
            'name' => 'Aris Edy Handoko',
            'email' => 'Arisedyhandoko@gmail.com',
            'google_id' => 'admin_google_sso_id_123',
        ]);
        $admin->subscription()->create([
            'plan' => 'yearly',
            'started_at' => now(),
            'expires_at' => now()->addYear(),
        ]);
    }
}
