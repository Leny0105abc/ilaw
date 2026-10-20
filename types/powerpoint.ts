import { GradeLevel, LearningArea, LessonPlan, Term } from "@/types/lesson-plan";

export type SlideKind = "title" | "competency" | "objectives" | "divider" | "review" | "motivation" | "content" | "application" | "activity" | "quiz" | "summary" | "answer-key";
export type QuizItem = { number: number; question: string; choices: Record<"A" | "B" | "C" | "D", string>; correctAnswer: "A" | "B" | "C" | "D"; rationale: string };
export type WeeklySlide = {
  id: string; kind: SlideKind; day: number; title: string; bullets: string[];
  visual: string; table: { headers: string[]; rows: string[][] } | null;
  notes: string; questions: QuizItem[];
};
export type WeeklyPowerPoint = {
  id: string; grade: GradeLevel; subject: LearningArea; term: Term; week: number;
  title: string; competencies: { id: string; text: string; source?: string }[];
  slideCount: 15 | 20 | 25 | 30; organization: "weekly" | "four-day";
  sourcePlanId?: string; sourceLesson: Pick<LessonPlan, "topic" | "references" | "sessions" | "availableResources" | "learnerNotes"> | null;
  sourceNotes: string; slides: WeeklySlide[]; createdAt: string; updatedAt: string;
};
export type SlideSlot = { number: number; kind: SlideKind; day: number; focus: string; quizNumbers: number[]; fixedText?: string[] };
