<?php

use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\BroadcastController;
use App\Http\Controllers\ChannelController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\WhatsAppController;
use App\Http\Controllers\UploadController;
use Illuminate\Support\Facades\Route;

Route::middleware(\App\Http\Middleware\GuestUser::class)->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::apiResource('channels', ChannelController::class);
    Route::post('channels/{channel}/test', [ChannelController::class, 'test']);

    Route::post('whatsapp/connect', [WhatsAppController::class, 'connect']);
    Route::get('whatsapp/{channel}/qr', [WhatsAppController::class, 'qr']);
    Route::get('whatsapp/{channel}/status', [WhatsAppController::class, 'status']);
    Route::delete('whatsapp/{channel}/disconnect', [WhatsAppController::class, 'disconnect']);
    Route::get('whatsapp/{channel}/contacts', [WhatsAppController::class, 'getContacts']);
    Route::get('whatsapp/{channel}/chats', [WhatsAppController::class, 'getChats']);
    Route::get('whatsapp/{channel}/groups', [WhatsAppController::class, 'getGroups']);
    Route::get('whatsapp/{channel}/messages/{chatId}', [WhatsAppController::class, 'getMessages']);
    Route::get('whatsapp/{channel}/stream/messages/{chatId}', [WhatsAppController::class, 'streamMessages']);
    Route::get('whatsapp/{channel}/stream/chats', [WhatsAppController::class, 'streamChats']);
    Route::post('whatsapp/{channel}/send', [WhatsAppController::class, 'sendMessage']);

    Route::apiResource('broadcasts', BroadcastController::class);
    Route::post('broadcasts/{broadcast}/send', [BroadcastController::class, 'send']);
    Route::post('broadcasts/{broadcast}/cancel', [BroadcastController::class, 'cancel']);
    Route::get('broadcasts/{broadcast}/logs', [BroadcastController::class, 'logs']);

    Route::post('upload', [UploadController::class, 'upload']);

    Route::get('analytics/overview', [AnalyticsController::class, 'overview']);
    Route::get('analytics/broadcasts', [AnalyticsController::class, 'broadcasts']);
    Route::get('analytics/channels', [AnalyticsController::class, 'channels']);

    Route::get('billing/plans', [BillingController::class, 'plans']);
    Route::post('billing/purchase', [BillingController::class, 'purchase']);
    Route::get('billing/history', [BillingController::class, 'history']);
    Route::get('billing/active', [BillingController::class, 'active']);
});
