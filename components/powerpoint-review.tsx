"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Eye, Lock, Pencil, Printer, ShieldCheck, XCircle } from "lucide-react";
import { WeeklyPowerPoint } from "@/types/powerpoint";
import { SlidePreview, slideKindLabel } from "@/components/powerpoint-slides";
import { powerPointChecks, reviewConfirmations, reviewState } from "@/services/powerpoint-review";

type Props = {
  presentation: WeeklyPowerPoint; busy: boolean; error?: string;
  onApprove: (confirmations: string[], viewedSlides: number) => void;
  onEdit: (index: number) => void; onDownload: () => void; onPrint: () => void;
};

const statusIcon = { pass: CheckCircle2, warn: AlertTriangle, fail: XCircle } as const;

export function PowerPointReview({ presentation, busy, error, onApprove, onEdit, onDownload, onPrint }: Props) {
  const state = reviewState(presentation);
  const approved = state === "approved";
  const [viewed, setViewed] = useState<Set<string>>(() => new Set(approved ? presentation.slides.map(slide => slide.id) : []));
  const [confirmations, setConfirmations] = useState<string[]>(() => approved ? reviewConfirmations.map(item => item.id) : []);
  const slideRefs = useRef(new Map<string, HTMLElement>());
  const panel = useRef<HTMLElement | null>(null);
  const checks = useMemo(() => powerPointChecks(presentation), [presentation]);
  const blocking = checks.filter(check => check.status === "fail");
  const seen = presentation.slides.filter(slide => viewed.has(slide.id)).length;
  const total = presentation.slides.length;
  const ready = !blocking.length && seen === total && confirmations.length === reviewConfirmations.length;

  // A slide counts as viewed once at least half of it has been on screen.
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      const ids = entries.filter(entry => entry.isIntersecting).map(entry => (entry.target as HTMLElement).dataset.slideId!).filter(Boolean);
      if (ids.length) setViewed(current => { const next = new Set(current); ids.forEach(id => next.add(id)); return next.size === current.size ? current : next; });
    }, { threshold: 0.5 });
    slideRefs.current.forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, [presentation.slides]);

  function show(index?: number) {
    if (index === undefined) return;
    slideRefs.current.get(presentation.slides[index]?.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  const nextUnviewed = presentation.slides.findIndex(slide => !viewed.has(slide.id));

  return <div className="ppt-review">
    <ol className="ppt-steps" aria-label="PowerPoint steps">
      <li className="done"><span>1</span>Generate</li><li className="done"><span>2</span>Edit</li>
      <li className={approved ? "done" : "current"}><span>3</span>Review &amp; approve</li>
      <li className={approved ? "current" : ""}><span>4</span>Download</li>
    </ol>
    <div className="ppt-review-grid">
      <div className="ppt-review-slides">
        <p className="ppt-review-intro"><Eye/><span>Scroll through every slide as it will appear in the PowerPoint. Use <b>Edit slide</b> to fix anything, then come back to approve.</span></p>
        {presentation.slides.map((slide, index) => <article key={slide.id} className={`ppt-review-slide ${viewed.has(slide.id) ? "viewed" : ""}`}>
          <div className="ppt-review-slide-head">
            <span className="ppt-review-number">{index + 1}</span>
            <div><b>Slide {index + 1} of {total}</b><small>{slide.day ? `Day ${slide.day} / ` : ""}{slideKindLabel[slide.kind] || slide.kind}</small></div>
            {viewed.has(slide.id) && <span className="ppt-review-seen"><CheckCircle2/>Viewed</span>}
            <button className="secondary-btn" disabled={busy} onClick={() => onEdit(index)}><Pencil/>Edit slide</button>
          </div>
          <div ref={element => { if (element) slideRefs.current.set(slide.id, element); else slideRefs.current.delete(slide.id); }} data-slide-id={slide.id}>
            <SlidePreview presentation={presentation} slide={slide}/>
          </div>
          {(slide.notes.trim() || slide.questions.length > 0) && <details className="ppt-review-notes"><summary>Speaker notes{slide.questions.length ? " and answers" : ""}</summary>{slide.notes.trim() && <p>{slide.notes}</p>}{slide.questions.map(item => <p key={item.number}><b>{item.number}. Answer {item.correctAnswer}:</b> {item.rationale}</p>)}</details>}
        </article>)}
        <div className="ppt-review-end"><CheckCircle2/><div><b>End of presentation</b><p>{seen === total ? "You have viewed every slide." : `${total - seen} slide${total - seen === 1 ? "" : "s"} not yet viewed.`}</p></div><button className="secondary-btn" onClick={() => panel.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>Go to approval</button></div>
      </div>

      <aside className="ppt-review-panel" ref={panel} aria-label="Review checklist">
        <div className={`ppt-review-status ${state}`}>
          {approved ? <ShieldCheck/> : <Lock/>}
          <div><b>{approved ? "Approved — ready to download" : state === "changed" ? "Changed since approval" : "Review required before download"}</b>
            <p>{approved ? `Approved ${new Date(presentation.review!.reviewedAt).toLocaleString()}. Editing any slide will require a new review.` : state === "changed" ? "You edited the deck after approving it. Review it again to unlock the download." : "Check every slide, then approve to unlock the download."}</p></div>
        </div>

        <h2>Slides viewed</h2>
        <div className="ppt-review-progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={seen} aria-label="Slides viewed"><i style={{ width: `${total ? (seen / total) * 100 : 0}%` }}/></div>
        <p className="ppt-review-progress-text">{seen} of {total} slides viewed{nextUnviewed >= 0 && <> · <button className="text-btn" onClick={() => show(nextUnviewed)}>Go to slide {nextUnviewed + 1}</button></>}</p>

        <h2>Automatic checks</h2>
        <ul className="ppt-review-checks">{checks.map(check => { const Icon = statusIcon[check.status]; return <li key={check.id} className={check.status}>
          <Icon/><div><b>{check.label}</b><p>{check.detail}</p>{check.slideIndex !== undefined && <button className="text-btn" onClick={() => show(check.slideIndex)}>Show slide {check.slideIndex + 1}</button>}</div>
        </li>; })}</ul>

        <h2>Teacher confirmation</h2>
        <fieldset className="ppt-review-confirm" disabled={approved || busy}>{reviewConfirmations.map(item => <label key={item.id}><input type="checkbox" checked={confirmations.includes(item.id)} onChange={event => setConfirmations(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))}/>{item.label}</label>)}</fieldset>

        {error && <p className="weekly-error" role="alert">{error}</p>}
        {approved ? <div className="ppt-review-downloads">
          <button className="primary-btn" disabled={busy} onClick={onDownload}><Download/>Download PowerPoint (.pptx)</button>
          <button className="secondary-btn" disabled={busy} onClick={onPrint}><Printer/>Print / Save PDF</button>
        </div> : <>
          <button className="primary-btn ppt-approve" disabled={!ready || busy} onClick={() => onApprove(confirmations, seen)}><ShieldCheck/>Approve &amp; unlock download</button>
          {!ready && <p className="ppt-review-hint">{blocking.length ? "Fix the failed checks first." : seen < total ? `View the remaining ${total - seen} slide${total - seen === 1 ? "" : "s"}.` : "Tick all three confirmations."}</p>}
          <div className="ppt-review-downloads locked" aria-hidden="true"><button className="secondary-btn" disabled tabIndex={-1}><Lock/>Download PowerPoint (.pptx)</button><button className="secondary-btn" disabled tabIndex={-1}><Lock/>Print / Save PDF</button></div>
        </>}
      </aside>
    </div>
  </div>;
}
