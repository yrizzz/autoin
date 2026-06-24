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
        Schema::create('plugins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('prefix')->default('.');     // . / ! #
            $table->string('command');                  // keyword tanpa prefix, mis. "igprofile"
            $table->string('description')->nullable();
            $table->string('usage')->nullable();        // contoh pemakaian, mis. ".igprofile <username>"
            $table->longText('code');                   // body handler JS (sandboxed)
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('timeout_ms')->default(8000);
            $table->text('last_error')->nullable();
            $table->timestamp('last_run_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'command']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('plugins');
    }
};
