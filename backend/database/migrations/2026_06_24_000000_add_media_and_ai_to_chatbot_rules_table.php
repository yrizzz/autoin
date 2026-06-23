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
        Schema::table('chatbot_rules', function (Blueprint $table) {
            $table->string('media_url')->nullable()->after('reply');
            $table->string('media_type')->nullable()->after('media_url');
            $table->boolean('is_ai')->default(false)->after('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('chatbot_rules', function (Blueprint $table) {
            $table->dropColumn(['media_url', 'media_type', 'is_ai']);
        });
    }
};
