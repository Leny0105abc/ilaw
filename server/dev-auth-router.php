<?php
// Local PHP test server only. NEVER deploy this development router.
declare(strict_types=1);
$root = realpath(getenv('ILAW_DEV_WEB_ROOT') ?: dirname(__DIR__) . '/out');
if (!$root || getenv('ILAW_APP_ENV') !== 'development') { http_response_code(503); exit; }
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
if ($path === '/api/session.php') require $root . '/api/session.php';
elseif ($path === '/api/assessment.php') require $root . '/api/assessment.php';
else require $root . '/ilaw-gateway.php';
