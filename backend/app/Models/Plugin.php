<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Plugin extends Model
{
    protected $fillable = [
        'user_id', 'name', 'description',
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
}
