export type GradeLevel = 7 | 8 | 9 | 10;
export type Term = 1 | 2 | 3 | "one-term";
export type LearningArea = "Agriculture and Fishery Arts" | "Family and Consumer Science" | "Industrial Arts" | "Information and Communications Technology" | "ICT - Computer Programming" | "ICT - Computer Systems Servicing" | "Good Manners and Right Conduct";

export type Competency = {
  id: string;
  grade: GradeLevel;
  term: Term;
  weeks: number[];
  area: LearningArea;
  text: string;
  source?: string;
  strand?: string;
};

export type LessonSession = {
  session: number;
  day: string;
  objectives: string[];
  learnerContext: string;
  preLesson: string;
  flow: { iDo: string; weDo: string; youDo: string; synthesis: string };
  resources: string[];
  integration: string;
  assessment: string;
  extendedLearning: string;
  reflection: string;
};

export type TeacherProfile = {
  teacherName: string;
  position: string;
  school: string;
  district: string;
  division: string;
  region: string;
  location: string;
  schoolHead: string;
  schoolHeadPosition: string;
};

export type LessonPlan = {
  id: string;
  title: string;
  grade: GradeLevel;
  section: string;
  area: LearningArea;
  term: Term;
  week: number;
  schoolYear: string;
  classDuration: number;
  competencyIds: string[];
  competencyText: string;
  topic: string;
  references: string;
  aiDeclaration: string;
  learnerNotes: string;
  availableResources: string;
  teacherInstructions: string;
  status: "Draft" | "Completed";
  createdAt: string;
  updatedAt: string;
  profile: TeacherProfile;
  sessions: LessonSession[];
};

export const defaultProfile: TeacherProfile = {
  teacherName: "LENY F. SORIANO",
  position: "Teacher III",
  school: "NANCAPIAN NATIONAL HIGH SCHOOL",
  district: "DISTRICT OF MALASIQUI-IIB",
  division: "Schools Division Office I Pangasinan",
  region: "Region I",
  location: "Malasiqui, Pangasinan",
  schoolHead: "MELISSA CAMORONGAN-PINLAC",
  schoolHeadPosition: "Principal III",
};
