<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Broadcast extends Model
{
    protected $fillable = [
        'user_id', 'title', 'content', 'media_url', 'media_type',
        'status', 'scheduled_at', 'recurring', 'sent_at',
        'delay_min', 'delay_max', 'chunk_size', 'chunk_delay_min', 'chunk_delay_max',
        'auto_tag_members'
    ];

    protected function casts(): array
    {
        return [
            'scheduled_at'     => 'datetime',
            'sent_at'          => 'datetime',
            'auto_tag_members' => 'array',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function targets()
    {
        return $this->hasMany(BroadcastTarget::class);
    }

    public function channels()
    {
        return $this->hasManyThrough(Channel::class, BroadcastTarget::class, 'broadcast_id', 'id', 'id', 'channel_id');
    }

    public function logs()
    {
        return $this->hasMany(BroadcastLog::class);
    }
}
