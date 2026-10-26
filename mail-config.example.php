<?php
// Copy to mail-config.php and fill in the mailbox details. mail-config.php
// holds the real password and is excluded from git.
return [
    'host'        => 'mail.example.com',
    'port'        => 465,              // implicit TLS (SSL)
    'username'    => 'mailbox@example.com',
    'password'    => '',
    'verify_peer' => true,             // set false only if the server's certificate doesn't match the host name
];
