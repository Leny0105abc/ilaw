import { Assessment, BloomLevel, TOSFormat, bloomLevels } from "@/types/assessment";
import { defaultProfile } from "@/types/lesson-plan";
import { learningAreaOptionLabel } from "@/data/curriculum";

export function tosFormatLabel(format: TOSFormat) {
  return format === "item-placement" ? "TOS with Item Placement" : "Standard TOS";
}

export function getTOSPresentation(assessment: Assessment) {
  const totalSessions = assessment.tos.reduce((sum, row) => sum + row.teachingDays, 0);
  const minutes = assessment.sessionMinutes || 60;
  const totals = Object.fromEntries(bloomLevels.map((level) => [level, assessment.tos.reduce((sum, row) => sum + row.distribution[level], 0)])) as Record<BloomLevel, number>;
  const totalItems = assessment.tos.reduce((sum, row) => sum + row.totalItems, 0);
  const rows = assessment.tos.map((row) => {
    let offset = 0;
    const placement = Object.fromEntries(bloomLevels.map((level) => {
      // After editing or moving questions, use their actual item numbers.
      const numbers = assessment.questions.length
        ? assessment.questions.filter((item) => item.competencyId === row.competencyId && item.bloomLevel === level).map((item) => item.number).sort((a, b) => a - b)
        : row.itemNumbers.slice(offset, offset + row.distribution[level]);
      offset += row.distribution[level];
      return [level, numbers];
    })) as Record<BloomLevel, number[]>;
    return { ...row, hours: row.teachingDays * minutes / 60, computed: totalSessions ? row.teachingDays / totalSessions * assessment.totalItems : 0, placement };
  });
  const levelLabels = bloomLevels.map((level) => `${level}\n(${totalItems ? Number((totals[level] / totalItems * 100).toFixed(1)) : 0}%)`);
  return {
    rows, totals, totalItems, totalHours: totalSessions * minutes / 60,
    levelLabels, subject: learningAreaOptionLabel(assessment.subject),
    schoolYear: assessment.schoolYear || "2026–2027",
    profile: assessment.profile || defaultProfile,
  };
}

export function itemPlacementText(numbers: number[]) {
  return numbers.length ? `(${numbers.join(", ")})` : "";
}
