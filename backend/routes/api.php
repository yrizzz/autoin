<?php

use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\BroadcastController;
use App\Http\Controllers\ChannelController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ChatbotRuleController;
use App\Http\Controllers\PluginController;
use App\Http\Controllers\TemplateController;
use App\Http\Controllers\WhatsAppController;
use App\Http\Controllers\UploadController;
use App\Http\Controllers\WebhookController;
use App\Http\Controllers\AIController;
use App\Services\PlanLimits;
use Illuminate\Support\Facades\Route;

// Internal endpoint — called by Node.js services, no user auth required
Route::post('internal/chatbot/match', [ChatbotRuleController::class, 'matchInternal']);
Route::post('internal/plugins/report', [PluginController::class, 'reportInternal']);
Route::post('internal/whatsapp/sync', [WhatsAppController::class, 'syncInternal']);
Route::get('internal/whatsapp/sync-data', [WhatsAppController::class, 'getSyncInternal']);
Route::get('internal/whatsapp/auth', [WhatsAppController::class, 'getAuthInternal']);
Route::post('internal/whatsapp/auth', [WhatsAppController::class, 'saveAuthInternal']);
Route::delete('internal/whatsapp/auth', [WhatsAppController::class, 'deleteAuthInternal']);
Route::get('internal/whatsapp/sessions', [WhatsAppController::class, 'getSessionsInternal']);
Route::get('internal/whatsapp/media', [WhatsAppController::class, 'getMediaInternal']);
Route::get('internal/whatsapp/debug-logs', function() {
    $errLogPath = '/var/log/autoin/wa-err.log';
    $outLogPath = '/var/log/autoin/wa.log';
    
    $errContent = file_exists($errLogPath) ? file_get_contents($errLogPath) : 'No error log file found.';
    $outContent = file_exists($outLogPath) ? file_get_contents($outLogPath) : 'No out log file found.';
    
    $getLastLines = function($content, $lineCount = 1000) {
        $lines = explode("\n", $content);
        $lines = array_slice($lines, -$lineCount);
        return implode("\n", $lines);
    };
    
    $searchLogs = function($content, $keywords) {
        $lines = explode("\n", $content);
        $matches = [];
        foreach ($lines as $line) {
            foreach ($keywords as $kw) {
                if (stripos($line, $kw) !== false) {
                    $matches[] = $line;
                    break;
                }
            }
        }
        return array_slice($matches, -100);
    };
    
    return response()->json([
        'error_log' => $getLastLines($errContent, 1000),
        'out_log' => $getLastLines($outContent, 1000),
        'searches' => $searchLogs($outContent, ['ammy', 'tasya', 'media', 'proxy', 'fetch', 'error', 'send'])
    ]);
});

// Webhook trigger — public, auth via X-Webhook-Secret header
Route::post('webhooks/trigger/{uuid}', [WebhookController::class, 'trigger']);

// Duitku IPN Callback
Route::post('duitku/callback', [\App\Http\Controllers\BillingController::class, 'callback'])->name('duitku.callback');

// Unauthorized fallback route
Route::get('login', function () {
    return response()->json(['message' => 'Unauthorized.'], 401);
})->name('login');

Route::middleware(['auth:api', 'throttle:api'])->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::get('/notifications', [\App\Http\Controllers\NotificationController::class, 'index']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/api-key', [AuthController::class, 'getApiKey']);
    Route::post('/api-key', [AuthController::class, 'generateApiKey']);
    Route::delete('/api-key', [AuthController::class, 'revokeApiKey']);
    Route::post('/api-key/whitelist', [AuthController::class, 'updateApiKeyWhitelist']);
    Route::get('/me/limits', function (\Illuminate\Http\Request $r) {
        return response()->json(PlanLimits::usageSummary($r->user()));
    });

    Route::apiResource('templates', TemplateController::class)->except(['show']);

    Route::apiResource('channels', ChannelController::class);
    Route::post('channels/{channel}/test', [ChannelController::class, 'test']);

    Route::post('whatsapp/connect', [WhatsAppController::class, 'connect']);
    Route::get('whatsapp/{channel}/qr', [WhatsAppController::class, 'qr']);
    Route::get('whatsapp/{channel}/status', [WhatsAppController::class, 'status']);
    Route::delete('whatsapp/{channel}/disconnect', [WhatsAppController::class, 'disconnect']);
    Route::get('whatsapp/{channel}/contacts', [WhatsAppController::class, 'getContacts']);
    Route::post('whatsapp/{channel}/contacts', [WhatsAppController::class, 'updateContacts']);
    Route::get('whatsapp/{channel}/chats', [WhatsAppController::class, 'getChats']);
    Route::get('whatsapp/{channel}/groups', [WhatsAppController::class, 'getGroups']);
    Route::get('whatsapp/{channel}/groups-realtime', [WhatsAppController::class, 'getGroupsRealtime']);
    Route::get('whatsapp/{channel}/groups/{groupId}', [WhatsAppController::class, 'getGroupMetadata']);
    Route::get('whatsapp/{channel}/messages/{chatId}', [WhatsAppController::class, 'getMessages']);
    Route::get('whatsapp/{channel}/stream/messages/{chatId}', [WhatsAppController::class, 'streamMessages']);
    Route::get('whatsapp/{channel}/stream/chats', [WhatsAppController::class, 'streamChats']);
    Route::post('whatsapp/{channel}/send', [WhatsAppController::class, 'sendMessage']);
    Route::post('whatsapp/{channel}/sync', [WhatsAppController::class, 'syncChats']);
    Route::post('whatsapp/{channel}/flush', [WhatsAppController::class, 'flushSession']);
    Route::get('api-logs', [WhatsAppController::class, 'getApiLogs']);
    Route::delete('api-logs', [WhatsAppController::class, 'clearApiLogs']);

    Route::apiResource('broadcasts', BroadcastController::class);
    Route::post('broadcasts/{broadcast}/send', [BroadcastController::class, 'send']);
    Route::post('broadcasts/{broadcast}/duplicate', [BroadcastController::class, 'duplicate']);
    Route::post('broadcasts/{broadcast}/cancel', [BroadcastController::class, 'cancel']);
    Route::get('broadcasts/{broadcast}/logs', [BroadcastController::class, 'logs']);

    Route::get('chatbot-settings', [ChatbotRuleController::class, 'getSettings']);
    Route::post('chatbot-settings', [ChatbotRuleController::class, 'saveSettings']);
    Route::apiResource('chatbot-rules', ChatbotRuleController::class)->except(['show']);

    Route::get('plugins/public', [PluginController::class, 'publicIndex']);
    Route::apiResource('plugins', PluginController::class)->except(['show']);
    Route::post('plugins/{plugin}/test', [PluginController::class, 'test']);

    // Admin: pantau & kelola semua plugin lintas user
    Route::get('admin/plugins', [PluginController::class, 'adminIndex']);
    Route::post('admin/plugins/{plugin}/toggle', [PluginController::class, 'adminToggle']);
    Route::post('admin/plugins/{plugin}/test', [PluginController::class, 'adminTest']);
    Route::delete('admin/plugins/{plugin}', [PluginController::class, 'adminDestroy']);

    Route::apiResource('webhooks', WebhookController::class)->except(['show']);

    Route::post('upload', [UploadController::class, 'upload']);

    Route::post('ai/rewrite', [AIController::class, 'rewrite']);
    Route::post('ai/generate', [AIController::class, 'generate']);
    Route::post('ai/optimize', [AIController::class, 'optimize']);
    Route::post('ai/plugin', [AIController::class, 'generatePlugin']);

    Route::get('analytics/overview', [AnalyticsController::class, 'overview']);
    Route::get('analytics/broadcasts', [AnalyticsController::class, 'broadcasts']);
    Route::get('analytics/channels', [AnalyticsController::class, 'channels']);

    Route::get('billing/plans', [BillingController::class, 'plans']);
    Route::post('billing/purchase', [BillingController::class, 'purchase']);
    Route::get('billing/history', [BillingController::class, 'history']);
    Route::get('billing/active', [BillingController::class, 'active']);
    Route::get('billing/config', [BillingController::class, 'config']);
    Route::get('admin/subscribers', [BillingController::class, 'subscribers']);
    Route::get('admin/settings', [\App\Http\Controllers\AdminController::class, 'getAdminSettings']);
    Route::post('admin/settings', [\App\Http\Controllers\AdminController::class, 'saveAdminSettings']);
    Route::post('admin/subscribers/{user}/extend', [\App\Http\Controllers\AdminController::class, 'extendSubscription']);
    Route::delete('admin/subscribers/{user}', [\App\Http\Controllers\AdminController::class, 'deleteUser']);
    Route::delete('admin/subscribers/{user}/subscription', [\App\Http\Controllers\AdminController::class, 'cancelSubscription']);
    Route::get('admin/broadcasts', [\App\Http\Controllers\AdminController::class, 'getAdminBroadcasts']);
    Route::get('admin/api-logs', [\App\Http\Controllers\AdminController::class, 'getAdminApiLogs']);
    Route::get('admin/channels', [\App\Http\Controllers\AdminController::class, 'getAdminChannels']);
    Route::delete('admin/channels/{channel}', [\App\Http\Controllers\AdminController::class, 'deleteAdminChannel']);
    Route::get('announcement', [\App\Http\Controllers\AdminController::class, 'getPublicAnnouncement']);

    // Promo Codes API
    Route::post('billing/promo/check', [\App\Http\Controllers\PromoCodeController::class, 'check']);
    Route::post('billing/promo/redeem', [\App\Http\Controllers\PromoCodeController::class, 'redeem']);
    Route::get('admin/promo-codes', [\App\Http\Controllers\PromoCodeController::class, 'index']);
    Route::post('admin/promo-codes', [\App\Http\Controllers\PromoCodeController::class, 'store']);
    Route::post('admin/promo-codes/{promoCode}/toggle', [\App\Http\Controllers\PromoCodeController::class, 'toggle']);
    Route::delete('admin/promo-codes/{promoCode}', [\App\Http\Controllers\PromoCodeController::class, 'destroy']);
});
