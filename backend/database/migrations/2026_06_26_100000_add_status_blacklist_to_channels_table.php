<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Persistent "status privacy" blacklist per channel — the list of contact
     * numbers/JIDs that should NOT receive this device's WhatsApp Status,
     * mirroring WhatsApp's "My contacts except…" option.
     */
    public function up(): void
    {
        Schema::table('channels', function (Blueprint $table) {
            $table->json('status_blacklist')->nullable()->after('synced_data');
        });
    }

    public function down(): void
    {
        Schema::table('channels', function (Blueprint $table) {
            $table->dropColumn('status_blacklist');
        });
    }
};
