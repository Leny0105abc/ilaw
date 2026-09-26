"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenText, FilePlus2, Files, GraduationCap, LayoutDashboard, Menu, Settings, Sparkles, X } from "lucide-react";
import { LessonPlan, TeacherProfile, defaultProfile } from "@/types/lesson-plan";
import { loadPlans, loadProfile, savePlans, saveProfile } from "@/services/storage";
import { Dashboard } from "@/components/dashboard";
import { CreateLessonPlan } from "@/components/create-lesson-plan";
import { LessonEditor } from "@/components/lesson-editor";
import { CurriculumView } from "@/components/curriculum-view";
import { SettingsView } from "@/components/settings-view";

type View = "dashboard" | "create" | "plans" | "curriculum" | "settings" | "editor";
const nav = [
  ["dashboard", "Dashboard", LayoutDashboard], ["create", "Create Lesson Plan", FilePlus2], ["plans", "Lesson Plans", Files],
  ["curriculum", "Curriculum", GraduationCap], ["settings", "Settings", Settings],
] as const;

export function AppShell() {
  const [view, setView] = useState<View>("create");
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [profile, setProfile] = useState<TeacherProfile>(defaultProfile);
  const [active, setActive] = useState<LessonPlan | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { queueMicrotask(() => { setPlans(loadPlans()); setProfile(loadProfile()); setHydrated(true); }); }, []);
  const stats = useMemo(() => ({ total: plans.length, drafts: plans.filter((p) => p.status === "Draft").length, completed: plans.filter((p) => p.status === "Completed").length }), [plans]);

  function persist(next: LessonPlan[]) { setPlans(next); savePlans(next); }
  function open(plan: LessonPlan) { setActive(plan); setView("editor"); }
  function save(plan: LessonPlan) { const next = [plan, ...plans.filter((item) => item.id !== plan.id)]; persist(next); setActive(plan); }
  function navigate(next: View) { setView(next); setMobileNav(false); }

  if (!hydrated) return <div className="loading-screen"><span className="brand-mark"><BookOpenText /></span><p>Opening your lesson planner...</p></div>;

  return <div className="app-frame">
    <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
      <div className="brand"><span className="brand-mark"><BookOpenText /></span><div><b>ILAW</b><small>Lesson Plan Generator</small></div><button className="icon-btn close-nav" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X /></button></div>
      <nav aria-label="Main navigation">{nav.map(([id, label, Icon]) => <button key={id} className={view === id ? "active" : ""} onClick={() => navigate(id)}><Icon />{label}</button>)}</nav>
      <div className="sidebar-note"><Sparkles /><div><b>Teacher-reviewed AI</b><span>Competencies stay exactly as published.</span></div></div>
      <div className="profile-chip"><span>{profile.teacherName.split(" ").map((w) => w[0]).slice(0,2).join("")}</span><div><b>{profile.teacherName}</b><small>{profile.school}</small></div></div>
    </aside>
    {mobileNav && <button className="nav-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
    <main>
      <header className="topbar"><button className="icon-btn menu-btn" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu /></button><div><span className="eyebrow">School Year 2026–2027</span><strong>{view === "editor" ? "Review lesson plan" : nav.find(([id]) => id === view)?.[1] || "ILAW"}</strong></div><div className="save-state"><i />Saved on this device</div></header>
      {view === "dashboard" && <Dashboard plans={plans} stats={stats} onCreate={() => navigate("create")} onOpen={open} onDelete={(id) => persist(plans.filter((p) => p.id !== id))} />}
      {view === "create" && <CreateLessonPlan profile={profile} onGenerated={(plan) => { save(plan); open(plan); }} />}
      {view === "plans" && <Dashboard plans={plans} stats={stats} compact onCreate={() => navigate("create")} onOpen={open} onDelete={(id) => persist(plans.filter((p) => p.id !== id))} />}
      {view === "curriculum" && <CurriculumView />}
      {view === "settings" && <SettingsView profile={profile} onSave={(next) => { setProfile(next); saveProfile(next); }} />}
      {view === "editor" && active && <LessonEditor plan={active} onSave={save} onBack={() => navigate("plans")} />}
    </main>
  </div>;
}
