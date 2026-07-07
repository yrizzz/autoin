<?php

namespace App\Http\Controllers;

use App\Models\Broadcast;
use App\Models\BroadcastTarget;
use App\Services\BroadcastService;
use App\Services\PlanLimits;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BroadcastController extends Controller
{
    public function __construct(private BroadcastService $service) {}

    public function index(Request $request)
    {
        $query = $request->user()->broadcasts()
            ->with('targets.channel')
            ->withCount([
                'logs as total_logs',
                'logs as sent_logs' => function ($q) {
                    $q->whereIn('status', ['success', 'sent']);
                },
                'logs as failed_logs' => function ($q) {
                    $q->where('status', 'failed');
                }
            ])
            ->latest();

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        $broadcasts = $query->paginate(50);

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
            'title'            => 'nullable|string|max:255',
            'content'          => 'required_without:media_url|nullable|string',
            'media_url'        => 'nullable|string',
            'media_type'       => 'nullable|in:image,video,pdf,document',
            'channel_ids'      => 'required|array|min:1',
            // Only allow channels that belong to the authenticated user. A
            // non-existent ID or one owned by another account both fail here,
            // so a user can never broadcast through someone else's device.
            'channel_ids.*'    => [
                'required',
                Rule::exists('channels', 'id')->where('user_id', $user->id),
            ],
            'recipients'       => 'nullable|array',
            'scheduled_at'     => 'nullable|date|after:now',
            'recurring'        => 'nullable|in:none,daily,weekly,monthly',
            'background_color' => 'nullable|string',
            'backgroundColor'  => 'nullable|string',
            'font'             => 'nullable|integer',
            'delay_min'           => 'nullable|integer|min:0',
            'delay_max'           => 'nullable|integer|min:0',
            'chunk_size'          => 'nullable|integer|min:1',
            'chunk_delay_min'     => 'nullable|integer|min:0',
            'chunk_delay_max'     => 'nullable|integer|min:0',
            // Boolean (legacy simple toggle) or array (per-group tag config)
            'auto_tag_members' => ['nullable', function ($attribute, $value, $fail) {
                if (!is_bool($value) && !is_array($value)) {
                    $fail('Pengaturan auto tag members harus berupa boolean atau daftar grup.');
                }
            }],
            // Anti-ban v2
            'spintax_enabled'     => 'nullable|boolean',
            'shuffle_recipients'  => 'nullable|boolean',
            'typing_simulation'   => 'nullable|boolean',
        ], [
            'channel_ids.required'   => 'Channel tujuan wajib diisi (channel_ids).',
            'channel_ids.min'        => 'Minimal pilih 1 channel tujuan.',
            'channel_ids.*.required' => 'Channel ID tidak boleh kosong.',
            'channel_ids.*.exists'   => 'Channel ID tidak valid atau bukan milik akun Anda.',
        ]);

        $isApiKey = (bool) $request->attributes->get('is_api_key', false);
        $sendNowDefault = $isApiKey || $request->has('message') || $request->has('channel_id');
        $sendNow = empty($data['scheduled_at']) && $request->input('send_now', $sendNowDefault);

        $status = 'draft';
        $scheduledAt = $data['scheduled_at'] ?? null;

        if ($scheduledAt) {
            $status = 'scheduled';
        } elseif ($sendNow) {
            $status = 'scheduled';
            $scheduledAt = now();
        }

        // If backgroundColor is passed for a status text broadcast,
        // store it in media_url with '#' prefix (existing convention)
        $mediaUrl  = $data['media_url'] ?? null;
        $mediaType = $data['media_type'] ?? null;
        $bgColor   = $data['backgroundColor'] ?? $data['background_color'] ?? null;
        if ($bgColor && !$mediaUrl) {
            $mediaUrl  = str_starts_with($bgColor, '#') ? $bgColor : "#{$bgColor}";
            $mediaType = null;
        }

        $broadcast = $request->user()->broadcasts()->create([
            'title'               => $data['title'] ?? null,
            'content'             => $data['content'] ?? '',
            'media_url'           => $mediaUrl,
            'media_type'          => $mediaType,
            'scheduled_at'        => $scheduledAt,
            'recurring'           => $data['recurring'] ?? 'none',
            'status'              => $status,
            'delay_min'           => $data['delay_min'] ?? 3,
            'delay_max'           => $data['delay_max'] ?? 7,
            'chunk_size'          => $data['chunk_size'] ?? 10,
            'chunk_delay_min'     => $data['chunk_delay_min'] ?? 15,
            'chunk_delay_max'     => $data['chunk_delay_max'] ?? 30,
            'auto_tag_members'    => $data['auto_tag_members'] ?? false,
            // Anti-ban v2
            'spintax_enabled'     => $data['spintax_enabled']    ?? false,
            'shuffle_recipients'  => $data['shuffle_recipients']  ?? true,
            'typing_simulation'   => $data['typing_simulation']   ?? true,
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

        return response()->json($broadcast->load('targets.channel'), 201);
    }

    public function show(Request $request, Broadcast $broadcast)
    {
        $this->authorize($request->user(), $broadcast);
        $broadcast->load('targets.channel', 'logs.channel');

        foreach ($broadcast->logs as $log) {
            // Fix NULL created_at for existing logs
            if (!$log->created_at) {
                $log->created_at = $log->sent_at ?? $broadcast->created_at ?? now();
            }

            $log->recipient_name = null;
            if ($log->recipient_id && $log->channel) {
                $synced = $log->channel->synced_data ?? [];
                $lidMap = $synced['lidMap'] ?? [];
                $originalJid = $log->recipient_id;
                $originalKey = explode('@', $originalJid)[0];

                // Resolve phone number if it is an LID
                $resolvedPhone = null;
                if (isset($lidMap[$originalJid])) {
                    $resolvedPhone = $lidMap[$originalJid];
                } elseif (isset($lidMap[$originalKey])) {
                    $resolvedPhone = $lidMap[$originalKey];
                }

                // Look up contact name using original JID first
                $contacts = $synced['contacts'] ?? [];
                foreach ($contacts as $contact) {
                    if (($contact['id'] ?? '') === $originalJid || ($contact['id'] ?? '') === $originalKey) {
                        $log->recipient_name = $contact['name'] ?? null;
                        break;
                    }
                }

                // If not found and we have resolved phone, search with resolved phone
                if (!$log->recipient_name && $resolvedPhone) {
                    $resolvedPhoneKey = explode('@', $resolvedPhone)[0];
                    foreach ($contacts as $contact) {
                        if (($contact['id'] ?? '') === $resolvedPhone || ($contact['id'] ?? '') === $resolvedPhoneKey) {
                            $log->recipient_name = $contact['name'] ?? null;
                            break;
                        }
                    }
                }

                // If still not found, search in groups
                if (!$log->recipient_name) {
                    $groups = $synced['groups'] ?? [];
                    foreach ($groups as $group) {
                        if (($group['id'] ?? '') === $originalJid || ($group['id'] ?? '') === $originalKey) {
                            $log->recipient_name = $group['name'] ?? $group['subject'] ?? null;
                            break;
                        }
                    }
                }

                // Fallback: If resolvedPhone is still null but recipient_name is set, resolve by name matching
                if (!$resolvedPhone && $log->recipient_name) {
                    $searchName = strtolower(trim($log->recipient_name));
                    if ($searchName !== '') {
                        // 1. Search in contacts for phone JID
                        foreach ($contacts as $contact) {
                            $cId = $contact['id'] ?? '';
                            $cName = strtolower(trim($contact['name'] ?? ''));
                            if ($cName === $searchName && str_ends_with($cId, '@s.whatsapp.net')) {
                                $resolvedPhone = $cId;
                                break;
                            }
                        }
                        
                        // 2. Search in chats for phone JID if still not found
                        if (!$resolvedPhone) {
                            $chats = $synced['chats'] ?? [];
                            foreach ($chats as $chat) {
                                $chatId = $chat['id'] ?? '';
                                $chatName = strtolower(trim($chat['name'] ?? ''));
                                if ($chatName === $searchName && str_ends_with($chatId, '@s.whatsapp.net')) {
                                    $resolvedPhone = $chatId;
                                    break;
                                }
                            }
                        }
                    }
                }

                // Overwrite recipient_id with phone number if resolved
                if ($resolvedPhone) {
                    $log->recipient_id = $resolvedPhone;
                }
            }
        }

        return response()->json($broadcast);
    }

    public function update(Request $request, Broadcast $broadcast)
    {
        $this->authorize($request->user(), $broadcast);

        $rules = [
            'title'            => 'nullable|string|max:255',
            'content'          => 'sometimes|nullable|string',
            'recurring'        => 'nullable|in:none,daily,weekly,monthly',
            // Boolean (legacy simple toggle) or array (per-group tag config)
            'auto_tag_members' => ['nullable', function ($attribute, $value, $fail) {
                if (!is_bool($value) && !is_array($value)) {
                    $fail('Pengaturan auto tag members harus berupa boolean atau daftar grup.');
                }
            }],
        ];

        if ($request->has('scheduled_at') && $request->input('scheduled_at') !== null) {
            $newScheduledAt = $request->input('scheduled_at');
            $currentScheduledAtStr = $broadcast->scheduled_at ? $broadcast->scheduled_at->format('Y-m-d H:i:s') : null;
            $newScheduledAtStr = date('Y-m-d H:i:s', strtotime($newScheduledAt));

            if ($currentScheduledAtStr !== $newScheduledAtStr) {
                $rules['scheduled_at'] = 'nullable|date|after:now';
            } else {
                $rules['scheduled_at'] = 'nullable|date';
            }
        } else {
            $rules['scheduled_at'] = 'nullable|date';
        }

        $data = $request->validate($rules);

        if (array_key_exists('scheduled_at', $data)) {
            $data['status'] = !empty($data['scheduled_at']) ? 'scheduled' : 'draft';
        } elseif ($broadcast->scheduled_at && $broadcast->scheduled_at->isFuture()) {
            $data['status'] = 'scheduled';
        }

        if (array_key_exists('content', $data) && is_null($data['content'])) {
            $data['content'] = '';
        }

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

        // Update status to scheduled and scheduled_at to now so that the background scheduler picks it up
        $broadcast->update([
            'scheduled_at' => now(),
            'status' => 'scheduled'
        ]);

        return response()->json(['status' => 'scheduled', 'broadcast_id' => $broadcast->id]);
    }

    public function cancel(Request $request, Broadcast $broadcast)
    {
        $this->authorize($request->user(), $broadcast);

        $cancellableStatuses = ['scheduled', 'draft', 'queued', 'sending'];
        if (!in_array($broadcast->status, $cancellableStatuses)) {
            return response()->json(['message' => 'Broadcast ini tidak dapat dibatalkan (status: ' . $broadcast->status . ').'], 422);
        }

        // Broadcast yang sedang berjalan ('sending'): set flag cancel_requested.
        // Job akan membaca flag ini setiap 5 pesan dan berhenti secara graceful.
        if ($broadcast->status === 'sending') {
            $broadcast->update(['cancel_requested' => true]);
            return response()->json(['status' => 'cancel_requested', 'message' => 'Pembatalan diterima. Broadcast akan berhenti setelah pesan saat ini selesai.']);
        }

        $broadcast->update(['status' => 'cancelled']);

        return response()->json(['status' => 'cancelled']);
    }

    /**
     * "Pakai Ulang" — clone an existing broadcast (content, media, recipients
     * and anti-ban settings) into a fresh draft so the user can re-send or
     * re-schedule it without touching the original history.
     */
    public function duplicate(Request $request, Broadcast $broadcast)
    {
        $this->authorize($request->user(), $broadcast);
        $user = $request->user();

        // Respect the free plan's lifetime broadcast cap.
        $count = $user->broadcasts()->count();
        if (!PlanLimits::can($user, 'broadcasts', $count)) {
            return PlanLimits::denyResponse('broadcasts');
        }

        $copy = $user->broadcasts()->create([
            'title'            => $broadcast->title,
            'content'          => $broadcast->content,
            'media_url'        => $broadcast->media_url,
            'media_type'       => $broadcast->media_type,
            'scheduled_at'     => null,
            'recurring'        => 'none',
            'status'           => 'draft',
            'delay_min'        => $broadcast->delay_min,
            'delay_max'        => $broadcast->delay_max,
            'chunk_size'       => $broadcast->chunk_size,
            'chunk_delay_min'  => $broadcast->chunk_delay_min,
            'chunk_delay_max'  => $broadcast->chunk_delay_max,
            'auto_tag_members' => $broadcast->auto_tag_members,
        ]);

        foreach ($broadcast->targets as $target) {
            BroadcastTarget::create([
                'broadcast_id' => $copy->id,
                'channel_id'   => $target->channel_id,
                'recipients'   => $target->recipients,
            ]);
        }

        return response()->json($copy->load('targets.channel'), 201);
    }

    public function logs(Request $request, Broadcast $broadcast)
    {
        $this->authorize($request->user(), $broadcast);

        $logs = $broadcast->logs()->with('channel')->get();

        foreach ($logs as $log) {
            // Fix NULL created_at for existing logs
            if (!$log->created_at) {
                $log->created_at = $log->sent_at ?? $broadcast->created_at ?? now();
            }

            $log->recipient_name = null;
            if ($log->recipient_id && $log->channel) {
                $synced = $log->channel->synced_data ?? [];
                $lidMap = $synced['lidMap'] ?? [];
                $originalJid = $log->recipient_id;
                $originalKey = explode('@', $originalJid)[0];

                // Resolve phone number if it is an LID
                $resolvedPhone = null;
                if (isset($lidMap[$originalJid])) {
                    $resolvedPhone = $lidMap[$originalJid];
                } elseif (isset($lidMap[$originalKey])) {
                    $resolvedPhone = $lidMap[$originalKey];
                }

                // Look up contact name using original JID first
                $contacts = $synced['contacts'] ?? [];
                foreach ($contacts as $contact) {
                    if (($contact['id'] ?? '') === $originalJid || ($contact['id'] ?? '') === $originalKey) {
                        $log->recipient_name = $contact['name'] ?? null;
                        break;
                    }
                }

                // If not found and we have resolved phone, search with resolved phone
                if (!$log->recipient_name && $resolvedPhone) {
                    $resolvedPhoneKey = explode('@', $resolvedPhone)[0];
                    foreach ($contacts as $contact) {
                        if (($contact['id'] ?? '') === $resolvedPhone || ($contact['id'] ?? '') === $resolvedPhoneKey) {
                            $log->recipient_name = $contact['name'] ?? null;
                            break;
                        }
                    }
                }

                // If still not found, search in groups
                if (!$log->recipient_name) {
                    $groups = $synced['groups'] ?? [];
                    foreach ($groups as $group) {
                        if (($group['id'] ?? '') === $originalJid || ($group['id'] ?? '') === $originalKey) {
                            $log->recipient_name = $group['name'] ?? $group['subject'] ?? null;
                            break;
                        }
                    }
                }

                // Fallback: If resolvedPhone is still null but recipient_name is set, resolve by name matching
                if (!$resolvedPhone && $log->recipient_name) {
                    $searchName = strtolower(trim($log->recipient_name));
                    if ($searchName !== '') {
                        // 1. Search in contacts for phone JID
                        foreach ($contacts as $contact) {
                            $cId = $contact['id'] ?? '';
                            $cName = strtolower(trim($contact['name'] ?? ''));
                            if ($cName === $searchName && str_ends_with($cId, '@s.whatsapp.net')) {
                                $resolvedPhone = $cId;
                                break;
                            }
                        }
                        
                        // 2. Search in chats for phone JID if still not found
                        if (!$resolvedPhone) {
                            $chats = $synced['chats'] ?? [];
                            foreach ($chats as $chat) {
                                $chatId = $chat['id'] ?? '';
                                $chatName = strtolower(trim($chat['name'] ?? ''));
                                if ($chatName === $searchName && str_ends_with($chatId, '@s.whatsapp.net')) {
                                    $resolvedPhone = $chatId;
                                    break;
                                }
                            }
                        }
                    }
                }

                // Overwrite recipient_id with phone number if resolved
                if ($resolvedPhone) {
                    $log->recipient_id = $resolvedPhone;
                }
            }
        }

        return response()->json($logs);
    }

    private function authorize($user, Broadcast $broadcast): void
    {
        abort_if($broadcast->user_id !== $user->id, 403);
    }
}
