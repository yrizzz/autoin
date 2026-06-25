<?php

namespace App\Http\Controllers;

use App\Models\PromoCode;
use App\Models\PromoCodeUsage;
use App\Models\Subscription;
use Illuminate\Http\Request;
use Carbon\Carbon;

class PromoCodeController extends Controller
{
    // Admin API: List all promo codes with usage details
    public function index(Request $request)
    {
        abort_if(strtolower($request->user()->email) !== 'arisedyhandoko@gmail.com', 403, 'Unauthorized.');

        $codes = PromoCode::with(['usages.user'])
            ->latest()
            ->get();

        return response()->json($codes);
    }

    // Admin API: Create a new promo code
    public function store(Request $request)
    {
        abort_if(strtolower($request->user()->email) !== 'arisedyhandoko@gmail.com', 403, 'Unauthorized.');

        $data = $request->validate([
            'code'        => 'required|string|unique:promo_codes,code',
            'type'        => 'required|in:free_sub,discount',
            'value'       => 'required|integer|min:1',
            'plan_id'     => 'nullable|in:daily,monthly,yearly',
            'max_uses'    => 'nullable|integer|min:1',
            'expires_at'  => 'nullable|date|after:today',
        ]);

        // Standardize code to uppercase
        $data['code'] = strtoupper($data['code']);

        $code = PromoCode::create($data);

        return response()->json([
            'message' => 'Promo code created successfully',
            'promo_code' => $code
        ]);
    }

    // Admin API: Toggle active state of a promo code
    public function toggle(Request $request, PromoCode $promoCode)
    {
        abort_if(strtolower($request->user()->email) !== 'arisedyhandoko@gmail.com', 403, 'Unauthorized.');

        $promoCode->is_active = !$promoCode->is_active;
        $promoCode->save();

        return response()->json([
            'message' => 'Promo code status updated',
            'promo_code' => $promoCode
        ]);
    }

    // Admin API: Delete a promo code
    public function destroy(Request $request, PromoCode $promoCode)
    {
        abort_if(strtolower($request->user()->email) !== 'arisedyhandoko@gmail.com', 403, 'Unauthorized.');

        $promoCode->delete();

        return response()->json([
            'message' => 'Promo code deleted successfully'
        ]);
    }

    // Public API: Check code details/validity
    public function check(Request $request)
    {
        $request->validate([
            'code' => 'required|string',
            'plan' => 'nullable|in:daily,monthly,yearly',
        ]);

        $codeStr = strtoupper($request->input('code'));
        $promo = PromoCode::where('code', $codeStr)->first();

        if (!$promo) {
            return response()->json(['error' => 'invalid_code', 'message' => 'Kode promo tidak ditemukan.'], 404);
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

        // Check if user already used this promo code
        $alreadyUsed = PromoCodeUsage::where('promo_code_id', $promo->id)
            ->where('user_id', $request->user()->id)
            ->exists();

        if ($alreadyUsed) {
            return response()->json(['error' => 'already_used', 'message' => 'Anda sudah menggunakan kode promo ini.'], 400);
        }

        // Check if plan matches
        if ($promo->plan_id && $request->input('plan') && $promo->plan_id !== $request->input('plan')) {
            return response()->json([
                'error' => 'plan_mismatch',
                'message' => "Kode promo ini hanya berlaku untuk paket " . ucfirst($promo->plan_id) . "."
            ], 400);
        }

        return response()->json([
            'valid' => true,
            'id' => $promo->id,
            'code' => $promo->code,
            'type' => $promo->type,
            'value' => $promo->value,
            'plan_id' => $promo->plan_id,
        ]);
    }

    // Public API: Redeem free_sub promo code directly
    public function redeem(Request $request)
    {
        $request->validate([
            'code' => 'required|string',
        ]);

        $codeStr = strtoupper($request->input('code'));
        $promo = PromoCode::where('code', $codeStr)->first();

        if (!$promo) {
            return response()->json(['error' => 'invalid_code', 'message' => 'Kode promo tidak ditemukan.'], 404);
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

        if ($promo->type !== 'free_sub') {
            return response()->json(['error' => 'wrong_type', 'message' => 'Kode promo ini tidak dapat diredeem secara langsung.'], 400);
        }

        // Check if user already used this promo code
        $alreadyUsed = PromoCodeUsage::where('promo_code_id', $promo->id)
            ->where('user_id', $request->user()->id)
            ->exists();

        if ($alreadyUsed) {
            return response()->json(['error' => 'already_used', 'message' => 'Anda sudah menggunakan kode promo ini.'], 400);
        }

        // Apply/extend subscription
        $plan = $promo->plan_id ?? 'free'; // default to free if no plan specified
        
        $sub = Subscription::where('user_id', $request->user()->id)->first();
        $daysToAdd = $promo->value; // e.g. 30 days for 1 month

        if (!$sub) {
            $sub = new Subscription();
            $sub->user_id = $request->user()->id;
            $sub->plan = $plan;
            $sub->started_at = now();
            $sub->expires_at = now()->addDays($daysToAdd);
        } else {
            $currentExpire = $sub->expires_at ? Carbon::parse($sub->expires_at) : now();
            if ($currentExpire->isPast() || $sub->plan === 'free') {
                $sub->plan = $plan;
                $sub->started_at = now();
                $sub->expires_at = now()->addDays($daysToAdd);
            } else {
                // Keep the current premium plan and extend expiration
                $sub->expires_at = $currentExpire->addDays($daysToAdd);
            }
        }

        $planPrices = [
            'daily' => 1000,
            'weekly' => 7000,
            'monthly' => 25000,
            'yearly' => 199000,
        ];
        $originalPrice = $planPrices[$plan] ?? 0;

        $sub->payment_id = 'PROMO-' . $promo->code;
        $sub->promo_code = $promo->code;
        $sub->discount_amount = $originalPrice;
        $sub->price_paid = 0;
        $sub->save();

        // Record usage
        PromoCodeUsage::create([
            'promo_code_id' => $promo->id,
            'user_id' => $request->user()->id,
            'redeemed_at' => now(),
            'discount_amount' => 0,
        ]);

        // Increment usage count
        $promo->increment('uses_count');

        return response()->json([
            'message' => 'Kode promo berhasil diredeem! Paket aktif Anda telah diperbarui.',
            'subscription' => $sub
        ]);
    }
}
