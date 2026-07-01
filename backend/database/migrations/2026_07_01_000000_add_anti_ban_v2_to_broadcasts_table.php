<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('broadcasts', function (Blueprint $table) {
            // Spintax: variasi pesan otomatis agar tidak identik (anti-spam detection)
            $table->boolean('spintax_enabled')->default(false)->after('chunk_delay_max');
            // Shuffle: acak urutan penerima sebelum kirim agar pola tidak terdeteksi
            $table->boolean('shuffle_recipients')->default(true)->after('spintax_enabled');
            // Typing simulation: simulasi "sedang mengetik" sebelum kirim (Node.js level)
            $table->boolean('typing_simulation')->default(true)->after('shuffle_recipients');
            // Cancel flag: set true untuk menghentikan broadcast yang sedang berjalan
            $table->boolean('cancel_requested')->default(false)->after('typing_simulation');
        });
    }

    public function down(): void
    {
        Schema::table('broadcasts', function (Blueprint $table) {
            $table->dropColumn([
                'spintax_enabled',
                'shuffle_recipients',
                'typing_simulation',
                'cancel_requested',
            ]);
        });
    }
};
