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
            $table->string('reply_type')->default('normal'); // normal | quote
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('chatbot_rules', function (Blueprint $table) {
            $table->dropColumn('reply_type');
        });
    }
};
