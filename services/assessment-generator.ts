import { AnswerChoice, Assessment, AssessmentCompetency, AssessmentQuestion, AssessmentTerm, BloomLevel, TOSRow, bloomLevels } from "@/types/assessment";
import { GradeLevel, LearningArea } from "@/types/lesson-plan";

const bloomWeights: Record<BloomLevel, number> = {
  Remembering: 20,
  Understanding: 20,
  Applying: 20,
  Analyzing: 20,
  Evaluating: 10,
  Creating: 10,
};

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
  if (!competencies.length || totalItems < 1) return [];
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

function stem(competency: string) {
  return competency.trim().replace(/[.]$/, "").replace(/^(discuss|identify|explain|determine|differentiate|distinguish|perform|apply|create|utilize|demonstrate|recognize|examine|illustrate|develop|familiarize themselves with)\s+/i, "");
}

function isTagalog(value: string) {
  return /\b(ang|mga|ng|sa|na|at|bilang|pamamagitan|natutukoy|naipapaliwanag|nasusuri|naisasagawa|nakabubuo)\b/i.test(value);
}

function promptFor(level: BloomLevel, competency: string, item: number, revision: number) {
  const topic = stem(competency);
  const alternate = revision > 0 ? " another appropriate example of" : "";
  if (isTagalog(competency)) {
    const prompts: Record<BloomLevel, string> = {
      Remembering: `Alin ang wastong pahayag tungkol sa ${topic}?`,
      Understanding: `Aling paliwanag ang pinakamahusay na nagpapakita ng pag-unawa sa ${topic}?`,
      Applying: `Sa isang pang-araw-araw na sitwasyon, paano wastong mailalapat ang ${topic}?`,
      Analyzing: `Aling pagsusuri ang nagpapakita ng ugnayan ng mahahalagang ideya sa ${topic}?`,
      Evaluating: `Aling pasya ang may pinakamalinaw na batayan kaugnay ng ${topic}?`,
      Creating: `Aling plano ang pinakamainam na malikha upang maipakita ang ${topic}?`,
    };
    return prompts[level];
  }
  const prompts: Record<BloomLevel, string> = {
    Remembering: `Which statement correctly identifies${alternate} ${topic}?`,
    Understanding: `Which explanation best shows an understanding of ${topic}?`,
    Applying: `Which action correctly applies ${topic} in a practical situation?`,
    Analyzing: `Which analysis best connects the important ideas in ${topic}?`,
    Evaluating: `Which decision is best supported by appropriate criteria for ${topic}?`,
    Creating: `Which plan would best demonstrate ${topic}?`,
  };
  return `${prompts[level]}${revision ? ` (Version ${revision + 1})` : ""}`;
}

function choiceSet(competency: string, level: BloomLevel, correctAnswer: AnswerChoice, revision: number) {
  const topic = stem(competency);
  const tagalog = isTagalog(competency);
  const correct = tagalog
    ? `Isang tugon na tama, may malinaw na batayan, at angkop sa ${topic}.`
    : `A response that is accurate, well-supported, and appropriate for ${topic}.`;
  const distractors = tagalog
    ? [
        `Isang tugon na hindi isinasaalang-alang ang mahahalagang ideya ng ${topic}.`,
        `Isang tugon na nakabatay lamang sa hula at walang sapat na paliwanag.`,
        `Isang tugon na walang kaugnayan sa hinihinging kasanayan o sitwasyon.`,
      ]
    : [
        `A response that overlooks the essential ideas related to ${topic}.`,
        `A response based only on guessing, without adequate explanation or evidence.`,
        `A response unrelated to the required ${level.toLowerCase()} skill or situation.`,
      ];
  const rotated = [...distractors.slice(revision % 3), ...distractors.slice(0, revision % 3)];
  const choices = {} as Record<AnswerChoice, string>;
  let distractorIndex = 0;
  (["A", "B", "C", "D"] as AnswerChoice[]).forEach((letter) => {
    choices[letter] = letter === correctAnswer ? correct : rotated[distractorIndex++];
  });
  return choices;
}

export function generateQuestion(competencyId: string, competency: string, bloomLevel: BloomLevel, number: number, revision = 0): AssessmentQuestion {
  const answers: AnswerChoice[] = ["A", "B", "C", "D"];
  const correctAnswer = answers[(number + revision - 1) % answers.length];
  return {
    id: `question-${Date.now()}-${number}-${revision}-${Math.random().toString(36).slice(2, 7)}`,
    number,
    question: promptFor(bloomLevel, competency, number, revision),
    choices: choiceSet(competency, bloomLevel, correctAnswer, revision),
    correctAnswer,
    competencyId,
    competency,
    bloomLevel,
    revision,
  };
}

export function generateQuestions(rows: TOSRow[]): AssessmentQuestion[] {
  const questions: AssessmentQuestion[] = [];
  rows.forEach((row) => {
    bloomLevels.forEach((level) => {
      for (let index = 0; index < row.distribution[level]; index += 1) {
        const number = questions.length + 1;
        questions.push(generateQuestion(row.competencyId, row.competency, level, number));
      }
    });
  });
  return questions;
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
  return {
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
}
