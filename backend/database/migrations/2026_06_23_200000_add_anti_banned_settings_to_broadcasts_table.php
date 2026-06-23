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
        Schema::table('broadcasts', function (Blueprint $table) {
            $table->unsignedInteger('delay_min')->default(2)->after('recurring');
            $table->unsignedInteger('delay_max')->default(5)->after('delay_min');
            $table->unsignedInteger('chunk_size')->default(10)->after('delay_max');
            $table->unsignedInteger('chunk_delay_min')->default(10)->after('chunk_size');
            $table->unsignedInteger('chunk_delay_max')->default(20)->after('chunk_delay_min');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('broadcasts', function (Blueprint $table) {
            $table->dropColumn([
                'delay_min',
                'delay_max',
                'chunk_size',
                'chunk_delay_min',
                'chunk_delay_max'
            ]);
        });
    }
};
