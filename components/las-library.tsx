"use client";

import { useState } from "react";
import { Copy, FilePlus2, FolderOpen, Trash2 } from "lucide-react";
import { LearningActivitySheets } from "@/types/las";
import { learningAreaLabel } from "@/data/curriculum";

export function LasLibrary({ values, onCreate, onOpen, onDuplicate, onDelete, error }: { values: LearningActivitySheets[]; onCreate: () => void; onOpen: (v: LearningActivitySheets) => void; onDuplicate: (v: LearningActivitySheets) => void; onDelete: (id: string) => void; error: string }) {
  const [query, setQuery] = useState("");
  const filtered = values.filter(v => `${v.title} ${learningAreaLabel(v.sourcePlan.grade, v.sourcePlan.area)}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="las-page"><div className="las-toolbar"><div><span className="eyebrow">Learning Activity Sheets</span><h1>Saved LAS</h1></div><button className="primary-btn" onClick={onCreate}><FilePlus2 />Create LAS</button></div>
    {error && <p role="alert" className="form-error">{error}</p>}
    <section className="las-card"><label>Search saved LAS<input type="search" value={query} onChange={e => setQuery(e.target.value)} /></label><p>{filtered.length} saved LAS package(s) · Stored on this device</p>
      {!filtered.length && <p>No matching LAS yet. Open a lesson and click Create LAS, or choose Create LAS above.</p>}
      {filtered.map(v => <article className="las-library-item" key={v.id}><div><h2>{v.title}</h2><p>{learningAreaLabel(v.sourcePlan.grade, v.sourcePlan.area)} · Term {v.sourcePlan.term} · Week {v.sourcePlan.week} · {v.sheets.length} sheet(s)</p><small>Updated {new Date(v.updatedAt).toLocaleDateString()} · {v.teacherReviewed ? "Teacher reviewed" : "Draft — review needed"}</small></div><div className="las-actions"><button className="secondary-btn" onClick={() => onOpen(v)}><FolderOpen />Open / Edit / Export</button><button className="secondary-btn" aria-label={`Duplicate ${v.title}`} onClick={() => onDuplicate(v)}><Copy /></button><button className="secondary-btn" aria-label={`Delete ${v.title}`} onClick={() => { if (window.confirm(`Delete saved LAS “${v.title}” from this device? Download it first if needed. The original lesson plan will not be deleted.`)) onDelete(v.id); }}><Trash2 /></button></div></article>)}
    </section>
  </div>;
}
