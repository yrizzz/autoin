<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatbotRule extends Model
{
    protected $fillable = ['user_id', 'trigger', 'match_type', 'reply', 'platform', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function matches(string $text): bool
    {
        if (!$this->is_active) return false;

        $t = mb_strtolower(trim($text));
        $k = mb_strtolower(trim($this->trigger));

        return match ($this->match_type) {
            'exact'       => $t === $k,
            'starts_with' => str_starts_with($t, $k),
            default       => str_contains($t, $k), // contains
        };
    }
}
