import { z } from "zod";
import { readAdminSession } from "@/services/auth";
import { Assessment, AssessmentQuestion } from "@/types/assessment";
import { QualityIssue, QuestionSlot, questionIssues, questionPlan, shuffleAnswerPositions, similarQuestions, testFingerprint, testIssues } from "@/services/assessment-quality";

export const generatedSchema = z.object({ items: z.array(z.object({ number: z.number().int(), question: z.string().min(12).max(2000), choices: z.object({ A: z.string().min(1).max(1000), B: z.string().min(1).max(1000), C: z.string().min(1).max(1000), D: z.string().min(1).max(1000) }), correctAnswer: z.enum(["A", "B", "C", "D"]), rationale: z.string().min(12).max(2000) })) });
const reviewSchema = z.object({ issues: z.array(z.object({ number: z.number().int(), message: z.string().min(1).max(1000) })) });
export type AITransport = (payload: Record<string, unknown>, signal?: AbortSignal) => Promise<unknown>;

export const assessmentRequest: AITransport = async (payload, signal) => {
  let response: Response;
  try { const session = await readAdminSession(); response = await fetch("/api/assessment.php", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-ILAW-CSRF": session.csrfToken }, body: JSON.stringify(payload), signal: signal || AbortSignal.timeout(120000) }); }
  catch (error) { if (error instanceof Error && error.name === "AbortError") throw error; throw new Error("The secure AI service could not be reached. Your existing work has not been changed."); }
  let value: { error?: string };
  try { value = await response.json(); } catch { throw new Error("The AI service is not installed on this server. Configure the secure Hostinger service before generating content."); }
  if (!response.ok) throw new Error(value.error || "Content generation failed. Please try again.");
  return value;
};

function context(assessment: Assessment) { return { grade: assessment.grade, subject: assessment.subject, term: assessment.term, totalItems: assessment.totalItems, competencies: assessment.competencies, difficulty: assessment.difficulty }; }

async function generateBatch(assessment: Assessment, slots: QuestionSlot[], existing: AssessmentQuestion[], request: AITransport, signal?: AbortSignal, feedback: QualityIssue[] = []): Promise<AssessmentQuestion[]> {
  const response = generatedSchema.parse(await request({ operation: "generate", context: context(assessment), slots, avoid: existing.map(item => item.question), feedback }, signal));
  if (response.items.length !== slots.length || new Set(response.items.map(item => item.number)).size !== slots.length) throw new Error("The AI returned an incorrect number of questions. No partial test was saved.");
  return slots.map(slot => {
    const item = response.items.find(entry => entry.number === slot.number);
    if (!item) throw new Error(`The AI omitted item ${slot.number}. Please generate again.`);
    return { ...item, ...slot, id: crypto.randomUUID(), revision: 0 };
  });
}

export async function reviewQuestions(assessment: Assessment, request: AITransport = assessmentRequest, onProgress?: (message: string) => void, signal?: AbortSignal): Promise<QualityIssue[]> {
  const issues: QualityIssue[] = [];
  for (let offset = 0; offset < assessment.questions.length; offset += 16) {
    onProgress?.(`Reviewing items ${offset + 1}–${Math.min(offset + 16, assessment.questions.length)} for accuracy, ambiguity, difficulty, and variety…`);
    const batch = assessment.questions.slice(offset, offset + 16);
    const response = reviewSchema.parse(await request({ operation: "review", context: context(assessment), items: batch, allStems: assessment.questions.map(item => ({ number: item.number, question: item.question })) }, signal));
    if (response.issues.some(issue => !batch.some(item => item.number === issue.number))) throw new Error("The AI review returned an invalid item number.");
    issues.push(...response.issues);
  }
  return issues;
}

export async function generateTestQuestions(assessment: Assessment, onProgress?: (message: string) => void, request: AITransport = assessmentRequest, signal?: AbortSignal): Promise<Assessment> {
  const slots = questionPlan(assessment);
  let questions: AssessmentQuestion[] = [];
  for (let offset = 0; offset < slots.length; offset += 8) {
    onProgress?.(`Writing items ${offset + 1}–${Math.min(offset + 8, slots.length)} of ${slots.length}…`);
    const batchSlots = slots.slice(offset, offset + 8);
    let batch = await generateBatch(assessment, batchSlots, questions, request, signal);
    for (let attempt = 0; attempt < 2; attempt++) {
      const issues = questionIssues([...questions, ...batch]).filter(issue => batch.some(item => item.number === issue.number));
      if (!issues.length) break;
      batch = await generateBatch(assessment, batchSlots, questions, request, signal, issues);
    }
    questions.push(...batch);
  }
  // Whole-test review can catch repeated concepts/stems across generation batches.
  for (let attempt = 0; attempt < 3; attempt++) {
    const draft = { ...assessment, questions };
    const issues = [...questionIssues(questions), ...await reviewQuestions(draft, request, onProgress, signal)];
    if (!issues.length) {
      const next = { ...draft, questions: shuffleAnswerPositions(questions) };
      const structural = testIssues(next, false);
      if (structural.length) throw new Error(structural.map(issue => issue.message).join(" "));
      return { ...next, testReview: { fingerprint: testFingerprint(next), reviewedAt: new Date().toISOString(), reviewer: "ai" }, updatedAt: new Date().toISOString() };
    }
    if (attempt === 2) throw new Error(`Quality review could not resolve ${issues.length} issue(s). ${issues.slice(0, 2).map(issue => `Item ${issue.number}: ${issue.message}`).join(" ")} Your existing test is unchanged.`);
    const numbers = new Set(issues.map(issue => issue.number));
    const affected = slots.filter(slot => numbers.has(slot.number));
    onProgress?.(`Rewriting ${affected.length} flagged items…`);
    for (let offset = 0; offset < affected.length; offset += 8) {
      const repairSlots = affected.slice(offset, offset + 8);
      const replacements = await generateBatch(assessment, repairSlots, questions.filter(item => !repairSlots.some(slot => slot.number === item.number)), request, signal, issues);
      questions = questions.map(item => replacements.find(replacement => replacement.number === item.number) || item);
    }
  }
  throw new Error("Test quality validation failed.");
}

export async function regenerateTestItem(assessment: Assessment, index: number, request: AITransport = assessmentRequest): Promise<AssessmentQuestion> {
  const current = assessment.questions[index];
  if (!current.difficulty) throw new Error("Choose this item's difficulty before regenerating it, or regenerate the entire legacy test.");
  const slot: QuestionSlot = { number: current.number, competencyId: current.competencyId, competency: current.competency, bloomLevel: current.bloomLevel, difficulty: current.difficulty };
  let feedback: QualityIssue[] = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    const [generated] = await generateBatch(assessment, [slot], assessment.questions, request, undefined, feedback);
    // Retain this answer position: replacing one item must not alter any other item or its answer.
    const correctText = generated.choices[generated.correctAnswer];
    const displaced = generated.choices[current.correctAnswer];
    const next = { ...generated, id: current.id, revision: current.revision + 1, correctAnswer: current.correctAnswer, choices: { ...generated.choices, [current.correctAnswer]: correctText, [generated.correctAnswer]: displaced } };
    const questions = assessment.questions.map((item, itemIndex) => itemIndex === index ? next : item);
    const response = reviewSchema.parse(await request({ operation: "review", context: context(assessment), items: [next], allStems: questions.map(item => ({ number: item.number, question: item.question })) }));
    feedback = [...questionIssues(questions).filter(issue => issue.number === next.number), ...response.issues];
    if (assessment.questions.some(item => similarQuestions(item.question, next.question))) feedback.push({ number: next.number, message: "Use a genuinely new question, different from the old item and every other item." });
    if (!feedback.length) return next;
  }
  throw new Error("The replacement failed quality review. The original item was retained.");
}
