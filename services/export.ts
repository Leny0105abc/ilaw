import { AlignmentType, BorderStyle, Document, HeadingLevel, ImageRun, Packer, PageOrientation, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { LessonPlan } from "@/types/lesson-plan";
import { learningAreaLabel } from "@/data/curriculum";
import { assessmentDescription, learningExperienceDescription, lessonNameWithWeek, lessonPlanLabels, localizedPosition } from "@/data/lesson-plan-copy";

const dayValues = <T,>(plan: LessonPlan, getter: (index: number) => T) => Array.from({ length: 4 }, (_, index) => index < plan.sessions.length ? getter(index) : ("" as T));
const text = (value: unknown) => String(value ?? "");

type ExportCell = string | { content: string; colSpan: number };

function merged(content: string): ExportCell { return { content, colSpan: 4 }; }

function rows(plan: LessonPlan): Array<[string, ...ExportCell[]]> {
  const labels = lessonPlanLabels(plan.area);
  return [
    [labels.name, merged(lessonNameWithWeek(plan.title, plan.week))],
    [labels.area, merged(learningAreaLabel(plan.grade, plan.area))],
    [labels.teacher, merged(plan.profile.teacherName)],
    [labels.gradeSection, merged(`${labels.gradeWord} ${plan.grade} - ${plan.section}`)],
    [labels.sessions, ...dayValues(plan, (i) => `${labels.session} ${i + 1}`)],
    [labels.references, merged(plan.references)],
    [labels.ai, merged(plan.aiDeclaration)],
    [labels.intentions, merged(labels.intentionDescription)],
    [labels.competency, ...dayValues(plan, () => plan.competencyText)],
    [labels.objectives, ...dayValues(plan, (i) => plan.sessions[i].objectives.join("\n"))],
    [labels.context, ...dayValues(plan, (i) => plan.sessions[i].learnerContext)],
    [labels.experience, merged(learningExperienceDescription(plan.area))],
    [labels.preLesson, ...dayValues(plan, (i) => plan.sessions[i].preLesson)],
    [labels.flow, ...dayValues(plan, (i) => `${labels.flowParts[0]}: ${plan.sessions[i].flow.iDo}\n\n${labels.flowParts[1]}: ${plan.sessions[i].flow.weDo}\n\n${labels.flowParts[2]}: ${plan.sessions[i].flow.youDo}\n\n${labels.flowParts[3]}: ${plan.sessions[i].flow.synthesis}`)],
    [labels.resources, ...dayValues(plan, (i) => plan.sessions[i].resources.join(", "))],
    [labels.integration, ...dayValues(plan, (i) => plan.sessions[i].integration)],
    [labels.assessment, merged(assessmentDescription(plan.area))],
    [labels.formative, ...dayValues(plan, (i) => plan.sessions[i].assessment)],
    [labels.waysForward, merged(labels.waysDescription)],
    [labels.extended, ...dayValues(plan, (i) => plan.sessions[i].extendedLearning)],
    [labels.reflections, ...dayValues(plan, (i) => plan.sessions[i].reflection)],
  ];
}

function splitRows(plan: LessonPlan) {
  const allRows = rows(plan);
  const assessmentIndex = allRows.findIndex((row) => row[0] === lessonPlanLabels(plan.area).assessment);
  return [allRows.slice(0, assessmentIndex), allRows.slice(assessmentIndex)] as const;
}

export async function exportDocx(plan: LessonPlan) {
  const logoData = await fetch("/deped-seal.png").then((response) => response.arrayBuffer());
  const labels = lessonPlanLabels(plan.area);
  const border = { style: BorderStyle.SINGLE, size: 4, color: "64748B" };
  const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const [pageOneRows, pageTwoRows] = splitRows(plan);
  const tableRows = (contentRows: Array<[string, ...ExportCell[]]>) => [
    new TableRow({ children: ["", ...labels.days].map((item) => new TableCell({ borders: { top:border,bottom:border,left:border,right:border }, shading: { fill: item ? "DDE8F8" : "FFFFFF" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item, bold: true, size: 16 })] })] })) }),
    ...contentRows.map((row) => new TableRow({
      cantSplit: true,
      children: row.map((item, index) => {
        const value = typeof item === "string" ? item : item.content;
        return new TableCell({
          columnSpan: typeof item === "string" ? undefined : item.colSpan,
          borders: { top:border,bottom:border,left:border,right:border },
          shading: index === 0 ? { fill: "EEF3F9" } : undefined,
          children: text(value).split("\n").map((line) => new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: line, bold: index === 0, size: 15 })] })),
        });
      }),
    })),
  ];
  const doc = new Document({ sections: [{ properties: { page: { size: { orientation: PageOrientation.LANDSCAPE }, margin: { top: 280, right: 280, bottom: 280, left: 280 } } }, children: [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new ImageRun({ data: logoData, transformation: { width: 54, height: 54 }, type: "png" })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: labels.republic, size: 18 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: labels.department, bold: true, size: 20 })] }),
    ...[plan.profile.region, plan.profile.division, plan.profile.district, plan.profile.school, plan.profile.location].map((line) => new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: line, size: 17 })] })),
    new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { before: 100, after: 120 }, children: [new TextRun({ text: labels.lessonPlan, bold: true, size: 24 })] }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: [1850, 1900, 1900, 1900, 1900], rows: tableRows(pageOneRows) }),
    new Paragraph({ pageBreakBefore: true, alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: `${labels.lessonPlan} – ${labels.continuation}`, bold: true, size: 22 })] }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: [1850, 1900, 1900, 1900, 1900], rows: tableRows(pageTwoRows) }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: [2600, 4300, 2600], rows: [new TableRow({ children: [
      new TableCell({ borders: { top:noBorder,bottom:noBorder,left:noBorder,right:noBorder }, children: [
        new Paragraph({ spacing: { before: 240 }, children: [new TextRun({ text: labels.preparedBy, size: 18 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 360 }, children: [new TextRun({ text: plan.profile.teacherName, bold: true, size: 19 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: localizedPosition(plan.profile.position, plan.area), size: 18 })] }),
      ] }),
      new TableCell({ borders: { top:noBorder,bottom:noBorder,left:noBorder,right:noBorder }, children: [new Paragraph("")] }),
      new TableCell({ borders: { top:noBorder,bottom:noBorder,left:noBorder,right:noBorder }, children: [
        new Paragraph({ spacing: { before: 240 }, children: [new TextRun({ text: labels.reviewedBy, size: 18 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 360 }, children: [new TextRun({ text: plan.profile.schoolHead, bold: true, size: 19 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: localizedPosition(plan.profile.schoolHeadPosition, plan.area), size: 18 })] }),
      ] }),
    ] })] }),
  ] }] });
  const blob = await Packer.toBlob(doc);
  download(blob, `${safe(plan.title)}-ILAW.docx`);
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
  const tableOptions = { theme: "grid" as const, styles: { fontSize: 5.6, cellPadding: 2.4, valign: "top" as const, lineColor: [100,116,139] as [number,number,number], lineWidth: .3 }, headStyles: { fillColor: [23,63,138] as [number,number,number], textColor: 255, halign: "center" as const }, columnStyles: { 0: { fillColor: [238,243,249] as [number,number,number], fontStyle: "bold" as const, cellWidth: 106 } }, margin: { left: 16, right: 16 } };
  autoTable(pdf, { startY: 142, head: [["", ...labels.days]], body: pageOneRows, ...tableOptions });
  pdf.addPage("a4", "landscape");
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(12); pdf.text(`${labels.lessonPlan} – ${labels.continuation}`, 421, 28, { align: "center" });
  autoTable(pdf, { startY: 38, head: [["", ...labels.days]], body: pageTwoRows, ...tableOptions });
  const finalTableY = (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 460;
  let signatureY = finalTableY + 24;
  if (signatureY > 515) { pdf.addPage("a4", "landscape"); signatureY = 36; }
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
  pdf.text(labels.preparedBy, 32, signatureY);
  pdf.text(labels.reviewedBy, 585, signatureY);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(10);
  pdf.text(plan.profile.teacherName, 125, signatureY + 40, { align: "center" });
  pdf.text(plan.profile.schoolHead, 710, signatureY + 40, { align: "center" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
  pdf.text(localizedPosition(plan.profile.position, plan.area), 125, signatureY + 54, { align: "center" });
  pdf.text(localizedPosition(plan.profile.schoolHeadPosition, plan.area), 710, signatureY + 54, { align: "center" });
  pdf.save(`${safe(plan.title)}-ILAW.pdf`);
}

function safe(value: string) { return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""); }
function download(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 500); }
async function imageDataUrl(url: string) { const blob = await fetch(url).then((response) => response.blob()); return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); }); }
