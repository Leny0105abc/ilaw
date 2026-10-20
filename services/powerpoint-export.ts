import { WeeklyPowerPoint } from "@/types/powerpoint";
import { learningAreaLabel, termLabel } from "@/data/curriculum";
import { assertPowerPointReady, displayBullets, quizItems } from "@/services/powerpoint-generator";

export function powerPointFilename(p: WeeklyPowerPoint) {
  return `${learningAreaLabel(p.grade, p.subject).replace(/\s+/g, "_")}_${p.title.replace(/\s*\(Week \d+\)\s*$/i, "")}_(Week ${p.week})`.replace(/[<>:"/\\|?*\x00-\x1f]/g, "").trim().slice(0, 180);
}
export async function buildPowerPointFile(p: WeeklyPowerPoint) {
  assertPowerPointReady(p);
  return buildEditablePowerPointFile(p);
}
// Shared native slide renderer. Each caller validates its own lesson contract first.
export async function buildEditablePowerPointFile(p: WeeklyPowerPoint) {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; pptx.author = "ILAW"; pptx.subject = learningAreaLabel(p.grade, p.subject); pptx.title = p.title;
  pptx.theme = { headFontFace: "Arial", bodyFontFace: "Arial" };
  p.slides.forEach((item, index) => {
    const slide = pptx.addSlide(); const opening = item.kind === "title" || item.kind === "divider";
    slide.background = { color: opening ? "173F7B" : "FFFFFF" };
    const color = opening ? "FFFFFF" : "17233C";
    slide.addText(item.title, { x: .65, y: opening ? 1.65 : .45, w: 12, h: opening ? 2.1 : 1.0, fontFace: "Arial", fontSize: opening ? 42 : 32, bold: true, color, margin: 0, valign: "middle", breakLine: false });
    const bullets = displayBullets(p, item);
    if (item.questions.length) {
      const width = item.questions.length === 3 ? 3.86 : 5.8; const gap = .35; const font = item.questions.length === 3 ? 18 : 20;
      item.questions.forEach((question, column) => {
        const x = .65 + column * (width + gap);
        slide.addText(`${question.number}. ${question.question}`, { x, y: 1.7, w: width, h: 1.9, fontFace: "Arial", fontSize: font + 1, bold: true, color, margin: 0, valign: "top" });
        (['A','B','C','D'] as const).forEach((letter, choice) => slide.addText(`${letter}. ${question.choices[letter]}`, { x: x + .08, y: 3.65 + choice * .81, w: width - .08, h: .79, fontFace: "Arial", fontSize: font, color, margin: 0, valign: "top", fit: "shrink" }));
      });
    } else if (item.table) {
      slide.addTable([item.table.headers.map(text => ({ text, options: { bold: true, color: "FFFFFF", fill: { color: "173F7B" } } })), ...item.table.rows.map(row => row.map(text => ({ text })))], { x: .65, y: 1.8, w: 12, h: 4.7, colW: Array(item.table.headers.length).fill(12 / item.table.headers.length), rowH: .85, fontFace: "Arial", fontSize: 18, margin: 10, color, border: { color: "C6D2E5", pt: 1 }, autoPage: false, valign: "middle" });
    } else {
      const y = opening ? 4.05 : 1.75; const width = item.visual ? 7.4 : 12;
      const height = item.kind === "competency" ? 4.9 : Math.min(opening ? 1.0 : 4.9 / Math.max(bullets.length, 1), 1.3);
      bullets.forEach((text, row) => slide.addText(text, { x: .65, y: y + row * height, w: width, h: height - .08, margin: 0, fontFace: "Arial", fontSize: item.kind === "competency" ? 24 : opening ? 24 : 22, color, valign: "top", ...(item.kind === "competency" || opening || item.kind === "answer-key" ? {} : { bullet: { indent: 18 }, hanging: 4, paraSpaceAfter: 10 }) }));
      if (item.visual) slide.addText(`[${item.visual}]`, { x: 8.55, y: 2.05, w: 4.0, h: 3.7, margin: 15, fontFace: "Arial", fontSize: 20, color: "536581", fill: { color: "F3F6FB" }, line: { color: "CBD7E9", dashType: "dash" }, align: "center", valign: "middle" });
    }
    slide.addText(`${index + 1} / ${p.slides.length}`, { x: 11.95, y: 7.05, w: .7, h: .2, fontSize: 10, fontFace: "Arial", color: opening ? "D7E6FF" : "66748D", align: "right", margin: 0 });
    slide.addNotes([item.notes, item.kind === "answer-key" ? quizItems(p).map(q=>`${q.number}. ${q.correctAnswer}: ${q.rationale}`).join("\n") : "", `Curriculum sources: ${p.competencies.map(c=>c.source || "Existing ILAW curriculum").join("; ")}`, p.sourceLesson?.references || ""].filter(Boolean).join("\n\n"));
  });
  return pptx;
}
export async function buildPowerPointBytes(p: WeeklyPowerPoint): Promise<Uint8Array<ArrayBuffer>> {
  return packEditablePowerPoint(await buildPowerPointFile(p));
}
export async function packEditablePowerPoint(pptx: Awaited<ReturnType<typeof buildEditablePowerPointFile>>): Promise<Uint8Array<ArrayBuffer>> {
  const { default: JSZip } = await import("jszip");
  const archive = await JSZip.loadAsync(await pptx.write({ outputType: "arraybuffer", compression: true }));
  const typesFile = archive.file("[Content_Types].xml");
  if (!typesFile) throw new Error("The PowerPoint package is incomplete. Please try again.");
  // PptxGenJS 4.0.1 declares one master per slide but emits only master1.
  // Remove only these phantom declarations; preserve every real native object.
  const types = (await typesFile.async("string")).replace(/<Override\b[^>]*PartName="\/([^\"]+)"[^>]*\/>/g, (entry, part: string) => {
    if (archive.file(part)) return entry;
    if (/^ppt\/slideMasters\/slideMaster\d+\.xml$/.test(part)) return "";
    throw new Error(`The PowerPoint package is missing ${part}. No file was downloaded.`);
  });
  archive.file("[Content_Types].xml", types);
  return new Uint8Array(await archive.generateAsync({ type: "uint8array", compression: "DEFLATE" }));
}
export async function downloadPowerPoint(p: WeeklyPowerPoint) {
  const bytes = await buildPowerPointBytes(p);
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }));
  const link = document.createElement("a"); link.href = url; link.download = `${powerPointFilename(p)}.pptx`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 30000);
}
function escape(text: string) { return text.replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[character]!)); }
export function powerPointPrintHtml(p: WeeklyPowerPoint) {
  assertPowerPointReady(p);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(powerPointFilename(p))}</title><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:0;color:#17233c}.slide{break-after:page;min-height:175mm;padding:8mm}.slide:last-child{break-after:auto}h1{font-size:28pt;line-height:1.15}li,p{font-size:18pt;line-height:1.35}li{margin:5mm 0}.quiz{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8mm}.quiz p{font-size:14pt;margin:3mm 0}.quiz b{font-size:15pt}.visual{border:1px dashed #8190a8;padding:8mm;font-size:16pt}.content-visual{display:grid;grid-template-columns:2fr 1fr;gap:8mm}table{border-collapse:collapse;width:100%;font-size:17pt}td,th{border:1px solid #c6d2e5;padding:5mm}th{background:#edf3ff}small{color:#536581;font-size:10pt}</style></head><body>${p.slides.map((slide,index)=>`<section class="slide"><small>${escape(learningAreaLabel(p.grade,p.subject))}, ${escape(termLabel(p.term))}, Week ${p.week}, Slide ${index+1}/${p.slides.length}</small><h1>${escape(slide.title)}</h1>${slide.questions.length?`<div class="quiz">${slide.questions.map(item=>`<div><b>${item.number}. ${escape(item.question)}</b>${(['A','B','C','D'] as const).map(letter=>`<p>${letter}. ${escape(item.choices[letter])}</p>`).join('')}</div>`).join('')}</div>`:slide.table?`<table><thead><tr>${slide.table.headers.map(text=>`<th>${escape(text)}</th>`).join('')}</tr></thead><tbody>${slide.table.rows.map(row=>`<tr>${row.map(text=>`<td>${escape(text)}</td>`).join('')}</tr>`).join('')}</tbody></table>`:`<div class="${slide.visual?'content-visual':''}"><ul>${displayBullets(p,slide).map(text=>`<li>${escape(text)}</li>`).join('')}</ul>${slide.visual?`<div class="visual">[${escape(slide.visual)}]</div>`:''}</div>`}</section>`).join('')}</body></html>`;
}
export function printPowerPoint(p: WeeklyPowerPoint) {
  const html = powerPointPrintHtml(p); const popup = window.open("", "_blank");
  if (!popup) throw new Error("Allow pop-ups for ILAW to open the print / Save PDF view.");
  popup.document.open(); popup.document.write(html); popup.document.close(); popup.focus(); popup.print();
}
