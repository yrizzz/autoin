<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BroadcastLog extends Model
{
    public $timestamps = false;

    protected $fillable = ['broadcast_id', 'channel_id', 'recipient_id', 'status', 'response', 'error', 'sent_at'];

    protected function casts(): array
    {
        return [
            'response' => 'array',
            'sent_at'  => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function broadcast()
    {
        return $this->belongsTo(Broadcast::class);
    }

    public function channel()
    {
        return $this->belongsTo(Channel::class);
    }
}
