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

        $user = User::updateOrCreate(
            ['google_id' => $googleUser->getId()],
            [
                'name'   => $googleUser->getName(),
                'email'  => $googleUser->getEmail(),
                'avatar' => $googleUser->getAvatar(),
            ]
        );

        $frontendUrl = config('app.frontend_url', 'http://localhost:4321');

        return redirect("{$frontendUrl}/dashboard");
    }

    public function me(Request $request)
    {
        return response()->json($request->user()->load('subscription'));
    }

    public function logout()
    {
        return response()->json(['message' => 'Logged out']);
    }
}
