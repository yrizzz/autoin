<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;

class AuthController extends Controller
{
    public function redirect()
    {
        return Socialite::driver('google')->stateless()->redirect();
    }

    public function localBypass()
    {
        if (config('app.env') !== 'local') {
            abort(404);
        }

        $user = \App\Models\User::first();
        if (!$user) {
            $user = \App\Models\User::create([
                'name'      => 'Admin AutoIn',
                'email'     => 'arisedyhandoko@gmail.com',
                'google_id' => '123456789',
                'avatar'    => null,
            ]);
        }

        auth('web')->login($user);
        $token       = auth('api')->login($user);
        $frontendUrl = config('app.frontend_url', 'http://localhost:4322');

        $cookie = cookie(
            name:     'autoin_token',
            value:    $token,
            minutes:  60 * 24 * 7,   // 7 days
            path:     '/',
            domain:   null,
            secure:   false,
            httpOnly: true,
            raw:      false,
            sameSite: 'Lax'
        );

        return redirect("{$frontendUrl}/dashboard?token={$token}")
            ->withCookie($cookie);
    }

    public function callback()
    {
        $googleUser = Socialite::driver('google')->stateless()->user();

        $user = User::where('email', $googleUser->getEmail())->first();

        if ($user) {
            $googleAvatar = $googleUser->getAvatar();
            $update = [
                'google_id'     => $googleUser->getId(),
                'google_avatar' => $googleAvatar,
            ];
            // Jangan timpa avatar custom: hanya ikut avatar Google bila user memang
            // masih memakai avatar Google (atau belum punya avatar sama sekali).
            if (empty($user->avatar) || $user->avatar === $user->google_avatar) {
                $update['avatar'] = $googleAvatar;
            }
            // Nama dibiarkan apa adanya agar nama custom user tidak ter-reset tiap login.
            $user->update($update);
        } else {
            $user = User::create([
                'google_id'     => $googleUser->getId(),
                'name'          => $googleUser->getName(),
                'email'         => $googleUser->getEmail(),
                'avatar'        => $googleUser->getAvatar(),
                'google_avatar' => $googleUser->getAvatar(),
            ]);
        }

        auth('web')->login($user);
        $token = auth('api')->login($user);
        $frontendUrl = config('app.frontend_url', 'http://localhost:4322');
        $isProd = config('app.env') === 'production';

        // HTTP-only cookie: Secure flag only when running over HTTPS in production
        $cookie = cookie(
            name: 'autoin_token',
            value: $token,
            minutes: 60 * 24 * 7,   // 7 days
            path: '/',
            domain: null,
            secure: $isProd,        // true = HTTPS only in prod
            httpOnly: true,
            raw: false,
            sameSite: $isProd ? 'Strict' : 'Lax'
        );

        // Still pass token in URL so the frontend can bootstrap immediately;
        // cookie is the durable, secure storage going forward.
        return redirect("{$frontendUrl}/dashboard?token={$token}")
            ->withCookie($cookie);
    }

    public function me(Request $request)
    {
        return response()->json($request->user()->load('subscription'));
    }

    /**
     * Perbarui profil akun (saat ini: nama tampilan).
     */
    public function updateProfile(Request $request)
    {
        $data = $request->validate([
            'name'   => 'required|string|min:1|max:100',
            // avatar: URL hasil upload, atau URL avatar Google (untuk "kembalikan ke Google"),
            // atau null untuk pakai fallback (gravatar). 'sometimes' = boleh tidak dikirim.
            'avatar' => 'sometimes|nullable|string|max:2048',
        ]);

        $user = $request->user();
        $user->name = trim($data['name']);
        if (array_key_exists('avatar', $data)) {
            $user->avatar = $data['avatar'] ?: null;
        }
        $user->save();

        return response()->json($user->load('subscription'));
    }

    public function logout()
    {
        // Clear the HttpOnly cookie
        $expired = cookie(
            name: 'autoin_token',
            value: '',
            minutes: -1,
            path: '/',
            httpOnly: true
        );

        return response()->json(['message' => 'Logged out'])->withCookie($expired);
    }

    public function getApiKey(Request $request)
    {
        $user = $request->user();
        return response()->json([
            'api_key' => $user->api_key,
            'created' => $user->api_key_created_at,
            'whitelist' => $user->api_ip_whitelist ?? [],
        ]);
    }

    public function generateApiKey(Request $request)
    {
        $user = $request->user();
        
        // Generate a cryptographically secure 48-character API key
        $key = 'autoin_' . bin2hex(random_bytes(24));
        
        $user->update([
            'api_key' => $key,
            'api_key_created_at' => now(),
        ]);

        return response()->json([
            'api_key' => $key,
            'created' => $user->api_key_created_at,
            'whitelist' => $user->api_ip_whitelist ?? [],
        ]);
    }

    public function revokeApiKey(Request $request)
    {
        $user = $request->user();
        
        $user->update([
            'api_key' => null,
            'api_key_created_at' => null,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'API Key revoked successfully.'
        ]);
    }

    public function updateApiKeyWhitelist(Request $request)
    {
        $request->validate([
            'whitelist' => 'present|array',
            'whitelist.*' => 'string',
        ]);

        $user = $request->user();
        $user->update([
            'api_ip_whitelist' => $request->input('whitelist'),
        ]);

        return response()->json([
            'status' => 'success',
            'whitelist' => $user->api_ip_whitelist ?? [],
        ]);
    }
}
