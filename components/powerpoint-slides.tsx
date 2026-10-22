"use client";
import { SlideScenario, WeeklyPowerPoint, WeeklySlide } from "@/types/powerpoint";
import { SCENARIO_LIMITS, displayBullets } from "@/services/powerpoint-generator";
import { ptToCqw, situationFontSizes } from "@/services/powerpoint-layout";
import { ArrowDown, ArrowUp, MapPin, Plus, RefreshCw, Trash2 } from "lucide-react";

export const slideKindLabel: Record<WeeklySlide["kind"], string> = { title: "Title", competency: "Competency", objectives: "Objectives", divider: "Day divider", review: "Review", motivation: "Motivation", content: "Lesson content", application: "Application", situation: "Real-life situation", activity: "Activity", quiz: "Quiz", summary: "Summary", "answer-key": "Answer key" };

function SituationPreview({ slide }: { slide: WeeklySlide }) {
  const scenario = slide.scenario || { setting: "", story: "", questions: [] };
  const questions = scenario.questions.filter(item => item.trim());
  const size = situationFontSizes({ ...scenario, questions }, !!slide.visual);
  return <div className={`weekly-situation ${slide.visual ? "with-visual" : ""}`}>
    <div className="weekly-situation-main">
      <div className="weekly-situation-story"><b>Setting: {scenario.setting || "Add a familiar place"}</b><p className={scenario.story ? "" : "empty"} style={scenario.story ? { fontSize: ptToCqw(size.story) } : undefined}>{scenario.story || "Write a short real-life story where someone must use this lesson."}</p></div>
      {slide.visual && <div className="weekly-visual-placeholder">[{slide.visual}]</div>}
    </div>
    <div className="weekly-situation-guide"><b>Think &amp; discuss</b>{questions.length ? <ol style={{ fontSize: ptToCqw(size.questions) }}>{questions.map((text, index) => <li key={index}>{text}</li>)}</ol> : <p className="empty">Add 2–3 guide questions.</p>}</div>
  </div>;
}

export function SlidePreview({ presentation, slide }: { presentation: WeeklyPowerPoint; slide: WeeklySlide }) {
  const opening = slide.kind === "title" || slide.kind === "divider";
  const situation = slide.kind === "situation";
  return <div className={`weekly-slide ${opening ? "opening" : ""} ${situation ? "situation" : ""}`} aria-label={`Slide preview: ${slide.title}`}>
    {situation && <span className="weekly-slide-label">Real-Life Situation</span>}
    <h2>{slide.title}</h2>
    {situation ? <SituationPreview slide={slide}/> : slide.questions.length ? <div className="weekly-quiz-preview">{slide.questions.map(item=><div key={item.number}><b>{item.number}. {item.question}</b>{(["A","B","C","D"] as const).map(letter=><p key={letter}>{letter}. {item.choices[letter]}</p>)}</div>)}</div> : slide.table ? <table><thead><tr>{slide.table.headers.map((cell,index)=><th key={index}>{cell}</th>)}</tr></thead><tbody>{slide.table.rows.map((row,index)=><tr key={index}>{row.map((cell,column)=><td key={column}>{cell}</td>)}</tr>)}</tbody></table> : <div className={slide.visual ? "weekly-visual-layout" : ""}><ul className={slide.kind === "competency" || slide.kind === "answer-key" ? "plain" : ""}>{displayBullets(presentation,slide).map((text,index)=><li key={index}>{text}</li>)}</ul>{slide.visual && <div className="weekly-visual-placeholder">[{slide.visual}]</div>}</div>}
  </div>;
}

function SituationFields({ slide, onPatch }: { slide: WeeklySlide; onPatch: (patch: Partial<WeeklySlide>) => void }) {
  const scenario: SlideScenario = slide.scenario || { setting: "", story: "", questions: ["", ""] };
  const set = (patch: Partial<SlideScenario>) => onPatch({ scenario: { ...scenario, ...patch } });
  return <div className="weekly-situation-fields">
    <p className="trust-note"><MapPin/>A real-life situation is a short story from everyday life (home, school, barangay, market, farm, workplace) where learners must use the lesson to solve a problem or make a decision.</p>
    <label>Setting / place<input maxLength={SCENARIO_LIMITS.setting} value={scenario.setting} placeholder="e.g. A family-run sari-sari store in the barangay" onChange={event=>set({ setting: event.target.value })}/></label>
    <label><span className="weekly-field-head">Story (3–4 sentences)<small>{scenario.story.length}/{SCENARIO_LIMITS.story}</small></span><textarea rows={5} maxLength={SCENARIO_LIMITS.story} value={scenario.story} placeholder="Mila helps her mother run their sari-sari store. One afternoon…" onChange={event=>set({ story: event.target.value })}/></label>
    <label>Guide questions (one per line, 2–3)<textarea rows={3} value={scenario.questions.join("\n")} placeholder={"What should Mila do first?\nWhich idea from our lesson helps her decide?"} onChange={event=>set({ questions: event.target.value.split("\n").slice(0, 3) })}/></label>
    <label>Picture suggestion (optional)<input maxLength={200} value={slide.visual} placeholder="e.g. Photo of a neighborhood sari-sari store" onChange={event=>onPatch({ visual: event.target.value })}/></label>
  </div>;
}

export function PowerPointSlides({ presentation, active, onActive, onPatch, onMove, onDelete, onAdd, onAddSituation, onRegenerate, disabled }: { presentation: WeeklyPowerPoint; active: number; onActive: (index:number)=>void; onPatch:(patch:Partial<WeeklySlide>)=>void; onMove:(direction:number)=>void; onDelete:()=>void; onAdd:()=>void; onAddSituation:()=>void; onRegenerate:()=>void; disabled:boolean }) {
  const slide = presentation.slides[active];
  if (!slide) return <p>No slides yet. Generate or import the presentation first.</p>;
  const fixed = ["title","competency","divider","answer-key"].includes(slide.kind);
  const full = presentation.slides.length >= 60;
  return <div className="weekly-editor"><aside className="weekly-filmstrip" aria-label="Slide list">{presentation.slides.map((item,index)=><button key={item.id} onClick={()=>onActive(index)} className={`${active===index?"active":""} ${item.kind==="situation"?"situation":""}`} aria-current={active===index?"step":undefined}><span>{index+1}</span><b>{item.title}</b><small>{item.day?`Day ${item.day} / `:""}{slideKindLabel[item.kind] || item.kind}</small></button>)}</aside><section className="weekly-edit-panel"><div className="weekly-slide-actions"><strong>Slide {active+1} of {presentation.slides.length}</strong><button className="secondary-btn" disabled={disabled || fixed} onClick={onRegenerate}><RefreshCw/>Regenerate slide</button><button className="icon-btn" aria-label="Move slide up" disabled={disabled || active===0 || slide.kind==="answer-key"} onClick={()=>onMove(-1)}><ArrowUp/></button><button className="icon-btn" aria-label="Move slide down" disabled={disabled || active>=presentation.slides.length-2} onClick={()=>onMove(1)}><ArrowDown/></button><button className="icon-btn" aria-label="Delete slide" disabled={disabled} onClick={onDelete}><Trash2/></button><button className="secondary-btn" disabled={disabled || full} onClick={onAdd}><Plus/>Add slide</button><button className="secondary-btn" disabled={disabled || full} onClick={onAddSituation}><MapPin/>Add real-life situation</button></div>
    <SlidePreview presentation={presentation} slide={slide}/>
    <fieldset disabled={disabled} className="weekly-slide-fields"><label>Slide title<input value={slide.title} maxLength={110} onChange={event=>onPatch({title:event.target.value})}/></label>
    {slide.kind === "competency" ? <label>Official Learning Competency (locked)<textarea readOnly value={slide.bullets.join("\n")}/></label> : slide.kind === "answer-key" ? <p className="trust-note">The answer key updates from the five quiz answers. Edit the correct answer on a quiz slide.</p> : slide.kind === "situation" ? <SituationFields slide={slide} onPatch={onPatch}/> : !slide.questions.length && <><label>Slide content (one brief bullet per line)<textarea rows={6} value={slide.bullets.join("\n")} onChange={event=>onPatch({bullets:event.target.value.split("\n")})}/></label><label>Visual suggestion / image placeholder<input maxLength={200} value={slide.visual} onChange={event=>onPatch({visual:event.target.value})}/></label><label>Editable table (optional: tab-separated columns, first row is the header)<textarea value={slide.table ? [slide.table.headers,...slide.table.rows].map(row=>row.join("\t")).join("\n") : ""} placeholder={"Tool\tPurpose\nNail file\tShape the free edge"} onChange={event=>{const rows=event.target.value.split("\n").map(line=>line.split("\t"));onPatch({table:event.target.value?{headers:rows[0],rows:rows.slice(1)}:null});}}/></label><small>Use either a table or bullets. A table can have 2–3 columns and up to 4 body rows.</small></>}
    {slide.questions.map((item,index)=><div className="weekly-question-editor" key={item.number}><h3>Quiz question {item.number}</h3><label>Question<input maxLength={150} value={item.question} onChange={event=>onPatch({questions:slide.questions.map((q,i)=>i===index?{...q,question:event.target.value}:q)})}/></label><div className="field-grid">{(["A","B","C","D"] as const).map(letter=><label key={letter}>Choice {letter}<input maxLength={75} value={item.choices[letter]} onChange={event=>onPatch({questions:slide.questions.map((q,i)=>i===index?{...q,choices:{...q.choices,[letter]:event.target.value}}:q)})}/></label>)}<label>Correct answer<select value={item.correctAnswer} onChange={event=>onPatch({questions:slide.questions.map((q,i)=>i===index?{...q,correctAnswer:event.target.value as typeof q.correctAnswer}:q)})}>{["A","B","C","D"].map(letter=><option key={letter}>{letter}</option>)}</select></label></div><label>Answer explanation (speaker notes only)<textarea value={item.rationale} onChange={event=>onPatch({questions:slide.questions.map((q,i)=>i===index?{...q,rationale:event.target.value}:q)})}/></label></div>)}
    <label>Speaker notes / source references<textarea value={slide.notes} maxLength={3000} onChange={event=>onPatch({notes:event.target.value})}/></label></fieldset>
    <p className="review-note">Review lesson accuracy and quiz answers before teaching. Adding or deleting slides changes the total; deleting required content blocks export until restored.</p>
  </section></div>;
}
