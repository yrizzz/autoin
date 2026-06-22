<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Subscription extends Model
{
    protected $fillable = ['user_id', 'plan', 'started_at', 'expires_at', 'payment_id', 'promo_code', 'discount_amount', 'price_paid'];

    protected function casts(): array
    {
        return [
            'started_at'  => 'datetime',
            'expires_at'  => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function isActive(): bool
    {
        return $this->expires_at === null || $this->expires_at->isFuture();
    }
}
