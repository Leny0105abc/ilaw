"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { BookOpenText, ClipboardList, FilePlus2, Files, FolderOpen, GraduationCap, LayoutDashboard, LogOut, Menu, Presentation, Settings, Sparkles, X } from "lucide-react";
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
import { readAdminSession, signOutAdmin } from "@/services/auth";
import "@/app/auth.css";
import { WeeklyPowerPoint } from "@/types/powerpoint";
import { loadPowerPoints, savePowerPoints } from "@/services/powerpoint-storage";
import { PowerPointBuilder } from "@/components/powerpoint-builder";
import { PowerPointLibrary } from "@/components/powerpoint-library";
import { CotLesson, IndicatorLibrary } from "@/types/cot";
import { loadCotLessons, saveCotLessons } from "@/services/cot-storage";
import { loadIndicatorLibrary } from "@/services/cot-library";
import { cotRequestId } from "@/services/cot-generator";
const CotBuilder=dynamic(()=>import("@/components/cot-builder").then(m=>m.CotBuilder));
const CotLibrary=dynamic(()=>import("@/components/cot-library").then(m=>m.CotLibrary));
const CotIndicators=dynamic(()=>import("@/components/cot-indicators").then(m=>m.CotIndicators));

type View = "dashboard" | "create" | "plans" | "assessment-create" | "assessments" | "curriculum" | "settings" | "editor" | "assessment-editor" | "powerpoint-create" | "powerpoints" | "powerpoint-editor" | "cot-create" | "cot-lessons" | "cot-editor" | "cot-indicators";
const nav = [
  ["dashboard", "Dashboard", LayoutDashboard], ["create", "Create Lesson Plan", FilePlus2], ["plans", "Lesson Plans", Files],
  ["assessment-create", "Create Assessment", ClipboardList], ["assessments", "Saved Assessments", FolderOpen],
  ["powerpoint-create", "Create PowerPoint", Presentation], ["powerpoints", "Saved PowerPoints", FolderOpen],
  ["cot-create", "Create COT", FilePlus2], ["cot-lessons", "Saved COT Lessons", FolderOpen], ["cot-indicators", "PMES Indicators", ClipboardList],
  ["curriculum", "Curriculum", GraduationCap], ["settings", "Settings", Settings],
] as const;

export function AppShell() {
  const [view, setView] = useState<View>("dashboard");
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [profile, setProfile] = useState<TeacherProfile>(defaultProfile);
  const [active, setActive] = useState<LessonPlan | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [activeAssessment, setActiveAssessment] = useState<Assessment | null>(null);
  const [assessmentSeed, setAssessmentSeed] = useState<AssessmentSeed | null>(null);
  const [assessmentCreateKey, setAssessmentCreateKey] = useState(0);
  const [mobileNav, setMobileNav] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [powerpoints, setPowerpoints] = useState<WeeklyPowerPoint[]>([]);
  const [activePowerPoint, setActivePowerPoint] = useState<WeeklyPowerPoint|null>(null);
  const [powerpointSeed, setPowerpointSeed] = useState<LessonPlan|null>(null);
  const [powerpointCreateKey, setPowerpointCreateKey] = useState(0);
  const [cotLessons,setCotLessons]=useState<CotLesson[]>([]);
  const [activeCot,setActiveCot]=useState<CotLesson|null>(null);
  const [cotSeed,setCotSeed]=useState<LessonPlan|null>(null);
  const [cotCreateKey,setCotCreateKey]=useState(0);
  const [cotLibrary,setCotLibrary]=useState<IndicatorLibrary|null>(null);
  const [cotLibraryError,setCotLibraryError]=useState("");

  useEffect(() => {
    let cancelled = false;
    let loaded = false;
    async function checkSession() {
      try {
        await readAdminSession();
        if (cancelled) return;
        if (!loaded) {
          setPlans(loadPlans()); setAssessments(loadAssessments()); setPowerpoints(loadPowerPoints()); setProfile(loadProfile());setCotLessons(loadCotLessons());
          void loadIndicatorLibrary().then(value=>{if(!cancelled)setCotLibrary(value);}).catch(error=>{if(!cancelled)setCotLibraryError(error instanceof Error?error.message:"Could not load the indicator library.");});
          const views: Record<string, View> = { "/dashboard": "dashboard", "/lesson-plans": "plans", "/assessment": "assessment-create", "/assessments": "assessments", "/powerpoint": "powerpoint-create", "/powerpoints": "powerpoints", "/cot":"cot-create", "/cot-lessons":"cot-lessons", "/cot-indicators":"cot-indicators", "/settings": "settings", "/curriculum": "curriculum" };
          setView(views[window.location.pathname.replace(/\/$/, "")] || "dashboard");
          loaded = true;
        }
        setAuthError("");
        setHydrated(true);
      } catch (error) {
        if (cancelled) return;
        setHydrated(false);
        setAuthError(error instanceof Error ? error.message : "Sign-in verification failed.");
      }
    }
    void checkSession();
    const interval = window.setInterval(() => { void checkSession(); }, 30000);
    const onVisibility = () => { if (document.visibilityState === "visible") void checkSession(); };
    const onPageShow = (event: PageTransitionEvent) => { if (event.persisted) { setHydrated(false); void checkSession(); } };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);
    return () => { cancelled = true; window.clearInterval(interval); document.removeEventListener("visibilitychange", onVisibility); window.removeEventListener("pageshow", onPageShow); };
  }, []);
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
  function createPowerPoint(seed:LessonPlan|null=null) {setActivePowerPoint(null);setPowerpointSeed(seed);setPowerpointCreateKey(value=>value+1);setView("powerpoint-create");}
  function persistPowerPoints(next:WeeklyPowerPoint[]) {savePowerPoints(next);setPowerpoints(next);}
  function savePowerPoint(p:WeeklyPowerPoint) {persistPowerPoints([p,...powerpoints.filter(item=>item.id!==p.id)]);setActivePowerPoint(p);}
  function openPowerPoint(p:WeeklyPowerPoint) {setActivePowerPoint(p);setView("powerpoint-editor");}
  function duplicatePowerPoint(p:WeeklyPowerPoint) {const now=new Date().toISOString();const copy={...structuredClone(p),id:crypto.randomUUID(),title:`${p.title} (Copy)`.slice(0,110),createdAt:now,updatedAt:now};savePowerPoint(copy);openPowerPoint(copy);}
  function createCot(plan:LessonPlan|null=null){setActiveCot(null);setCotSeed(plan);setCotCreateKey(n=>n+1);setView("cot-create");}
  function persistCot(next:CotLesson[]){saveCotLessons(next);setCotLessons(next);}
  function saveCot(p:CotLesson){persistCot([p,...cotLessons.filter(c=>c.id!==p.id)]);setActiveCot(p);}
  function openCot(p:CotLesson){setActiveCot(p);setView("cot-editor");}
  function duplicateCot(p:CotLesson){const now=new Date().toISOString();const copy={...structuredClone(p),id:crypto.randomUUID(),title:`${p.title} (Copy)`,status:"Draft" as const,teacherReviewed:false,alignments:p.alignments.map(a=>({...structuredClone(a),teacherReviewed:false})),createdAt:now,updatedAt:now};copy.generationFingerprint=cotRequestId(copy);copy.materialFingerprint="";saveCot(copy);openCot(copy);}
  function refreshCotLibrary(){setCotLibraryError("");void loadIndicatorLibrary().then(setCotLibrary).catch(error=>setCotLibraryError(error instanceof Error?error.message:"Could not load the indicator library."));}
  function navigate(next: View) { if (next === "assessment-create") { createAssessment(); setMobileNav(false); return; } if(next==="powerpoint-create"){createPowerPoint();setMobileNav(false);return;}if(next==="cot-create"){createCot();setMobileNav(false);return;} setView(next); setMobileNav(false); }

  async function logout() {
    setSigningOut(true); setAuthError("");
    try { await signOutAdmin(); }
    catch (error) { setAuthError(error instanceof Error ? error.message : "Sign out failed."); setSigningOut(false); }
  }

  if (!hydrated) return <div className="loading-screen"><span className="brand-mark"><BookOpenText /></span><p>{authError || "Checking your secure session..."}</p>{authError && <a className="secondary-btn" href="/login">Return to Sign In</a>}</div>;

  return <div className="app-frame">
    <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
      <div className="brand"><span className="brand-mark"><BookOpenText /></span><div><b>ILAW</b><small>Lesson Plan Generator</small></div><button className="icon-btn close-nav" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X /></button></div>
      <nav aria-label="Main navigation">{nav.map(([id, label, Icon], index) => <div key={id}>{index === 3 && <span className="nav-group-label">Assessment</span>}{id === "powerpoint-create" && <span className="nav-group-label">Weekly PowerPoint</span>}{id === "cot-create" && <span className="nav-group-label">COT</span>}<button className={view === id || (id === "assessment-create" && view === "assessment-editor") || (id === "powerpoint-create" && view === "powerpoint-editor") || (id === "cot-create" && view === "cot-editor") ? "active" : ""} onClick={() => navigate(id)}><Icon />{label}</button></div>)}</nav>
      <div className="sidebar-note"><Sparkles /><div><b>Teacher-reviewed AI</b><span>Competencies stay exactly as published.</span></div></div>
      <div className="profile-chip"><span>{profile.teacherName.split(" ").map((w) => w[0]).slice(0,2).join("")}</span><div><b>{profile.teacherName}</b><small>{profile.school}</small></div></div>
      <button className="logout-btn" title="Save unfinished edits before signing out" onClick={() => void logout()} disabled={signingOut}><LogOut />{signingOut ? "Signing out..." : "Logout"}</button>
    </aside>
    {mobileNav && <button className="nav-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
    <main>
      <header className="topbar"><button className="icon-btn menu-btn" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu /></button><div><span className="eyebrow">School Year 2026–2027</span><strong>{view === "editor" ? "Review lesson plan" : view === "assessment-editor" ? "Review assessment" : view === "powerpoint-editor" ? "Review PowerPoint" : view === "cot-editor" ? "Review COT lesson" : nav.find(([id]) => id === view)?.[1] || "ILAW"}</strong></div><div className="save-state"><i />Saved on this device</div></header>
      {authError && <p className="form-error" role="alert">{authError}</p>}
      {view === "dashboard" && <Dashboard plans={plans} stats={stats} onCreate={() => navigate("create")} onOpen={open} onDelete={(id) => deletePlans([id])} onDeleteMany={deletePlans} />}
      {view === "create" && <CreateLessonPlan profile={profile} onGenerated={(plan) => { save(plan); open(plan); }} />}
      {view === "plans" && <Dashboard plans={plans} stats={stats} compact onCreate={() => navigate("create")} onOpen={open} onDelete={(id) => deletePlans([id])} onDeleteMany={deletePlans} />}
      {view === "assessment-create" && <AssessmentBuilder key={assessmentCreateKey} seed={assessmentSeed} onSave={saveAssessment} onBack={() => navigate("assessments")} />}
      {view === "assessments" && <AssessmentLibrary assessments={assessments} onCreate={() => createAssessment()} onOpen={openAssessment} onDuplicate={duplicateAssessment} onDelete={(id) => persistAssessments(assessments.filter((item) => item.id !== id))} />}
      {view === "assessment-editor" && activeAssessment && <AssessmentBuilder initial={activeAssessment} onSave={saveAssessment} onBack={() => navigate("assessments")} />}
      {view === "powerpoint-create" && <PowerPointBuilder key={powerpointCreateKey} plans={plans} seed={powerpointSeed} onSave={savePowerPoint} onBack={()=>navigate("powerpoints")}/>}
      {view === "powerpoints" && <PowerPointLibrary presentations={powerpoints} onCreate={()=>createPowerPoint()} onOpen={openPowerPoint} onDuplicate={duplicatePowerPoint} onDelete={id=>persistPowerPoints(powerpoints.filter(p=>p.id!==id))}/>}
      {view === "powerpoint-editor" && activePowerPoint && <PowerPointBuilder key={activePowerPoint.id} plans={plans} initial={activePowerPoint} onSave={savePowerPoint} onBack={()=>navigate("powerpoints")}/>}
      {view === "cot-create" && <CotBuilder key={cotCreateKey} plans={plans} seed={cotSeed} library={cotLibrary} libraryError={cotLibraryError} onReload={refreshCotLibrary} onManage={()=>navigate("cot-indicators")} onSave={saveCot} onBack={()=>navigate("cot-lessons")}/>}
      {view === "cot-editor" && activeCot && <CotBuilder key={activeCot.id} plans={plans} initial={activeCot} library={cotLibrary} libraryError={cotLibraryError} onReload={refreshCotLibrary} onManage={()=>navigate("cot-indicators")} onSave={saveCot} onBack={()=>navigate("cot-lessons")}/>}
      {view === "cot-lessons" && <CotLibrary lessons={cotLessons} onCreate={()=>createCot()} onOpen={openCot} onDuplicate={duplicateCot} onDelete={id=>persistCot(cotLessons.filter(p=>p.id!==id))}/>}
      {view === "cot-indicators" && <CotIndicators library={cotLibrary} error={cotLibraryError} onReload={refreshCotLibrary} onChanged={setCotLibrary}/>}
      {view === "curriculum" && <CurriculumView />}
      {view === "settings" && <SettingsView profile={profile} onSave={(next) => { setProfile(next); saveProfile(next); }} />}
      {view === "editor" && active && <LessonEditor plan={active} onSave={save} onBack={() => navigate("plans")} onCreateCot={createCot} onCreatePowerPoint={createPowerPoint} onCreateAssessment={(plan) => createAssessment({ grade: plan.grade, subject: plan.area, term: plan.term === "one-term" ? 1 : plan.term, week: plan.week, title: `${plan.title} Summative Test`, competencyTexts: plan.competencyText.split("\n").map((item) => item.replace(/^\d+[.)]\s*/, "").trim()).filter(Boolean) })} />}
    </main>
  </div>;
}
