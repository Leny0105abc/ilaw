import { Assessment, AssessmentCompetency, AssessmentQuestion, AssessmentTerm, BloomLevel, TOSRow, bloomLevels } from "@/types/assessment";
import { GradeLevel, LearningArea } from "@/types/lesson-plan";

const bloomWeights: Record<BloomLevel, number> = {
  Remembering: 20,
  Understanding: 20,
  Applying: 20,
  Analyzing: 20,
  Evaluating: 10,
  Creating: 10,
};

export function parseAssessmentTotal(value: string): number {
  const text = value.trim();
  const total = Number(text);
  if (!/^\d+$/.test(text) || !Number.isInteger(total) || total < 1 || total > 200) {
    throw new Error("Enter a whole-number total from 1 to 200 items.");
  }
  return total;
}

function allocate(total: number, weights: number[]) {
  const sum = weights.reduce((value, item) => value + item, 0) || weights.length;
  const raw = weights.map((weight) => total * (weight || 1) / sum);
  const result = raw.map(Math.floor);
  let remaining = total - result.reduce((value, item) => value + item, 0);
  raw.map((value, index) => ({ index, remainder: value - result[index] }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
    .forEach(({ index }) => { if (remaining > 0) { result[index] += 1; remaining -= 1; } });
  return result;
}

function emptyDistribution(): Record<BloomLevel, number> {
  return { Remembering: 0, Understanding: 0, Applying: 0, Analyzing: 0, Evaluating: 0, Creating: 0 };
}

export function generateTOS(competencies: AssessmentCompetency[], totalItems: number, teachingDays?: number[]): TOSRow[] {
  if (!Number.isInteger(totalItems) || totalItems < 1 || totalItems > 200) throw new Error("Enter a whole-number total from 1 to 200 items.");
  if (!competencies.length) return [];
  const days = competencies.map((_, index) => Math.max(0.25, teachingDays?.[index] || 1));
  const rowTotals = allocate(totalItems, days);
  const globalCounts = allocate(totalItems, bloomLevels.map((level) => bloomWeights[level]));
  const assigned = bloomLevels.map(() => 0);
  const levelSequence = Array.from({ length: totalItems }, (_, position) => {
    let selected = 0;
    let bestDeficit = Number.NEGATIVE_INFINITY;
    globalCounts.forEach((target, index) => {
      if (assigned[index] >= target) return;
      const deficit = (target * (position + 1) / totalItems) - assigned[index];
      if (deficit > bestDeficit) { bestDeficit = deficit; selected = index; }
    });
    assigned[selected] += 1;
    return bloomLevels[selected];
  });
  let nextItem = 1;
  let levelOffset = 0;
  return competencies.map((competency, index) => {
    const distribution = emptyDistribution();
    levelSequence.slice(levelOffset, levelOffset + rowTotals[index]).forEach((level) => { distribution[level] += 1; });
    levelOffset += rowTotals[index];
    const itemNumbers = Array.from({ length: rowTotals[index] }, () => nextItem++);
    return {
      competencyId: competency.id,
      competency: competency.text,
      teachingDays: days[index],
      percentage: Number(((rowTotals[index] / totalItems) * 100).toFixed(1)),
      distribution,
      totalItems: rowTotals[index],
      itemNumbers,
    };
  });
}

export function normalizeTOS(rows: TOSRow[], targetTotal: number): TOSRow[] {
  let nextItem = 1;
  return rows.map((row) => {
    const totalItems = bloomLevels.reduce((sum, level) => sum + Math.max(0, Math.floor(row.distribution[level] || 0)), 0);
    return {
      ...row,
      teachingDays: Math.max(0.25, row.teachingDays || 1),
      totalItems,
      percentage: targetTotal ? Number(((totalItems / targetTotal) * 100).toFixed(1)) : 0,
      itemNumbers: Array.from({ length: totalItems }, () => nextItem++),
    };
  });
}

export function tosTotal(rows: TOSRow[]) {
  return rows.reduce((sum, row) => sum + row.totalItems, 0);
}

// Check the counts AND numbering, not just a cached row total, at every output boundary.
export function tosError(assessment: Assessment): string | null {
  const target = assessment.totalItems;
  if (!Number.isInteger(target) || target < 1 || target > 200) return "Enter a whole-number total from 1 to 200 items.";
  const ids = new Set(assessment.tos.map(row => row.competencyId));
  if (!assessment.tos.length || ids.size !== assessment.tos.length || ids.size !== assessment.competencies.length) return "The TOS must contain one row for each selected competency.";
  for (const row of assessment.tos) {
    if (!Number.isFinite(row.teachingDays) || row.teachingDays <= 0) return "Teaching sessions must be a positive number.";
    const competency = assessment.competencies.find(item => item.id === row.competencyId);
    if (!competency || competency.text !== row.competency) return "TOS competency wording must match the selected competencies.";
    const counts = bloomLevels.map(level => row.distribution[level]);
    if (counts.some(count => !Number.isInteger(count) || count < 0)) return "Bloom-level counts must be non-negative whole numbers.";
    if (counts.reduce((sum, count) => sum + count, 0) !== row.totalItems || row.itemNumbers.length !== row.totalItems) return "TOS row counts and item placement do not match. Use Automatic distribution to recalculate.";
  }
  const numbers = assessment.tos.flatMap(row => row.itemNumbers).sort((a, b) => a - b);
  if (tosTotal(assessment.tos) !== target) return `The TOS must contain exactly ${target} items, not ${tosTotal(assessment.tos)}. Use Automatic distribution to recalculate.`;
  if (numbers.length !== target || numbers.some((number, index) => number !== index + 1)) return `Item placement must use every number from 1 to ${target} exactly once.`;
  if (assessment.questions.length) {
    if (assessment.questions.length !== target || assessment.questions.some((question, index) => question.number !== index + 1)) return `The test and TOS must both contain exactly ${target} numbered items.`;
    for (const row of assessment.tos) {
      const questions = assessment.questions.filter(question => question.competencyId === row.competencyId);
      if (questions.length !== row.totalItems || questions.some(question => question.competency !== row.competency || !row.itemNumbers.includes(question.number)) || bloomLevels.some(level => questions.filter(question => question.bloomLevel === level).length !== row.distribution[level])) return "TOS item placement must match the questions and their Bloom levels.";
    }
  }
  return null;
}

export function assertValidTOS(assessment: Assessment) {
  const error = tosError(assessment);
  if (error) throw new Error(error);
}

export function resizeAssessmentTOS(assessment: Assessment, totalItems: number): Assessment {
  const tos = generateTOS(assessment.competencies, totalItems, assessment.tos.map(row => row.teachingDays));
  return { ...assessment, totalItems, tos, tosMode: "automatic", questions: [], testReview: undefined, updatedAt: new Date().toISOString() };
}

export function rebuildTOSFromQuestions(rows: TOSRow[], questions: AssessmentQuestion[]): TOSRow[] {
  const next = rows.map((row) => ({ ...row, distribution: emptyDistribution(), itemNumbers: [] as number[], totalItems: 0 }));
  questions.forEach((question, index) => {
    question.number = index + 1;
    const row = next.find((item) => item.competencyId === question.competencyId);
    if (row) {
      row.distribution[question.bloomLevel] += 1;
      row.totalItems += 1;
      row.itemNumbers.push(index + 1);
    }
  });
  return next.map((row) => ({ ...row, percentage: questions.length ? Number(((row.totalItems / questions.length) * 100).toFixed(1)) : 0 }));
}

export function createAssessment(input: { title: string; grade: GradeLevel; subject: LearningArea; term: AssessmentTerm; week?: number; totalItems: number; competencies: AssessmentCompetency[] }): Assessment {
  const now = new Date().toISOString();
  const assessment: Assessment = {
    id: `assessment-${Date.now()}`,
    title: input.title,
    grade: input.grade,
    subject: input.subject,
    term: input.term,
    week: input.week,
    testType: "Summative Test",
    totalItems: input.totalItems,
    competencies: input.competencies,
    tosMode: "automatic",
    tosFormat: "standard",
    tos: generateTOS(input.competencies, input.totalItems),
    questions: [],
    createdAt: now,
    updatedAt: now,
  };
  assertValidTOS(assessment);
  return assessment;
}
