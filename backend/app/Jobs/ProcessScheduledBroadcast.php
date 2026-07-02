<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use App\Models\Broadcast;
use App\Services\BroadcastService;

class ProcessScheduledBroadcast implements ShouldQueue
{
    use Queueable;

    public function __construct() {}

    public function handle(): void
    {
        $broadcasts = Broadcast::where('status', 'scheduled')
            ->where('scheduled_at', '<=', now())
            ->get();

        $service = app(BroadcastService::class);

        foreach ($broadcasts as $broadcast) {
            $service->send($broadcast);
        }
    }
}
