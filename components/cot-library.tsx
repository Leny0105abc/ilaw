"use client";
import { useState } from "react";
import { CotLesson } from "@/types/cot";
import { learningAreaLabel } from "@/data/curriculum";
import "@/app/cot.css";
export function CotLibrary({ lessons, onCreate, onOpen, onDuplicate, onDelete }: {
    lessons: CotLesson[];
    onCreate: () => void;
    onOpen: (p: CotLesson) => void;
    onDuplicate: (p: CotLesson) => void;
    onDelete: (id: string) => void;
}) {
    const [query, setQuery] = useState(""), [deleteId, setDeleteId] = useState(""), [error, setError] = useState("");
    const filtered = lessons.filter(p => `${p.title} ${p.position} ${p.sourcePlan.area} ${p.observationDate}`.toLowerCase().includes(query.toLowerCase()));
    const safe = (action: () => void) => { try {
        action();
        setError("");
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Action failed.");
    } };
    async function download(p: CotLesson, format: "zip" | "docx") { setError(""); try {
        const e = await import("@/services/cot-export");
        const bytes = format === "zip" ? await e.buildCotPackage(p) : await e.buildCotWord(p, "lesson");
        e.downloadCot(bytes, e.cotFilename(p, format === "zip" ? "package" : "lesson", format), format === "zip" ? "application/zip" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Export failed.");
    } }
    return <div className="assessment-page cot-page"><div className="page-heading"><div><span className="eyebrow">Observation preparation</span><h1>Saved COT Lessons</h1><p>Saved on this device. Official indicators are retained as source-version snapshots.</p></div><button className="primary-btn" onClick={onCreate}>Create COT</button></div>{error && <p role="alert" className="weekly-error">{error}</p>}<section className="library-card"><label>Search COT lessons<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Title, position, subject or date"/></label><h2>{filtered.length} COT lesson(s)</h2>{filtered.map(p => <article key={p.id} className="cot-library-row"><div><h3>{p.title}</h3><p>{p.position} · {learningAreaLabel(p.sourcePlan.grade, p.sourcePlan.area)} · Session {p.selectedSessions.join(", ")} · {p.observationDate || "Date not set"}</p><p>{p.indicators.map(i => i.code).join(", ") || "Indicators not selected"} · {p.status}</p></div><div className="weekly-toolbar-actions"><button className="secondary-btn" onClick={() => onOpen(p)}>Open / Edit</button><button className="secondary-btn" onClick={() => safe(() => onDuplicate(p))}>Duplicate</button><button className="secondary-btn" onClick={() => void download(p, "zip")}>Generate Package</button><button className="secondary-btn" onClick={() => void download(p, "docx")}>Export Word</button><button className="text-btn" onClick={() => setDeleteId(p.id)}>Delete</button></div>{deleteId === p.id && <div className="weekly-delete-confirm"><p>Delete this COT lesson from this device? The original ILAW lesson plan will not be deleted.</p><button className="secondary-btn" onClick={() => setDeleteId("")}>Cancel</button><button className="primary-btn" onClick={() => safe(() => { onDelete(p.id); setDeleteId(""); })}>Confirm delete</button></div>}</article>)}{!filtered.length && <p>No saved COT lessons. Open an existing lesson plan and choose Create COT Lesson.</p>}</section></div>;
}
