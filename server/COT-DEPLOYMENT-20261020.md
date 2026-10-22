# COT deployment — 20 October 2026

Target: https://ilaw.lenybuilds.com/ (existing Hostinger PHP/static site).

Uploaded `ilaw-cot-release-20261020-linux.zip` (61 files, 1,830,542 bytes).
SHA-256: `2406a6f7cc786c0a019407128eb118bc6dc087abf9cf3ca8de3e5f2720dd0ffd`.

Before replacement, created `B-ilaw-before-cot-20261020.zip` outside `public_html` (Hostinger reported 29.96 MiB). Existing private authentication configuration, authentication state, other backups and `.htaccess` were not replaced or deleted.

The first extraction attempt using a dot destination did not complete. Hostinger's file manager briefly lost connection and the live site returned a transient 503, then recovered. Retried from the private root with folder name `public_html` and “Overwrite existing files” checked. Confirmed the new `cot` directory and `public_html/api/cot-library.php` (5.07 KiB), updated `assessment.php` (16.09 KiB), and intact sign-in page. The release ZIP remains outside the public folder.

Anonymous browser navigation to `/api/cot-library.php` returned the session-ended error, not indicator records. Anonymous navigation to the internal seed URL returned the login page, not configuration data.

The hosting “Clear cache” control was invoked; a final success notification was not captured, so cache clearing is not independently confirmed.

Authenticated production COT creation, saving, import and export remain pending the administrator's private sign-in. The full workflow and login security had passed isolated local verification before upload. No live provider-generation quality claim is made.

## Worksheet import hotfix, later on 20 October

Reported response: request `cot-2e3de32c`, Session 3, 60 minutes. Guided worksheet had six tasks and seven key entries; differentiated worksheet had six tasks and ten key entries. The trailing entries were checklists/teacher guidance after correctly matching labelled task answers. The response also correctly assessed the practical objective through observed formative tasks instead of pretending MC questions measured practical performance.

Added separate, editable, teacher-only `teacherNotes`, unambiguous legacy normalization without discarded text, activity-specific mismatch errors, explicit prompt instructions, and objective coverage through assessment items or actual formative checks. Missing, reordered and ambiguous keys remain rejected atomically. Tests verify notes appear in teacher exports, not student documents. COT regression checks, targeted lint, TypeScript and the production build passed.

Uploaded and extracted `ilaw-cot-import-fix-20261020-linux.zip` (61 files; SHA-256 `cc2c38f23f6aa115d4b6ee2419ed9d05561759f93c785721aa00f974d4e7c3fc`) into `public_html` using explicit destination and overwrite. Created private-root backup `B-ilaw-before-cot-import-fix-20261020.zip` beforehand (33.67 MiB). Did not change `.htaccess`, private credentials, AI configuration or indicator configuration. Saved the teacher's current COT setup before refreshing; original lesson plans were untouched.

Live verification is incomplete: intermittent Hostinger 503 responses prevented reliable editor loading. The updated editor chunk `44c98sj35b-9d.js` is present with normal 0644 permissions, and an authenticated session check succeeded, but a subsequent app navigation returned 503. The hosting resource report showed 104 average processes / 120 available, 10 PHP workers / 60, 437 MB memory / 3072 MB, CPU 1%, and 12 websites. Process pressure is a possible hosting cause, not a proven application cause. No account-wide process stop/restart was performed because it could interrupt the other websites; requested explicit user approval. Never claim the original live JSON import/export passed yet.
