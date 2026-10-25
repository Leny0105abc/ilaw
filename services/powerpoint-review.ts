import { WeeklyPowerPoint } from "@/types/powerpoint";
import { assertPowerPointReady, quizItems } from "@/services/powerpoint-generator";

export type ReviewStatus = "pass" | "warn" | "fail";
export type ReviewCheck = { id: string; status: ReviewStatus; label: string; detail: string; slideIndex?: number };

const lessonKinds = new Set(["objectives", "review", "motivation", "content", "application", "situation", "activity", "summary"]);
function slideList(indexes: number[]) { return indexes.map(index => index + 1).join(", "); }

export function powerPointChecks(p: WeeklyPowerPoint): ReviewCheck[] {
  const checks: ReviewCheck[] = [];
  try {
    assertPowerPointReady(p);
    checks.push({ id: "structure", status: "pass", label: "Slide layout and official competency", detail: `${p.slides.length} slides fit the layout rules. The official competency wording is unchanged.` });
  } catch (problem) {
    const detail = problem instanceof Error ? problem.message : "Fix the slide content before approving.";
    // The real-life situation check below already explains situation problems.
    checks.push({ id: "structure", status: "fail", label: "Slide layout and official competency", detail: detail.includes("(real-life situation)") ? "Finish the real-life situation slide (see below)." : detail });
  }
  const situations = p.slides.map((slide, index) => ({ slide, index })).filter(({ slide }) => slide.kind === "situation");
  const complete = situations.filter(({ slide }) => slide.scenario && slide.scenario.story.trim().length >= 40 && slide.scenario.questions.filter(item => item.trim()).length >= 2);
  if (!situations.length) checks.push({ id: "situation", status: "fail", label: "Real-life situation", detail: "Add a real-life situation slide so learners apply the lesson to everyday life." });
  else if (complete.length < situations.length) checks.push({ id: "situation", status: "fail", label: "Real-life situation", detail: `Complete the story and guide questions on slide ${slideList(situations.filter(item => !complete.includes(item)).map(item => item.index))}.`, slideIndex: situations.find(item => !complete.includes(item))!.index });
  else checks.push({ id: "situation", status: "pass", label: "Real-life situation", detail: `${complete.length === 1 ? "Slide" : "Slides"} ${slideList(complete.map(item => item.index))}: ${complete.map(item => item.slide.scenario!.setting).join("; ")}.`, slideIndex: complete[0].index });
  const items = quizItems(p);
  const quizIndex = p.slides.findIndex(slide => slide.kind === "quiz");
  if (items.length === 5) checks.push({ id: "quiz", status: "pass", label: "Quiz and answer key", detail: `Answer key: ${items.map(item => `${item.number}-${item.correctAnswer}`).join(", ")}. Check that each answer is correct.`, slideIndex: quizIndex >= 0 ? quizIndex : undefined });
  else checks.push({ id: "quiz", status: "fail", label: "Quiz and answer key", detail: `The quiz has ${items.length} of 5 questions.`, slideIndex: quizIndex >= 0 ? quizIndex : undefined });
  const visuals = p.slides.map((slide, index) => ({ slide, index })).filter(({ slide }) => slide.visual.trim()).map(({ index }) => index);
  checks.push(visuals.length
    ? { id: "visuals", status: "warn", label: "Picture placeholders", detail: `Slide ${slideList(visuals)} ${visuals.length === 1 ? "has a placeholder" : "have placeholders"} for a picture. Replace ${visuals.length === 1 ? "it" : "them"} in PowerPoint after downloading.`, slideIndex: visuals[0] }
    : { id: "visuals", status: "pass", label: "Picture placeholders", detail: "No picture placeholders to replace." });
  const noNotes = p.slides.map((slide, index) => ({ slide, index })).filter(({ slide }) => lessonKinds.has(slide.kind) && !slide.notes.trim()).map(({ index }) => index);
  checks.push(noNotes.length
    ? { id: "notes", status: "warn", label: "Speaker notes", detail: `Slide ${slideList(noNotes)} ${noNotes.length === 1 ? "has" : "have"} no speaker notes.`, slideIndex: noNotes[0] }
    : { id: "notes", status: "pass", label: "Speaker notes", detail: "Every lesson slide has speaker notes." });
  return checks;
}

// Downloads and printing are blocked only by real problems (a failed automatic check),
// such as a missing real-life situation. Warnings never block.
export function assertPowerPointExportable(p: WeeklyPowerPoint) {
  const failed = powerPointChecks(p).filter(check => check.status === "fail");
  if (failed.length) throw new Error(failed.map(check => check.detail).join("\n"));
}

// A blank situation the teacher (or "Regenerate slide") fills in.
export function blankSituationSlide(day: number) {
  return { id: crypto.randomUUID(), kind: "situation" as const, day, title: "Real-Life Situation", bullets: [], visual: "", table: null, notes: "", questions: [], scenario: { setting: "", story: "", questions: ["", ""] } };
}
