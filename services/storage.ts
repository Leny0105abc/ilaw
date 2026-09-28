import { LessonPlan, LessonFlowStep, TeacherProfile, defaultProfile } from "@/types/lesson-plan";
import { cleanLearningObjective, defaultLearningResources } from "@/services/generator";

const PLANS_KEY = "ilaw.lessonPlans.v1";
const PROFILE_KEY = "ilaw.profile.v1";

export function loadPlans(): LessonPlan[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(localStorage.getItem(PLANS_KEY) || "[]") as Array<LessonPlan & { flowFormat?: LessonPlan["flowFormat"]; sessions: Array<LessonPlan["sessions"][number] & { flow: LessonPlan["sessions"][number]["flow"] & { iDo?: string; weDo?: string; youDo?: string; synthesis?: string } }> }>;
    let changed = false;
    const plans = stored.map((plan) => {
      const hasLegacyBeautyResources = plan.sessions.some((session) => session.resources.some((resource) => /available beauty care tools/i.test(resource)));
      let planChanged = hasLegacyBeautyResources || !plan.flowFormat;
      const sessions = plan.sessions.map((session, index) => {
        const objectives = session.objectives.map(cleanLearningObjective);
        const objectivesChanged = objectives.some((objective, objectiveIndex) => objective !== session.objectives[objectiveIndex]);
        if (objectivesChanged) planChanged = true;
        const legacyFlow = session.flow as typeof session.flow & { iDo?: string; weDo?: string; youDo?: string; synthesis?: string };
        const steps: LessonFlowStep[] = Array.isArray(session.flow.steps) ? session.flow.steps : [
          { label: "Modeling", content: legacyFlow.iDo || "" },
          { label: "Guided Practice", content: legacyFlow.weDo || "" },
          { label: "Independent Practice", content: legacyFlow.youDo || "" },
          { label: "Synthesis", content: legacyFlow.synthesis || "" },
        ];
        if (!Array.isArray(session.flow.steps)) planChanged = true;
        return {
          ...session,
          objectives,
          flow: { steps },
          resources: hasLegacyBeautyResources ? defaultLearningResources(plan.area, index) : session.resources,
        };
      });
      if (!planChanged) return plan;
      changed = true;
      return {
        ...plan,
        availableResources: hasLegacyBeautyResources ? "" : plan.availableResources,
        sessions,
        flowFormat: plan.flowFormat || "gradual-release",
      };
    });
    if (changed) savePlans(plans);
    return plans;
  } catch { return []; }
}

export function savePlans(plans: LessonPlan[]) {
  localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
}

export function loadProfile(): TeacherProfile {
  if (typeof window === "undefined") return defaultProfile;
  try { return { ...defaultProfile, ...JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}") }; } catch { return defaultProfile; }
}

export function saveProfile(profile: TeacherProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
