import { CotLesson } from "@/types/cot";
const KEY = "ilaw.cotLessons.v1";
export function loadCotLessons(): CotLesson[] {
    if (typeof window === "undefined")
        return [];
    try {
        const value = JSON.parse(localStorage.getItem(KEY) || "[]");
        return Array.isArray(value) ? value.filter(p => p && typeof p.id === "string" && p.sourcePlan && Array.isArray(p.activities) && Array.isArray(p.indicators)) : [];
    }
    catch {
        return [];
    }
}
export function saveCotLessons(lessons: CotLesson[]) { try {
    localStorage.setItem(KEY, JSON.stringify(lessons));
}
catch {
    throw new Error("COT lessons could not be saved. Device storage may be full. Export your work before clearing any site data.");
} }
