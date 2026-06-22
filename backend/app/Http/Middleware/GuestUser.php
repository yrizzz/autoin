<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class GuestUser
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = null;

        if ($request->bearerToken()) {
            try {
                $user = \Tymon\JWTAuth\Facades\JWTAuth::parseToken()->authenticate();
            } catch (\Exception $e) {
                // Ignore token error and fall back to guest
            }
        }

        if (!$user) {
            $user = User::firstOrCreate(
                ['email' => 'demo@autoin.dev'],
                [
                    'name'      => 'Demo User',
                    'google_id' => 'demo',
                    'avatar'    => null,
                ]
            );
        }

        Auth::login($user);

        return $next($request);
    }
}
