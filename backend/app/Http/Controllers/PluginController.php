<?php

namespace App\Http\Controllers;

use App\Models\Plugin;
use App\Services\PlanLimits;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class PluginController extends Controller
{
    // ── CRUD ──────────────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        return response()->json(
            $request->user()->plugins()->orderByDesc('created_at')->get()
        );
    }

    /**
     * Galeri plugin publik milik semua user. Black-box: TIDAK menyertakan `code`.
     * Plugin milik sendiri tetap muncul (ditandai is_owner) supaya konsisten.
     */
    public function publicIndex(Request $request)
    {
        $user = $request->user();
        $q    = trim((string) $request->query('q', ''));

        $query = Plugin::query()
            ->where('is_public', true)
            ->where('is_active', true)
            ->with('user:id,name');

        if ($q !== '') {
            $query->where(function ($sub) use ($q) {
                $sub->where('name', 'like', "%{$q}%")
                    ->orWhere('description', 'like', "%{$q}%")
                    ->orWhere('usage', 'like', "%{$q}%");
            });
        }

        $plugins = $query->orderByDesc('created_at')->get()->map(function ($p) use ($user) {
            return [
                'id'          => $p->id,
                'name'        => $p->name,
                'description' => $p->description,
                'usage'       => $p->usage,
                'timeout_ms'  => $p->timeout_ms,
                'is_public'   => true,
                'is_owner'    => $p->user_id === $user->id,
                'author'      => $p->user?->name ?? 'Anonim',
                'created_at'  => $p->created_at,
                // NB: `code` sengaja TIDAK disertakan (black-box).
            ];
        });

        return response()->json($plugins);
    }

    public function store(Request $request)
    {
        $user  = $request->user();
        $count = $user->plugins()->count();
        if (!PlanLimits::can($user, 'plugins', $count)) {
            return PlanLimits::denyResponse('plugins');
        }

        $data = $this->validateData($request);

        // Batasi jumlah plugin yang boleh dijadikan global/publik per paket.
        if (($data['is_public'] ?? false) === true) {
            $publicCount = $user->plugins()->where('is_public', true)->count();
            if (!PlanLimits::can($user, 'public_plugins', $publicCount)) {
                return PlanLimits::denyResponse('public_plugins');
            }
        }

        $plugin = $user->plugins()->create($data);

        return response()->json($plugin, 201);
    }

    public function update(Request $request, Plugin $plugin)
    {
        abort_if($plugin->user_id !== $request->user()->id, 403);

        $data = $this->validateData($request, true);

        // Saat mengubah plugin dari privat -> publik, cek kuota plugin global paket.
        if (array_key_exists('is_public', $data) && $data['is_public'] === true && !$plugin->is_public) {
            $publicCount = $request->user()->plugins()->where('is_public', true)->count();
            if (!PlanLimits::can($request->user(), 'public_plugins', $publicCount)) {
                return PlanLimits::denyResponse('public_plugins');
            }
        }

        $plugin->update($data);

        return response()->json($plugin);
    }

    public function destroy(Request $request, Plugin $plugin)
    {
        abort_if($plugin->user_id !== $request->user()->id, 403);
        $plugin->delete();
        return response()->json(null, 204);
    }

    private function validateData(Request $request, bool $partial = false): array
    {
        $req = $partial ? 'sometimes' : 'required';
        $data = $request->validate([
            'name'        => "$req|string|max:255",
            'description' => 'nullable|string|max:255',
            'usage'       => 'nullable|string|max:255',
            'code'        => "$req|string",
            'is_active'   => 'sometimes|boolean',
            'is_public'   => 'sometimes|boolean',
            'timeout_ms'  => 'sometimes|integer',
        ]);

        if (isset($data['timeout_ms'])) {
            $data['timeout_ms'] = max(1000, min(15000, (int) $data['timeout_ms']));
        }

        return $data;
    }

    // ── Test: jalankan plugin sekali via WA service sandbox ───────────────────

    public function test(Request $request, Plugin $plugin)
    {
        abort_if($plugin->user_id !== $request->user()->id, 403);

        $input = $request->validate([
            'args' => 'sometimes|array',
            'code' => 'sometimes|string', // boleh tes kode yg belum disimpan
        ]);

        return response()->json($this->runOnService($plugin, $input['args'] ?? [], $input['code'] ?? null));
    }

    /**
     * Jalankan plugin sekali di WA service sandbox, lalu catat hasilnya.
     */
    private function runOnService(Plugin $plugin, array $args, ?string $codeOverride = null): array
    {
        $rawArgs = implode(' ', array_map('strval', $args));
        $code    = $codeOverride ?? $plugin->code;

        $ctx = [
            'args'      => $args,
            'rawArgs'   => $rawArgs,
            'text'      => $rawArgs,
            'sender'    => 'test@s.whatsapp.net',
            'chatId'    => 'test@s.whatsapp.net',
            'sessionId' => 'test',
        ];

        try {
            $res = Http::withHeader('x-api-secret', config('services.whatsapp.secret', 'autoin-wa-secret'))
                ->timeout(20)
                ->post(rtrim(config('services.whatsapp.url', 'http://localhost:3001'), '/') . '/plugins/run', [
                    'code'       => $code,
                    'ctx'        => $ctx,
                    'timeout_ms' => $plugin->timeout_ms,
                ]);

            $result = $res->json();

            // Respons bukan JSON yang valid -> kemungkinan besar WA service versi lama
            // (route /plugins/run belum ada) atau crash. Beri pesan yang bisa ditindak.
            if (!is_array($result)) {
                $hint = $res->status() === 404
                    ? 'route /plugins/run tidak ada — WA service perlu di-restart/redeploy (pm2 restart autoin-wa).'
                    : 'respons tidak valid (HTTP ' . $res->status() . ').';
                $result = ['ok' => false, 'error' => 'WA service: ' . $hint];
            }
        } catch (\Throwable $e) {
            $result = ['ok' => false, 'error' => 'WA service tidak terjangkau: ' . $e->getMessage()];
        }

        $plugin->update([
            'last_error'  => ($result['ok'] ?? false) ? null : ($result['error'] ?? 'Error tidak diketahui'),
            'last_run_at' => now(),
        ]);

        return $result;
    }

    // ── Admin: pantau & kelola SEMUA plugin lintas user ───────────────────────

    private function assertAdmin(Request $request): void
    {
        abort_if(strtolower($request->user()->email) !== 'arisedyhandoko@gmail.com', 403, 'Unauthorized.');
    }

    public function adminIndex(Request $request)
    {
        $this->assertAdmin($request);

        $plugins = Plugin::with('user:id,name,email')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'stats' => [
                'total'   => $plugins->count(),
                'active'  => $plugins->where('is_active', true)->count(),
                'errored' => $plugins->whereNotNull('last_error')->count(),
                'owners'  => $plugins->pluck('user_id')->unique()->count(),
            ],
            'plugins' => $plugins,
        ]);
    }

    public function adminToggle(Request $request, Plugin $plugin)
    {
        $this->assertAdmin($request);
        $plugin->update(['is_active' => !$plugin->is_active]);
        $plugin->load('user:id,name,email');
        return response()->json($plugin);
    }

    public function adminDestroy(Request $request, Plugin $plugin)
    {
        $this->assertAdmin($request);
        $plugin->delete();
        return response()->json(null, 204);
    }

    public function adminTest(Request $request, Plugin $plugin)
    {
        $this->assertAdmin($request);
        $input = $request->validate([
            'args' => 'sometimes|array',
            'code' => 'sometimes|string',
        ]);
        return response()->json($this->runOnService($plugin, $input['args'] ?? [], $input['code'] ?? null));
    }

    // ── Internal: dipanggil WA service utk lapor hasil run terakhir ───────────

    public function reportInternal(Request $request)
    {
        $secret = $request->header('X-Internal-Secret');
        if ($secret !== config('services.internal.secret', 'autoin-internal-secret') &&
            $secret !== config('services.whatsapp.secret', 'autoin-wa-secret')) {
            return response()->json(['ok' => false], 401);
        }

        $plugin = Plugin::find($request->input('plugin_id'));
        if ($plugin) {
            $plugin->update([
                'last_error'  => $request->input('error'),
                'last_run_at' => now(),
            ]);
        }

        return response()->json(['ok' => true]);
    }
}
