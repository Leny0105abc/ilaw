import { z } from "zod";
import { CotIndicator, IndicatorLibrary, teacherPositions } from "@/types/cot";
import { readAdminSession } from "@/services/auth";
const exact = z.string().min(1).max(6000);
export const indicatorSchema = z.object({ id: exact, schoolYear: z.string().regex(/^20\d{2}-20\d{2}$/), position: z.enum(teacherPositions), careerStage: exact, code: z.string().regex(/^[1-7]\.[1-9]\.[1-4]$/), wording: exact, domain: exact, strand: exact, observationType: z.enum(["PMES", "COT-RSP"]), cycles: z.array(z.enum(["1st", "2nd"])).min(1), source: exact, sourceUrl: z.url().refine(url => url.startsWith("https://"), "Use an HTTPS source link."), sourcePage: exact, version: exact, active: z.boolean(), verified: z.boolean(), verifiedAt: z.string() });
export function validateIndicators(rows: unknown): CotIndicator[] {
    const entries = z.array(indicatorSchema).max(3000).parse(rows);
    if (new Set(entries.map(row => row.id)).size !== entries.length)
        throw new Error("Duplicate indicator IDs. Keep one version per ID.");
    const active = entries.filter(row => row.active && row.verified);
    const keys = active.flatMap(row => row.cycles.map(cycle => `${row.schoolYear}/${row.position}/${row.observationType}/${cycle}/${row.code}`));
    if (new Set(keys).size !== keys.length)
        throw new Error("Two active versions of the same indicator overlap. Deactivate the older version first.");
    return entries;
}
export function applicableIndicators(rows: CotIndicator[], position: string, year: string, cycle: string) { return rows.filter(row => row.active && row.verified && row.position === position && row.schoolYear === year && row.observationType === "PMES" && (cycle === "Planning" || row.cycles.includes(cycle as "1st" | "2nd"))); }
export async function loadIndicatorLibrary(): Promise<IndicatorLibrary> {
    const response = await fetch("/api/cot-library.php", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok)
        throw new Error("The verified indicator library could not be loaded. Your saved COT snapshots are unchanged.");
    const result = await response.json();
    return { revision: String(result.revision), indicators: validateIndicators(result.indicators) };
}
export async function saveIndicatorLibrary(library: IndicatorLibrary): Promise<IndicatorLibrary> {
    const session = await readAdminSession();
    validateIndicators(library.indicators);
    const response = await fetch("/api/cot-library.php", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-ILAW-CSRF": session.csrfToken }, body: JSON.stringify(library) });
    const result = await response.json();
    if (!response.ok)
        throw new Error(result.error || "Indicator library could not be saved.");
    return { revision: result.revision, indicators: validateIndicators(result.indicators) };
}
