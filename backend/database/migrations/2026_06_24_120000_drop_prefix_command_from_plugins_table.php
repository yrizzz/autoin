<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Plugin sekarang HANYA menyediakan script. Pemicunya (prefix + trigger)
     * diatur di halaman Chatbot lewat chatbot_rules.{prefix,trigger,plugin_id}.
     * Jadi kolom prefix & command di plugins tidak dipakai lagi.
     */
    public function up(): void
    {
        // Index ['user_id','command'] juga dipakai FK user_id (kolom paling kiri),
        // jadi tak bisa di-drop sebelum ada index lain yang menutup user_id dulu.
        Schema::table('plugins', function (Blueprint $table) {
            $table->index('user_id');                  // penopang FK user_id
        });
        Schema::table('plugins', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'command']); // baru aman di-drop
            $table->dropColumn(['prefix', 'command']);
        });
    }

    public function down(): void
    {
        Schema::table('plugins', function (Blueprint $table) {
            $table->string('prefix')->default('.')->after('name');
            $table->string('command')->default('')->after('prefix');
            $table->index(['user_id', 'command']);
        });
        Schema::table('plugins', function (Blueprint $table) {
            $table->dropIndex(['user_id']);            // kembalikan ke kondisi semula
        });
    }
};
