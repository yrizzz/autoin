<?php

namespace App\Http\Controllers;

use App\Models\Broadcast;
use App\Models\PromoCodeUsage;
use App\Models\Subscription;
use Carbon\Carbon;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    // Label paket yang ramah untuk ditampilkan.
    private const PLAN_LABELS = [
        'daily'   => 'Harian',
        'weekly'  => 'Mingguan',
        'monthly' => 'Bulanan',
        'yearly'  => 'Tahunan',
        'free'    => 'Gratis',
    ];

    /**
     * Notifikasi gabungan dari event nyata milik user:
     * pembayaran berhasil, redeem kode promo, dan broadcast selesai.
     */
    public function index(Request $request)
    {
        $user  = $request->user();
        $items = collect();

        // ── Pembayaran / langganan berhasil ───────────────────────────────────
        Subscription::where('user_id', $user->id)
            ->whereNotNull('price_paid')
            ->latest()
            ->limit(10)
            ->get()
            ->each(function ($sub) use ($items) {
                $plan  = self::PLAN_LABELS[$sub->plan] ?? ucfirst((string) $sub->plan);
                $price = (int) $sub->price_paid;
                $items->push([
                    'id'         => 'sub-' . $sub->id,
                    'type'       => 'payment',
                    'title'      => 'Pembayaran berhasil 🎉',
                    'message'    => $price > 0
                        ? "Paket {$plan} aktif. Pembayaran Rp" . number_format($price, 0, ',', '.') . ' diterima.'
                        : "Paket {$plan} telah aktif.",
                    'created_at' => $sub->created_at,
                ]);
            });

        // ── Redeem kode promo ─────────────────────────────────────────────────
        PromoCodeUsage::with('promoCode:id,code')
            ->where('user_id', $user->id)
            ->latest()
            ->limit(10)
            ->get()
            ->each(function ($usage) use ($items) {
                $code     = $usage->promoCode->code ?? 'PROMO';
                $discount = (int) $usage->discount_amount;
                $items->push([
                    'id'         => 'promo-' . $usage->id,
                    'type'       => 'redeem',
                    'title'      => 'Redeem berhasil 🎟️',
                    'message'    => $discount > 0
                        ? "Kode {$code} dipakai. Hemat Rp" . number_format($discount, 0, ',', '.') . '.'
                        : "Kode {$code} berhasil dipakai.",
                    'created_at' => $usage->redeemed_at ?? $usage->created_at,
                ]);
            });

        // ── Broadcast selesai ─────────────────────────────────────────────────
        Broadcast::where('user_id', $user->id)
            ->whereIn('status', ['success', 'sent'])
            ->whereNotNull('sent_at')
            ->latest('sent_at')
            ->limit(10)
            ->get()
            ->each(function ($bc) use ($items) {
                $title = $bc->title ?: 'Broadcast';
                $items->push([
                    'id'         => 'bc-' . $bc->id,
                    'type'       => 'broadcast',
                    'title'      => 'Broadcast terkirim ✅',
                    'message'    => "\"{$title}\" berhasil dikirim.",
                    'created_at' => $bc->sent_at,
                ]);
            });

        $notifications = $items
            ->filter(fn ($n) => $n['created_at'] !== null)
            ->sortByDesc(fn ($n) => Carbon::parse($n['created_at'])->timestamp)
            ->take(20)
            ->map(fn ($n) => [
                'id'         => $n['id'],
                'type'       => $n['type'],
                'title'      => $n['title'],
                'message'    => $n['message'],
                'created_at' => Carbon::parse($n['created_at'])->toIso8601String(),
                'time'       => $this->humanTime(Carbon::parse($n['created_at'])),
            ])
            ->values();

        return response()->json($notifications);
    }

    /**
     * Waktu relatif singkat dalam bahasa Indonesia.
     */
    private function humanTime(Carbon $t): string
    {
        $now  = now();
        $secs = $t->diffInSeconds($now);

        if ($secs < 60)          return 'Baru saja';
        if ($secs < 3600)        return floor($secs / 60) . ' menit lalu';
        if ($secs < 86400)       return floor($secs / 3600) . ' jam lalu';
        if ($secs < 7 * 86400)   return floor($secs / 86400) . ' hari lalu';

        return $t->translatedFormat('d M Y');
    }
}
