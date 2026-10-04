import { Assessment } from "@/types/assessment";

const ASSESSMENTS_KEY = "ilaw.assessments.v1";

export function loadAssessments(): Assessment[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(localStorage.getItem(ASSESSMENTS_KEY) || "[]") as Assessment[];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function saveAssessments(assessments: Assessment[]) {
  localStorage.setItem(ASSESSMENTS_KEY, JSON.stringify(assessments));
}
