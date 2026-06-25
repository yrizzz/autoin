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
            $user->update([
                'google_id' => $googleUser->getId(),
                'name' => $googleUser->getName(),
                'avatar' => $googleUser->getAvatar(),
            ]);
        } else {
            $user = User::create([
                'google_id' => $googleUser->getId(),
                'name' => $googleUser->getName(),
                'email' => $googleUser->getEmail(),
                'avatar' => $googleUser->getAvatar(),
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
