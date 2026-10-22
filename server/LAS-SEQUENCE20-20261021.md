# LAS fixed lesson sequence — 21 October 2026

## New Mixed generation

| Lesson/session | Activity type | Questions |
| --- | --- | --- |
| 1 | True or False | 5 |
| 2 | Matching type | 5 individual matching items |
| 3 | Multiple choice | 5 |
| 4 | Identification | 5 single-answer items |

Four selected lessons generate 20 questions with no essays. Selected subsets retain the actual session-to-type mapping and five items each; questions are numbered continuously across the included lessons. Pure Multiple Choice mode retains its separate minimum of ten.

New records carry `mixedPreset: session-types-5-v1`. Old 22-question and unflagged drafts remain unchanged, loadable and exportable. Regenerate with explicit replacement confirmation to apply the new sequence to a saved draft. The teacher can still edit question content, choices, keys and directions; counts/types are fixed by this preset. Official competency wording and source snapshots are preserved.

Preview, editable Word, PDF/Print and optional AI prompt/import follow the new sequence. Each lesson has type-specific directions, with the matching bank next to Lesson2. Objectives and [MC]/Objective metadata remain hidden from outputs. Student/teacher downloads stay separate, with a maximum of three pages per combined package.

## Verification

- `npm run verify:las` and `npm run build` passed (including TypeScript).
- Regression coverage: Grades7–10 TLE/GMRC, subsets and all four sessions, strict per-session counts/types, wrong-type swaps even when global counts match, exact IDs/imports, structured keys, clean output, legacy22 preservation, storage, pureMC10, editable Word and PDF/Print page limits.
- Visually inspected both student sample pages: two pages; lesson headings/directions kept with their first question. Separate teacher key is two pages.
- Local browser: automatic generation, exact five questions of the correct type in each lesson, continuous1–20 numbering, save and actual student PDF download succeeded. Browser errors/warnings were empty. Only disposable local test data was used.
- Proof: `C:/Users/Leny/Documents/ChatGPT/ilaw_DLP/las-sequence20-20261021.jpg`.
- Activities remain editable starter scaffolds; tests and AI fixtures do not certify subject-specific content. Teacher review remains required.

## Delivery

- Local preview: http://localhost:63653/login
- Frontend-only ZIP: `C:/Users/Leny/Documents/ChatGPT/ilaw_DLP/ilaw-las-sequence20-20261021-frontend.zip`
- SHA256: `65817DFF56BAE4127CAC4D7306738E8DCD709F720D8CB43AE8E2A1519CA6E4C7`
- Verified49 release files, Linux directories0755/files0644, no private configuration.
- Published to Hostinger on 21 October 2026 after the user requested publication. No commit or push was performed.

## Hostinger publication

- Created private-root rollback `B-ilaw-before-sequence20-20261021.zip` (File Manager:35.39MiB), then uploaded the verified frontend-only package and extracted into existing `public_html` with overwrite enabled. Independent audit confirmed all49 package files match the current tested build byte-for-byte.
- No PHP, authentication files, private configuration, source documents or browser-storage records were included or altered. No archives or old assets were deleted. Existing authenticated session continued working without entering credentials.
- Live verification: CreateLAS rendered the new sequence; selecting competencies auto-generated20questions. Observed Lesson1 Questions1–5 TF, Lesson2 Questions6–10 Matching, Lesson3 Questions11–15 MC, Lesson4 Questions16–20 Identification. No essays; sample studentLAS2/3pages, teacher guide2/3. Browser warning/error log empty.
- No production record was saved or marked teacher-reviewed. Actual download checks had passed locally on the identical build; the live test draft is left unsaved for the teacher.
- Anonymous root access still redirected to `/login`, and protected assessment API access returned401.
- Published proof: `C:/Users/Leny/Documents/ChatGPT/ilaw_DLP/las-sequence20-published-hostinger-20261021.jpg`.
