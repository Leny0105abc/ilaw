# COT copy/import guidance update — 20 October 2026

## User-facing change

The prior screen mentioned only Gemini/Copilot and did not explain the disabled Import button or next action. The same manual JSON workflow can be used with ChatGPT; no provider connection was added.

- Four explicit steps: copy prompt to an AI chat, paste the complete answer into ILAW, click Import COT lesson, then review/save/export.
- Safe external links open ChatGPT, Gemini and Copilot without putting lesson data in their URLs.
- Empty-response and ready-to-import helper text describes the button state. JSON remains text, never executable HTML.
- Copy feedback appears beside the Copy button, including manual-copy fallback.
- Successful import opens the COT LESSON tab and scrolls/focuses a review-and-save guide with a Save COT draft button. Import still does not silently save or certify the lesson.
- Existing JSON validation, teacher review/readiness rules and export checks remain intact.

Official prompting reference consulted: https://learn.chatgpt.com/docs/prompting. The React review checklist informed field/help associations, focus management and keeping the presentational workflow component stateless. No AI SDK, dependency, API key or external generation was added.

## Local verification

Passed `pnpm verify:cot`, `pnpm verify:cot-workflow`, `pnpm typecheck`, targeted ESLint for the two components and workflow checks, and `pnpm build`.

The new render checks cover all four steps, provider links, blank/whitespace/busy disabled states, nonempty enabled state, accessible field/help associations, escaped prompt content and import/save instructions. Existing COT checks exercise strict imports, preserved official snapshots, teacher notes and review/export gates.

## Hostinger deployment

Uploaded `ilaw-cot-workflow-20261020-frontend.zip` to the private site root and extracted with folder name `public_html` and overwrite enabled. The package contains **45 generated HTML/RSC and `_next` files only**, directory permissions 0755 and file permissions 0644. No PHP, authentication file, `.htaccess`, credential, indicator configuration, database or saved work was included or replaced. Old chunks and existing rollback archives remain available.

Archive size: 1,397,407 bytes. SHA-256: `44fd2ce895ae67bef4d9a2e5fa65a8c6c749fa22f2b4560fc046b2b325784a25`.

Upload note: a Windows backslash path produced a failed **zero-byte** file named `UsersLenyDocumentsChatGPTilaw_DLPilaw-cot-workflow-20261020-frontend.zip` in the private site root. Using the normalized `C:/Users/...` path uploaded the correct 1.33 MiB archive successfully. The failed empty artifact was not extracted; it remains isolated outside public_html (no data-loss cleanup was attempted).

## Live verification

Used a separate Chrome tab so the user's existing unsaved COT screen was not refreshed. Dashboard loaded with 64 plans; saved COT library still showed one lesson. The existing draft's generation method displayed ChatGPT/Gemini/Copilot and all four new steps rendered.

- Empty response: Import disabled.
- Invalid JSON: clear validation error; draft retained.
- Existing user response with matching request `cot-2e3de32c`: Import enabled and succeeded. The lesson's five trailing checklist/teaching entries were retained as Teacher Notes. Review guide was visibly scrolled into view and COT LESSON tab selected.
- The imported draft is **not saved**. It was left open in the separate verification tab for teacher review. No original lesson/COT data was overwritten, no external AI chat was submitted, and no teacher-review/readiness box was checked on the user's behalf.

This verifies the actual live import and next-action guidance, not the quality of any new ChatGPT/Gemini/Copilot answer or every export combination.
