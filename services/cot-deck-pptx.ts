import type { CotLesson } from "@/types/cot";
import type { CotSlideLayout, QuizItem, WeeklySlide } from "@/types/powerpoint";
import { learningAreaLabel } from "@/data/curriculum";
import { fitFontSize, textHeight } from "@/services/powerpoint-layout";
import { quizChoiceLines } from "@/services/cot-deck";

// Designed COT classroom deck (13.33 x 7.5 in): dark navy background with blue/orange accent
// lines, blue title banners, white rounded panels and orange display headings.
const C = { bg: "0B1A33", lineBlue: "2D7DD2", orange: "F7931E", gold: "FFB547", banner: "1F4E9A", panel: "FFFFFF", ink: "1B2A41", blue: "1F5FBF", callout: "E3F4E6", calloutLine: "8BC79A", note: "FFF4CC", soft: "E8F1FC", lavender: "E4DDF7", muted: "8FA6C8", white: "FFFFFF" };
const W = 13.333;
type Pptx = InstanceType<typeof import("pptxgenjs").default>;
type Slide = ReturnType<Pptx["addSlide"]>;
type Run = { text: string; options?: Record<string, unknown> };

// Largest size (pt) at which the text fits the box. em ~ average character width of the font.
function fit(texts: string[], widthIn: number, heightIn: number, max: number, min: number, em = 1, gapPt = 6) {
  const scaled = widthIn / em; // fitFontSize assumes Arial-like widths; em > 1 means a wider font
  return fitFontSize(texts.filter(Boolean), scaled, heightIn, max, min, 1.15, gapPt);
}

function decorate(pptx: Pptx, slide: Slide, strong = false) {
  const line = (x: number, y: number, w: number, h: number, color: string, width: number, transparency: number, flipH = false) => slide.addShape(pptx.ShapeType.line, { x, y, w, h, flipH, line: { color, width, transparency } });
  for (let i = 0; i < (strong ? 6 : 3); i++) line(W - 3.6 + i * .35, 0, 2.6, 1.6 + i * .25, C.lineBlue, 1.25, 55);
  for (let i = 0; i < (strong ? 5 : 3); i++) line(0, 6.1 - i * .3, 2.8 + i * .4, 1.4 + i * .3, C.orange, 1.5, 45, true);
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 7.38, w: W, h: .12, fill: { color: C.orange, transparency: 30 }, line: { color: C.orange, transparency: 100 } });
}
function banner(pptx: Pptx, slide: Slide, title: string) {
  slide.addShape(pptx.ShapeType.rect, { x: .45, y: .3, w: W - .9, h: .85, fill: { color: C.banner }, line: { color: C.banner } });
  slide.addShape(pptx.ShapeType.rect, { x: .45, y: 1.15, w: W - .9, h: .07, fill: { color: C.orange }, line: { color: C.orange } });
  slide.addText(title, { x: .65, y: .3, w: W - 1.3, h: .85, fontFace: "Arial", bold: true, color: C.white, fontSize: fit([title], W - 1.3, .8, 28, 16), valign: "middle", margin: 0 });
}
function panel(pptx: Pptx, slide: Slide, x: number, y: number, w: number, h: number, fill = C.panel, lineColor?: string) {
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: .14, fill: { color: fill }, line: lineColor ? { color: lineColor, width: 1.5 } : { color: fill }, shadow: { type: "outer", blur: 6, offset: 2, angle: 90, color: "000000", opacity: .25 } });
}
// Numbered or bulleted list; optionally bold the first word (objectives) or the part before " – " (terms).
type ListOptions = { numbered?: boolean; bullet?: boolean; boldFirstWord?: boolean; termStyle?: boolean; max?: number; min?: number; font?: string; color?: string; align?: "left" | "center"; size?: number };
const listIndent = (options: ListOptions) => options.numbered || options.bullet ? .45 : 0;
function list(slide: Slide, items: string[], box: { x: number; y: number; w: number; h: number }, options: ListOptions = {}) {
  if (!items.length) return;
  const indent = listIndent(options);
  const size = options.size ?? fit(items, box.w - .3 - indent, box.h - .2, options.max ?? 26, options.min ?? 12, 1, 8);
  const paragraph = options.numbered ? { bullet: { type: "number" as const } } : options.bullet ? { bullet: true } : {};
  const runs: Run[] = items.flatMap((item, index) => {
    const end = { breakLine: index < items.length - 1 };
    if (options.termStyle && item.includes(" – ")) { const [term, ...rest] = item.split(" – "); return [{ text: term, options: { ...paragraph, bold: true, color: C.blue } }, { text: ` – ${rest.join(" – ")}`, options: end }]; }
    if (options.boldFirstWord) { const [first, ...rest] = item.split(" "); return [{ text: first + (rest.length ? " " : ""), options: { ...paragraph, bold: true } }, { text: rest.join(" "), options: end }]; }
    return [{ text: item, options: { ...paragraph, ...end } }];
  });
  slide.addText(runs, { ...box, margin: 12, fontFace: options.font ?? "Calibri", fontSize: size, color: options.color ?? C.ink, valign: "top", align: options.align ?? "left", paraSpaceAfter: Math.round(size * .45) });
}
// White panel that grows with its list (like the reference deck) instead of a mostly empty box.
function panelList(pptx: Pptx, slide: Slide, items: string[], area: { x: number; y: number; w: number; h: number }, options: ListOptions = {}, minHeight = 2.2) {
  if (!items.length) { panel(pptx, slide, area.x, area.y, area.w, minHeight); return; }
  const width = area.w - .7 - listIndent(options);
  const size = fit(items, width, area.h - .5, options.max ?? 30, options.min ?? 12, 1, 8);
  const height = Math.min(area.h, Math.max(minHeight, textHeight(items, width, size, 1.15, size * .45) + .65));
  panel(pptx, slide, area.x, area.y, area.w, height);
  list(slide, items, { x: area.x + .2, y: area.y + .1, w: area.w - .4, h: height - .2 }, { ...options, size });
}
function callout(slide: Slide, pptx: Pptx, text: string, box: { x: number; y: number; w: number; h: number }, fill = C.callout, lineColor = C.calloutLine) {
  panel(pptx, slide, box.x, box.y, box.w, box.h, fill, lineColor);
  slide.addText(text, { ...box, margin: 14, fontFace: "Georgia", fontSize: fit([text], box.w - .3, box.h - .3, 30, 14, 1.08), color: C.ink, align: "center", valign: "middle" });
}

function quizParagraphs(questions: QuizItem[]) {
  return questions.flatMap(q => [{ text: `${q.number}. ${q.question}`, bold: true }, ...quizChoiceLines(q).map(text => ({ text, bold: false }))]);
}

function render(pptx: Pptx, p: CotLesson, item: WeeklySlide, index: number, total: number) {
  const slide = pptx.addSlide();
  slide.background = { color: C.bg };
  const layout: CotSlideLayout = item.cotLayout ?? (item.kind === "title" ? "title" : item.questions.length ? "quiz" : "activity");
  decorate(pptx, slide, layout === "title" || layout === "thanks" || layout === "game");
  const b = item.bullets;
  switch (layout) {
    case "title": {
      const subject = b[0] || learningAreaLabel(p.sourcePlan.grade, p.sourcePlan.area);
      slide.addText(subject, { x: .8, y: .9, w: 9.4, h: .6, fontFace: "Arial", bold: true, color: C.gold, fontSize: fit([subject], 9.4, .55, 24, 14), margin: 0 });
      slide.addText(item.title, { x: .8, y: 1.6, w: 9.6, h: 2.9, fontFace: "Arial Black", color: C.orange, fontSize: fit([item.title], 9.6, 2.8, 50, 26, 1.22), valign: "top", margin: 0 });
      const people = b.slice(1);
      if (people.length) slide.addText(people.map((text, n) => ({ text, options: { bold: n === 0, color: n === 0 ? C.gold : C.white, fontSize: n === 0 ? 22 : 17, breakLine: n < people.length - 1 } })), { x: .8, y: 4.75, w: 8, h: 1.7, fontFace: "Arial", valign: "top", margin: 0 });
      break;
    }
    case "prayer": {
      banner(pptx, slide, item.title);
      panel(pptx, slide, 1.3, 1.55, W - 2.6, 5.45);
      const amen = b.length > 1 && /^(amen|amen\.)$/i.test(b[b.length - 1].trim());
      const body = amen ? b.slice(0, -1) : b;
      const size = fit([...body, "Amen."], W - 3.2, 4.9, 26, 14, 1.05, 10);
      slide.addText([...body.map(text => ({ text, options: { breakLine: true } })), ...(amen ? [{ text: b[b.length - 1], options: { bold: true } }] : [])], { x: 1.6, y: 1.7, w: W - 3.2, h: 5.15, fontFace: "Georgia", fontSize: size, color: C.ink, align: "center", valign: "middle", paraSpaceAfter: 8, margin: 10 });
      break;
    }
    case "rules": {
      banner(pptx, slide, item.title);
      const rows = Math.max(b.length, 1), step = Math.min(1.08, 5.6 / rows), height = step - .2;
      const size = Math.min(...b.map(rule => fit([rule], 9.0, height - .1, 28, 14)));
      b.forEach((rule, n) => {
        const y = 1.55 + n * step;
        slide.addShape(pptx.ShapeType.roundRect, { x: 1.9, y, w: 9.9, h: height, rectRadius: .2, fill: { color: C.lavender }, line: { color: C.lavender } });
        slide.addShape(pptx.ShapeType.ellipse, { x: 1.45, y: y - .06, w: height + .12, h: height + .12, fill: { color: C.orange }, line: { color: C.white, width: 2 } });
        slide.addText(String(n + 1), { x: 1.45, y: y - .06, w: height + .12, h: height + .12, fontFace: "Arial Black", fontSize: Math.min(24, size + 2), color: C.white, align: "center", valign: "middle", margin: 0 });
        slide.addText(rule, { x: 2.55 + height * .2, y, w: 9.1, h: height, fontFace: "Calibri", bold: true, fontSize: size, color: C.ink, valign: "middle", margin: 0 });
      });
      break;
    }
    case "objectives": {
      slide.addText(`${item.title.toUpperCase()}:`, { x: .6, y: .35, w: 10, h: .8, fontFace: "Arial Black", fontSize: 32, color: C.orange, margin: 0 });
      panelList(pptx, slide, b, { x: .6, y: 1.3, w: W - 1.2, h: 5.75 }, { numbered: true, boldFirstWord: true, max: 32 });
      break;
    }
    case "game": {
      slide.addText(item.title.toUpperCase(), { x: .8, y: 1.0, w: W - 1.6, h: 1.5, fontFace: "Arial Black", fontSize: fit([item.title], W - 1.6, 1.4, 60, 32, 1.25), color: C.orange, align: "center", valign: "middle", margin: 0 });
      panel(pptx, slide, 2.6, 3.0, W - 5.2, 2.9);
      slide.addText([{ text: b[0] ?? "", options: { bold: true, color: C.blue, fontSize: 34, breakLine: true } }, { text: b[1] ?? "", options: { color: C.ink, fontSize: 20 } }], { x: 2.8, y: 3.1, w: W - 5.6, h: 2.7, fontFace: "Arial", align: "center", valign: "middle", paraSpaceAfter: 10, margin: 10 });
      break;
    }
    case "puzzle": {
      banner(pptx, slide, item.title);
      panel(pptx, slide, 1.4, 1.9, W - 2.8, 3.5, C.panel, C.orange);
      const word = b[0] ?? "";
      slide.addText(word, { x: 1.6, y: 2.0, w: W - 3.2, h: 3.3, fontFace: "Arial Black", fontSize: Math.max(28, Math.min(88, Math.floor(((W - 3.6) * 72) / (Math.max(word.length, 3) * .95)))), charSpacing: 6, color: C.ink, align: "center", valign: "middle", margin: 0 });
      slide.addText(`${word.replace(/[^\p{L}_]/gu, "").length} letters`, { x: 1.4, y: 5.65, w: W - 2.8, h: .5, fontFace: "Arial", fontSize: 18, color: C.muted, align: "center", margin: 0 });
      break;
    }
    case "term": {
      panel(pptx, slide, 1.3, 1.1, W - 2.6, 2.8, C.panel, C.orange);
      slide.addText(item.title, { x: 1.5, y: 1.2, w: W - 3, h: 2.6, fontFace: "Arial Black", fontSize: Math.max(28, Math.min(72, Math.floor(((W - 3.4) * 72) / (Math.max(item.title.length, 3) * .85)))), color: C.ink, align: "center", valign: "middle", margin: 0 });
      callout(slide, pptx, b[0] ? `– ${b[0]}` : "", { x: 1.3, y: 4.3, w: W - 2.6, h: 2.3 }, C.soft, C.lineBlue);
      break;
    }
    case "terms": {
      slide.addText(item.title.toUpperCase(), { x: .6, y: .35, w: W - 1.2, h: .8, fontFace: "Arial Black", fontSize: fit([item.title], W - 1.2, .75, 32, 20, 1.25), color: C.orange, margin: 0 });
      panelList(pptx, slide, b, { x: .6, y: 1.3, w: W - 1.2, h: 5.75 }, { bullet: true, termStyle: true, max: 28, font: "Georgia" });
      break;
    }
    case "group": {
      // Card grows with its tasks (at least half the slide), like the reference group cards.
      const taskWidth = W - 3.1, taskSize = fit(b, taskWidth, 4.4, 28, 12, 1, 8);
      const tasksHeight = b.length ? textHeight(b, taskWidth, taskSize, 1.15, taskSize * .45) + .5 : 0;
      panel(pptx, slide, .7, .5, W - 1.4, Math.min(6.55, Math.max(3.6, 1.9 + tasksHeight)));
      const [label, name] = item.title.includes(" – ") ? [item.title.split(" – ")[0] + " – ", item.title.split(" – ").slice(1).join(" – ")] : [item.title, ""];
      slide.addText([{ text: label, options: { color: C.ink } }, { text: name, options: { color: C.blue } }], { x: 1.0, y: .7, w: W - 2, h: .8, fontFace: "Arial", bold: true, fontSize: fit([item.title], W - 2, .75, 32, 20, 1.1), align: "center", valign: "middle", margin: 0 });
      if (item.callout) slide.addText(`(${item.callout})`, { x: 1.0, y: 1.5, w: W - 2, h: .55, fontFace: "Calibri", fontSize: 18, color: C.ink, align: "center", margin: 0 });
      list(slide, b, { x: 1.2, y: 2.2, w: W - 2.4, h: 4.6 }, { numbered: true, size: taskSize });
      break;
    }
    case "quiz": {
      banner(pptx, slide, item.title);
      panel(pptx, slide, .5, 1.45, W - 1, 5.65);
      const paragraphs = quizParagraphs(item.questions);
      const size = fit(paragraphs.map(x => x.text), W - 1.6, 5.3, 24, 12, 1, 6);
      slide.addText(paragraphs.map((x, n) => ({ text: x.text, options: { bold: x.bold, breakLine: n < paragraphs.length - 1, paraSpaceBefore: x.bold && n ? Math.round(size * .7) : 0, indentLevel: x.bold ? 0 : 1 } })), { x: .7, y: 1.6, w: W - 1.4, h: 5.35, fontFace: "Calibri", fontSize: size, color: C.ink, valign: "top", margin: 10 });
      break;
    }
    case "practice": {
      banner(pptx, slide, item.title);
      if (item.callout) {
        const h = item.callout.length > 150 ? 1.5 : 1.1;
        panel(pptx, slide, .6, 1.45, W - 1.2, h, C.note, C.gold);
        slide.addText(item.callout, { x: .8, y: 1.45, w: W - 1.6, h, fontFace: "Calibri", fontSize: fit([item.callout], W - 1.8, h - .15, 24, 12), color: C.ink, valign: "middle", margin: 8 });
        panelList(pptx, slide, b, { x: .6, y: 1.65 + h, w: W - 1.2, h: 5.4 - h }, { numbered: true, max: 28 });
      } else {
        panelList(pptx, slide, b, { x: .6, y: 1.45, w: W - 1.2, h: 5.6 }, { numbered: true, max: 30 });
      }
      break;
    }
    case "thanks": {
      slide.addText(item.title, { x: 4.2, y: 2.3, w: 8.4, h: 1.8, fontFace: "Arial Black", fontSize: fit([item.title], 8.4, 1.7, 66, 36, 1.25), color: C.orange, align: "right", valign: "middle", margin: 0 });
      if (b.length) slide.addText(b.map((text, n) => ({ text, options: { bold: n === 0, breakLine: n < b.length - 1 } })), { x: 4.2, y: 4.2, w: 8.4, h: 1.2, fontFace: "Arial", fontSize: 18, color: C.white, align: "right", valign: "top", margin: 0 });
      break;
    }
    case "questions": case "assignment": case "annotations": case "activity": default: {
      banner(pptx, slide, item.title);
      const numbered = layout === "questions";
      const max = layout === "annotations" ? 18 : layout === "questions" ? 32 : 30;
      if (item.callout && b.length) {
        panelList(pptx, slide, b, { x: .6, y: 1.5, w: 7.75, h: 5.5 }, { bullet: !numbered, numbered, max }, 3.6);
        callout(slide, pptx, item.callout, { x: 8.65, y: 1.5, w: 4.1, h: 3.6 });
      } else if (item.callout) {
        callout(slide, pptx, item.callout, { x: 1.5, y: 2.0, w: W - 3, h: 3.6 });
      } else {
        panelList(pptx, slide, b, { x: .6, y: 1.5, w: W - 1.2, h: 5.5 }, { bullet: !numbered, numbered, max });
      }
    }
  }
  slide.addText(`${index + 1}`, { x: W - 1.0, y: 7.0, w: .6, h: .3, fontFace: "Arial", fontSize: 11, color: C.muted, align: "right", margin: 0 });
  slide.addNotes([item.notes, `Curriculum source: ${p.sourcePlan.references || "Existing ILAW curriculum"}`].filter(Boolean).join("\n\n"));
  void total;
}

export async function buildCotDeckFile(p: CotLesson) {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; pptx.author = p.teacherName || "ILAW"; pptx.subject = learningAreaLabel(p.sourcePlan.grade, p.sourcePlan.area); pptx.title = p.title;
  pptx.theme = { headFontFace: "Arial", bodyFontFace: "Calibri" };
  p.slides.forEach((item, index) => render(pptx, p, item, index, p.slides.length));
  return pptx;
}
