import { LessonPlan } from "@/types/lesson-plan";

export const lasActivityLabels = {
  "multiple-choice": "Multiple choice", matching: "Matching type", essay: "Essay",
  identification: "Identification", "true-false": "True or False", performance: "Performance task",
} as const;
export type LasActivityType = keyof typeof lasActivityLabels;
export type LasTask = { id: string; prompt: string; answer: string; lines: number; type?: LasActivityType; options?: string[]; correctOption?: number; matchingChoices?: string[]; matchingAnswer?: number; truthValue?: boolean };
export type LasSheet = {
  session: number;
  title: string;
  objectives: string[];
  materials: string;
  directions: string;
  reading: string;
  tasks: LasTask[];
  reflection: string;
};
export type LearningActivitySheets = {
  version: 1;
  id: string;
  title: string;
  sourcePlan: LessonPlan;
  selectedSessions: number[];
  language: "English" | "Filipino";
  activityType?: LasActivityType | "mixed";
  minimumMultipleChoiceQuestions?: 10;
  mixedPreset?: "5mc-5match-5tf-5id-2essay" | "session-types-5-v1";
  sheets: LasSheet[];
  teacherReviewed: boolean;
  createdAt: string;
  updatedAt: string;
};
