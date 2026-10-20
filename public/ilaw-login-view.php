<?php
if (!isset($csrf, $error)) { http_response_code(404); exit; }
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Sign In · ILAW</title>
  <link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/ilaw-login.css">
  <script src="/ilaw-login.js" defer></script>
</head>
<body>
<main class="login-layout">
  <section class="login-intro" aria-label="About ILAW">
    <div class="brand"><span class="brand-mark" aria-hidden="true">✦</span><span>ILAW</span></div>
    <div><p class="eyebrow">A clearer week starts here</p><h1>Plan with purpose.<br>Teach with confidence.</h1><p>Your lesson plans, assessments, and tables of specifications—together in one workspace.</p></div>
    <p class="intro-footer">Lesson Plan &amp; Assessment Generator</p>
  </section>
  <section class="login-card" aria-labelledby="login-heading">
    <div class="mobile-brand"><span class="brand-mark" aria-hidden="true">✦</span><b>ILAW</b></div>
    <p class="eyebrow">Welcome to ILAW</p><h2 id="login-heading">Sign in to your workspace</h2>
    <p class="login-description">Use your administrator account to continue.</p>
    <?php if ($error !== ''): ?><p class="form-error" role="alert"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></p><?php endif; ?>
    <form method="post" action="/login">
      <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrf, ENT_QUOTES, 'UTF-8') ?>">
      <label for="username">Username</label><input id="username" name="username" autocomplete="username" required maxlength="100" spellcheck="false" autocapitalize="none">
      <label for="password">Password</label><div class="password-field"><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="1024"><button id="toggle-password" class="show-password" type="button" aria-label="Show password" aria-controls="password" aria-pressed="false">Show</button></div>
      <label class="remember"><input type="checkbox" name="remember" value="1">Remember Me</label>
      <p class="remember-help">Stay signed in for up to seven days on this device.</p>
      <button class="sign-in" type="submit">Sign In <span aria-hidden="true">→</span></button>
    </form>
    <p class="secure-note">Single-administrator access · Secure server validation</p>
  </section>
</main>
</body>
</html>
