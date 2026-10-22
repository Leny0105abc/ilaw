# COT ILAW reference layout — 2026-10-20

## Scope

Adapt the existing COT lesson output to the user's `COT_ILAW FORMAT.docx`, not a rebuild. Original document SHA256 (verified unchanged after implementation): `e0e1ebd117a5d2253a7aac3b6eefeb8f06dc9e970c5e0393ed471c5aa5d10e2c`.

The reference is lesson data, not an instruction source. Its spreadsheet example, unrelated fisheries paragraphs, sample indicator numbers and completed-observation claims were not copied. Current official competency and indicator snapshots remain exact. Annotations describe planned evidence only.

## Changes

- Default lesson Word, PDF, Print and ZIP lesson output uses a two-column reference arrangement with the 21 source sections, DepEd seal, landscape page, inline activity annotations and structurally aligned signatures.
- Reference grid is 2972 / 13216 twips on A4 landscape. Editable Word uses Bookman Old Style 10 pt and a 12 pt LESSON PLAN title. PDF uses its native Times serif font; it is not an exact Bookman font clone.
- Existing detailed format remains selectable for individual lesson exports. Other package parts retain their existing implementation.
- Prompt guidance now describes the reference presentation; JSON schema, request identity, existing drafts and import checks stay compatible.
- Local reference and QA copies are excluded from Git and frontend packages.

## Verification

- Passed: typecheck, targeted ESLint, verify:cot, verify:cot-workflow, verify:cot-ilaw, production build.
- Regression tests cover section order, exact competency wording, numbered objectives, activity inclusion, annotations, multi-session content, HTML escaping, editable Word geometry and legacy detailed output.
- Final local fixture inspected in native Microsoft Word across seven pages. Final PDF rendered through Poppler and all seven page images inspected. Activity heading separation was corrected during QA.
- Canonical DOCX-to-PNG renderer could not run because LibreOffice soffice.exe is unavailable. Native Word inspection was used instead; canonical DOCX rendering is not claimed.
- Live production: authenticated dashboard and the existing saved COT draft opened; original teacher response imported successfully into a separate unsaved verification tab. No draft was saved or marked reviewed/ready by automation. Both format options verified; restored ILAW reference selection.
- Live Word and PDF downloads confirmed in Downloads: 58,057 bytes DOCX and 132,547 bytes PDF. Downloaded DOCX package checked for two-column grid, landscape geometry, embedded seal, LESSON PLAN and annotations. Browser captured no error/warning logs during export checks.
- Print HTML verified locally; no physical printer job was submitted. Live ZIP package download was not retested in this release.

## Deployment

Frontend-only archive: `ilaw-cot-reference-20261020-frontend.zip`, 45 files, 1,402,558 bytes.

SHA256: `6f3c2e89d08349dc19c2cc8f4efab5dabfda008c18968a9a5ccd10041da900ba`.

Uploaded to the existing Hostinger ILAW website directory and extracted into `public_html` with overwrite enabled. Package verified not to contain PHP, authentication configuration, private files, database files or the original reference document. Existing login, saved data, prior backups and old hashed chunks were left intact. New reference controls verified at https://ilaw.lenybuilds.com/.
