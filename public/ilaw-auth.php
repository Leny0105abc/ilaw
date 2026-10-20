<?php
// Runtime code only. Credentials are read from the server environment, never from the browser.
declare(strict_types=1);

function ilaw_json(int $status, array $body): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}

function ilaw_unavailable(): never {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'The secure sign-in service is unavailable. Please contact the site administrator.';
    exit;
}

function ilaw_env(): array {
    // Shared hosting fallback: a private .env file one level OUTSIDE public_html.
    // Real process environment values take precedence. Only known keys are loaded.
    $keys = ['ILAW_ADMIN_USERNAME', 'ILAW_ADMIN_PASSWORD_HASH', 'SESSION_SECRET', 'ILAW_SITE_ORIGIN',
        'ILAW_SESSION_SECONDS', 'ILAW_IDLE_SECONDS', 'ILAW_REMEMBER_SECONDS'];
    $path = dirname(__DIR__) . '/ilaw-auth.env';
    if (is_file($path)) {
        foreach (file($path, FILE_IGNORE_NEW_LINES) ?: [] as $line) {
            if (!preg_match('/^([A-Z_]+)=(.*)$/D', trim($line), $match) || !in_array($match[1], $keys, true)) continue;
            if (getenv($match[1]) !== false) continue;
            $value = trim($match[2]);
            if (strlen($value) >= 2 && (($value[0] === '"' && substr($value, -1) === '"') || ($value[0] === "'" && substr($value, -1) === "'"))) {
                $value = substr($value, 1, -1);
            }
            putenv($match[1] . '=' . $value);
        }
    }
    $config = [];
    foreach ($keys as $key) $config[$key] = getenv($key) ?: '';
    $config['ILAW_SITE_ORIGIN'] = $config['ILAW_SITE_ORIGIN'] ?: 'https://ilaw.lenybuilds.com';
    if ($config['ILAW_ADMIN_USERNAME'] === '' || strlen($config['ILAW_ADMIN_USERNAME']) > 100
        || strlen($config['SESSION_SECRET']) < 64 || !password_get_info($config['ILAW_ADMIN_PASSWORD_HASH'])['algo']) ilaw_unavailable();
    $origin = parse_url($config['ILAW_SITE_ORIGIN']);
    $development = getenv('ILAW_APP_ENV') === 'development';
    if (!$origin || !isset($origin['scheme'], $origin['host']) || isset($origin['user']) || isset($origin['pass'])
        || (isset($origin['path']) && $origin['path'] !== '') || isset($origin['query']) || isset($origin['fragment'])
        || (!$development && $origin['scheme'] !== 'https')
        || ($development && !in_array($origin['host'], ['localhost', '127.0.0.1'], true))) ilaw_unavailable();
    $config['secure'] = !$development;
    $config['session_seconds'] = max(60, min(28800, (int)($config['ILAW_SESSION_SECONDS'] ?: 28800)));
    $config['idle_seconds'] = max(60, min($config['session_seconds'], (int)($config['ILAW_IDLE_SECONDS'] ?: 3600)));
    $config['remember_seconds'] = max(60, min(604800, (int)($config['ILAW_REMEMBER_SECONDS'] ?: 604800)));
    return $config;
}

function ilaw_security_headers(): void {
    ini_set('display_errors', '0');
    header('Cache-Control: no-store, private, max-age=0');
    header('Pragma: no-cache');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: same-origin');
    header('Vary: Cookie');
    header('X-LiteSpeed-Cache-Control: no-cache');
}

function ilaw_session_start(array $config): void {
    $state = dirname(__DIR__) . '/ilaw-auth-state';
    if (!is_dir($state) && !mkdir($state, 0700, true) && !is_dir($state)) ilaw_unavailable();
    $sessions = $state . '/sessions';
    if (!is_dir($sessions) && !mkdir($sessions, 0700) && !is_dir($sessions)) ilaw_unavailable();
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.gc_maxlifetime', '604800');
    ini_set('session.gc_probability', '1');
    ini_set('session.gc_divisor', '100');
    session_save_path($sessions);
    session_name($config['secure'] ? '__Host-ilawSession' : 'ilawSession');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $config['secure'], 'httponly' => true, 'samesite' => 'Lax']);
    if (!session_start()) ilaw_unavailable();
}

function ilaw_credential_version(array $config): string {
    // Changing username, hash, or SESSION_SECRET invalidates every old session.
    return hash_hmac('sha256', $config['ILAW_ADMIN_USERNAME'] . ':' . $config['ILAW_ADMIN_PASSWORD_HASH'], $config['SESSION_SECRET']);
}

function ilaw_authenticated(array $config): bool {
    return isset($_SESSION['credential_version'], $_SESSION['expires_at'], $_SESSION['last_seen'], $_SESSION['idle_seconds'])
        && is_string($_SESSION['credential_version'])
        && hash_equals(ilaw_credential_version($config), $_SESSION['credential_version'])
        && time() < (int)$_SESSION['expires_at']
        && time() - (int)$_SESSION['last_seen'] < (int)$_SESSION['idle_seconds'];
}

function ilaw_csrf(): string {
    if (!isset($_SESSION['csrf_token'])) $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf_token'];
}

function ilaw_valid_post(array $config, string $token): bool {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $fetchSite = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? '';
    return ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST'
        && $origin === $config['ILAW_SITE_ORIGIN']
        && ($fetchSite === '' || $fetchSite === 'same-origin')
        && $token !== '' && hash_equals(ilaw_csrf(), $token);
}

function ilaw_logout(array $config): void {
    $_SESSION = [];
    session_destroy();
    setcookie(session_name(), '', ['expires' => 1, 'path' => '/', 'secure' => $config['secure'], 'httponly' => true, 'samesite' => 'Lax']);
}

function ilaw_require_auth(array $config, bool $json = false): void {
    if (!ilaw_authenticated($config)) {
        ilaw_logout($config);
        if ($json) ilaw_json(401, ['error' => 'Your session has ended. Sign in to ILAW again.']);
        header('Location: /login', true, 303);
        exit;
    }
    $_SESSION['last_seen'] = time();
}

function ilaw_limit_login(array $config): int {
    // Files + locks persist across browser sessions; never trust X-Forwarded-For.
    $identity = hash_hmac('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown', $config['SESSION_SECRET']);
    $buckets = [[$identity, 5], ['account', 100]];
    foreach ($buckets as [$bucket, $limit]) {
        $path = dirname(__DIR__) . '/ilaw-auth-state/rate-' . $bucket . '.json';
        $file = fopen($path, 'c+');
        if (!$file || !flock($file, LOCK_EX)) ilaw_unavailable();
        chmod($path, 0600);
        $usage = json_decode(stream_get_contents($file), true) ?: ['start' => time(), 'count' => 0];
        if (time() - (int)$usage['start'] >= 900) $usage = ['start' => time(), 'count' => 0];
        if ((int)$usage['count'] >= $limit) {
            $wait = max(1, 900 - (time() - (int)$usage['start']));
            flock($file, LOCK_UN); fclose($file);
            return $wait;
        }
        $usage['count']++;
        $serialized = json_encode($usage, JSON_THROW_ON_ERROR);
        rewind($file);
        $written = ftruncate($file, 0) && fwrite($file, $serialized) === strlen($serialized) && fflush($file);
        flock($file, LOCK_UN); fclose($file);
        if (!$written) ilaw_unavailable();
    }
    return 0;
}

function ilaw_login(array $config, string $username, string $password, bool $remember): bool {
    $maximum = str_starts_with($config['ILAW_ADMIN_PASSWORD_HASH'], '$2') ? 72 : 1024;
    $validPassword = strlen($password) <= $maximum && password_verify($password, $config['ILAW_ADMIN_PASSWORD_HASH']);
    $validUsername = hash_equals(hash('sha256', $config['ILAW_ADMIN_USERNAME']), hash('sha256', $username));
    if (!$validUsername || !$validPassword) return false;
    if (!session_regenerate_id(true)) ilaw_unavailable();
    $_SESSION = [
        'credential_version' => ilaw_credential_version($config),
        'expires_at' => time() + ($remember ? $config['remember_seconds'] : $config['session_seconds']),
        'last_seen' => time(),
        'idle_seconds' => $remember ? $config['remember_seconds'] : $config['idle_seconds'],
        'csrf_token' => bin2hex(random_bytes(32)),
    ];
    setcookie(session_name(), session_id(), ['expires' => $remember ? $_SESSION['expires_at'] : 0,
        'path' => '/', 'secure' => $config['secure'], 'httponly' => true, 'samesite' => 'Lax']);
    return true;
}

ilaw_security_headers();
$ilawAuth = ilaw_env();
ilaw_session_start($ilawAuth);
