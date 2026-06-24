<?php

namespace App\Console\Commands;

use App\Models\ChatbotRule;
use App\Models\Plugin;
use App\Models\User;
use Illuminate\Console\Command;

class InstallPluginPresets extends Command
{
    /**
     * Contoh:
     *   php artisan plugins:install-presets arisedyhandoko@gmail.com
     *   php artisan plugins:install-presets user@mail.com --skip-image
     */
    protected $signature = 'plugins:install-presets
        {email : Email user tujuan}
        {--skip-image : Lewati plugin olah-gambar (removebg/hd/bg/convert) yang butuh redeploy WA service}
        {--inactive : Pasang plugin & rule dalam keadaan nonaktif}';

    protected $description = 'Pasang plugin siap-pakai + daftarkan sebagai rule chatbot untuk seorang user (idempotent).';

    public function handle(): int
    {
        $email = $this->argument('email');
        $user  = User::whereRaw('LOWER(email) = ?', [strtolower($email)])->first();
        if (!$user) {
            $this->error("User dengan email \"{$email}\" tidak ditemukan.");
            return self::FAILURE;
        }

        $path = database_path('presets/plugins.json');
        if (!is_file($path)) {
            $this->error("File preset tidak ada: {$path}");
            return self::FAILURE;
        }

        $presets = json_decode(file_get_contents($path), true);
        if (!is_array($presets)) {
            $this->error('presets/plugins.json tidak valid.');
            return self::FAILURE;
        }

        $active = !$this->option('inactive');
        $created = 0; $updated = 0; $skipped = 0;

        foreach ($presets as $p) {
            if (($p['needs_media'] ?? false) && $this->option('skip-image')) {
                $skipped++;
                $this->line("  ↷ lewati {$p['name']} (butuh media)");
                continue;
            }

            // ── Plugin: cari berdasarkan user + name, update kalau ada ──
            $plugin = Plugin::where('user_id', $user->id)->where('name', $p['name'])->first();
            $pluginData = [
                'description' => $p['description'] ?? null,
                'usage'       => $p['usage'] ?? null,
                'code'        => $p['code'],
                'is_active'   => $active,
                'timeout_ms'  => $p['timeout_ms'] ?? 8000,
            ];

            if ($plugin) {
                $plugin->update($pluginData);
                $updated++;
                $verb = 'update';
            } else {
                $plugin = $user->plugins()->create(array_merge($pluginData, ['name' => $p['name']]));
                $created++;
                $verb = 'buat ';
            }

            // ── Chatbot rule: cari berdasarkan user + plugin_id, update kalau ada ──
            $rule = ChatbotRule::where('user_id', $user->id)
                ->where('plugin_id', $plugin->id)
                ->first();

            $ruleData = [
                'trigger'    => $p['trigger'],
                'match_type' => $p['match_type'] ?? 'starts_with',
                'prefix'     => $p['prefix'] ?? '.',
                'reply'      => '',
                'platform'   => 'all',
                'reply_type' => 'normal',
                'is_active'  => $active,
                'is_ai'      => false,
                'plugin_id'  => $plugin->id,
            ];

            if ($rule) {
                $rule->update($ruleData);
            } else {
                $user->chatbotRules()->create($ruleData);
            }

            $this->line(sprintf('  ✔ %s  %-22s → %s%s',
                $verb, $p['usage'], $p['name'], $active ? '' : ' (nonaktif)'));
        }

        $this->newLine();
        $this->info("Selesai untuk {$user->email}: {$created} dibuat, {$updated} diperbarui, {$skipped} dilewati.");
        if (!$this->option('skip-image')) {
            $this->warn('Catatan: plugin olah-gambar (removebg/hd/bg/convert) baru berfungsi setelah WA service di-redeploy (ctx.media + helpers.upload).');
        }

        return self::SUCCESS;
    }
}
