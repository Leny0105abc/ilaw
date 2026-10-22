"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download, FileText, Printer, Save, Sparkles } from "lucide-react";
import { GradeLevel, LearningArea, LessonPlan, Term } from "@/types/lesson-plan";
import { LearningActivitySheets, LasSheet, LasActivityType, lasActivityLabels } from "@/types/las";
import { buildLasPrompt, importLasResponse, validateLas, lasMultipleChoiceCount, lasActivityCounts, lasExpectedMixedCounts, LAS_MIXED_PRESET } from "@/services/las-generator";
import { competencies, learningAreaLabel, learningAreaOptionLabel, termLabel } from "@/data/curriculum";
import { LasPart, lasQuestionNumber, lasQuestionPrompt, lasTaskAnswer } from "@/services/las-export";
import { generateLasFromSetup, lasCompetencies, lasGenerationKey, lasSetupReady, LasGenerationSetup } from "@/services/las-setup";
import { loadProfile } from "@/services/storage";

type Props = { plans: LessonPlan[]; seed?: LessonPlan | null; initial?: LearningActivitySheets | null; onSave: (value: LearningActivitySheets) => void; onBack: () => void };
export function LasBuilder({ plans, seed, initial, onSave, onBack }: Props) {
  const source = seed || initial?.sourcePlan;
  const [setupMode, setSetupMode] = useState<"curriculum" | "lesson">(source ? "lesson" : "curriculum");
  const [grade, setGrade] = useState<GradeLevel>(source?.grade || 8);
  const [area, setArea] = useState<LearningArea>(source?.area || "Family and Consumer Science");
  const [term, setTerm] = useState<Term>(source?.term || 2);
  const [week, setWeek] = useState(source?.week || 1);
  const [chosenIds, setChosenIds] = useState<string[]>([]);
  const [activityType, setActivityType] = useState<LasActivityType | "mixed">(initial?.activityType || "mixed");
  const [sourceId, setSourceId] = useState(seed?.id || initial?.sourcePlan.id || "");
  const [selected, setSelected] = useState<number[]>(initial?.selectedSessions || seed?.sessions.map(s => s.session) || [1,2,3,4]);
  const [draft, setDraft] = useState<LearningActivitySheets | null>(initial || null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [mode, setMode] = useState<"edit" | "student" | "teacher">("edit");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [protectedDraft, setProtectedDraft] = useState(!!initial);
  const [replacementKey, setReplacementKey] = useState<string | null>(null);
  const [pageInfo, setPageInfo] = useState<{ student: number; teacher: number } | null>(null);
  const busyRef = useRef(false);
  const workflowRef = useRef<HTMLElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const lesson = (seed?.id === sourceId ? seed : plans.find(p => p.id === sourceId)) || (initial?.sourcePlan.id === sourceId ? initial.sourcePlan : null);
  const areas = useMemo(() => [...new Set(competencies.filter(c => c.grade === grade).map(c => c.area))], [grade]);
  const terms = useMemo(() => [...new Set(competencies.filter(c => c.grade === grade && c.area === area).map(c => c.term))], [grade, area]);
  const weeks = useMemo(() => [...new Set(competencies.filter(c => c.grade === grade && c.area === area && c.term === term).flatMap(c => c.weeks))].sort((a, b) => a - b), [grade, area, term]);
  const available = useMemo(() => lasCompetencies(grade, area, term, week), [grade, area, term, week]);
  const selectedCompetencies = useMemo(() => available.filter(c => chosenIds.includes(c.id)), [available, chosenIds]);
  const setup = useMemo<LasGenerationSetup>(() => setupMode === "lesson"
    ? { mode: "lesson", lesson, sessions: selected, activityType }
    : { mode: "curriculum", grade, area, term, week, selected: selectedCompetencies, sessions: selected, activityType },
    [setupMode, lesson, selected, activityType, grade, area, term, week, selectedCompetencies]);
  const setupKey = lasGenerationKey(setup);
  const ready = lasSetupReady(setup);
  const [generatedSetupKey, setGeneratedSetupKey] = useState(initial ? setupKey : "");
  const setupChanged = !!draft && generatedSetupKey !== setupKey;
  const applyGenerated = useCallback((next: LearningActivitySheets, key: string, automatic: boolean) => {
    setDraft(next); setGeneratedSetupKey(key); setProtectedDraft(false); setReplacementKey(null); setSheetIndex(0); setMode("edit"); setPrompt(""); setResponse(""); setError("");
    setNotice(`${automatic ? "LAS activities generated automatically." : "LAS activities regenerated."} Review and adapt the starter activities, or optionally enhance them using the AI prompt. All selected sessions must fit within 3 pages.`);
  }, []);
  useEffect(() => {
    if (!ready || protectedDraft || generatedSetupKey === setupKey) return;
    // Allow consecutive checkbox/dropdown changes to settle; cleanup cancels stale work.
    const timer = window.setTimeout(() => {
      try { applyGenerated(generateLasFromSetup(setup, loadProfile()), setupKey, true); }
      catch (e) { setError(e instanceof Error ? e.message : "LAS could not be generated. Check the setup and try again."); }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [setup, setupKey, ready, protectedDraft, generatedSetupKey, applyGenerated]);
  const sessionNumbers = setupMode === "lesson" ? lesson?.sessions.map(s => s.session) || [] : [1, 2, 3, 4];
  const sheet = draft?.sheets[sheetIndex];
  const mcCount = draft ? lasMultipleChoiceCount(draft) : 0;
  const mixedCounts = draft?.mixedPreset ? lasActivityCounts(draft) : null;
  const expectedMixedCounts = draft?.mixedPreset ? lasExpectedMixedCounts(draft) : null;
  const validMixedCounts = !mixedCounts || !expectedMixedCounts || Object.entries(expectedMixedCounts).every(([type, count]) => mixedCounts[type as LasActivityType] === count);
  useEffect(() => {
    let cancelled = false;
    setPageInfo(null);
    if (draft) void import("@/services/las-export").then(async e => {
      const [student, teacher] = await Promise.all([e.lasPageCount(draft), e.lasPageCount(draft, "teacher")]);
      if (!cancelled) setPageInfo({ student, teacher });
    }).catch(() => { if (!cancelled) setPageInfo(null); });
    return () => { cancelled = true; };
  }, [draft]);
  function changeCurriculum(nextGrade: GradeLevel, nextArea?: LearningArea, nextTerm?: Term) {
    const options = competencies.filter(c => c.grade === nextGrade && (!nextArea || c.area === nextArea));
    const next = options.find(c => c.term === nextTerm) || options[0];
    if (!next) return;
    setGrade(nextGrade); setArea(next.area); setTerm(next.term); setWeek(Math.min(...options.filter(c => c.area === next.area && c.term === next.term).flatMap(c => c.weeks))); setChosenIds([]);
  }
  const report = (e: unknown) => { setError(e instanceof Error ? e.message : "The action failed. Your LAS draft is still available."); requestAnimationFrame(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })); };
  function edit(patch: Partial<LearningActivitySheets>) {
    if (draft) { setProtectedDraft(true); setReplacementKey(null); setDraft({ ...draft, ...patch, teacherReviewed: false, updatedAt: new Date().toISOString() }); setNotice(""); }
  }
  function editSheet(patch: Partial<LasSheet>) {
    if (draft) edit({ sheets: draft.sheets.map((s, i) => i === sheetIndex ? { ...s, ...patch } : s) });
  }
  function generate(confirmed = false) {
    setError("");
    try {
      if (draft && protectedDraft && !confirmed) { setReplacementKey(setupKey); return; }
      applyGenerated(generateLasFromSetup(setup, loadProfile()), setupKey, false);
    } catch (e) { report(e); }
  }
  async function save() {
    setError("");
    setProtectedDraft(true);
    try { if (!draft) return; validateLas(draft); const e = await import("@/services/las-export"); await e.assertLasPageLimit(draft); onSave(draft); setNotice("LAS saved on this device. Use Saved LAS to reopen it."); } catch (e) { report(e); }
  }
  function showPrompt() {
    setError("");
    setProtectedDraft(true);
    try { if (!draft) return; setPrompt(buildLasPrompt(draft)); setResponse(""); setNotice(""); requestAnimationFrame(() => workflowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })); } catch (e) { report(e); }
  }
  async function importResponse() {
    setError("");
    setProtectedDraft(true);
    try { if (!draft) return; const next = importLasResponse(draft, response); const e = await import("@/services/las-export"); await e.assertLasPageLimit(next); setDraft(next); setPrompt(""); setResponse(""); setSheetIndex(0); setMode("edit"); setNotice("LAS imported. Review the student sheets and teacher answers, then save and export."); } catch (e) { report(e); }
  }
  async function exportFile(part: LasPart, format: "docx" | "pdf" | "print") {
    if (!draft || busyRef.current) return;
    setProtectedDraft(true);
    busyRef.current = true; setBusy(true); setError("");
    // Open print window synchronously, before the asynchronous module import.
    const popup = format === "print" && draft.teacherReviewed ? window.open("", "_blank") : null;
    try {
      const e = await import("@/services/las-export");
      e.assertLasReviewed(draft);
      if (format === "print") {
        if (!popup) throw new Error("The print window was blocked. Allow pop-ups for ILAW, then try again.");
        popup.document.write(await e.lasPrintHtml(draft, part)); popup.document.close(); popup.focus(); popup.print();
      } else {
        const bytes = format === "docx" ? await e.buildLasWord(draft, part) : await e.buildLasPdf(draft, part);
        e.downloadLas(bytes, e.lasFilename(draft, part, format), format === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf");
      }
      setNotice(part === "student" ? "Student LAS prepared without teacher answers." : "Teacher answer guide prepared. Keep this copy separate from student sheets.");
    } catch (err) { popup?.close(); report(err); } finally { busyRef.current = false; setBusy(false); }
  }
  return <div className="las-page">
    <div className="las-toolbar"><button className="text-btn" onClick={onBack}><ArrowLeft />Saved LAS</button><div><span className="eyebrow">Learning Activity Sheets</span><h1>{draft ? "Review and edit LAS" : "Create LAS"}</h1></div>{draft && <button className="primary-btn" onClick={save}><Save />Save LAS</button>}</div>
    <section className="las-card"><h2>1. LAS setup</h2><p>Choose curriculum details or reuse a saved lesson. Official competency wording is preserved. Student LAS and the separate teacher guide each have a maximum of 3 A4 pages.</p>
      <label>Create from<select value={setupMode} onChange={e => setSetupMode(e.target.value as typeof setupMode)}><option value="curriculum">Curriculum — grade, learning area, term and week</option><option value="lesson">Existing lesson plan</option></select></label>
      {setupMode === "curriculum" ? <>
        <div className="las-setup-grid"><label>Grade Level<select value={grade} onChange={e => changeCurriculum(Number(e.target.value) as GradeLevel)}>{[7,8,9,10].map(n => <option value={n} key={n}>Grade {n}</option>)}</select></label>
        <label>Learning Area<select value={area} onChange={e => changeCurriculum(grade, e.target.value as LearningArea)}>{areas.map(a => <option value={a} key={a}>{learningAreaOptionLabel(a)}</option>)}</select></label>
        <label>Term<select value={term} onChange={e => changeCurriculum(grade, area, e.target.value === "one-term" ? "one-term" : Number(e.target.value) as Term)}>{terms.map(t => <option value={t} key={t}>{termLabel(t)}</option>)}</select></label>
        <label>Week<select value={week} onChange={e => { setWeek(Number(e.target.value)); setChosenIds([]); }}>{weeks.map(w => <option value={w} key={w}>Week {w}</option>)}</select></label></div>
        <div className="las-actions"><h3>Learning competencies</h3><span>{available.length} available · {selectedCompetencies.length} selected</span><button className="secondary-btn" disabled={!available.length} onClick={() => setChosenIds(selectedCompetencies.length === available.length ? [] : available.map(c => c.id))}>{selectedCompetencies.length === available.length && available.length ? "Clear selection" : "Select all competencies"}</button></div>
        <fieldset className="las-competencies"><legend>All competencies for the selected week</legend>{available.map(c => <label key={c.id}><input type="checkbox" checked={chosenIds.includes(c.id)} onChange={e => setChosenIds(ids => e.target.checked ? [...ids, c.id] : ids.filter(id => id !== c.id))} /><span>{c.text}</span></label>)}{!available.length && <p>No competencies in the existing curriculum for this selection. Choose another week or reuse a lesson with its competency snapshot.</p>}</fieldset>
      </> : <>
      <label>Source lesson<select value={sourceId} onChange={e => { const id = e.target.value; const p = plans.find(p => p.id === id) || (seed?.id === id ? seed : initial?.sourcePlan.id === id ? initial.sourcePlan : null); setSourceId(id); setSelected(p?.sessions.map(s => s.session) || []); }}><option value="">Select a lesson plan</option>{seed && !plans.some(p => p.id === seed.id) && <option value={seed.id}>{seed.title}</option>}{initial && !plans.some(p => p.id === initial.sourcePlan.id) && seed?.id !== initial.sourcePlan.id && <option value={initial.sourcePlan.id}>{initial.sourcePlan.title} (saved snapshot)</option>}{plans.map(p => <option key={p.id} value={p.id}>{learningAreaLabel(p.grade, p.area)} · {p.title} · Week {p.week}</option>)}</select></label>
      {!plans.length && !seed && !initial && <p>Create and save a lesson plan first, then use its Create LAS button.</p>}
      {lesson && <><p><b>{learningAreaLabel(lesson.grade, lesson.area)}</b> · {termLabel(lesson.term)} · Week {lesson.week} · {lesson.schoolYear}</p><label>Learning Competency (official wording)<textarea readOnly value={lesson.competencyText} /></label></>}
      </>}
      <fieldset className="las-session-choice"><legend>Sessions to include (choose one or more)</legend>{sessionNumbers.map(n => <label key={n}><input type="checkbox" checked={selected.includes(n)} onChange={e => setSelected(current => e.target.checked ? [...current, n] : current.filter(s => s !== n))} />Session {n}</label>)}</fieldset>
      <label>Learning activity type<select value={activityType} onChange={e => setActivityType(e.target.value as typeof activityType)}><option value="mixed">Mixed activities</option>{Object.entries(lasActivityLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      {activityType === "multiple-choice" && <p>At least 10 multiple-choice questions per LAS, distributed across the selected sessions (not 10 per session). The combined three-page limit still applies.</p>}
      {activityType === "mixed" && <p>Mixed sequence: Lesson 1 — 5 True or False; Lesson 2 — 5 Matching type; Lesson 3 — 5 Multiple choice; Lesson 4 — 5 Identification. Four lessons contain 20 questions, with no essays. Each selected lesson keeps its assigned type and five questions.</p>}
      <p role="status">{!ready ? "Choose at least one competency or a source lesson, and one or more sessions. LAS activities will appear automatically when the setup is complete." : protectedDraft ? "Your edited, saved, reviewed, or AI-prepared draft is protected from automatic replacement." : "Automatic generation is on. Activities update when you change the setup; no Generate click or AI JSON is required."}</p>
      {setupChanged && <p className="las-notice" role="status">The setup has changed. {protectedDraft ? "Your current draft is unchanged. Click Apply changed setup to replace it after confirmation, or keep editing/downloading the current draft with its original details." : ready ? "Updating activities automatically…" : "Complete the setup to update the activities. The previous draft is still available."}</p>}
      <button className="primary-btn" disabled={!ready} onClick={() => generate()}><Sparkles />{!draft ? "Generate LAS now" : setupChanged ? "Apply changed setup" : "Regenerate LAS"}</button>
      {replacementKey === setupKey && <div className="las-notice" role="alert"><p>Replace the current LAS with new activities for the selected setup? Save or download your current work first. The source lesson and any previously saved copy will not change until you save again.</p><div className="las-actions"><button className="primary-btn" onClick={() => generate(true)}>Replace draft with new activities</button><button className="secondary-btn" onClick={() => setReplacementKey(null)}>Keep current draft</button></div></div>}
    </section>
    {error && <p ref={errorRef} className="form-error" role="alert">{error}</p>}{notice && <p className="las-notice" role="status">{notice}</p>}
    {draft && sheet && <>
      {mixedCounts && <p className={validMixedCounts ? "las-notice" : "form-error"} role="status">Mixed activities: {draft.sheets.reduce((n,s)=>n+s.tasks.length,0)} questions across {draft.sheets.length} selected lesson(s) — {draft.mixedPreset === LAS_MIXED_PRESET ? draft.sheets.map(s => `Lesson ${s.session}: ${s.tasks.length} ${lasActivityLabels[s.tasks[0].type!]}`).join("; ") : `${mixedCounts["multiple-choice"]} multiple choice, ${mixedCounts.matching} matching, ${mixedCounts["true-false"]} true/false, ${mixedCounts.identification} identification, ${mixedCounts.essay} essay. This saved LAS uses the previous 22-question preset; regenerate to apply the new lesson sequence`}. Counts and types are fixed by the preset; every question and answer remains editable.</p>}
      {draft.minimumMultipleChoiceQuestions && <p className={mcCount < draft.minimumMultipleChoiceQuestions ? "form-error" : "las-notice"} role="status">{mcCount} multiple-choice questions across {draft.sheets.length} selected session(s). Minimum: {draft.minimumMultipleChoiceQuestions} questions. {mcCount < draft.minimumMultipleChoiceQuestions ? "Add multiple-choice questions or regenerate to restore the minimum." : "Questions include four choices and a separate teacher answer key."}</p>}
      <p className={pageInfo && (pageInfo.student > 3 || pageInfo.teacher > 3) ? "form-error" : "las-notice"} role="status">{pageInfo ? `Page limit: Student LAS ${pageInfo.student}/3 · Teacher guide ${pageInfo.teacher}/3. ${pageInfo.student > 3 || pageInfo.teacher > 3 ? "Shorten the content or answer spaces before saving/exporting. Nothing is cut off." : "All selected sessions are included in this count."}` : "Calculating the A4 page count…"}</p>
      <section className="las-card"><h2>2. Review student sheets and teacher answers</h2><p>Generated activities are drafts, not official DepEd-issued materials. Check factual accuracy and suitability before giving them to students.</p>
        <label>LAS title<input value={draft.title} onChange={e => edit({ title: e.target.value })} /></label>
        <div className="las-tabs" role="group" aria-label="LAS sessions">{draft.sheets.map((s, i) => <button key={s.session} aria-pressed={sheetIndex === i} className={sheetIndex === i ? "active" : ""} onClick={() => setSheetIndex(i)}>Session {s.session}</button>)}</div>
        <div className="las-tabs" role="group" aria-label="LAS view">{([ ["edit", "Edit content"], ["student", "Student preview"], ["teacher", "Teacher answer guide"] ] as const).map(([id, label]) => <button key={id} aria-pressed={mode === id} className={mode === id ? "active" : ""} onClick={() => setMode(id)}>{label}</button>)}</div>
        {mode === "edit" ? <div className="las-fields">
          <label>Sheet title<input value={sheet.title} onChange={e => editSheet({ title: e.target.value })} /></label>
          <label>Learning Competency (official wording, read-only)<textarea value={draft.sourcePlan.competencyText} readOnly /></label>
          <label>Learning Objectives (one per line)<textarea value={sheet.objectives.join("\n")} onChange={e => editSheet({ objectives: e.target.value.split("\n") })} /></label>
          <label>Learning Resources<textarea value={sheet.materials} onChange={e => editSheet({ materials: e.target.value })} /></label>
          <label>Student directions<textarea value={sheet.directions} onChange={e => editSheet({ directions: e.target.value })} /></label>
          <label>Learning Notes (optional)<textarea value={sheet.reading} placeholder="Add a short reading, examples, or a worked example for students." onChange={e => editSheet({ reading: e.target.value })} /></label>
          {sheet.tasks.map((task, i) => <fieldset className="las-task" key={task.id}><legend>{draft.mixedPreset || task.type === "multiple-choice" ? "Question" : "Activity"} {draft.mixedPreset || task.type === "multiple-choice" ? lasQuestionNumber(draft,sheetIndex,i) : i+1}</legend>
            <label>Activity type<select disabled={!!draft.mixedPreset} value={task.type || "essay"} onChange={e => { const type = e.target.value as LasActivityType; editSheet({ tasks: sheet.tasks.map(t => t.id === task.id ? { ...t, type, options: type === "multiple-choice" ? t.options || ["", "", "", ""] : undefined, correctOption: type === "multiple-choice" ? t.correctOption ?? 0 : undefined, matchingChoices: type === "matching" ? t.matchingChoices : undefined, matchingAnswer: type === "matching" ? t.matchingAnswer : undefined, truthValue: type === "true-false" ? t.truthValue : undefined } : t) }); }}>{Object.entries(lasActivityLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
            <label>Student task<textarea value={lasQuestionPrompt(task.prompt)} onChange={e => editSheet({ tasks: sheet.tasks.map(t => t.id === task.id ? { ...t, prompt: e.target.value } : t) })} /></label>
            {task.type === "multiple-choice" && <><div className="las-setup-grid">{(task.options || ["", "", "", ""]).map((option, optionIndex) => <label key={optionIndex}>Option {String.fromCharCode(65 + optionIndex)}<textarea value={option} onChange={e => editSheet({ tasks: sheet.tasks.map(t => t.id === task.id ? { ...t, options: (t.options || ["", "", "", ""]).map((o, j) => j === optionIndex ? e.target.value : o) } : t) })} /></label>)}</div><label>Correct answer (teacher only)<select value={task.correctOption ?? 0} onChange={e => editSheet({ tasks: sheet.tasks.map(t => t.id === task.id ? { ...t, correctOption: Number(e.target.value) } : t) })}>{[0,1,2,3].map(n => <option value={n} key={n}>{String.fromCharCode(65 + n)}</option>)}</select></label></>}
            {task.matchingChoices && <><label>Matching choices (one per line)<textarea value={task.matchingChoices.join("\n")} onChange={e => editSheet({tasks:sheet.tasks.map(t=>t.id===task.id?{...t,matchingChoices:e.target.value.split("\n")}:t)})}/></label><label>Correct matching choice (teacher only)<select value={task.matchingAnswer ?? 0} onChange={e=>editSheet({tasks:sheet.tasks.map(t=>t.id===task.id?{...t,matchingAnswer:Number(e.target.value)}:t)})}>{task.matchingChoices.map((choice,j)=><option key={j} value={j}>{String.fromCharCode(65+j)}. {choice}</option>)}</select></label></>}
            {task.truthValue !== undefined && <label>Correct True or False answer (teacher only)<select value={String(task.truthValue)} onChange={e=>editSheet({tasks:sheet.tasks.map(t=>t.id===task.id?{...t,truthValue:e.target.value==="true"}:t)})}><option value="true">True / Tama</option><option value="false">False / Mali</option></select></label>}
            <label>Teacher answer / checking guide (not in student export)<textarea value={task.answer} onChange={e => editSheet({ tasks: sheet.tasks.map(t => t.id === task.id ? { ...t, answer: e.target.value } : t) })} /></label>
            {task.type === "multiple-choice" || (draft.mixedPreset && task.type !== "essay") ? <p>Student exports provide one answer field for this question.</p> : <label>Answer-space lines<input type="number" min={1} max={12} value={task.lines} onChange={e => editSheet({ tasks: sheet.tasks.map(t => t.id === task.id ? { ...t, lines: Number(e.target.value) } : t) })} /></label>}
            <button className="text-btn" disabled={!!draft.mixedPreset || sheet.tasks.length === 1 || !!(draft.minimumMultipleChoiceQuestions && task.type === "multiple-choice" && mcCount <= draft.minimumMultipleChoiceQuestions)} onClick={() => editSheet({ tasks: sheet.tasks.filter(t => t.id !== task.id) })}>Remove activity {i + 1}</button>
          </fieldset>)}
          <button className="secondary-btn" disabled={!!draft.mixedPreset || sheet.tasks.length >= 24} onClick={() => editSheet({ tasks: [...sheet.tasks, { id: crypto.randomUUID(), type: draft.activityType === "multiple-choice" ? "multiple-choice" : "essay", prompt: "", answer: "", lines: draft.activityType === "multiple-choice" ? 1 : 3, ...(draft.activityType === "multiple-choice" ? { options: ["", "", "", ""], correctOption: 0 } : {}) }] })}>Add activity</button>
          <label>Reflection<textarea value={sheet.reflection} onChange={e => editSheet({ reflection: e.target.value })} /></label>
        </div> : <LasPreview value={draft} index={sheetIndex} teacher={mode === "teacher"} />}
      </section>
      <section className="las-card"><h2>Optional: enhance the LAS using AI</h2><p>No API key is needed. Nothing is sent automatically. Teacher profile and section are excluded from the prompt; review lesson text for personal information before sharing.</p><button className="secondary-btn" onClick={showPrompt}><Sparkles />Generate LAS prompt</button></section>
      {prompt && <section ref={workflowRef} className="las-card las-workflow"><h2>Copy, generate, and import</h2><div className="las-actions"><button className="secondary-btn" onClick={async () => { try { await navigator.clipboard.writeText(prompt); setNotice("LAS prompt copied. Paste it into ChatGPT, Gemini, or Copilot."); } catch { setNotice("Select and copy the prompt below manually."); } }}>Copy LAS prompt</button>{[["ChatGPT", "https://chatgpt.com/"], ["Gemini", "https://gemini.google.com/"], ["Copilot", "https://copilot.microsoft.com/"]].map(([name, url]) => <a className="secondary-btn" href={url} target="_blank" rel="noopener noreferrer" key={name}>Open {name}</a>)}</div>
        <label>Step 1. Paste this prompt into ChatGPT, Gemini, or Copilot<textarea readOnly value={prompt} /></label>
        <label>Step 2. Copy its complete JSON reply and paste it here<textarea value={response} onChange={e => setResponse(e.target.value)} placeholder="Paste the entire JSON response, from the first { to the last }." /></label>
        <button className="primary-btn" disabled={!response.trim()} onClick={importResponse}>Import LAS activities</button><p>Step 3. Review each session and teacher answer. Then click Save LAS and confirm teacher review below to download.</p>
      </section>}
      <section className="las-card"><h2>3. Save and download</h2><label className="las-review"><input type="checkbox" checked={draft.teacherReviewed} onChange={e => { setProtectedDraft(true); setDraft({ ...draft, teacherReviewed: e.target.checked }); setNotice(""); }} />I reviewed every student activity, learning note, and teacher answer for accuracy, safety, and alignment.</label><p>Any content edit resets this review. Save stores LAS on this browser/device, like existing ILAW lesson plans. Downloads include all {draft.sheets.length} selected session(s) in the current draft.</p>
        <div className="las-actions"><button className="primary-btn" onClick={save}><Save />Save LAS</button></div>
        {([ ["student", "Student LAS (no answers)"], ["teacher", "Teacher answer guide (separate file)"] ] as const).map(([part, label]) => <div className="las-export-row" key={part}><b>{label}</b><div className="las-actions"><button className="secondary-btn" disabled={busy || !draft.teacherReviewed} onClick={() => void exportFile(part, "docx")}><FileText />Word (.docx)</button><button className="secondary-btn" disabled={busy || !draft.teacherReviewed} onClick={() => void exportFile(part, "pdf")}><Download />PDF</button><button className="secondary-btn" disabled={busy || !draft.teacherReviewed} onClick={() => void exportFile(part, "print")}><Printer />Print</button></div></div>)}
      </section>
    </>}
  </div>;
}

function LasPreview({ value, index, teacher }: { value: LearningActivitySheets; index: number; teacher: boolean }) {
  const s = value.sheets[index], p = value.sourcePlan, tl = value.language === "Filipino";
  return <article className="las-paper" aria-label={teacher ? "Teacher guide preview" : "Student LAS preview"}>
    <h2>{teacher ? "TEACHER ANSWER GUIDE — NOT FOR STUDENTS" : "LEARNING ACTIVITY SHEET (LAS)"}</h2><h3>{s.title}</h3><p>{p.profile.school}<br />{learningAreaLabel(p.grade, p.area)} · Term {p.term} · Week {p.week} · {p.schoolYear}</p>
    {!teacher && <p>{tl ? "Pangalan" : "Name"}: __________________________<br />{tl ? "Baitang at Pangkat" : "Grade & Section"}: __________________<br />{tl ? "Petsa" : "Date"}: ____________________________</p>}
    <h4>Learning Competency</h4><p>{p.competencyText}</p><h4>Learning Resources</h4><p>{s.materials}</p><h4>Directions</h4><p>{s.directions}</p>
    {s.reading && <><h4>Learning Notes</h4><p>{s.reading}</p></>}
    {s.tasks.map((t, i) => <section key={t.id}><h4>{value.mixedPreset || t.type === "multiple-choice" ? (tl ? "Tanong" : "Question") : (tl ? "Gawain" : "Activity")} {value.mixedPreset || t.type === "multiple-choice" ? lasQuestionNumber(value,index,i) : i+1}{t.type ? ` — ${lasActivityLabels[t.type]}` : ""}</h4><p>{lasQuestionPrompt(t.prompt)}</p>{t.options && <ol type="A">{t.options.map((o, j) => <li key={j}>{o}</li>)}</ol>}{t.matchingChoices && <><h4>Matching choices</h4><ol type="A">{t.matchingChoices.map((o,j)=><li key={j}>{o}</li>)}</ol></>}{teacher ? <p className="las-key">{lasTaskAnswer(t)}</p> : t.type === "multiple-choice" || (value.mixedPreset && t.type !== "essay") ? <p>{tl ? "Sagot" : "Answer"}: ____</p> : Array.from({ length: Math.min(12, Math.max(1, t.lines)) }, (_, n) => <div className="las-answer-line" key={n} />)}</section>)}
    <h4>Reflection</h4><p>{s.reflection}</p>{!teacher && <><div className="las-answer-line" /><div className="las-answer-line" /></>}<h4>References</h4><p>{p.references}</p>
  </article>;
}
