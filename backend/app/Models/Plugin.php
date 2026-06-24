<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Plugin extends Model
{
    protected $fillable = [
        'user_id', 'name', 'prefix', 'command', 'description',
        'usage', 'code', 'is_active', 'timeout_ms', 'last_error', 'last_run_at',
    ];

    protected function casts(): array
    {
        return [
            'is_active'   => 'boolean',
            'timeout_ms'  => 'integer',
            'last_run_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Command-style matcher: text harus diawali prefix+command, diikuti spasi/akhir.
     * Mengembalikan ['args' => [...], 'raw_args' => '...'] atau null kalau tidak cocok.
     */
    public function matchCommand(string $text): ?array
    {
        if (!$this->is_active) {
            return null;
        }

        $t      = ltrim($text);
        $prefix = $this->prefix ?: '.';

        if ($prefix !== '' && !str_starts_with($t, $prefix)) {
            return null;
        }

        $body  = $prefix !== '' ? substr($t, strlen($prefix)) : $t;
        $body  = ltrim($body);

        $parts = preg_split('/\s+/', $body, 2);
        $cmd   = $parts[0] ?? '';

        if (mb_strtolower($cmd) !== mb_strtolower(trim($this->command))) {
            return null;
        }

        $rawArgs = isset($parts[1]) ? trim($parts[1]) : '';
        $args    = $rawArgs === '' ? [] : preg_split('/\s+/', $rawArgs);

        return ['args' => $args, 'raw_args' => $rawArgs];
    }
}
