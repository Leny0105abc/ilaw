# COT Lesson module

This module extends the existing ILAW lesson plan, PowerPoint, Assessment and single-administrator PHP login. It does not replace existing saved data or require a new AI provider, account or database service.

## Teacher workflow

Open a saved/generated lesson plan and choose **Create COT Lesson**. Choose the teacher position, school year, PMES observation cycle, observed session, duration and verified indicators. One session is selected by default. Multiple sessions require explicit selection; duration is the combined observation time, not time per day.

The default generation method is the existing Gemini/Copilot copy-prompt workflow. Copy the COT prompt, obtain a complete JSON response and import it. The alternative secure AI service reuses `/api/assessment.php` and its existing private provider configuration. No frontend API key is added. Direct provider factual quality has not been verified with a live paid provider; all content requires teacher review.

Review/edit the observed-session objectives, activities, exact minute allocations, questions, anticipated responses, differentiation and assessments. Official competency and indicator wording are immutable snapshots. Changing generation settings invalidates old generated content; changing activities/assessment/alignment invalidates derived materials. Old data remains available until a successful replacement or explicit edit, with an undo option for generation/session changes.

Review each indicator's exact quoted teacher and learner actions. Coverage is a preparation aid, not an official observation, employee rating or score prediction. A missing/stale quotation cannot count as clear planned coverage. Suggestions are applied only by an explicit teacher action. “Ready for Observation” requires explicit teacher review, complete metadata, exact timing, reviewed clear planned coverage and current generated materials.

Generate the COT package, then preview/edit its PowerPoint, activity sheets and assessment. Annotations and teacher answers are in speaker notes by default, not student slides. Student sheets/tests and teacher keys are separate. Word/PPTX exports contain native editable text. PDF/print output contains text, not screenshots. Download All contains five Word documents, five PDFs, the classroom PPTX and a source/version manifest.

Worksheet answers remain one per task. `teacherNotes` separately preserves checklists and guidance in the teacher key only, never student sheets. Legacy AI responses with correctly matching labelled task/answer pairs followed by unlabelled guidance are normalized without dropping any text. Missing, reordered or ambiguous answers still fail atomically with the activity title and task/key counts; the pasted response remains unchanged. Practical objectives may be measured by an activity's explicit formative check and expected evidence rather than incorrectly labelling a multiple-choice item as a performance task.

## Storage and privacy

- Existing lesson plan/assessment/PowerPoint storage keys are unchanged.
- Saved COT lessons use `ilaw.cotLessons.v1` in device-local browser storage. They do not sync between devices/accounts. Export important work; clearing site data can remove local lessons. The existing app has no shared lesson database, so this module does not claim MySQL synchronization.
- Each COT lesson contains a complete independent source-plan copy and selected indicator snapshots. Updating or deactivating the library never rewrites saved snapshots.
- Indicator configuration is server-persistent in `ilaw-cot-indicators.json`, **outside `public_html`**, with an exclusive file lock, atomic write, revision conflict checks and private file permissions. Only the existing authenticated administrator can read/publish it; publishing also requires the existing CSRF token.
- Source files are parsed locally in the browser. PDF, DOCX and XLSX extraction produces draft candidates only. Administrators must verify exact wording, domain/strand, position, career stage, year, cycle, source and version before explicit publication. Scanned PDFs without extractable text are rejected. Complex PDF/Word table extraction can mix columns: always compare each candidate with the official source. Excel tables with indicator-number/wording/domain/strand headers retain their separate fields.
- The COT prompt excludes the teacher profile, observer, section and observation date/time. Lesson text itself may contain personal information; the UI reminds the teacher to review it before copying externally. Nothing is automatically sent to Gemini/Copilot in prompt mode.

## Configured official indicator sets

The configurable seed is `public/cot-indicator-seed.json`, expanded by the protected PHP library API. Indicator strings are not embedded permanently in UI components. It configures SY **2026–2027** PMES classroom observation records for Teacher I–VII and Master Teacher I–II, including first/second observation applicability.

Primary sources checked 19 October 2026:

- [DepEd Memorandum 089 s. 2025](https://www.deped.gov.ph/wp-content/uploads/DM_s2025_089r.pdf), paragraphs 11–20 and Tables 2–4, 7–8: positions, career-stage/application rules, observation cycle and SY 2026–2027 COI selection.
- [DepEd Order 042 s. 2017](https://www.deped.gov.ph/wp-content/uploads/2017/08/DO_s2017_042.pdf), PPST annex: exact indicator, domain and strand wording.

Teacher I–III retain the memo's “Beginning towards Proficient” classification and its paragraph 18 instruction to use Career Stage II indicators. Teacher IV–VII use Proficient indicators; Master Teacher I–II use Highly Proficient indicators. These are separate applicable position records, even where the official indicator wording is shared.

**Master Teacher III is intentionally not preconfigured.** Table 2/paragraph 15 and Table 10 contain conflicting career-stage labels for this position. Obtain an applicable official rating sheet or clarification and publish a reviewed configuration rather than guessing. Other school years also require a verified import. The teacher should check for later applicable issuances with the observer.

PMES and COT-RSP records remain separate. COT Lesson offers PMES records only. Importing a COT-RSP record does not make it a PMES classroom observation indicator.

## Build, verification and release

`pnpm build` generates the trusted server COT JSON schema and copies the installed PDF worker before the Next static build. Deploy the complete current `out` contents, including the seed, schema, `api/cot-library.php`, updated AI service/gateway and `cot/pdf.worker.min.mjs`.

Keep the existing production `.htaccess`, private `ilaw-auth.env`, private AI configuration, private indicator JSON and existing backups unchanged. Never deploy `server/dev-auth-router.php`, local test fixtures or `.cot-qa`. The new library API and SPA routes are handled by the gateway without changing the established rewrite entry point. Back up production before an authorized upload and check HTTPS/login, protected assets/APIs and the full workflow after extraction. No production deployment has been performed as part of implementation testing.

Checks: `pnpm typecheck`, targeted ESLint, `pnpm verify:cot`, `pnpm verify:assessment`, `pnpm verify:tos`, `pnpm verify:powerpoint`, `pnpm verify:auth` and production build. `verify:cot --artifacts` adds native document/slide/package structural checks. Full-repository lint also reports pre-existing Dashboard hook and older ignored QA-script issues; those unrelated files were not changed for COT.

Browser verification uses a disposable PHP preview, real UI interactions and self-authored software-test lesson content, not a claim of live AI quality. The tested path includes saved lesson → COT setup → prompt/JSON import → evidence review → materials/assessment → explicit Ready → save/reopen → downloaded 12-file ZIP, with the original lesson retained. PDF/PPTX were rendered for visual review; the COT Word sample opened without repair in Microsoft Word and its native eight-page PDF render was inspected. The packaged LibreOffice renderer was unavailable on this Windows host, so Word supplied the native DOCX layout render instead.

## COT classroom PowerPoint (lesson-plan aligned)

Generate COT PowerPoint builds a designed deck (dark navy background, blue banners, white panels, orange headings) that follows the COT lesson plan, modelled on a teacher-made COT demonstration deck:

1. Title (subject, lesson, teacher, position, school) → Opening Prayer → Our Class Rules → Objectives (verb in bold).
2. Review (with the review question highlighted) → Motivation "Activity: “…”" with the teacher's question.
3. "Let's Play a Game – Find the Missing Letter": a puzzle slide and a reveal slide (term + definition) for up to four key terms, then Definition of Terms. Key terms come from the AI answer's optional `keyTerms`; older answers fall back to "Term – definition" lines in the activities, or skip the game.
4. Discussion slides and Guide Questions → Guided Practice (instructions + tasks) → Group Activity and three group cards (Explorers, Problem Solvers, Creators — no ability labels) from the support/core/extension tasks.
5. Formative check and Multiple Choice slides (several questions per slide when short; answers only in speaker notes) placed before the closing of their own session.
6. Generalization (closing question highlighted) → Assignment (from extended learning) → Thank You.

Teacher actions, anticipated responses, quiz answers and COT annotations stay in speaker notes. The prayer and class rules are editable defaults (Filipino wording for Filipino-medium subjects). Slides can be edited in the POWERPOINT tab, which previews the same design; quiz questions are edited in the ASSESSMENT tab and refreshed with Generate COT PowerPoint. Previously generated decks keep their slides but download in the new design; regenerate to get the new sequence.
