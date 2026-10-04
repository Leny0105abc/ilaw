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
const {createAssessment,generateQuestions,rebuildTOSFromQuestions,generateTOS}=require('../services/assessment-generator.ts');
const {getTOSPresentation}=require('../services/tos-presentation.ts');
const {buildTOSWorkbook}=require('../services/tos-excel.ts');
const {buildTOSWord,buildTOSPdf,tosPrintHtml}=require('../services/tos-export.ts');
const {Packer}=require('docx');
const {bloomLevels}=require('../types/assessment.ts');
async function verify(){
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
  assessment.questions=generateQuestions(assessment.tos);
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
  for(const format of ['standard','item-placement']){
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
  console.log('Verified both formats, 40 unique items, post-reorder placement, fractional sessions, editable XLSX/Word, PDF and print.');
}
verify().catch(error=>{console.error(error);process.exitCode=1;});
