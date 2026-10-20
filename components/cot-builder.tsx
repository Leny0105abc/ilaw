"use client";
import { useEffect, useRef, useState } from "react";
import { LessonPlan } from "@/types/lesson-plan";
import { CotLesson, IndicatorLibrary, teacherPositions, TeacherPosition } from "@/types/cot";
import { applicableIndicators } from "@/services/cot-library";
import { buildCotPrompt, cotCoverage, cotMaterialsStale, cotRequestId, generateCot, generateCotMaterials, importCotResponse, readyCot, seedCotLesson, setCotSessions } from "@/services/cot-generator";
import { learningAreaLabel } from "@/data/curriculum";
import { CotContentEditor, CotAlignmentEditor, CotMaterialsEditor } from "@/components/cot-editors";
import { CotPromptWorkflow } from "@/components/cot-prompt-workflow";
import type { CotLessonFormat, CotPart } from "@/services/cot-export";
import "@/app/cot.css";
const tabs = ["COT LESSON", "INDICATOR ALIGNMENT", "POWERPOINT", "ACTIVITY SHEETS", "ASSESSMENT"] as const;
export function CotBuilder({ plans, seed, initial, library, libraryError, onManage, onReload, onSave, onBack }: {
    plans: LessonPlan[];
    seed?: LessonPlan | null;
    initial?: CotLesson | null;
    library: IndicatorLibrary | null;
    libraryError: string;
    onManage: () => void;
    onReload: () => void;
    onSave: (p: CotLesson) => void;
    onBack: () => void;
}) {
    const [draft, setDraft] = useState<CotLesson | null>(() => initial || (seed ? seedCotLesson(seed) : null));
    const [tab, setTab] = useState<typeof tabs[number]>("COT LESSON"), [method, setMethod] = useState<"prompt" | "ai">("prompt"), [prompt, setPrompt] = useState(""), [response, setResponse] = useState("");
    const [error, setError] = useState(""), [message, setMessage] = useState(""), [busy, setBusy] = useState(false), [multi, setMulti] = useState((initial?.selectedSessions.length || 1) > 1), [coaching, setCoaching] = useState(false), [undo, setUndo] = useState<CotLesson | null>(null);
    const [exportPart, setExportPart] = useState<CotPart>("lesson");
    const [lessonFormat, setLessonFormat] = useState<CotLessonFormat>("ilaw");
    const abort = useRef<AbortController | null>(null), promptRef = useRef<HTMLElement | null>(null), reviewRef = useRef<HTMLDivElement | null>(null);
    const [copyNotice, setCopyNotice] = useState("");
    useEffect(() => () => abort.current?.abort(), []);
    function update(change: Partial<CotLesson>, remember = false) { if (remember && draft)
        setUndo(draft); setDraft(current => current ? { ...current, ...change, status: "Draft", teacherReviewed: change.teacherReviewed ?? false, updatedAt: new Date().toISOString() } : current); setError(""); setMessage(""); }
    function sessions(selected: number[]) { if (!draft)
        return; try {
        setUndo(draft);
        setDraft(setCotSessions(draft, selected));
        setPrompt("");
        setError("");
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Select a session.");
    } }
    async function generate() { if (!draft)
        return; setError(""); try {
        if (method === "prompt") {
            setPrompt(buildCotPrompt(draft));
            setResponse("");
            setCopyNotice("");
            setMessage("Copy the COT prompt into ChatGPT, Gemini or Copilot. Paste the AI's complete JSON response back into ILAW, then click Import COT lesson. Official indicator wording is not editable by AI.");
            setTimeout(() => promptRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
            return;
        }
        setBusy(true);
        abort.current = new AbortController();
        const next = await generateCot(draft, undefined, abort.current.signal);
        setUndo(draft);
        setDraft(next);
        setPrompt("");
        setMessage("COT lesson generated. Review the activities, evidence and assessment before creating materials.");
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Generation failed; the draft is unchanged.");
    }
    finally {
        setBusy(false);
    } }
    function importResponse() { if (!draft)
        return; try {
        const next = importCotResponse(draft, response);
        setUndo(draft);
        setDraft(next);
        setPrompt("");
        setResponse("");
        setError("");
        setTab("COT LESSON");
        const notes = next.activities.reduce((count, a) => count + (a.worksheet?.teacherNotes?.length || 0), 0);
        setMessage(`COT lesson imported successfully. Review the COT LESSON, INDICATOR ALIGNMENT, POWERPOINT, ACTIVITY SHEETS and ASSESSMENT tabs, then click Save COT lesson. Importing does not save your draft automatically.${notes ? ` ${notes} checklist / teaching note(s) are preserved separately under Teacher Notes, not numbered as answers or shown on student sheets.` : ""}`);
        setTimeout(() => { reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); reviewRef.current?.focus({ preventScroll: true }); }, 0);
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Import failed. The draft was retained.");
    } }
    function materialize(destination: typeof tab) { if (!draft)
        return; try {
        setDraft(generateCotMaterials(draft));
        setTab(destination);
        setError("");
        setMessage("COT PowerPoint and activity sheets refreshed from this exact lesson sequence. Review them before export.");
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Review the COT lesson first.");
    } }
    function save() { if (!draft)
        return; try {
        onSave(draft);
        setMessage("COT lesson saved on this device. The original lesson plan is unchanged.");
        setError("");
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Save failed.");
    } }
    function markReady() { if (!draft)
        return; try {
        readyCot(draft);
        const next = { ...draft, status: "Ready for Observation" as const, updatedAt: new Date().toISOString() };
        onSave(next);
        setDraft(next);
        setMessage("You marked this lesson Ready for Observation. This is not an official COT rating.");
        setError("");
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Complete the review first.");
    } }
    async function exportFile(format: "docx" | "pdf" | "print" | "pptx" | "zip") { if (!draft)
        return; setError(""); setBusy(true); try {
        const e = await import("@/services/cot-export");
        if (format === "print") {
            e.printCot(draft, exportPart, lessonFormat);
            return;
        }
        const bytes = format === "pptx" ? await e.buildCotPowerPoint(draft) : format === "zip" ? await e.buildCotPackage(draft) : format === "docx" ? await e.buildCotWord(draft, exportPart, lessonFormat) : await e.buildCotPdf(draft, exportPart, lessonFormat);
        const mime = format === "pptx" ? "application/vnd.openxmlformats-officedocument.presentationml.presentation" : format === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : format === "zip" ? "application/zip" : "application/pdf";
        e.downloadCot(bytes, e.cotFilename(draft, format === "zip" ? "package" : format === "pptx" ? "presentation" : exportPart, format), mime);
        setMessage("Download started. Word and PowerPoint text remains editable.");
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Export failed.");
    }
    finally {
        setBusy(false);
    } }
    if (!draft)
        return <div className="assessment-page cot-page"><div className="page-heading"><div><span className="eyebrow">Classroom observation preparation</span><h1>Create COT Lesson</h1><p>Start from an existing ILAW lesson plan. No original lesson data will be changed.</p></div><button className="secondary-btn" onClick={onBack}>Saved COT Lessons</button></div><section className="form-card"><label>Existing Lesson Plan<select defaultValue="" onChange={e => { const plan = plans.find(p => p.id === e.target.value); if (plan)
            setDraft(seedCotLesson(plan)); }}><option value="">Select a saved lesson plan</option>{plans.map(p => <option key={p.id} value={p.id}>{learningAreaLabel(p.grade, p.area)} / Week {p.week} / {p.title}</option>)}</select></label>{!plans.length && <p>Create or open an ILAW lesson plan first, then choose Create COT Lesson.</p>}</section></div>;
    const available = applicableIndicators(library?.indicators || [], draft.position, draft.schoolYear, draft.cycle);
    const total = draft.activities.reduce((sum, a) => sum + a.minutes, 0);
    let setupChanged = false;
    try {
        setupChanged = !!draft.generationFingerprint && draft.generationFingerprint !== cotRequestId(draft);
    }
    catch {
        setupChanged = !!draft.activities.length;
    }
    const stale = !!draft.activities.length && cotMaterialsStale(draft);
    return <div className="assessment-page cot-page"><div className="page-heading"><div><span className="eyebrow">COT Lesson</span><h1>{draft.title}</h1><p>{learningAreaLabel(draft.sourcePlan.grade, draft.sourcePlan.area)} / Term {draft.sourcePlan.term} / Week {draft.sourcePlan.week} · {draft.status}</p></div><div className="cot-actions"><button className="secondary-btn" disabled={busy} onClick={onBack}>Saved COT Lessons</button><button className="primary-btn" disabled={busy} onClick={save}>Save COT lesson</button></div></div>
    {message && <p className="prompt-message" role="status">{message}</p>}{error && <p className="weekly-error" role="alert">{error}</p>}
    {undo && <button className="secondary-btn" disabled={busy} onClick={() => { setDraft(undo); setUndo(null); setPrompt(""); setError(""); }}>Undo last generation or session change</button>}
    <fieldset className="assessment-controls" disabled={busy}><section className="form-card"><h2>Observation Details</h2><p>Original lesson and official competency are preserved. Class duration is the total time across the selected observed sessions.</p><div className="field-grid four">
      <label>Teacher Name<input value={draft.teacherName} onChange={e => update({ teacherName: e.target.value })}/></label><label>Teacher Position<select value={draft.position} onChange={e => update({ position: e.target.value as TeacherPosition, indicators: [] }, true)}>{teacherPositions.map(position => <option key={position}>{position}</option>)}</select></label><label>School Year<input value={draft.schoolYear} onChange={e => update({ schoolYear: e.target.value.replace(/[–—]/g, "-"), indicators: [] }, true)}/></label><label>Observer<input value={draft.observer} onChange={e => update({ observer: e.target.value })}/></label>
      <label>Observation Date<input type="date" value={draft.observationDate} onInput={e => update({ observationDate: e.currentTarget.value })} onBlur={e => {if(e.currentTarget.value!==draft.observationDate)update({observationDate:e.currentTarget.value});}} onChange={e => update({ observationDate: e.target.value })}/></label><label>Observation Time<input type="time" value={draft.observationTime} onInput={e => update({ observationTime: e.currentTarget.value })} onBlur={e => {if(e.currentTarget.value!==draft.observationTime)update({observationTime:e.currentTarget.value});}} onChange={e => update({ observationTime: e.target.value })}/></label><label>Class Duration in Minutes<input type="number" min={8 * draft.selectedSessions.length} max={480} step={1} list="cot-durations" value={draft.duration || ""} onChange={e => update({ duration: Number(e.target.value) })}/><datalist id="cot-durations">{[40, 45, 50, 60].map(n => <option key={n} value={n}/>)}</datalist></label><label>PMES Observation Cycle<select value={draft.cycle} onChange={e => update({ cycle: e.target.value as CotLesson["cycle"], indicators: [] }, true)}><option value="1st">First classroom observation</option><option value="2nd">Second classroom observation</option><option value="Planning">All indicators for planning</option></select></label>
      <label>Grade Level<input readOnly value={`Grade ${draft.sourcePlan.grade}`}/></label><label>Section<input value={draft.section} onChange={e => update({ section: e.target.value })}/></label><label>Subject / Learning Area<input readOnly value={learningAreaLabel(draft.sourcePlan.grade, draft.sourcePlan.area)}/></label><label>Term / Week<input readOnly value={`${draft.sourcePlan.term} / ${draft.sourcePlan.week}`}/></label><label className="wide">Lesson Title<input value={draft.title} maxLength={180} onChange={e => update({ title: e.target.value })}/></label>
    </div><fieldset><legend>Selected Session</legend><label className="cot-check"><input type="checkbox" checked={multi} onChange={e => { setMulti(e.target.checked); if (!e.target.checked && draft.selectedSessions.length > 1)
        sessions([draft.selectedSessions[0]]); }}/>Choose more than one observed session explicitly</label>{draft.sourcePlan.sessions.map(s => <label className="cot-check" key={s.session}><input type={multi ? "checkbox" : "radio"} name="cot-session" checked={draft.selectedSessions.includes(s.session)} onChange={e => sessions(multi ? (e.target.checked ? [...draft.selectedSessions, s.session] : draft.selectedSessions.filter(n => n !== s.session)) : [s.session])}/>Session {s.session} / {s.day}</label>)}</fieldset>
    </section><section className="form-card"><h2>Select COT / PMES Indicators</h2><p>Only active verified PMES records matching position, school year and cycle are offered. COT-RSP records are excluded.</p>{libraryError && <p className="cot-warning">{libraryError} <button className="text-btn" onClick={onReload}>Retry library</button></p>}{!library && !libraryError && <p>Loading verified indicators...</p>}
      {!available.length && <p className="cot-warning">No verified indicator set is currently configured for this teacher position and school year. Please add/import the official DepEd PMES indicator set.</p>}
      <div className="cot-actions"><button className="secondary-btn" disabled={!available.length} onClick={() => update({ indicators: structuredClone(available) })}>Select All Applicable Indicators</button><button className="secondary-btn" onClick={() => { try {
        onSave(draft);
        onManage();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Save failed.");
    } }}>Save draft and manage PMES Indicators / Import</button></div>
      {available.map(indicator => <label className="cot-check cot-indicator" key={indicator.id}><input type="checkbox" checked={draft.indicators.some(i => i.id === indicator.id)} onChange={e => update({ indicators: e.target.checked ? [...draft.indicators, structuredClone(indicator)] : draft.indicators.filter(i => i.id !== indicator.id) })}/><span><b>PPST {indicator.code}</b><p>{indicator.wording}</p><small>{indicator.careerStage} · {indicator.domain} / {indicator.strand}<br />{indicator.source} · {indicator.version} · {indicator.schoolYear}</small></span></label>)}
      {!!draft.indicators.length && <details><summary>Selected official indicator snapshots and source versions</summary>{draft.indicators.map(i => <p key={i.id} className="cot-source">{i.code} {i.wording}<br />{i.source}<br />{i.sourceUrl}<br />{i.sourcePage} · {i.version} · {i.schoolYear} · {i.position} · {i.careerStage}</p>)}</details>}
      <label>Generation method<select value={method} onChange={e => setMethod(e.target.value as typeof method)}><option value="prompt">ChatGPT / Gemini / Copilot prompt (no API key)</option><option value="ai">Existing secure AI service</option></select></label><div className="cot-actions"><button className="primary-btn" disabled={!draft.indicators.length} onClick={() => void generate()}>Generate COT Lesson</button></div>
    </section></fieldset>
    {busy && <p role="status">Working on your COT package. Existing saved work is unchanged. <button className="text-btn" onClick={() => abort.current?.abort()}>Cancel AI generation</button></p>}
    {prompt && <CotPromptWorkflow sectionRef={promptRef} prompt={prompt} response={response} busy={busy} error={error} copyNotice={copyNotice} onResponseChange={value => { setResponse(value); setError(""); }} onImport={importResponse} onCopy={async () => { try {
        await navigator.clipboard.writeText(prompt);
        setCopyNotice("Prompt copied. Open ChatGPT, Gemini or Copilot, paste it into the message box, and send it.");
    }
    catch {
        setCopyNotice("Automatic copying is unavailable. Select and copy all the prompt text below, then paste it into your AI chat.");
    } }} />}
    {setupChanged && <p className="cot-warning">The observation setup or source objectives changed. Generate the COT lesson again to realign its content. Your previous draft is still available.</p>}
    {!!draft.activities.length && <div className="cot-review-guide" ref={reviewRef} tabIndex={-1} role="region" aria-label="Next steps for your COT lesson"><h2>Next: review and save your COT lesson</h2><p>Review and edit the five tabs below, especially worksheet answers and assessment keys. Click <b>Save COT lesson</b> at the top, or save the draft here. Then use <b>Review and export</b> below to check indicator alignment, timing and materials before downloading.</p><button className="primary-btn" disabled={busy} onClick={save}>Save COT draft</button><p className="cot-badge">Saving a draft does not mark it Ready for Observation. Complete the teacher-review checks separately.</p></div>}
    <p className="cot-badge">Lesson exports use your COT ILAW FORMAT_K reference: two columns, complete section guidance, inline COT annotations and aligned signatures. Your lesson content and official indicator wording remain unchanged.</p>
    <div className="cot-tabs" role="tablist" aria-label="COT package views">{tabs.map(t => <button role="tab" aria-selected={tab === t} key={t} onClick={() => setTab(t)}>{t}</button>)}</div>
    <fieldset className="assessment-controls" disabled={busy}>
      {tab === "COT LESSON" && <CotContentEditor draft={draft} onChange={update}/>}
      {tab === "INDICATOR ALIGNMENT" && <CotAlignmentEditor draft={draft} onChange={update} coaching={coaching} onCoaching={setCoaching}/>}
      {["POWERPOINT", "ACTIVITY SHEETS", "ASSESSMENT"].includes(tab) && <CotMaterialsEditor draft={draft} tab={tab as "POWERPOINT" | "ACTIVITY SHEETS" | "ASSESSMENT"} onChange={update} onGenerate={() => materialize(tab)}/>}
    </fieldset>
    {!!draft.activities.length && <section className="form-card"><h2>Review and export</h2><p>Timed flow: <b>{total} / {draft.duration} minutes</b>. Planned indicator coverage: {draft.alignments.filter(a => cotCoverage(draft, a) === "clear").length} / {draft.indicators.length} reviewed. This is a preparation check, not an official rating.</p>{stale && <p className="cot-warning">Materials need to be generated or refreshed after lesson edits. Refresh replaces custom slide and worksheet edits.</p>}<div className="cot-actions"><button className="secondary-btn" disabled={busy || setupChanged} onClick={() => materialize("POWERPOINT")}>Generate COT PowerPoint</button><button className="secondary-btn" disabled={busy || setupChanged} onClick={() => materialize("ACTIVITY SHEETS")}>Generate Activity Sheets</button><button className="secondary-btn" disabled={busy || setupChanged} onClick={() => materialize("ASSESSMENT")}>Generate COT Package</button></div>
      <label className="cot-check"><input type="checkbox" checked={draft.teacherReviewed} onChange={e => update({ teacherReviewed: e.target.checked })}/>I reviewed the lesson accuracy, selected indicators, timing, activities, learner responses and assessment answers.</label><div className="cot-actions"><button className="primary-btn" disabled={busy || setupChanged} onClick={markReady}>Mark as Ready for Observation</button>{draft.status === "Ready for Observation" && <button className="secondary-btn" onClick={() => { const next = { ...draft, status: "Completed" as const }; onSave(next); setDraft(next); }}>Mark Completed</button>}</div>
      <div className="cot-export"><label>Export document<select value={exportPart} onChange={e => setExportPart(e.target.value as CotPart)}><option value="lesson">COT Lesson Plan</option><option value="alignment">Indicator Alignment / Annotation</option><option value="worksheets">Activity Sheets</option><option value="assessment">Student Assessment</option><option value="answer-key">Teacher Answer Key</option></select></label>{exportPart === "lesson" && <label>Lesson format<select value={lessonFormat} onChange={e => setLessonFormat(e.target.value as CotLessonFormat)}><option value="ilaw">ILAW reference — two-column format</option><option value="detailed">Detailed COT — previous format</option></select></label>}<button className="secondary-btn" disabled={busy || setupChanged} onClick={() => void exportFile("docx")}>Word</button><button className="secondary-btn" disabled={busy || setupChanged} onClick={() => void exportFile("pdf")}>PDF</button><button className="secondary-btn" disabled={busy || setupChanged} onClick={() => void exportFile("print")}>Print</button><button className="secondary-btn" disabled={busy || setupChanged || stale} onClick={() => void exportFile("pptx")}>Download COT PowerPoint</button><button className="primary-btn" disabled={busy || setupChanged || stale} onClick={() => void exportFile("zip")}>Download All COT Files (ZIP)</button></div><p className="cot-badge">Download All COT Files (ZIP) uses the ILAW reference format for the lesson plan. The detailed format remains available through individual Word, PDF and Print exports.</p>
    </section>}
  </div>;
}
