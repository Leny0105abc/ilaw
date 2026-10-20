import { WeeklyPowerPoint } from "@/types/powerpoint";

const KEY = "ilaw.powerpoints.v1";
export function loadPowerPoints(): WeeklyPowerPoint[] {
  if (typeof window === "undefined") return [];
  try { const value = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(value) ? value.filter(item => item && typeof item.id === "string" && Array.isArray(item.slides) && Array.isArray(item.competencies)) : []; } catch { return []; }
}
export function savePowerPoints(presentations: WeeklyPowerPoint[]) { localStorage.setItem(KEY, JSON.stringify(presentations)); }
