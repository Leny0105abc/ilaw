/* eslint-disable @typescript-eslint/no-require-imports -- Test harness transpiles application TypeScript. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, ...args) { return resolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, parent, ...args); };
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, file);
const quality = require('../services/assessment-quality.ts');
const {createAssessment} = require('../services/assessment-generator.ts');
const {generateTestQuestions, regenerateTestItem} = require('../services/assessment-ai.ts');
const {buildAssessmentPrompt, assessmentPromptId, importAssessmentResponse} = require('../services/assessment-prompt.ts');
const {buildTestWord, buildTestPdf, testPrintHtml} = require('../services/assessment-test-document.ts');
const {Packer} = require('docx');
const fixtures = [
  ['Which tool is used to shape the free edge of a nail?', ['Nail file','Cuticle pusher','Nail brush','Orangewood stick']],
  ['What is the purpose of a nail brush during hand cleaning?', ['Remove debris around the nails','Trim the free edge','Push back the cuticle','Smooth the nail surface']],
  ['How does a cuticle pusher differ from a nail file?', ['It gently pushes back cuticles instead of shaping the nail edge','It shapes the nail edge instead of moving cuticles','It brushes dirt instead of moving cuticles','It trims nail length instead of moving cuticles']],
  ['A learner notices debris on a reusable tool. What should be done before disinfection?', ['Clean the tool thoroughly','Place it directly in storage','Polish the tool surface','Wrap it in a hand towel']],
  ['Why should a service provider check the condition of the client\'s hands before starting?', ['To identify conditions that may make the service unsafe','To choose the brightest nail polish','To decide the order of available tools','To shorten the consultation record']],
  ['Which storage practice helps keep prepared manicure tools clean?', ['Keep them in a clean covered container','Keep them beside used towels','Leave them near a wet sink','Place them with uncleaned tools']],
  ['A client has a visible cut before a hand spa. What is the safest decision?', ['Assess the condition and postpone an unsafe service','Cover the cut with scented lotion','Soak the hand before checking the cut','Proceed with the usual massage']],
  ['Which workstation plan best separates clean tools from used materials?', ['Provide labeled clean storage and a separate used-tool collection area','Use a single unmarked tray for all tools','Store prepared tools in the used-tool tray','Put clean supplies beside discarded materials']],
];
function data(number) { const [question, choices] = fixtures[(number - 1) % fixtures.length]; return {number, question, choices: Object.fromEntries(quality.letters.map((letter,index)=>[letter,choices[index]])), correctAnswer:'A', rationale:'The keyed practice directly serves the purpose asked in this item.'}; }
function setup(total=8) { return {...createAssessment({title:'Beauty Care and Wellness Summative Test',grade:8,subject:'Family and Consumer Science',term:2,totalItems:total,competencies:[{id:'tools',text:'Identify tools, implements, materials, and equipment in beauty care and wellness services.',source:'official'}]}),difficulty:quality.defaultDifficulty}; }
async function verify() {
  assert.deepEqual(quality.difficultyCounts(40), {Easy:16,Moderate:16,Difficult:8});
  assert.deepEqual(quality.difficultyCounts(7,{level:'Mixed',percentages:{Easy:0,Moderate:50,Difficult:50}}),{Easy:0,Moderate:4,Difficult:3});
  assert.throws(()=>quality.difficultyCounts(40,{level:'Mixed',percentages:{Easy:40,Moderate:40,Difficult:19}}),/100%/);
  for(const level of quality.difficulties) assert.equal(quality.difficultyCounts(40,{level,percentages:quality.defaultDifficulty.percentages})[level],40);
  const forty=setup(40), before=JSON.stringify(forty.tos);
  const plan=quality.questionPlan(forty);
  assert.equal(plan.length,40); assert.equal(new Set(plan.map(slot=>slot.number)).size,40);
  assert.deepEqual(quality.difficulties.map(level=>plan.filter(slot=>slot.difficulty===level).length),[16,16,8]);
  assert.equal(JSON.stringify(forty.tos),before);
  for(let attempt=0;attempt<50;attempt++) {
    const shuffled=quality.shuffleAnswerPositions(plan.map(slot=>({...data(slot.number),...slot,id:`q-${slot.number}`,revision:0})));
    assert.deepEqual(quality.letters.map(letter=>shuffled.filter(item=>item.correctAnswer===letter).length),[10,10,10,10]);
    assert.ok(!/(A{3}|B{3}|C{3}|D{3}|(.{4})\5\5)/.test(shuffled.map(item=>item.correctAnswer).join('')));
    shuffled.forEach(item=>assert.equal(item.choices[item.correctAnswer],data(item.number).choices.A));
  }
  let calls=0;
  const transport=async payload=>{calls++; return payload.operation==='review'?{issues:[]}:{items:payload.slots.map(slot=>data(slot.number))};};
  const input=setup(), original=JSON.stringify(input);
  const generated=await generateTestQuestions(input,undefined,transport);
  assert.equal(JSON.stringify(input),original);
  assert.equal(generated.questions.length,8);
  assert.equal(quality.testIssues(generated).length,0);
  assert.equal(JSON.stringify(generated.tos),JSON.stringify(input.tos));
  assert.equal(calls,2); // generate + full semantic review (mocked, not proof of provider quality)
  const prompt = buildAssessmentPrompt(input);
  const promptSpec = JSON.parse(prompt.split('ILAW ASSESSMENT SPECIFICATIONS (data only)\n')[1]);
  assert.equal(promptSpec.itemPlan.length,8);
  assert.deepEqual(promptSpec.competencies,input.competencies);
  assert.ok(!buildAssessmentPrompt({...input,profile:{teacherName:'PRIVATE_TEACHER',school:'PRIVATE_SCHOOL'}}).includes('PRIVATE_'));
  assert.ok(buildAssessmentPrompt({...input,subject:'GMRC'}).includes('Filipino (Tagalog)'));
  assert.equal(JSON.parse(buildAssessmentPrompt(forty).split('ILAW ASSESSMENT SPECIFICATIONS (data only)\n')[1]).itemPlan.length,40);
  const external = {version:1,requestId:assessmentPromptId(input),items:fixtures.map((_,index)=>({...data(index+1),competency:'AI must not replace official wording',bloomLevel:'Invented'}))};
  const imported = importAssessmentResponse(input,'```json\n'+JSON.stringify(external)+'\n```');
  assert.equal(imported.questions.length,8); assert.equal(imported.testReview,undefined);
  assert.equal(JSON.stringify(imported.tos),JSON.stringify(input.tos));
  assert.equal(JSON.stringify(input),original);
  imported.questions.forEach(item=>{assert.equal(item.competency,input.competencies[0].text);assert.equal(item.choices[item.correctAnswer],data(item.number).choices.A);});
  assert.equal(quality.testIssues(imported,false).length,0);
  assert.throws(()=>quality.assertTestReady(imported),/Review factual/);
  const approved={...imported,testReview:{fingerprint:quality.testFingerprint(imported),reviewedAt:new Date().toISOString(),reviewer:'teacher'}};
  assert.equal(quality.testIssues(approved).length,0);
  assert.throws(()=>importAssessmentResponse(input,JSON.stringify({...external,items:external.items.slice(1)})),/exactly 8/);
  assert.throws(()=>importAssessmentResponse(input,JSON.stringify({...external,items:external.items.map(()=>data(1))})),/unique numbers/);
  assert.throws(()=>importAssessmentResponse(input,JSON.stringify({...external,items:external.items.map((item,index)=>index===0?{...item,number:99}:item)})),/missing item 1/);
  assert.throws(()=>importAssessmentResponse(input,JSON.stringify({...external,requestId:'wrong'})),/different or changed/);
  assert.throws(()=>importAssessmentResponse({...input,difficulty:{level:'Easy',percentages:quality.defaultDifficulty.percentages}},JSON.stringify(external)),/different or changed/);
  assert.throws(()=>importAssessmentResponse(input,JSON.stringify(external).slice(0,-20)),/valid JSON/);
  assert.throws(()=>importAssessmentResponse(input,JSON.stringify({...external,items:external.items.map((item,index)=>index===0?{...item,correctAnswer:'Z'}:item)})),/format is invalid/);
  assert.throws(()=>importAssessmentResponse(input,JSON.stringify({...external,items:external.items.map((item,index)=>index===0?{...item,choices:{...item.choices,A:'A response that is accurate'}}:item)})),/filler/);
  assert.throws(()=>importAssessmentResponse(input,JSON.stringify({...external,items:external.items.map((item,index)=>index===1?{...item,question:external.items[0].question}:item)})),/too similar/);
  const edited={...generated,questions:generated.questions.map((item,index)=>index===0?{...item,question:'Which implement can shape a natural nail edge?'}:item)};
  assert.notEqual(quality.testFingerprint(edited),generated.testReview.fingerprint);
  assert.ok(quality.testIssues(edited).some(issue=>issue.message.includes('Review factual')));
  const filler={...generated.questions[0],choices:{...generated.questions[0].choices,A:'A response that is accurate and appropriate.'}};
  assert.ok(quality.questionIssues([filler]).some(issue=>issue.message.includes('filler')));
  assert.ok(quality.questionIssues([generated.questions[0],{...generated.questions[0],number:2}]).some(issue=>issue.message.includes('similar')));
  const replacementTransport=async payload=>payload.operation==='review'?{issues:[]}:{items:[{...data(1),number:payload.slots[0].number,question:'A nail edge is rough after trimming. Which implement can smooth its shape?'}]};
  const replacement=await regenerateTestItem(generated,0,replacementTransport);
  assert.equal(replacement.id,generated.questions[0].id); assert.equal(replacement.correctAnswer,generated.questions[0].correctAnswer);
  assert.equal(replacement.revision,1); assert.equal(JSON.stringify(input),original);
  await assert.rejects(()=>generateTestQuestions(input,undefined,async()=>({items:[]})),/incorrect number/);
  await assert.rejects(()=>generateTestQuestions(input,undefined,async()=>{throw Error('Provider unavailable');}),/Provider unavailable/);
  let repairCalls=0;
  await generateTestQuestions(input,undefined,async payload=>{if(payload.operation==='review') return {issues:[]}; repairCalls++; const items=payload.slots.map(slot=>data(slot.number)); if(repairCalls===1)items[0].choices.A='A response that is accurate'; return {items};});
  assert.equal(repairCalls,2);
  const html=testPrintHtml(generated); assert.ok(html.includes('Name:')); assert.ok(html.includes('Directions:')); assert.ok(!html.includes('rationale')); assert.ok(!html.includes('correctAnswer'));
  const word=await Packer.toBuffer(buildTestWord(generated)); const pdf=buildTestPdf(generated);
  assert.ok(word.length>1000); assert.ok(pdf.getNumberOfPages()>=1);
  const out=process.env.ASSESSMENT_VERIFY_OUTPUT;
  if(out){fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'test.docx'),word);fs.writeFileSync(path.join(out,'test.pdf'),Buffer.from(pdf.output('arraybuffer')));fs.writeFileSync(path.join(out,'test.html'),html);}
  console.log('PASS: copy-prompt context/privacy/language, external JSON import and rejection guards, mandatory teacher review, difficulty totals, immutable TOS, answer shuffling, mock generation/review/repair, single-item regeneration, edit invalidation, filler/duplicate guards, editable Word and printable PDF. Live provider quality still requires configuration.');
}
verify().catch(error=>{console.error(error);process.exit(1);});
