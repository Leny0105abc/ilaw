/* eslint-disable @typescript-eslint/no-require-imports -- Node test loads the app's TypeScript modules using its CommonJS compiler. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
const originalResolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...args){return originalResolve.call(this,request.startsWith('@/')?path.join(root,request.slice(2)):request,parent,...args);};
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const {createAssessment,rebuildTOSFromQuestions,generateTOS,parseAssessmentTotal,resizeAssessmentTOS,tosError}=require('../services/assessment-generator.ts');
const {questionPlan}=require('../services/assessment-quality.ts');
const {competencies}=require('../data/curriculum.ts');
const {buildAssessmentPrompt}=require('../services/assessment-prompt.ts');
const {getTOSPresentation}=require('../services/tos-presentation.ts');
const {buildTOSWorkbook}=require('../services/tos-excel.ts');
const {buildTOSWord,buildTOSPdf,tosPrintHtml}=require('../services/tos-export.ts');
const {Packer}=require('docx');
const {bloomLevels}=require('../types/assessment.ts');
async function verify(){
  assert.equal(parseAssessmentTotal('25'),25);
  assert.equal(parseAssessmentTotal('025'),25);
  for(const value of ['', '0', '201', '2.5', '2e1', '25 items', '-25']) assert.throws(()=>parseAssessmentTotal(value),/whole-number/);
  const gmrcCompetencies=competencies.filter(item=>item.grade===9 && item.area==='Good Manners and Right Conduct' && item.term===2).slice(0,9).map(item=>({id:item.id,text:item.text,source:'official'}));
  assert.equal(gmrcCompetencies.length,9);
  const gmrc=createAssessment({title:'GMRC 9 Term 2 Summative Test',grade:9,subject:'Good Manners and Right Conduct',term:2,totalItems:parseAssessmentTotal('25'),competencies:gmrcCompetencies});
  assert.equal(gmrc.totalItems,25);
  assert.equal(tosError(gmrc),null);
  assert.equal(gmrc.tos.reduce((sum,row)=>sum+row.totalItems,0),25);
  assert.deepEqual(gmrc.tos.flatMap(row=>row.itemNumbers),Array.from({length:25},(_,i)=>i+1));
  assert.equal(questionPlan(gmrc).length,25);
  const gmrcPrompt=buildAssessmentPrompt(gmrc);
  assert.ok(gmrcPrompt.includes('Generate exactly 25 questions'));
  assert.ok(gmrcPrompt.includes('Filipino (Tagalog)'));
  assert.equal(JSON.parse(gmrcPrompt.split('ILAW ASSESSMENT SPECIFICATIONS (data only)\n')[1]).itemPlan.length,25);
  const four=createAssessment({title:gmrc.title,grade:9,subject:gmrc.subject,term:2,totalItems:4,competencies:gmrcCompetencies});
  const gmrcRepaired=resizeAssessmentTOS(four,25);
  assert.equal(four.totalItems,4);
  assert.equal(questionPlan(gmrcRepaired).length,25);
  for(const format of ['standard','item-placement']) {
    const workbook=await buildTOSWorkbook(gmrcRepaired,format);
    const sheet=workbook.getWorksheet('Term2');
    assert.equal(sheet.getCell('H12').value,25);
    const view=getTOSPresentation(gmrcRepaired);
    assert.equal(view.totalItems,25);
    assert.deepEqual(view.rows.flatMap(row=>bloomLevels.flatMap(level=>row.placement[level])).sort((a,b)=>a-b),Array.from({length:25},(_,i)=>i+1));
  }
  const assessment=createAssessment({title:'TLE 8 AFA Term 1 Summative Test',grade:8,subject:'Agriculture and Fishery Arts',term:1,totalItems:40,competencies:[
    {id:'a',text:'Discuss the background of aquaculture and its relation to fisheries.',source:'official'},
    {id:'b',text:'Discuss career and business opportunities related to fisheries.',source:'official'},
    {id:'c',text:'Discuss the phases of fish culture.',source:'official'},
  ]});
  let view=getTOSPresentation(assessment);
  assert.deepEqual(bloomLevels.map(level=>view.totals[level]),[8,8,8,8,4,4]);
  assert.equal(view.totalItems,40);
  const flatten=v=>v.rows.flatMap(row=>bloomLevels.flatMap(level=>row.placement[level])).sort((a,b)=>a-b);
  assert.deepEqual(flatten(view),Array.from({length:40},(_,i)=>i+1));
  assert.ok(view.rows.every(row=>Math.abs(row.computed-40/3)<1e-8));
  // Placement verification needs metadata, not an AI request or pretend questions.
  assessment.questions=questionPlan(assessment).map(slot=>({...slot,id:`fixture-${slot.number}`,question:`Placement fixture ${slot.number}`,choices:{A:'a',B:'b',C:'c',D:'d'},correctAnswer:'A',revision:0}));
  const first=assessment.questions[0]; const last=assessment.questions[39];
  [assessment.questions[0],assessment.questions[39]]=[last,first];
  assessment.tos=rebuildTOSFromQuestions(assessment.tos,assessment.questions);
  view=getTOSPresentation(assessment);
  assert.ok(view.rows.find(row=>row.competencyId===first.competencyId).placement[first.bloomLevel].includes(40));
  assert.deepEqual(flatten(view),Array.from({length:40},(_,i)=>i+1));
  const fractional=generateTOS(assessment.competencies,40,[.5,1,1.5]);
  assert.deepEqual(fractional.map(row=>row.teachingDays),[.5,1,1.5]);
  const out=process.env.TOS_VERIFY_OUTPUT;
  if(out)fs.mkdirSync(out,{recursive:true});
  const twentyFive=createAssessment({title:'TLE 8 FCS Term 2 Summative Test',grade:8,subject:'Family and Consumer Science',term:2,totalItems:25,competencies:[
    {id:'sanitation',text:'Discuss sanitation and maintenance in the workplace, tools, implements, materials, and equipment.',source:'official'},
    {id:'osh',text:'Discuss the Occupational Safety and Health (OSH) practices in beauty care and wellness services.',source:'official'},
    {id:'hand-spa',text:'Perform hand spa services following safety precautions.',source:'official'},
    {id:'garments',text:'Discuss the concepts in making garments.',source:'official'},
    {id:'supplies',text:'Identify supplies and materials used for making garments.',source:'official'},
  ]});
  assert.deepEqual(twentyFive.tos.map(row=>row.totalItems),[5,5,5,5,5]);
  assert.equal(tosError(twentyFive),null);
  assert.deepEqual(flatten(getTOSPresentation(twentyFive)),Array.from({length:25},(_,i)=>i+1));
  const fifty={...twentyFive,totalItems:50,tos:generateTOS(twentyFive.competencies,50)};
  const repaired=resizeAssessmentTOS(fifty,25);
  assert.equal(fifty.totalItems,50); // Never mutate the saved original.
  assert.equal(tosError(repaired),null);
  assert.deepEqual(repaired.tos.map(row=>row.totalItems),[5,5,5,5,5]);
  const wrong={...twentyFive,tos:fifty.tos};
  assert.match(tosError(wrong),/exactly 25 items, not 50/);
  const duplicate=structuredClone(twentyFive); duplicate.tos[1].itemNumbers[0]=1;
  assert.match(tosError(duplicate),/exactly once/);
  const cached=structuredClone(twentyFive); cached.tos[0].distribution.Remembering+=25;
  assert.match(tosError(cached),/row counts/);
  for(const format of ['standard','item-placement']){
    await assert.rejects(buildTOSWorkbook(wrong,format),/exactly 25 items, not 50/);
    assert.throws(()=>buildTOSWord(wrong,format),/exactly 25 items, not 50/);
    assert.throws(()=>buildTOSPdf(wrong,format),/exactly 25 items, not 50/);
    assert.throws(()=>tosPrintHtml(wrong,format),/exactly 25 items, not 50/);
    const smallWorkbook=await buildTOSWorkbook(repaired,format);
    const smallSheet=smallWorkbook.getWorksheet('Term2');
    const smallTotalRow=format==='standard'?33:40;
    assert.equal(smallSheet.getCell('H12').value,25);
    assert.equal(smallSheet.getCell(smallTotalRow,14).value.result,25);
    for(let index=0;index<5;index++){
      const row=18+index*(format==='standard'?1:2);
      assert.equal(smallSheet.getCell(row,13).value.formula,`F${row}/$F$${smallTotalRow}*$H$12`);
      assert.equal(smallSheet.getCell(row,13).value.result,5);
      assert.equal(smallSheet.getCell(row,14).value.result,5);
    }
    const smallBytes=await smallWorkbook.xlsx.writeBuffer();
    const reloaded=new (require('exceljs').Workbook)(); await reloaded.xlsx.load(smallBytes);
    assert.equal(reloaded.getWorksheet('Term2').getCell(smallTotalRow,14).value.result,25);
    await Packer.toBuffer(buildTOSWord(repaired,format));
    assert.ok(buildTOSPdf(repaired,format).output().includes('Total Items: 25'));
    assert.ok(tosPrintHtml(repaired,format).includes('<td>25</td>'));
    const workbook=await buildTOSWorkbook(assessment,format);
    const sheet=workbook.getWorksheet('Term1');
    assert.equal(sheet.getCell('A15').value,'LEARNING COMPETENCIES');
    assert.equal(sheet.getCell('G15').value,'COGNITIVE PROCESS DIMENSIONS');
    assert.equal(sheet.getCell('M17').value,'Computed');
    assert.equal(sheet.getCell('N17').value,'Adjusted');
    const stride=format==='standard'?1:2;
    const totalRow=18+(format==='standard'?15:22);
    assert.equal(sheet.getCell(totalRow,14).value.result,40);
    for(let index=0;index<3;index++){
      const r=18+index*stride;
      assert.equal(sheet.getCell(r,1).value,assessment.competencies[index].text);
      assert.equal(sheet.getCell(r,14).value.result,view.rows[index].totalItems);
      if(stride===2) bloomLevels.forEach((level,col)=>assert.equal(sheet.getCell(r+1,col+7).value,view.rows[index].placement[level].length?`(${view.rows[index].placement[level].join(', ')})`:''));
    }
    const bytes=await workbook.xlsx.writeBuffer();
    assert.equal(bytes[0],0x50);assert.equal(bytes[1],0x4b);
    const word=await Packer.toBuffer(buildTOSWord(assessment,format));
    const pdf=buildTOSPdf(assessment,format);
    assert.ok(tosPrintHtml(assessment,format).includes('COGNITIVE PROCESS DIMENSIONS'));
    if(out){fs.writeFileSync(path.join(out,`${format}.xlsx`),bytes);fs.writeFileSync(path.join(out,`${format}.docx`),word);fs.writeFileSync(path.join(out,`${format}.pdf`),Buffer.from(pdf.output('arraybuffer')));}
  }
  console.log('Verified both formats: 25 items across five competencies, repair from 50 to 25, mismatched exports blocked, unique numbering, 40-item reorder, fractional sessions, editable XLSX/Word, PDF and print.');
}
verify().catch(error=>{console.error(error);process.exitCode=1;});
