/* eslint-disable @typescript-eslint/no-require-imports -- Test the actual TypeScript services and rendered components. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, ...args) { return resolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, parent, ...args); };
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (m, file) => m._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, file);
const g = require('../services/las-generator.ts');
const e = require('../services/las-export.ts');
const store = require('../services/las-storage.ts');
const { generateLessonPlan } = require('../services/generator.ts');
const { competencies } = require('../data/curriculum.ts');
const setup = require('../services/las-setup.ts');
const { lasActivityLabels } = require('../types/las.ts');
const { defaultProfile } = require('../types/lesson-plan.ts');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { LasBuilder } = require('../components/las-builder.tsx');
const { LasLibrary } = require('../components/las-library.tsx');
const JSZip = require('jszip');
function lesson(grade = 8, gmrc = false) {
  const c = competencies.find(c => c.grade === grade && (/Good Manners/.test(c.area) === gmrc));
  assert.ok(c);
  return generateLessonPlan({ grade, area: c.area, term: c.term, week: c.weeks[0], section: 'PRIVATE_SECTION', schoolYear: '2026–2027', duration: 50, competencies: [c], learnerContext: 'Mixed prior knowledge.', topic: '', sessions: 4, availableResources: 'Worksheets', instructions: '', flowFormat: 'ilaw', profile: { ...defaultProfile, teacherName: 'PRIVATE_TEACHER' } });
}
function assertMixed(value, sessionCounts) {
  assert.equal(value.activityType, 'mixed');
  assert.equal(value.mixedPreset, 'session-types-5-v1');
  assert.equal(value.minimumMultipleChoiceQuestions, undefined, 'Mixed Session3 must not inherit pure-MC10 minimum');
  const tasks = value.sheets.flatMap(s => s.tasks), counts = g.lasActivityCounts(value);
  const types = ['true-false','matching','multiple-choice','identification'];
  const expected = {'multiple-choice':0,matching:0,'true-false':0,identification:0,essay:0,performance:0};
  for (const sheet of value.sheets) {
    const type = types[sheet.session-1];
    assert.equal(g.lasMixedSessionType(sheet.session),type,'Session-to-type mapping is fixed');
    assert.equal(sheet.tasks.length,5,`Session ${sheet.session}: exactly five items`);
    assert.ok(sheet.tasks.every(t=>t.type===type),`Session ${sheet.session}: only ${type}`);
    expected[type] += 5;
  }
  assert.deepEqual(g.lasExpectedMixedCounts(value),expected);
  const total = value.selectedSessions.length*5;
  assert.equal(tasks.length,total); assert.equal(new Set(tasks.map(t=>t.id)).size,total);
  for (const [type, count] of Object.entries(expected)) {
    assert.equal(counts[type], count, `Mixed ${type} count`);
    assert.equal(new Set(tasks.filter(t => t.type === type).map(t => t.prompt)).size, count, `Distinct ${type} items`);
  }
  assert.equal(counts.performance || 0, 0);
  if (sessionCounts) assert.deepEqual(value.sheets.map(s => s.tasks.length), sessionCounts);
  for (const task of tasks.filter(t => t.type === 'matching')) {
    assert.equal(task.matchingChoices.length, 5); assert.equal(new Set(task.matchingChoices).size, 5);
    assert.ok(Number.isInteger(task.matchingAnswer) && task.matchingAnswer >= 0 && task.matchingAnswer < 5);
    assert.ok(e.lasTaskAnswer(task).includes(String.fromCharCode(65 + task.matchingAnswer)), 'Matching key uses selected letter');
  }
  const trueFalse = tasks.filter(t => t.type === 'true-false');
  if(trueFalse.length) assert.equal(new Set(trueFalse.map(t => t.truthValue)).size, 2, 'T/F includes true and false answers');
  for (const task of trueFalse) { assert.equal(typeof task.truthValue, 'boolean'); assert.match(e.lasTaskAnswer(task), task.truthValue ? /True|Tama/i : /False|Mali/i); }
  for (const part of ['student','teacher']) {
    const numbered = e.lasBlocks(value,part).filter(b => b.keepNext && /^\d+\. /.test(b.text));
    assert.deepEqual(numbered.map(b => Number(b.text.match(/^(\d+)\./)[1])), Array.from({length:total},(_,i)=>i+1), `${part}: continuous numbering across selected sessions`);
  }
  g.validateLas(value);
}
function assertCleanOutput(value) {
  const before = JSON.stringify(value);
  for (const part of ['student','teacher']) {
    const blocks = e.lasBlocks(value,part);
    assert.ok(!blocks.some(b => /^Learning Objectives(?::|$)/i.test(b.text)), `${part}: objectives stay internal`);
    assert.ok(!blocks.some(b => /^(?:\d+\.\s*)?(?:\[MC\]\s*|(?:Objective|Layunin)\s+\d+\s*:)/im.test(b.text)), `${part}: no leading question metadata`);
    for (const sheet of value.sheets) for (const task of sheet.tasks) {
      const clean = e.lasQuestionPrompt(task.prompt);
      assert.ok(blocks.some(b => b.text.includes(clean)), `${part}: meaningful question text retained`);
      if (part === 'student' && task.options) for (const [i,option] of task.options.entries()) assert.ok(blocks.some(b => b.text.includes(`${String.fromCharCode(65+i)}. ${option}`)), 'All MC choices retained');
    }
  }
  assert.equal(JSON.stringify(value),before,'Output cleanup never mutates saved prompts or alignment objectives');
}
async function main() {
  for (const [input,expected] of [
    ['Objective 1: Which response shows understanding?','Which response shows understanding?'],
    ['[MC] Objective 1: Which response shows understanding?','Which response shows understanding?'],
    ['[MC] Which response shows understanding?','Which response shows understanding?'],
    [' Layunin 2: Alin ang tamang sagot?','Alin ang tamang sagot?'],
    ['[MC] Objective 1: [MC] Layunin 2: Use <h1> for the page heading.','Use <h1> for the page heading.'],
    ['What is objective evidence?','What is objective evidence?'],
    ['Objective evidence supports a conclusion.','Objective evidence supports a conclusion.'],
    ['1. Objective 1: Keep standalone question numbering intact.','1. Objective 1: Keep standalone question numbering intact.'],
  ]) assert.equal(e.lasQuestionPrompt(input),expected,'Only anchored numbered objective/MC metadata is removed');
  assert.deepEqual(g.LAS_MIXED_COUNTS, {'multiple-choice':5, matching:5, 'true-false':5, identification:5, essay:0});
  assert.throws(()=>g.lasMixedSessionType(0)); assert.throws(()=>g.lasMixedSessionType(5));
  for (const grade of [7, 8, 9, 10]) for (const gmrc of (grade >= 9 ? [false, true] : [false])) {
    const p = lesson(grade, gmrc), before = JSON.stringify(p);
    const las = g.generateLas(p);
    assert.equal(las.sheets.length, 4); assert.equal(las.language, gmrc ? 'Filipino' : 'English');
    assert.deepEqual(las.selectedSessions, [1, 2, 3, 4]); assert.equal(las.sourcePlan.competencyText, p.competencyText);
    assert.notEqual(las.sourcePlan, p); assert.equal(JSON.stringify(p), before);
    assertMixed(las,[5,5,5,5]);
    assertCleanOutput(las);
    assert.ok(las.sheets.flatMap(s=>s.tasks).every(t=>!/^(?:Objective|Layunin)\s+\d+\s*:/.test(t.prompt)),'New starters do not embed objective-number prefixes');
    assert.ok(las.sheets.every(s=>s.tasks.every(t=>t.type!=='essay')),'New Mixed sequence contains no essays');
    assert.equal(new Set(las.sheets.map(s => s.tasks[0].prompt)).size, 4, 'Session activities differ');
    g.validateLas(las);
    const prompt = g.buildLasPrompt(las); assert.ok(prompt.includes(p.competencyText)); assert.ok(!prompt.includes('PRIVATE_TEACHER')); assert.ok(!prompt.includes('PRIVATE_SECTION'));
    assert.ok(prompt.includes(g.lasRequestId(las)));
    const response = { version: 1, requestId: g.lasRequestId(las), sheets: structuredClone(las.sheets) };
    const imported = g.importLasResponse(las, '```json\n' + JSON.stringify(response) + '\n```');
    assert.equal(imported.sheets.length, 4); assert.equal(imported.teacherReviewed, false);
    assert.equal(imported.sourcePlan.competencyText, p.competencyText);
    assert.throws(() => g.importLasResponse(las, '{broken'), /Invalid JSON/);
    assert.throws(() => g.importLasResponse(las, JSON.stringify({ ...response, requestId: 'old' })), /older/);
    assert.throws(() => g.importLasResponse(las, JSON.stringify({ ...response, sheets: response.sheets.slice(0, 2) })), /Session/);
    const missing = structuredClone(response); missing.sheets[0].tasks.pop(); assert.throws(() => g.importLasResponse(las, JSON.stringify(missing)), /Incomplete|every task/);
    const noKey = structuredClone(response); noKey.sheets[0].tasks[0].answer = ''; assert.throws(() => g.importLasResponse(las, JSON.stringify(noKey)), /Incomplete/);
    const dupe = structuredClone(response); dupe.sheets[1] = structuredClone(dupe.sheets[0]); assert.throws(() => g.importLasResponse(las, JSON.stringify(dupe)), /Session/);
    const older = { ...las, updatedAt: 'changed' }; assert.throws(() => g.importLasResponse(older, JSON.stringify(response)), /older/);
    assert.equal(g.generateLas(p, [2, 2, 4]).sheets.length, 2);
    assert.throws(() => g.generateLas(p, []), /Select/); assert.throws(() => g.generateLas(p, [99]), /Select/);
    assert.throws(() => g.generateLas({ ...p, competencyText: '' }), /competency/);
    assert.ok(await e.lasPageCount(las) <= 3, `${grade} ${gmrc}: all four sessions fit`);
    await e.assertLasPageLimit(las);
    for (const sessions of [[1], [2], [3], [4], [1,3], [2,4], [1,2,3], [1,2,3,4]]) {
      const mixed = g.generateLas(p,sessions,'mixed');
      assertMixed(mixed,sessions.map(()=>5));
      assert.deepEqual(mixed.sheets.map(s=>s.session),sessions,'Subset retains actual lesson numbers');
      const subsetPrompt=g.buildLasPrompt(mixed);
      assert.ok(!subsetPrompt.includes('Provide exactly 22 questions TOTAL'));
      assert.ok(!subsetPrompt.includes('2 short essays'));
      if(sessions.length===1 && sessions[0]===3) assert.equal(g.lasMultipleChoiceCount(mixed),5,'Mixed Lesson3 stays five MC, not ten');
      await e.assertLasPageLimit(mixed);
      const mc = g.generateLas(p, sessions, 'multiple-choice');
      const tasks = mc.sheets.flatMap(s => s.tasks);
      assert.equal(g.lasMultipleChoiceCount(mc),10); assert.equal(mc.minimumMultipleChoiceQuestions,10);
      assert.equal(new Set(tasks.map(t => t.id)).size,10);
      assert.equal(new Set(tasks.map(t => t.prompt)).size,10,'Ten distinct MC starters');
      assert.equal(new Set(tasks.map(t => t.correctOption)).size,4,'Answer positions vary');
      assert.deepEqual(mc.sheets.map(s => s.tasks.length), sessions.map((_, i) => Math.floor(10/sessions.length)+(i<10%sessions.length?1:0)));
      for (const task of tasks) { assert.equal(task.options.length,4); assert.equal(new Set(task.options).size,4); assert.ok(e.lasTaskAnswer(task).startsWith(String.fromCharCode(65+task.correctOption)+'. '+task.options[task.correctOption])); }
      g.validateLas(mc); await e.assertLasPageLimit(mc);
      assertCleanOutput(mc);
    }
  }
  const p = lesson(), las = g.generateLas(p, [1, 3]);
  las.sheets[0].tasks[0].answer = 'TEACHER_ONLY_SECRET_ANSWER';
  const student = e.lasBlocks(las, 'student').map(b => b.text).join('\n');
  const teacher = e.lasBlocks(las, 'teacher').map(b => b.text).join('\n');
  assert.ok(!student.includes('TEACHER_ONLY_SECRET_ANSWER')); assert.ok(teacher.includes('TEACHER_ONLY_SECRET_ANSWER'));
  await assert.rejects(() => e.lasPrintHtml(las, 'student'), /review/i);
  await assert.rejects(() => e.buildLasWord(las, 'student'), /review/i);
  las.teacherReviewed = true;
  las.sheets[0].reading = '<script>alert("xss")</script> & HTML <h1>heading</h1>';
  const html = await e.lasPrintHtml(las, 'student'); assert.ok(!html.includes('<script>')); assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('TEACHER_ONLY_SECRET_ANSWER'));
  assert.ok(!/[<>:"/\\|?*]/.test(e.lasFilename(las, 'student', 'docx')));
  const bytes = await e.buildLasWord(las, 'student'), guide = await e.buildLasWord(las, 'teacher');
  const doc = await JSZip.loadAsync(bytes), guideDoc = await JSZip.loadAsync(guide);
  const xml = await doc.file('word/document.xml').async('string');
  assert.ok(xml.includes('<w:t')); assert.ok(!xml.includes('TEACHER_ONLY_SECRET_ANSWER')); assert.ok(!xml.includes('<w:drawing>'));
  assert.equal((xml.match(/<w:pageBreakBefore\/>/g) || []).length, (await e.lasPageCount(las)) - 1);
  assert.ok((await guideDoc.file('word/document.xml').async('string')).includes('TEACHER_ONLY_SECRET_ANSWER'));
  const pdf = await e.buildLasPdf(las, 'student'); assert.ok(Buffer.from(pdf).toString('latin1').startsWith('%PDF-'));
  const gmrc = g.generateLas(lesson(9, true), [1]); gmrc.teacherReviewed = true; await e.buildLasPdf(gmrc, 'student');
  const long = structuredClone(las); for (const sheet of long.sheets) sheet.reading = 'Long reading for pagination. '.repeat(350);
  assert.ok(await e.lasPageCount(long) > 3);
  await assert.rejects(() => e.buildLasPdf(long, 'student'), /maximum is 3/);
  await assert.rejects(() => e.buildLasWord(long, 'student'), /maximum is 3/);
  await assert.rejects(() => e.lasPrintHtml(long, 'student'), /maximum is 3/);
  const official = setup.lasCompetencies(8, 'Family and Consumer Science', 2, 1);
  assert.equal(official.length, 3);
  const source = setup.createLasSource({ grade: 8, area: 'Family and Consumer Science', term: 2, week: 1, selected: official, profile: defaultProfile });
  assert.equal(source.competencyText, official.map(c => c.text).join('\n'));
  const mixed = g.generateLas(source,[1,2,3,4],'mixed',official.map(c=>c.text));
  assertMixed(mixed,[5,5,5,5]); await e.assertLasPageLimit(mixed);
  const editedDirections = structuredClone(mixed);
  editedDirections.sheets[1].directions = 'Work with a partner, then answer independently.';
  for (const part of ['student','teacher']) {
    const exported = e.lasBlocks(editedDirections,part).map(b=>b.text).join('\n');
    assert.ok(exported.includes(editedDirections.sheets[1].directions));
    assert.ok(exported.includes(editedDirections.sheets[0].directions));
  }
  assert.ok(official.every(c=>mixed.sheets.some(s=>s.objectives.includes(c.text))));
  const tooManyFocus=Array.from({length:6},(_,i)=>`Selected competency ${i+1}.`);
  assert.throws(()=>g.generateLas({...source,competencyText:tooManyFocus.join('\n')},[1],'mixed',tooManyFocus),/competenc|fewer|five|5/i,'Never silently drop selected competency coverage');
  const mixedPrompt = g.buildLasPrompt(mixed);
  assert.ok(mixedPrompt.includes('20')); assert.ok(mixedPrompt.includes('matching')); assert.ok(!mixedPrompt.includes('10 DISTINCT multiple-choice questions TOTAL'));
  assert.ok(!mixedPrompt.includes('Provide exactly 22 questions TOTAL')); assert.ok(!mixedPrompt.includes('2 short essays'));
  assert.ok(mixedPrompt.includes('true-false') && mixedPrompt.includes('identification'));
  for(const instruction of ['Session 1 is True or False only','Session 2 is Matching only','Session 3 is Multiple Choice only','Session 4 is Identification only']) assert.ok(mixedPrompt.includes(instruction),'AI prompt preserves lesson-type sequence');
  const mixedResponse = {version:1,requestId:g.lasRequestId(mixed),sheets:structuredClone(mixed.sheets)};
  const mixedImported = g.importLasResponse(mixed,JSON.stringify(mixedResponse));
  assert.deepEqual(mixedImported.sheets,mixed.sheets); assert.equal(mixedImported.mixedPreset,mixed.mixedPreset);
  // Existing saved drafts and external-AI responses may still carry the old prefix.
  const prefixedResponse = structuredClone(mixedResponse);
  prefixedResponse.sheets.flatMap(s=>s.tasks).forEach((task,i)=>{task.prompt=(i%2?'Layunin 2: ':'[MC] Objective 1: ')+task.prompt;});
  const prefixedImported = g.importLasResponse(mixed,JSON.stringify(prefixedResponse));
  assert.deepEqual(prefixedImported.sheets,prefixedResponse.sheets,'Imported source content remains intact');
  assertMixed(prefixedImported,[5,5,5,5]); assertCleanOutput(prefixedImported);
  const savedPrefixed = JSON.parse(JSON.stringify(prefixedImported));
  assertMixed(savedPrefixed,[5,5,5,5]); assertCleanOutput(savedPrefixed);
  const missingMixed = structuredClone(mixedResponse); missingMixed.sheets[3].tasks.pop();
  assert.throws(()=>g.importLasResponse(mixed,JSON.stringify(missingMixed)),/every task|Incomplete|Mixed|mixed/);
  const wrongMixedType = structuredClone(mixedResponse);
  const wrongTask = wrongMixedType.sheets.flatMap(s=>s.tasks).find(t=>t.type==='identification'); wrongTask.type='essay';
  assert.throws(()=>g.importLasResponse(mixed,JSON.stringify(wrongMixedType)),/preserve/);
  const brokenMixed = structuredClone(mixed); brokenMixed.sheets[3].tasks.pop();
  assert.throws(()=>g.validateLas(brokenMixed),/Mixed|mixed|preset|count|requires|distribution/);
  const extraMixed=structuredClone(mixed); extraMixed.sheets[0].tasks.push({...extraMixed.sheets[0].tasks[0],id:'extra-tf'});
  assert.throws(()=>g.validateLas(extraMixed),/Mixed|mixed|preset|count|requires|five|5/i);
  const swappedMixed=structuredClone(mixed);
  [swappedMixed.sheets[0].tasks[0],swappedMixed.sheets[1].tasks[0]]=[swappedMixed.sheets[1].tasks[0],swappedMixed.sheets[0].tasks[0]];
  assert.deepEqual(g.lasActivityCounts(swappedMixed),g.lasActivityCounts(mixed),'Global counts alone are not sufficient');
  assert.throws(()=>g.validateLas(swappedMixed),/session|Mixed|mixed|type|five|5/i);
  const badMatch = structuredClone(mixed), matching = badMatch.sheets.flatMap(s=>s.tasks).find(t=>t.type==='matching'); matching.matchingChoices=['one','two'];
  assert.throws(()=>g.validateLas(badMatch));
  const badMatchKey = structuredClone(mixed); badMatchKey.sheets.flatMap(s=>s.tasks).find(t=>t.type==='matching').matchingAnswer=5; assert.throws(()=>g.validateLas(badMatchKey));
  const badTruth = structuredClone(mixed); delete badTruth.sheets.flatMap(s=>s.tasks).find(t=>t.type==='true-false').truthValue; assert.throws(()=>g.validateLas(badTruth));
  // A persisted old22 preset must remain valid and editable, not silently migrate.
  const old22=structuredClone(mixed); old22.id='legacy-22-fixture'; old22.mixedPreset=g.LAS_LEGACY_MIXED_PRESET;
  const oldSequence=['multiple-choice','multiple-choice','matching','matching','true-false','identification','multiple-choice','matching','true-false','true-false','identification','identification','multiple-choice','matching','true-false','identification','essay','multiple-choice','matching','true-false','identification','essay'];
  const oldSeen={}; let oldOffset=0;
  old22.sheets.forEach((sheet,index)=>{
    const count=[6,6,5,5][index];
    sheet.tasks=oldSequence.slice(oldOffset,oldOffset+count).map((type,i)=>{
      const kind=oldSeen[type]||0; oldSeen[type]=kind+1;
      const task=type==='essay'?{type,prompt:`Explain one lesson example ${kind+1}.`,answer:'Accurate idea and relevant example.',lines:3}:structuredClone(mixed.sheets.flatMap(s=>s.tasks).filter(t=>t.type===type)[kind]);
      return {...task,id:`legacy-session-${sheet.session}-task-${i+1}`};
    }); oldOffset+=count;
  });
  assert.equal(old22.mixedPreset,'5mc-5match-5tf-5id-2essay');
  const oldBefore=JSON.stringify(old22); g.validateLas(old22); assertCleanOutput(old22);
  assert.equal(JSON.stringify(old22),oldBefore,'Old22 validation/output does not migrate data');
  assert.deepEqual(g.lasActivityCounts(old22),{'multiple-choice':5,matching:5,'true-false':5,identification:5,essay:2,performance:0});
  assert.deepEqual(g.lasExpectedMixedCounts(old22),g.lasActivityCounts(old22));
  const oldPrompt=g.buildLasPrompt(old22); assert.ok(oldPrompt.includes('22')); assert.ok(oldPrompt.includes('2 short essays'));
  const oldImported=g.importLasResponse(old22,JSON.stringify({version:1,requestId:g.lasRequestId(old22),sheets:old22.sheets}));
  assert.deepEqual(oldImported.sheets,old22.sheets); assert.equal(oldImported.mixedPreset,old22.mixedPreset);
  for(const part of ['student','teacher']) assert.deepEqual(e.lasBlocks(old22,part).filter(b=>b.keepNext&&/^\d+\. /.test(b.text)).map(b=>Number(b.text.match(/^(\d+)\./)[1])),Array.from({length:22},(_,i)=>i+1));
  old22.teacherReviewed=true; await e.assertLasPageLimit(old22); await e.buildLasWord(old22,'student'); await e.buildLasPdf(old22,'teacher');
  const legacyMixed = structuredClone(mixed); delete legacyMixed.mixedPreset;
  const legacyTypes=['multiple-choice','matching','true-false','essay'];
  legacyMixed.sheets.forEach((s,i)=>{
    const task=structuredClone(old22.sheets.flatMap(sheet=>sheet.tasks).find(t=>t.type===legacyTypes[i]));
    delete task.matchingChoices; delete task.matchingAnswer; delete task.truthValue;
    if(task.type==='matching') {task.prompt='Match the lesson term to its description. 1. Example; A. Specific case; B. Unrelated detail.';task.answer='1. A.';}
    s.tasks=[task];
  });
  g.validateLas(legacyMixed);
  legacyMixed.sheets[0].tasks[0].prompt='[MC] Objective 1: Which <h1> tag is an HTML heading?';
  legacyMixed.sheets[1].tasks[0].prompt='Layunin 2: '+legacyMixed.sheets[1].tasks[0].prompt;
  assertCleanOutput(legacyMixed);
  const automatic = { mode:'curriculum', grade:8, area:'Family and Consumer Science', term:2, week:1, selected:official, sessions:[1,3], activityType:'essay' };
  assert.equal(setup.lasSetupReady(automatic), true);
  assert.equal(setup.lasSetupReady({...automatic,selected:[]}), false);
  assert.equal(setup.lasSetupReady({...automatic,sessions:[]}), false);
  assert.equal(setup.lasGenerationKey(automatic), setup.lasGenerationKey({...automatic,sessions:[3,1,1],selected:[...official].reverse()}));
  assert.notEqual(setup.lasGenerationKey(automatic), setup.lasGenerationKey({...automatic,activityType:'matching'}));
  const autoLas = setup.generateLasFromSetup(automatic,defaultProfile);
  assert.deepEqual(autoLas.selectedSessions,[1,3]); assert.equal(autoLas.activityType,'essay');
  assert.throws(() => setup.generateLasFromSetup({...automatic,selected:[]},defaultProfile), /Choose/);
  assert.equal(setup.lasSetupReady({mode:'lesson',lesson:null,sessions:[1],activityType:'mixed'}),false);
  assert.equal(setup.lasSetupReady({mode:'lesson',lesson:source,sessions:[99],activityType:'mixed'}),false);
  assert.equal(setup.generateLasFromSetup({mode:'lesson',lesson:source,sessions:[2],activityType:'matching'},defaultProfile).sheets[0].session,2);
  for (const sessions of [[1], [1,2,3,4]]) {
    const covered = g.generateLas(source, sessions, 'multiple-choice', official.map(c => c.text));
    assert.ok(official.every(c => covered.sheets.some(s => s.objectives.includes(c.text))));
    await e.assertLasPageLimit(covered);
  }
  assert.throws(() => setup.createLasSource({ grade: 9, area: 'Good Manners and Right Conduct', term: 2, week: 1, selected: official, profile: defaultProfile }), /Select/);
  assert.throws(() => setup.createLasSource({ grade: 8, area: 'Family and Consumer Science', term: 2, week: 1, selected: [], profile: defaultProfile }), /Select/);
  assert.ok(setup.lasCompetencies(9, 'ICT - Computer Programming', 'one-term', 1).length > 0);
  const gmrcOfficial = setup.lasCompetencies(9,'Good Manners and Right Conduct',2,1);
  const gmrcSource = setup.createLasSource({grade:9,area:'Good Manners and Right Conduct',term:2,week:1,selected:gmrcOfficial,profile:defaultProfile});
  for (const sessions of [[1],[1,2,3,4]]) { const gmrcMc = g.generateLas(gmrcSource,sessions,'multiple-choice',gmrcOfficial.map(c=>c.text)); assert.equal(g.lasMultipleChoiceCount(gmrcMc),10); await e.assertLasPageLimit(gmrcMc); const gmrcMixed=g.generateLas(gmrcSource,sessions,'mixed',gmrcOfficial.map(c=>c.text)); assertMixed(gmrcMixed); await e.assertLasPageLimit(gmrcMixed); }
  for (const type of ['mixed', ...Object.keys(lasActivityLabels)]) for (const sessions of [[1], [2], [3], [4], [1,2,3,4]]) {
    const typed = g.generateLas(source, sessions, type); g.validateLas(typed); await e.assertLasPageLimit(typed);
    if (type === 'mixed') assertMixed(typed); else assert.ok(typed.sheets.every(s => s.tasks.every(t => t.type === type)));
    const imported = g.importLasResponse(typed, JSON.stringify({ version: 1, requestId: g.lasRequestId(typed), sheets: typed.sheets }));
    assert.deepEqual(imported.sheets, typed.sheets);
  }
  const mc = g.generateLas(source, [1], 'multiple-choice');
  const tooFew = structuredClone(mc); tooFew.sheets[0].tasks.pop();
  assert.throws(() => g.validateLas(tooFew), /at least 10/);
  tooFew.sheets[0].tasks.push(structuredClone(mc.sheets[0].tasks.at(-1))); g.validateLas(tooFew);
  const legacyMc = structuredClone(mc); delete legacyMc.minimumMultipleChoiceQuestions; legacyMc.sheets[0].tasks = legacyMc.sheets[0].tasks.slice(0,1); g.validateLas(legacyMc);
  legacyMc.sheets[0].tasks[0].prompt='[MC] Objective 1: Which response shows understanding?'; assertCleanOutput(legacyMc);
  assert.ok(g.buildLasPrompt(mc).includes('10 DISTINCT multiple-choice questions TOTAL'));
  const badMc = structuredClone(mc); badMc.sheets[0].tasks[0].options = ['A','B']; assert.throws(() => g.validateLas(badMc));
  const changedType = structuredClone(mc.sheets); changedType[0].tasks[0] = { ...changedType[0].tasks[0], type:'essay', options: undefined, correctOption: undefined };
  assert.throws(() => g.importLasResponse(mc, JSON.stringify({version:1,requestId:g.lasRequestId(mc),sheets:changedType})), /preserve/);
  const studentMc = e.lasBlocks(mc, 'student').map(b => b.text).join('\n');
  assert.ok(studentMc.includes('A. Use a relevant example')); assert.ok(!studentMc.includes('Answer / checking guide:'));
  const map = new Map([['ilaw.lessonPlans.v1', 'preserved plans'], ['ilaw.assessments.v1', 'preserved tests']]);
  global.window = {}; global.localStorage = { getItem: k => map.get(k) || null, setItem: (k, v) => map.set(k, v) };
  store.saveLas([las]); assert.deepEqual(store.loadLas(), [las]); assert.equal(map.get('ilaw.lessonPlans.v1'), 'preserved plans'); assert.equal(map.get('ilaw.assessments.v1'), 'preserved tests');
  store.saveLas([legacyMc, mc]); assert.deepEqual(store.loadLas(), [legacyMc, mc]);
  store.saveLas([legacyMixed,old22,mixed,legacyMc,mc]); assert.deepEqual(store.loadLas(),[legacyMixed,old22,mixed,legacyMc,mc]);
  map.set('ilaw.learningActivitySheets.v1', 'corrupt'); assert.throws(() => store.loadLas()); assert.equal(map.get('ilaw.learningActivitySheets.v1'), 'corrupt');
  global.localStorage.setItem = () => { throw new Error('quota'); }; assert.throws(() => store.saveLas([las]), /storage may be full/);
  delete global.window; delete global.localStorage;
  const props = { plans: [p], initial: las, onSave() {}, onBack() {} };
  const markup = renderToStaticMarkup(React.createElement(LasBuilder, props));
  for (const label of ['Generate LAS', 'Student preview', 'Teacher answer guide', 'Generate LAS prompt', 'Save LAS', 'Word (.docx)', 'PDF', 'Print', 'Learning Competency']) assert.ok(markup.includes(label), label);
  const emptySetup = renderToStaticMarkup(React.createElement(LasBuilder, { plans: [], onSave(){}, onBack(){} }));
  assert.ok(!emptySetup.includes('Mixed preset: 22'),'New setup no longer advertises22 questions');
  assert.ok(!emptySetup.includes('2 short essays'),'New setup no longer advertises essays in Mixed');
  const mcMarkup = renderToStaticMarkup(React.createElement(LasBuilder,{plans:[],initial:mc,onSave(){},onBack(){}}));
  assert.ok(mcMarkup.includes('10 multiple-choice questions across 1 selected session'));
  for (const label of ['Grade Level','Learning Area','Term','Week','Select all competencies','Session 1','Session 2','Session 3','Session 4','Multiple choice','Matching type','Essay','maximum of 3','LAS activities will appear automatically']) assert.ok(emptySetup.includes(label), label);
  assert.ok(markup.includes('draft is protected from automatic replacement'));
  const unrevised = renderToStaticMarkup(React.createElement(LasBuilder, { ...props, initial: { ...las, teacherReviewed: false } }));
  assert.match(unrevised, /<button[^>]*disabled=""[^>]*>.*?Word \(\.docx\)/s);
  const library = renderToStaticMarkup(React.createElement(LasLibrary, { values: [las], onCreate() {}, onOpen() {}, onDuplicate() {}, onDelete() {}, error: '' }));
  assert.ok(library.includes('Open / Edit / Export')); assert.ok(library.includes('Duplicate')); assert.ok(library.includes('Delete'));
  const qa = path.join(root, '.las-qa'); fs.mkdirSync(qa, { recursive: true });
  fs.writeFileSync(path.join(qa, 'student.docx'), bytes); fs.writeFileSync(path.join(qa, 'student.pdf'), pdf); fs.writeFileSync(path.join(qa, 'teacher.docx'), guide);
  mc.teacherReviewed = true;
  const numbered = e.lasBlocks(mc,'student').map(b=>b.text).join('\n');
  for (let n=1;n<=10;n++) assert.ok(numbered.includes(`${n}. ${e.lasQuestionPrompt(mc.sheets[0].tasks[n-1].prompt)}`));
  assertCleanOutput(mc);
  fs.writeFileSync(path.join(qa,'mc-ten.pdf'), await e.buildLasPdf(mc,'student'));
  fs.writeFileSync(path.join(qa,'mc-ten.docx'), await e.buildLasWord(mc,'student'));
  fs.writeFileSync(path.join(qa,'mc-ten-key.pdf'), await e.buildLasPdf(mc,'teacher'));
  mixed.teacherReviewed=true;
  const mixedBytes=await e.buildLasWord(mixed,'student'), mixedPdf=await e.buildLasPdf(mixed,'student'), mixedKey=await e.buildLasPdf(mixed,'teacher');
  const mixedDoc=await JSZip.loadAsync(mixedBytes), mixedXml=await mixedDoc.file('word/document.xml').async('string');
  assert.ok(mixedXml.includes('<w:t')); assert.ok(!mixedXml.includes('<w:drawing>'));
  assert.equal((mixedXml.match(/<w:pageBreakBefore\/>/g)||[]).length,(await e.lasPageCount(mixed))-1);
  const mixedHtml=await e.lasPrintHtml(mixed,'student'); assert.ok(mixedHtml.includes('20.')); assert.ok(!mixedHtml.includes('21.')); assert.ok(!mixedHtml.includes('[Essay]'));
  for (const part of ['student','teacher']) {
    const cleanDoc=await JSZip.loadAsync(await e.buildLasWord({...savedPrefixed,teacherReviewed:true},part));
    const cleanXml=await cleanDoc.file('word/document.xml').async('string');
    const cleanHtml=await e.lasPrintHtml({...savedPrefixed,teacherReviewed:true},part);
    for (const output of [cleanXml,cleanHtml]) {
      assert.ok(!output.includes('Learning Objectives')); assert.ok(!output.includes('[MC]'));
      assert.ok(!/(?:Objective|Layunin)\s+[12]:/.test(output));
      assert.ok(output.includes('Which response shows understanding?'));
    }
    if(part==='student') assert.ok(cleanXml.includes('A. Use a relevant example and explain.'));
  }
  const teacherOnly=structuredClone(mixed); teacherOnly.sheets[0].tasks[0].answer='MIXED_TEACHER_ONLY_SECRET';
  assert.ok(!e.lasBlocks(teacherOnly,'student').some(b=>b.text.includes('MIXED_TEACHER_ONLY_SECRET')));
  assert.ok(e.lasBlocks(teacherOnly,'teacher').some(b=>b.text.includes('MIXED_TEACHER_ONLY_SECRET')));
  fs.writeFileSync(path.join(qa,'mixed-sequence-20.pdf'),mixedPdf); fs.writeFileSync(path.join(qa,'mixed-sequence-20.docx'),mixedBytes); fs.writeFileSync(path.join(qa,'mixed-sequence-20-key.pdf'),mixedKey);
  console.log('PASS LAS: curriculum snapshots; Grades7–10 TLE/GMRC; one/all/subset sessions; five questions per actual session in TF/Matching/MC/Identification order (20 for all4), structured keys and continuous numbering; old22 saved preset and pureMC10 unchanged; complete atomic JSON import; legacy/current storage; privacy; review gating; editable Word/PDF/Print, three-page limits and separate teacher keys. AI responses are fixtures, not factual certification.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
