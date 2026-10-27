<?php
// Copy to mail-config.php and fill in the mailbox details. mail-config.php
// holds the real password and is excluded from git.
return [
    'host'        => 'mail.example.com',
    'port'        => 465,              // implicit TLS (SSL)
    'username'    => 'mailbox@example.com',
    'password'    => '',
    'verify_peer' => true,             // set false only if the server's certificate doesn't match the host name

    // reCAPTCHA v3 (the matching site key is in assets/js/site.js); leave the secret empty to disable
    'recaptcha_secret'    => '',
    'recaptcha_min_score' => 0.5,      // 0.0 (bot) to 1.0 (human); raise to be stricter
];
