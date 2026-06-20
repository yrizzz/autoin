<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BroadcastTarget extends Model
{
    public $timestamps = false;

    protected $fillable = ['broadcast_id', 'channel_id', 'recipients'];

    protected function casts(): array
    {
        return ['recipients' => 'array'];
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
