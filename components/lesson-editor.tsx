"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, ChevronDown, ClipboardList, Download, FileText, Printer, Redo2, Save, Undo2 } from "lucide-react";
import { LessonPlan, LessonSession } from "@/types/lesson-plan";
import { exportDocx, exportPdf } from "@/services/export";
import { LessonPreview } from "@/components/lesson-preview";
import { learningAreaLabel } from "@/data/curriculum";
import { flowFormatName } from "@/data/lesson-flow";

export function LessonEditor({ plan, onSave, onBack, onCreateAssessment }: { plan: LessonPlan; onSave: (plan: LessonPlan) => void; onBack: () => void; onCreateAssessment: (plan: LessonPlan) => void }) {
  const [draft, setDraft] = useState(plan); const [tab, setTab] = useState<"editor"|"preview">("editor"); const [sessionIndex, setSessionIndex] = useState(0); const [saving, setSaving] = useState(false);
  useEffect(() => { const id = setTimeout(() => { setSaving(true); const next = { ...draft, updatedAt: new Date().toISOString() }; onSave(next); setTimeout(() => setSaving(false), 250); }, 900); return () => clearTimeout(id); }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps
  const session = draft.sessions[sessionIndex];
  function patchSession(patch: Partial<LessonSession>) { setDraft({ ...draft, sessions: draft.sessions.map((item, index) => index === sessionIndex ? { ...item, ...patch } : item) }); }
  function patchFlow(index: number, value: string) { patchSession({ flow: { steps: session.flow.steps.map((step, stepIndex) => stepIndex === index ? { ...step, content: value } : step) } }); }
  function patchTeacherName(teacherName: string) { setDraft({ ...draft, profile: { ...draft.profile, teacherName } }); }
  function print() { window.print(); }

  return <div className="editor-page"><div className="editor-toolbar"><button className="text-btn" onClick={onBack}><ArrowLeft />Lesson plans</button><div className="toolbar-title"><input value={draft.title} onChange={(e)=>setDraft({...draft,title:e.target.value})}/><span>{saving ? "Saving..." : <><Check /> All changes saved</>}</span></div><div className="toolbar-actions"><button className="icon-btn" title="Undo" disabled><Undo2 /></button><button className="icon-btn" title="Redo" disabled><Redo2 /></button><button className="secondary-btn assessment-from-plan" title="Create Assessment" onClick={() => onCreateAssessment(draft)}><ClipboardList /><span>Create Assessment</span></button><button className="secondary-btn" onClick={()=>onSave({...draft,status:draft.status === "Draft" ? "Completed" : "Draft"})}><Save />{draft.status}</button><div className="export-menu"><button className="primary-btn"><Download />Export<ChevronDown /></button><div><button onClick={()=>exportDocx(draft)}><FileText />Microsoft Word (.docx)</button><button onClick={()=>exportPdf(draft)}><FileText />PDF document</button><button onClick={print}><Printer />Print lesson plan</button></div></div></div></div>
    <div className="mobile-view-tabs"><button className={tab==="editor"?"active":""} onClick={()=>setTab("editor")}>Editor</button><button className={tab==="preview"?"active":""} onClick={()=>setTab("preview")}>Preview</button></div>
    <div className="editor-grid"><section className={`editor-fields ${tab!=="editor"?"mobile-hidden":""}`}>
      <Editable title="Lesson information"><div className="lesson-info-grid"><label>Name of Lesson<input value={draft.title} onChange={(e)=>setDraft({...draft,title:e.target.value})}/></label><label>Learning Area/s<input value={learningAreaLabel(draft.grade, draft.area)} readOnly /></label><label>Designed by Teacher/s<input value={draft.profile.teacherName} onChange={(e)=>patchTeacherName(e.target.value)}/></label><label>Designed for which Grade Level and Section<span className="grade-section-fields"><input value={`GRADE ${draft.grade}`} readOnly /><input aria-label="Section" value={draft.section} onChange={(e)=>setDraft({...draft,section:e.target.value})}/></span></label><label className="wide">References<textarea value={draft.references} onChange={(e)=>setDraft({...draft,references:e.target.value})}/></label></div></Editable>
      <div className="session-tabs">{draft.sessions.map((item,index)=><button key={item.session} className={sessionIndex===index?"active":""} onClick={()=>setSessionIndex(index)}><small>{item.day}</small>Session {item.session}</button>)}</div>
      <div className="editor-section-label">INTENTIONS</div>
      <Editable title="Learning competency" locked hint="Preserved from the official Budget of Work"><textarea value={draft.competencyText} readOnly /></Editable>
      <Editable title="Learning objectives"><div className="objective-stack">{session.objectives.map((item,index)=><textarea key={index} value={item} onChange={(e)=>patchSession({objectives:session.objectives.map((o,i)=>i===index?e.target.value:o)})}/>)}</div></Editable>
      <Editable title="Learner context"><textarea value={session.learnerContext} onChange={(e)=>patchSession({learnerContext:e.target.value})}/></Editable>
      <div className="editor-section-label">LEARNING EXPERIENCE</div>
      <Editable title="Pre-lesson"><textarea value={session.preLesson} onChange={(e)=>patchSession({preLesson:e.target.value})}/></Editable>
      <Editable title="Learning flow" badge={flowFormatName(draft.flowFormat).split(" – ")[0]}>{session.flow.steps.map((step,index)=><label key={`${step.label}-${index}`}>{step.label || `Activity ${index + 1}`}<textarea value={step.content} onChange={(e)=>patchFlow(index,e.target.value)}/></label>)}</Editable>
      <Editable title="Learning resources"><input value={session.resources.join(", ")} onChange={(e)=>patchSession({resources:e.target.value.split(",").map(v=>v.trim()).filter(Boolean)})}/></Editable>
      <Editable title="Opportunities for integration"><textarea value={session.integration} onChange={(e)=>patchSession({integration:e.target.value})}/></Editable>
      <div className="editor-section-label">ASSESSMENT</div>
      <Editable title="Formative assessment"><textarea value={session.assessment} onChange={(e)=>patchSession({assessment:e.target.value})}/></Editable>
      <div className="editor-section-label">WAYS FORWARD</div>
      <Editable title="Extended learning opportunities"><textarea value={session.extendedLearning} onChange={(e)=>patchSession({extendedLearning:e.target.value})}/></Editable>
      <Editable title="Reflections"><textarea value={session.reflection} onChange={(e)=>patchSession({reflection:e.target.value})}/></Editable>
    </section><section className={`preview-pane ${tab!=="preview"?"mobile-hidden":""}`}><div className="preview-label"><span>Live preview</span><small>A4 landscape · editable Word export</small></div><LessonPreview plan={draft}/></section></div>
  </div>;
}

function Editable({ title, children, locked, hint, badge }: { title: string; children: React.ReactNode; locked?: boolean; hint?: string; badge?: string }) { return <div className="edit-card"><div><h3>{title}</h3>{badge && <span className="mini-badge">{badge}</span>}{locked && <span className="locked"><Check />Official text</span>}</div>{hint && <p>{hint}</p>}{children}</div>; }
