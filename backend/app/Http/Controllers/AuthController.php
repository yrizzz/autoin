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

    public function callback()
    {
        $googleUser = Socialite::driver('google')->stateless()->user();

        $user = User::where('email', $googleUser->getEmail())->first();

        if ($user) {
            $user->update([
                'google_id' => $googleUser->getId(),
                'name'      => $googleUser->getName(),
                'avatar'    => $googleUser->getAvatar(),
            ]);
        } else {
            $user = User::create([
                'google_id' => $googleUser->getId(),
                'name'      => $googleUser->getName(),
                'email'     => $googleUser->getEmail(),
                'avatar'    => $googleUser->getAvatar(),
            ]);
        }

        $token       = auth('api')->login($user);
        $frontendUrl = config('app.frontend_url', 'http://localhost:4321');
        $isProd      = config('app.env') === 'production';

        // HTTP-only cookie: Secure flag only when running over HTTPS in production
        $cookie = cookie(
            name:     'autoin_token',
            value:    $token,
            minutes:  60 * 24 * 7,   // 7 days
            path:     '/',
            domain:   null,
            secure:   $isProd,        // true = HTTPS only in prod
            httpOnly: true,
            raw:      false,
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
            name:     'autoin_token',
            value:    '',
            minutes:  -1,
            path:     '/',
            httpOnly: true
        );

        return response()->json(['message' => 'Logged out'])->withCookie($expired);
    }
}

