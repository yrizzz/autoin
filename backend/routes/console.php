<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Jobs\ProcessScheduledBroadcast;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('broadcast:run {id}', function ($id) {
    $broadcast = \App\Models\Broadcast::find($id);
    if ($broadcast) {
        $job = new \App\Jobs\SendBroadcastJob($broadcast);
        $job->handle();
    }
})->purpose('Run a broadcast in the background');

Schedule::job(new ProcessScheduledBroadcast)->everyMinute();
