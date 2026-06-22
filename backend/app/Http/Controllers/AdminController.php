<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Subscription;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    private function getSettingsPath()
    {
        return storage_path('app/admin_settings.json');
    }

    private function getSettings()
    {
        $path = $this->getSettingsPath();
        if (!file_exists($path)) {
            return [
                'duitku_merchant_code' => '',
                'duitku_api_key' => '',
                'duitku_project_id' => '',
                'duitku_sandbox' => true,
                'payment_gateway_enabled' => false,
                'payment_whatsapp_number' => '6281296451923',
                'announcement_text' => '',
                'announcement_enabled' => false,
                'announcement_type' => 'info', // info, warning, success
            ];
        }
        $settings = json_decode(file_get_contents($path), true);
        if (!isset($settings['payment_gateway_enabled'])) {
            $settings['payment_gateway_enabled'] = false;
        }
        if (empty($settings['payment_whatsapp_number'])) {
            $settings['payment_whatsapp_number'] = '6281296451923';
        }
        return $settings;
    }

    public function getAdminSettings(Request $request)
    {
        abort_if(strtolower($request->user()->email) !== 'arisedyhandoko@gmail.com', 403, 'Unauthorized.');
        return response()->json($this->getSettings());
    }

    public function saveAdminSettings(Request $request)
    {
        abort_if(strtolower($request->user()->email) !== 'arisedyhandoko@gmail.com', 403, 'Unauthorized.');
        
        $data = $request->validate([
            'duitku_merchant_code' => 'nullable|string',
            'duitku_api_key' => 'nullable|string',
            'duitku_project_id' => 'nullable|string',
            'duitku_sandbox' => 'required|boolean',
            'payment_gateway_enabled' => 'required|boolean',
            'payment_whatsapp_number' => 'nullable|string',
            'announcement_text' => 'nullable|string',
            'announcement_enabled' => 'required|boolean',
            'announcement_type' => 'required|in:info,warning,success',
        ]);

        file_put_contents($this->getSettingsPath(), json_encode($data));

        return response()->json(['message' => 'Settings saved successfully', 'settings' => $data]);
    }

    public function getPublicAnnouncement()
    {
        $settings = $this->getSettings();
        if (empty($settings['announcement_enabled'])) {
            return response()->json(null);
        }
        return response()->json([
            'text' => $settings['announcement_text'],
            'type' => $settings['announcement_type'],
        ]);
    }

    public function extendSubscription(Request $request, User $user)
    {
        abort_if(strtolower($request->user()->email) !== 'arisedyhandoko@gmail.com', 403, 'Unauthorized.');

        $data = $request->validate([
            'plan'      => 'required|in:free,daily,monthly,yearly',
            'days'      => 'required|integer|min:1',
            'overwrite' => 'nullable|boolean',
        ]);

        $sub = $user->subscription;

        if (!$sub) {
            $sub = new Subscription();
            $sub->user_id = $user->id;
            $sub->plan = $data['plan'];
            $sub->started_at = now();
            $sub->expires_at = now()->addDays($data['days']);
        } else {
            $sub->plan = $data['plan'];
            $currentExpire = $sub->expires_at ? now()->parse($sub->expires_at) : now();
            if ($currentExpire->isPast() || !empty($data['overwrite'])) {
                $sub->expires_at = now()->addDays($data['days']);
            } else {
                $sub->expires_at = $currentExpire->addDays($data['days']);
            }
        }

        $sub->payment_id = 'DIRECT-ADMIN';
        $sub->price_paid = 0;
        $sub->save();

        return response()->json([
            'message' => 'Subscription updated successfully',
            'subscription' => $sub
        ]);
    }

    public function deleteUser(Request $request, User $user)
    {
        abort_if(strtolower($request->user()->email) !== 'arisedyhandoko@gmail.com', 403, 'Unauthorized.');

        // Prevent admin deleting themselves
        abort_if($user->id === $request->user()->id, 422, 'Anda tidak dapat menghapus akun Anda sendiri.');

        $user->delete();

        return response()->json([
            'message' => 'Pengguna berhasil dihapus.'
        ]);
    }

    public function cancelSubscription(Request $request, User $user)
    {
        abort_if(strtolower($request->user()->email) !== 'arisedyhandoko@gmail.com', 403, 'Unauthorized.');

        if ($user->subscription) {
            $user->subscription->delete();
        }

        return response()->json([
            'message' => 'Langganan pengguna berhasil dihapus/dibatalkan.'
        ]);
    }
}
