<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE broadcasts MODIFY COLUMN status ENUM('draft', 'queued', 'sending', 'sent', 'failed', 'scheduled', 'cancelled') NOT NULL DEFAULT 'draft'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE broadcasts MODIFY COLUMN status ENUM('draft', 'queued', 'sending', 'sent', 'failed', 'scheduled') NOT NULL DEFAULT 'draft'");
        }
    }
};
