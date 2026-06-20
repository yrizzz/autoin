<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('broadcast_targets', function (Blueprint $table) {
            $table->json('recipients')->nullable()->after('channel_id');
        });

        Schema::table('broadcast_logs', function (Blueprint $table) {
            $table->string('recipient_id')->nullable()->after('channel_id');
        });

        // SQLite doesn't enforce enum values, so 'cancelled' is already accepted.
        // On MySQL: ALTER TABLE broadcasts MODIFY status ENUM(...,'cancelled') DEFAULT 'draft'
    }

    public function down(): void
    {
        Schema::table('broadcast_targets', function (Blueprint $table) {
            $table->dropColumn('recipients');
        });

        Schema::table('broadcast_logs', function (Blueprint $table) {
            $table->dropColumn('recipient_id');
        });
    }
};
