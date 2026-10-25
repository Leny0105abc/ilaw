"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, Check, Download, FileSpreadsheet, FileText, ListChecks, Plus, Printer, RefreshCw, Save, Sparkles, Trash2 } from "lucide-react";
import { competencies, learningAreaLabel, learningAreaOptionLabel } from "@/data/curriculum";
import { Assessment, AssessmentCompetency, AssessmentSeed, AssessmentTerm, BloomLevel, TOSRow, TOSFormat, DifficultySettings } from "@/types/assessment";
import { GradeLevel, LearningArea } from "@/types/lesson-plan";
import { createAssessment, generateTOS, normalizeTOS, parseAssessmentTotal, rebuildTOSFromQuestions, resizeAssessmentTOS, tosError, tosTotal } from "@/services/assessment-generator";
import { exportAssessmentPdf, exportAssessmentWord, exportTOSExcel, printAssessment } from "@/services/assessment-export";
import { loadProfile } from "@/services/storage";
import { TOSTable } from "@/components/tos-table";
import { AssessmentDifficulty } from "@/components/assessment-difficulty";
import { defaultDifficulty, difficultyError, shuffleAnswerPositions, testFingerprint, testIssues } from "@/services/assessment-quality";
import { AssessmentQuestions } from "@/components/assessment-questions";
import { generateTestQuestions, regenerateTestItem, reviewQuestions } from "@/services/assessment-ai";
import { AssessmentPrompt } from "@/components/assessment-prompt";

type Props = {
  initial?: Assessment | null;
  seed?: AssessmentSeed | null;
  onSave: (assessment: Assessment) => void;
  onBack: () => void;
};

export function AssessmentBuilder({ initial, seed, onSave, onBack }: Props) {
  const [assessment, setAssessment] = useState<Assessment | null>(initial || null);
  if (!assessment) return <AssessmentSetup seed={seed} onCreate={setAssessment} onBack={onBack} />;
  return <AssessmentWorkspace assessment={assessment} onChange={setAssessment} onSave={onSave} onBack={onBack} />;
}

function AssessmentSetup({ seed, onCreate, onBack }: { seed?: AssessmentSeed | null; onCreate: (assessment: Assessment) => void; onBack: () => void }) {
  const [grade, setGrade] = useState<GradeLevel>(seed?.grade || 8);
  const initialArea = seed?.subject || competencies.find((item) => item.grade === (seed?.grade || 8))?.area || "Family and Consumer Science";
  const [subject, setSubject] = useState<LearningArea>(initialArea);
  const [term, setTerm] = useState<AssessmentTerm>(seed?.term || 1);
  // Keep the typed value intact; a native number stepper can change the target
  // while the teacher navigates the long competency list.
  const [totalInput, setTotalInput] = useState("40");
  const totalItems = /^\d+$/.test(totalInput.trim()) ? Number(totalInput) : 0;
  const [schoolYear, setSchoolYear] = useState("2026–2027");
  const [sessionMinutes, setSessionMinutes] = useState(60);
  const [title, setTitle] = useState(seed?.title || "");
  const [selectedIds, setSelectedIds] = useState<string[]>(() => competencies.filter((item) => seed?.competencyTexts?.includes(item.text)).map((item) => item.id));
  const [manualCompetencies, setManualCompetencies] = useState<AssessmentCompetency[]>(() => (seed?.competencyTexts || []).filter((text) => !competencies.some((item) => item.text === text)).map((text, index) => ({ id: `manual-seed-${index}`, text, source: "manual" })));
  const [manualText, setManualText] = useState("");
  const [error, setError] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultySettings>(defaultDifficulty);

  const subjects = useMemo(() => Array.from(new Set(competencies.filter((item) => item.grade === grade).map((item) => item.area))), [grade]);
  const available = useMemo(() => competencies.filter((item) => item.grade === grade && item.area === subject && (item.term === term || (item.term === "one-term" && term === 1))), [grade, subject, term]);
  const allSelected = available.length > 0 && available.every((item) => selectedIds.includes(item.id));

  function changeGrade(next: GradeLevel) {
    const first = competencies.find((item) => item.grade === next);
    setGrade(next); setSubject(first?.area || subject); setSelectedIds([]); setManualCompetencies([]);
  }
  function changeSubject(next: LearningArea) { setSubject(next); setSelectedIds([]); setManualCompetencies([]); }
  function addManual() {
    const value = manualText.trim();
    if (!value) return;
    setManualCompetencies((current) => [...current, { id: `manual-${Date.now()}`, text: value, source: "manual" }]);
    setManualText("");
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    let requestedTotal: number;
    try {
      // Use the field's submitted value, not a potentially stale render value.
      requestedTotal = parseAssessmentTotal(String(new FormData(event.currentTarget as HTMLFormElement).get("totalItems") || ""));
    } catch (error) { setError(error instanceof Error ? error.message : "Enter the total items."); return; }
    const chosen: AssessmentCompetency[] = [
      ...available.filter((item) => selectedIds.includes(item.id)).map((item) => ({ id: item.id, text: item.text, source: "official" as const })),
      ...manualCompetencies,
    ];
    if (!chosen.length) { setError("Select or add at least one learning competency."); return; }
    const difficultyProblem = difficultyError(difficulty);
    if (difficultyProblem) { setError(difficultyProblem); return; }
    onCreate({ ...createAssessment({ title: title.trim() || `${learningAreaLabel(grade, subject)} Term ${term} Summative Test`, grade, subject, term, week: seed?.week, totalItems: requestedTotal, competencies: chosen }), schoolYear, sessionMinutes, difficulty, profile: loadProfile() });
  }

  return <form className="assessment-page" onSubmit={submit}>
    <div className="page-heading"><div><span className="eyebrow">Assessment setup</span><h1>Create a summative assessment.</h1><p>Select official competencies, generate an exact TOS, then build and edit the test.</p></div><button type="button" className="secondary-btn" onClick={onBack}><ArrowLeft />Back</button></div>
    <div className="assessment-setup-grid"><section className="form-card">
      <div className="card-heading"><span>1</span><div><h2>Assessment details</h2><p>Curriculum choices use the same ILAW competency database.</p></div></div>
      <div className="field-grid three"><label>Grade Level<select value={grade} onChange={(event) => changeGrade(Number(event.target.value) as GradeLevel)}>{[7,8,9,10].map((item) => <option key={item} value={item}>Grade {item}</option>)}</select></label><label>Subject<select value={subject} onChange={(event) => changeSubject(event.target.value as LearningArea)}>{subjects.map((item) => <option key={item} value={item}>{learningAreaOptionLabel(item)}</option>)}</select></label><label>Type of Test<input value="Summative Test" readOnly /></label><label>Term<select value={term} onChange={(event) => { setTerm(Number(event.target.value) as AssessmentTerm); setSelectedIds([]); }}><option value={1}>Term 1</option><option value={2}>Term 2</option><option value={3}>Term 3</option></select></label><label>Total Items<input name="totalItems" type="text" inputMode="numeric" required pattern="[0-9]+" value={totalInput} onChange={(event) => { setTotalInput(event.target.value); setError(""); }} aria-describedby="setup-total-help"/><small id="setup-total-help">Enter 1–200 items. This count is used for the TOS and test.</small></label><label>Assessment Title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`${learningAreaLabel(grade, subject)} Summative Test`} /></label></div>
      <div className="field-grid"><label>School Year<input value={schoolYear} onChange={event=>setSchoolYear(event.target.value)}/></label><label>Minutes per session<input type="number" min={1} max={240} value={sessionMinutes} onChange={event=>setSessionMinutes(Math.max(1,Number(event.target.value)||60))}/></label></div>
      <AssessmentDifficulty value={difficulty} total={totalItems} onChange={setDifficulty}/>
    </section><section className="form-card">
      <div className="card-heading"><span>2</span><div><h2>Learning competencies</h2><p>Official wording is locked and saved with the assessment.</p></div></div>
      <div className="competency-toolbar"><div><b>{available.length} available</b><small>{selectedIds.length + manualCompetencies.length} selected</small></div><button type="button" className="secondary-btn" onClick={() => setSelectedIds(allSelected ? [] : available.map((item) => item.id))}><Check />{allSelected ? "Clear official" : "Select all"}</button></div>
      <div className="assessment-competencies">{available.map((item) => <label className={`competency ${selectedIds.includes(item.id) ? "selected" : ""}`} key={item.id}><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => setSelectedIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} /><span className="check"><Check /></span><span><b>OFFICIAL · {item.weeks.map((week) => `Week ${week}`).join(", ")}</b>{item.text}</span></label>)}</div>
      <div className="manual-competency"><label>Add a competency manually<div><textarea value={manualText} onChange={(event) => setManualText(event.target.value)} placeholder="Enter competency exactly as it should appear." /><button type="button" className="secondary-btn" onClick={addManual}><Plus />Add</button></div></label>{manualCompetencies.map((item) => <div className="manual-chip" key={item.id}><span><b>MANUAL</b>{item.text}</span><button type="button" onClick={() => setManualCompetencies((current) => current.filter((entry) => entry.id !== item.id))} aria-label="Remove manual competency"><Trash2 /></button></div>)}</div>
      {error && <p className="form-error">{error}</p>}
      <div className="setup-submit"><span><Check />Competency snapshots will preserve today&apos;s wording.</span><button className="primary-btn" type="submit"><ListChecks />{totalItems >= 1 && totalItems <= 200 ? `Generate ${totalItems}-item TOS` : "Generate TOS"}</button></div>
    </section></div>
  </form>;
}

function AssessmentWorkspace({ assessment, onChange, onSave, onBack }: { assessment: Assessment; onChange: (value: Assessment) => void; onSave: (value: Assessment) => void; onBack: () => void }) {
  const [tab, setTab] = useState<"test" | "answer" | "tos">(assessment.questions.length ? "test" : "tos");
  const [editing, setEditing] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [method, setMethod] = useState<"prompt" | "api">("prompt");
  const [promptOpen, setPromptOpen] = useState(false);
  const [targetTotal, setTargetTotal] = useState(String(assessment.totalItems));
  const structuralIssues = useMemo(() => testIssues(assessment), [assessment]);
  const qualityIssues = useMemo(() => testIssues(assessment), [assessment]);
  const actualTotal = tosTotal(assessment.tos);
  const tosProblem = tosError(assessment);
  const validTos = !tosProblem;
  const totalChangePending = targetTotal.trim() !== String(assessment.totalItems);

  function update(patch: Partial<Assessment>) { onChange({ ...assessment, ...patch, updatedAt: new Date().toISOString() }); }
  function switchTab(next: "test" | "answer" | "tos") { if (totalChangePending) { setNotice("Apply the new item total and recalculate the TOS before changing tabs."); return; } setTab(next); }
  function save() { if (totalChangePending) { setNotice("Apply the new item total and recalculate the TOS before saving."); return; } if (tosProblem) { setNotice(tosProblem); return; } const difficultyProblem = difficultyError(assessment.difficulty || defaultDifficulty); if (difficultyProblem) { setNotice(difficultyProblem); return; } if (assessment.questions.length && qualityIssues.length) { setNotice("Resolve the test quality issues before saving this test."); return; } const next = { ...assessment, updatedAt: new Date().toISOString() }; onChange(next); onSave(next); setNotice(assessment.questions.length ? "Assessment saved on this device." : "TOS draft saved on this device. No test has been generated yet."); }
  function applyTotal(event: FormEvent) {
    event.preventDefault();
    let total: number;
    try { total = parseAssessmentTotal(targetTotal); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Enter the total items."); return; }
    if (assessment.questions.length && !confirm(`Recalculate the TOS to exactly ${total} items? This clears the current questions and answer key so you can generate a matching test.`)) return;
    onChange(resizeAssessmentTOS(assessment, total));
    setTargetTotal(String(total)); setPromptOpen(false);
    setNotice(`TOS recalculated to exactly ${total} items. Item placement runs from 1 to ${total}, with no duplicates.`);
  }
  function setRows(rows: TOSRow[]) { update({ tos: normalizeTOS(rows, assessment.totalItems), questions: [] }); setNotice("TOS changed. Generate the test again when the total is balanced."); }
  function patchRow(index: number, patch: Partial<TOSRow>) { setRows(assessment.tos.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row)); }
  function patchBloom(index: number, level: BloomLevel, value: number) { const row = assessment.tos[index]; patchRow(index, { distribution: { ...row.distribution, [level]: Math.max(0, Math.floor(value || 0)) } }); }
  function autoBalance() { update({ tosMode: "automatic", tos: generateTOS(assessment.competencies, assessment.totalItems, assessment.tos.map((row) => row.teachingDays)), questions: [] }); setNotice("Automatic distribution balanced the TOS exactly."); }
  async function generateTest() {
    if (totalChangePending) { setNotice("Apply the new item total and recalculate the TOS before generating a test."); return; }
    if (!validTos) { setNotice(`Adjust the TOS to exactly ${assessment.totalItems} items first.`); return; }
    if (method === "prompt") { setPromptOpen(true); setNotice("Copy the prompt below into Gemini or Copilot. Paste the complete JSON response back into ILAW to import your questions."); return; }
    if (assessment.questions.length && !confirm("Replace the current test with a newly generated, reviewed test? Your TOS will not change.")) return;
    setBusy(true); setProgress("Connecting to the secure AI service…");
    try { const next = await generateTestQuestions(assessment, setProgress); onChange(next); setTab("test"); setNotice(`${next.questions.length} content-based questions generated and checked. Review them before classroom use.`); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Generation failed. The existing test was retained."); }
    finally { setBusy(false); setProgress(""); }
  }
  function patchQuestion(id: string, patch: Partial<Assessment["questions"][number]>) { const contentChanged = !!(patch.question || patch.choices || patch.correctAnswer); const questions = assessment.questions.map((item) => item.id === id ? { ...item, ...patch, ...(contentChanged ? { rationale: "" } : {}) } : item); update({ questions, tos: rebuildTOSFromQuestions(assessment.tos, questions) }); }
  async function regenerate(index: number) {
    if (method === "prompt") { setNotice("In copy-prompt mode, edit this item directly or use Generate Prompt to request a new full test. Single-item AI regeneration requires a connected API."); return; }
    setBusy(true); setProgress(`Regenerating and reviewing item ${index + 1}…`);
    try { const next = await regenerateTestItem(assessment, index); const questions = assessment.questions.map((item, itemIndex) => itemIndex === index ? next : item); const updated = { ...assessment, questions, updatedAt: new Date().toISOString() }; if (assessment.testReview?.fingerprint === testFingerprint(assessment)) updated.testReview = { fingerprint: testFingerprint(updated), reviewedAt: new Date().toISOString(), reviewer: "ai" }; onChange(updated); setNotice(`Item ${next.number} was regenerated. Other items and the TOS were unchanged.`); }
    catch (error) { setNotice(error instanceof Error ? error.message : "The original item was retained."); }
    finally { setBusy(false); setProgress(""); }
  }
  async function reviewTest() {
    if (method === "prompt") { setNotice("Automatic AI review requires a connected API."); return; }
    if (structuralIssues.length) { setNotice("Resolve the structural quality issues before requesting an AI review."); return; }
    setBusy(true); setProgress("Reviewing the complete test…");
    try { const issues = await reviewQuestions(assessment, undefined, setProgress); if (issues.length) setNotice(issues.map(issue => `Item ${issue.number}: ${issue.message}`).join("\n")); else { update({ testReview: { fingerprint: testFingerprint(assessment), reviewedAt: new Date().toISOString(), reviewer: "ai" } }); setNotice("AI content review passed. Teacher review is still recommended."); } }
    catch (error) { setNotice(error instanceof Error ? error.message : "Review failed."); }
    finally { setBusy(false); setProgress(""); }
  }
  function move(index: number, direction: -1 | 1) { const target = index + direction; if (target < 0 || target >= assessment.questions.length) return; const reordered = [...assessment.questions]; [reordered[index], reordered[target]] = [reordered[target], reordered[index]]; const questions = reordered.map((item, itemIndex) => ({ ...item, number: itemIndex + 1 })); update({ questions, tos: rebuildTOSFromQuestions(assessment.tos, questions) }); }
  function remove(index: number) { const questions = assessment.questions.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, number: itemIndex + 1 })); const totalItems = questions.length; setTargetTotal(String(totalItems)); update({ questions, totalItems, tos: rebuildTOSFromQuestions(assessment.tos, questions) }); setNotice(`Item deleted. The assessment and TOS now contain ${totalItems} items.`); }

  return <div className="assessment-page assessment-workspace">
    {busy && <div className="assessment-progress" role="status" aria-live="polite"><RefreshCw/>{progress}<small>Your current test stays unchanged until all checks pass.</small></div>}
    <fieldset className="assessment-controls" disabled={busy}>
    <div className="assessment-toolbar"><button className="text-btn" onClick={onBack}><ArrowLeft />Assessments</button><div><input value={assessment.title} onChange={(event) => update({ title: event.target.value })} /><span>{learningAreaLabel(assessment.grade, assessment.subject)} · Term {assessment.term}{assessment.week ? ` · Week ${assessment.week}` : ""}</span></div><button className="secondary-btn" onClick={save}><Save />Save assessment</button></div>
    <section className="assessment-summary"><div><span className="eyebrow">Summative test</span><h1>{assessment.title}</h1><p>{assessment.competencies.length} competencies · {assessment.totalItems} items · Revised Bloom&apos;s Taxonomy</p></div><div className={`total-check ${validTos ? "valid" : "invalid"}`}><b>{actualTotal} / {assessment.totalItems}</b><span>{validTos ? "TOS balanced" : "TOS needs adjustment"}</span></div></section>
    <div className="assessment-tabs"><button className={tab === "test" ? "active" : ""} onClick={() => switchTab("test")}>TEST <span>{assessment.questions.length}</span></button><button className={tab === "answer" ? "active" : ""} onClick={() => switchTab("answer")}>ANSWER KEY</button><button className={tab === "tos" ? "active" : ""} onClick={() => switchTab("tos")}>TOS</button></div>
    {notice && <div className="assessment-notice"><Check />{notice}<button onClick={() => setNotice("")}>×</button></div>}
    <section className="test-settings"><label className="generation-method">Generation method<select value={method} onChange={event => setMethod(event.target.value as "prompt" | "api")}><option value="prompt">Copy prompt to Gemini or Copilot (no API key)</option><option value="api">Connected AI service (API key required on server)</option></select></label><AssessmentDifficulty value={assessment.difficulty || defaultDifficulty} total={assessment.totalItems} onChange={difficulty => update({ difficulty })}/>{assessment.questions.length > 0 && <div className="test-quality"><h2>Test quality check</h2>{qualityIssues.length ? <><p>{qualityIssues.length} issue(s) need attention before saving or exporting.</p><ul>{qualityIssues.slice(0, 8).map((issue, index) => <li key={index}>{issue.number ? `Item ${issue.number}: ` : ""}{issue.message}</li>)}</ul></> : <p className="quality-passed">All checks passed. The test is ready to save and export.</p>}<div className="panel-actions"><button className="secondary-btn" onClick={() => { const questions = shuffleAnswerPositions(assessment.questions); update({ questions }); setNotice("Answer choices shuffled; the keyed answer text was preserved."); }}>Shuffle answer positions</button>{method === "api" && <button className="secondary-btn" onClick={reviewTest} disabled={structuralIssues.length > 0}>AI content review</button>}</div></div>}</section>
    {method === "prompt" && !totalChangePending && <AssessmentPrompt
      assessment={assessment} open={promptOpen} onOpenChange={setPromptOpen}
      onImport={next => { onChange(next); setTab("test"); setNotice(`${next.questions.length} questions imported. The TOS is unchanged. You can save and export now.`); }}
    />}
    {tab === "tos" && <section className="assessment-panel">
      <div className="panel-heading"><div><h2>Table of Specifications</h2><p>Choose the sample format. Item placement follows each question&apos;s competency and Bloom level.</p></div>
        <div className="panel-actions"><label className="tos-format-select">TOS format<select value={assessment.tosFormat || "standard"} onChange={event=>update({tosFormat:event.target.value as TOSFormat})}><option value="standard">Standard TOS</option><option value="item-placement">TOS with Item Placement</option></select></label>
          <div className="mode-toggle"><button className={assessment.tosMode === "automatic" ? "active" : ""} onClick={autoBalance}>Automatic</button><button className={assessment.tosMode === "manual" ? "active" : ""} onClick={() => update({ tosMode: "manual" })}>Manual</button></div>
          <ExportButtons assessment={assessment} part="tos" blocked={totalChangePending}/><button className="primary-btn" disabled={totalChangePending || !validTos || !!difficultyError(assessment.difficulty || defaultDifficulty)} onClick={generateTest}><Sparkles/>{method === "prompt" ? "Generate Prompt" : "Generate Summative Test"}</button>
        </div>
      </div>
      <form className="tos-total-settings" onSubmit={applyTotal}><label>Total Items<input type="text" inputMode="numeric" required pattern="[0-9]+" value={targetTotal} onChange={event => setTargetTotal(event.target.value)} /></label><button className="secondary-btn" type="submit"><RefreshCw />Apply total and recalculate TOS</button><p>Current target: <b>{assessment.totalItems} items</b>. Both TOS formats and exports use this exact total.</p></form>
      {totalChangePending && <p className="tos-warning" role="status">Click Apply total and recalculate TOS to use {targetTotal || "the new total"} items. Export and prompt generation are paused until you apply it.</p>}
      <TOSTable assessment={assessment} onBloomChange={patchBloom} onSessionsChange={(rowIndex,sessions)=> {
        const rows=assessment.tos.map((row,index)=>index===rowIndex?{...row,teachingDays:sessions}:row);
        if(assessment.tosMode==="automatic") update({tos:generateTOS(assessment.competencies,assessment.totalItems,rows.map(row=>row.teachingDays)),questions:[]}); else setRows(rows);
      }}/>
      <p className="tos-explanation">Computed = teaching-time share × total items. Adjusted = the sum of the six Bloom-level counts. One session is {assessment.sessionMinutes || 60} minutes.</p>
      {!validTos && <p className="tos-warning">{tosProblem}</p>}
    </section>}
    {tab === "test" && <section className="assessment-panel"><div className="panel-heading"><div><h2>Summative Test</h2><p>Edit, regenerate, delete, or reorder individual questions.</p></div><div className="panel-actions"><ExportButtons assessment={assessment} part="test"/>{validTos && <button className="secondary-btn" onClick={generateTest}><RefreshCw/>{method === "prompt" ? "Generate Prompt" : "Regenerate all"}</button>}</div></div>{assessment.questions.length ? <AssessmentQuestions assessment={assessment} editing={editing} onToggleEdit={id => setEditing(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} onPatch={patchQuestion} onRegenerate={regenerate} onMove={move} onRemove={remove}/> : <EmptyTest onGenerate={generateTest} promptMode={method === "prompt"} disabled={!validTos || !!difficultyError(assessment.difficulty || defaultDifficulty)}/>}</section>}
    {tab === "answer" && <section className="assessment-panel"><div className="panel-heading"><div><h2>Answer Key</h2><p>Answers update automatically whenever a question changes.</p></div><ExportButtons assessment={assessment} part="answer-key" /></div>{assessment.questions.length ? <div className="answer-grid">{assessment.questions.map((item) => <div key={item.id}><b>{item.number}.</b><span>{item.correctAnswer}</span><small>{item.bloomLevel}</small></div>)}</div> : <EmptyTest onGenerate={generateTest} promptMode={method === "prompt"} disabled={!validTos} />}</section>}
    </fieldset>
  </div>;
}

function EmptyTest({ onGenerate, disabled, promptMode }: { onGenerate: () => void; disabled: boolean; promptMode?: boolean }) { return <div className="empty-state"><ListChecks /><h3>No test generated yet</h3><p>Balance the TOS, then generate the exact number of questions and answer entries.</p><button className="primary-btn" onClick={onGenerate} disabled={disabled}><Sparkles />{promptMode ? "Generate Prompt" : "Generate Summative Test"}</button></div>; }

function ExportButtons({ assessment, part, blocked = false }: { assessment: Assessment; part: "test" | "answer-key" | "tos"; blocked?: boolean }) {
  const canExport=!blocked && (part==="tos" ? !tosError(assessment) : testIssues(assessment).length === 0);
  return <div className="export-menu"><button className="secondary-btn" disabled={!canExport}><Download />Export</button>{canExport&&<div>{part === "tos" && <><button onClick={() => exportTOSExcel(assessment,"standard")}><FileSpreadsheet/>Standard TOS (.xlsx)</button><button onClick={() => exportTOSExcel(assessment,"item-placement")}><FileSpreadsheet/>TOS with Item Placement (.xlsx)</button></>}<button onClick={() => exportAssessmentWord(assessment, part)}><FileText />Word (.docx)</button><button onClick={() => exportAssessmentPdf(assessment, part)}><FileText />PDF document</button><button onClick={() => printAssessment(assessment, part)}><Printer />Print</button></div>}</div>;
}
