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
        Schema::table('users', function (Blueprint $table) {
            // Avatar bawaan dari Google, disimpan terpisah agar bisa dikembalikan
            // walau user sudah mengganti avatar dengan upload sendiri.
            $table->string('google_avatar')->nullable()->after('avatar');
        });

        // Isi google_avatar untuk akun lama: anggap avatar saat ini = avatar Google.
        Schema::hasColumn('users', 'avatar') && \DB::table('users')
            ->whereNull('google_avatar')
            ->whereNotNull('avatar')
            ->update(['google_avatar' => \DB::raw('avatar')]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('google_avatar');
        });
    }
};
