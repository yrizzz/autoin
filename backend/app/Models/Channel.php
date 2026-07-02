<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class Channel extends Model
{
    protected $fillable = ['user_id', 'name', 'platform', 'credentials', 'target_id', 'status', 'synced_data', 'status_blacklist', 'chatbot_settings', 'last_used_at'];

    protected function casts(): array
    {
        return [
            'last_used_at'     => 'datetime',
            'synced_data'      => 'array',
            'status_blacklist' => 'array',
            'chatbot_settings' => 'array',
        ];
    }

    public function getCredentialsAttribute($value)
    {
        if (empty($value)) {
            return [];
        }
        $data = is_array($value) ? $value : json_decode($value, true);
        if (is_array($data) && isset($data['encrypted'])) {
            try {
                return json_decode(Crypt::decryptString($data['encrypted']), true);
            } catch (\Exception $e) {
                return [];
            }
        }
        try {
            return json_decode(Crypt::decryptString($value), true);
        } catch (\Exception $e) {
            return is_array($data) ? $data : [];
        }
    }

    public function setCredentialsAttribute($value)
    {
        $encrypted = Crypt::encryptString(json_encode($value));
        $this->attributes['credentials'] = json_encode(['encrypted' => $encrypted]);
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
