<?php

namespace App\Http\Controllers;

use App\Models\Channel;
use App\Models\Webhook;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class WebhookController extends Controller
{
    // GET /api/webhooks
    public function index(Request $request)
    {
        $webhooks = $request->user()->webhooks()->latest()->get()->map(fn($w) => $this->format($w));
        return response()->json($webhooks);
    }

    // POST /api/webhooks
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'     => 'required|string|max:255',
            'platform' => 'required|in:all,whatsapp,telegram',
        ]);

        $webhook = $request->user()->webhooks()->create($data);
        return response()->json($this->format($webhook), 201);
    }

    // PUT /api/webhooks/{webhook}
    public function update(Request $request, Webhook $webhook)
    {
        abort_if($webhook->user_id !== $request->user()->id, 403);

        $data = $request->validate([
            'name'      => 'sometimes|string|max:255',
            'platform'  => 'sometimes|in:all,whatsapp,telegram',
            'is_active' => 'sometimes|boolean',
        ]);

        $webhook->update($data);
        return response()->json($this->format($webhook->fresh()));
    }

    // DELETE /api/webhooks/{webhook}
    public function destroy(Request $request, Webhook $webhook)
    {
        abort_if($webhook->user_id !== $request->user()->id, 403);
        $webhook->delete();
        return response()->json(['ok' => true]);
    }

    // POST /api/webhooks/trigger/{uuid}  — public, called by external systems
    public function trigger(Request $request, string $uuid)
    {
        $webhook = Webhook::where('uuid', $uuid)->where('is_active', true)->first();
        if (!$webhook) {
            return response()->json(['error' => 'Webhook not found or inactive'], 404);
        }

        $secret = $request->header('X-Webhook-Secret');
        if ($secret !== $webhook->secret_token) {
            return response()->json(['error' => 'Invalid secret token'], 401);
        }

        $data = $request->validate([
            'message'  => 'required|string',
            'targets'  => 'required|array|min:1',
            'targets.*'=> 'required|string',
            'platform' => 'nullable|in:whatsapp,telegram',
        ]);

        $platform = $data['platform'] ?? ($webhook->platform === 'all' ? 'whatsapp' : $webhook->platform);
        $user     = $webhook->user;

        $channels = $user->channels()
            ->where('platform', $platform)
            ->where('status', 'active')
            ->get();

        if ($channels->isEmpty()) {
            return response()->json(['error' => "No active {$platform} channel found"], 422);
        }

        $channel  = $channels->first();
        $sessId   = $channel->credentials['session_id'] ?? null;
        $sent     = 0;

        foreach ($data['targets'] as $to) {
            try {
                if ($platform === 'whatsapp') {
                    $waUrl = config('services.whatsapp.url', 'http://localhost:3001');
                    $waKey = config('services.whatsapp.secret', 'autoin-wa-secret');
                    Http::withHeader('x-api-secret', $waKey)
                        ->post("{$waUrl}/sessions/{$sessId}/send", [
                            'to'      => $to,
                            'message' => $data['message'],
                        ]);
                } else {
                    $tgUrl = config('services.telegram.url', 'http://localhost:3002');
                    $tgKey = config('services.telegram.secret', 'autoin-tg-secret');
                    Http::withHeader('x-api-secret', $tgKey)
                        ->post("{$tgUrl}/sessions/{$sessId}/send", [
                            'to'      => $to,
                            'message' => $data['message'],
                        ]);
                }
                $sent++;
            } catch (\Throwable) {}
        }

        $webhook->update(['last_triggered_at' => now()]);

        return response()->json([
            'ok'        => true,
            'sent'      => $sent,
            'total'     => count($data['targets']),
            'platform'  => $platform,
            'channel'   => $channel->name,
        ]);
    }

    private function format(Webhook $w): array
    {
        return [
            'id'                 => $w->id,
            'name'               => $w->name,
            'uuid'               => $w->uuid,
            'url'                => $w->url,
            'platform'           => $w->platform,
            'secret_token'       => $w->secret_token,
            'is_active'          => $w->is_active,
            'last_triggered_at'  => $w->last_triggered_at?->toIso8601String(),
            'created_at'         => $w->created_at?->toIso8601String(),
        ];
    }
}
