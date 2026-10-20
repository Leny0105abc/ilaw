/* eslint-disable @typescript-eslint/no-require-imports -- Application TypeScript integration harness. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname,'..');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function(request,parent,...args){return originalResolve.call(this,request.startsWith('@/')?path.join(root,request.slice(2)):request,parent,...args);};
require.extensions['.ts'] = (module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const g = require('../services/powerpoint-generator.ts');
const e = require('../services/powerpoint-export.ts');
const storage = require('../services/powerpoint-storage.ts');
const {competencies} = require('../data/curriculum.ts');
const {generateLessonPlan} = require('../services/generator.ts');
const {defaultProfile} = require('../types/lesson-plan.ts');
const zipRequire = Module.createRequire(require.resolve('pptxgenjs'));
const JSZip = zipRequire('jszip');
function fixture(count=20,organization='four-day'){
  const p=g.seedPowerPoint(); const c=g.scheduledCompetencies(p)[0];
  return {...p,slideCount:count,organization,title:'Beauty care tools',competencies:[{id:c.id,text:c.text,source:c.source}]};
}
const facts=[['Nail file','Shapes the free edge of a nail.'],['Nail brush','Removes debris around the nails.'],['Cuticle pusher','Gently pushes back cuticles.'],['Nail clipper','Shortens the free edge of a nail.'],['Buffer','Smooths the nail surface.']];
function response(slots){return {slides:slots.map(slot=>({number:slot.number,title:slot.kind==='quiz'?'Check your understanding':`Lesson ${slot.number}: ${slot.kind}`,bullets:['quiz','title','competency','divider','answer-key'].includes(slot.kind)?[]:facts.map(([name,fact])=>`${name}: ${fact}`).slice(0,3),visual:'',table:null,notes:'Teacher review is required. Test fixture, not a live AI response.',questions:slot.quizNumbers.map(number=>({number,question:`Which tool ${facts[number-1][1].charAt(0).toLowerCase()+facts[number-1][1].slice(1,-1)}?`,choices:{A:facts[number-1][0],B:facts[number%5][0],C:facts[(number+1)%5][0],D:facts[(number+2)%5][0]},correctAnswer:'A',rationale:facts[number-1][1]}))}))};}
async function main(){
  const longTitle='A lesson about '+ 'important curriculum concepts '.repeat(12);
  assert.ok(g.concisePowerPointTitle(longTitle).length<=110);
  assert.equal(g.concisePowerPointTitle('Short lesson title'),'Short lesson title');
  for(const count of [15,20,25,30]) for(const organization of ['weekly','four-day']){
    const input=fixture(count,organization);const before=JSON.stringify(input); const slots=g.slidePlan(input);
    assert.equal(slots.length,count);assert.equal(slots.filter(s=>s.kind==='divider').length,organization==='four-day'?4:0);
    assert.deepEqual(slots.flatMap(s=>s.quizNumbers),[1,2,3,4,5]);
    let calls=0;const deck=await g.generatePowerPoint(input,undefined,async payload=>{calls++;assert.ok(payload.slots.length<=5);return response(payload.slots);});
    assert.equal(deck.slides.length,count); assert.equal(calls,Math.ceil(count/5)); assert.equal(JSON.stringify(input),before);
    assert.deepEqual(g.displayBullets(deck,deck.slides.at(-1)),['1. A','2. A','3. A','4. A','5. A']);
    const envelope={version:1,requestId:g.powerPointRequestId(input),...response(slots)};
    assert.equal(g.importPowerPointResponse(input,'```json\n'+JSON.stringify(envelope)+'\n```').slides.length,count);
    assert.throws(()=>g.importPowerPointResponse({...input,week:input.week+1},JSON.stringify(envelope)),/different lesson/);
    assert.throws(()=>g.importPowerPointResponse(input,JSON.stringify({...envelope,slides:envelope.slides.slice(1)})),/exactly/);
  }
  // Real curriculum combinations, including the user's Grade 9 GMRC Term 2 selection.
  for(const grade of [7,8,9,10]){
    const row=competencies.find(c=>c.grade===grade);assert.ok(g.scheduledCompetencies({grade,subject:row.area,term:row.term,week:row.weeks[0]}).some(c=>c.id===row.id));
  }
  const gmrc=competencies.find(c=>c.grade===9 && /Good Manners|GMRC/.test(c.area) && c.term===2); assert.ok(gmrc);
  assert.ok(g.scheduledCompetencies({grade:9,subject:gmrc.area,term:2,week:gmrc.weeks[0]}).length);
  const input=fixture();const slots=g.slidePlan(input);
  let deck=g.importPowerPointResponse(input,JSON.stringify({version:1,requestId:g.powerPointRequestId(input),...response(slots)}));
  const target=deck.slides.find(s=>s.kind==='content'); const originalSlides=JSON.stringify(deck.slides.filter(s=>s.id!==target.id));let calls=0;
  const replacement=await g.generatePowerPoint(deck,undefined,async payload=>{calls++;assert.equal(payload.slots.length,1);const result=response(payload.slots);result.slides[0].title='Edited explanation';return result;},undefined,target.id);
  assert.equal(calls,1);assert.equal(JSON.stringify(replacement.slides.filter(s=>s.id!==target.id)),originalSlides);
  assert.equal(replacement.slides.find(s=>s.id===target.id).title,'Edited explanation');
  assert.throws(()=>g.slotForSlide(deck,deck.slides[1].id),/fixed information/);
  const wrong=structuredClone(deck);wrong.slides[1].bullets=['Changed official wording'];assert.throws(()=>g.assertPowerPointReady(wrong),/Official/);
  const key=structuredClone(deck);key.slides.find(s=>s.kind==='quiz').questions[0].correctAnswer='B';assert.equal(g.displayBullets(key,key.slides.at(-1))[0],'1. B');
  const missing=structuredClone(deck);missing.slides=missing.slides.filter(s=>s.kind!=='quiz');assert.throws(()=>g.assertPowerPointReady(missing),/five quiz/);
  const extra=structuredClone(deck);extra.slides[4].bullets=Array(7).fill('Too many bullets');assert.throws(()=>g.assertPowerPointReady(extra),/six short/);
  const storageMap=new Map([['ilaw.lessonPlans.v1','existing lessons'],['ilaw.assessments.v1','existing tests']]);
  global.window={localStorage:{getItem:key=>storageMap.get(key)||null,setItem:(key,value)=>storageMap.set(key,value)}};
  global.localStorage=global.window.localStorage;
  storage.savePowerPoints([deck]);assert.deepEqual(storage.loadPowerPoints(),JSON.parse(JSON.stringify([deck])));
  const copy={...structuredClone(deck),id:crypto.randomUUID(),title:deck.title+' (Copy)'};storage.savePowerPoints([copy,deck]);assert.equal(storage.loadPowerPoints().length,2);
  storage.savePowerPoints(storage.loadPowerPoints().filter(p=>p.id!==copy.id));assert.equal(storage.loadPowerPoints().length,1);
  assert.equal(storageMap.get('ilaw.lessonPlans.v1'),'existing lessons');assert.equal(storageMap.get('ilaw.assessments.v1'),'existing tests');
  delete global.window;
  delete global.localStorage;
  // Lesson-plan metadata and learning context are copied, never the teacher profile.
  const c=g.scheduledCompetencies(input)[0];
  const lesson=generateLessonPlan({grade:input.grade,area:input.subject,term:input.term,week:input.week,section:'Private section',schoolYear:'2026–2027',duration:50,competencies:[c],learnerContext:'Mixed prior knowledge.',topic:'',sessions:4,availableResources:'Worksheets',instructions:'',flowFormat:'ilaw',profile:{...defaultProfile,teacherName:'PRIVATE_TEACHER'}});
  const seeded=g.seedPowerPoint(lesson);assert.equal(seeded.sourcePlanId,lesson.id);assert.deepEqual(seeded.sourceLesson.sessions,lesson.sessions);assert.equal(seeded.grade,lesson.grade);
  assert.ok(!g.buildPowerPointPrompt(seeded).includes('PRIVATE_TEACHER'));assert.ok(!g.buildPowerPointPrompt(seeded).includes('Private section'));
  // Native editable table, text and shape export, with exact slide count.
  const tableSlide=deck.slides.find(s=>s.kind==='content');tableSlide.bullets=[];tableSlide.table={headers:['Tool','Function'],rows:facts.slice(0,3)};
  deck.slides.find(s=>s.kind==='motivation').visual='Insert labeled images of manicure tools.';
  const output=await e.buildPowerPointBytes(deck); const zip=await JSZip.loadAsync(output);
  const contentTypes=await zip.file('[Content_Types].xml').async('string');
  for(const match of contentTypes.matchAll(/PartName="\/([^\"]+)"/g)) assert.ok(zip.file(match[1]),`Declared package part must exist: ${match[1]}`);
  const slides=Object.keys(zip.files).filter(name=>/^ppt\/slides\/slide\d+\.xml$/.test(name));assert.equal(slides.length,20);
  const xmls=await Promise.all(slides.map(name=>zip.file(name).async('string')));assert.ok(xmls.some(xml=>xml.includes('<a:tbl>')));assert.ok(xmls.every(xml=>xml.includes('<a:t>')));assert.ok(!xmls.some(xml=>xml.includes('<p:pic>')));
  assert.ok(xmls.some(xml=>xml.includes('Insert labeled images')));assert.ok(xmls.some(xml=>xml.includes('1. A')));
  const notes=await zip.file('ppt/notesSlides/notesSlide20.xml').async('string');assert.ok(notes.includes('Teacher review'));
  const safe=structuredClone(deck);safe.slides[4].title='<script>alert(1)</script>';const html=e.powerPointPrintHtml(safe);assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));
  assert.equal((html.match(/<section class="slide">/g)||[]).length,20);
  assert.ok(!/[<>:"/\\|?*]/.test(e.powerPointFilename(deck)));
  const qa=path.join(root,'.powerpoint-qa');fs.mkdirSync(qa,{recursive:true});fs.writeFileSync(path.join(qa,'weekly-tools.pptx'),output);
  console.log('PASS: slide counts, curriculum, lesson integration, strict JSON import, single-slide regeneration, quiz/key sync, storage, editable PPTX and safe print HTML. AI transport was mocked; provider factual quality is not proven by these tests.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
