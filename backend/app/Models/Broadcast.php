<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Broadcast extends Model
{
    protected $fillable = [
        'user_id', 'title', 'content', 'media_url', 'media_type',
        'status', 'scheduled_at', 'recurring', 'sent_at',
        'delay_min', 'delay_max', 'chunk_size', 'chunk_delay_min', 'chunk_delay_max',
        'auto_tag_members',
        // Anti-ban v2
        'spintax_enabled', 'shuffle_recipients', 'typing_simulation', 'cancel_requested',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_at'       => 'datetime',
            'sent_at'            => 'datetime',
            'auto_tag_members'   => 'array',
            'spintax_enabled'    => 'boolean',
            'shuffle_recipients' => 'boolean',
            'typing_simulation'  => 'boolean',
            'cancel_requested'   => 'boolean',
        ];
    }

    /**
     * Parse spintax: {opsi1|opsi2|opsi3} → pilih satu secara acak.
     * Mendukung nested spintax, mis: {Halo {kak|bro}|Hai}
     */
    public static function parseSpintax(string $text): string
    {
        // Proses dari dalam ke luar (greedy dari yang paling dalam)
        while (preg_match('/\{([^{}]+)\}/', $text, $m)) {
            $options = explode('|', $m[1]);
            $chosen  = $options[array_rand($options)];
            $text    = str_replace($m[0], $chosen, $text);
        }
        return $text;
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function targets()
    {
        return $this->hasMany(BroadcastTarget::class);
    }

    public function channels()
    {
        return $this->hasManyThrough(Channel::class, BroadcastTarget::class, 'broadcast_id', 'id', 'id', 'channel_id');
    }

    public function logs()
    {
        return $this->hasMany(BroadcastLog::class);
    }
}
