"use client";

import { KeyboardEvent, useEffect, useMemo, useState } from "react";
import { Clock3, Copy, FileCheck2, FilePlus2, Files, MoreHorizontal, Search, Trash2 } from "lucide-react";
import { LessonPlan } from "@/types/lesson-plan";
import { areaAbbreviation, termLabel } from "@/data/curriculum";

type DashboardProps = {
  plans: LessonPlan[];
  stats: { total: number; drafts: number; completed: number };
  compact?: boolean;
  onCreate: () => void;
  onOpen: (plan: LessonPlan) => void;
  onDelete: (id: string) => void;
  onDeleteMany: (ids: string[]) => void;
};

export function Dashboard({ plans, stats, compact, onCreate, onOpen, onDelete, onDeleteMany }: DashboardProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const filtered = useMemo(
    () => plans.filter((plan) => (status === "All" || plan.status === status) && `${plan.title} ${plan.area} ${plan.section}`.toLowerCase().includes(query.toLowerCase())),
    [plans, query, status],
  );
  const visibleIds = useMemo(() => filtered.map((plan) => plan.id), [filtered]);
  const selectedCount = selected.size;
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  useEffect(() => {
    const available = new Set(plans.map((plan) => plan.id));
    setSelected((current) => {
      const next = new Set([...current].filter((id) => available.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [plans]);

  function togglePlan(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleVisible() {
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  }

  function deleteSelected() {
    const ids = [...selected];
    if (!ids.length) return;
    const label = ids.length === 1 ? "lesson plan" : "lesson plans";
    if (confirm(`Delete ${ids.length} selected ${label} from this device?`)) {
      onDeleteMany(ids);
      setSelected(new Set());
    }
  }

  function openWithKeyboard(event: KeyboardEvent<HTMLDivElement>, plan: LessonPlan) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen(plan);
    }
  }

  return <div className="dashboard-page">
    <div className="page-heading"><div><span className="eyebrow">Your workspace</span><h1>{compact ? "Lesson plan library" : "Good day, Teacher Leny."}</h1><p>{compact ? "Search, select, duplicate, delete, or continue any saved lesson plan." : "Continue a draft or begin a new Monday–Thursday plan."}</p></div><button className="primary-btn" onClick={onCreate}><FilePlus2 />Create lesson plan</button></div>
    {!compact && <div className="stat-grid"><Stat icon={<Files />} label="All plans" value={stats.total} /><Stat icon={<Clock3 />} label="Drafts" value={stats.drafts} /><Stat icon={<FileCheck2 />} label="Completed" value={stats.completed} /></div>}
    <section className="library-card">
      <div className="library-head">
        <div><h2>{compact ? "All lesson plans" : "Recent lesson plans"}</h2><span>{filtered.length} {filtered.length === 1 ? "plan" : "plans"}{selectedCount ? ` · ${selectedCount} selected` : ""}</span></div>
        <div className="library-tools">
          {selectedCount > 0 && <button className="secondary-btn danger-btn" onClick={deleteSelected}><Trash2 />Delete selected ({selectedCount})</button>}
          <div className="filters"><label><Search /><input placeholder="Search plans" value={query} onChange={(event) => setQuery(event.target.value)} /></label><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All</option><option>Draft</option><option>Completed</option></select></div>
        </div>
      </div>
      {filtered.length ? <div className="plan-table">
        <div className="plan-row header">
          <label className="plan-select" title="Select all visible plans"><input type="checkbox" checked={allVisibleSelected} onChange={toggleVisible} aria-label="Select all visible lesson plans" /></label>
          <span className="lesson-cell">Lesson</span><span className="curriculum-cell">Curriculum</span><span className="status-cell">Status</span><span className="modified-cell">Last modified</span><span></span>
        </div>
        {filtered.map((plan) => <div className={`plan-row${selected.has(plan.id) ? " selected" : ""}`} key={plan.id} onClick={() => onOpen(plan)} onKeyDown={(event) => openWithKeyboard(event, plan)} role="button" tabIndex={0}>
          <label className="plan-select" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={selected.has(plan.id)} onChange={() => togglePlan(plan.id)} aria-label={`Select ${plan.title}`} /></label>
          <span className="lesson-cell"><b>{plan.title}</b><small>Grade {plan.grade} · {plan.section}</small></span>
          <span className="curriculum-cell">{areaAbbreviation[plan.area]} · {termLabel(plan.term)} · Week {plan.week}</span>
          <span className="status-cell"><i className={plan.status.toLowerCase()} />{plan.status}</span>
          <span className="modified-cell">{new Date(plan.updatedAt).toLocaleDateString()}</span>
          <span className="row-actions">
            <button title="Duplicate" aria-label={`Duplicate ${plan.title}`} onClick={(event) => { event.stopPropagation(); const copy = { ...plan, id: `${plan.id}-copy-${Date.now()}`, title: `${plan.title} (Copy)`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; onOpen(copy); }}><Copy /></button>
            <button title="Delete" aria-label={`Delete ${plan.title}`} onClick={(event) => { event.stopPropagation(); if (confirm("Delete this lesson plan from this device?")) onDelete(plan.id); }}><Trash2 /></button>
            <MoreHorizontal aria-hidden="true" />
          </span>
        </div>)}
      </div> : <div className="empty-state"><FilePlus2 /><h3>No lesson plans here yet</h3><p>Your saved drafts and completed plans will appear here.</p><button className="primary-btn" onClick={onCreate}>Create your first plan</button></div>}
    </section>
  </div>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div className="stat-card"><span>{icon}</span><div><b>{value}</b><small>{label}</small></div></div>;
}
