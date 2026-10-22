import { LearningActivitySheets, LasTask, lasActivityLabels } from "@/types/las";
import { learningAreaLabel } from "@/data/curriculum";
import { validateLas, LAS_MIXED_PRESET } from "@/services/las-generator";

export type LasPart = "student" | "teacher";
type LasBlock = { text: string; heading?: boolean; pageBreak?: boolean; keepNext?: boolean; groupSize?: number };
export const LAS_MAX_PAGES = 3;
// Presentation only: old saved/imported drafts retain their alignment metadata.
export function lasQuestionPrompt(prompt: string) {
  let clean = prompt.trimStart(), previous: string;
  do {
    previous = clean;
    clean = clean.replace(/^\[MC\]\s*/i, "").replace(/^(?:Objective|Layunin)\s+\d+\s*[:：]\s*/i, "");
  } while (clean !== previous);
  return clean;
}
export function lasTaskAnswer(task: LasTask) {
  if (task.type === "matching" && task.matchingChoices && task.matchingAnswer !== undefined) return `${String.fromCharCode(65 + task.matchingAnswer)}. ${task.matchingChoices[task.matchingAnswer]} — ${task.answer}`;
  if (task.type === "true-false" && task.truthValue !== undefined) return `${task.truthValue ? "True / Tama" : "False / Mali"} — ${task.answer}`;
  return task.type === "multiple-choice" && task.options && task.correctOption !== undefined
    ? `${String.fromCharCode(65 + task.correctOption)}. ${task.options[task.correctOption]} — ${task.answer}` : task.answer;
}
export function lasQuestionNumber(value: LearningActivitySheets, sheetIndex: number, taskIndex: number) {
  if (value.mixedPreset) return value.sheets.slice(0, sheetIndex).reduce((n, s) => n + s.tasks.length, 0) + taskIndex + 1;
  return value.sheets.slice(0, sheetIndex).reduce((n, s) => n + s.tasks.filter(t => t.type === "multiple-choice").length, 0) + value.sheets[sheetIndex].tasks.slice(0, taskIndex + 1).filter(t => t.type === "multiple-choice").length;
}
export function lasTaskPrompt(task: LasTask) {
  return [lasQuestionPrompt(task.prompt), ...(task.type === "multiple-choice" ? (task.options || []).map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`) : [])].join("\n");
}
export function lasFilename(value: LearningActivitySheets, part: LasPart, extension: string) {
  return `${learningAreaLabel(value.sourcePlan.grade, value.sourcePlan.area)}_${value.title}_${part === "student" ? "Student LAS" : "Teacher Guide"}`.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "").slice(0, 200) + `.${extension}`;
}
export function lasBlocks(value: LearningActivitySheets, part: LasPart): LasBlock[] {
  validateLas(value);
  if (value.mixedPreset) return mixedLasBlocks(value, part);
  const p = value.sourcePlan, tl = value.language === "Filipino";
  let questionNumber = 0;
  return [
    { text: part === "teacher" ? "TEACHER ANSWER GUIDE — NOT FOR STUDENTS" : "LEARNING ACTIVITY SHEET (LAS)", heading: true },
    { text: value.title, heading: true },
    { text: `${p.profile.school}\n${learningAreaLabel(p.grade, p.area)} | ${p.term === "one-term" ? "One Term" : `Term ${p.term}`} | Week ${p.week} | ${p.schoolYear}` },
    ...(part === "student" ? [{ text: tl ? "Pangalan: ____________________  Baitang/Pangkat: ______________  Petsa: __________" : "Name: ____________________  Grade/Section: ______________  Date: __________" }] : []),
    { text: "Learning Competency", heading: true }, { text: p.competencyText },
    ...value.sheets.flatMap((sheet): LasBlock[] => [
    { text: `${tl ? "Sesyon" : "Session"} ${sheet.session}`, heading: true },
    { text: "Learning Resources", heading: true }, { text: sheet.materials },
    { text: "Directions", heading: true }, { text: sheet.directions },
    ...(sheet.reading.trim() ? [{ text: "Learning Notes", heading: true }, { text: sheet.reading }] : []),
    ...sheet.tasks.flatMap((task, i): LasBlock[] => task.type === "multiple-choice" ? [
      { text: `${++questionNumber}. ${lasQuestionPrompt(task.prompt)}`, keepNext: true },
      { text: part === "teacher" ? `${tl ? "Sagot" : "Answer"}: ${lasTaskAnswer(task)}` : (task.options || []).map((o, j) => `${String.fromCharCode(65 + j)}. ${o}`).join("\n"), keepNext: part === "student" },
      ...(part === "student" ? [{ text: tl ? "Sagot: ____" : "Answer: ____" }] : []),
    ] : [
      { text: `${tl ? "Gawain" : "Activity"} ${i + 1}${task.type ? ` — ${lasActivityLabels[task.type]}` : ""}`, heading: true }, { text: lasTaskPrompt(task), keepNext: true },
      { text: part === "teacher" ? `${tl ? "Gabay sa Pagsagot" : "Answer / checking guide"}: ${lasTaskAnswer(task)}` : Array(task.lines).fill("____________________________________________________________").join("\n") },
    ]),
    { text: "Reflection", heading: true }, { text: sheet.reflection },
    ...(part === "student" ? [{ text: "____________________________________________________________" }] : []),
  ]),
    { text: "References", heading: true }, { text: p.references || (tl ? "Mga sangguniang ginamit sa klase." : "Teacher-provided lesson resources.") },
  ];
}
function mixedLasBlocks(value: LearningActivitySheets, part: LasPart): LasBlock[] {
  const p = value.sourcePlan, tl = value.language === "Filipino";
  const sequenced = value.mixedPreset === LAS_MIXED_PRESET;
  const sharedDirections = value.sheets.every(s => s.directions === value.sheets[0].directions);
  const bankKeys = [...new Set(value.sheets.flatMap(s => s.tasks.flatMap(t => t.matchingChoices ? [JSON.stringify(t.matchingChoices)] : [])))];
  const blocks: LasBlock[] = [
    { text: part === "teacher" ? "TEACHER ANSWER GUIDE — NOT FOR STUDENTS" : "LEARNING ACTIVITY SHEET (LAS)", heading: true },
    { text: value.title, heading: true },
    { text: `${p.profile.school}\n${learningAreaLabel(p.grade, p.area)} | ${p.term === "one-term" ? "One Term" : `Term ${p.term}`} | Week ${p.week} | ${p.schoolYear}` },
    ...(part === "student" ? [{ text: tl ? "Pangalan: __________________  Baitang/Pangkat: ____________  Petsa: __________" : "Name: __________________  Grade/Section: ____________  Date: __________" }] : []),
    { text: "Learning Competency", heading: true }, { text: p.competencyText },
    { text: "Learning Resources", heading: true }, { text: [...new Set(value.sheets.map(s => s.materials))].join("; ") },
    ...(!sequenced ? [{ text: "Directions", heading: true }, { text: tl ? "Piliin ang titik sa multiple choice; itugma ang paglalarawan sa matching bank; isulat ang Tama/Mali; tukuyin ang termino; sagutin ang bawat sanaysay sa 3–4 na pangungusap." : "Choose A–D for multiple choice; match descriptions to the matching bank; write True/False; identify the term; answer each essay in 3–4 sentences." }] : []),
    ...(sharedDirections ? [...(sequenced ? [{ text: "Directions", heading: true }] : []), { text: value.sheets[0].directions }] : []),
    ...(!sequenced ? bankKeys.flatMap((key, i) => [{ text: `Matching Bank ${i + 1}`, heading: true }, { text: (JSON.parse(key) as string[]).map((choice, j) => `${String.fromCharCode(65 + j)}. ${choice}`).join("; ") }]) : []),
  ];
  for (let s = 0; s < value.sheets.length; s++) {
    const sheet = value.sheets[s];
    const sessionType = sequenced ? ` — ${lasActivityLabels[sheet.tasks[0].type!]} (${sheet.tasks.length} questions)` : "";
    const sessionStart = blocks.length;
    const sessionHeading: LasBlock = { text: `${tl ? "Sesyon" : "Session"} ${sheet.session}${sessionType}`, heading: true };
    blocks.push(sessionHeading);
    if (!sharedDirections) blocks.push({ text: `Directions: ${sheet.directions}` });
    if (sheet.reading.trim()) blocks.push({ text: "Learning Notes", heading: true }, { text: sheet.reading });
    if (sequenced) {
      const sessionBanks = [...new Set(sheet.tasks.flatMap(t => t.matchingChoices ? [JSON.stringify(t.matchingChoices)] : []))];
      for (const key of sessionBanks) blocks.push({ text: `Matching Bank ${bankKeys.indexOf(key) + 1}`, heading: true }, { text: (JSON.parse(key) as string[]).map((choice, j) => `${String.fromCharCode(65 + j)}. ${choice}`).join("; ") });
    }
    // Keep each lesson heading, directions/bank, and first complete question together.
    if (sequenced) sessionHeading.groupSize = blocks.length - sessionStart + (part === "student" && sheet.tasks[0].type === "multiple-choice" ? 3 : 2);
    const labels: Partial<Record<LasTask["type"] & string, string>> = { matching: "Matching", "true-false": "T/F", identification: "Identification", essay: "Essay" };
    sheet.tasks.forEach((task, i) => {
      const number = lasQuestionNumber(value, s, i);
      const bank = task.matchingChoices ? ` (Matching Bank ${bankKeys.indexOf(JSON.stringify(task.matchingChoices)) + 1})` : "";
      const label = !sequenced && labels[task.type!] ? `[${labels[task.type!]}] ` : "";
      blocks.push({ text: `${number}. ${label}${lasQuestionPrompt(task.prompt)}${bank}`, keepNext: true, groupSize: part === "student" && task.type === "multiple-choice" ? 3 : 2 });
      if (part === "teacher") blocks.push({ text: `${tl ? "Sagot" : "Answer"}: ${lasTaskAnswer(task)}` });
      else if (task.type === "multiple-choice") blocks.push({ text: (task.options || []).map((o, j) => `${String.fromCharCode(65 + j)}. ${o}`).join("\n"), keepNext: true }, { text: tl ? "Sagot: ____" : "Answer: ____" });
      else blocks.push({ text: task.type === "essay" ? Array(task.lines).fill("____________________________________________________________").join("\n") : (tl ? "Sagot: ____________________" : "Answer: ____________________") });
    });
    blocks.push({ text: `Reflection: ${sheet.reflection}` }, ...(part === "student" ? [{ text: "____________________________________________________________" }] : []));
  }
  blocks.push({ text: "References", heading: true }, { text: p.references || (tl ? "Mga sangguniang ginamit sa klase." : "Teacher-provided lesson resources.") });
  return blocks;
}
export function assertLasReviewed(value: LearningActivitySheets) {
  validateLas(value);
  if (!value.teacherReviewed) throw new Error("Review the activities and teacher answers, then confirm teacher review before exporting.");
}
export async function buildLasWord(value: LearningActivitySheets, part: LasPart) {
  assertLasReviewed(value);
  const pages = await lasLayout(value, part);
  assertPageLimit(pages.length);
  const { Document, Packer, Paragraph, TextRun } = await import("docx");
  const children = pages.flatMap((rows, page) => rows.map((row, i) => new Paragraph({
    pageBreakBefore: page > 0 && i === 0,
    spacing: { before: 0, after: 0, line: row.heading ? 360 : 280, lineRule: "exact" },
    children: [new TextRun({ text: row.text, size: row.heading ? 24 : 20, bold: !!row.heading, font: "Arial" })],
  })));
  // Shared, conservatively wrapped layout also drives PDF/Print. No content is discarded.
  const document = new Document({ sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 840, bottom: 840, left: 840, right: 840 } } }, children }] });
  return new Uint8Array(await Packer.toArrayBuffer(document));
}
type LasRow = { text: string; heading?: boolean };
function assertPageLimit(pages: number) {
  if (pages > LAS_MAX_PAGES) throw new Error(`This LAS needs ${pages} pages. The maximum is 3 pages for all selected sessions together. Shorten notes, directions, activities, or answer spaces; no content has been removed.`);
}
async function lasLayout(value: LearningActivitySheets, part: LasPart): Promise<LasRow[][]> {
  const { default: jsPDF } = await import("jspdf");
  const measure = new jsPDF({ unit: "pt", format: "a4" });
  const pages: LasRow[][] = [[]];
  let used = 0;
  const newPage = () => { pages.push([]); used = 0; };
  const blocks = lasBlocks(value, part);
  const normalize = (text: string) => text.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, "-").replace(/…/g, "...");
  const wrapped = blocks.map(b => {
    measure.setFont("helvetica", b.heading ? "bold" : "normal"); measure.setFontSize(b.heading ? 12 : 10);
    return (measure.splitTextToSize(normalize(b.text), 475) as string[]).map(text => ({ text, heading: b.heading }));
  });
  wrapped.forEach((rows, i) => {
    // Prevent isolated headings; keep complete tasks together when their group fits.
    const groupSize = blocks[i].groupSize || (blocks[i].heading && /^(Activity|Gawain) \d+/.test(blocks[i].text) ? 3 : blocks[i].keepNext && /^\d+\. /.test(blocks[i].text) ? (part === "student" ? 3 : 2) : blocks[i].heading ? 2 : 1);
    const groupHeight = wrapped.slice(i, i + groupSize).flat().reduce((n, r) => n + (r.heading ? 18 : 14), 0);
    if (used && groupHeight <= 744 && used + groupHeight > 744) newPage();
    for (const row of rows) {
      const height = row.heading ? 18 : 14;
      if (used + height > 744) newPage();
      pages[pages.length - 1].push(row); used += height;
    }
  });
  return pages;
}
export async function lasPageCount(value: LearningActivitySheets, part: LasPart = "student") {
  return (await lasLayout(value, part)).length;
}
export async function assertLasPageLimit(value: LearningActivitySheets) {
  assertPageLimit(await lasPageCount(value));
  assertPageLimit(await lasPageCount(value, "teacher"));
}
export async function buildLasPdf(value: LearningActivitySheets, part: LasPart) {
  assertLasReviewed(value);
  const pages = await lasLayout(value, part); assertPageLimit(pages.length);
  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  pages.forEach((rows, index) => {
    if (index) pdf.addPage();
    let y = 54;
    for (const row of rows) { pdf.setFont("helvetica", row.heading ? "bold" : "normal"); pdf.setFontSize(row.heading ? 12 : 10); pdf.text(row.text, 42, y); y += row.heading ? 18 : 14; }
    pdf.setFontSize(9); pdf.setFont("helvetica", "normal"); pdf.text(`${index + 1} / ${pages.length}`, 550, 815, { align: "right" });
  });
  return new Uint8Array(pdf.output("arraybuffer"));
}
const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export async function lasPrintHtml(value: LearningActivitySheets, part: LasPart) {
  assertLasReviewed(value);
  const pages = await lasLayout(value, part); assertPageLimit(pages.length);
  return `<!doctype html><html lang="${value.language === "Filipino" ? "fil" : "en"}"><head><meta charset="utf-8"><title>${escapeHtml(value.title)}</title><style>@page{size:A4;margin:42pt}body{margin:0;font:10pt Arial;color:#111}.las-print-page{break-before:page}.las-print-page:first-child{break-before:auto}.line{height:14pt;line-height:14pt;white-space:pre}.heading{height:18pt;line-height:18pt;font-size:12pt;font-weight:bold}</style></head><body>${pages.map(rows => `<section class="las-print-page">${rows.map(r => `<div class="line${r.heading ? " heading" : ""}">${escapeHtml(r.text) || "&nbsp;"}</div>`).join("")}</section>`).join("")}</body></html>`;
}
export function downloadLas(bytes: Uint8Array<ArrayBuffer>, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const a = document.createElement("a"); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}
