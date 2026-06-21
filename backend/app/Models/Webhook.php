<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Webhook extends Model
{
    protected $fillable = ['user_id', 'name', 'uuid', 'platform', 'secret_token', 'is_active', 'last_triggered_at'];

    protected function casts(): array
    {
        return [
            'is_active'          => 'boolean',
            'last_triggered_at'  => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $model) {
            $model->uuid         = $model->uuid         ?? (string) Str::uuid();
            $model->secret_token = $model->secret_token ?? 'whsec_' . Str::random(32);
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function getUrlAttribute(): string
    {
        return url("/api/webhooks/trigger/{$this->uuid}");
    }
}
