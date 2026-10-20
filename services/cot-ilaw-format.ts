import type { CotActivity, CotLesson } from "@/types/cot";
import { learningAreaLabel } from "@/data/curriculum";
import { assessmentDescription, isTagalogLearningArea, learningExperienceDescription, lessonNameWithWeek, lessonPlanLabels, localizedPosition } from "@/data/lesson-plan-copy";
import { cotCoverage, cotEvidence } from "@/services/cot-generator";

export type CotLessonFormat = "ilaw" | "detailed";
export type CotIlawRow = { label: string; guidance?: string; content: string; section?: boolean };
const widths = [2972, 13216];
const margin = { top: 567, bottom: 284, left: 284, right: 284 };
const esc = (text: string) => text.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function annotations(p: CotLesson, activity: CotActivity) {
  return p.alignments.flatMap(alignment => {
    const indicator = p.indicators.find(i => i.id === alignment.indicatorId);
    if (!indicator) return [];
    return cotEvidence(p, alignment).filter(e => e.activityId === activity.id).map(e =>
      `ANNOTATION — PPST ${indicator.code}\n${indicator.wording}\n${e.annotation}\nExpected observable evidence: ${e.observableEvidence}\nPlanned coverage: ${cotCoverage(p, alignment)}. This is planned evidence, not a completed observation or rating.`);
  });
}

function activityText(p: CotLesson, a: CotActivity) {
  const tagalog = isTagalogLearningArea(p.sourcePlan.area);
  const terms = tagalog ? { teacher: "Guro", learners: "Mga mag-aaral", question: "Gabay na tanong", responses: "Inaasahang tugon", followUp: "Kasunod na tanong", support: "Karagdagang gabay", core: "Pangunahing gawain", extension: "Karagdagang hamon", check: "Pagsusuri sa pagkatuto" } : { teacher: "Teacher", learners: "Learners", question: "Guide question", responses: "Anticipated responses", followUp: "Follow-up", support: "Support", core: "Core task", extension: "Extension", check: "Check for understanding" };
  return [
    `${tagalog ? "SESYON" : "SESSION"} ${a.session} — ${a.title} (${a.minutes} min)`,
    `${terms.teacher}: ${a.teacherActivity}`,
    `${terms.learners}: ${a.learnerActivity}`,
    ...a.questions.map(q => `${terms.question}: ${q.question}\n${terms.responses}: ${q.responses.join("; ")}\n${terms.followUp}: ${q.followUp}`),
    ...(/activity-[56]$/.test(a.id) ? [`${terms.support}: ${a.differentiation.support}\n${terms.core}: ${a.differentiation.core}\n${terms.extension}: ${a.differentiation.extension}`] : []),
    `${terms.check}: ${a.formative.task}\n${a.formative.expectedEvidence}`,
    ...annotations(p, a),
  ].join("\n\n");
}

export function cotIlawRows(p: CotLesson): CotIlawRow[] {
  const area = p.sourcePlan.area, labels = lessonPlanLabels(area), tagalog = isTagalogLearningArea(area);
  const pre = p.activities.filter(a => /activity-[123]$/.test(a.id));
  const flow = p.activities.filter(a => !pre.includes(a));
  const questionText = p.assessment.map((item, i) => `${i + 1}. ${item.question}${item.choices ? "\n" + (["A", "B", "C", "D"] as const).map(letter => `${letter}. ${item.choices![letter]}`).join("\n") : "\n________________________________________________"}${item.rubric.length ? "\n" + item.rubric.map(r => `${r.criterion}: ${r.points}`).join("\n") : ""}`).join("\n\n");
  const assessmentActivities = p.activities.filter(a => p.assessment.some(item => item.activityId === a.id));
  const declaration = tagalog
    ? `Ginamit ang AI upang tumulong sa pagbuo ng burador ng aralin at mga gawain. Hindi binago ang opisyal na kasanayan at mga napiling pamantayan. ${p.teacherReviewed ? "Minarkahan ng guro na nasuri na ang nilalaman." : "Kailangan pa ng pagsusuri at pagpapatunay ng guro bago gamitin."}`
    : `AI assisted in drafting lesson activities and organizing this plan. The official competency and selected indicators remain unchanged. ${p.teacherReviewed ? "The teacher has marked the content as reviewed." : "Teacher review and validation are still required before classroom use."}`;
  return [
    { label: "Name of Lesson", content: lessonNameWithWeek(p.title, p.sourcePlan.week) },
    { label: "Learning Area/s", content: learningAreaLabel(p.sourcePlan.grade, area) },
    { label: "Designed by Teacher/s", content: p.teacherName },
    { label: "Grade Level and Section", content: `GRADE ${p.sourcePlan.grade} — ${p.section}` },
    { label: "Duration", content: `${p.duration} ${tagalog ? "minuto" : "minutes"} · ${labels.session} ${p.selectedSessions.join(", ")}` },
    { label: "References", content: [p.sourcePlan.references, ...new Set(p.indicators.map(i => `${i.source}\n${i.sourceUrl} · ${i.sourcePage} · ${i.version}`))].filter(Boolean).join("\n\n") },
    { label: "Declaration of AI use", content: declaration },
    { label: "Intentions.", section: true, content: tagalog ? labels.intentionDescription : "Meaningful learning experiences are anchored in how we frame them. Start by deciding what you want learners to master by the end of the lesson — keep it clear and simple.\n\nRemember: Understanding your learners’ evolving context and designing around it ensure that your lessons connect with and are relevant to them." },
    { label: "Learning Competency", guidance: "Write the competency/ies from the curriculum that we are targeting, and the content or performance standards applicable to the sessions.", content: p.sourcePlan.competencyText },
    { label: "Learning Objectives", guidance: "Write the smaller knowledge, skills, or tasks from the competency that the learners will work on and be able to show by the end of the sessions.", content: p.objectives.map((text, i) => `${i + 1}. ${text}`).join("\n") },
    { label: "Learner Context", guidance: "Write your observations of your learners, and how they have been performing or responding to learning experiences recently. Include strengths, interests, and possible barriers to learning.", content: p.learnerContext },
    { label: "Learning Experience.", section: true, content: learningExperienceDescription(area) },
    { label: "Pre-Lesson", guidance: "Describe how you will help the learners get ready for the lesson.", content: [p.preLesson, ...pre.map(a => activityText(p, a))].filter(Boolean).join("\n\n") },
    { label: "Flow", guidance: `Describe the activities that you can implement in ${p.selectedSessions.length === 1 ? "1 session" : "the selected sessions"} to meet the learning objectives.\n\nApply the Learning Design Principles by thinking about how to:\n-make the objectives clear for the learners\n-guide learners before letting them try the task on their own\n-check the state of the learners’ well-being, understanding, and mastery over the lesson\n-connect today’s new concepts to past competencies\n-encourage collaboration among learners\n-invite learners to reflect on why this matters to them\n-ensure inclusion for learners’ varied abilities, learning styles, and contexts`, content: [`${tagalog ? "Kabuuang oras ng lahat ng gawain" : "Timed Teaching Flow — total across Pre-Lesson and Flow"}: ${p.activities.reduce((sum, a) => sum + a.minutes, 0)} min`, ...flow.map(a => activityText(p, a))].join("\n\n") },
    { label: "Learning Resources", guidance: "List down the learning resources that will help you reach your objectives. Ensure that they are available and inclusive.\nInclude options and alternatives in case of emergencies.", content: p.resources.join("\n") },
    { label: "Opportunities for integration", guidance: "Write down any possibilities to meaningfully integrate another learning area, special topic, or technology. Write N/A if none.", content: p.integration || "N/A" },
    { label: "ASSESSMENT.", section: true, content: assessmentDescription(area) },
    { label: "Formative Assessment", guidance: "Create a task, activity or questions to evaluate learning and provide feedback. Include ways for learners to ask for guidance or support.\n\nRemember to provide appropriate accommodations so all learners can demonstrate their understanding (e.g., varied response formats, small group options, visual or auditory supports).", content: [questionText, ...assessmentActivities.flatMap(a => annotations(p, a)), tagalog ? "Tingnan ang hiwalay na Teacher Answer Key. Hindi kasama ang mga sagot sa kopya ng mag-aaral." : "See the separate Teacher Answer Key. Answers are not included in student materials."].join("\n\n") },
    { label: "Ways Forward.", section: true, content: tagalog ? labels.waysDescription : "Meaningful learning can also happen beyond the classroom — for both the learners and the teacher.\nPause and reflect on what happened today." },
    { label: "Extended learning opportunities", guidance: "Suggest other learning experiences outside the classroom/class hours that learners may want to access to reinforce what they have learned, to spark their curiosities further, or that may provide them support in their areas of difficulty.", content: p.extendedLearning },
    { label: "Reflections", guidance: "Think about what you need to change for the next session based on what happened today. Is there something the learners are interested in exploring?\n\nAre there some things you would like to share with your co-teachers, parents, or school leaders about your classroom experience? What would you like your instructional coach to help you with?", content: p.reflection },
  ];
}

export function cotIlawHeader(p: CotLesson) {
  const profile = p.sourcePlan.profile;
  return ["Republic of the Philippines", "DEPARTMENT OF EDUCATION", profile.region, profile.division, profile.district, profile.school, profile.location].filter(Boolean);
}
export function cotObservationLine(p: CotLesson) {
  return `School Year ${p.schoolYear} · Observation ${p.observationDate || "____________"} ${p.observationTime || ""} · Observer: ${p.observer || "____________"} · Cycle: ${p.cycle} · ${p.status}. Planned evidence only; not an official COT rating.`;
}
async function sealData() {
  if (typeof window === "undefined") return null; // Offline tests may supply the existing seal explicitly.
  const result = await fetch("/deped-seal.png");
  if (!result.ok) throw new Error("The DepEd seal could not be loaded. Refresh ILAW before exporting.");
  return new Uint8Array(await result.arrayBuffer());
}

export async function buildIlawCotWord(p: CotLesson, seal: Uint8Array | null = null) {
  const { AlignmentType, BorderStyle, Document, ImageRun, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, VerticalAlign } = await import("docx");
  const logo = seal || await sealData();
  const border = { style: BorderStyle.SINGLE, size: 4, color: "000000" }, none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const paragraph = (text: string, bold = false, center = false) => new Paragraph({ alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT, keepNext: bold || !text.trim(), spacing: { after: 60, line: 240 }, children: [new TextRun({ text, bold, size: 20, font: "Bookman Old Style" })] });
  const rows = cotIlawRows(p).map(row => new TableRow({ children: [
    new TableCell({ width: { size: widths[0], type: WidthType.DXA }, verticalAlign: VerticalAlign.TOP, margins: { top: 80, bottom: 80, left: 90, right: 90 }, children: [new Paragraph({ spacing: { after: 50 }, children: [new TextRun({ text: row.label + (row.guidance ? ":" : ""), bold: true, italics: !row.section, size: 20 })] }), ...(row.guidance ? row.guidance.split("\n").map(line => paragraph(line)) : [])] }),
    new TableCell({ width: { size: widths[1], type: WidthType.DXA }, verticalAlign: VerticalAlign.TOP, margins: { top: 80, bottom: 80, left: 90, right: 90 }, children: row.content.split("\n").map(line => paragraph(line, /^ANNOTATION|^(?:SESSION|SESYON) \d/.test(line))) }),
  ] }));
  const labels = lessonPlanLabels(p.sourcePlan.area);
  const sign = (lines: string[]) => new TableCell({ borders: { top: none, bottom: none, left: none, right: none }, children: [paragraph(lines[0], false, true), paragraph(""), paragraph(lines[1], true, true), paragraph(lines[2], false, true)] });
  const doc = new Document({ styles: { default: { document: { run: { font: "Bookman Old Style", size: 20, color: "000000" } } } }, sections: [{ properties: { page: { size: { width: 16838, height: 11906 }, margin } }, children: [
    ...(logo ? [new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: "png", data: logo, transformation: { width: 54, height: 54 } })] })] : []),
    ...cotIlawHeader(p).map((line, i) => paragraph(line, i === 1 || line === p.sourcePlan.profile.school, true)),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 120 }, children: [new TextRun({ text: "LESSON PLAN", bold: true, size: 24 })] }),
    paragraph(cotObservationLine(p)),
    new Table({ width: { size: 16188, type: WidthType.DXA }, columnWidths: widths, borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border }, rows }),
    paragraph(""),
    new Table({ width: { size: 16188, type: WidthType.DXA }, columnWidths: [8094, 8094], borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none }, rows: [new TableRow({ cantSplit: true, children: [sign([labels.preparedBy, p.teacherName, localizedPosition(p.position, p.sourcePlan.area)]), sign([labels.reviewedBy, p.observer || "____________________________", p.observer === p.sourcePlan.profile.schoolHead ? localizedPosition(p.sourcePlan.profile.schoolHeadPosition, p.sourcePlan.area) : "Observer / Reviewer"]) ] })] }),
  ] }] });
  return new Uint8Array(await Packer.toArrayBuffer(doc));
}

export async function buildIlawCotPdf(p: CotLesson, seal: Uint8Array | null = null) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const logo = seal || await sealData(), pageWidth = pdf.internal.pageSize.getWidth(), pageHeight = pdf.internal.pageSize.getHeight();
  let y = 28;
  if (logo) { pdf.addImage(logo, "PNG", pageWidth / 2 - 27, y, 54, 54); y += 67; }
  pdf.setFontSize(10);
  cotIlawHeader(p).forEach((line, i) => { pdf.setFont("times", i === 1 || line === p.sourcePlan.profile.school ? "bold" : "normal"); pdf.text(line, pageWidth / 2, y, { align: "center" }); y += 12; });
  pdf.setFont("times", "bold"); pdf.setFontSize(12); pdf.text("LESSON PLAN", pageWidth / 2, y + 7, { align: "center" }); y += 25;
  pdf.setFont("times", "normal"); pdf.setFontSize(10);
  const observation = pdf.splitTextToSize(cotObservationLine(p), pageWidth - 32) as string[];
  pdf.text(observation, 16, y); y += observation.length * 12 + 10;
  // Keep an activity with its explanation when it fits on a page. Invisible
  // internal horizontal borders preserve the reference's single Flow cell look.
  const pdfRows = cotIlawRows(p).flatMap(row => {
    const parts = row.label === "Flow" || row.label === "Pre-Lesson" ? row.content.split(/\n\n(?=(?:SESSION|SESYON) \d)/) : [row.content];
    if (parts.length > 1 && !/^(SESSION|SESYON) \d/.test(parts[0])) parts.splice(0, 2, `${parts[0]}\n\n${parts[1]}`);
    return parts.map((part, index) => {
      const lineWidth = { left: .4, right: .4, top: index === 0 ? .4 : 0, bottom: index === parts.length - 1 ? .4 : 0 };
      return [{ content: index === 0 ? `${row.label}${row.guidance ? ":\n" + row.guidance : ""}` : "", styles: { lineWidth } }, { content: part, styles: { lineWidth } }];
    });
  });
  autoTable(pdf, { startY: y, body: pdfRows, theme: "grid", styles: { font: "times", fontSize: 10, cellPadding: 5, valign: "top", overflow: "linebreak", lineColor: [0, 0, 0], lineWidth: .4 }, columnStyles: { 0: { cellWidth: (pageWidth - 32) * widths[0] / 16188, fontStyle: "bolditalic" } }, margin: { top: 28, bottom: 16, left: 16, right: 16 }, rowPageBreak: "avoid" });
  y = (pdf as typeof pdf & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 22;
  if (y + 65 > pageHeight - 16) { pdf.addPage(); y = 36; }
  const labels = lessonPlanLabels(p.sourcePlan.area);
  for (const [i, lines] of [[labels.preparedBy, p.teacherName, localizedPosition(p.position, p.sourcePlan.area)], [labels.reviewedBy, p.observer || "____________________________", p.observer === p.sourcePlan.profile.schoolHead ? localizedPosition(p.sourcePlan.profile.schoolHeadPosition, p.sourcePlan.area) : "Observer / Reviewer"]].entries()) {
    const x = pageWidth * (i ? .75 : .25);
    pdf.setFont("times", "normal"); pdf.text(lines[0], x, y, { align: "center" }); pdf.setFont("times", "bold"); pdf.text(lines[1], x, y + 30, { align: "center" }); pdf.setFont("times", "normal"); pdf.text(lines[2], x, y + 44, { align: "center" });
  }
  return new Uint8Array(pdf.output("arraybuffer"));
}

export function ilawCotPrintHtml(p: CotLesson) {
  const labels = lessonPlanLabels(p.sourcePlan.area);
  return `<!doctype html><html><head><meta charset="utf-8"><title>ILAW COT Lesson Plan</title><style>@page{size:A4 landscape;margin:10mm 5mm 5mm}body{font:10pt "Bookman Old Style",Georgia,serif;color:#000}.heading{text-align:center}.heading img{width:54px;height:54px}.heading p{margin:2px}h1{font-size:12pt;margin:10px 0}p{line-height:1.3;white-space:pre-wrap}table{border-collapse:collapse;width:100%;table-layout:fixed}th,td{border:.5pt solid #000;padding:5px;vertical-align:top;white-space:pre-wrap;overflow-wrap:anywhere}th{width:18.36%;text-align:left;font-style:italic}th small{display:block;font-size:10pt;font-style:normal;font-weight:normal;margin-top:4px}.section th{font-style:normal}.signatures{display:grid;grid-template-columns:1fr 1fr;text-align:center;break-inside:avoid;margin-top:20px}.signatures strong{display:block;margin-top:30px}</style></head><body><header class="heading"><img src="/deped-seal.png" alt="Department of Education seal">${cotIlawHeader(p).map(line => `<p>${esc(line)}</p>`).join("")}<h1>LESSON PLAN</h1></header><p>${esc(cotObservationLine(p))}</p><table><tbody>${cotIlawRows(p).map(row => `<tr class="${row.section ? "section" : ""}"><th scope="row">${esc(row.label)}${row.guidance ? `<small>${esc(row.guidance)}</small>` : ""}</th><td>${esc(row.content)}</td></tr>`).join("")}</tbody></table><div class="signatures"><div>${esc(labels.preparedBy)}<strong>${esc(p.teacherName)}</strong>${esc(localizedPosition(p.position, p.sourcePlan.area))}</div><div>${esc(labels.reviewedBy)}<strong>${esc(p.observer || "____________________________")}</strong>${esc(p.observer === p.sourcePlan.profile.schoolHead ? localizedPosition(p.sourcePlan.profile.schoolHeadPosition, p.sourcePlan.area) : "Observer / Reviewer")}</div></div></body></html>`;
}
