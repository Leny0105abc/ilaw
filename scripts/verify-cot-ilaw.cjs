/* eslint-disable @typescript-eslint/no-require-imports -- Application export regression checks. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { fixture, response } = require('./verify-cot.cjs');
const g = require('../services/cot-generator.ts');
const format = require('../services/cot-ilaw-format.ts');
const exportsService = require('../services/cot-export.ts');
const JSZip = require('jszip');

async function main() {
  const draft = fixture();
  const lesson = g.generateCotMaterials(g.importCotResponse(draft, JSON.stringify(response(draft))));
  const before = JSON.stringify(lesson);
  const rows = format.cotIlawRows(lesson);
  assert.deepEqual(rows.map(r => r.label), ['Name of Lesson', 'Learning Area/s', 'Designed by Teacher/s', 'Grade Level and Section', 'Duration', 'References', 'Declaration of AI use', 'Intentions.', 'Learning Competency', 'Learning Objectives', 'Learner Context', 'Learning Experience.', 'Pre-Lesson', 'Flow', 'Learning Resources', 'Opportunities for integration', 'ASSESSMENT.', 'Formative Assessment', 'Ways Forward.', 'Extended learning opportunities', 'Reflections']);
  assert.equal(rows[8].content, lesson.sourcePlan.competencyText);
  assert.match(rows[9].content, /^1\. /);
  assert.ok(rows[9].content.includes('\n3. '));
  assert.ok(rows[6].content.includes('review and validation are still required'));
  assert.ok(rows[0].content.endsWith('(Week 3)'));
  assert.ok(rows[10].guidance.includes('strengths, interests, and possible barriers'));
  assert.ok(rows[13].guidance.includes('implement in 1 session'));
  assert.ok(rows[13].guidance.includes('well-being'));
  assert.ok(rows[14].guidance.includes('options and alternatives in case of emergencies'));
  assert.ok(rows[17].guidance.includes('appropriate accommodations'));
  assert.ok(rows[20].guidance.includes('instructional coach'));
  const activities = rows[12].content + '\n' + rows[13].content;
  assert.equal((activities.match(/SESSION 1 — /g) || []).length, 8, 'Every timed activity appears exactly once across Pre-Lesson and Flow');
  for (const a of lesson.activities) assert.ok(activities.includes(a.teacherActivity) && activities.includes(a.learnerActivity));
  assert.ok(activities.includes(lesson.indicators[0].wording));
  assert.ok(activities.includes('ANNOTATION'));
  assert.ok(activities.includes('not a completed observation or rating'));
  assert.equal((rows[17].content.match(/^[1-5]\. /gm) || []).length, 5);
  assert.ok(!rows[17].content.includes('Teacher answer'));
  assert.ok(!JSON.stringify(rows).includes('fish culture'), 'Do not copy irrelevant sample content');
  const html = exportsService.cotPrintHtml(lesson, 'lesson');
  assert.match(html, /scope="row"/);
  assert.ok(html.includes('Bookman Old Style'));
  assert.ok(html.includes('&lt;h1&gt;'));
  assert.ok(html.includes('grid-template-columns:1fr 1fr'));
  assert.ok(exportsService.cotPrintHtml(lesson, 'lesson', 'detailed').includes('Expected Evidence'));
  assert.ok(g.buildCotPrompt(draft).includes('ILAW reference presentation'));
  const multi = g.setCotSessions(draft, [2, 4]);
  multi.objectives = draft.objectives;
  const multiLesson = g.importCotResponse(multi, JSON.stringify(response(multi)));
  const multiRows = format.cotIlawRows(multiLesson);
  assert.ok(multiRows[13].guidance.includes('the selected sessions'));
  for (const session of [2, 4]) assert.equal(((multiRows[12].content + multiRows[13].content).match(new RegExp(`SESSION ${session} — `, 'g')) || []).length, 8);
  const seal = new Uint8Array(fs.readFileSync(path.join(__dirname, '../public/deped-seal.png')));
  const bytes = await format.buildIlawCotWord(lesson, seal);
  const zip = await JSZip.loadAsync(bytes);
  const xml = await zip.file('word/document.xml').async('string');
  assert.ok(xml.includes('Bookman Old Style'));
  assert.ok(xml.includes('w:w="16838" w:h="11906"'));
  assert.ok(xml.includes('w:w="2972"') && xml.includes('w:w="13216"'));
  assert.ok(!xml.includes('<w:trHeight'));
  assert.ok(xml.includes('Prepared by:') && xml.includes('Checked and Reviewed by:'));
  assert.ok(Object.keys(zip.files).some(name => name.startsWith('word/media/') && name.endsWith('.png')));
  assert.ok(!xml.includes('Application Software'));
  assert.equal(JSON.stringify(lesson), before, 'Export must not mutate saved lesson data');
  const pdf = await format.buildIlawCotPdf(lesson, seal);
  // FORMAT_K reference: no observation/draft line under LESSON PLAN, underlined field labels, at most six pages.
  assert.ok(!xml.includes('Planned evidence only') && !xml.includes('Observer: ') && !html.includes('Planned evidence only'), 'No observation/draft line under LESSON PLAN');
  assert.ok(xml.includes('<w:u w:val="single"/>'), 'Field labels are underlined like FORMAT_K');
  assert.ok(format.estimateIlawPages(lesson, format.ilawLayout(lesson)) <= format.ILAW_MAX_PAGES, 'Word lesson plan is sized for six pages');
  assert.ok((Buffer.from(pdf).toString('latin1').match(/\/Type \/Page[^s]/g) || []).length <= format.ILAW_MAX_PAGES, 'PDF lesson plan fits six pages');
  if (process.argv.includes('--artifacts')) {
    const qa = path.join(__dirname, '../.cot-reference-qa');
    fs.mkdirSync(qa, { recursive: true });
    fs.writeFileSync(path.join(qa, 'ilaw-format-k-final.docx'), bytes);
    fs.writeFileSync(path.join(qa, 'ilaw-format-k-final.pdf'), pdf);
    fs.writeFileSync(path.join(qa, 'ilaw-format-k-final.html'), html);
  }
  console.log('ILAW COT checks passed: 21 reference rows, exact competency, numbered objectives, all timed activities, linked official annotations, two-column editable Word, PDF/print, signatures, legacy format, safe student copy and unchanged lesson data.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
