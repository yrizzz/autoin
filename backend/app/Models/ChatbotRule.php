<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatbotRule extends Model
{
    protected $fillable = ['user_id', 'channel_id', 'trigger', 'match_type', 'reply', 'media_url', 'media_type', 'platform', 'is_active', 'is_ai', 'reply_type', 'prefix', 'plugin_id', 'target_scope'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'is_ai' => 'boolean',
        ];
    }

    public function channel()
    {
        return $this->belongsTo(Channel::class);
    }

    public function plugin()
    {
        return $this->belongsTo(Plugin::class);
    }

    /**
     * Ambil argumen setelah prefix + trigger (untuk balasan via plugin).
     * Mengembalikan ['args' => [...], 'raw_args' => '...'].
     */
    public function extractArgs(string $text): array
    {
        $t = trim($text);

        // Buang 1 prefix di awal teks (kalau ada)
        foreach (['.', '/', '!', '#'] as $p) {
            if (str_starts_with($t, $p)) {
                $t = ltrim(substr($t, strlen($p)));
                break;
            }
        }

        // Buang prefix di awal trigger juga, lalu cari posisi trigger di teks
        $k = trim($this->trigger);
        foreach (['.', '/', '!', '#'] as $p) {
            if (str_starts_with($k, $p)) {
                $k = ltrim(substr($k, strlen($p)));
                break;
            }
        }

        $rest = $t;
        if ($k !== '') {
            $pos = mb_stripos($t, $k);
            if ($pos !== false) {
                $rest = mb_substr($t, $pos + mb_strlen($k));
            }
        }
        $rest = trim($rest);

        $args = $rest === '' ? [] : preg_split('/\s+/', $rest);

        return ['args' => $args, 'raw_args' => $rest];
    }

    public function matches(string $text): bool
    {
        if (!$this->is_active) return false;

        $t = mb_strtolower(trim($text));
        $k = mb_strtolower(trim($this->trigger));

        // Wildcard trigger '*' matches any incoming message
        if ($k === '*') {
            return true;
        }
        $rulePrefix = $this->prefix ?? 'any';

        // 1. If prefix is 'none' (Strictly no prefix)
        if ($rulePrefix === 'none') {
            foreach (['.', '/', '!', '#'] as $p) {
                if (str_starts_with($t, $p)) {
                    return false;
                }
            }
            return $this->compare($t, $k);
        }

        // 2. If prefix is specific (. , / , ! , #)
        if (in_array($rulePrefix, ['.', '/', '!', '#'])) {
            if (!str_starts_with($t, $rulePrefix)) {
                return false;
            }
            $strippedInput = ltrim(substr($t, strlen($rulePrefix)));
            return $this->compare($strippedInput, $k);
        }

        // 3. Default: prefix is 'any' (support all prefixes or no prefix)
        $prefixes = ['.', '/', '!', '#', ''];

        // Check if trigger itself starts with any prefix
        $triggerHasPrefix = false;
        foreach (['.', '/', '!', '#'] as $p) {
            if (str_starts_with($k, $p)) {
                $triggerHasPrefix = true;
                break;
            }
        }

        if ($triggerHasPrefix) {
            return $this->compare($t, $k);
        }

        foreach ($prefixes as $p) {
            $strippedInput = $t;
            if ($p !== '' && str_starts_with($t, $p)) {
                $strippedInput = ltrim(substr($t, strlen($p)));
            }

            if ($this->compare($strippedInput, $k)) {
                return true;
            }
        }

        return false;
    }

    private function compare(string $input, string $trigger): bool
    {
        return match ($this->match_type) {
            'exact'       => $input === $trigger,
            'starts_with' => str_starts_with($input, $trigger),
            default       => str_contains($input, $trigger), // contains
        };
    }
}
