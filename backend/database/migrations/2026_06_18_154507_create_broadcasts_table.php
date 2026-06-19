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
        Schema::create('broadcasts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title')->nullable();
            $table->text('content');
            $table->text('media_url')->nullable();
            $table->enum('media_type', ['image','video','pdf','document'])->nullable();
            $table->enum('status', ['draft','queued','sending','sent','failed','scheduled'])->default('draft');
            $table->timestamp('scheduled_at')->nullable();
            $table->enum('recurring', ['none','daily','weekly','monthly'])->default('none');
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('broadcasts');
    }
};
