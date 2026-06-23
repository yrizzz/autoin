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
            'promo_code' => 'nullable|string',
        ]);

        $plans = [
            'daily' => ['price' => 1000, 'name' => 'Daily Pass'],
            'monthly' => ['price' => 25000, 'name' => 'Monthly Pass'],
            'yearly' => ['price' => 199000, 'name' => 'Yearly Pass'],
        ];

        if (!array_key_exists($data['plan'], $plans)) {
            return response()->json(['error' => 'invalid_plan'], 400);
        }

        $planData = $plans[$data['plan']];
        $amount = $planData['price'];
        $promoId = null;
        $promoCodeObj = null;

        if (!empty($data['promo_code'])) {
            $codeStr = strtoupper($data['promo_code']);
            $promo = \App\Models\PromoCode::where('code', $codeStr)->first();

            if (!$promo) {
                return response()->json(['error' => 'invalid_code', 'message' => 'Kode promo tidak ditemukan.'], 400);
            }
            if (!$promo->is_active) {
                return response()->json(['error' => 'inactive_code', 'message' => 'Kode promo sudah tidak aktif.'], 400);
            }
            if ($promo->expires_at && $promo->expires_at->isPast()) {
                return response()->json(['error' => 'expired_code', 'message' => 'Kode promo telah kedaluwarsa.'], 400);
            }
            if ($promo->max_uses !== null && $promo->uses_count >= $promo->max_uses) {
                return response()->json(['error' => 'limit_exceeded', 'message' => 'Batas penggunaan kode promo telah habis.'], 400);
            }
            if ($promo->plan_id && $promo->plan_id !== $data['plan']) {
                return response()->json(['error' => 'plan_mismatch', 'message' => 'Kode promo ini tidak berlaku untuk paket yang dipilih.'], 400);
            }

            // Check if user already used this promo code
            $alreadyUsed = \App\Models\PromoCodeUsage::where('promo_code_id', $promo->id)
                ->where('user_id', $request->user()->id)
                ->exists();

            if ($alreadyUsed) {
                return response()->json(['error' => 'already_used', 'message' => 'Anda sudah menggunakan kode promo ini.'], 400);
            }

            $promoId = $promo->id;
            $promoCodeObj = $promo;

            if ($promo->type === 'discount') {
                // value is percentage
                $discount = (int)($amount * ($promo->value / 100));
                $amount = max(0, $amount - $discount);
            } else if ($promo->type === 'free_sub') {
                // free subscription: 100% discount
                $amount = 0;
            }
        }

        // If amount is 0 (free subscription or 100% discount code), activate immediately
        if ($amount <= 0 && $promoCodeObj) {
            $daysToAdd = $promoCodeObj->type === 'free_sub' ? $promoCodeObj->value : 30; // default 30 days for 100% discount
            
            $sub = Subscription::where('user_id', $request->user()->id)->first();
            if (!$sub) {
                $sub = new Subscription();
                $sub->user_id = $request->user()->id;
                $sub->plan = $data['plan'];
                $sub->started_at = now();
                $sub->expires_at = now()->addDays($daysToAdd);
            } else {
                $currentExpire = $sub->expires_at ? \Illuminate\Support\Carbon::parse($sub->expires_at) : now();
                if ($currentExpire->isPast() || $sub->plan === 'free') {
                    $sub->plan = $data['plan'];
                    $sub->started_at = now();
                    $sub->expires_at = now()->addDays($daysToAdd);
                } else {
                    // Keep the current premium plan and extend expiration
                    $sub->expires_at = $currentExpire->addDays($daysToAdd);
                }
            }
            $sub->payment_id = 'PROMO-' . $promoCodeObj->code;
            $sub->promo_code = $promoCodeObj->code;
            $sub->discount_amount = $planData['price'];
            $sub->price_paid = 0;
            $sub->save();

            // Record usage
            \App\Models\PromoCodeUsage::create([
                'promo_code_id' => $promoCodeObj->id,
                'user_id' => $request->user()->id,
                'redeemed_at' => now(),
                'discount_amount' => $planData['price'],
            ]);

            $promoCodeObj->increment('uses_count');

            return response()->json([
                'success_activated' => true,
                'message' => 'Kode promo berhasil digunakan! Paket Anda telah aktif.'
            ]);
        }

        // Get Duitku system settings
        $settingsPath = storage_path('app/admin_settings.json');
        $settings = [];
        if (file_exists($settingsPath)) {
            $settings = json_decode(file_get_contents($settingsPath), true);
        }

        $merchantCode = $settings['duitku_merchant_code'] ?? '';
        $apiKey = $settings['duitku_api_key'] ?? '';
        $isSandbox = $settings['duitku_sandbox'] ?? true;

        $paymentEnabled = $settings['payment_gateway_enabled'] ?? false;

        if (!$paymentEnabled || empty($merchantCode) || empty($apiKey)) {
            return response()->json([
                'error' => 'payment_gateway_disabled',
                'message' => 'Payment gateway is currently disabled by administrator.'
            ], 400);
        }

        // Include promo code ID in order ID to process in callback
        $merchantOrderId = 'user_' . $request->user()->id . '_plan_' . $data['plan'];
        if ($promoId) {
            $merchantOrderId .= '_promo_' . $promoId;
        }
        $merchantOrderId .= '_' . time();

        $signature = hash('sha256', $merchantCode . $merchantOrderId . $amount . $apiKey);

        $payload = [
            'merchantCode' => $merchantCode,
            'paymentAmount' => $amount,
            'merchantOrderId' => $merchantOrderId,
            'productDetails' => $planData['name'] . ($promoCodeObj ? ' (Promo ' . $promoCodeObj->code . ')' : ''),
            'email' => $request->user()->email,
            'customerVaName' => $request->user()->name,
            'phoneNumber' => '081234567890',
            'callbackUrl' => route('duitku.callback'),
            'returnUrl' => url('/invoice'),
            'signature' => $signature,
            'expiryPeriod' => 1440
        ];

        $url = $isSandbox 
            ? 'https://app-sandbox.duitku.com/webapi/api/merchant/v2/inquiry' 
            : 'https://app-prod.duitku.com/webapi/api/merchant/v2/inquiry';

        $client = new \GuzzleHttp\Client();
        try {
            $response = $client->post($url, [
                'headers' => ['Content-Type' => 'application/json'],
                'body' => json_encode($payload),
            ]);

            $result = json_decode($response->getBody()->getContents(), true);

            if (isset($result['reference'])) {
                return response()->json([
                    'token' => $result['reference'],
                    'merchantOrderId' => $merchantOrderId,
                    'is_sandbox' => $isSandbox
                ]);
            } else {
                return response()->json([
                    'error' => 'duitku_error',
                    'message' => $result['message'] ?? 'Failed to generate payment token.'
                ], 400);
            }
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'duitku_connection_failed',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function subscribers(Request $request)
    {
        abort_if(strtolower($request->user()->email) !== 'arisedyhandoko@gmail.com', 403, 'Unauthorized. Admin access only.');

        $users = \App\Models\User::with(['subscription'])
            ->withCount(['channels', 'chatbotRules', 'webhooks'])
            ->get();

        return response()->json($users);
    }

    public function config()
    {
        $settingsPath = storage_path('app/admin_settings.json');
        $duitkuEnabled = false;
        $whatsappNumber = '6281296451923';
        if (file_exists($settingsPath)) {
            $settings = json_decode(file_get_contents($settingsPath), true);
            $paymentEnabled = $settings['payment_gateway_enabled'] ?? false;
            if ($paymentEnabled) {
                $duitkuEnabled = true;
            }
            if (!empty($settings['payment_whatsapp_number'])) {
                $whatsappNumber = $settings['payment_whatsapp_number'];
            }
        }
        return response()->json([
            'duitku_enabled' => $duitkuEnabled,
            'payment_whatsapp_number' => $whatsappNumber
        ]);
    }

    public function callback(Request $r)
    {
        $merchantCode = $r->input('merchantCode');
        $amount = $r->input('amount');
        $merchantOrderId = $r->input('merchantOrderId');
        $signature = $r->input('signature');
        $reference = $r->input('reference');
        $resultCode = $r->input('resultCode');

        // Load settings to get API key
        $settingsPath = storage_path('app/admin_settings.json');
        $apiKey = '';
        if (file_exists($settingsPath)) {
            $settings = json_decode(file_get_contents($settingsPath), true);
            $apiKey = $settings['duitku_api_key'] ?? '';
        }

        // Duitku signature verification: MD5(merchantCode + amount + merchantOrderId + apiKey)
        $localSignature = md5($merchantCode . $amount . $merchantOrderId . $apiKey);

        if ($signature !== $localSignature) {
            return response('Invalid signature', 400);
        }

        if ($resultCode === '00') {
            if (preg_match('/user_(\d+)_plan_(\w+)(?:_promo_(\d+))?_\d+/', $merchantOrderId, $matches)) {
                $userId = (int) $matches[1];
                $plan = $matches[2];
                $promoId = isset($matches[3]) ? (int) $matches[3] : null;

                $user = \App\Models\User::find($userId);
                if ($user) {
                    $expiresAt = match($plan) {
                        'daily'   => now()->addDay(),
                        'monthly' => now()->addMonth(),
                        'yearly'  => now()->addYear(),
                        default   => now()->addMonth()
                    };

                    $planPrices = [
                        'daily' => 1000,
                        'monthly' => 25000,
                        'yearly' => 199000,
                    ];
                    $originalPrice = $planPrices[$plan] ?? 25000;
                    $discountAmount = 0;
                    $promoCodeStr = null;

                    if ($promoId) {
                        $promo = \App\Models\PromoCode::find($promoId);
                        if ($promo) {
                            $promoCodeStr = $promo->code;
                            if ($promo->type === 'discount') {
                                $discountAmount = (int)($originalPrice * ($promo->value / 100));
                            } else {
                                $discountAmount = $originalPrice;
                            }
                        }
                    }

                    $pricePaid = max(0, $originalPrice - $discountAmount);

                    Subscription::updateOrCreate(
                        ['user_id' => $user->id],
                        [
                            'plan' => $plan,
                            'started_at' => now(),
                            'expires_at' => $expiresAt,
                            'payment_id' => $reference,
                            'promo_code' => $promoCodeStr,
                            'discount_amount' => $discountAmount,
                            'price_paid' => $pricePaid
                        ]
                    );

                    if ($promoId && isset($promo)) {
                        \App\Models\PromoCodeUsage::create([
                            'promo_code_id' => $promo->id,
                            'user_id' => $user->id,
                            'redeemed_at' => now(),
                            'discount_amount' => $discountAmount,
                        ]);
                        $promo->increment('uses_count');
                    }
                }
            }
        }

        return response('OK', 200);
    }
}
