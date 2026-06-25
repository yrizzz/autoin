<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Plugin extends Model
{
    protected $fillable = [
        'user_id', 'name', 'description',
        'usage', 'code', 'is_active', 'is_public', 'timeout_ms', 'last_error', 'last_run_at',
    ];

    protected function casts(): array
    {
        return [
            'is_active'   => 'boolean',
            'is_public'   => 'boolean',
            'timeout_ms'  => 'integer',
            'last_run_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
