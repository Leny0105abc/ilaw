import { AlignmentType, BorderStyle, Document, PageOrientation, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import jsPDF from "jspdf";
import autoTable, { RowInput } from "jspdf-autotable";
import { Assessment, TOSFormat, bloomLevels } from "@/types/assessment";
import { getTOSPresentation, itemPlacementText, tosFormatLabel } from "@/services/tos-presentation";

export function buildTOSWord(assessment: Assessment, format: TOSFormat) {
  const view=getTOSPresentation(assessment);
  const border={style:BorderStyle.SINGLE,size:4,color:"000000"};
  const paragraph=(text:string,bold=false,center=true)=>new Paragraph({alignment:center?AlignmentType.CENTER:AlignmentType.LEFT,children:[new TextRun({text,bold,font:"Times New Roman",size:20})]});
  const cell=(text:string,options:{bold?:boolean;span?:number;rows?:number;left?:boolean}={})=>new TableCell({columnSpan:options.span,rowSpan:options.rows,borders:{top:border,bottom:border,left:border,right:border},verticalAlign:"center",children:[paragraph(text,options.bold,!options.left)]});
  const rows:TableRow[]=[
    new TableRow({tableHeader:true,children:[cell("LEARNING COMPETENCIES",{bold:true,rows:2}),cell("Time Spent\n(in hr)",{bold:true,rows:2}),cell("COGNITIVE PROCESS DIMENSIONS",{bold:true,span:6}),cell("Total Number of Items",{bold:true,span:2})]}),
    new TableRow({tableHeader:true,children:[...view.levelLabels.map(label=>cell(label,{bold:true})),cell("Computed",{bold:true}),cell("Adjusted",{bold:true})]}),
  ];
  view.rows.forEach(row=>{
    const span=format==="item-placement"?2:1;
    rows.push(new TableRow({cantSplit:true,children:[cell(row.competency,{rows:span,left:true}),cell(String(Number(row.hours.toFixed(2))),{rows:span}),...bloomLevels.map(level=>cell(String(row.distribution[level]))),cell(row.computed.toFixed(2),{rows:span}),cell(String(row.totalItems),{rows:span})]}));
    if(span===2) rows.push(new TableRow({cantSplit:true,children:bloomLevels.map(level=>cell(itemPlacementText(row.placement[level])))}));
  });
  rows.push(new TableRow({children:[cell("Total",{bold:true}),cell(String(Number(view.totalHours.toFixed(2))),{bold:true}),...bloomLevels.map(level=>cell(String(view.totals[level]),{bold:true})),cell(assessment.totalItems.toFixed(2),{bold:true}),cell(String(view.totalItems),{bold:true})]}));
  const table=new Table({width:{size:100,type:WidthType.PERCENTAGE},columnWidths:[3900,700,830,830,830,830,830,830,850,850],rows});
  const signatureCell=(label:string,name:string,position:string)=>new TableCell({children:[paragraph(label,false,false),new Paragraph({spacing:{before:360},children:[new TextRun({text:name,bold:true,font:"Times New Roman",size:20})]}),paragraph(position,false,false)],borders:{top:{style:BorderStyle.NONE},bottom:{style:BorderStyle.NONE},left:{style:BorderStyle.NONE},right:{style:BorderStyle.NONE}}});
  return new Document({styles:{default:{document:{run:{font:"Times New Roman",size:20}}}},sections:[{properties:{page:{size:{orientation:PageOrientation.LANDSCAPE},margin:{top:540,right:540,bottom:540,left:540}}},children:[
    ...["Republic of the Philippines","Department of Education",view.profile.region,view.profile.division.toUpperCase(),view.profile.school.toUpperCase()].map((text,index)=>paragraph(text,index>=3)),
    new Paragraph({spacing:{before:180,after:120},alignment:AlignmentType.CENTER,children:[new TextRun({text:"TABLE OF SPECIFICATIONS",bold:true,font:"Times New Roman",size:24})]}),
    paragraph(`${view.subject}     Grade ${assessment.grade}     TERM ${assessment.term}     School Year ${view.schoolYear}`,true),paragraph(tosFormatLabel(format)),table,new Paragraph({spacing:{after:100}}),
    new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[new TableRow({children:[signatureCell("Prepared by:",view.profile.teacherName,view.profile.position),signatureCell("Checked and Reviewed by:","",""),signatureCell("Approved:",view.profile.schoolHead,view.profile.schoolHeadPosition)]})]}),
  ]}]});
}

export function buildTOSPdf(assessment: Assessment, format: TOSFormat) {
  const view=getTOSPresentation(assessment);
  const pdf=new jsPDF({orientation:"landscape",unit:"pt",format:"a4"});
  const width=pdf.internal.pageSize.getWidth();
  pdf.setFont("times","normal");pdf.setFontSize(10);
  ["Republic of the Philippines","Department of Education",view.profile.region,view.profile.division.toUpperCase(),view.profile.school.toUpperCase()].forEach((text,index)=>pdf.text(text,width/2,25+index*12,{align:"center"}));
  pdf.setFont("times","bold");pdf.setFontSize(12);pdf.text("TABLE OF SPECIFICATIONS",width/2,99,{align:"center"});
  pdf.setFontSize(10);pdf.setFont("times","normal");pdf.text(`${view.subject}     Grade ${assessment.grade}     TERM ${assessment.term}     School Year ${view.schoolYear}`,width/2,114,{align:"center"});
  pdf.text(tosFormatLabel(format),width/2,128,{align:"center"});
  const body:RowInput[]=[];
  view.rows.forEach(row=>{
    const span=format==="item-placement"?2:1;
    body.push([{content:row.competency,rowSpan:span,styles:{halign:"left"}},{content:Number(row.hours.toFixed(2)),rowSpan:span},...bloomLevels.map(level=>row.distribution[level]),{content:row.computed.toFixed(2),rowSpan:span},{content:row.totalItems,rowSpan:span}]);
    if(span===2) body.push(bloomLevels.map(level=>itemPlacementText(row.placement[level])));
  });
  autoTable(pdf,{startY:142,margin:24,theme:"grid",head:[[{content:"LEARNING COMPETENCIES",rowSpan:2},{content:"Time Spent\n(in hr)",rowSpan:2},{content:"COGNITIVE PROCESS DIMENSIONS",colSpan:6},{content:"Total Number of Items",colSpan:2}],[...view.levelLabels,"Computed","Adjusted"]],body,foot:[["Total",Number(view.totalHours.toFixed(2)),...bloomLevels.map(level=>view.totals[level]),assessment.totalItems.toFixed(2),view.totalItems]],showFoot:"lastPage",styles:{font:"times",fontSize:9,cellPadding:4,halign:"center",valign:"middle",lineColor:[0,0,0],lineWidth:.4},headStyles:{fillColor:[255,255,255],textColor:[0,0,0],fontStyle:"bold",fontSize:8},footStyles:{fillColor:[255,255,255],textColor:[0,0,0]},columnStyles:{0:{cellWidth:255},1:{cellWidth:48}},rowPageBreak:"avoid"});
  let y=(pdf as jsPDF&{lastAutoTable?:{finalY:number}}).lastAutoTable?.finalY||142;
  if(y+85>pdf.internal.pageSize.getHeight()){pdf.addPage();y=24;} else y+=24;
  const positions=[24,width/3+8,width*2/3];
  ["Prepared by:","Checked and Reviewed by:","Approved:"].forEach((label,index)=>pdf.text(label,positions[index],y));
  pdf.setFont("times","bold");pdf.text(view.profile.teacherName,positions[0],y+35);pdf.text(view.profile.schoolHead,positions[2],y+35);
  pdf.setFont("times","normal");pdf.text(view.profile.position,positions[0],y+48);pdf.text(view.profile.schoolHeadPosition,positions[2],y+48);
  return pdf;
}

export function tosPrintHtml(assessment:Assessment,format:TOSFormat) {
  const view=getTOSPresentation(assessment);
  const escape=(value:unknown)=>String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const rows=view.rows.map(row=>{
    const span=format==="item-placement"?2:1;
    return `<tr><td rowspan="${span}" class="competency">${escape(row.competency)}</td><td rowspan="${span}">${Number(row.hours.toFixed(2))}</td>${bloomLevels.map(level=>`<td>${row.distribution[level]}</td>`).join("")}<td rowspan="${span}">${row.computed.toFixed(2)}</td><td rowspan="${span}">${row.totalItems}</td></tr>${span===2?`<tr>${bloomLevels.map(level=>`<td>${itemPlacementText(row.placement[level])}</td>`).join("")}</tr>`:""}`;
  }).join("");
  return `<style>@page{size:A4 landscape;margin:10mm}.tos-print{font-family:'Times New Roman',serif}.tos-print header{text-align:center;line-height:1.2;margin-bottom:12px}.tos-print header p{margin:1px}.tos-print h1{font-size:12pt;margin:12px 0}.tos-print table{font-size:10pt;table-layout:fixed}.tos-print td{text-align:center;vertical-align:middle}.tos-print td.competency{text-align:left}.tos-print th{background:#fff;white-space:pre-line}.tos-print .signatures{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;break-inside:avoid;margin-top:24px}.tos-print .signatures strong{display:block;margin-top:32px}</style><div class="tos-print"><header>${["Republic of the Philippines","Department of Education",view.profile.region,view.profile.division.toUpperCase(),view.profile.school.toUpperCase()].map(text=>`<p>${escape(text)}</p>`).join("")}<h1>TABLE OF SPECIFICATIONS</h1><p>${escape(view.subject)} &nbsp; Grade ${assessment.grade} &nbsp; TERM ${assessment.term} &nbsp; School Year ${escape(view.schoolYear)}</p><p>${tosFormatLabel(format)}</p></header><table><colgroup><col style="width:32%"/><col style="width:6%"/>${bloomLevels.map(()=>'<col style="width:8%"/>').join("")}<col style="width:7%"/><col style="width:7%"/></colgroup><thead><tr><th rowspan="2">LEARNING COMPETENCIES</th><th rowspan="2">Time Spent (in hr)</th><th colspan="6">COGNITIVE PROCESS DIMENSIONS</th><th colspan="2">Total Number of Items</th></tr><tr>${view.levelLabels.map(label=>`<th>${escape(label)}</th>`).join("")}<th>Computed</th><th>Adjusted</th></tr></thead><tbody>${rows}<tr><td><b>Total</b></td><td>${Number(view.totalHours.toFixed(2))}</td>${bloomLevels.map(level=>`<td>${view.totals[level]}</td>`).join("")}<td>${assessment.totalItems.toFixed(2)}</td><td>${view.totalItems}</td></tr></tbody></table><div class="signatures"><div>Prepared by:<strong>${escape(view.profile.teacherName)}</strong>${escape(view.profile.position)}</div><div>Checked and Reviewed by:</div><div>Approved:<strong>${escape(view.profile.schoolHead)}</strong>${escape(view.profile.schoolHeadPosition)}</div></div></div>`;
}
