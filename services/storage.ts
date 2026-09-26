import { LessonPlan, TeacherProfile, defaultProfile } from "@/types/lesson-plan";

const PLANS_KEY = "ilaw.lessonPlans.v1";
const PROFILE_KEY = "ilaw.profile.v1";

export function loadPlans(): LessonPlan[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(PLANS_KEY) || "[]") as LessonPlan[]; } catch { return []; }
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
