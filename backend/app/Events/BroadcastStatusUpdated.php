<?php

namespace App\Events;

use App\Models\Broadcast;
use App\Models\BroadcastLog;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class BroadcastStatusUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Broadcast $broadcast,
        public BroadcastLog $log
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("user.{$this->broadcast->user_id}"),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'broadcast_id' => $this->broadcast->id,
            'log_id'       => $this->log->id,
            'channel_id'   => $this->log->channel_id,
            'status'       => $this->log->status,
            'broadcast_status' => $this->broadcast->status,
        ];
    }
}
