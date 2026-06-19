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

        $extension = $file->getClientOriginalExtension();
        $filename  = Str::random(20) . '.' . $extension;

        if (!file_exists(public_path('uploads'))) {
            mkdir(public_path('uploads'), 0755, true);
        }

        $file->move(public_path('uploads'), $filename);

        return response()->json([
            'url'       => asset('uploads/' . $filename),
            'mediaType' => $mediaType,
            'mime'      => $mime,
            'name'      => $file->getClientOriginalName(),
            'size'      => $file->getSize(),
        ]);
    }
}
