<?php

return [
    'paths'                    => ['api/*', 'auth/*'],
    'allowed_methods'          => ['*'],
    'allowed_origins'          => [
        'http://localhost:4321',
        'http://localhost:4322',
        'http://127.0.0.1:4321',
        'http://127.0.0.1:4322',
        'http://localhost:3000',
        'https://dashboard.autoin.id',
        'https://autoin.id',
        env('FRONTEND_URL'),
    ],
    'allowed_origins_patterns' => [],
    'allowed_headers'          => ['*'],
    'exposed_headers'          => [],
    'max_age'                  => 0,
    'supports_credentials'     => true,
];
