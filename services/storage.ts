import { LessonPlan, TeacherProfile, defaultProfile } from "@/types/lesson-plan";
import { defaultLearningResources } from "@/services/generator";

const PLANS_KEY = "ilaw.lessonPlans.v1";
const PROFILE_KEY = "ilaw.profile.v1";

export function loadPlans(): LessonPlan[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(localStorage.getItem(PLANS_KEY) || "[]") as LessonPlan[];
    let changed = false;
    const plans = stored.map((plan) => {
      const hasLegacyBeautyResources = plan.sessions.some((session) => session.resources.some((resource) => /available beauty care tools/i.test(resource)));
      if (!hasLegacyBeautyResources) return plan;
      changed = true;
      return {
        ...plan,
        availableResources: "",
        sessions: plan.sessions.map((session, index) => ({ ...session, resources: defaultLearningResources(plan.area, index) })),
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
