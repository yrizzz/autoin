<?php
header('Content-Type: text/plain');
echo "=== PM2 STATUS ===\n";
echo shell_exec('pm2 status 2>&1');
echo "\n=== PM2 LOGS FOR autoin-wa ===\n";
echo shell_exec('pm2 logs autoin-wa --lines 100 --nostream 2>&1');
echo "\n=== LARAVEL TAIL LOG ===\n";
echo shell_exec('tail -n 50 ' . escapeshellarg(dirname(__DIR__) . '/storage/logs/laravel.log') . ' 2>&1');
