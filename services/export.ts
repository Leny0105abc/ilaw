import { AlignmentType, BorderStyle, Document, HeadingLevel, ImageRun, Packer, PageOrientation, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { LessonPlan } from "@/types/lesson-plan";
import { learningAreaLabel } from "@/data/curriculum";
import { ASSESSMENT_DESCRIPTION, LEARNING_EXPERIENCE_DESCRIPTION } from "@/data/lesson-plan-copy";

const dayValues = <T,>(plan: LessonPlan, getter: (index: number) => T) => Array.from({ length: 4 }, (_, index) => index < plan.sessions.length ? getter(index) : ("" as T));
const text = (value: unknown) => String(value ?? "");

type ExportCell = string | { content: string; colSpan: number };

function merged(content: string): ExportCell { return { content, colSpan: 4 }; }

function rows(plan: LessonPlan): Array<[string, ...ExportCell[]]> {
  return [
    ["Name of Lesson", merged(plan.title)],
    ["Learning Area/s", merged(learningAreaLabel(plan.grade, plan.area))],
    ["Designed by Teacher/s", merged(plan.profile.teacherName)],
    ["Designed for which Grade Level and Section", merged(`GRADE ${plan.grade} - ${plan.section}`)],
    ["No. of Sessions", ...dayValues(plan, (i) => `SESSION ${i + 1}`)],
    ["References", merged(plan.references)],
    ["Declaration of AI use", merged(plan.aiDeclaration)],
    ["INTENTIONS", merged("Meaningful learning experiences are anchored in clear, relevant intentions.")],
    ["Learning Competency", ...dayValues(plan, () => plan.competencyText)],
    ["Learning Objectives", ...dayValues(plan, (i) => plan.sessions[i].objectives.join("\n"))],
    ["Learner Context", ...dayValues(plan, (i) => plan.sessions[i].learnerContext)],
    ["LEARNING EXPERIENCE", merged(LEARNING_EXPERIENCE_DESCRIPTION)],
    ["Pre-Lesson", ...dayValues(plan, (i) => plan.sessions[i].preLesson)],
    ["Flow", ...dayValues(plan, (i) => `I DO: ${plan.sessions[i].flow.iDo}\n\nWE DO: ${plan.sessions[i].flow.weDo}\n\nYOU DO: ${plan.sessions[i].flow.youDo}\n\nSYNTHESIS: ${plan.sessions[i].flow.synthesis}`)],
    ["Learning Resources", ...dayValues(plan, (i) => plan.sessions[i].resources.join(", "))],
    ["Opportunities for integration", ...dayValues(plan, (i) => plan.sessions[i].integration)],
    ["ASSESSMENT", merged(ASSESSMENT_DESCRIPTION)],
    ["Formative Assessment", ...dayValues(plan, (i) => plan.sessions[i].assessment)],
    ["WAYS FORWARD", merged("Learning continues through reflection and realistic experiences beyond class.")],
    ["Extended learning opportunities", ...dayValues(plan, (i) => plan.sessions[i].extendedLearning)],
    ["Reflections", ...dayValues(plan, (i) => plan.sessions[i].reflection)],
  ];
}

export async function exportDocx(plan: LessonPlan) {
  const logoData = await fetch("/deped-seal.png").then((response) => response.arrayBuffer());
  const border = { style: BorderStyle.SINGLE, size: 4, color: "64748B" };
  const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const tableRows = [
    new TableRow({ children: ["", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY"].map((item) => new TableCell({ borders: { top:border,bottom:border,left:border,right:border }, shading: { fill: item ? "DDE8F8" : "FFFFFF" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item, bold: true, size: 16 })] })] })) }),
    ...rows(plan).map((row) => new TableRow({
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
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Republic of the Philippines", size: 18 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "DEPARTMENT OF EDUCATION", bold: true, size: 20 })] }),
    ...[plan.profile.region, plan.profile.division, plan.profile.district, plan.profile.school, plan.profile.location].map((line) => new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: line, size: 17 })] })),
    new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { before: 100, after: 120 }, children: [new TextRun({ text: "LESSON PLAN", bold: true, size: 24 })] }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: [1850, 1900, 1900, 1900, 1900], rows: tableRows }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: [4750, 4750], rows: [new TableRow({ children: [
      new TableCell({ borders: { top:noBorder,bottom:noBorder,left:noBorder,right:noBorder }, children: [
        new Paragraph({ spacing: { before: 240 }, children: [new TextRun({ text: "Prepared by:", size: 18 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 360 }, children: [new TextRun({ text: plan.profile.teacherName, bold: true, size: 19 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: plan.profile.position, size: 18 })] }),
      ] }),
      new TableCell({ borders: { top:noBorder,bottom:noBorder,left:noBorder,right:noBorder }, children: [
        new Paragraph({ spacing: { before: 240 }, children: [new TextRun({ text: "Checked and Reviewed by:", size: 18 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 360 }, children: [new TextRun({ text: plan.profile.schoolHead, bold: true, size: 19 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: plan.profile.schoolHeadPosition, size: 18 })] }),
      ] }),
    ] })] }),
  ] }] });
  const blob = await Packer.toBlob(doc);
  download(blob, `${safe(plan.title)}-ILAW.docx`);
}

export async function exportPdf(plan: LessonPlan) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const logoData = await imageDataUrl("/deped-seal.png");
  pdf.addImage(logoData, "PNG", 394, 12, 54, 54);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
  pdf.text("Republic of the Philippines", 421, 76, { align: "center" });
  pdf.setFont("helvetica", "bold"); pdf.text("DEPARTMENT OF EDUCATION", 421, 89, { align: "center" });
  pdf.setFont("helvetica", "normal"); pdf.text(`${plan.profile.region} | ${plan.profile.division} | ${plan.profile.district}`, 421, 102, { align: "center" });
  pdf.text(`${plan.profile.school} - ${plan.profile.location}`, 421, 115, { align: "center" });
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(12); pdf.text("LESSON PLAN", 421, 132, { align: "center" });
  autoTable(pdf, { startY: 142, head: [["", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY"]], body: rows(plan), theme: "grid", styles: { fontSize: 5.6, cellPadding: 2.4, valign: "top", lineColor: [100,116,139], lineWidth: .3 }, headStyles: { fillColor: [23,63,138], textColor: 255, halign: "center" }, columnStyles: { 0: { fillColor: [238,243,249], fontStyle: "bold", cellWidth: 106 } }, margin: { left: 16, right: 16 } });
  const finalTableY = (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 460;
  let signatureY = finalTableY + 24;
  if (signatureY > 515) { pdf.addPage("a4", "landscape"); signatureY = 36; }
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
  pdf.text("Prepared by:", 58, signatureY);
  pdf.text("Checked and Reviewed by:", 477, signatureY);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(10);
  pdf.text(plan.profile.teacherName, 175, signatureY + 40, { align: "center" });
  pdf.text(plan.profile.schoolHead, 665, signatureY + 40, { align: "center" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
  pdf.text(plan.profile.position, 175, signatureY + 54, { align: "center" });
  pdf.text(plan.profile.schoolHeadPosition, 665, signatureY + 54, { align: "center" });
  pdf.save(`${safe(plan.title)}-ILAW.pdf`);
}

function safe(value: string) { return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""); }
function download(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 500); }
async function imageDataUrl(url: string) { const blob = await fetch(url).then((response) => response.blob()); return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); }); }
