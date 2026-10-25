"use client";
import { useMemo, useRef } from "react";
import { AlertTriangle, CheckCircle2, Download, Eye, Pencil, Printer, XCircle } from "lucide-react";
import { WeeklyPowerPoint } from "@/types/powerpoint";
import { SlidePreview, slideKindLabel } from "@/components/powerpoint-slides";
import { powerPointChecks } from "@/services/powerpoint-review";

type Props = {
  presentation: WeeklyPowerPoint; busy: boolean; error?: string;
  onEdit: (index: number) => void; onDownload: () => void; onPrint: () => void;
};

const statusIcon = { pass: CheckCircle2, warn: AlertTriangle, fail: XCircle } as const;

// Optional full-deck preview. Downloads are blocked only when an automatic check fails.
export function PowerPointPreview({ presentation, busy, error, onEdit, onDownload, onPrint }: Props) {
  const slideRefs = useRef(new Map<string, HTMLElement>());
  const checks = useMemo(() => powerPointChecks(presentation), [presentation]);
  const blocking = checks.filter(check => check.status === "fail");
  const total = presentation.slides.length;
  function show(index?: number) {
    if (index === undefined) return;
    slideRefs.current.get(presentation.slides[index]?.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return <div className="ppt-review">
    <div className="ppt-review-grid">
      <div className="ppt-review-slides">
        <p className="ppt-review-intro"><Eye/><span>All {total} slides as they will appear in the PowerPoint. Use <b>Edit slide</b> to change anything.</span></p>
        {presentation.slides.map((slide, index) => <article key={slide.id} className="ppt-review-slide" ref={element => { if (element) slideRefs.current.set(slide.id, element); else slideRefs.current.delete(slide.id); }}>
          <div className="ppt-review-slide-head">
            <span className="ppt-review-number">{index + 1}</span>
            <div><b>Slide {index + 1} of {total}</b><small>{slide.day ? `Day ${slide.day} / ` : ""}{slideKindLabel[slide.kind] || slide.kind}</small></div>
            <button className="secondary-btn" disabled={busy} onClick={() => onEdit(index)}><Pencil/>Edit slide</button>
          </div>
          <SlidePreview presentation={presentation} slide={slide}/>
          {(slide.notes.trim() || slide.questions.length > 0) && <details className="ppt-review-notes"><summary>Speaker notes{slide.questions.length ? " and answers" : ""}</summary>{slide.notes.trim() && <p>{slide.notes}</p>}{slide.questions.map(item => <p key={item.number}><b>{item.number}. Answer {item.correctAnswer}:</b> {item.rationale}</p>)}</details>}
        </article>)}
      </div>

      <aside className="ppt-review-panel" aria-label="Checks and downloads">
        <h2>Automatic checks</h2>
        <ul className="ppt-review-checks">{checks.map(check => { const Icon = statusIcon[check.status]; return <li key={check.id} className={check.status}>
          <Icon/><div><b>{check.label}</b><p>{check.detail}</p>{check.slideIndex !== undefined && <button className="text-btn" onClick={() => show(check.slideIndex)}>Show slide {check.slideIndex + 1}</button>}</div>
        </li>; })}</ul>
        {error && <p className="weekly-error" role="alert">{error}</p>}
        <div className="ppt-review-downloads">
          <button className="primary-btn" disabled={busy || blocking.length > 0} onClick={onDownload}><Download/>Download PowerPoint (.pptx)</button>
          <button className="secondary-btn" disabled={busy || blocking.length > 0} onClick={onPrint}><Printer/>Print / Save PDF</button>
        </div>
        {blocking.length > 0 && <p className="ppt-review-hint">Fix the failed check{blocking.length === 1 ? "" : "s"} above to download.</p>}
      </aside>
    </div>
  </div>;
}
