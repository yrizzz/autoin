<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    use HasFactory, Notifiable;

    protected $fillable = ['name', 'email', 'google_id', 'avatar', 'api_key', 'api_key_created_at', 'api_ip_whitelist'];

    protected $hidden = ['remember_token'];

    protected function casts(): array
    {
        return [
            'api_ip_whitelist' => 'array',
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

    public function plugins()
    {
        return $this->hasMany(Plugin::class);
    }

    public function templates()
    {
        return $this->hasMany(Template::class);
    }

    public function subscription()
    {
        return $this->hasOne(Subscription::class)->latestOfMany();
    }
}
