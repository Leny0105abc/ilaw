import { CotLesson } from "@/types/cot";
import { WeeklyPowerPoint } from "@/types/powerpoint";
import { cotCoverage, cotEvidence, cotMaterialsStale, validateCotContent } from "@/services/cot-generator";
import { learningAreaLabel } from "@/data/curriculum";
import { buildIlawCotPdf, buildIlawCotWord, ilawCotPrintHtml, roleText, type CotLessonFormat } from "@/services/cot-ilaw-format";
export type { CotLessonFormat } from "@/services/cot-ilaw-format";
export type CotPart = "lesson" | "alignment" | "worksheets" | "assessment" | "answer-key";
type Block = {
    heading?: string;
    text?: string;
    headers?: string[];
    rows?: string[][];
    pageBreak?: boolean;
};
const labels: Record<CotPart, string> = { lesson: "Classroom Observation Lesson", alignment: "PMES Indicator Alignment", worksheets: "Activity Sheets", assessment: "Formative Assessment", "answer-key": "Teacher Answer Key" };
export function cotFilename(p: CotLesson, part: string, extension: string) { return `${learningAreaLabel(p.sourcePlan.grade, p.sourcePlan.area)}_${p.title}_Week ${p.sourcePlan.week}_COT_${part}`.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "").slice(0, 210) + `.${extension}`; }
export function cotDocumentBlocks(p: CotLesson, part: CotPart): Block[] {
    validateCotContent(p);
    const teacherCopy = part === "lesson" || part === "alignment";
    const blocks: Block[] = [...(teacherCopy ? [{ text: "Republic of the Philippines\nDepartment of Education" }] : []), { heading: labels[part] }, { text: p.title }];
    const meta = [`School: ${p.sourcePlan.profile.school}`, `Teacher: ${p.teacherName}`, `Teacher Position: ${p.position}`, `Grade and Section: ${p.sourcePlan.grade} ${p.section}`, `Learning Area: ${learningAreaLabel(p.sourcePlan.grade, p.sourcePlan.area)}`, `Observation Date: ${p.observationDate || "________________"}  Time: ${p.observationTime || "________________"}`, `Observer: ${p.observer}`, `School Year: ${p.schoolYear}  Term: ${p.sourcePlan.term}  Week: ${p.sourcePlan.week}`, `Selected Session(s): ${p.selectedSessions.join(", ")}  Total Duration: ${p.duration} minutes`];
    if (teacherCopy)
        blocks.push(...meta.map(text => ({ text })), { text: `Status: ${p.status}. Coverage describes planned lesson evidence, not a COT rating or a completed observation.` });
    else
        blocks.push({ text: `Grade ${p.sourcePlan.grade} ${p.section} / ${learningAreaLabel(p.sourcePlan.grade, p.sourcePlan.area)}` });
    const alignments: Block[] = [];
    p.indicators.forEach(indicator => {
        const alignment = p.alignments.find(a => a.indicatorId === indicator.id)!;
        const coverage = cotCoverage(p, alignment);
        alignments.push({ heading: `PPST ${indicator.code}` }, { text: indicator.wording }, { text: `${indicator.careerStage}\nDomain: ${indicator.domain}\nStrand: ${indicator.strand}\nSource: ${indicator.source}\n${indicator.sourceUrl}\n${indicator.sourcePage}\nGuideline Version: ${indicator.version}\nSchool Year: ${indicator.schoolYear}` }, { text: `Planned coverage: ${coverage === "clear" ? "Clearly Demonstrated" : coverage === "partial" ? "Partially Demonstrated" : "No Clear Evidence"}. ${alignment.reason}` });
        if (coverage === "none")
            alignments.push({ text: "This indicator currently has insufficient observable evidence." });
        cotEvidence(p, alignment).forEach(e => { const activity = p.activities.find(a => a.id === e.activityId); alignments.push({ text: `Lesson Activity: ${activity?.title || e.activityId}\nTeacher Action: ${e.teacherQuote}\nLearner Action: ${e.learnerQuote}\nCOT Annotation: ${e.annotation}\nExpected Observable Evidence: ${e.observableEvidence}` }); });
        if (alignment.suggestion)
            alignments.push({ text: `Suggested modification, not yet applied: ${alignment.suggestion.reason}\n${roleText("Teacher", "teacher", alignment.suggestion.teacherActivity)}\n${roleText("Learners", "learners", alignment.suggestion.learnerActivity)}` });
    });
    if (part === "lesson") {
        blocks.push({ heading: "INTENTIONS" }, { heading: "Learning Competency" }, { text: p.sourcePlan.competencyText }, { heading: "Learning Objectives" }, { text: p.objectives.map((t, i) => `${i + 1}. ${t}`).join("\n") }, { heading: "Learner Context" }, { text: p.learnerContext }, { heading: "LEARNING EXPERIENCE" }, { heading: "Pre Lesson" }, { text: p.preLesson }, { heading: "Learning Resources" }, { text: p.resources.join(", ") }, { heading: "Opportunities for Integration" }, { text: p.integration }, { heading: "Timed Teaching Flow" }, { headers: ["Time", "Teacher Activity", "Learner Activity", "COT Annotation", "Expected Evidence"], rows: p.activities.map(a => { const e = p.alignments.flatMap(al => cotEvidence(p,al).filter(e => e.activityId === a.id).map(e => ({ e, code: p.indicators.find(i => i.id === al.indicatorId)?.code,coverage:cotCoverage(p,al) }))); return [`${p.selectedSessions.length > 1 ? `SESSION ${a.session}\n` : ""}${a.minutes} min\n${a.title}`, a.teacherActivity, a.learnerActivity, e.map(x => `${x.code} (${x.coverage} planned coverage): ${x.e.annotation}`).join("\n") || "No indicator claimed.", e.map(x => x.e.observableEvidence).join("\n") || "Teacher checks participation and understanding; no indicator claim."]; }) }, { text: `TOTAL ${p.activities.reduce((n, a) => n + a.minutes, 0)} minutes` });
        p.activities.forEach((a, index) => blocks.push(...(p.selectedSessions.length > 1 && p.activities[index - 1]?.session !== a.session ? [{ heading: `SESSION ${a.session}` }] : []), { heading: `${a.title} (${a.minutes} min)` }, { text: `Objectives: ${a.objectiveIndices.join(", ")}\nResources: ${a.resources.join(", ")}` }, ...a.questions.map(q => ({ text: `Teacher Question: ${q.question}\nAnticipated Learner Responses: ${q.responses.join("; ")}\nFollow Up Question: ${q.followUp}` })), { text: `Differentiated Tasks\nLearners Needing Support: ${a.differentiation.support}\nCore Task: ${a.differentiation.core}\nExtension Task: ${a.differentiation.extension}` }, { text: `Formative Assessment: ${a.formative.task}\nObjective(s) Measured: ${a.formative.objectiveIndices.join(", ")}\nCOT Indicator(s) Supported: ${a.formative.indicatorIds.map(id => p.indicators.find(i => i.id === id)?.code).join(", ") || "No indicator claimed"}\nExpected Evidence: ${a.formative.expectedEvidence}` }));
        blocks.push({ heading: "ASSESSMENT" }, { text: `${p.assessment.length} aligned assessment task(s). See the separate student assessment and teacher answer key.` }, { heading: "Extended Learning Opportunities" }, { text: p.extendedLearning }, { heading: "Reflections" }, { text: p.reflection }, { heading: "COT Indicator Summary" }, { headers: ["Indicator", "Lesson Activity", "Observable Evidence"], rows: p.alignments.map(al => [p.indicators.find(i => i.id === al.indicatorId)!.code, cotEvidence(p,al).map(e => p.activities.find(a => a.id === e.activityId)?.title).join("; "), `${cotCoverage(p, al)}: ${cotEvidence(p,al).map(e => e.observableEvidence).join("; ") || "This indicator currently has insufficient observable evidence."}`]) }, { heading: "Official Indicator Snapshots" }, ...alignments);
    }
    if (part === "alignment")
        blocks.push(...alignments);
    if (part === "worksheets") {
        if (!p.worksheets.length || cotMaterialsStale(p))
            throw new Error("Generate or refresh the activity sheets after your lesson edits.");
        p.worksheets.forEach((sheet, index) => blocks.push({ heading: sheet.title, pageBreak: index > 0 }, { text: "Name: ____________________________________\nGrade and Section: ___________________________\nDate: _____________________________________" }, { text: `Instructions: ${sheet.instructions}` }, ...sheet.tasks.flatMap((task, n) => [{ text: `${n + 1}. ${task}` }, { text: "________________________________________________________________\n________________________________________________________________" }])));
    }
    if (part === "assessment")
        blocks.push({ text: "Name: ____________________________________\nGrade and Section: ___________________________\nDate: _____________________________________" }, { text: p.assessmentKind === "multiple-choice" ? "Directions: Read each question. Choose the letter of the best answer." : "Directions: Complete each task and follow the stated criteria." }, ...p.assessment.flatMap((item, index): Block[] => [{ text: `${index + 1}. ${item.question}${item.choices ? "\n" + (["A", "B", "C", "D"] as const).map(l => `${l}. ${item.choices![l]}`).join("\n") : "\n________________________________________________________"}` }, ...(item.rubric.length ? [{ headers: ["Criterion", "Points"], rows: item.rubric.map(r => [r.criterion, String(r.points)]) }] : [])]));
    if (part === "answer-key")
        blocks.push(...p.assessment.map((item, index) => ({ text: `${index + 1}. ${item.answer}${item.choices && ["A", "B", "C", "D"].includes(item.answer) ? ` - ${item.choices[item.answer as "A"]}` : ""}\nExpected Evidence: ${item.expectedEvidence}\nObjective(s): ${item.objectiveIndices.join(", ")}` })), ...p.worksheets.flatMap(sheet => [{ text: `${sheet.title}\n${sheet.teacherKey.map((answer, i) => `${i + 1}. ${answer}`).join("\n")}` }, ...(sheet.teacherNotes?.length ? [{ text: `Teacher Notes — ${sheet.title}\n${sheet.teacherNotes.join("\n")}` }] : [])]));
    return blocks;
}
export async function buildCotWord(p: CotLesson, part: CotPart, format: CotLessonFormat = "ilaw") {
    if (part === "lesson" && format === "ilaw") { validateCotContent(p); return buildIlawCotWord(p); }
    const { Document, Paragraph, Table, TableCell, TableRow, TextRun, Packer, WidthType, BorderStyle, VerticalAlign, HeadingLevel } = await import("docx");
    const border = { style: BorderStyle.SINGLE, size: 4, color: "D9D9D9" };
    const children = cotDocumentBlocks(p, part).flatMap((block, index) => {
        if (block.headers) {
            const widths = block.headers.length === 5 ? [1800, 3598, 3400, 3300, 3300] : block.headers.length === 3 ? [2000, 5398, 8000] : [13000, 2398];
            const row = (cells: string[], heading = false) => new TableRow({ tableHeader: heading, children: cells.map((cell, i) => new TableCell({ width: { size: widths[i], type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: { top: 100, bottom: 100, left: 100, right: 100 }, borders: { top: border, bottom: border, left: border, right: border }, shading: heading ? { fill: "E8EFFA" } : undefined, children: cell.split("\n").map(line => new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: line, bold: heading, size: 20, color: "000000" })] })) })) });
            return [new Table({ width: { size: 15398, type: WidthType.DXA }, columnWidths: widths, rows: [row(block.headers, true), ...(block.rows || []).map(cells => row(cells))] }), new Paragraph({ text: "", spacing: { after: 120 } })];
        }
        if (block.heading)
            return [new Paragraph({ text: block.heading, heading: index === 0 ? HeadingLevel.TITLE : HeadingLevel.HEADING_2, pageBreakBefore: block.pageBreak, spacing: { before: 160, after: 120 }, keepNext: true })];
        const lines = (block.text || "").split("\n");
        return lines.map((line, n) => new Paragraph({ text: line, spacing: { after: 80 }, keepNext: lines.length < 16 && n < lines.length - 1, pageBreakBefore: block.pageBreak && n === 0 }));
    });
    const doc = new Document({ styles: { default: { document: { run: { font: "Arial", size: 20, color: "000000" }, paragraph: { spacing: { line: 260, after: 80 } } }, title: { run: { font: "Arial", size: 24, color: "000000", bold: true } }, heading2: { run: { font: "Arial", size: 24, color: "000000", bold: true } } } }, sections: [{ properties: { page: { size: { width: 16838, height: 11906 }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } }, children }] });
    return new Uint8Array(await Packer.toArrayBuffer(doc));
}
export async function buildCotPdf(p: CotLesson, part: CotPart, format: CotLessonFormat = "ilaw") {
    if (part === "lesson" && format === "ilaw") { validateCotContent(p); return buildIlawCotPdf(p); }
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const pdf = new jsPDF({ orientation: part === "lesson" || part === "alignment" ? "landscape" : "portrait", unit: "pt", format: "a4" });
    const width = pdf.internal.pageSize.getWidth(), height = pdf.internal.pageSize.getHeight();
    let y = 36;
    const page = () => { pdf.addPage(); y = 36; };
    cotDocumentBlocks(p, part).forEach((block, index) => {
        if (block.pageBreak && y > 36)
            page();
        if (block.headers) {
            autoTable(pdf, { startY: y, head: [block.headers], body: block.rows || [], margin: { left: 36, right: 36, top: 36, bottom: 36 }, styles: { fontSize: 10, cellPadding: 7, overflow: "linebreak", valign: "middle", lineColor: [217, 217, 217], lineWidth: .5 }, headStyles: { fillColor: [232, 239, 250], textColor: [0, 0, 0] }, columnStyles: block.headers.length === 5 ? { 0: { cellWidth: 72 } } : undefined, showHead: "everyPage" });
            y = (pdf as typeof pdf & {
                lastAutoTable: {
                    finalY: number;
                };
            }).lastAutoTable.finalY + 16;
            return;
        }
        const heading = !!block.heading;
        pdf.setFont("helvetica", heading ? "bold" : "normal");
        pdf.setFontSize(heading ? 12 : 10);
        const lines = pdf.splitTextToSize(block.heading || block.text || "", width - 72) as string[];
        const blockHeight = lines.length * (heading ? 17 : 14) + 8;
        if (!heading && blockHeight < height - 72 && y + blockHeight > height - 36)
            page();
        if (heading && y + 42 > height - 36)
            page();
        for (const line of lines) {
            if (y + 15 > height - 36)
                page();
            pdf.text(line, 36, y);
            y += heading ? 17 : 14;
        }
        y += index === 0 ? 12 : 8;
    });
    return new Uint8Array(pdf.output("arraybuffer"));
}
function deckAdapter(p: CotLesson): WeeklyPowerPoint { return { id: p.id, grade: p.sourcePlan.grade, subject: p.sourcePlan.area, term: p.sourcePlan.term, week: p.sourcePlan.week, title: p.title, competencies: [{ id: "cot-snapshot", text: p.sourcePlan.competencyText, source: p.sourcePlan.references }], slideCount: 20, organization: "weekly", sourcePlanId: p.sourcePlan.id, sourceLesson: null, sourceNotes: "", slides: p.slides, createdAt: p.createdAt, updatedAt: p.updatedAt }; }
export async function buildCotPowerPoint(p: CotLesson) {
    validateCotContent(p);
    if (!p.slides.length || cotMaterialsStale(p))
        throw new Error("Generate or refresh the COT PowerPoint after your lesson edits.");
    p.slides.forEach(slide => { if (!slide.title.trim() || slide.title.length > 110 || slide.bullets.length > 6 || slide.bullets.some(text => !text.trim() || text.length > 160))
        throw new Error("Keep each slide concise: title 110 characters, up to six bullets of 160 characters."); });
    const { buildEditablePowerPointFile, packEditablePowerPoint } = await import("@/services/powerpoint-export");
    return packEditablePowerPoint(await buildEditablePowerPointFile(deckAdapter(p)));
}
export async function buildCotPackage(p: CotLesson) {
    validateCotContent(p);
    if (!p.slides.length || !p.worksheets.length || cotMaterialsStale(p))
        throw new Error("Generate the complete COT materials before downloading the package.");
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    for (const part of ["lesson", "alignment", "worksheets", "assessment", "answer-key"] as const) {
        zip.file(`${part}.docx`, await buildCotWord(p, part));
        zip.file(`${part}.pdf`, await buildCotPdf(p, part));
    }
    zip.file("classroom-presentation.pptx", await buildCotPowerPoint(p));
    zip.file("sources-and-version.txt", `School year: ${p.schoolYear}\nTeacher position: ${p.position}\nStatus: ${p.status}\nSource lesson: ${p.sourcePlan.title}\nSelected sessions: ${p.selectedSessions.join(", ")}\nClass duration: ${p.duration} minutes\n\n${p.indicators.map(i => `${i.code}\n${i.wording}\n${i.careerStage}\n${i.source}\n${i.sourceUrl}\n${i.sourcePage}\nVersion: ${i.version}`).join("\n\n")}\n\nPreparation aid only. Planned coverage is not an official observation rating. Student copies omit COT annotations and teacher answer keys.`);
    return new Uint8Array(await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }));
}
export function downloadCot(bytes: Uint8Array<ArrayBuffer>, name: string, mime: string) { const url = URL.createObjectURL(new Blob([bytes], { type: mime })); const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000); }
export function cotPrintHtml(p: CotLesson, part: CotPart, format: CotLessonFormat = "ilaw") {
    if (part === "lesson" && format === "ilaw") { validateCotContent(p); return ilawCotPrintHtml(p); }
    const esc = (text: string) => text.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(labels[part])}</title><style>@page{size:A4 landscape;margin:12mm}body{font:10pt Arial;color:#000}h1,h2{font-size:12pt;color:#000}h2{break-after:avoid}p{white-space:pre-wrap;line-height:1.4}table{width:100%;border-collapse:collapse}td,th{border:1px solid #d9d9d9;padding:7px;vertical-align:middle;white-space:pre-wrap}thead{display:table-header-group}th{background:#e8effa}.break{break-before:page}</style></head><body>${cotDocumentBlocks(p, part).map((b, i) => b.headers ? `<table><thead><tr>${b.headers.map(t => `<th>${esc(t)}</th>`).join("")}</tr></thead><tbody>${(b.rows || []).map(row => `<tr>${row.map(t => `<td>${esc(t)}</td>`).join("")}</tr>`).join("")}</tbody></table>` : b.heading ? `<${i === 0 ? "h1" : "h2"} class="${b.pageBreak ? "break" : ""}">${esc(b.heading)}</${i === 0 ? "h1" : "h2"}>` : `<p>${esc(b.text || "")}</p>`).join("")}</body></html>`;
}
export function printCot(p: CotLesson, part: CotPart, format: CotLessonFormat = "ilaw") { const html = cotPrintHtml(p, part, format); const popup = window.open("", "_blank"); if (!popup)
    throw new Error("Allow pop-ups for ILAW to open the print view."); popup.document.open(); popup.document.write(html); popup.document.close(); popup.focus(); popup.print(); }
