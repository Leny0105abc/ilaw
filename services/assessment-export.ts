import { AlignmentType, BorderStyle, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Assessment, bloomLevels } from "@/types/assessment";
import { learningAreaLabel } from "@/data/curriculum";

type ExportPart = "test" | "answer-key" | "tos";

function filename(assessment: Assessment, part: ExportPart, extension: string) {
  const partName = part === "test" ? "Summative Test" : part === "answer-key" ? "Answer Key" : "TOS";
  return `${safe(`${learningAreaLabel(assessment.grade, assessment.subject)}_${assessment.title}_${partName}`)}.${extension}`;
}

function safe(value: string) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "").replace(/\s+/g, " ").trim();
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function heading(assessment: Assessment, label: string) {
  return [
    new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, children: [new TextRun({ text: label, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: assessment.title, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun(`${learningAreaLabel(assessment.grade, assessment.subject)} · Term ${assessment.term} · ${assessment.totalItems} items`)] }),
  ];
}

function docTable(headers: string[], rows: string[][], widths?: number[]) {
  const border = { style: BorderStyle.SINGLE, size: 4, color: "94A3B8" };
  const cell = (text: string, bold = false, index = 0) => new TableCell({
    width: widths ? { size: widths[index], type: WidthType.DXA } : undefined,
    borders: { top: border, bottom: border, left: border, right: border },
    shading: bold ? { fill: "E8EFFA" } : undefined,
    children: [new Paragraph({ children: [new TextRun({ text, bold, size: 20 })] })],
  });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ children: headers.map((value, index) => cell(value, true, index)) }), ...rows.map((row) => new TableRow({ children: row.map((value, index) => cell(value, false, index)) }))],
  });
}

export async function exportAssessmentWord(assessment: Assessment, part: ExportPart) {
  let children: (Paragraph | Table)[] = [];
  if (part === "test") {
    children = [...heading(assessment, "SUMMATIVE TEST")];
    assessment.questions.forEach((item) => {
      children.push(new Paragraph({ spacing: { before: 120, after: 40 }, children: [new TextRun({ text: `${item.number}. ${item.question}`, bold: true, size: 20 })] }));
      (["A", "B", "C", "D"] as const).forEach((letter) => children.push(new Paragraph({ indent: { left: 360 }, children: [new TextRun({ text: `${letter}. ${item.choices[letter]}`, size: 20 })] })));
    });
  } else if (part === "answer-key") {
    children = [...heading(assessment, "ANSWER KEY"), docTable(["Item", "Answer", "Bloom Level", "Learning Competency"], assessment.questions.map((item) => [String(item.number), item.correctAnswer, item.bloomLevel, item.competency]))];
  } else {
    children = [...heading(assessment, "TABLE OF SPECIFICATIONS"), docTable(
      ["Learning Competency", "Days", "%", ...bloomLevels, "Total", "Item Numbers"],
      assessment.tos.map((row) => [row.competency, String(row.teachingDays), `${row.percentage}%`, ...bloomLevels.map((level) => String(row.distribution[level])), String(row.totalItems), row.itemNumbers.join(", ")]),
    )];
  }
  const doc = new Document({ sections: [{ properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } }, children }] });
  download(await Packer.toBlob(doc), filename(assessment, part, "docx"));
}

export function exportAssessmentPdf(assessment: Assessment, part: ExportPart) {
  const landscape = part === "tos";
  const pdf = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(14);
  pdf.text(part === "test" ? "SUMMATIVE TEST" : part === "answer-key" ? "ANSWER KEY" : "TABLE OF SPECIFICATIONS", pageWidth / 2, 38, { align: "center" });
  pdf.setFontSize(10); pdf.text(assessment.title, pageWidth / 2, 54, { align: "center" });
  pdf.setFont("helvetica", "normal"); pdf.text(`${learningAreaLabel(assessment.grade, assessment.subject)} · Term ${assessment.term} · ${assessment.totalItems} items`, pageWidth / 2, 68, { align: "center" });
  if (part === "test") {
    let y = 94;
    assessment.questions.forEach((item) => {
      const lines = pdf.splitTextToSize(`${item.number}. ${item.question}`, pageWidth - 78);
      if (y + lines.length * 12 + 58 > pdf.internal.pageSize.getHeight()) { pdf.addPage(); y = 40; }
      pdf.setFont("helvetica", "bold"); pdf.text(lines, 38, y); y += lines.length * 12 + 4;
      pdf.setFont("helvetica", "normal");
      (["A", "B", "C", "D"] as const).forEach((letter) => { const choice = pdf.splitTextToSize(`${letter}. ${item.choices[letter]}`, pageWidth - 96); pdf.text(choice, 54, y); y += choice.length * 11 + 2; });
      y += 6;
    });
  } else if (part === "answer-key") {
    autoTable(pdf, { startY: 84, head: [["Item", "Answer", "Bloom Level", "Learning Competency"]], body: assessment.questions.map((item) => [item.number, item.correctAnswer, item.bloomLevel, item.competency]), styles: { fontSize: 8, cellPadding: 4 }, headStyles: { fillColor: [23, 63, 138] } });
  } else {
    autoTable(pdf, { startY: 84, head: [["Learning Competency", "Days", "%", "R", "U", "Ap", "An", "E", "C", "Total", "Item Numbers"]], body: assessment.tos.map((row) => [row.competency, row.teachingDays, row.percentage, ...bloomLevels.map((level) => row.distribution[level]), row.totalItems, row.itemNumbers.join(", ")]), styles: { fontSize: 7, cellPadding: 3 }, headStyles: { fillColor: [23, 63, 138] }, columnStyles: { 0: { cellWidth: 210 }, 10: { cellWidth: 110 } } });
  }
  pdf.save(filename(assessment, part, "pdf"));
}

export function exportTOSExcel(assessment: Assessment) {
  const escape = (value: unknown) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const headers = ["Learning Competency", "Number of Teaching Days/Sessions", "Percentage", ...bloomLevels, "Total Items", "Item Numbers"];
  const rows = assessment.tos.map((row) => [row.competency, row.teachingDays, `${row.percentage}%`, ...bloomLevels.map((level) => row.distribution[level]), row.totalItems, row.itemNumbers.join(", ")]);
  const rowXml = (values: unknown[]) => `<Row>${values.map((value) => `<Cell><Data ss:Type="${typeof value === "number" ? "Number" : "String"}">${escape(value)}</Data></Cell>`).join("")}</Row>`;
  const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="TOS"><Table>${rowXml(headers)}${rows.map(rowXml).join("")}</Table></Worksheet></Workbook>`;
  download(new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" }), filename(assessment, "tos", "xls"));
}

export function printAssessment(assessment: Assessment, part: ExportPart) {
  const popup = window.open("", "_blank");
  if (!popup) return;
  const escape = (value: unknown) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const test = assessment.questions.map((item) => `<article><b>${item.number}. ${escape(item.question)}</b>${(["A", "B", "C", "D"] as const).map((letter) => `<div>${letter}. ${escape(item.choices[letter])}</div>`).join("")}</article>`).join("");
  const answer = `<table><thead><tr><th>Item</th><th>Answer</th><th>Bloom Level</th><th>Learning Competency</th></tr></thead><tbody>${assessment.questions.map((item) => `<tr><td>${item.number}</td><td>${item.correctAnswer}</td><td>${item.bloomLevel}</td><td>${escape(item.competency)}</td></tr>`).join("")}</tbody></table>`;
  const tos = `<table><thead><tr>${["Learning Competency", "Days", "%", ...bloomLevels, "Total", "Item Numbers"].map((item) => `<th>${item}</th>`).join("")}</tr></thead><tbody>${assessment.tos.map((row) => `<tr><td>${escape(row.competency)}</td><td>${row.teachingDays}</td><td>${row.percentage}%</td>${bloomLevels.map((level) => `<td>${row.distribution[level]}</td>`).join("")}<td>${row.totalItems}</td><td>${row.itemNumbers.join(", ")}</td></tr>`).join("")}</tbody></table>`;
  popup.document.write(`<!doctype html><html><head><title>${escape(assessment.title)}</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#111;font-size:12px}h1,h2,p{text-align:center}article{margin:18px 0;break-inside:avoid}article div{margin:4px 0 0 24px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #555;padding:5px;vertical-align:top}th{background:#e8effa}@media print{body{margin:12mm}}</style></head><body><h1>${part === "test" ? "SUMMATIVE TEST" : part === "answer-key" ? "ANSWER KEY" : "TABLE OF SPECIFICATIONS"}</h1><h2>${escape(assessment.title)}</h2><p>${escape(learningAreaLabel(assessment.grade, assessment.subject))} · Term ${assessment.term} · ${assessment.totalItems} items</p>${part === "test" ? test : part === "answer-key" ? answer : tos}<script>window.onload=()=>window.print()</script></body></html>`);
  popup.document.close();
}
