import { GradeLevel, LearningArea, TeacherProfile } from "@/types/lesson-plan";

export type AssessmentTerm = 1 | 2 | 3;
export type BloomLevel = "Remembering" | "Understanding" | "Applying" | "Analyzing" | "Evaluating" | "Creating";
export type AnswerChoice = "A" | "B" | "C" | "D";
export type TOSFormat = "standard" | "item-placement";

export const bloomLevels: BloomLevel[] = ["Remembering", "Understanding", "Applying", "Analyzing", "Evaluating", "Creating"];

export type AssessmentCompetency = {
  id: string;
  text: string;
  source: "official" | "manual";
};

export type TOSRow = {
  competencyId: string;
  competency: string;
  teachingDays: number;
  percentage: number;
  distribution: Record<BloomLevel, number>;
  totalItems: number;
  itemNumbers: number[];
};

export type AssessmentQuestion = {
  id: string;
  number: number;
  question: string;
  choices: Record<AnswerChoice, string>;
  correctAnswer: AnswerChoice;
  competencyId: string;
  competency: string;
  bloomLevel: BloomLevel;
  revision: number;
};

export type Assessment = {
  id: string;
  title: string;
  grade: GradeLevel;
  subject: LearningArea;
  term: AssessmentTerm;
  week?: number;
  testType: "Summative Test";
  totalItems: number;
  competencies: AssessmentCompetency[];
  tosMode: "automatic" | "manual";
  tosFormat?: TOSFormat;
  schoolYear?: string;
  sessionMinutes?: number;
  profile?: TeacherProfile;
  tos: TOSRow[];
  questions: AssessmentQuestion[];
  createdAt: string;
  updatedAt: string;
};

export type AssessmentSeed = Partial<Pick<Assessment, "grade" | "subject" | "term" | "week" | "title">> & {
  competencyTexts?: string[];
};
