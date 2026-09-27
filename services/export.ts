import { AlignmentType, BorderStyle, Document, HeadingLevel, ImageRun, Packer, PageOrientation, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { LessonPlan } from "@/types/lesson-plan";
import { areaAbbreviation, learningAreaLabel } from "@/data/curriculum";
import { assessmentDescription, firstColumnLabels, learningExperienceDescription, lessonNameWithWeek, lessonPlanLabels, localizedPosition } from "@/data/lesson-plan-copy";

const dayValues = <T,>(plan: LessonPlan, getter: (index: number) => T) => Array.from({ length: 4 }, (_, index) => index < plan.sessions.length ? getter(index) : ("" as T));
const text = (value: unknown) => String(value ?? "");

type ExportCell = string | { content: string; colSpan?: number; styles?: { halign: "center" } };

function merged(content: string): ExportCell { return { content, colSpan: 4 }; }
function centered(content: string): ExportCell { return { content, styles: { halign: "center" } }; }

function rows(plan: LessonPlan): Array<[string, ...ExportCell[]]> {
  const labels = lessonPlanLabels(plan.area);
  const columnLabels = firstColumnLabels();
  return [
    [columnLabels.name, merged(lessonNameWithWeek(plan.title, plan.week))],
    [columnLabels.area, merged(learningAreaLabel(plan.grade, plan.area))],
    [columnLabels.teacher, merged(plan.profile.teacherName)],
    [columnLabels.gradeSection, merged(`${labels.gradeWord} ${plan.grade} - ${plan.section}`)],
    [columnLabels.sessions, ...dayValues(plan, (i) => centered(`${labels.session} ${i + 1}`))],
    [columnLabels.references, merged(plan.references)],
    [columnLabels.ai, merged(plan.aiDeclaration)],
    [columnLabels.intentions, merged(labels.intentionDescription)],
    [columnLabels.competency, merged(plan.competencyText)],
    [columnLabels.objectives, ...dayValues(plan, (i) => plan.sessions[i].objectives.join("\n"))],
    [columnLabels.context, ...dayValues(plan, (i) => plan.sessions[i].learnerContext)],
    [columnLabels.experience, merged(learningExperienceDescription(plan.area))],
    [columnLabels.preLesson, ...dayValues(plan, (i) => plan.sessions[i].preLesson)],
    [columnLabels.flow, ...dayValues(plan, (i) => `${plan.sessions[i].flow.iDo}\n\n${plan.sessions[i].flow.weDo}\n\n${plan.sessions[i].flow.youDo}\n\n${labels.flowParts[3]}: ${plan.sessions[i].flow.synthesis}`)],
    [columnLabels.resources, ...dayValues(plan, (i) => plan.sessions[i].resources.join(", "))],
    [columnLabels.integration, ...dayValues(plan, (i) => plan.sessions[i].integration)],
    [columnLabels.assessment, merged(assessmentDescription(plan.area))],
    [columnLabels.formative, ...dayValues(plan, (i) => plan.sessions[i].assessment)],
    [columnLabels.waysForward, merged(labels.waysDescription)],
    [columnLabels.extended, ...dayValues(plan, (i) => plan.sessions[i].extendedLearning)],
    [columnLabels.reflections, ...dayValues(plan, (i) => plan.sessions[i].reflection)],
  ];
}

function splitRows(plan: LessonPlan) {
  const allRows = rows(plan);
  const assessmentIndex = allRows.findIndex((row) => row[0] === firstColumnLabels().assessment);
  return [allRows.slice(0, assessmentIndex), allRows.slice(assessmentIndex)] as const;
}

export async function exportDocx(plan: LessonPlan) {
  const logoData = await fetch("/deped-seal.png").then((response) => response.arrayBuffer());
  const labels = lessonPlanLabels(plan.area);
  const border = { style: BorderStyle.SINGLE, size: 4, color: "64748B" };
  const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const [pageOneRows, pageTwoRows] = splitRows(plan);
  const tableRows = (contentRows: Array<[string, ...ExportCell[]]>) =>
    contentRows.map((row) => new TableRow({
      cantSplit: true,
      children: row.map((item, index) => {
        const value = typeof item === "string" ? item : item.content;
        return new TableCell({
          columnSpan: typeof item === "string" ? undefined : item.colSpan,
          borders: { top:border,bottom:border,left:border,right:border },
          shading: index === 0 ? { fill: "EEF3F9" } : undefined,
          children: text(value).split("\n").map((line) => new Paragraph({ alignment: typeof item !== "string" && item.styles?.halign === "center" ? AlignmentType.CENTER : undefined, spacing: { after: 40 }, children: [new TextRun({ text: line, bold: index === 0 || (typeof item !== "string" && item.styles?.halign === "center"), size: 15 })] })),
        });
      }),
    }));
  const doc = new Document({ sections: [{ properties: { page: { size: { orientation: PageOrientation.LANDSCAPE }, margin: { top: 280, right: 280, bottom: 280, left: 280 } } }, children: [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new ImageRun({ data: logoData, transformation: { width: 54, height: 54 }, type: "png" })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: labels.republic, size: 18 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: labels.department, bold: true, size: 20 })] }),
    ...[plan.profile.region, plan.profile.division, plan.profile.district, plan.profile.school, plan.profile.location].map((line) => new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: line, size: 17 })] })),
    new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { before: 100, after: 120 }, children: [new TextRun({ text: labels.lessonPlan, bold: true, size: 24 })] }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: [1850, 1900, 1900, 1900, 1900], rows: tableRows(pageOneRows) }),
    new Paragraph({ pageBreakBefore: true, alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: `${labels.lessonPlan} – ${labels.continuation}`, bold: true, size: 22 })] }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: [1850, 1900, 1900, 1900, 1900], rows: tableRows(pageTwoRows) }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: [4750, 4750], rows: [new TableRow({ children: [
      new TableCell({ borders: { top:noBorder,bottom:noBorder,left:noBorder,right:noBorder }, children: [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240 }, children: [new TextRun({ text: labels.preparedBy, size: 18 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 360 }, children: [new TextRun({ text: plan.profile.teacherName, bold: true, size: 19 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: localizedPosition(plan.profile.position, plan.area), size: 18 })] }),
      ] }),
      new TableCell({ borders: { top:noBorder,bottom:noBorder,left:noBorder,right:noBorder }, children: [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240 }, children: [new TextRun({ text: labels.reviewedBy, size: 18 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 360 }, children: [new TextRun({ text: plan.profile.schoolHead, bold: true, size: 19 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: localizedPosition(plan.profile.schoolHeadPosition, plan.area), size: 18 })] }),
      ] }),
    ] })] }),
  ] }] });
  const blob = await Packer.toBlob(doc);
  download(blob, `${exportFilename(plan)}.docx`);
}

export async function exportPdf(plan: LessonPlan) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const labels = lessonPlanLabels(plan.area);
  const [pageOneRows, pageTwoRows] = splitRows(plan);
  const logoData = await imageDataUrl("/deped-seal.png");
  pdf.addImage(logoData, "PNG", 394, 12, 54, 54);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
  pdf.text(labels.republic, 421, 76, { align: "center" });
  pdf.setFont("helvetica", "bold"); pdf.text(labels.department, 421, 89, { align: "center" });
  pdf.setFont("helvetica", "normal"); pdf.text(`${plan.profile.region} | ${plan.profile.division} | ${plan.profile.district}`, 421, 102, { align: "center" });
  pdf.text(`${plan.profile.school} - ${plan.profile.location}`, 421, 115, { align: "center" });
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(12); pdf.text(labels.lessonPlan, 421, 132, { align: "center" });
  const tableOptions = { theme: "grid" as const, styles: { fontSize: 5.6, cellPadding: 2.4, valign: "top" as const, lineColor: [100,116,139] as [number,number,number], lineWidth: .3 }, columnStyles: { 0: { fillColor: [238,243,249] as [number,number,number], fontStyle: "bold" as const, cellWidth: 106 } }, margin: { left: 16, right: 16 } };
  autoTable(pdf, { startY: 142, body: pageOneRows, ...tableOptions });
  pdf.addPage("a4", "landscape");
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(12); pdf.text(`${labels.lessonPlan} – ${labels.continuation}`, 421, 28, { align: "center" });
  autoTable(pdf, { startY: 38, body: pageTwoRows, ...tableOptions });
  const finalTableY = (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 460;
  let signatureY = finalTableY + 24;
  if (signatureY > 515) { pdf.addPage("a4", "landscape"); signatureY = 36; }
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
  const signatureLeft = 32;
  const signatureWidth = 778;
  const signatureColumnWidth = signatureWidth / 2;
  const leftSignatureCenter = signatureLeft + signatureColumnWidth / 2;
  const rightSignatureCenter = signatureLeft + signatureColumnWidth + signatureColumnWidth / 2;
  pdf.text(labels.preparedBy, leftSignatureCenter, signatureY, { align: "center" });
  pdf.text(labels.reviewedBy, rightSignatureCenter, signatureY, { align: "center" });
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(10);
  pdf.text(plan.profile.teacherName, leftSignatureCenter, signatureY + 40, { align: "center" });
  pdf.text(plan.profile.schoolHead, rightSignatureCenter, signatureY + 40, { align: "center" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
  pdf.text(localizedPosition(plan.profile.position, plan.area), leftSignatureCenter, signatureY + 54, { align: "center" });
  pdf.text(localizedPosition(plan.profile.schoolHeadPosition, plan.area), rightSignatureCenter, signatureY + 54, { align: "center" });
  pdf.save(`${exportFilename(plan)}.pdf`);
}

function exportFilename(plan: LessonPlan) {
  const learningArea = plan.area === "Good Manners and Right Conduct"
    ? `GMRC${plan.grade}`
    : `TLE${plan.grade}_${areaAbbreviation[plan.area]}`;
  return safeFilename(`${learningArea}_${lessonNameWithWeek(plan.title, plan.week)}`);
}
function safeFilename(value: string) { return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "").replace(/\s+/g, " ").replace(/[. ]+$/g, "").trim(); }
function download(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 500); }
async function imageDataUrl(url: string) { const blob = await fetch(url).then((response) => response.blob()); return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); }); }
