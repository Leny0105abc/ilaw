import { AlignmentType, Document, Paragraph, TextRun } from "docx";
import jsPDF from "jspdf";
import { Assessment } from "@/types/assessment";
import { learningAreaLabel } from "@/data/curriculum";
import { letters } from "@/services/assessment-quality";

export const examDirections = "Read each question carefully. Choose the letter of the best answer.";
export function buildTestWord(assessment: Assessment): Document {
  const centered = (text: string, bold = false, size = 22) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text, bold, size })] });
  const children: Paragraph[] = [centered("SUMMATIVE TEST", true, 24), centered(assessment.title, true), new Paragraph({ children: [new TextRun("Name: __________________________________________")] }), new Paragraph({ children: [new TextRun("Grade & Section: __________________________________")] }), new Paragraph({ children: [new TextRun("Date: ___________________________________________")] }), new Paragraph({ children: [new TextRun(`Score: __________ / ${assessment.totalItems}`)] }), new Paragraph({ children: [new TextRun(`Subject: ${learningAreaLabel(assessment.grade, assessment.subject)}`)] }), new Paragraph({ spacing: { after: 160 }, children: [new TextRun(`Term: ${assessment.term}`)] }), new Paragraph({ spacing: { after: 180 }, children: [new TextRun({ text: "Directions: ", bold: true }), new TextRun(examDirections)] })];
  assessment.questions.forEach(item => {
    children.push(new Paragraph({ keepNext: true, keepLines: true, spacing: { before: 140, after: 60 }, children: [new TextRun(`${item.number}. ${item.question}`)] }));
    letters.forEach((letter, index) => children.push(new Paragraph({ keepNext: index < 3, keepLines: true, indent: { left: 320, hanging: 240 }, spacing: { after: 45 }, children: [new TextRun(`${letter}. ${item.choices[letter]}`)] })));
  });
  return new Document({ styles: { default: { document: { run: { font: "Times New Roman", size: 22, color: "000000" }, paragraph: { spacing: { line: 264 } } } } }, sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 850, right: 850, bottom: 850, left: 850 } } }, children }] });
}

export function buildTestPdf(assessment: Assessment): jsPDF {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const width = pdf.internal.pageSize.getWidth(), height = pdf.internal.pageSize.getHeight();
  const margin = 42, bottom = height - 48, lineHeight = 13;
  pdf.setFont("times", "bold"); pdf.setFontSize(12); pdf.text("SUMMATIVE TEST", width / 2, 44, { align: "center" });
  pdf.setFontSize(11);
  let y = 64;
  for (const line of pdf.splitTextToSize(assessment.title, width - margin * 2)) { pdf.text(line, width / 2, y, { align: "center" }); y += lineHeight; }
  pdf.setFont("times", "normal"); y += 10;
  const write = (text: string, x = margin, maxWidth = width - margin * 2, bold = false) => {
    pdf.setFont("times", bold ? "bold" : "normal");
    for (const line of pdf.splitTextToSize(text, maxWidth)) { if (y > bottom) { pdf.addPage(); y = margin; } pdf.text(line, x, y); y += lineHeight; }
  };
  ["Name: __________________________________________", "Grade & Section: __________________________________", "Date: ___________________________________________", `Score: __________ / ${assessment.totalItems}`, `Subject: ${learningAreaLabel(assessment.grade, assessment.subject)}`, `Term: ${assessment.term}`].forEach(text => { write(text); y += 4; });
  y += 8; write(`Directions: ${examDirections}`); y += 12;
  for (const item of assessment.questions) {
    const lines = pdf.splitTextToSize(`${item.number}. ${item.question}`, width - margin * 2).length + letters.reduce((sum, letter) => sum + pdf.splitTextToSize(`${letter}. ${item.choices[letter]}`, width - margin * 2 - 16).length, 0);
    const needed = lines * lineHeight + 24;
    if (y + needed > bottom && needed < bottom - margin) { pdf.addPage(); y = margin; }
    write(`${item.number}. ${item.question}`); y += 4;
    for (const letter of letters) { write(`${letter}. ${item.choices[letter]}`, margin + 16, width - margin * 2 - 16); y += 2; }
    y += 10;
  }
  for (let page = 1; page <= pdf.getNumberOfPages(); page++) { pdf.setPage(page); pdf.setFontSize(9); pdf.text(`Page ${page} of ${pdf.getNumberOfPages()}`, width / 2, height - 22, { align: "center" }); }
  return pdf;
}

function escape(value: unknown) { return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
export function testPrintHtml(assessment: Assessment): string {
  return `<section class="student-test"><h1>SUMMATIVE TEST</h1><h2>${escape(assessment.title)}</h2><div class="student-details"><div>Name: __________________________________________</div><div>Grade &amp; Section: __________________________________</div><div>Date: ___________________________________________</div><div>Score: __________ / ${assessment.totalItems}</div><div>Subject: ${escape(learningAreaLabel(assessment.grade, assessment.subject))}</div><div>Term: ${assessment.term}</div></div><p class="directions"><b>Directions:</b> ${examDirections}</p>${assessment.questions.map(item => `<article><div>${item.number}. ${escape(item.question)}</div>${letters.map(letter => `<div class="exam-choice">${letter}. ${escape(item.choices[letter])}</div>`).join("")}</article>`).join("")}</section>`;
}
