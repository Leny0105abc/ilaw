# Single-administrator login on Hostinger (no database)

The existing Next.js static export remains in place. PHP's built-in `password_hash` / `password_verify` and session engine supply server-side authentication. No Laravel, users table, registration, SMTP service or auth vendor is required for this intentionally single-account deployment.

## Secret configuration

Use server process environment variables, or create **`ilaw-auth.env` in the parent of `public_html`, outside the web root**. The private file loads only known environment variables; process environment settings take precedence. See `.env.example` for placeholder names. Never upload the real file into `public_html`, include it in a release ZIP, commit it, or use `NEXT_PUBLIC_` variables. There is deliberately no production plain-text password fallback.

Required: `ILAW_ADMIN_USERNAME`, `ILAW_ADMIN_PASSWORD_HASH`, `SESSION_SECRET` (at least 64 characters) and `ILAW_SITE_ORIGIN` (the exact HTTPS origin, with no trailing slash). The requested initial credentials should be provided privately during deployment—not written into source or documentation.

`server/configure-admin.php` is CLI-only. It reads `{ "username": "...", "password": "...", "origin": "https://ilaw.lenybuilds.com" }` from **stdin**, generates Argon2id when available or bcrypt cost 12, and creates a private environment file at the absolute path supplied as its first argument. It refuses existing files or public-directory destinations and prints no secrets. Do not put a real password in shell history or command-line arguments. A trusted local setup process can supply stdin without echoing it.

Changing the configured username, password hash or session secret automatically invalidates all old sessions. Preserve and back up the current private configuration before changing it.

## Activation — do not overwrite the working protection prematurely

1. Back up the current `public_html`, `.htaccess` and `.htpasswd` outside the public directory. Preserve all existing teacher work in browser storage; do not clear that storage.
2. Build using `pnpm exec next build --webpack`. Package with `python scripts/create-hostinger-package.py <absolute-new-release.zip>`: it adds explicit Unix 0755 directories and 0644 files, excludes private/activation files, and validates archive integrity. Windows ZIPs without explicit directory permissions can leave Hostinger folders non-traversable and fail extraction. Upload the contents of `out/`, excluding private configuration and all development/test scripts. Keep the old Basic Auth gate until activation is ready.
3. Create the private environment configuration and ensure PHP can create/write the private sibling `ilaw-auth-state/` directory. Sessions and file-lock rate counters live there, never in the web root. PHP 8.1+ is required. Do not set `ILAW_APP_ENV=development` in production.
4. Review existing Hostinger rules, then activate `server/hostinger-auth.htaccess` as the website's `.htaccess`. Remove the old Basic Auth directives **only as part of this switch**. The activation file routes every request through PHP, with no `-f`/`-d` bypass; the exported `index.html`, RSC text, app scripts, old staging paths and direct API requests cannot bypass authentication. Disable/bypass hosting/CDN caches for this domain and purge previously cached assets/HTML when activating.
5. Verify anonymous `/`, `/index.html`, `/index.txt`, `/_next/static/...`, `/assessment`, `/settings` and old deployment directories do not reveal protected app content. `/login` and its CSS/JS/favicon are the only public UI. Anonymous API requests must return 401. Private/source/archive paths must never be served. Check actual Apache routing, TLS and cookie flags, not only the local PHP test router.
6. Sign in privately using the requested initial credentials; confirm the dashboard, refresh, lessons, assessment prompt/import, TOS, saved data and exports. Test wrong username/password, CSRF, rate limits, Remember Me, session expiry, logout, a second open tab, and a protected URL after logout. Do not confirm teacher-review checkboxes on the owner's behalf.
7. Capture a final UI screenshot. If any release check fails, restore the previous `.htaccess` and previous public files from the backup; keep the working Basic Auth protection while repairing the new gate.

## Session contract

- Native opaque PHP session ID; strict mode, cookie-only, HttpOnly, Secure in production, SameSite=Lax, host-only `__Host-ilawSession` cookie.
- Normal session: browser-session cookie, maximum eight hours, one-hour server inactivity window. Open authenticated workspace checks count as activity. Remember Me: persistent cookie and server expiry capped at seven days. Expiry is checked explicitly, not left to garbage collection.
- Login rotates the session ID and CSRF token. Logout requires same-origin POST and a matching CSRF token, destroys server state, clears the cookie and redirects to `/login`.
- Password, password hash and session secret are never returned by endpoints. Errors are generic. Login attempts are capped at five per source IP per 15 minutes, plus a global 100-attempt budget. `REMOTE_ADDR` is used without trusting spoofable forwarded headers.
- Every saved-data load is deferred until the server session is verified. The browser verifies again every 30 seconds and when returning to the tab/back-forward cache, hiding the app and redirecting on expiry. This is defense in depth; the server gateway provides the actual route protection.
- All authenticated responses are `no-store` and signal LiteSpeed not to cache. Preserve these rules and do not enable a service worker/offline app bypass.
- Existing lesson plans, profiles and assessments retain their existing browser-storage keys. There is no deletion or database migration. Local export operations remain client-side, as before.

## Local verification

`pnpm verify:auth` starts an isolated PHP server with disposable test credentials supplied in process environment variables. It copies the build into a dedicated temporary directory, checks server-side guards, CSRF, wrong/correct credentials, session rotation, session durations, refresh, logout/replay, expiry/credential changes, private-file denial and rate limiting, then deletes only that generated temporary directory. Never deploy `server/dev-auth-router.php` or the verification scripts. These checks do not replace production Apache/TLS/caching verification.

Local development uses `ILAW_APP_ENV=development` and a loopback `ILAW_SITE_ORIGIN` only. This removes Secure for a loopback HTTP cookie; it is not a production option. A plain Next.js dev/static server has no PHP and will intentionally fail closed; use the PHP development router against the build.
