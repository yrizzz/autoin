<?php

namespace App\Http\Controllers;

use App\Models\Broadcast;
use App\Models\BroadcastTarget;
use App\Services\BroadcastService;
use App\Services\PlanLimits;
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
        $user = $request->user();

        // Support message / content aliases
        if ($request->has('message') && !$request->has('content')) {
            $request->merge(['content' => $request->input('message')]);
        }
        // Support channel_id / channel_ids aliases
        if ($request->has('channel_id') && !$request->has('channel_ids')) {
            $request->merge(['channel_ids' => [$request->input('channel_id')]]);
        }
        // Support mediaUrl / media_url aliases
        if ($request->has('mediaUrl') && !$request->has('media_url')) {
            $request->merge(['media_url' => $request->input('mediaUrl')]);
        }
        // Support mediaType / media_type aliases
        if ($request->has('mediaType') && !$request->has('media_type')) {
            $request->merge(['media_type' => $request->input('mediaType')]);
        }

        // Free plan: max 3 broadcasts lifetime
        $count = $user->broadcasts()->count();
        if (!PlanLimits::can($user, 'broadcasts', $count)) {
            return PlanLimits::denyResponse('broadcasts');
        }

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

        // If recipients is a flat sequential array, map it to all target channel IDs
        if (!empty($recipientsMap) && array_keys($recipientsMap) === range(0, count($recipientsMap) - 1)) {
            $flatRecipients = $recipientsMap;
            $recipientsMap = [];
            foreach ($data['channel_ids'] as $channelId) {
                $recipientsMap[$channelId] = $flatRecipients;
            }
        }

        foreach ($data['channel_ids'] as $channelId) {
            BroadcastTarget::create([
                'broadcast_id' => $broadcast->id,
                'channel_id'   => $channelId,
                'recipients'   => $recipientsMap[$channelId] ?? null,
            ]);
        }

        // If send_now parameter is set (defaults to true if using developer aliases, false otherwise)
        $sendNowDefault = ($request->has('message') || $request->has('channel_id'));
        if (empty($data['scheduled_at']) && $request->input('send_now', $sendNowDefault)) {
            $this->service->send($broadcast);
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

        // Check free plan allows sending (has active plan or still within free tier)
        $plan = PlanLimits::activePlan($user);
        if ($plan === 'free') {
            // Free users can send but count against their 3-broadcast limit
            // (already checked at create time — allow send to proceed)
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
