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

    public function chatbotRules()
    {
        return $this->hasMany(ChatbotRule::class);
    }

    public function webhooks()
    {
        return $this->hasMany(Webhook::class);
    }

    public function templates()
    {
        return $this->hasMany(Template::class);
    }

    public function subscription()
    {
        return $this->hasOne(Subscription::class)->latestOfMany();
    }

    public function hasActiveSubscription(): bool
    {
        $sub = $this->subscription;
        if (!$sub) {
            $sub = $this->subscription()->create([
                'plan'       => 'free',
                'started_at' => now(),
                'expires_at' => null,
            ]);
        }
        if ($sub->plan === 'free') {
            if ($sub->expires_at && \Illuminate\Support\Carbon::parse($sub->expires_at)->isFuture()) {
                return true;
            }
            return $this->trial_count > 0;
        }
        return $sub->expires_at === null || $sub->expires_at->isFuture();
    }
}
