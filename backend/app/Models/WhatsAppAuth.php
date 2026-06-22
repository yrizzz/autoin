<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WhatsAppAuth extends Model
{
    protected $table = 'whatsapp_auths';

    protected $fillable = ['session_id', 'key', 'value'];

    protected function casts(): array
    {
        return [
            'value' => 'array',
        ];
    }
}
