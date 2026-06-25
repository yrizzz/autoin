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
                // Enforce IP Whitelist
                $whitelist = $user->api_ip_whitelist;
                $clientIp = $request->ip();

                // If whitelist is not configured/empty, block access by default
                if (!is_array($whitelist) || empty($whitelist)) {
                    return response()->json([
                        'message' => 'Forbidden: API Key IP Whitelist is not configured. Please whitelist specific IPs or set "*" to allow any IP.'
                    ], 403);
                }

                // Allow if wildcard '*' is present; otherwise, match the client IP
                if (!in_array('*', $whitelist) && !in_array($clientIp, $whitelist)) {
                    return response()->json([
                        'message' => 'Forbidden: Client IP address (' . $clientIp . ') is not in the whitelist.'
                    ], 403);
                }

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
