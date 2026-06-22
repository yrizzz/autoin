<?php

namespace App\Http\Controllers;

use App\Models\Subscription;
use Illuminate\Http\Request;

class BillingController extends Controller
{
    private static array $PLANS = [
        [
            'id'       => 'free',
            'name'     => 'Free Trial',
            'price'    => 0,
            'period'   => null,
            'features' => ['5 Broadcast Trial', 'Semua Channel', 'Analytics Dasar'],
        ],
        [
            'id'       => 'daily',
            'name'     => 'Daily Pass',
            'price'    => 1000,
            'period'   => 'day',
            'features' => ['Unlimited Campaign', 'Unlimited Channel', 'Full Features', 'Fair Usage Policy'],
        ],
        [
            'id'       => 'monthly',
            'name'     => 'Monthly',
            'price'    => 25000,
            'period'   => 'month',
            'features' => ['Semua Fitur Daily', 'Priority Queue', 'Advanced Analytics'],
        ],
        [
            'id'       => 'yearly',
            'name'     => 'Yearly',
            'price'    => 199000,
            'period'   => 'year',
            'features' => ['Semua Fitur Premium', 'Harga Lebih Hemat'],
        ],
    ];

    public function plans()
    {
        return response()->json(self::$PLANS);
    }

    public function active(Request $request)
    {
        $sub = $request->user()->subscription;
        return response()->json($sub);
    }

    public function history(Request $request)
    {
        $subs = Subscription::where('user_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json($subs);
    }

    public function purchase(Request $request)
    {
        $data = $request->validate([
            'plan'       => 'required|in:daily,monthly,yearly',
            'payment_id' => 'nullable|string',
        ]);

        $expiresAt = match($data['plan']) {
            'daily'   => now()->addDay(),
            'monthly' => now()->addMonth(),
            'yearly'  => now()->addYear(),
        };

        $sub = Subscription::create([
            'user_id'    => $request->user()->id,
            'plan'       => $data['plan'],
            'started_at' => now(),
            'expires_at' => $expiresAt,
            'payment_id' => $data['payment_id'] ?? null,
        ]);

        return response()->json($sub, 201);
    }

    public function subscribers(Request $request)
    {
        abort_if($request->user()->email !== 'Arisedyhandoko@gmail.com', 403, 'Unauthorized. Admin access only.');

        $users = \App\Models\User::with(['subscription'])
            ->withCount(['channels', 'chatbotRules', 'webhooks'])
            ->get();

        return response()->json($users);
    }
}
