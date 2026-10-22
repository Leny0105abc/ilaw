import { competencies } from "@/data/curriculum";
import { generateLessonPlan } from "@/services/generator";
import { Competency, GradeLevel, LearningArea, LessonPlan, TeacherProfile, Term } from "@/types/lesson-plan";
import { LasActivityType } from "@/types/las";
import { generateLas } from "@/services/las-generator";

export type LasGenerationSetup = { sessions: number[]; activityType: LasActivityType | "mixed" } & (
  { mode: "lesson"; lesson: LessonPlan | null } |
  { mode: "curriculum"; grade: GradeLevel; area: LearningArea; term: Term; week: number; selected: Competency[] }
);
export function lasSetupReady(setup: LasGenerationSetup) {
  return setup.sessions.length > 0 && (setup.mode === "lesson" ? !!setup.lesson && setup.sessions.every(n => setup.lesson!.sessions.some(s => s.session === n)) : setup.selected.length > 0);
}
export function lasGenerationKey(setup: LasGenerationSetup) {
  return JSON.stringify({ ...setup, sessions: [...new Set(setup.sessions)].sort((a, b) => a - b),
    ...(setup.mode === "curriculum" ? { selected: [...setup.selected].sort((a, b) => a.id.localeCompare(b.id)) } : {}) });
}
export function generateLasFromSetup(setup: LasGenerationSetup, profile: TeacherProfile) {
  if (!lasSetupReady(setup)) throw new Error("Choose a lesson or competency and at least one session to generate LAS.");
  const plan = setup.mode === "lesson" ? setup.lesson! : createLasSource({ ...setup, profile });
  return generateLas(plan, setup.sessions, setup.activityType, setup.mode === "curriculum" ? setup.selected.map(c => c.text) : undefined);
}

export function lasCompetencies(grade: GradeLevel, area: LearningArea, term: Term, week: number) {
  return competencies.filter(c => c.grade === grade && c.area === area && c.term === term && c.weeks.includes(week));
}

// Reuse ILAW's curriculum and session scaffolds without saving a new lesson plan.
export function createLasSource(input: { grade: GradeLevel; area: LearningArea; term: Term; week: number; selected: Competency[]; profile: TeacherProfile }) {
  const available = lasCompetencies(input.grade, input.area, input.term, input.week);
  if (!input.selected.length || input.selected.some(c => !available.some(a => a.id === c.id && a.text === c.text))) {
    throw new Error("Select at least one competency for this grade, learning area, term, and week.");
  }
  const plan = generateLessonPlan({ ...input, competencies: input.selected, section: "", schoolYear: "2026–2027", duration: 60,
    learnerContext: "", topic: "", sessions: 4, availableResources: "", instructions: "", flowFormat: "ilaw" });
  return { ...plan, id: `las-source-${crypto.randomUUID()}` };
}
