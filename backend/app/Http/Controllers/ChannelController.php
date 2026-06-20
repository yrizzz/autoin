<?php

namespace App\Http\Controllers;

use App\Models\Channel;
use App\Services\DiscordService;
use App\Services\TelegramUserService;
use App\Services\WebhookService;
use App\Services\WhatsAppService;
use Illuminate\Http\Request;

class ChannelController extends Controller
{
    public function index(Request $request)
    {
        return response()->json($request->user()->channels()->latest()->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'platform'    => 'required|in:whatsapp,telegram,discord,slack,smtp,resend,mailgun,webhook',
            'credentials' => 'required|array',
            'target_id'   => 'nullable|string',
        ]);

        $channel = $request->user()->channels()->create($data);

        return response()->json($channel, 201);
    }

    public function show(Request $request, Channel $channel)
    {
        abort_if($channel->user_id !== $request->user()->id, 403);
        return response()->json($channel);
    }

    public function update(Request $request, Channel $channel)
    {
        abort_if($channel->user_id !== $request->user()->id, 403);

        $data = $request->validate([
            'name'        => 'sometimes|string|max:255',
            'credentials' => 'sometimes|array',
            'target_id'   => 'nullable|string',
            'status'      => 'sometimes|in:active,inactive,error',
        ]);

        $channel->update($data);

        return response()->json($channel);
    }

    public function destroy(Request $request, Channel $channel)
    {
        abort_if($channel->user_id !== $request->user()->id, 403);
        $channel->delete();
        return response()->json(null, 204);
    }

    public function test(Request $request, Channel $channel)
    {
        abort_if($channel->user_id !== $request->user()->id, 403);

        $ok = match($channel->platform) {
            'telegram'  => app(TelegramUserService::class)->test($channel),
            'discord'   => app(DiscordService::class)->test($channel),
            'webhook'   => app(WebhookService::class)->test($channel),
            'whatsapp'  => app(WhatsAppService::class)->test($channel),
            default     => false,
        };

        $channel->update(['status' => $ok ? 'active' : 'error']);

        return response()->json(['ok' => $ok, 'status' => $ok ? 'active' : 'error']);
    }
}
