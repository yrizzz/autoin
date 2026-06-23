<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use App\Models\Broadcast;
use App\Services\BroadcastService;

class ProcessScheduledBroadcast implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Execute the job.
     */
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
