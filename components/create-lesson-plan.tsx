"use client";

import { FormEvent, useMemo, useState } from "react";
import { Check, ChevronRight, Info, Sparkles } from "lucide-react";
import { competencies, areaAbbreviation, learningAreaOptionLabel, termLabel } from "@/data/curriculum";
import { generateLessonPlan } from "@/services/generator";
import { Competency, GradeLevel, LessonFlowFormat, LessonPlan, TeacherProfile, Term } from "@/types/lesson-plan";
import { lessonFlowOptions } from "@/data/lesson-flow";

const contextTags = ["Mixed ability levels", "Enjoys group work", "Limited internet at home", "Struggling readers", "Large class size", "Kinesthetic learners", "Responds well to visuals", "Low participation"];

export function CreateLessonPlan({ profile, onGenerated }: { profile: TeacherProfile; onGenerated: (plan: LessonPlan) => void }) {
  const [grade, setGrade] = useState<GradeLevel>(8); const [term, setTerm] = useState<Term>(2); const [week, setWeek] = useState(3);
  const [area, setArea] = useState<Competency["area"]>("Family and Consumer Science"); const [selected, setSelected] = useState<string[]>([]);
  const [topic, setTopic] = useState(""); const [sessions, setSessions] = useState(4);
  const [flowFormat, setFlowFormat] = useState<LessonFlowFormat>("ilaw");
  const [section, setSection] = useState("MAKAKALIKASAN"); const [duration, setDuration] = useState(60); const [schoolYear, setSchoolYear] = useState("2026–2027");
  const [tags, setTags] = useState<string[]>(["Mixed ability levels", "Responds well to visuals"]); const [notes, setNotes] = useState("");
  const [resources, setResources] = useState(""); const [instructions, setInstructions] = useState("");
  const [generating, setGenerating] = useState(false); const [error, setError] = useState("");
  const available = useMemo(() => competencies.filter((c) => c.grade === grade && c.term === term && c.weeks.includes(week) && c.area === area), [grade, term, week, area]);
  const selectedCompetencies = available.filter((c) => selected.includes(c.id));
  const areas = Array.from(new Set(competencies.filter((c) => c.grade === grade).map((c) => c.area)));
  const terms = Array.from(new Set(competencies.filter((c) => c.grade === grade && c.area === area).map((c) => c.term))).sort((a,b) => String(a).localeCompare(String(b)));
  const weeks = Array.from(new Set(competencies.filter((c) => c.grade === grade && c.area === area && c.term === term).flatMap((c) => c.weeks))).sort((a,b) => a-b);

  function changeGrade(nextGrade: GradeLevel) {
    const first = competencies.find((c) => c.grade === nextGrade);
    if (!first) return;
    const nextArea = first.area;
    const nextTerm = first.term;
    const nextWeek = first.weeks[0];
    setGrade(nextGrade); setTerm(nextTerm); setWeek(nextWeek); if (nextArea) setArea(nextArea); setSelected([]);
  }

  function changeArea(nextArea: Competency["area"]) {
    const areaRows = competencies.filter((c) => c.grade === grade && c.area === nextArea);
    const areaTerms = Array.from(new Set(areaRows.map((c) => c.term))).sort((a,b) => String(a).localeCompare(String(b)));
    const nextTerm = areaTerms.includes(term) ? term : areaTerms[0];
    const areaWeeks = Array.from(new Set(areaRows.filter((c) => c.term === nextTerm).flatMap((c) => c.weeks))).sort((a,b) => a-b);
    const nextWeek = areaWeeks.includes(week) ? week : areaWeeks[0];
    setArea(nextArea); setTerm(nextTerm); setWeek(nextWeek); setSelected([]);
  }

  function changeTerm(nextTerm: Term) {
    const nextWeeks = Array.from(new Set(competencies.filter((c) => c.grade === grade && c.area === area && c.term === nextTerm).flatMap((c) => c.weeks))).sort((a,b) => a-b);
    const nextWeek = nextWeeks[0];
    setTerm(nextTerm); setWeek(nextWeek); setSelected([]);
  }

  function changeWeek(nextWeek: number) {
    setWeek(nextWeek); setSelected([]);
  }

  function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    if (!selectedCompetencies.length) { setError("Select at least one official learning competency."); return; }
    setGenerating(true);
    setTimeout(() => {
      try { onGenerated(generateLessonPlan({ grade, area, term, week, competencies: selectedCompetencies, topic, sessions, flowFormat, learnerContext: [...tags, notes].filter(Boolean).join(". "), duration, availableResources: resources, instructions, profile, section, schoolYear })); }
      catch { setError("We could not generate the plan. Your entries are safe—please retry."); setGenerating(false); }
    }, 650);
  }

  return <form className="create-page" onSubmit={submit}>
    <div className="page-heading"><div><span className="eyebrow">New lesson plan</span><h1>Build the week, one clear decision at a time.</h1><p>Choose the official competency first. Every section remains editable after generation.</p></div><div className="step-meter"><b>4 sessions</b><span>Monday–Thursday</span></div></div>
    <div className="builder-layout"><div className="form-stack">
      <section className="form-card"><div className="card-heading"><span>1</span><div><h2>Curriculum & schedule</h2><p>Selections are filtered from the supplied Budget of Work.</p></div></div>
        <div className="field-grid four"><label>Grade Level<select value={grade} onChange={(e) => changeGrade(Number(e.target.value) as GradeLevel)}>{[7,8,9,10].map((item)=><option key={item} value={item}>Grade {item}</option>)}</select></label><label>Learning Area<select value={area} onChange={(e) => changeArea(e.target.value as Competency["area"])}>{areas.map((item) => <option key={item} value={item}>{learningAreaOptionLabel(item)}</option>)}</select></label><label>Term<select value={term} onChange={(e) => changeTerm((e.target.value === "one-term" ? "one-term" : Number(e.target.value)) as Term)}>{terms.map((item)=><option key={item} value={item}>{termLabel(item)}</option>)}</select></label><label>Week<select value={week} onChange={(e) => changeWeek(Number(e.target.value))}>{weeks.map((item)=><option key={item} value={item}>Week {item}</option>)}</select></label></div>
        <div className="competency-list"><div className="list-label"><b>Official competencies</b><small>{available.length} available</small></div>{available.length ? available.map((item) => <label className={`competency ${selected.includes(item.id) ? "selected" : ""}`} key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={() => setSelected(selected.includes(item.id) ? selected.filter((id) => id !== item.id) : [...selected, item.id])}/><span className="check"><Check /></span><span><b>{areaAbbreviation[item.area]} · Week {week}{item.strand ? ` · ${item.strand}` : ""}</b>{item.text}</span></label>) : <div className="empty-inline"><Info />No competency is scheduled for this combination.</div>}</div>
      </section>
      <section className="form-card"><div className="card-heading"><span>2</span><div><h2>Lesson details</h2><p>The Name of Lesson will be based on the selected learning competency.</p></div></div><div className="field-grid"><label className="wide">Additional lesson focus (optional)<input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Add a specific example or emphasis for the activities" /></label><label className="wide">Lesson Flow Format<select value={flowFormat} onChange={(e) => setFlowFormat(e.target.value as LessonFlowFormat)}>{lessonFlowOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label>Grade & section<input value={section} onChange={(e) => setSection(e.target.value)} /></label><label>School year<input value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} /></label><label>Class duration<select value={duration} onChange={(e) => setDuration(Number(e.target.value))}><option value="40">40 minutes</option><option value="50">50 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option></select></label><fieldset><legend>Sessions</legend><div className="segmented">{[1,2,3,4].map((n)=><button type="button" className={sessions===n?"active":""} key={n} onClick={()=>setSessions(n)}>{n}</button>)}</div></fieldset></div></section>
      <section className="form-card"><div className="card-heading"><span>3</span><div><h2>Learner context & resources</h2><p>Add what matters for this group. Supports will be built into each session.</p></div></div><div className="tag-list">{contextTags.map((tag)=><button type="button" className={tags.includes(tag)?"active":""} onClick={()=>setTags(tags.includes(tag)?tags.filter(t=>t!==tag):[...tags,tag])} key={tag}>{tags.includes(tag)&&<Check/>}{tag}</button>)}</div><div className="field-grid"><label className="wide">Additional observations<textarea value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Prior knowledge, strengths, interests, or barriers..."/></label><label className="wide">Available resources<input value={resources} onChange={(e)=>setResources(e.target.value)} placeholder="PowerPoint presentation, flashcards, pictures/images, activity sheets, worksheets, video clips..." /></label><label className="wide">Teacher instructions (optional)<textarea value={instructions} onChange={(e)=>setInstructions(e.target.value)} placeholder="Emphasize local examples, include a performance task..."/></label></div></section>
    </div><aside className="generate-panel"><div className="summary-head"><span><Sparkles /></span><div><b>Ready to generate</b><small>Structured ILAW plan</small></div></div><dl><div><dt>Class</dt><dd>Grade {grade} · {section}</dd></div><div><dt>Schedule</dt><dd>{termLabel(term)} · Week {week}</dd></div><div><dt>Area</dt><dd>{areaAbbreviation[area]}</dd></div><div><dt>Flow</dt><dd>{lessonFlowOptions.find((item) => item.value === flowFormat)?.label.split(" – ")[0]}</dd></div><div><dt>Sessions</dt><dd>{sessions} × {duration} min</dd></div><div><dt>Competencies</dt><dd>{selected.length || "None selected"}</dd></div></dl><p className="trust-note"><Check />Official competency text will not be rewritten.</p>{error && <p className="form-error">{error}</p>}<button className="primary-btn generate-btn" disabled={generating} type="submit">{generating ? "Generating your plan..." : <>Generate ILAW Lesson Plan <ChevronRight /></>}</button><small className="review-note">Review and validate all generated content before classroom use.</small></aside></div>
  </form>;
}
