"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Check, Download, FileSpreadsheet, FileText, ListChecks, Plus, Printer, RefreshCw, Save, Sparkles, Trash2 } from "lucide-react";
import { competencies, learningAreaLabel, learningAreaOptionLabel } from "@/data/curriculum";
import { Assessment, AssessmentCompetency, AssessmentSeed, AssessmentTerm, BloomLevel, TOSRow, TOSFormat, bloomLevels } from "@/types/assessment";
import { GradeLevel, LearningArea } from "@/types/lesson-plan";
import { createAssessment, generateQuestion, generateQuestions, generateTOS, normalizeTOS, rebuildTOSFromQuestions, tosTotal } from "@/services/assessment-generator";
import { exportAssessmentPdf, exportAssessmentWord, exportTOSExcel, printAssessment } from "@/services/assessment-export";
import { loadProfile } from "@/services/storage";
import { TOSTable } from "@/components/tos-table";

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
  const [totalItems, setTotalItems] = useState(40);
  const [schoolYear, setSchoolYear] = useState("2026–2027");
  const [sessionMinutes, setSessionMinutes] = useState(60);
  const [title, setTitle] = useState(seed?.title || "");
  const [selectedIds, setSelectedIds] = useState<string[]>(() => competencies.filter((item) => seed?.competencyTexts?.includes(item.text)).map((item) => item.id));
  const [manualCompetencies, setManualCompetencies] = useState<AssessmentCompetency[]>(() => (seed?.competencyTexts || []).filter((text) => !competencies.some((item) => item.text === text)).map((text, index) => ({ id: `manual-seed-${index}`, text, source: "manual" })));
  const [manualText, setManualText] = useState("");
  const [error, setError] = useState("");

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
    const chosen: AssessmentCompetency[] = [
      ...available.filter((item) => selectedIds.includes(item.id)).map((item) => ({ id: item.id, text: item.text, source: "official" as const })),
      ...manualCompetencies,
    ];
    if (!chosen.length) { setError("Select or add at least one learning competency."); return; }
    if (totalItems < 1 || totalItems > 200) { setError("Enter a total from 1 to 200 items."); return; }
    onCreate({ ...createAssessment({ title: title.trim() || `${learningAreaLabel(grade, subject)} Term ${term} Summative Test`, grade, subject, term, week: seed?.week, totalItems, competencies: chosen }), schoolYear, sessionMinutes, profile: loadProfile() });
  }

  return <form className="assessment-page" onSubmit={submit}>
    <div className="page-heading"><div><span className="eyebrow">Assessment setup</span><h1>Create a summative assessment.</h1><p>Select official competencies, generate an exact TOS, then build and edit the test.</p></div><button type="button" className="secondary-btn" onClick={onBack}><ArrowLeft />Back</button></div>
    <div className="assessment-setup-grid"><section className="form-card">
      <div className="card-heading"><span>1</span><div><h2>Assessment details</h2><p>Curriculum choices use the same ILAW competency database.</p></div></div>
      <div className="field-grid three"><label>Grade Level<select value={grade} onChange={(event) => changeGrade(Number(event.target.value) as GradeLevel)}>{[7,8,9,10].map((item) => <option key={item} value={item}>Grade {item}</option>)}</select></label><label>Subject<select value={subject} onChange={(event) => changeSubject(event.target.value as LearningArea)}>{subjects.map((item) => <option key={item} value={item}>{learningAreaOptionLabel(item)}</option>)}</select></label><label>Type of Test<input value="Summative Test" readOnly /></label><label>Term<select value={term} onChange={(event) => { setTerm(Number(event.target.value) as AssessmentTerm); setSelectedIds([]); }}><option value={1}>Term 1</option><option value={2}>Term 2</option><option value={3}>Term 3</option></select></label><label>Total Items<input type="number" min={1} max={200} value={totalItems} onChange={(event) => setTotalItems(Number(event.target.value))} /></label><label>Assessment Title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`${learningAreaLabel(grade, subject)} Summative Test`} /></label></div>
      <div className="field-grid"><label>School Year<input value={schoolYear} onChange={event=>setSchoolYear(event.target.value)}/></label><label>Minutes per session<input type="number" min={1} max={240} value={sessionMinutes} onChange={event=>setSessionMinutes(Math.max(1,Number(event.target.value)||60))}/></label></div>
    </section><section className="form-card">
      <div className="card-heading"><span>2</span><div><h2>Learning competencies</h2><p>Official wording is locked and saved with the assessment.</p></div></div>
      <div className="competency-toolbar"><div><b>{available.length} available</b><small>{selectedIds.length + manualCompetencies.length} selected</small></div><button type="button" className="secondary-btn" onClick={() => setSelectedIds(allSelected ? [] : available.map((item) => item.id))}><Check />{allSelected ? "Clear official" : "Select all"}</button></div>
      <div className="assessment-competencies">{available.map((item) => <label className={`competency ${selectedIds.includes(item.id) ? "selected" : ""}`} key={item.id}><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => setSelectedIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} /><span className="check"><Check /></span><span><b>OFFICIAL · {item.weeks.map((week) => `Week ${week}`).join(", ")}</b>{item.text}</span></label>)}</div>
      <div className="manual-competency"><label>Add a competency manually<div><textarea value={manualText} onChange={(event) => setManualText(event.target.value)} placeholder="Enter competency exactly as it should appear." /><button type="button" className="secondary-btn" onClick={addManual}><Plus />Add</button></div></label>{manualCompetencies.map((item) => <div className="manual-chip" key={item.id}><span><b>MANUAL</b>{item.text}</span><button type="button" onClick={() => setManualCompetencies((current) => current.filter((entry) => entry.id !== item.id))} aria-label="Remove manual competency"><Trash2 /></button></div>)}</div>
      {error && <p className="form-error">{error}</p>}
      <div className="setup-submit"><span><Check />Competency snapshots will preserve today&apos;s wording.</span><button className="primary-btn" type="submit"><ListChecks />Generate TOS</button></div>
    </section></div>
  </form>;
}

function AssessmentWorkspace({ assessment, onChange, onSave, onBack }: { assessment: Assessment; onChange: (value: Assessment) => void; onSave: (value: Assessment) => void; onBack: () => void }) {
  const [tab, setTab] = useState<"test" | "answer" | "tos">(assessment.questions.length ? "test" : "tos");
  const [editing, setEditing] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState("");
  const actualTotal = tosTotal(assessment.tos);
  const validTos = actualTotal === assessment.totalItems && actualTotal > 0;

  function update(patch: Partial<Assessment>) { onChange({ ...assessment, ...patch, updatedAt: new Date().toISOString() }); }
  function save() { const next = { ...assessment, updatedAt: new Date().toISOString() }; onChange(next); onSave(next); setNotice("Assessment saved on this device."); }
  function setRows(rows: TOSRow[]) { update({ tos: normalizeTOS(rows, assessment.totalItems), questions: [] }); setNotice("TOS changed. Generate the test again when the total is balanced."); }
  function patchRow(index: number, patch: Partial<TOSRow>) { setRows(assessment.tos.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row)); }
  function patchBloom(index: number, level: BloomLevel, value: number) { const row = assessment.tos[index]; patchRow(index, { distribution: { ...row.distribution, [level]: Math.max(0, Math.floor(value || 0)) } }); }
  function autoBalance() { update({ tosMode: "automatic", tos: generateTOS(assessment.competencies, assessment.totalItems, assessment.tos.map((row) => row.teachingDays)), questions: [] }); setNotice("Automatic distribution balanced the TOS exactly."); }
  function generateTest() { if (!validTos) { setNotice(`Adjust the TOS to exactly ${assessment.totalItems} items first.`); return; } const questions = generateQuestions(assessment.tos); update({ questions }); setTab("test"); setNotice(`${questions.length} questions and the answer key were generated.`); }
  function patchQuestion(id: string, patch: Partial<Assessment["questions"][number]>) { const questions = assessment.questions.map((item) => item.id === id ? { ...item, ...patch } : item); update({ questions, tos: rebuildTOSFromQuestions(assessment.tos, questions) }); }
  function regenerate(index: number) { const current = assessment.questions[index]; const next = generateQuestion(current.competencyId, current.competency, current.bloomLevel, current.number, current.revision + 1); const questions = assessment.questions.map((item, itemIndex) => itemIndex === index ? next : item); update({ questions, tos: rebuildTOSFromQuestions(assessment.tos, questions) }); setNotice(`Item ${current.number} was regenerated. Other items were unchanged.`); }
  function move(index: number, direction: -1 | 1) { const target = index + direction; if (target < 0 || target >= assessment.questions.length) return; const questions = [...assessment.questions]; [questions[index], questions[target]] = [questions[target], questions[index]]; questions.forEach((item, itemIndex) => { item.number = itemIndex + 1; }); update({ questions, tos: rebuildTOSFromQuestions(assessment.tos, questions) }); }
  function remove(index: number) { const questions = assessment.questions.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, number: itemIndex + 1 })); const totalItems = questions.length; update({ questions, totalItems, tos: rebuildTOSFromQuestions(assessment.tos, questions) }); setNotice(`Item deleted. The assessment and TOS now contain ${totalItems} items.`); }

  return <div className="assessment-page assessment-workspace">
    <div className="assessment-toolbar"><button className="text-btn" onClick={onBack}><ArrowLeft />Assessments</button><div><input value={assessment.title} onChange={(event) => update({ title: event.target.value })} /><span>{learningAreaLabel(assessment.grade, assessment.subject)} · Term {assessment.term}{assessment.week ? ` · Week ${assessment.week}` : ""}</span></div><button className="secondary-btn" onClick={save}><Save />Save assessment</button></div>
    <section className="assessment-summary"><div><span className="eyebrow">Summative test</span><h1>{assessment.title}</h1><p>{assessment.competencies.length} competencies · {assessment.totalItems} items · Revised Bloom&apos;s Taxonomy</p></div><div className={`total-check ${validTos ? "valid" : "invalid"}`}><b>{actualTotal} / {assessment.totalItems}</b><span>{validTos ? "TOS balanced" : "TOS needs adjustment"}</span></div></section>
    <div className="assessment-tabs"><button className={tab === "test" ? "active" : ""} onClick={() => setTab("test")}>TEST <span>{assessment.questions.length}</span></button><button className={tab === "answer" ? "active" : ""} onClick={() => setTab("answer")}>ANSWER KEY</button><button className={tab === "tos" ? "active" : ""} onClick={() => setTab("tos")}>TOS</button></div>
    {notice && <div className="assessment-notice"><Check />{notice}<button onClick={() => setNotice("")}>×</button></div>}
    {tab === "tos" && <section className="assessment-panel">
      <div className="panel-heading"><div><h2>Table of Specifications</h2><p>Choose the sample format. Item placement follows each question&apos;s competency and Bloom level.</p></div>
        <div className="panel-actions"><label className="tos-format-select">TOS format<select value={assessment.tosFormat || "standard"} onChange={event=>update({tosFormat:event.target.value as TOSFormat})}><option value="standard">Standard TOS</option><option value="item-placement">TOS with Item Placement</option></select></label>
          <div className="mode-toggle"><button className={assessment.tosMode === "automatic" ? "active" : ""} onClick={autoBalance}>Automatic</button><button className={assessment.tosMode === "manual" ? "active" : ""} onClick={() => update({ tosMode: "manual" })}>Manual</button></div>
          <ExportButtons assessment={assessment} part="tos"/><button className="primary-btn" disabled={!validTos} onClick={generateTest}><Sparkles/>Generate Summative Test</button>
        </div>
      </div>
      <TOSTable assessment={assessment} onBloomChange={patchBloom} onSessionsChange={(rowIndex,sessions)=> {
        const rows=assessment.tos.map((row,index)=>index===rowIndex?{...row,teachingDays:sessions}:row);
        if(assessment.tosMode==="automatic") update({tos:generateTOS(assessment.competencies,assessment.totalItems,rows.map(row=>row.teachingDays)),questions:[]}); else setRows(rows);
      }}/>
      <p className="tos-explanation">Computed = teaching-time share × total items. Adjusted = the sum of the six Bloom-level counts. One session is {assessment.sessionMinutes || 60} minutes.</p>
      {!validTos && <p className="tos-warning">The TOS currently has {actualTotal} items. Adjust the manual counts to exactly {assessment.totalItems}, or use Automatic distribution.</p>}
    </section>}
    {tab === "test" && <section className="assessment-panel"><div className="panel-heading"><div><h2>Summative Test</h2><p>Edit, regenerate, delete, or reorder individual questions.</p></div><div className="panel-actions"><ExportButtons assessment={assessment} part="test" />{validTos && <button className="secondary-btn" onClick={generateTest}><RefreshCw />Regenerate all</button>}</div></div>{assessment.questions.length ? <div className="question-list">{assessment.questions.map((item, index) => { const isEditing = editing.has(item.id); return <article className="question-card" key={item.id}><div className="question-number">{item.number}</div><div className="question-content"><div className="question-meta"><span>{item.bloomLevel}</span><span title={item.competency}>{item.competency}</span></div>{isEditing ? <><textarea value={item.question} onChange={(event) => patchQuestion(item.id, { question: event.target.value })} />{(["A", "B", "C", "D"] as const).map((letter) => <label className="choice-editor" key={letter}><input type="radio" name={`answer-${item.id}`} checked={item.correctAnswer === letter} onChange={() => patchQuestion(item.id, { correctAnswer: letter })} /><b>{letter}</b><input value={item.choices[letter]} onChange={(event) => patchQuestion(item.id, { choices: { ...item.choices, [letter]: event.target.value } })} /></label>)}<div className="question-taxonomy"><label>Competency<select value={item.competencyId} onChange={(event) => { const competency = assessment.competencies.find((entry) => entry.id === event.target.value); if (competency) patchQuestion(item.id, { competencyId: competency.id, competency: competency.text }); }}>{assessment.competencies.map((entry) => <option key={entry.id} value={entry.id}>{entry.text}</option>)}</select></label><label>Bloom Level<select value={item.bloomLevel} onChange={(event) => patchQuestion(item.id, { bloomLevel: event.target.value as BloomLevel })}>{bloomLevels.map((level) => <option key={level}>{level}</option>)}</select></label></div></> : <><h3>{item.question}</h3><ol className="question-options">{(["A", "B", "C", "D"] as const).map((letter) => <li className={item.correctAnswer === letter ? "correct" : ""} key={letter}><b>{letter}</b>{item.choices[letter]}</li>)}</ol></>}<div className="question-actions"><button onClick={() => setEditing((current) => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })}><FileText />{isEditing ? "Done" : "Edit"}</button><button onClick={() => regenerate(index)}><RefreshCw />Regenerate Item</button><button onClick={() => move(index, -1)} disabled={index === 0}><ArrowUp />Move Up</button><button onClick={() => move(index, 1)} disabled={index === assessment.questions.length - 1}><ArrowDown />Move Down</button><button className="delete" onClick={() => remove(index)}><Trash2 />Delete</button></div></div></article>; })}</div> : <EmptyTest onGenerate={generateTest} disabled={!validTos} />}</section>}
    {tab === "answer" && <section className="assessment-panel"><div className="panel-heading"><div><h2>Answer Key</h2><p>Answers update automatically whenever a question changes.</p></div><ExportButtons assessment={assessment} part="answer-key" /></div>{assessment.questions.length ? <div className="answer-grid">{assessment.questions.map((item) => <div key={item.id}><b>{item.number}.</b><span>{item.correctAnswer}</span><small>{item.bloomLevel}</small></div>)}</div> : <EmptyTest onGenerate={generateTest} disabled={!validTos} />}</section>}
  </div>;
}

function EmptyTest({ onGenerate, disabled }: { onGenerate: () => void; disabled: boolean }) { return <div className="empty-state"><ListChecks /><h3>No test generated yet</h3><p>Balance the TOS, then generate the exact number of questions and answer entries.</p><button className="primary-btn" onClick={onGenerate} disabled={disabled}><Sparkles />Generate Summative Test</button></div>; }

function ExportButtons({ assessment, part }: { assessment: Assessment; part: "test" | "answer-key" | "tos" }) {
  const canExport=part!=="tos" || (assessment.totalItems>0 && tosTotal(assessment.tos)===assessment.totalItems);
  return <div className="export-menu"><button className="secondary-btn" disabled={!canExport}><Download />Export</button>{canExport&&<div>{part === "tos" && <><button onClick={() => exportTOSExcel(assessment,"standard")}><FileSpreadsheet/>Standard TOS (.xlsx)</button><button onClick={() => exportTOSExcel(assessment,"item-placement")}><FileSpreadsheet/>TOS with Item Placement (.xlsx)</button></>}<button onClick={() => exportAssessmentWord(assessment, part)}><FileText />Word (.docx)</button><button onClick={() => exportAssessmentPdf(assessment, part)}><FileText />PDF document</button><button onClick={() => printAssessment(assessment, part)}><Printer />Print</button></div>}</div>;
}
