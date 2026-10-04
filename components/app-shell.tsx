"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenText, ClipboardList, FilePlus2, Files, FolderOpen, GraduationCap, LayoutDashboard, Menu, Settings, Sparkles, X } from "lucide-react";
import { LessonPlan, TeacherProfile, defaultProfile } from "@/types/lesson-plan";
import { loadPlans, loadProfile, savePlans, saveProfile } from "@/services/storage";
import { Assessment, AssessmentSeed } from "@/types/assessment";
import { loadAssessments, saveAssessments } from "@/services/assessment-storage";
import { Dashboard } from "@/components/dashboard";
import { CreateLessonPlan } from "@/components/create-lesson-plan";
import { LessonEditor } from "@/components/lesson-editor";
import { CurriculumView } from "@/components/curriculum-view";
import { SettingsView } from "@/components/settings-view";
import { AssessmentBuilder } from "@/components/assessment-builder";
import { AssessmentLibrary } from "@/components/assessment-library";

type View = "dashboard" | "create" | "plans" | "assessment-create" | "assessments" | "curriculum" | "settings" | "editor" | "assessment-editor";
const nav = [
  ["dashboard", "Dashboard", LayoutDashboard], ["create", "Create Lesson Plan", FilePlus2], ["plans", "Lesson Plans", Files],
  ["assessment-create", "Create Assessment", ClipboardList], ["assessments", "Saved Assessments", FolderOpen],
  ["curriculum", "Curriculum", GraduationCap], ["settings", "Settings", Settings],
] as const;

export function AppShell() {
  const [view, setView] = useState<View>("create");
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [profile, setProfile] = useState<TeacherProfile>(defaultProfile);
  const [active, setActive] = useState<LessonPlan | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [activeAssessment, setActiveAssessment] = useState<Assessment | null>(null);
  const [assessmentSeed, setAssessmentSeed] = useState<AssessmentSeed | null>(null);
  const [assessmentCreateKey, setAssessmentCreateKey] = useState(0);
  const [mobileNav, setMobileNav] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { queueMicrotask(() => { setPlans(loadPlans()); setAssessments(loadAssessments()); setProfile(loadProfile()); setHydrated(true); }); }, []);
  const stats = useMemo(() => ({ total: plans.length, drafts: plans.filter((p) => p.status === "Draft").length, completed: plans.filter((p) => p.status === "Completed").length }), [plans]);

  function persist(next: LessonPlan[]) { setPlans(next); savePlans(next); }
  function deletePlans(ids: string[]) { const selected = new Set(ids); setPlans((current) => { const next = current.filter((plan) => !selected.has(plan.id)); savePlans(next); return next; }); }
  function open(plan: LessonPlan) { setActive(plan); setView("editor"); }
  function save(plan: LessonPlan) { const next = [plan, ...plans.filter((item) => item.id !== plan.id)]; persist(next); setActive(plan); }
  function persistAssessments(next: Assessment[]) { setAssessments(next); saveAssessments(next); }
  function saveAssessment(assessment: Assessment) { const next = [assessment, ...assessments.filter((item) => item.id !== assessment.id)]; persistAssessments(next); setActiveAssessment(assessment); }
  function openAssessment(assessment: Assessment) { setActiveAssessment(assessment); setAssessmentSeed(null); setView("assessment-editor"); }
  function duplicateAssessment(assessment: Assessment) { const now = new Date().toISOString(); const copy = { ...assessment, id: `assessment-${Date.now()}`, title: `${assessment.title} (Copy)`, createdAt: now, updatedAt: now }; saveAssessment(copy); openAssessment(copy); }
  function createAssessment(seed: AssessmentSeed | null = null) { setActiveAssessment(null); setAssessmentSeed(seed); setAssessmentCreateKey((value) => value + 1); setView("assessment-create"); }
  function navigate(next: View) { if (next === "assessment-create") { createAssessment(); setMobileNav(false); return; } setView(next); setMobileNav(false); }

  if (!hydrated) return <div className="loading-screen"><span className="brand-mark"><BookOpenText /></span><p>Opening your lesson planner...</p></div>;

  return <div className="app-frame">
    <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
      <div className="brand"><span className="brand-mark"><BookOpenText /></span><div><b>ILAW</b><small>Lesson Plan Generator</small></div><button className="icon-btn close-nav" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X /></button></div>
      <nav aria-label="Main navigation">{nav.map(([id, label, Icon], index) => <div key={id}>{index === 3 && <span className="nav-group-label">Assessment</span>}<button className={view === id || (id === "assessment-create" && view === "assessment-editor") ? "active" : ""} onClick={() => navigate(id)}><Icon />{label}</button></div>)}</nav>
      <div className="sidebar-note"><Sparkles /><div><b>Teacher-reviewed AI</b><span>Competencies stay exactly as published.</span></div></div>
      <div className="profile-chip"><span>{profile.teacherName.split(" ").map((w) => w[0]).slice(0,2).join("")}</span><div><b>{profile.teacherName}</b><small>{profile.school}</small></div></div>
    </aside>
    {mobileNav && <button className="nav-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
    <main>
      <header className="topbar"><button className="icon-btn menu-btn" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu /></button><div><span className="eyebrow">School Year 2026–2027</span><strong>{view === "editor" ? "Review lesson plan" : view === "assessment-editor" ? "Review assessment" : nav.find(([id]) => id === view)?.[1] || "ILAW"}</strong></div><div className="save-state"><i />Saved on this device</div></header>
      {view === "dashboard" && <Dashboard plans={plans} stats={stats} onCreate={() => navigate("create")} onOpen={open} onDelete={(id) => deletePlans([id])} onDeleteMany={deletePlans} />}
      {view === "create" && <CreateLessonPlan profile={profile} onGenerated={(plan) => { save(plan); open(plan); }} />}
      {view === "plans" && <Dashboard plans={plans} stats={stats} compact onCreate={() => navigate("create")} onOpen={open} onDelete={(id) => deletePlans([id])} onDeleteMany={deletePlans} />}
      {view === "assessment-create" && <AssessmentBuilder key={assessmentCreateKey} seed={assessmentSeed} onSave={saveAssessment} onBack={() => navigate("assessments")} />}
      {view === "assessments" && <AssessmentLibrary assessments={assessments} onCreate={() => createAssessment()} onOpen={openAssessment} onDuplicate={duplicateAssessment} onDelete={(id) => persistAssessments(assessments.filter((item) => item.id !== id))} />}
      {view === "assessment-editor" && activeAssessment && <AssessmentBuilder initial={activeAssessment} onSave={saveAssessment} onBack={() => navigate("assessments")} />}
      {view === "curriculum" && <CurriculumView />}
      {view === "settings" && <SettingsView profile={profile} onSave={(next) => { setProfile(next); saveProfile(next); }} />}
      {view === "editor" && active && <LessonEditor plan={active} onSave={save} onBack={() => navigate("plans")} onCreateAssessment={(plan) => createAssessment({ grade: plan.grade, subject: plan.area, term: plan.term === "one-term" ? 1 : plan.term, week: plan.week, title: `${plan.title} Summative Test`, competencyTexts: plan.competencyText.split("\n").map((item) => item.replace(/^\d+[.)]\s*/, "").trim()).filter(Boolean) })} />}
    </main>
  </div>;
}
