<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/ilaw-auth.php';

ilaw_require_auth($ilawAuth, true);
$method = $_SERVER['REQUEST_METHOD'] ?? '';
if ($method === 'GET') {
    $body = ['authenticated' => true, 'expiresAt' => (int)$_SESSION['expires_at'] * 1000, 'csrfToken' => ilaw_csrf()];
    session_write_close();
    ilaw_json(200, $body);
}
if ($method !== 'POST') ilaw_json(405, ['error' => 'Use GET or POST.']);
if (!ilaw_valid_post($ilawAuth, $_SERVER['HTTP_X_ILAW_CSRF'] ?? '')) ilaw_json(403, ['error' => 'Refresh ILAW and try again.']);
ilaw_logout($ilawAuth);
ilaw_json(200, ['authenticated' => false]);
