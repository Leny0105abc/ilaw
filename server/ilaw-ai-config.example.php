<?php
// Copy to the Hostinger account's ROOT as ilaw-ai-config.php, OUTSIDE public_html.
// Never put the real key in Git, browser settings, public/, or a NEXT_PUBLIC variable.
return [
    'provider' => '', // 'openai' or 'gemini' (choose before enabling)
    'api_key' => '', // enter privately on the server
    'model' => '', // a model with structured JSON output available to your account
    'site_origin' => 'https://ilaw.lenybuilds.com',
];
