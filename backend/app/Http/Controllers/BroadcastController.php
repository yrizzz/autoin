<?php

namespace App\Http\Controllers;

use App\Models\Broadcast;
use App\Models\BroadcastTarget;
use App\Services\BroadcastService;
use Illuminate\Http\Request;

class BroadcastController extends Controller
{
    public function __construct(private BroadcastService $service) {}

    public function index(Request $request)
    {
        $query = $request->user()->broadcasts()->latest();

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        $broadcasts = $query->paginate(20);

        return response()->json($broadcasts);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title'          => 'nullable|string|max:255',
            'content'        => 'required|string',
            'media_url'      => 'nullable|string',
            'media_type'     => 'nullable|in:image,video,pdf,document',
            'channel_ids'    => 'required|array|min:1',
            'channel_ids.*'  => 'exists:channels,id',
            'recipients'     => 'nullable|array',
            'scheduled_at'   => 'nullable|date|after:now',
            'recurring'      => 'nullable|in:none,daily,weekly,monthly',
        ]);

        $status = !empty($data['scheduled_at']) ? 'scheduled' : 'draft';

        $broadcast = $request->user()->broadcasts()->create([
            'title'        => $data['title'] ?? null,
            'content'      => $data['content'],
            'media_url'    => $data['media_url'] ?? null,
            'media_type'   => $data['media_type'] ?? null,
            'scheduled_at' => $data['scheduled_at'] ?? null,
            'recurring'    => $data['recurring'] ?? 'none',
            'status'       => $status,
        ]);

        $recipientsMap = $data['recipients'] ?? [];

        foreach ($data['channel_ids'] as $channelId) {
            BroadcastTarget::create([
                'broadcast_id' => $broadcast->id,
                'channel_id'   => $channelId,
                'recipients'   => $recipientsMap[$channelId] ?? null,
            ]);
        }

        return response()->json($broadcast->load('targets.channel'), 201);
    }

    public function show(Request $request, Broadcast $broadcast)
    {
        $this->authorize($request->user(), $broadcast);
        return response()->json($broadcast->load('targets.channel', 'logs.channel'));
    }

    public function update(Request $request, Broadcast $broadcast)
    {
        $this->authorize($request->user(), $broadcast);

        $data = $request->validate([
            'title'        => 'nullable|string|max:255',
            'content'      => 'sometimes|string',
            'scheduled_at' => 'nullable|date|after:now',
            'recurring'    => 'nullable|in:none,daily,weekly,monthly',
        ]);

        $broadcast->update($data);

        return response()->json($broadcast);
    }

    public function destroy(Request $request, Broadcast $broadcast)
    {
        $this->authorize($request->user(), $broadcast);
        $broadcast->delete();
        return response()->json(null, 204);
    }

    public function send(Request $request, Broadcast $broadcast)
    {
        $this->authorize($request->user(), $broadcast);

        $user = $request->user();

        if (!$user->hasActiveSubscription()) {
            return response()->json(['message' => 'No active subscription or trial exhausted.'], 402);
        }

        $this->service->send($broadcast);

        return response()->json(['status' => 'queued', 'broadcast_id' => $broadcast->id]);
    }

    public function cancel(Request $request, Broadcast $broadcast)
    {
        $this->authorize($request->user(), $broadcast);

        if (!in_array($broadcast->status, ['scheduled', 'draft', 'queued'])) {
            return response()->json(['message' => 'Broadcast ini tidak dapat dibatalkan.'], 422);
        }

        $broadcast->update(['status' => 'cancelled']);

        return response()->json(['status' => 'cancelled']);
    }

    public function logs(Request $request, Broadcast $broadcast)
    {
        $this->authorize($request->user(), $broadcast);

        return response()->json($broadcast->logs()->with('channel')->get());
    }

    private function authorize($user, Broadcast $broadcast): void
    {
        abort_if($broadcast->user_id !== $user->id, 403);
    }
}
