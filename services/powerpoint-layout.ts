import { SlideScenario } from "@/types/powerpoint";

// Shared by the PPTX export and the on-screen preview so the reviewed slide matches the file.
// Sizes are in inches on the 13.33 x 7.5 in wide layout; text estimates use Arial's average
// character width (about 0.52em, slightly generous so long text never overflows).
export const SITUATION_LAYOUT = { storyWidth: 7.35, storyHeight: 4.9, storyHeightWithVisual: 3.95, storyMarginPt: 18, guideWidth: 4.4, guideHeight: 4.9, guideMarginPt: 16, numberIndent: .4, settingPt: 15, headerPt: 18 } as const;

function lineCount(text: string, charsPerLine: number) {
  let lines = 1, length = 0;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (length && length + 1 + word.length > charsPerLine) { lines++; length = word.length; }
    else length += (length ? 1 : 0) + word.length;
  }
  return lines;
}
const charsPerLine = (widthIn: number, pt: number, em = .52) => Math.max(8, Math.floor(widthIn / (pt * em / 72)));

// Largest font size (pt) at which the paragraphs fit the box.
export function fitFontSize(paragraphs: string[], widthIn: number, heightIn: number, maxPt: number, minPt: number, lineSpacing = 1, gapPt = 0) {
  for (let pt = maxPt; pt > minPt; pt--) {
    const lines = paragraphs.reduce((sum, text) => sum + lineCount(text, charsPerLine(widthIn, pt)), 0);
    if (lines * pt * 1.2 * lineSpacing / 72 + Math.max(paragraphs.length - 1, 0) * gapPt / 72 <= heightIn) return pt;
  }
  return minPt;
}

export function situationFontSizes(scenario: SlideScenario, hasVisual: boolean) {
  const L = SITUATION_LAYOUT;
  const storyInner = L.storyWidth - 2 * L.storyMarginPt / 72;
  const settingLines = lineCount(`Setting: ${scenario.setting}`, charsPerLine(storyInner, L.settingPt, .56));
  const storyRoom = (hasVisual ? L.storyHeightWithVisual : L.storyHeight) - 2 * L.storyMarginPt / 72 - settingLines * L.settingPt * 1.2 / 72 - 8 / 72;
  const guideInner = L.guideWidth - 2 * L.guideMarginPt / 72 - L.numberIndent;
  const guideRoom = L.guideHeight - 2 * L.guideMarginPt / 72 - L.headerPt * 1.2 / 72 - 10 / 72;
  return {
    setting: L.settingPt,
    story: fitFontSize([scenario.story], storyInner, storyRoom, 19, 12, 1.1),
    questions: fitFontSize(scenario.questions.filter(item => item.trim()), guideInner, guideRoom, 16, 11, 1, 10),
  };
}
// 1pt on a 13.33in-wide slide, in container-query width units.
export const ptToCqw = (pt: number) => `${(pt / 72) * (100 / 13.333)}cqw`;
