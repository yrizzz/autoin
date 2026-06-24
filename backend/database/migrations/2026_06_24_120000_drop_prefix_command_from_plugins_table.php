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
        Schema::table('plugins', function (Blueprint $table) {
            // Index ['user_id','command'] memakai kolom command -> drop dulu.
            $table->dropIndex(['user_id', 'command']);
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
    }
};
