import { LessonPlan } from "@/types/lesson-plan";
import { WeeklySlide } from "@/types/powerpoint";
export const teacherPositions = ["Teacher I", "Teacher II", "Teacher III", "Teacher IV", "Teacher V", "Teacher VI", "Teacher VII", "Master Teacher I", "Master Teacher II", "Master Teacher III"] as const;
export type TeacherPosition = typeof teacherPositions[number];
export type CotIndicator = {
    id: string;
    schoolYear: string;
    position: TeacherPosition;
    careerStage: string;
    code: string;
    wording: string;
    domain: string;
    strand: string;
    observationType: "PMES" | "COT-RSP";
    cycles: ("1st" | "2nd")[];
    source: string;
    sourceUrl: string;
    sourcePage: string;
    version: string;
    active: boolean;
    verified: boolean;
    verifiedAt: string;
};
export type IndicatorLibrary = {
    revision: string;
    indicators: CotIndicator[];
};
export type CotQuestion = {
    question: string;
    responses: string[];
    followUp: string;
};
export type CotActivity = {
    id: string;
    session: number;
    phase: string;
    minutes: number;
    title: string;
    teacherActivity: string;
    learnerActivity: string;
    objectiveIndices: number[];
    resources: string[];
    questions: CotQuestion[];
    slideBullets: string[];
    worksheet?: { instructions:string; tasks:string[]; teacherKey:string[]; teacherNotes?:string[] } | null;
    differentiation: {
        support: string;
        core: string;
        extension: string;
    };
    formative: {
        task: string;
        objectiveIndices: number[];
        indicatorIds: string[];
        expectedEvidence: string;
    };
};
export type CotAlignment = {
    indicatorId: string;
    coverage: "clear" | "partial" | "none";
    teacherReviewed: boolean;
    evidence: {
        activityId: string;
        teacherQuote: string;
        learnerQuote: string;
        annotation: string;
        observableEvidence: string;
    }[];
    reason: string;
    suggestion: {
        activityId: string;
        teacherActivity: string;
        learnerActivity: string;
        reason: string;
    } | null;
};
export type CotWorksheet = {
    id: string;
    activityId: string;
    title: string;
    instructions: string;
    tasks: string[];
    teacherKey: string[];
    teacherNotes?: string[];
};
export type CotAssessmentItem = {
    id: string;
    activityId: string;
    objectiveIndices: number[];
    indicatorIds: string[];
    question: string;
    choices: Record<"A" | "B" | "C" | "D", string> | null;
    answer: string;
    expectedEvidence: string;
    rubric: {
        criterion: string;
        points: number;
    }[];
};
export type CotLesson = {
    id: string;
    title: string;
    sourcePlan: LessonPlan;
    schoolYear: string;
    position: TeacherPosition;
    teacherName: string;
    observer: string;
    observationDate: string;
    observationTime: string;
    duration: number;
    selectedSessions: number[];
    cycle: "1st" | "2nd" | "Planning";
    section: string;
    indicators: CotIndicator[];
    objectives: string[];
    learnerContext: string;
    preLesson: string;
    resources: string[];
    integration: string;
    extendedLearning: string;
    reflection: string;
    activities: CotActivity[];
    alignments: CotAlignment[];
    worksheets: CotWorksheet[];
    assessmentKind: "multiple-choice" | "identification" | "exit-ticket" | "performance-task";
    assessment: CotAssessmentItem[];
    slides: WeeklySlide[];
    showAnnotations: boolean;
    materialFingerprint: string;
    generationFingerprint: string;
    status: "Draft" | "Ready for Observation" | "Completed";
    teacherReviewed: boolean;
    createdAt: string;
    updatedAt: string;
};
