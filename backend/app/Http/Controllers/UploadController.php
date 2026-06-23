<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Str;

class UploadController extends Controller
{
    // WhatsApp-supported MIME types
    private const ALLOWED_MIMES = [
        // Images
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        // Video
        'video/mp4', 'video/3gp', 'video/avi', 'video/mkv',
        // Audio
        'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/aac', 'audio/wav',
        // Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain', 'text/csv',
        'application/zip', 'application/x-rar-compressed',
        'application/octet-stream',
    ];

    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:65536', // Max 64MB
        ]);

        $file = $request->file('file');
        $mime = $file->getMimeType();

        // Detect media type
        $mediaType = 'document';
        if (str_starts_with($mime, 'image/'))       $mediaType = 'image';
        elseif (str_starts_with($mime, 'video/'))   $mediaType = 'video';
        elseif (str_starts_with($mime, 'audio/'))   $mediaType = 'audio';
        elseif ($mime === 'application/pdf')         $mediaType = 'pdf';

        $extension    = $file->getClientOriginalExtension();
        $filename     = Str::random(20) . '.' . $extension;
        $originalName = $file->getClientOriginalName();
        $size         = $file->getSize();

        $disk = env('FILESYSTEM_DISK', 'public');
        
        $path = $file->storeAs('uploads', $filename, [
            'disk'       => $disk,
            'visibility' => 'public',
        ]);

        $url = \Illuminate\Support\Facades\Storage::disk($disk)->url($path);

        return response()->json([
            'url'       => $url,
            'mediaType' => $mediaType,
            'mime'      => $mime,
            'name'      => $originalName,
            'size'      => $size,
        ]);
    }
}
