<?php

namespace App\Http\Controllers;

use App\Models\Channel;
use App\Services\TelegramUserService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class TelegramUserController extends Controller
{
    public function __construct(private TelegramUserService $tg) {}

    // ── Step 1: buat channel & kirim OTP ke nomor HP ─────────────────────
    public function connect(Request $request)
    {
        $data = $request->validate([
            'name'         => 'required|string|max:255',
            'phone_number' => 'required|string',
            'target_id'    => 'nullable|string',
        ]);

        $sessionId = 'tg_' . $request->user()->id . '_' . Str::random(8);

        $result = $this->tg->startLogin($sessionId, $data['phone_number']);

        $channel = $request->user()->channels()->create([
            'name'        => $data['name'],
            'platform'    => 'telegram',
            'credentials' => [
                'session_id'   => $sessionId,
                'phone_number' => $data['phone_number'],
            ],
            'target_id' => $data['target_id'] ?? null,
            'status'    => 'inactive',
        ]);

        return response()->json([
            'channel' => $channel,
            'status'  => $result['status'] ?? 'error',
        ], 201);
    }

    // ── Step 2: verifikasi kode OTP ───────────────────────────────────────
    public function verifyCode(Request $request, Channel $channel)
    {
        abort_if($channel->user_id !== $request->user()->id, 403);
        abort_if($channel->platform !== 'telegram', 422);

        $data        = $request->validate(['code' => 'required|string']);
        $credentials = $channel->credentials;

        $result = $this->tg->verifyCode($credentials['session_id'], $data['code']);

        return response()->json($result);
    }

    // ── Step 3 (opsional): verifikasi password 2FA ───────────────────────
    public function verify2FA(Request $request, Channel $channel)
    {
        abort_if($channel->user_id !== $request->user()->id, 403);
        abort_if($channel->platform !== 'telegram', 422);

        $data        = $request->validate(['password' => 'required|string']);
        $credentials = $channel->credentials;

        $result = $this->tg->verify2FA($credentials['session_id'], $data['password']);

        return response()->json($result);
    }

    // ── Polling status sesi ───────────────────────────────────────────────
    public function status(Request $request, Channel $channel)
    {
        abort_if($channel->user_id !== $request->user()->id, 403);
        abort_if($channel->platform !== 'telegram', 422);

        $credentials = $channel->credentials;
        $statusData  = $this->tg->getStatus($credentials['session_id']);
        $status      = $statusData['status'] ?? 'unknown';

        if ($status === 'connected' && $channel->status !== 'active') {
            $channel->update(['status' => 'active']);
        }

        return response()->json([
            'status'         => $status,
            'channel_status' => $channel->fresh()->status,
        ]);
    }

    // ── Logout / hapus sesi ───────────────────────────────────────────────
    public function disconnect(Request $request, Channel $channel)
    {
        abort_if($channel->user_id !== $request->user()->id, 403);
        abort_if($channel->platform !== 'telegram', 422);

        $credentials = $channel->credentials;
        $this->tg->deleteSession($credentials['session_id']);
        $channel->update(['status' => 'inactive']);

        return response()->json(['status' => 'disconnected']);
    }

    // ── Proxy: contacts ───────────────────────────────────────────────────
    public function getContacts(Request $request, Channel $channel)
    {
        abort_if($channel->user_id !== $request->user()->id, 403);
        abort_if($channel->platform !== 'telegram', 422);

        $r = $this->_proxy($channel, 'contacts');
        return response()->json($r->json() ?? ['contacts' => []]);
    }

    // ── Proxy: chats ──────────────────────────────────────────────────────
    public function getChats(Request $request, Channel $channel)
    {
        abort_if($channel->user_id !== $request->user()->id, 403);
        abort_if($channel->platform !== 'telegram', 422);

        $r = $this->_proxy($channel, 'chats');
        return response()->json($r->json() ?? ['chats' => []]);
    }

    // ── Proxy: groups ─────────────────────────────────────────────────────
    public function getGroups(Request $request, Channel $channel)
    {
        abort_if($channel->user_id !== $request->user()->id, 403);
        abort_if($channel->platform !== 'telegram', 422);

        $r = $this->_proxy($channel, 'groups');
        return response()->json($r->json() ?? ['groups' => []]);
    }

    // ── Proxy: messages ───────────────────────────────────────────────────
    public function getMessages(Request $request, Channel $channel, string $chatId)
    {
        abort_if($channel->user_id !== $request->user()->id, 403);
        abort_if($channel->platform !== 'telegram', 422);

        $r = $this->_proxy($channel, 'messages/' . urlencode($chatId));
        return response()->json($r->json() ?? ['messages' => []]);
    }

    // ── Proxy: send message ───────────────────────────────────────────────
    public function sendMessage(Request $request, Channel $channel)
    {
        abort_if($channel->user_id !== $request->user()->id, 403);
        abort_if($channel->platform !== 'telegram', 422);

        $data = $request->validate([
            'to'       => 'required|string',
            'message'  => 'nullable|string',
            'mediaUrl' => 'nullable|string',
        ]);

        $r = $this->_proxyPost($channel, 'send', $data);
        return response()->json($r->json() ?? ['ok' => false]);
    }

    private function _proxy(Channel $channel, string $path)
    {
        $baseUrl   = config('services.telegram.url', 'http://localhost:3002');
        $secret    = config('services.telegram.secret', 'autoin-tg-secret');
        $sessionId = $channel->credentials['session_id'];

        return Http::withHeader('x-api-secret', $secret)
            ->get("{$baseUrl}/sessions/{$sessionId}/{$path}");
    }

    private function _proxyPost(Channel $channel, string $path, array $data = [])
    {
        $baseUrl   = config('services.telegram.url', 'http://localhost:3002');
        $secret    = config('services.telegram.secret', 'autoin-tg-secret');
        $sessionId = $channel->credentials['session_id'];

        return Http::withHeader('x-api-secret', $secret)
            ->post("{$baseUrl}/sessions/{$sessionId}/{$path}", $data);
    }
}
