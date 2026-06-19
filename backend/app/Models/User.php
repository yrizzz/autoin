<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    use HasFactory, Notifiable;

    protected $fillable = ['name', 'email', 'google_id', 'avatar', 'trial_count'];

    protected $hidden = ['remember_token'];

    protected function casts(): array
    {
        return [
            'trial_count' => 'integer',
        ];
    }

    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims()
    {
        return [];
    }

    public function channels()
    {
        return $this->hasMany(Channel::class);
    }

    public function broadcasts()
    {
        return $this->hasMany(Broadcast::class);
    }

    public function subscription()
    {
        return $this->hasOne(Subscription::class)->latestOfMany();
    }

    public function hasActiveSubscription(): bool
    {
        $sub = $this->subscription;
        if (!$sub) return false;
        if ($sub->plan === 'free') return $this->trial_count > 0;
        return $sub->expires_at === null || $sub->expires_at->isFuture();
    }
}
