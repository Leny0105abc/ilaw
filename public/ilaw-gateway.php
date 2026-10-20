<?php
// Apache routes every non-public request through this gate, including exported HTML/assets.
declare(strict_types=1);
require_once __DIR__ . '/ilaw-auth.php';
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
if (strpos($path, "\0") !== false || strpos($path, '\\') !== false || preg_match('~(?:^|/)\.{1,2}(?:/|$)~', $path)) {
    http_response_code(404); exit;
}
if (in_array($path, ['/api/cot-library', '/api/cot-library.php'], true)) { require __DIR__ . '/api/cot-library.php'; exit; }
if ($path === '/login' || $path === '/login/') {
    header("Content-Security-Policy: default-src 'none'; style-src 'self'; script-src 'self'; img-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
    if (ilaw_authenticated($ilawAuth)) { session_write_close(); header('Location: /', true, 303); exit; }
    $error = '';
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
        $token = is_string($_POST['csrf_token'] ?? null) ? $_POST['csrf_token'] : '';
        if (!ilaw_valid_post($ilawAuth, $token)) {
            http_response_code(403); $error = 'Your sign-in form expired. Please try again.';
        } elseif (($wait = ilaw_limit_login($ilawAuth)) > 0) {
            http_response_code(429); header('Retry-After: ' . $wait);
            $error = 'Too many sign-in attempts. Please try again in 15 minutes.';
        } else {
            $username = is_string($_POST['username'] ?? null) ? trim($_POST['username']) : '';
            $password = is_string($_POST['password'] ?? null) ? $_POST['password'] : '';
            if ($username === '' || $password === '') { http_response_code(422); $error = 'Enter your username and password.'; }
            elseif (strlen($username) > 100 || strlen($password) > 1024 || !ilaw_login($ilawAuth, $username, $password, ($_POST['remember'] ?? '') === '1')) {
                http_response_code(401); $error = 'Invalid username or password.';
            } else { session_write_close(); header('Location: /', true, 303); exit; }
        }
    } elseif (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
        http_response_code(405); exit;
    }
    $csrf = ilaw_csrf(); session_write_close();
    header('Content-Type: text/html; charset=utf-8');
    require __DIR__ . '/ilaw-login-view.php';
    exit;
}

// Login assets contain no app data or secrets. All other assets require a session.
$public = ['/ilaw-login.css', '/ilaw-login.js', '/favicon.svg'];
if (!in_array($path, $public, true)) ilaw_require_auth($ilawAuth, str_starts_with($path, '/api/'));
session_write_close();
$method = $_SERVER['REQUEST_METHOD'] ?? '';
if (!in_array($method, ['GET', 'HEAD'], true)) { http_response_code(405); exit; }
$routes = ['/', '/dashboard', '/lesson-plans', '/assessment', '/assessments', '/powerpoint', '/powerpoints', '/cot', '/cot-lessons', '/cot-indicators', '/settings', '/curriculum'];
if (in_array(rtrim($path, '/') ?: '/', $routes, true)) $path = '/index.html';
$extensions = ['html' => 'text/html; charset=utf-8', 'txt' => 'text/plain; charset=utf-8',
    'js' => 'application/javascript; charset=utf-8', 'mjs' => 'application/javascript; charset=utf-8', 'css' => 'text/css; charset=utf-8',
    'svg' => 'image/svg+xml', 'png' => 'image/png', 'ico' => 'image/x-icon', 'woff' => 'font/woff', 'woff2' => 'font/woff2'];
$extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
$file = realpath(__DIR__ . $path);
$base = realpath(__DIR__) . DIRECTORY_SEPARATOR;
// Allow only known export assets. Never serve PHP source, private files or old deployment archives.
$allowed = $path === '/index.html' || $path === '/index.txt' || $path === '/deped-seal.png'
    || $path === '/cot/pdf.worker.min.mjs'
    || in_array($path, $public, true) || str_starts_with($path, '/_next/static/');
if (!$allowed || !isset($extensions[$extension]) || !$file || !str_starts_with($file, $base) || !is_file($file)) {
    http_response_code(404); header('Content-Type: text/plain; charset=utf-8'); echo 'Not found.'; exit;
}
header('Content-Type: ' . $extensions[$extension]);
header('Content-Length: ' . filesize($file));
if ($method !== 'HEAD') readfile($file);
