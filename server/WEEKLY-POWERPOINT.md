# Weekly PowerPoint module

This extends ILAW; existing login, curriculum, lesson plans and assessments are retained.

## Teacher workflow

1. Open **Weekly PowerPoint → Create PowerPoint**, or **Create PowerPoint** from a lesson plan.
2. Choose grade, subject, term and week. Select the official competencies and a lesson title; optionally attach a saved lesson plan and factual lesson notes.
3. Choose 15, 20, 25 or 30 slides and a four-day or continuous-week organization.
4. The default method creates a prompt for Gemini/Copilot. Copy it, obtain the complete JSON response, paste it back and import. Nothing is sent to an external AI automatically. Check lesson notes for personal information before sharing them.
5. Edit the slides, tables, speaker notes and five quiz questions. Regenerate requests only the selected slide; the final answer key is derived from the quiz.
6. Download an editable PPTX or use **Print / Save PDF** straight from the editor; no separate approval step is required. The PDF option uses the browser's print dialog and requires pop-ups to be allowed. **Preview all slides** optionally shows the whole deck with speaker notes, quiz answers and automatic checks (layout and official competency, real-life situation, quiz and answer key, picture placeholders, speaker notes). Downloads are blocked only when a check fails, for example when the deck has no complete real-life situation.
7. AI responses that break small layout rules are repaired on import instead of being rejected: bullets beyond six, a picture suggestion on a slide with more than four bullets, text beside a table, or stray text on quiz/situation slides are moved into that slide's speaker notes.

## Real-life situation slide

Every generated deck includes a **Real-Life Situation** slide (Day 3 in the four-day organization; before the final activity in the continuous organization). It has a familiar Philippine setting, a short 3–4 sentence story where an ordinary person must use the lesson to solve a problem or make a decision, and 2–3 guide questions under **Think & discuss**. Limits: setting 80, story 480 and each question 140 characters; long text is automatically sized to fit. The prompt also asks for one situation-based quiz item.

Teachers can edit the setting, story and questions, regenerate only that slide, or use **Add real-life situation** to insert another (blank) one. A deck cannot be downloaded without at least one complete situation slide. Stories use fictional names; teachers should check that each situation is realistic and appropriate for their learners.

Saved presentations use `ilaw.powerpoints.v1` in this browser's local storage. They are **not MySQL/cloud storage** and are not synced between devices. Competency wording is saved with each presentation. Clearing browser site data removes local records; downloading PPTX creates a separate document copy.

## Existing optional AI service

The secure method reuses `/api/assessment.php` with `operation: "powerpoint"`, authenticated sessions and CSRF protection. The trusted PHP schema/rules are in `public/ilaw-powerpoint-ai.php`. Existing private provider settings are reused; no API keys belong in frontend code or the release ZIP. Without a configured provider the app returns a visible error and keeps the draft unchanged. The manual prompt/import method needs no API key.

## Verification

Run `pnpm verify:powerpoint` (includes the real-life situation slot, import layout repair and export checks), `pnpm verify:assessment`, `pnpm verify:tos`, `pnpm verify:auth`, `php scripts/verify-powerpoint-ai.php`, and `pnpm build`.

Automated AI transport is mocked. These tests prove counts, parsing, quiz/key consistency, persistence, endpoint contracts and editable exports, **not live provider factual quality**. Teachers must review AI-generated lesson content.

## Hostinger rollout

Create a new release ZIP using `scripts/create-hostinger-package.py` after building. Back up the existing website outside `public_html` before merging the release contents into `public_html`.

**Keep the current production `.htaccess`, private `ilaw-auth.env`, auth state and backups unchanged.** The ZIP deliberately excludes private configuration and `.htaccess`. Do not use the old Basic Auth deployment instructions for the current PHP login. Keep Linux directories 0755 and files 0644.

After upload, verify the current login, anonymous asset/API protection, curriculum selection, JSON import, slide editing, persistence and an actual PPTX download. No publication is performed by the packaging script.
