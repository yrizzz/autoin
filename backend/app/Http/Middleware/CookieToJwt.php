<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Reads the JWT from the HttpOnly cookie 'autoin_token' and injects it
 * into the Authorization header so the existing JWT guard works unchanged.
 * Falls back to the Authorization header if already present.
 */
class CookieToJwt
{
    public function handle(Request $request, Closure $next)
    {
        if (! $request->bearerToken() && $request->cookie('autoin_token')) {
            $request->headers->set(
                'Authorization',
                'Bearer ' . $request->cookie('autoin_token')
            );
        }

        return $next($request);
    }
}
