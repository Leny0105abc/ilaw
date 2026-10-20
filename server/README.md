# Secure assessment AI service on Hostinger

## Copy-prompt workflow (no API connection)

The assessment workspace defaults to **Copy prompt to Gemini or Copilot**. Generate/balance the existing TOS, choose difficulty, and use **Generate Prompt** or **Copy prompt**. Paste the prompt into your own AI chat, copy its complete JSON response, and use **Import questions**. This mode makes no AI requests and needs no API key or Microsoft app registration. The teacher decides whether their school account permits sharing curriculum/test content with that service.

The prompt contains grade, subject, term, optional week, exact competency snapshots, TOS, item plan and difficulty counts. It excludes the teacher profile and student data. Responses must carry the current specification identifier, include every unique item number, four real options, a correct answer, and a rationale. Incomplete, outdated, duplicate, and placeholder responses are rejected atomically; the existing test remains intact. ILAW restores official wording and Bloom/difficulty metadata from its own plan, keeps the TOS unchanged, and shuffles options while preserving the correct answer text. Imported responses are not marked as AI-reviewed: explicit teacher content review is required before saving/exporting. Single-item automated regeneration and AI review remain available only in Connected AI service mode.

`pnpm verify:assessment` also verifies the prompt/import contract using test fixtures, including malformed/truncated JSON, stale settings, duplicate/missing numbers, privacy, official wording preservation, and teacher-review gating. This does not certify content from a real Gemini/Copilot chat.

## Optional connected API workflow

The existing static Next.js frontend remains unchanged in architecture. PHP handles generation and review on Hostinger; no AI key is sent to the browser.

1. The new release requires the single-admin PHP session gate described in [AUTH-DEPLOYMENT.md](AUTH-DEPLOYMENT.md). Keep the existing Basic Auth protection until that gate is fully configured and activated. The API now verifies the PHP session and a CSRF token; no Apache username or client-supplied identity can bypass it.
2. The build copies `public/api/assessment.php` into `out/api/assessment.php`. Deploy alongside existing static assets. Back up `.htaccess` and `.htpasswd` before the reviewed authentication switch; never remove the working gate before its replacement is ready.
3. Copy `server/ilaw-ai-config.example.php` to the account root (the parent of `public_html`) as `ilaw-ai-config.php`. Enter the selected provider, API key, and an available structured-output model privately. Keep the file readable only by the account/PHP process. Never upload it into `public_html` or commit it.
4. Confirm PHP 8.1+ and cURL are enabled. `GET /api/assessment.php` while signed in returns only `configured`, never the key. Requests must come from the configured exact origin.
5. Generate a small test first, review every item, then test a 40-item Mixed test. Provider usage is billable under that account; the endpoint limits 100 batch/review requests per authenticated account per hour.

No provider or model is selected silently. No template or pretend-AI fallback exists. Until configuration is complete, generation reports a clear setup error and retains the existing assessment. Source inspection, mocks, and a build are not a substitute for a live provider quality check.

The API sends grade, subject, term, competency snapshots, question metadata and draft questions only. It does not send student names, teacher profile, or passwords. Official wording is assigned from stored snapshots after generation, never taken from model output. Automated structural checks and model review cannot guarantee factual accuracy; teacher review remains necessary.

Provider reference: [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/generate-content/structured-output).

## Verification and release status

- `pnpm verify:assessment`: deterministic difficulty counts, correct-choice text preserved during shuffling, mocked generate/review/repair transport, single-item regeneration, review invalidation after edits, invalid response rejection, and export construction.
- `pnpm verify:tos`: existing Standard and Item Placement formats, exact 40-item allocation and placement still pass. No TOS generation or export algorithm was changed.
- PHP syntax checks pass. Anonymous requests, foreign origins, and missing provider configuration fail closed. Live Apache authentication propagation must be checked on Hostinger before release.
- A two-page test PDF fixture was rendered and visually inspected. DOCX text is native/editable and question/choice keep-together properties are set, but the bundled LibreOffice renderer is unavailable on this machine; final Word pagination remains unverified.
- Copy-prompt mode: deployed to https://ilaw.lenybuilds.com/ on 2026-10-05. The local production build and browser checks pass for prompt copying, complete sample import, truncated-response rejection, automatic answer keys, and teacher-review export gating. Both TOS-format regressions still pass. Live browser verification confirmed Generate Prompt and copying the exact Grade 8 FCS / Term 2 / five-competency / 25-item plan. A real Gemini/Copilot response still needs independent teacher content review.
- Deployment safety: the prior public_html was copied to account-root B-ilaw-before-prompt-20261005/public_html before extraction. The release archive excludes .htaccess, .htpasswd, and private configuration. Those login files remained unchanged, and anonymous checks of both / and /api/assessment.php returned HTTP 401. Hostinger cache was cleared. No saved lesson plans or assessments were modified during live verification.
- Connected API mode: no provider choice, model, or API key is configured. Before enabling this optional mode, run a real small test and 40-item test, independently review subject accuracy and distractors, exercise saved-test editing/review/export, and verify both TOS formats again. Mocks do not validate AI quality. This limitation does not block the copy-prompt workflow.
- Uniform difficulty can conflict with a teacher's chosen Bloom allocation. The model review must flag genuine mismatches rather than mislabel recall as analysis or silently change the TOS.
