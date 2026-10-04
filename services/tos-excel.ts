import type { Workbook } from "exceljs";
import { Assessment, TOSFormat, bloomLevels } from "@/types/assessment";
import { getTOSPresentation, itemPlacementText } from "@/services/tos-presentation";

// ExcelJS runs in the web app so teachers can download a native, editable XLSX.
export async function buildTOSWorkbook(assessment: Assessment, format: TOSFormat, seal?: string): Promise<Workbook> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.default.Workbook();
  workbook.creator = assessment.profile?.teacherName || "ILAW";
  workbook.calcProperties.fullCalcOnLoad = true;
  const view = getTOSPresentation(assessment);
  const sheet = workbook.addWorksheet(`Term${assessment.term}`, { properties: { defaultRowHeight: 18 }, pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.25, right: 0.25, top: 0.3, bottom: 0.3, header: 0.1, footer: 0.1 } }, views: [{ showGridLines: false }] });
  [8.3,14.4,8.4,27.4,15.7,10,13.7,14.1,15.1,13.7,12.9,11.9,14.3,12.6].forEach((width,index)=> { sheet.getColumn(index+1).width=width; });
  const bodyRows = assessment.tos.length * (format === "item-placement" ? 2 : 1);
  const totalRow = 18 + Math.max(format === "item-placement" ? 22 : 15, bodyRows);
  const signatureRow = totalRow + 2;
  const lastRow = signatureRow + 5;
  for(let r=1;r<=lastRow;r++) for(let c=1;c<=14;c++) {
    const cell=sheet.getCell(r,c);
    cell.font={name:"Times New Roman",size:11,color:{argb:"FF000000"}};
    cell.alignment={horizontal:"center",vertical:"middle",wrapText:true};
  }
  function merge(range:string,text:string,bold=false,size=11) {
    sheet.mergeCells(range); const cell=sheet.getCell(range.split(":")[0]); cell.value=text || null; cell.font={name:"Times New Roman",size,bold};
  }
  for(let r=1;r<=4;r++) sheet.getRow(r).height=14;
  if(seal) { const id=workbook.addImage({base64:seal,extension:"png"}); sheet.addImage(id,{tl:{col:6.55,row:0},ext:{width:66,height:66}}); }
  const header=["Republic of the Philippines","Department of Education",view.profile.region,view.profile.division.toUpperCase(),view.profile.school.toUpperCase()];
  header.forEach((text,index)=>merge(`A${5+index}:N${5+index}`,text,index>=3));
  merge("A11:N11","TABLE OF SPECIFICATIONS",true,12);
  merge("A12:C12",view.subject,true); merge("D12:E12",String(assessment.grade),true);
  merge("J12:K12",`TERM ${assessment.term}`,true); merge("M12:N12",view.schoolYear,true);
  merge("A13:C13","Subject"); merge("D13:E13","Grade"); merge("J13:K13","Grading Period"); merge("M13:N13","School Year");
  sheet.getRow(12).height=30; sheet.getRow(14).height=9;
  merge("A15:E17","LEARNING COMPETENCIES",true,12); merge("F15:F17","Time Spent (in hr)",true);
  merge("G15:L16","COGNITIVE PROCESS DIMENSIONS",true,12); merge("M15:N16","Total Number of Items",true);
  view.levelLabels.forEach((label,index)=> { sheet.getCell(17,index+7).value=label; });
  sheet.getCell("M17").value="Computed"; sheet.getCell("N17").value="Adjusted";
  sheet.getRow(17).height=32;
  const countRows:number[]=[];
  view.rows.forEach((row,index)=> {
    const r=18+index*(format==="item-placement"?2:1); const end=format==="item-placement"?r+1:r; countRows.push(r);
    merge(`A${r}:E${end}`,row.competency); sheet.getCell(r,1).alignment={horizontal:"left",vertical:"middle",wrapText:true};
    if(end>r) for(const c of ["F","M","N"]) sheet.mergeCells(`${c}${r}:${c}${end}`);
    sheet.getCell(r,6).value=row.hours; sheet.getCell(r,6).numFmt="0.00";
    bloomLevels.forEach((level,col)=> {
      sheet.getCell(r,col+7).value=row.distribution[level];
      if(end>r) sheet.getCell(end,col+7).value=itemPlacementText(row.placement[level]);
    });
    sheet.getCell(r,13).value={formula:`F${r}/$F$${totalRow}*${assessment.totalItems}`,result:row.computed}; sheet.getCell(r,13).numFmt="0.00";
    sheet.getCell(r,14).value={formula:`SUM(G${r}:L${r})`,result:row.totalItems};
    sheet.getRow(r).height=Math.max(28,Math.ceil(row.competency.length/78)*16-(end>r?14:0));
    if(end>r) sheet.getRow(end).height=Math.max(24,Math.ceil(Math.max(...bloomLevels.map(level=>itemPlacementText(row.placement[level]).length))/18)*14);
  });
  // Retain the sample's blank ruled rows when the selected set is short.
  for(let r=18+bodyRows;r<totalRow;r+=format==="item-placement"?2:1) {
    const end=Math.min(totalRow-1,r+(format==="item-placement"?1:0)); merge(`A${r}:E${end}`,"");
    if(end>r) for(const c of ["F","M","N"]) sheet.mergeCells(`${c}${r}:${c}${end}`);
    sheet.getRow(r).height=22; if(end>r) sheet.getRow(end).height=20;
  }
  merge(`A${totalRow}:E${totalRow}`,"Total",true);
  for(let c=6;c<=14;c++) {
    const letter=String.fromCharCode(64+c); const values=countRows.map(r=>`${letter}${r}`).join(",");
    const result=c===6?view.totalHours:c===13?assessment.totalItems:c===14?view.totalItems:view.totals[bloomLevels[c-7]];
    sheet.getCell(totalRow,c).value={formula:`SUM(${values || "0"})`,result};
    sheet.getCell(totalRow,c).font={name:"Times New Roman",size:11,bold:true};
    sheet.getCell(totalRow,c).numFmt=c===13 || c===6?"0.00":"0";
  }
  const border={style:"thin" as const,color:{argb:"FF000000"}};
  for(let r=15;r<=totalRow;r++) for(let c=1;c<=14;c++) { const cell=sheet.getCell(r,c); cell.border={top:border,left:border,bottom:border,right:border}; if(r<=17) cell.font={name:"Times New Roman",size:10,bold:true}; }
  merge(`A${signatureRow}:E${signatureRow}`,"Prepared by:"); merge(`F${signatureRow}:J${signatureRow}`,"Checked and Reviewed by:"); merge(`K${signatureRow}:N${signatureRow}`,"Approved:");
  merge(`A${signatureRow+3}:E${signatureRow+3}`,view.profile.teacherName,true); merge(`A${signatureRow+4}:E${signatureRow+4}`,view.profile.position);
  merge(`F${signatureRow+3}:J${signatureRow+3}`,""); merge(`K${signatureRow+3}:N${signatureRow+3}`,view.profile.schoolHead,true); merge(`K${signatureRow+4}:N${signatureRow+4}`,view.profile.schoolHeadPosition);
  sheet.pageSetup.printArea=`A1:N${lastRow}`; sheet.pageSetup.printTitlesRow="15:17";
  return workbook;
}
