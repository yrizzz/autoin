<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class Channel extends Model
{
    protected $fillable = ['user_id', 'name', 'platform', 'credentials', 'target_id', 'status', 'last_used_at'];

    protected function casts(): array
    {
        return [
            'last_used_at' => 'datetime',
        ];
    }

    public function getCredentialsAttribute($value)
    {
        return json_decode(Crypt::decryptString($value), true);
    }

    public function setCredentialsAttribute($value)
    {
        $this->attributes['credentials'] = Crypt::encryptString(json_encode($value));
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function broadcastTargets()
    {
        return $this->hasMany(BroadcastTarget::class);
    }

    public function broadcastLogs()
    {
        return $this->hasMany(BroadcastLog::class);
    }
}
