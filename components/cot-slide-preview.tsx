"use client";
import type { WeeklySlide } from "@/types/powerpoint";

// On-screen preview of the designed COT classroom deck (dark navy, blue banners, white panels).
// It mirrors the PowerPoint layouts closely enough to check content before downloading.
export function CotSlidePreview({ slide, number }: { slide: WeeklySlide; number: number }) {
  const layout = slide.cotLayout ?? (slide.kind === "title" ? "title" : slide.questions.length ? "quiz" : "activity");
  const b = slide.bullets;
  const banner = <div className="cot-deck-banner">{slide.title}</div>;
  const list = (numbered: boolean, className = "") => numbered
    ? <ol className={`cot-deck-panel ${className}`}>{b.map((text, i) => <li key={i}>{text}</li>)}</ol>
    : <ul className={`cot-deck-panel ${className}`}>{b.map((text, i) => <li key={i}>{text}</li>)}</ul>;
  let body;
  switch (layout) {
    case "title": body = <div className="cot-deck-title"><p className="subject">{b[0]}</p><h3>{slide.title}</h3><p className="people">{b.slice(1).map((text, i) => <span key={i}>{text}</span>)}</p></div>; break;
    case "prayer": body = <>{banner}<div className="cot-deck-panel cot-deck-prayer">{b.map((text, i) => <p key={i}>{text}</p>)}</div></>; break;
    case "rules": body = <>{banner}<ol className="cot-deck-rules">{b.map((text, i) => <li key={i}><span>{i + 1}</span>{text}</li>)}</ol></>; break;
    case "objectives": body = <><div className="cot-deck-heading">{slide.title.toUpperCase()}:</div><ol className="cot-deck-panel">{b.map((text, i) => { const [first, ...rest] = text.split(" "); return <li key={i}><b>{first}</b> {rest.join(" ")}</li>; })}</ol></>; break;
    case "game": body = <div className="cot-deck-game"><h3>{slide.title}</h3><div className="cot-deck-panel"><b>{b[0]}</b><p>{b[1]}</p></div></div>; break;
    case "puzzle": body = <>{banner}<div className="cot-deck-panel cot-deck-word">{b[0]}</div></>; break;
    case "term": body = <><div className="cot-deck-panel cot-deck-word">{slide.title}</div><div className="cot-deck-definition">– {b[0]}</div></>; break;
    case "terms": body = <><div className="cot-deck-heading">{slide.title.toUpperCase()}</div><ul className="cot-deck-panel">{b.map((text, i) => { const [term, ...rest] = text.split(" – "); return <li key={i}><b className="term">{term}</b>{rest.length ? ` – ${rest.join(" – ")}` : ""}</li>; })}</ul></>; break;
    case "group": { const [label, ...name] = slide.title.split(" – "); body = <div className="cot-deck-panel cot-deck-group"><h3>{label}{name.length ? " – " : ""}<span>{name.join(" – ")}</span></h3>{slide.callout && <p>({slide.callout})</p>}<ol>{b.map((text, i) => <li key={i}>{text}</li>)}</ol></div>; break; }
    case "quiz": body = <>{banner}<div className="cot-deck-panel cot-deck-quiz">{slide.questions.map(q => <div key={q.number}><b>{q.number}. {q.question}</b><p>{(["A", "B", "C", "D"] as const).map(l => <span key={l}>{l}. {q.choices[l]}</span>)}</p></div>)}</div></>; break;
    case "practice": body = <>{banner}{slide.callout && <div className="cot-deck-note">{slide.callout}</div>}{list(true)}</>; break;
    case "thanks": body = <div className="cot-deck-thanks"><h3>{slide.title}</h3>{b.map((text, i) => <p key={i}>{text}</p>)}</div>; break;
    default: body = <>{banner}<div className={slide.callout && b.length ? "cot-deck-split" : ""}>{b.length > 0 && list(layout === "questions")}{slide.callout && <div className="cot-deck-callout">{slide.callout}</div>}</div></>;
  }
  return <div className={`cot-deck-slide layout-${layout}`} aria-label={`Slide ${number} preview: ${slide.title}`}>{body}<span className="cot-deck-number">{number}</span></div>;
}
