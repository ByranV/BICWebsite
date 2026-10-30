<?php
/**
 * Enquiry form handler for the website's "Contact me" / interview forms.
 *
 * Receives the JSON POST sent by assets/js/site.js (CONFIG.formEndpoint) and
 * emails it by logging in to the hosting server's mailbox over SMTP. The
 * mailbox credentials live in mail-config.php (not committed to git).
 *
 * The recipient is fixed here on the server and is never taken from the
 * browser, so this script can't be used to send mail to arbitrary addresses.
 */

// ---- Settings ---------------------------------------------------------------
const MAIL_TO   = 'systemssupport@bicollege.co.za'; // where enquiries are delivered
const MAIL_CC   = 'website@bicollege.co.za';     // copied on every enquiry ('' for none)
const FROM_NAME = 'BIC Website';                 // mail is sent from the SMTP mailbox in mail-config.php
// "Contact us" forms for these campuses go to the listed addresses instead
// (subject "Contact Me Request: <campus>"). Keys are lower-case campus names.
const CONTACT_TO = [
    'bryanston campus' => ['systemssupport@bicollege.co.za', 'website@bicollege.co.za', 'AcademicAdmin@bicollege.co.za'],
    'pretoria campus'  => ['systemssupport@bicollege.co.za', 'website@bicollege.co.za', 'AcademicAdmin@bicollege.co.za'],
    'distance campus'  => ['systemssupport@bicollege.co.za', 'website@bicollege.co.za', 'studentadvisor2@bidc.co.za'],
];
// "Request an Interview" forms for these campuses go to the listed addresses instead
// (subject "<Bryanston> College Website - Request for Interview").
const INTERVIEW_TO = [
    'bryanston campus' => ['systemssupport@bicollege.co.za', 'website@bicollege.co.za', 'AcademicAdmin@bicollege.co.za'],
    'pretoria campus'  => ['systemssupport@bicollege.co.za', 'website@bicollege.co.za', 'AcademicAdmin@bicollege.co.za'],
];
const RATE_MAX    = 5;                            // max submissions per visitor IP...
const RATE_WINDOW = 600;                          // ...within this many seconds
// -----------------------------------------------------------------------------

date_default_timezone_set('Africa/Johannesburg');

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function respond(int $code, array $body): void
{
    http_response_code($code);
    echo json_encode($body);
    exit;
}

// Strip CR/LF and other control characters (blocks email header injection).
function one_line(string $s): string
{
    return trim(preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $s) ?? '');
}

// Send a prepared message through an SMTP server over implicit TLS (port 465)
// with AUTH LOGIN. Throws RuntimeException on any failure.
function smtp_send(array $cfg, string $from, array $recipients, string $message): void
{
    $host = $cfg['host'];
    $ctx = stream_context_create(['ssl' => [
        'peer_name'        => $host,
        'verify_peer'      => $cfg['verify_peer'] ?? true,
        'verify_peer_name' => $cfg['verify_peer'] ?? true,
    ]]);
    $fp = @stream_socket_client("ssl://$host:{$cfg['port']}", $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $ctx);
    if (!$fp) {
        throw new RuntimeException("connect failed: $errstr ($errno)");
    }
    stream_set_timeout($fp, 15);

    // Send a command (unless null) and check the reply code; replies may span several lines.
    $cmd = function (?string $line, array $expect, string $logAs = '') use ($fp): void {
        if ($line !== null) {
            fwrite($fp, $line . "\r\n");
        }
        $reply = '';
        while (($l = fgets($fp, 1024)) !== false) {
            $reply .= $l;
            if (strlen($l) < 4 || $l[3] === ' ') {
                break;
            }
        }
        if (!in_array((int) substr($reply, 0, 3), $expect, true)) {
            throw new RuntimeException(($logAs ?: (string) $line) . ' -> ' . trim($reply));
        }
    };

    try {
        $cmd(null, [220]);
        $cmd('EHLO ' . one_line($_SERVER['SERVER_NAME'] ?? 'localhost'), [250]);
        $cmd('AUTH LOGIN', [334]);
        $cmd(base64_encode($cfg['username']), [334], 'AUTH username');
        $cmd(base64_encode($cfg['password']), [235], 'AUTH password');
        $cmd("MAIL FROM:<$from>", [250]);
        foreach ($recipients as $rcpt) {
            $cmd("RCPT TO:<$rcpt>", [250, 251]);
        }
        $cmd('DATA', [354]);
        // Normalise line endings and dot-stuff lines that start with ".".
        $message = preg_replace('/\r?\n/', "\r\n", $message);
        $message = preg_replace('/^\./m', '..', $message);
        $cmd($message . "\r\n.", [250], 'DATA body');
        $cmd('QUIT', [221]);
    } finally {
        fclose($fp);
    }
}

// Ask Google whether a reCAPTCHA v3 token is genuine. Returns the decoded reply, or null
// if Google couldn't be reached.
function recaptcha_verify(string $secret, string $token, string $ip): ?array
{
    $post = http_build_query(['secret' => $secret, 'response' => $token, 'remoteip' => $ip]);
    $ctx = stream_context_create(['http' => [
        'method'  => 'POST',
        'header'  => "Content-Type: application/x-www-form-urlencoded\r\n",
        'content' => $post,
        'timeout' => 10,
    ]]);
    $reply = @file_get_contents('https://www.google.com/recaptcha/api/siteverify', false, $ctx);
    $json = $reply === false ? null : json_decode($reply, true);
    return is_array($json) ? $json : null;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, ['ok' => false, 'error' => 'Method not allowed']);
}

// Only accept posts from this site's own pages.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$originHost = parse_url($origin, PHP_URL_HOST) . (parse_url($origin, PHP_URL_PORT) ? ':' . parse_url($origin, PHP_URL_PORT) : '');
if ($origin !== '' && strcasecmp($originHost, $_SERVER['HTTP_HOST'] ?? '') !== 0) {
    respond(403, ['ok' => false, 'error' => 'Forbidden']);
}

$raw = file_get_contents('php://input', false, null, 0, 20000);
$data = json_decode($raw ?: '', true);
if (!is_array($data) || count($data) > 30) {
    respond(400, ['ok' => false, 'error' => 'Invalid request']);
}

// Honeypot: real visitors never see or fill this field. Pretend success to bots.
if (!empty($data['_hp'])) {
    respond(200, ['ok' => true]);
}

$smtp = @include __DIR__ . '/mail-config.php';
if (!is_array($smtp)) {
    error_log('contact.php: mail-config.php is missing or invalid');
    respond(500, ['ok' => false, 'error' => 'Mail could not be sent']);
}

$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

// reCAPTCHA v3: the page sends a token in `_recaptcha`; reject likely bots.
// Skipped only if no secret key is configured in mail-config.php.
if (!empty($smtp['recaptcha_secret'])) {
    $token = is_string($data['_recaptcha'] ?? null) ? $data['_recaptcha'] : '';
    $check = $token === '' ? null : recaptcha_verify($smtp['recaptcha_secret'], $token, $ip);
    $minScore = (float) ($smtp['recaptcha_min_score'] ?? 0.5);
    if (!$check || empty($check['success'])
        || ($check['action'] ?? '') !== 'contact'
        || (float) ($check['score'] ?? 0) < $minScore) {
        error_log('contact.php: reCAPTCHA rejected: ' . ($check ? json_encode($check) : ($token === '' ? 'no token' : 'verify request failed')));
        respond(403, ['ok' => false, 'error' => 'Spam check failed']);
    }
}

// Simple per-IP rate limit (best effort; skipped if the temp folder isn't writable).
$rateFile = sys_get_temp_dir() . '/bic_contact_' . md5($ip);
$now = time();
$hits = [];
if (is_readable($rateFile)) {
    $hits = array_filter(
        array_map('intval', explode(',', (string) file_get_contents($rateFile))),
        fn ($t) => $t > $now - RATE_WINDOW
    );
}
if (count($hits) >= RATE_MAX) {
    respond(429, ['ok' => false, 'error' => 'Too many submissions. Please try again later.']);
}
$hits[] = $now;
@file_put_contents($rateFile, implode(',', $hits), LOCK_EX);

// Build the message body and find the visitor's email address and campus.
$replyTo = '';
$campus = '';
$name = '';
$isContactForm = false;   // "Contact us" forms have a "Name" field...
$isInterviewForm = false; // ...interview forms use "Parent First Name"
$lines = [];

foreach ($data as $key => $value) {
    if (!is_string($key) || $key === '' || $key[0] === '_' || !is_scalar($value)) {
        continue;
    }
    $label = mb_substr(one_line($key), 0, 60);
    $value = mb_substr(trim(str_replace("\r", '', (string) $value)), 0, 5000);
    if ($value === '') {
        continue;
    }
    if ($replyTo === '' && stripos($label, 'email') !== false
        && filter_var($value, FILTER_VALIDATE_EMAIL)) {
        $replyTo = $value;
    }
    if ($campus === '' && stripos($label, 'campus') !== false) {
        $campus = one_line($value); // the form's campus dropdown (or hidden campus field)
    }
    if ($name === '' && in_array(strtolower($label), ['name', 'parent first name'], true)) {
        $name = $value;
    }
    if (strtolower($label) === 'name') {
        $isContactForm = true;
    }
    if (strtolower($label) === 'parent first name') {
        $isInterviewForm = true;
    }
    $lines[] = strpos($value, "\n") !== false
        ? $label . ":\n" . $value
        : $label . ': ' . $value;
}

if (!$lines) {
    respond(400, ['ok' => false, 'error' => 'Empty message']);
}
if ($name === '') {
    respond(400, ['ok' => false, 'error' => 'Please enter your name']);
}

// "Bryanston Campus" -> subject "Bryanston College Website Enquiry",
// greeting "...website enquiry for Bryanston campus below".
$campus = mb_substr($campus, 0, 60);
if (preg_match('/^(.+?)\s+campus$/i', $campus, $m)) {
    $subject = $m[1] . ' College Website Enquiry';
    $forWhom = $m[1] . ' campus';
} elseif ($campus !== '') {
    $subject = $campus . ' Website Enquiry'; // e.g. "Preparatory School"
    $forWhom = $campus;
} else {
    $subject = 'BIC Website Enquiry';
    $forWhom = 'BIC';
}

$to = [MAIL_TO];
$cc = MAIL_CC;
$greeting = "Good day BIC Website Contact\n\n"
    . "Please see website enquiry for $forWhom below.";
if ($isContactForm && isset(CONTACT_TO[strtolower($campus)])) {
    $subject = 'Contact Me Request: ' . $campus;
    $to = CONTACT_TO[strtolower($campus)];
    $cc = '';
    $greeting = "Good day BIC Team\n\n"
        . "Please find below the details of a contact request for the $campus, submitted via the college website.";
} elseif ($isInterviewForm && isset(INTERVIEW_TO[strtolower($campus)])) {
    $subject = preg_replace('/\s+campus$/i', '', $campus) . ' College Website - Request for Interview';
    $to = INTERVIEW_TO[strtolower($campus)];
    $cc = '';
    $greeting = "Good day BIC Team\n\n"
        . "Please find below the details of a request for an interview at the $campus, submitted via the college website.";
}

$body = $greeting . "\n\n"
    . implode("\n\n", $lines)
    . "\n\n--\nSent from the website enquiry form"
    . "\nPage: " . one_line($_SERVER['HTTP_REFERER'] ?? 'unknown')
    . "\nIP: " . $ip
    . "\nTime: " . date('Y-m-d H:i:s T');

$from = $smtp['username'];

$headers = [
    'Date'                      => date('r'),
    'From'                      => mb_encode_mimeheader(FROM_NAME) . ' <' . $from . '>',
    'To'                        => implode(', ', $to),
    'Subject'                   => mb_encode_mimeheader($subject, 'UTF-8'),
    'Message-ID'                => '<' . bin2hex(random_bytes(12)) . '@' . substr(strrchr($from, '@'), 1) . '>',
    'MIME-Version'              => '1.0',
    'Content-Type'              => 'text/plain; charset=UTF-8',
    'Content-Transfer-Encoding' => '8bit',
    'X-Mailer'                  => 'BIC website',
];
if ($cc !== '') {
    $headers['Cc'] = $cc;
}
if ($replyTo !== '') {
    $headers['Reply-To'] = $replyTo; // "Reply" in your mail app goes to the visitor
}

$message = '';
foreach ($headers as $name => $value) {
    $message .= "$name: $value\r\n";
}
$message .= "\r\n" . $body;

$recipients = array_filter(array_merge($to, [$cc]));

try {
    smtp_send($smtp, $from, $recipients, $message);
} catch (RuntimeException $e) {
    error_log('contact.php: SMTP send failed for subject "' . $subject . '": ' . $e->getMessage());
    respond(500, ['ok' => false, 'error' => 'Mail could not be sent']);
}

respond(200, ['ok' => true]);
