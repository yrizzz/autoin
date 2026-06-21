<?php

namespace App\Http\Controllers;

use App\Models\Channel;
use App\Services\WhatsAppService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class WhatsAppController extends Controller
{
    public function __construct(private WhatsAppService $wa) {}

    public function connect(Request $request)
    {
        $data = $request->validate([
            'name'             => 'required|string|max:255',
            'target_id'        => 'nullable|string',
            'use_pairing_code' => 'nullable|boolean',
            'phone_number'     => 'nullable|string',
        ]);

        $sessionId = 'wa_' . $request->user()->id . '_' . Str::random(8);

        $result = $this->wa->createSession(
            $sessionId, 
            $data['use_pairing_code'] ?? false, 
            $data['phone_number'] ?? ''
        );

        $channel = $request->user()->channels()->create([
            'name'        => $data['name'],
            'platform'    => 'whatsapp',
            'credentials' => ['session_id' => $sessionId],
            'target_id'   => $data['target_id'] ?? null,
            'status'      => 'inactive',
        ]);

        return response()->json([
            'channel' => $channel,
            'qr'      => $result['qr'] ?? null,
            'code'    => $result['code'] ?? null,
            'status'  => $result['status'] ?? 'connecting',
        ], 201);
    }

    public function qr(Request $request, Channel $channel)
    {
        abort_if($channel->user_id !== $request->user()->id, 403);
        abort_if($channel->platform !== 'whatsapp', 422);

        $credentials = $channel->credentials;
        $qr = $this->wa->getQr($credentials['session_id']);

        return response()->json(['qr' => $qr]);
    }

    public function status(Request $request, Channel $channel)
    {
        abort_if($channel->user_id !== $request->user()->id, 403);
        abort_if($channel->platform !== 'whatsapp', 422);

        $credentials = $channel->credentials;
        $statusData = $this->wa->getStatus($credentials['session_id']);
        $status = $statusData['status'] ?? 'unknown';

        if ($status === 'connected' && $channel->status !== 'active') {
            $channel->update(['status' => 'active']);
        }

        return response()->json([
            'status'         => $status,
            'code'           => $statusData['code'] ?? null,
            'qr'             => $statusData['qr'] ?? null,
            'channel_status' => $channel->fresh()->status
        ]);
    }

    public function disconnect(Request $request, Channel $channel)
    {
        abort_if($channel->user_id !== $request->user()->id, 403);
        abort_if($channel->platform !== 'whatsapp', 422);

        $credentials = $channel->credentials;
        $this->wa->deleteSession($credentials['session_id']);
        $channel->update(['status' => 'inactive']);

        return response()->json(['status' => 'disconnected']);
    }

    public function getContacts(Request $request, Channel $channel)
    {
        abort_if($channel->user_id !== $request->user()->id, 403);
        abort_if($channel->platform !== 'whatsapp', 422);

        try {
            $credentials = $channel->credentials;
            $baseUrl = config('services.whatsapp.url', 'http://localhost:3001');
            $secret  = config('services.whatsapp.secret', 'autoin-wa-secret');
            $response = \Illuminate\Support\Facades\Http::timeout(8)->withHeader('x-api-secret', $secret)
                ->get("{$baseUrl}/sessions/{$credentials['session_id']}/contacts");
            return response()->json($response->json() ?? ['contacts' => []]);
        } catch (\Throwable) {
            return response()->json(['contacts' => []]);
        }
    }

    public function getChats(Request $request, Channel $channel)
    {
        abort_if($channel->user_id !== $request->user()->id, 403);
        abort_if($channel->platform !== 'whatsapp', 422);

        try {
            $credentials = $channel->credentials;
            $baseUrl = config('services.whatsapp.url', 'http://localhost:3001');
            $secret  = config('services.whatsapp.secret', 'autoin-wa-secret');
            $response = \Illuminate\Support\Facades\Http::timeout(8)->withHeader('x-api-secret', $secret)
                ->get("{$baseUrl}/sessions/{$credentials['session_id']}/chats");
            return response()->json($response->json() ?? ['chats' => []]);
        } catch (\Throwable) {
            return response()->json(['chats' => []]);
        }
    }

    public function getGroups(Request $request, Channel $channel)
    {
        abort_if($channel->user_id !== $request->user()->id, 403);
        abort_if($channel->platform !== 'whatsapp', 422);

        try {
            $credentials = $channel->credentials;
            $baseUrl = config('services.whatsapp.url', 'http://localhost:3001');
            $secret  = config('services.whatsapp.secret', 'autoin-wa-secret');
            $response = \Illuminate\Support\Facades\Http::timeout(8)->withHeader('x-api-secret', $secret)
                ->get("{$baseUrl}/sessions/{$credentials['session_id']}/groups");
            return response()->json($response->json() ?? ['groups' => []]);
        } catch (\Throwable) {
            return response()->json(['groups' => []]);
        }
    }

    public function syncChats(Request $request, Channel $channel)
    {
        abort_if($channel->user_id !== $request->user()->id, 403);
        abort_if($channel->platform !== 'whatsapp', 422);

        try {
            $credentials = $channel->credentials;
            $baseUrl = config('services.whatsapp.url', 'http://localhost:3001');
            $secret  = config('services.whatsapp.secret', 'autoin-wa-secret');
            $response = \Illuminate\Support\Facades\Http::timeout(15)->withHeader('x-api-secret', $secret)
                ->post("{$baseUrl}/sessions/{$credentials['session_id']}/sync");
            return response()->json($response->json() ?? ['ok' => true, 'chats' => []]);
        } catch (\Throwable) {
            return response()->json(['ok' => false, 'chats' => []]);
        }
    }

    public function sendMessage(Request $request, Channel $channel)
    {
        abort_if($channel->user_id !== $request->user()->id, 403);
        abort_if($channel->platform !== 'whatsapp', 422);

        $credentials = $channel->credentials;
        $baseUrl = config('services.whatsapp.url', 'http://localhost:3001');
        $secret  = config('services.whatsapp.secret', 'autoin-wa-secret');

        $data = $request->validate([
            'to'       => 'required|string',
            'message'  => 'nullable|string',
            'mediaUrl' => 'nullable|string',
            'mediaType'=> 'nullable|string',
        ]);

        $response = \Illuminate\Support\Facades\Http::withHeader('x-api-secret', $secret)
            ->post("{$baseUrl}/sessions/{$credentials['session_id']}/send", [
                'to'       => $data['to'],
                'message'  => $data['message'] ?? '',
                'mediaUrl' => $data['mediaUrl'] ?? null,
                'mediaType'=> $data['mediaType'] ?? null,
            ]);

        return response()->json($response->json() ?? ['status' => 'error']);
    }

    public function getMessages(Request $request, Channel $channel, string $chatId)
    {
        abort_if($channel->user_id !== $request->user()->id, 403);
        abort_if($channel->platform !== 'whatsapp', 422);

        $credentials = $channel->credentials;
        $baseUrl = config('services.whatsapp.url', 'http://localhost:3001');
        $secret  = config('services.whatsapp.secret', 'autoin-wa-secret');

        try {
            $response = \Illuminate\Support\Facades\Http::timeout(8)->withHeader('x-api-secret', $secret)
                ->get("{$baseUrl}/sessions/{$credentials['session_id']}/messages/" . urlencode($chatId));
            return response()->json($response->json() ?? ['messages' => []]);
        } catch (\Throwable) {
            return response()->json(['messages' => []]);
        }
    }

    /**
     * SSE proxy: stream real-time messages for a specific chat.
     * The frontend connects directly to this Laravel endpoint which
     * forwards the Node.js SSE stream to the browser.
     */
    public function streamMessages(Request $request, Channel $channel, string $chatId)
    {
        abort_if($channel->user_id !== $request->user()->id, 403);
        abort_if($channel->platform !== 'whatsapp', 422);

        $credentials = $channel->credentials;
        $baseUrl = config('services.whatsapp.url', 'http://localhost:3001');
        $secret  = config('services.whatsapp.secret', 'autoin-wa-secret');
        $sessionId = $credentials['session_id'];
        $encodedChatId = urlencode($chatId);

        return response()->stream(function () use ($baseUrl, $secret, $sessionId, $encodedChatId) {
            while (ob_get_level() > 0) {
                ob_end_flush();
            }
            $url = "{$baseUrl}/sessions/{$sessionId}/events/messages/{$encodedChatId}";
            $ch  = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_HTTPHEADER     => ["x-api-secret: {$secret}", 'Accept: text/event-stream'],
                CURLOPT_WRITEFUNCTION  => function ($curl, $data) {
                    echo $data;
                    flush();
                    return strlen($data);
                },
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_TIMEOUT        => 0,
            ]);
            curl_exec($ch);
            curl_close($ch);
        }, 200, [
            'Content-Type'      => 'text/event-stream',
            'Cache-Control'     => 'no-cache',
            'X-Accel-Buffering' => 'no',
            'Connection'        => 'keep-alive',
        ]);
    }

    /**
     * SSE proxy: stream chat list updates.
     */
    public function streamChats(Request $request, Channel $channel)
    {
        abort_if($channel->user_id !== $request->user()->id, 403);
        abort_if($channel->platform !== 'whatsapp', 422);

        $credentials = $channel->credentials;
        $baseUrl = config('services.whatsapp.url', 'http://localhost:3001');
        $secret  = config('services.whatsapp.secret', 'autoin-wa-secret');
        $sessionId = $credentials['session_id'];

        return response()->stream(function () use ($baseUrl, $secret, $sessionId) {
            while (ob_get_level() > 0) {
                ob_end_flush();
            }
            $url = "{$baseUrl}/sessions/{$sessionId}/events/chats";
            $ch  = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_HTTPHEADER     => ["x-api-secret: {$secret}", 'Accept: text/event-stream'],
                CURLOPT_WRITEFUNCTION  => function ($curl, $data) {
                    echo $data;
                    flush();
                    return strlen($data);
                },
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_TIMEOUT        => 0,
            ]);
            curl_exec($ch);
            curl_close($ch);
        }, 200, [
            'Content-Type'      => 'text/event-stream',
            'Cache-Control'     => 'no-cache',
            'X-Accel-Buffering' => 'no',
            'Connection'        => 'keep-alive',
        ]);
    }
}
