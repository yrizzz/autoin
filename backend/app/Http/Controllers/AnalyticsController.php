<?php

namespace App\Http\Controllers;

use App\Models\Broadcast;
use App\Models\BroadcastLog;
use App\Models\Channel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function overview(Request $request)
    {
        $userId = $request->user()->id;

        $broadcasts = Broadcast::where('user_id', $userId);
        $channels   = Channel::where('user_id', $userId);

        return response()->json([
            'total_broadcasts'    => $broadcasts->count(),
            'sent_broadcasts'     => $broadcasts->where('status', 'sent')->count(),
            'failed_broadcasts'   => (clone $broadcasts)->where('status', 'failed')->count(),
            'scheduled_broadcasts'=> (clone $broadcasts)->where('status', 'scheduled')->count(),
            'total_channels'      => $channels->count(),
            'active_channels'     => (clone $channels)->where('status', 'active')->count(),
        ]);
    }

    public function broadcasts(Request $request)
    {
        $userId = $request->user()->id;

        $data = Broadcast::where('user_id', $userId)
            ->where('created_at', '>=', now()->subDays(30))
            ->selectRaw('DATE(created_at) as date, COUNT(*) as total, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as sent', ['sent'])
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return response()->json($data);
    }

    public function channels(Request $request)
    {
        $userId = $request->user()->id;

        $channelIds = Channel::where('user_id', $userId)->pluck('id');

        $data = BroadcastLog::whereIn('channel_id', $channelIds)
            ->with('channel:id,name,platform')
            ->selectRaw('channel_id, COUNT(*) as total, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as success', ['success'])
            ->groupBy('channel_id')
            ->get()
            ->map(fn($row) => [
                'channel'      => $row->channel,
                'total'        => $row->total,
                'success'      => $row->success,
                'success_rate' => $row->total > 0 ? round($row->success / $row->total * 100, 1) : 0,
            ]);

        return response()->json($data);
    }
}
