import { GradeLevel, LearningArea, LessonPlan, Term } from "@/types/lesson-plan";

export type SlideKind = "title" | "competency" | "objectives" | "divider" | "review" | "motivation" | "content" | "application" | "situation" | "activity" | "quiz" | "summary" | "answer-key";
export type QuizItem = { number: number; question: string; choices: Record<"A" | "B" | "C" | "D", string>; correctAnswer: "A" | "B" | "C" | "D"; rationale: string };
// A short, realistic story that lets learners apply the lesson to everyday life.
export type SlideScenario = { setting: string; story: string; questions: string[] };
export type WeeklySlide = {
  id: string; kind: SlideKind; day: number; title: string; bullets: string[];
  visual: string; table: { headers: string[]; rows: string[][] } | null;
  notes: string; questions: QuizItem[];
  scenario?: SlideScenario | null;
  // COT classroom decks only: which designed layout to use, and an optional highlighted question/line.
  cotLayout?: CotSlideLayout;
  callout?: string;
};
export type CotSlideLayout = "title" | "prayer" | "rules" | "objectives" | "activity" | "game" | "puzzle" | "term" | "terms" | "questions" | "practice" | "group" | "quiz" | "assignment" | "annotations" | "thanks";
// Teacher approval of one exact version of the deck. Any later edit changes the fingerprint.
export type PowerPointReview = { fingerprint: string; reviewedAt: string; confirmations: string[] };
export type WeeklyPowerPoint = {
  id: string; grade: GradeLevel; subject: LearningArea; term: Term; week: number;
  title: string; competencies: { id: string; text: string; source?: string }[];
  slideCount: 15 | 20 | 25 | 30; organization: "weekly" | "four-day";
  sourcePlanId?: string; sourceLesson: Pick<LessonPlan, "topic" | "references" | "sessions" | "availableResources" | "learnerNotes"> | null;
  sourceNotes: string; slides: WeeklySlide[]; createdAt: string; updatedAt: string;
  review?: PowerPointReview | null;
};
export type SlideSlot = { number: number; kind: SlideKind; day: number; focus: string; quizNumbers: number[]; fixedText?: string[] };
