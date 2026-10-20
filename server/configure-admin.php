<?php
// CLI ONLY. Generate a private environment file without logging credentials or hashes.
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$target = $argv[1] ?? '';
if ($target === '' || !preg_match('~^(?:[A-Za-z]:[\\\\/]|/)~', $target) || !is_dir(dirname($target))) {
    fwrite(STDERR, "Provide the absolute path to ilaw-auth.env OUTSIDE the website's public directory.\n"); exit(1);
}
$parent = realpath(dirname($target));
if (basename($target) !== 'ilaw-auth.env' || preg_match('~(?:^|[\\\\/])(?:public_html|public|out)(?:[\\\\/]|$)~i', $parent)) {
    fwrite(STDERR, "Refusing to place the credential file in a public directory.\n"); exit(1);
}
$input = json_decode(stream_get_contents(STDIN), true);
$username = $input['username'] ?? '';
$password = $input['password'] ?? '';
$origin = $input['origin'] ?? 'https://ilaw.lenybuilds.com';
if (!is_string($username) || !preg_match('/^[A-Za-z0-9_.-]{3,100}$/D', $username)
    || !is_string($password) || strlen($password) < 12 || strlen($password) > 72
    || !is_string($origin) || !preg_match('~^https://[A-Za-z0-9.-]+$~D', $origin)) {
    fwrite(STDERR, "Supply JSON on stdin with a valid username, a 12–72-byte password, and an HTTPS origin.\n"); exit(1);
}
$algorithm = defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_BCRYPT;
$options = $algorithm === PASSWORD_BCRYPT ? ['cost' => 12] : ['memory_cost' => 65536, 'time_cost' => 4, 'threads' => 1];
$hash = password_hash($password, $algorithm, $options);
$secret = bin2hex(random_bytes(32));
$file = fopen($parent . '/ilaw-auth.env', 'x');
if (!$file) { fwrite(STDERR, "Credential file already exists or cannot be created. Back it up before changing credentials.\n"); exit(1); }
chmod($parent . '/ilaw-auth.env', 0600);
$contents = "ILAW_ADMIN_USERNAME=" . $username . "\nILAW_ADMIN_PASSWORD_HASH=" . $hash . "\nSESSION_SECRET=" . $secret . "\nILAW_SITE_ORIGIN=" . $origin . "\n";
$written = fwrite($file, $contents) === strlen($contents) && fflush($file);
fclose($file);
unset($input, $password, $hash, $secret, $contents);
if (!$written) { fwrite(STDERR, "Private configuration could not be written completely. Do not activate authentication.\n"); exit(1); }
fwrite(STDOUT, "Private administrator environment file created. No credential values were printed.\n");
