<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('channels', function (Blueprint $table) {
            $table->json('chatbot_settings')->nullable()->after('status_blacklist');
        });

        Schema::table('chatbot_rules', function (Blueprint $table) {
            $table->foreignId('channel_id')->nullable()->after('user_id')->constrained()->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('chatbot_rules', function (Blueprint $table) {
            $table->dropForeign(['channel_id']);
            $table->dropColumn('channel_id');
        });

        Schema::table('channels', function (Blueprint $table) {
            $table->dropColumn('chatbot_settings');
        });
    }
};
