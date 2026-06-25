<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\User;
use Tymon\JWTAuth\Facades\JWTAuth;

class ApiKeyToJwt
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        $authHeader = $request->header('Authorization');

        if ($authHeader && preg_match('/Bearer\s+(autoin_[a-zA-Z0-9]+)/i', $authHeader, $matches)) {
            $apiKey = $matches[1];

            // Find user by api_key in database
            $user = User::where('api_key', $apiKey)->first();

            if ($user) {
                try {
                    // Generate a valid JWT token for the user
                    $jwtToken = JWTAuth::fromUser($user);

                    // Replace the Authorization header with the JWT token
                    $request->headers->set('Authorization', 'Bearer ' . $jwtToken);
                    
                    // Mark the request as coming from API Key
                    $request->attributes->set('is_api_key', true);
                } catch (\Throwable $e) {
                    // Fallback silently if JWT generation fails
                }
            }
        }

        return $next($request);
    }
}
