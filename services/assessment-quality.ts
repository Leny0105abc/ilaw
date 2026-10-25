import { Assessment, AssessmentQuestion, AnswerChoice, BloomLevel, Difficulty, DifficultySettings, bloomLevels } from "@/types/assessment";
import { assertValidTOS } from "@/services/assessment-generator";

export const difficulties: Difficulty[] = ["Easy", "Moderate", "Difficult"];
export const letters: AnswerChoice[] = ["A", "B", "C", "D"];
export const defaultDifficulty: DifficultySettings = { level: "Mixed", percentages: { Easy: 40, Moderate: 40, Difficult: 20 } };
export type QualityIssue = { number?: number; message: string };
export type QuestionSlot = { number: number; competencyId: string; competency: string; bloomLevel: BloomLevel; difficulty: Difficulty };

export function difficultyError(settings: DifficultySettings): string | null {
  if (![...difficulties, "Mixed"].includes(settings.level)) return "Choose a difficulty level.";
  if (settings.level !== "Mixed") return null;
  const values = difficulties.map(level => settings.percentages[level]);
  if (values.some(value => !Number.isFinite(value) || value < 0 || value > 100)) return "Difficulty percentages must be between 0 and 100.";
  return Math.abs(values.reduce((sum, value) => sum + value, 0) - 100) > 0.000001 ? "Mixed difficulty percentages must total 100%." : null;
}

export function difficultyCounts(total: number, settings = defaultDifficulty): Record<Difficulty, number> {
  const error = difficultyError(settings);
  if (error) throw new Error(error);
  const weights = difficulties.map(level => settings.level === "Mixed" ? settings.percentages[level] : settings.level === level ? 100 : 0);
  const raw = weights.map(weight => total * weight / 100);
  const counts = raw.map(Math.floor);
  let left = total - counts.reduce((sum, value) => sum + value, 0);
  raw.map((value, index) => ({ index, remainder: value - counts[index] })).sort((a, b) => b.remainder - a.remainder || a.index - b.index).forEach(({ index }) => { if (left-- > 0) counts[index]++; });
  return { Easy: counts[0], Moderate: counts[1], Difficult: counts[2] };
}

// Difficulty is allocated separately from Bloom. Never rewrite the teacher's TOS.
export function questionPlan(assessment: Assessment): QuestionSlot[] {
  assertValidTOS(assessment);
  const slots: QuestionSlot[] = [];
  for (const row of assessment.tos) for (const bloomLevel of bloomLevels) for (let index = 0; index < row.distribution[bloomLevel]; index++) {
    slots.push({ number: slots.length + 1, competencyId: row.competencyId, competency: row.competency, bloomLevel, difficulty: "Easy" });
  }
  if (slots.length !== assessment.totalItems) throw new Error("Balance the TOS before generating the test.");
  const counts = difficultyCounts(slots.length, assessment.difficulty);
  const ranked = [...slots].sort((a, b) => bloomLevels.indexOf(a.bloomLevel) - bloomLevels.indexOf(b.bloomLevel) || a.number - b.number);
  let offset = 0;
  for (const level of difficulties) for (let index = 0; index < counts[level]; index++) ranked[offset++].difficulty = level;
  return slots;
}

function normalized(text: string) { return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim(); }
function grams(text: string) { const words = normalized(text).split(" "); return new Set(words.slice(0, -2).map((_, index) => words.slice(index, index + 3).join(" "))); }
export function similarQuestions(a: string, b: string) {
  if (normalized(a) === normalized(b)) return true;
  const first = grams(a), second = grams(b);
  const overlap = [...first].filter(value => second.has(value)).length;
  return first.size > 3 && second.size > 3 && overlap / Math.max(first.size, second.size) >= 0.72;
}

const filler = /a response (?:that|based|unrelated)|isang tugon na|which statement correctly identifies|which explanation best shows|which action correctly applies|\b(?:placeholder|lorem ipsum|correct answer here|option [abcd]|choice [abcd])\b/i;
export function questionIssues(questions: AssessmentQuestion[]): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const prefixes = new Map<string, number[]>();
  for (const question of questions) {
    const add = (message: string) => issues.push({ number: question.number, message });
    if (question.question.trim().length < 12 || filler.test(question.question)) add("Replace the generic or incomplete question with a content-based question.");
    const choices = letters.map(letter => question.choices[letter]?.trim() || "");
    if (choices.some(choice => !choice || filler.test(choice))) add("All four choices must contain real lesson content, without filler.");
    if (new Set(choices.map(normalized)).size !== 4) add("The four choices must be distinct.");
    if (!letters.includes(question.correctAnswer)) add("Select exactly one correct answer.");
    if (!question.difficulty || !difficulties.includes(question.difficulty)) add("Choose Easy, Moderate, or Difficult for this item.");
    const prefix = normalized(question.question).split(" ").slice(0, 6).join(" ");
    prefixes.set(prefix, [...(prefixes.get(prefix) || []), question.number]);
  }
  for (let index = 0; index < questions.length; index++) {
    if (questions.slice(0, index).some(previous => similarQuestions(previous.question, questions[index].question))) issues.push({ number: questions[index].number, message: "Rewrite this question; it is too similar to another item." });
  }
  for (const numbers of prefixes.values()) if (numbers.length > 2) for (const number of numbers.slice(2)) issues.push({ number, message: "Vary this repeated question-opening pattern." });
  return issues;
}

// A stable content signature invalidates semantic approval after ANY edit/reorder/settings change.
export function testFingerprint(assessment: Assessment) {
  const data = JSON.stringify([assessment.grade, assessment.subject, assessment.term, assessment.totalItems, assessment.difficulty || defaultDifficulty, assessment.competencies, assessment.tos, assessment.questions]);
  let first = 2166136261, second = 5381;
  for (let index = 0; index < data.length; index++) { first = Math.imul(first ^ data.charCodeAt(index), 16777619); second = Math.imul(second, 33) ^ data.charCodeAt(index); }
  return `${data.length}-${first >>> 0}-${second >>> 0}`;
}

// Structural checks only. A separate teacher-review confirmation is no longer required to save or export.
export function testIssues(assessment: Assessment): QualityIssue[] {
  const issues = questionIssues(assessment.questions);
  const error = difficultyError(assessment.difficulty || defaultDifficulty);
  if (error) issues.push({ message: error });
  if (!assessment.totalItems || assessment.questions.length !== assessment.totalItems) issues.push({ message: `The test must contain exactly ${assessment.totalItems} questions.` });
  const expected = new Map(assessment.competencies.map(item => [item.id, item.text]));
  assessment.questions.forEach((item, index) => {
    if (item.number !== index + 1) issues.push({ number: item.number, message: "Question numbering must be continuous with no duplicates." });
    if (expected.get(item.competencyId) !== item.competency) issues.push({ number: item.number, message: "The learning competency must match its saved wording exactly." });
  });
  for (const row of assessment.tos) for (const level of bloomLevels) {
    const actual = assessment.questions.filter(item => item.competencyId === row.competencyId && item.bloomLevel === level).length;
    if (actual !== row.distribution[level]) issues.push({ message: `Questions do not match the TOS allocation for ${level}: ${row.competency}.` });
  }
  if (!error) {
    const counts = difficultyCounts(assessment.totalItems, assessment.difficulty);
    for (const level of difficulties) if (assessment.questions.filter(item => item.difficulty === level).length !== counts[level]) issues.push({ message: `${level} difficulty must contain ${counts[level]} items.` });
  }
  const counts = letters.map(letter => assessment.questions.filter(item => item.correctAnswer === letter).length);
  if (Math.max(...counts) - Math.min(...counts) > 1) issues.push({ message: "Shuffle answer positions for a reasonably balanced answer key." });
  const key = assessment.questions.map(item => item.correctAnswer).join("");
  if (/(A{3}|B{3}|C{3}|D{3})/.test(key) || /(.{4})\1\1/.test(key)) issues.push({ message: "Shuffle answer positions to remove repeated answer-key patterns." });
  return issues;
}

export function assertTestReady(assessment: Assessment) {
  const issues = testIssues(assessment);
  if (issues.length) throw new Error(issues.slice(0, 4).map(issue => `${issue.number ? `Item ${issue.number}: ` : ""}${issue.message}`).join("\n"));
}

function randomIndex(max: number) { const bytes = new Uint32Array(1); crypto.getRandomValues(bytes); return bytes[0] % max; }
function shuffled<T>(values: T[]): T[] { const next = [...values]; for (let index = next.length - 1; index > 0; index--) { const other = randomIndex(index + 1); [next[index], next[other]] = [next[other], next[index]]; } return next; }
export function shuffleAnswerPositions(questions: AssessmentQuestion[]): AssessmentQuestion[] {
  const counts = letters.map((_, index) => Math.floor(questions.length / 4) + (index < questions.length % 4 ? 1 : 0));
  let sequence: AnswerChoice[] = [];
  for (let attempt = 0; attempt < 500; attempt++) {
    sequence = shuffled(letters.flatMap((letter, index) => Array<AnswerChoice>(counts[index]).fill(letter)));
    if (!/(A{3}|B{3}|C{3}|D{3})/.test(sequence.join("")) && !/(.{4})\1\1/.test(sequence.join(""))) break;
  }
  if (/(A{3}|B{3}|C{3}|D{3})/.test(sequence.join("")) || /(.{4})\1\1/.test(sequence.join(""))) throw new Error("Could not randomize the answer key. Please try again.");
  return questions.map((question, index) => {
    const correct = question.choices[question.correctAnswer];
    const distractors = shuffled(letters.filter(letter => letter !== question.correctAnswer).map(letter => question.choices[letter]));
    const choices = {} as Record<AnswerChoice, string>;
    for (const letter of letters) choices[letter] = letter === sequence[index] ? correct : distractors.shift()!;
    return { ...question, correctAnswer: sequence[index], choices };
  });
}
