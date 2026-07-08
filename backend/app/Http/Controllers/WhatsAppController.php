<?php

namespace App\Http\Controllers;

use App\Models\Channel;
use App\Models\WhatsAppAuth;
use App\Services\WhatsAppService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class WhatsAppController extends Controller
{
    public function __construct(private WhatsAppService $wa) {}

    public function connect(Request $request)
    {
        if ($request->user()->email === 'demo@autoin.dev') {
            return response()->json(['message' => 'Anda harus login dengan Google terlebih dahulu untuk menghubungkan device.'], 403);
        }

        $user = $request->user();
        $count = $user->channels()->count();
        if (!\App\Services\PlanLimits::can($user, 'channels', $count)) {
            return \App\Services\PlanLimits::denyResponse('channels');
        }

        $data = $request->validate([
            'name'             => 'required|string|max:255',
            'target_id'        => 'nullable|string',
            'use_pairing_code' => 'nullable|boolean',
            'phone_number'     => 'nullable|string',
        ]);

        $sessionId = 'wa_' . $user->id . '_' . Str::random(8);

        $channel = $user->channels()->create([
            'name'        => $data['name'],
            'platform'    => 'whatsapp',
            'credentials' => ['session_id' => $sessionId],
            'target_id'   => $data['target_id'] ?? null,
            'status'      => 'inactive',
        ]);

        $result = $this->wa->createSession(
            $sessionId, 
            $data['use_pairing_code'] ?? false, 
            $data['phone_number'] ?? ''
        );

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

        if ($status === 'connected') {
            $updateData = [];
            if ($channel->status !== 'active') {
                $updateData['status'] = 'active';
            }
            if (isset($statusData['jid']) && !empty($statusData['jid'])) {
                $resolvedJid = $this->wa->resolveJid($channel, $statusData['jid']);
                if ($resolvedJid && $resolvedJid !== $channel->target_id) {
                    $updateData['target_id'] = $resolvedJid;
                }
            }
            if (!empty($updateData)) {
                $channel->update($updateData);
            }
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

        $synced = $channel->synced_data ?? [];
        $contacts = $synced['contacts'] ?? [];
        $chats = $synced['chats'] ?? [];
        $deletedContacts = $synced['deleted_contacts'] ?? [];

        // Build a unique map of contacts by their JID
        $contactsMap = [];
        foreach ($contacts as $c) {
            if (isset($c['id'])) {
                $contactsMap[$c['id']] = $c;
            }
        }

        // Add personal chats that are not already present in contacts
        foreach ($chats as $chat) {
            $jid = $chat['id'] ?? null;
            if ($jid && (str_ends_with($jid, '@s.whatsapp.net') || str_ends_with($jid, '@lid'))) {
                if (!isset($contactsMap[$jid])) {
                    $contactsMap[$jid] = [
                        'id' => $jid,
                        'name' => $chat['name'] ?? explode('@', $jid)[0],
                    ];
                } else if (empty($contactsMap[$jid]['name']) && !empty($chat['name'])) {
                    $contactsMap[$jid]['name'] = $chat['name'];
                }
            }
        }

        // Map internal LID mappings to real phone numbers if available
        $lidMap = $synced['lidMap'] ?? [];

        // Build map of contact JIDs to their group names
        $contactGroups = [];
        $groups = $synced['groups'] ?? [];
        foreach ($groups as $g) {
            $gName = $g['name'] ?? $g['subject'] ?? 'Grup';
            $participants = $g['participants'] ?? [];
            foreach ($participants as $pId) {
                // Normalize participant ID (strip device suffixes)
                $pClean = $pId;
                if (str_contains($pClean, ':')) {
                    $parts = explode(':', $pClean);
                    $afterColon = explode('@', $parts[1] ?? '');
                    $pClean = $parts[0] . (isset($afterColon[1]) ? '@' . $afterColon[1] : '');
                }
                
                if (str_ends_with($pClean, '@lid') && isset($lidMap[$pClean])) {
                    $pClean = $lidMap[$pClean];
                }
                
                $contactGroups[$pClean][] = $gName;
            }
        }

        $resolvedContacts = [];

        foreach ($contactsMap as $id => $c) {
            $resolvedId = $id;
            if (str_ends_with($id, '@lid')) {
                if (isset($lidMap[$id])) {
                    $resolvedId = $lidMap[$id];
                } else {
                    // Try name-matching fallback with phone contacts
                    $searchName = strtolower(trim($c['name'] ?? ''));
                    if ($searchName !== '') {
                        foreach ($contactsMap as $otherId => $otherC) {
                            if (str_ends_with($otherId, '@s.whatsapp.net') && strtolower(trim($otherC['name'] ?? '')) === $searchName) {
                                $resolvedId = $otherId;
                                break;
                            }
                        }
                    }
                }
            }

            // Skip if the contact has been deleted
            if (in_array($resolvedId, $deletedContacts) || in_array($id, $deletedContacts)) {
                continue;
            }

            $name = $c['name'] ?? '';
            if (str_contains($name, '@')) {
                $name = explode('@', $name)[0];
            }

            if (str_ends_with($resolvedId, '@s.whatsapp.net')) {
                $rawNumber = explode('@', $resolvedId)[0] . '@s.whatsapp.net';
                $cGroups = array_merge(
                    $contactGroups[$resolvedId] ?? [],
                    $contactGroups[$id] ?? [],
                    $contactGroups[$rawNumber] ?? []
                );

                $resolvedContacts[$resolvedId] = [
                    'id' => $resolvedId,
                    'name' => $name ?: explode('@', $resolvedId)[0],
                    'groups' => array_values(array_unique($cGroups)),
                ];
            }
        }

        return response()->json(['contacts' => array_values($resolvedContacts)]);
    }

    public function updateContacts(Request $request, Channel $channel)
    {
        abort_if($channel->user_id !== $request->user()->id, 403);
        abort_if($channel->platform !== 'whatsapp', 422);

        $data = $request->validate([
            'contacts' => 'required|array',
            'contacts.*.id' => 'required|string',
            'contacts.*.name' => 'nullable|string',
        ]);

        $syncedData = $channel->synced_data ?? [];
        $existingContacts = $syncedData['contacts'] ?? [];

        $contactsMap = [];
        foreach ($existingContacts as $c) {
            if (isset($c['id'])) {
                $contactsMap[$c['id']] = $c;
            }
        }

        foreach ($data['contacts'] as $newContact) {
            $id = $newContact['id'];
            if (!str_contains($id, '@')) {
                $id = preg_replace('/\D/', '', $id) . '@s.whatsapp.net';
            }
            $contactsMap[$id] = [
                'id' => $id,
                'name' => $newContact['name'] ?? $contactsMap[$id]['name'] ?? '',
            ];
        }

        $syncedData['contacts'] = array_values($contactsMap);
        $channel->update(['synced_data' => $syncedData]);

        try {
            \Illuminate\Support\Facades\Http::withHeader('x-api-secret', config('services.whatsapp.secret', 'autoin-wa-secret'))
                ->post(config('services.whatsapp.url', 'http://localhost:3001') . "/sessions/{$channel->credentials['session_id']}/contacts", [
                    'contacts' => array_values($contactsMap),
                ]);
        } catch (\Exception $e) {
            // Ignore Node.js service failures, DB is source of truth
        }

        return response()->json(['status' => 'success', 'contacts' => $syncedData['contacts']]);
    }

    public function deleteContact(Request $request, Channel $channel, string $jid)
    {
        abort_if($channel->user_id !== $request->user()->id, 403);
        abort_if($channel->platform !== 'whatsapp', 422);

        $syncedData = $channel->synced_data ?? [];
        $existingContacts = $syncedData['contacts'] ?? [];
        $lidMap = $syncedData['lidMap'] ?? [];

        // Save deleted contact JID in deleted_contacts blacklist
        $deletedContacts = $syncedData['deleted_contacts'] ?? [];
        if (!in_array($jid, $deletedContacts)) {
            $deletedContacts[] = $jid;
        }

        // Find any LID JIDs that map to the deleted phone JID and blacklist them too
        $matchingLids = [];
        foreach ($lidMap as $lid => $phone) {
            if ($phone === $jid) {
                $matchingLids[] = $lid;
                if (!in_array($lid, $deletedContacts)) {
                    $deletedContacts[] = $lid;
                }
            }
        }
        $syncedData['deleted_contacts'] = $deletedContacts;

        $updatedContacts = array_filter($existingContacts, function ($contact) use ($jid, $matchingLids) {
            $cId = $contact['id'] ?? '';
            if ($cId === $jid || in_array($cId, $matchingLids)) {
                return false;
            }
            return true;
        });

        $syncedData['contacts'] = array_values($updatedContacts);
        $channel->update(['synced_data' => $syncedData]);

        try {
            \Illuminate\Support\Facades\Http::withHeader('x-api-secret', config('services.whatsapp.secret', 'autoin-wa-secret'))
                ->delete(config('services.whatsapp.url', 'http://localhost:3001') . "/sessions/{$channel->credentials['session_id']}/contacts/" . urlencode($jid));
        } catch (\Exception $e) {
            // Ignore Node.js service failures, DB is source of truth
        }

        return $this->getContacts($request, $channel);
    }

    public function getChats(Request $request, Channel $channel)
    {
        abort_if($channel->user_id !== $request->user()->id, 403);
        abort_if($channel->platform !== 'whatsapp', 422);

        $synced = $channel->synced_data ?? [];
        return response()->json(['chats' => $synced['chats'] ?? []]);
    }

    public function getGroups(Request $request, Channel $channel)
    {
        abort_if($channel->user_id !== $request->user()->id, 403);
        abort_if($channel->platform !== 'whatsapp', 422);

        $synced = $channel->synced_data ?? [];
        $groups = $synced['groups'] ?? [];
        $chats  = $synced['chats'] ?? [];

        // Build unique map of groups by JID
        $groupsMap = [];
        foreach ($groups as $g) {
            if (isset($g['id'])) {
                $groupsMap[$g['id']] = $g;
            }
        }

        // Add groups found in chats
        foreach ($chats as $chat) {
            $jid = $chat['id'] ?? null;
            if ($jid && str_ends_with($jid, '@g.us')) {
                if (!isset($groupsMap[$jid])) {
                    $groupsMap[$jid] = [
                        'id' => $jid,
                        'name' => $chat['name'] ?? $chat['subject'] ?? explode('@', $jid)[0],
                    ];
                } elseif (empty($groupsMap[$jid]['name']) && (!empty($chat['name']) || !empty($chat['subject']))) {
                    $groupsMap[$jid]['name'] = $chat['name'] ?? $chat['subject'];
                }
            }
        }

        return response()->json(['groups' => array_values($groupsMap)]);
    }

    public function getGroupsRealtime(Request $request, Channel $channel)
    {
        abort_if($channel->user_id !== $request->user()->id, 403);
        abort_if($channel->platform !== 'whatsapp', 422);

        $credentials = $channel->credentials;
        if (!$credentials || !isset($credentials['session_id'])) {
            return response()->json(['status' => 'error', 'message' => 'Channel is not connected.'], 400);
        }

        $baseUrl = config('services.whatsapp.url', 'http://localhost:3001');
        $secret  = config('services.whatsapp.secret', 'autoin-wa-secret');

        try {
            $response = \Illuminate\Support\Facades\Http::withHeader('x-api-secret', $secret)
                ->get("{$baseUrl}/sessions/{$credentials['session_id']}/groups");

            return response()->json($response->json());
        } catch (\Throwable $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Failed to fetch groups in real-time: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function getGroupMetadata(Request $request, Channel $channel, $groupId)
    {
        abort_if($channel->user_id !== $request->user()->id, 403);
        abort_if($channel->platform !== 'whatsapp', 422);

        // Fetching group metadata is allowed for all connected users

        $credentials = $channel->credentials;
        if (!$credentials || !isset($credentials['session_id'])) {
            return response()->json(['status' => 'error', 'message' => 'Channel is not connected.'], 400);
        }

        $baseUrl = config('services.whatsapp.url', 'http://localhost:3001');
        $secret  = config('services.whatsapp.secret', 'autoin-wa-secret');

        try {
            $response = \Illuminate\Support\Facades\Http::withHeader('x-api-secret', $secret)
                ->get("{$baseUrl}/sessions/{$credentials['session_id']}/groups/" . urlencode($groupId));

            $data = $response->json();
            if ($data && isset($data['metadata']) && isset($data['metadata']['participants'])) {
                $synced = $channel->synced_data ?? [];
                $lidMap = $synced['lidMap'] ?? [];
                $contacts = $synced['contacts'] ?? [];
                
                $contactLookup = [];
                foreach ($contacts as $contact) {
                    if (isset($contact['id'])) {
                        $contactLookup[$contact['id']] = $contact;
                    }
                }

                foreach ($data['metadata']['participants'] as &$p) {
                    if (isset($p['id'])) {
                        $originalId = $p['id'];
                        $resolved = $this->wa->resolveJid($channel, $p['id']);
                        if ($resolved) {
                            $p['id'] = $resolved;
                        }

                        if (empty($p['name']) || str_contains($p['name'], '@')) {
                            if (isset($contactLookup[$p['id']])) {
                                $p['name'] = $contactLookup[$p['id']]['name'] ?? null;
                            } elseif (isset($contactLookup[$originalId])) {
                                $p['name'] = $contactLookup[$originalId]['name'] ?? null;
                            }
                        }
                    }
                }
            }

            return response()->json($data);
        } catch (\Throwable $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Failed to fetch group metadata: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function syncInternal(Request $request)
    {
        $secret = $request->header('X-Internal-Secret');
        if ($secret !== config('services.whatsapp.secret', 'autoin-wa-secret') && $secret !== 'autoin-internal-secret') {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $data = $request->validate([
            'session_id' => 'required|string',
            'chats'      => 'nullable|array',
            'groups'     => 'nullable|array',
            'contacts'   => 'nullable|array',
            'messages'   => 'nullable|array',
            'lidMap'     => 'nullable|array',
        ]);

        $sessionId = $data['session_id'];
        $channel = Channel::all()->first(function ($c) use ($sessionId) {
            return ($c->credentials['session_id'] ?? null) === $sessionId;
        });

        if (!$channel) {
            return response()->json(['message' => 'Channel not found.'], 404);
        }

        $syncedData = $channel->synced_data ?? [];
        if (isset($data['chats'])) {
            $syncedData['chats'] = $data['chats'];
        }
        if (isset($data['groups'])) {
            $syncedData['groups'] = $data['groups'];
        }
        if (isset($data['contacts'])) {
            $syncedData['contacts'] = $data['contacts'];
            
            // Build additional LID mappings by matching names of contacts who have both @lid and @s.whatsapp.net
            $lidMap = $syncedData['lidMap'] ?? [];
            $phoneContacts = [];
            $lidContacts = [];
            foreach ($data['contacts'] as $c) {
                $cId = $c['id'] ?? '';
                $cName = strtolower(trim($c['name'] ?? ''));
                if ($cName !== '') {
                    if (str_ends_with($cId, '@s.whatsapp.net')) {
                        $phoneContacts[$cName] = $cId;
                    } elseif (str_ends_with($cId, '@lid')) {
                        $lidContacts[$cName] = $cId;
                    }
                }
            }
            foreach ($lidContacts as $name => $lid) {
                if (isset($phoneContacts[$name]) && !isset($lidMap[$lid])) {
                    $lidMap[$lid] = $phoneContacts[$name];
                }
            }
            $syncedData['lidMap'] = $lidMap;
        }
        if (isset($data['messages'])) {
            // Deep-merge: keep existing chats, only overwrite chats that have new data
            $existing = $syncedData['messages'] ?? [];
            foreach ($data['messages'] as $chatId => $msgs) {
                $existing[$chatId] = $msgs;
            }
            $syncedData['messages'] = $existing;
        }
        if (isset($data['lidMap'])) {
            $existing = $syncedData['lidMap'] ?? [];
            foreach ($data['lidMap'] as $lid => $phone) {
                $existing[$lid] = $phone;
            }
            $syncedData['lidMap'] = $existing;
        }

        $channel->update(['synced_data' => $syncedData]);

        return response()->json(['status' => 'success']);
    }

    public function getSyncInternal(Request $request)
    {
        $secret = $request->header('X-Internal-Secret');
        if ($secret !== config('services.whatsapp.secret', 'autoin-wa-secret') && $secret !== 'autoin-internal-secret') {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $sessionId = $request->query('session_id');
        $channel = Channel::all()->first(function ($c) use ($sessionId) {
            return ($c->credentials['session_id'] ?? null) === $sessionId;
        });

        if (!$channel) {
            return response()->json(['message' => 'Channel not found.'], 404);
        }

        return response()->json($channel->synced_data ?? [
            'chats'    => [],
            'groups'   => [],
            'contacts' => [],
            'messages' => [],
            'lidMap'   => [],
        ]);
    }

    public function getMediaInternal(Request $request)
    {
        $secret = $request->header('X-Internal-Secret');
        if ($secret !== config('services.whatsapp.secret', 'autoin-wa-secret') && $secret !== 'autoin-internal-secret') {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $path = $request->query('path');
        if (!$path) {
            return response()->json(['message' => 'Path parameter is required.'], 422);
        }

        $disk = env('FILESYSTEM_DISK', 'public');
        $storage = \Illuminate\Support\Facades\Storage::disk($disk);

        if (!$storage->exists($path)) {
            return response()->json(['message' => 'File not found.'], 404);
        }

        try {
            $file = $storage->get($path);
            $mime = $storage->mimeType($path);
            return response($file, 200)->header('Content-Type', $mime);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to retrieve media: ' . $e->getMessage()], 500);
        }
    }

    public function getAuthInternal(Request $request)
    {
        $secret = $request->header('X-Internal-Secret');
        if ($secret !== config('services.whatsapp.secret', 'autoin-wa-secret') && $secret !== 'autoin-internal-secret') {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $sessionId = $request->query('session_id');
        $auths = WhatsAppAuth::where('session_id', $sessionId)->get()->pluck('value', 'key');

        return response()->json($auths);
    }

    public function saveAuthInternal(Request $request)
    {
        $secret = $request->header('X-Internal-Secret');
        if ($secret !== config('services.whatsapp.secret', 'autoin-wa-secret') && $secret !== 'autoin-internal-secret') {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $data = $request->validate([
            'session_id' => 'required|string',
            'data'       => 'required|array',
        ]);

        $sessionId = $data['session_id'];
        \Illuminate\Support\Facades\DB::transaction(function() use ($sessionId, $data) {
            foreach ($data['data'] as $key => $value) {
                if (is_null($value)) {
                    WhatsAppAuth::where('session_id', $sessionId)->where('key', $key)->delete();
                } else {
                    WhatsAppAuth::updateOrCreate(
                        ['session_id' => $sessionId, 'key' => $key],
                        ['value' => $value]
                    );
                }
            }
        });

        return response()->json(['status' => 'success']);
    }

    public function deleteAuthInternal(Request $request)
    {
        $secret = $request->header('X-Internal-Secret');
        if ($secret !== config('services.whatsapp.secret', 'autoin-wa-secret') && $secret !== 'autoin-internal-secret') {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $sessionId = $request->query('session_id');
        WhatsAppAuth::where('session_id', $sessionId)->delete();

        return response()->json(['status' => 'success']);
    }

    public function getSessionsInternal(Request $request)
    {
        $secret = $request->header('X-Internal-Secret');
        if ($secret !== config('services.whatsapp.secret', 'autoin-wa-secret') && $secret !== 'autoin-internal-secret') {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $sessionIds = Channel::where('platform', 'whatsapp')
            ->where('status', 'active')
            ->get()
            ->map(function ($c) {
                return $c->credentials['session_id'] ?? null;
            })
            ->filter()
            ->values();

        return response()->json($sessionIds);
    }

    public function syncChats(Request $request, Channel $channel)
    {
        abort_if($channel->user_id !== $request->user()->id, 403);
        abort_if($channel->platform !== 'whatsapp', 422);

        // Clear deleted contacts blacklist on manual synchronization to allow restoring them
        $syncedData = $channel->synced_data ?? [];
        $syncedData['deleted_contacts'] = [];
        $channel->update(['synced_data' => $syncedData]);

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

    public function sendMessage(Request $request, $channel)
    {
        // Resolve the channel scoped to the authenticated user. A non-existent
        // ID and a channel owned by another account both fail identically here,
        // so the API never sends through someone else's device and never leaks
        // Laravel's raw "No query results" 404 / generic 403.
        $channel = $request->user()->channels()
            ->where('platform', 'whatsapp')
            ->find($channel);

        if (!$channel) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Channel ID tidak valid atau bukan milik akun Anda. Lihat Channel ID Anda di menu Device atau via GET /api/channels.',
            ], 404);
        }

        // Enforce daily message limit
        $todayCount = \App\Models\ApiLog::where('user_id', $request->user()->id)
            ->whereDate('created_at', today())
            ->count();
        if (!\App\Services\PlanLimits::can($request->user(), 'messages_per_day', $todayCount)) {
            return \App\Services\PlanLimits::denyResponse('messages_per_day');
        }

        $credentials = $channel->credentials;
        $baseUrl = config('services.whatsapp.url', 'http://localhost:3001');
        $secret  = config('services.whatsapp.secret', 'autoin-wa-secret');

        $data = $request->validate([
            'to'              => 'required|string',
            'message'         => 'nullable|string',
            'mediaUrl'        => 'nullable|string',
            'mediaType'       => 'nullable|string',
            'backgroundColor' => 'nullable|string',
            'font'            => 'nullable|integer',
            'mentions'        => 'nullable|array',
        ]);

        $via = $request->attributes->get('is_api_key') ? 'api' : 'web';

        $to = $data['to'];
        $to = $this->wa->resolveJid($channel, $to);

        // Create initial pending log
        $apiLog = \App\Models\ApiLog::create([
            'user_id'    => $request->user()->id,
            'channel_id' => $channel->id,
            'to'         => $to,
            'message'    => $data['message'] ?? null,
            'media_url'  => $data['mediaUrl'] ?? null,
            'media_type' => $data['mediaType'] ?? null,
            'status'     => 'pending',
            'via'        => $via,
        ]);

        try {
            $response = \Illuminate\Support\Facades\Http::withHeader('x-api-secret', $secret)
                ->post("{$baseUrl}/sessions/{$credentials['session_id']}/send", [
                    'to'              => $to,
                    'message'         => $data['message'] ?? '',
                    'mediaUrl'        => $data['mediaUrl'] ?? null,
                    'mediaType'       => $data['mediaType'] ?? null,
                    'backgroundColor' => $data['backgroundColor'] ?? null,
                    'font'            => $data['font'] ?? null,
                    'mentions'        => $data['mentions'] ?? null,
                ]);

            $resData = $response->json();
            $isSuccess = $response->successful() && (
                (isset($resData['ok']) && $resData['ok'] === true) ||
                (isset($resData['status']) && $resData['status'] === 'success')
            );

            $apiLog->update([
                'status'   => $isSuccess ? 'success' : 'failed',
                'response' => $resData,
                'error'    => !$isSuccess ? ($resData['message'] ?? 'Failed to send message from Node.js service') : null,
            ]);

            return response()->json($resData ?? ['status' => 'error']);
        } catch (\Throwable $e) {
            $apiLog->update([
                'status' => 'failed',
                'error'  => $e->getMessage(),
            ]);

            return response()->json([
                'status'  => 'error',
                'message' => 'Connection to WhatsApp service failed: ' . $e->getMessage(),
            ], 500);
        }
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
            $url = "{$baseUrl}/sessions/{$sessionId}/events/messages/{$encodedChatId}";
            $ch  = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_HTTPHEADER     => ["x-api-secret: {$secret}", 'Accept: text/event-stream'],
                CURLOPT_WRITEFUNCTION  => function ($curl, $data) {
                    echo $data;
                    if (ob_get_level() > 0) {
                        ob_flush();
                    }
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
            $url = "{$baseUrl}/sessions/{$sessionId}/events/chats";
            $ch  = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_HTTPHEADER     => ["x-api-secret: {$secret}", 'Accept: text/event-stream'],
                CURLOPT_WRITEFUNCTION  => function ($curl, $data) {
                    echo $data;
                    if (ob_get_level() > 0) {
                        ob_flush();
                    }
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

    public function getApiLogs(Request $request)
    {
        $logs = \App\Models\ApiLog::with('channel')
            ->where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->paginate($request->input('limit', 15));

        foreach ($logs->items() as $log) {
            if ($log->to && $log->channel) {
                $synced = $log->channel->synced_data ?? [];
                $lidMap = $synced['lidMap'] ?? [];
                $originalJid = $log->to;
                $originalJidWithLid = str_contains($originalJid, '@') ? $originalJid : $originalJid . '@lid';

                $resolved = null;
                if (str_ends_with($originalJidWithLid, '@lid')) {
                    if (isset($lidMap[$originalJidWithLid])) {
                        $resolved = $lidMap[$originalJidWithLid];
                    } else {
                        $contacts = $synced['contacts'] ?? [];
                        $originalKey = explode('@', $originalJidWithLid)[0];
                        $cName = null;
                        foreach ($contacts as $contact) {
                            if (($contact['id'] ?? '') === $originalJidWithLid || ($contact['id'] ?? '') === $originalKey) {
                                $cName = strtolower(trim($contact['name'] ?? ''));
                                break;
                            }
                        }
                        if ($cName) {
                            foreach ($contacts as $contact) {
                                $cId = $contact['id'] ?? '';
                                if (str_ends_with($cId, '@s.whatsapp.net') && strtolower(trim($contact['name'] ?? '')) === $cName) {
                                    $resolved = $cId;
                                    break;
                                }
                            }
                        }
                    }
                }

                if ($resolved) {
                    $log->to = explode('@', $resolved)[0];
                } else {
                    $log->to = str_replace('@lid', '', $log->to);
                }
            }
        }

        return response()->json($logs);
    }

    public function flushSession(Request $request, Channel $channel)
    {
        abort_if($channel->user_id !== $request->user()->id, 403);
        abort_if($channel->platform !== 'whatsapp', 422);

        $credentials = $channel->credentials;
        if (!$credentials || !isset($credentials['session_id'])) {
            return response()->json(['status' => 'error', 'message' => 'Channel tidak terhubung.'], 400);
        }

        try {
            $result = $this->wa->flushSession($credentials['session_id']);
            return response()->json($result);
        } catch (\Throwable $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal melakukan tata ulang sesi: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function clearApiLogs(Request $request)
    {
        \App\Models\ApiLog::where('user_id', $request->user()->id)->delete();
        return response()->json(['status' => 'success']);
    }
}
