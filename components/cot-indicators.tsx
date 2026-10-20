"use client";
import { useState } from "react";
import { CotIndicator, IndicatorLibrary, TeacherPosition, teacherPositions } from "@/types/cot";
import { draftImportedIndicators, IndicatorExtraction, readIndicatorFile } from "@/services/cot-import";
import { saveIndicatorLibrary, validateIndicators } from "@/services/cot-library";
import "@/app/cot.css";
export function CotIndicators({ library, error: loadError, onReload, onChanged }: {
    library: IndicatorLibrary | null;
    error: string;
    onReload: () => void;
    onChanged: (library: IndicatorLibrary) => void;
}) {
    const [position, setPosition] = useState<TeacherPosition>("Teacher III"), [year, setYear] = useState("2026-2027"), [kind, setKind] = useState<"PMES" | "COT-RSP">("PMES");
    const [extracted, setExtracted] = useState<IndicatorExtraction | null>(null), [rows, setRows] = useState<CotIndicator[]>([]), [disabledIds, setDisabledIds] = useState<string[]>([]);
    const [metadata, setMetadata] = useState({ positions: [] as TeacherPosition[], careerStage: "", source: "", sourceUrl: "", sourcePage: "", version: "" });
    const [confirmed, setConfirmed] = useState(false), [replace, setReplace] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
    const visible = library?.indicators.filter(i => i.position === position && i.schoolYear === year && i.observationType === kind) || [];
    async function upload(file?: File) { if (!file)
        return; setBusy(true); setError(""); setConfirmed(false); setRows([]); try {
        const result = await readIndicatorFile(file);
        setExtracted(result);
        setMessage(`Extracted ${result.candidates.length} candidate records. Review the original document and every field; nothing has been published.`);
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "File extraction failed.");
    }
    finally {
        setBusy(false);
    } }
    function prepare() { try {
        if (!extracted || !metadata.positions.length)
            throw new Error("Extract a file and explicitly select the applicable positions.");
        const candidates = draftImportedIndicators(extracted, { ...metadata, schoolYear: year, observationType: kind, cycles: ["1st", "2nd"] });
        if (!candidates.length)
            throw new Error("No code-and-wording pairs were found. Use a text-based rating sheet with official indicator codes.");
        setRows(candidates);
        setConfirmed(false);
        setError("");
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Check the import fields.");
    } }
    async function publish() {
        if (!library)
            return;
        setBusy(true);
        setError("");
        setMessage("Reading the selected source locally. Nothing has been published.");
        setExtracted(null);
        try {
            if (!confirmed)
                throw new Error("Confirm administrator review before saving.");
            const incoming = rows.map(row => ({ ...row, active: true, verified: true, verifiedAt: new Date().toISOString() }));
            const existing = library.indicators.map(row => ({ ...row, active: disabledIds.includes(row.id) ? false : replace && incoming.some(n => n.position === row.position && n.schoolYear === row.schoolYear && n.observationType === row.observationType && n.code === row.code && n.cycles.some(c => row.cycles.includes(c))) ? false : row.active }));
            const next = await saveIndicatorLibrary({ revision: library.revision, indicators: validateIndicators([...existing, ...incoming]) });
            onChanged(next);
            setRows([]);
            setDisabledIds([]);
            setExtracted(null);
            setConfirmed(false);
            setMessage("Indicator library saved on the server. Existing COT lesson snapshots were not changed.");
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Library save failed.");
        }
        finally {
            setBusy(false);
        }
    }
    function patch(index: number, change: Partial<CotIndicator>) { setRows(current => current.map((row, i) => i === index ? { ...row, ...change } : row)); setConfirmed(false); }
    return <div className="assessment-page cot-page"><div className="page-heading"><div><span className="eyebrow">COT configuration</span><h1>PMES Indicators</h1><p>Official wording, source versions and applicability are maintained here—not by AI.</p></div><button className="secondary-btn" onClick={onReload} disabled={busy}>Reload library</button></div>
    {(error || loadError) && <p role="alert" className="weekly-error">{error || loadError}</p>}{message && <p role="status" className="prompt-message">{message}</p>}
    <section className="form-card"><h2>Verified indicator library</h2><div className="field-grid"><label>School Year<input value={year} onChange={e => { setYear(e.target.value); setConfirmed(false); }}/></label><label>Teacher Position<select value={position} onChange={e => setPosition(e.target.value as TeacherPosition)}>{teacherPositions.map(p => <option key={p}>{p}</option>)}</select></label><label>Indicator purpose<select value={kind} onChange={e => setKind(e.target.value as typeof kind)}><option>PMES</option><option>COT-RSP</option></select></label></div>
      <p>{visible.length} configured records. PMES classroom observation and COT-RSP recruitment/promotion records are kept separate. COT Lesson uses PMES only.</p>
      {!library && <p>Load the protected server library before generating or publishing indicators.</p>}
      {position === "Master Teacher III" && !visible.some(i => i.verified && i.active) && <p className="cot-warning">No verified Master Teacher III set is preconfigured. DM 089 s. 2025 has conflicting labels in Tables 2 and 10; review an applicable official rating sheet or clarification before publishing.</p>}
      {visible.map(row => <article className="cot-indicator" key={row.id}><h3>PPST {row.code}</h3><p>{row.wording}</p><p>{row.careerStage} · {row.domain} · {row.strand}</p><small>{row.source} · {row.sourcePage} · Version {row.version} · {row.cycles.join(" / ")} · {row.active && !disabledIds.includes(row.id) ? "Active" : "Inactive"}</small><p><a href={row.sourceUrl} target="_blank" rel="noreferrer">Official source</a></p>{row.active && <label className="cot-check"><input type="checkbox" checked={disabledIds.includes(row.id)} onChange={e => { setDisabledIds(ids => e.target.checked ? [...ids, row.id] : ids.filter(id => id !== row.id)); setConfirmed(false); }}/>Deactivate this version when publishing changes</label>}</article>)}
    </section>
    <section className="form-card"><h2>Import PMES / COT indicators</h2><p>Upload an official PDF, Word DOCX or Excel XLSX. Extracted text is untrusted draft data. Scanned PDFs need a text-based copy; nothing is sent to an AI service.</p><label>Official guideline file<input type="file" accept=".pdf,.docx,.xlsx" disabled={busy || !library} onChange={e => void upload(e.target.files?.[0])}/></label>
      {extracted && <><p>Detected school years: {extracted.metadata.schoolYears.join(", ") || "Not found"}. Detected position references: {extracted.metadata.positions.join(", ") || "Not found"}. These hints do not establish applicability.</p><details><summary>Review extracted source text</summary><textarea aria-label="Extracted official source text" readOnly rows={12} value={extracted.text}/></details>
        <div className="field-grid"><label>Exact Career Stage<input value={metadata.careerStage} onChange={e => setMetadata({ ...metadata, careerStage: e.target.value })}/></label><label>DepEd Issuance<input value={metadata.source} onChange={e => setMetadata({ ...metadata, source: e.target.value })}/></label><label>Official Source URL<input type="url" value={metadata.sourceUrl} onChange={e => setMetadata({ ...metadata, sourceUrl: e.target.value })}/></label><label>Source Page / Annex<input value={metadata.sourcePage} onChange={e => setMetadata({ ...metadata, sourcePage: e.target.value })}/></label><label>Guideline Version<input value={metadata.version} onChange={e => setMetadata({ ...metadata, version: e.target.value })}/></label></div>
        <fieldset><legend>Applicable teacher positions from this official section</legend><div className="cot-position-list">{teacherPositions.map(p => <label className="cot-check" key={p}><input type="checkbox" checked={metadata.positions.includes(p)} onChange={e => setMetadata({ ...metadata, positions: e.target.checked ? [...metadata.positions, p] : metadata.positions.filter(x => x !== p) })}/>{p}</label>)}</div></fieldset><button className="secondary-btn" onClick={prepare}>Prepare review records</button>
      </>}
      {rows.length > 0 && <><h3>Review every candidate before publication</h3><p>Remove unrelated or incomplete rows. Confirm the exact wording and whether the indicator belongs to the first or second observation.</p>{rows.map((row, index) => <article className="cot-indicator" key={row.id}><div className="field-grid"><label>Position<select value={row.position} onChange={e => patch(index, { position: e.target.value as TeacherPosition })}>{teacherPositions.map(p => <option key={p}>{p}</option>)}</select></label><label>PPST Indicator Number<input value={row.code} onChange={e => patch(index, { code: e.target.value })}/></label><label>Exact Career Stage<input value={row.careerStage} onChange={e => patch(index, { careerStage: e.target.value })}/></label><label>School Year<input value={row.schoolYear} onChange={e => patch(index, { schoolYear: e.target.value })}/></label><label>Domain<input value={row.domain} onChange={e => patch(index, { domain: e.target.value })}/></label><label>Strand<input value={row.strand} onChange={e => patch(index, { strand: e.target.value })}/></label><label className="wide">Exact Official Wording<textarea rows={3} value={row.wording} onChange={e => patch(index, { wording: e.target.value })}/></label><label>Observation Cycle<select value={row.cycles.length === 2 ? "both" : row.cycles[0]} onChange={e => patch(index, { cycles: e.target.value === "both" ? ["1st", "2nd"] : [e.target.value as "1st" | "2nd"] })}><option value="1st">First observation</option><option value="2nd">Second observation</option><option value="both">Both observations</option></select></label><label>Source / Page / Version<input value={`${row.source} / ${row.sourcePage} / ${row.version}`} readOnly/></label></div><button className="text-btn" onClick={() => { setRows(current => current.filter(r => r.id !== row.id)); setConfirmed(false); }}>Remove this draft candidate</button></article>)}<label className="cot-check"><input type="checkbox" checked={replace} onChange={e => { setReplace(e.target.checked); setConfirmed(false); }}/>Deactivate overlapping old active versions when publishing these new records. Saved lesson snapshots stay unchanged.</label></>}
      {(rows.length > 0 || disabledIds.length > 0) && <div className="cot-publish"><label className="cot-check"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/>I checked the exact wording, position, career stage, school year, observation cycle, source and version against the official document.</label><button className="primary-btn" disabled={!confirmed || busy || !library} onClick={() => void publish()}>{busy ? "Saving..." : "Confirm and publish indicator library"}</button></div>}
    </section></div>;
}
