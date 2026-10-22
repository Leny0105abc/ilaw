import { LearningActivitySheets } from "@/types/las";
import { validateLas } from "@/services/las-generator";

const KEY = "ilaw.learningActivitySheets.v1";
export function loadLas(): LearningActivitySheets[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value)) throw new Error("Saved LAS data could not be read. Do not clear site data; export your existing work first.");
  for (const item of value) {
    if (!item || item.version !== 1 || typeof item.id !== "string" || !["English", "Filipino"].includes(item.language)) throw new Error("A saved LAS record is invalid. Existing data has not been changed.");
    validateLas(item);
  }
  return value;
}
export function saveLas(sheets: LearningActivitySheets[]) {
  sheets.forEach(validateLas);
  try { localStorage.setItem(KEY, JSON.stringify(sheets)); }
  catch { throw new Error("LAS could not be saved. Device storage may be full. Download your work before clearing any site data."); }
}
