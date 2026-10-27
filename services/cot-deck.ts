import type { CotActivity, CotLesson } from "@/types/cot";
import type { CotSlideLayout, QuizItem, WeeklySlide } from "@/types/powerpoint";
import { learningAreaLabel } from "@/data/curriculum";
import { isTagalogLearningArea } from "@/data/lesson-plan-copy";

// COT classroom deck. The slide sequence follows the COT lesson plan, modelled on a teacher-made
// COT demonstration deck: title, prayer, class rules, objectives, review, motivation, vocabulary
// game, definition of terms, discussion, guide questions, guided practice, group activity,
// formative check and quiz, generalization, assignment, thank you.

const MAX_BULLET = 220, MAX_BULLETS = 6;
function brief(text: string, max = MAX_BULLET) { const value = text.replace(/\s+/g, " ").trim(); return value.length <= max ? value : value.slice(0, max - 1).replace(/\s+\S*$/, "") + "…"; }
function chunks(text: string, max = MAX_BULLET) { const result: string[] = []; let rest = text.replace(/\s+/g, " ").trim(); while (rest.length > max) { let at = rest.lastIndexOf(" ", max); if (at < max / 2) at = max; result.push(rest.slice(0, at)); rest = rest.slice(at).trim(); } if (rest) result.push(rest); return result; }
const lines = (text: string) => text.split("\n").map(line => line.replace(/^\s*[-•*]\s*/, "").trim()).filter(Boolean);
// Rejoin lines that were wrapped mid-sentence in the source text.
const paragraphs = (text: string) => lines(text).reduce<string[]>((out, line) => { const last = out[out.length - 1]; if (last && !/[.!?:;)"”]$/.test(last)) out[out.length - 1] = `${last} ${line}`; else out.push(line); return out; }, []);
// Long text breaks at sentence ends rather than mid-sentence.
const sentences = (text: string) => text.length <= MAX_BULLET ? [text] : text.split(/(?<=[.!?])\s+(?=[\p{Lu}\d"“(])/u).filter(Boolean);

function copy(tagalog: boolean) {
  return tagalog ? {
    prayerTitle: "Panimulang Panalangin",
    prayer: ["Panginoon, salamat po sa bagong araw at sa pagkakataong matuto.", "Gabayan Mo po ang aming isip at mga kamay sa aming mga gawain ngayon.", "Turuan Mo po kaming maging magalang, mabait at matulungin.", "Tulungan Mo po kaming matuto nang mabuti at gamitin ito sa paglilingkod sa kapwa.", "Amen."],
    rulesTitle: "Mga Alituntunin sa Klase", rules: ["Pumasok sa oras.", "Itaas ang kamay bago magsalita.", "Makinig nang mabuti at igalang ang ideya ng iba.", "Panatilihing malinis at ligtas ang lugar.", "Gamitin nang responsable ang mga kagamitan."],
    objectives: "Mga Layunin", review: "Balik-aral", activity: "Gawain", game: "Maglaro Tayo!", gameSubtitle: "Hanapin ang Nawawalang Titik", gameInstruction: "Hulaan ang nawawalang titik upang mabuo ang mahahalagang salita ng aralin.",
    terms: "Kahulugan ng mga Salita", guideQuestions: "Gabay na Tanong", guided: "Ginabayang Pagsasanay", groupActivity: "Pangkatang Gawain", group: "Pangkat", groupNames: ["Mga Tagatuklas", "Mga Tagalutas", "Mga Tagalikha"],
    check: "Pagsusulit", multipleChoice: "Maramihang Pagpili", generalization: "Paglalahat", assignment: "Takdang-Aralin", thanks: "Maraming Salamat!", annotations: "Mga Anotasyon sa COT (para sa guro)", continued: "pagpapatuloy",
  } : {
    prayerTitle: "Opening Prayer",
    prayer: ["Heavenly Father, thank You for this new day and for the gift of learning.", "Bless our minds and hands as we work together in class today.", "Guide us to be respectful, kind and cooperative in everything we do.", "Help us to learn well and to use what we learn to serve others.", "Amen."],
    rulesTitle: "Our Class Rules", rules: ["Come to class on time.", "Raise your hand before speaking.", "Listen carefully and respect others' ideas.", "Keep your space clean and safe.", "Use devices and materials responsibly."],
    objectives: "Objectives", review: "Review", activity: "Activity", game: "Let's Play a Game", gameSubtitle: "Find the Missing Letter", gameInstruction: "Guess the missing letters to reveal today's key words.",
    terms: "Definition of Terms", guideQuestions: "Guide Questions", guided: "Guided Practice", groupActivity: "Group Activity", group: "Group", groupNames: ["Explorers", "Problem Solvers", "Creators"],
    check: "Check Your Understanding", multipleChoice: "Multiple Choice", generalization: "Generalization", assignment: "Assignment", thanks: "Thank You!", annotations: "COT Annotations (teacher-selected)", continued: "continued",
  };
}

// Quiz choices go on one line when all four fit, otherwise two lines (A–B, C–D), otherwise one per line.
export function quizChoiceLines(q: QuizItem) {
  const gap = "      ", choices = (["A", "B", "C", "D"] as const).map(letter => `${letter}. ${q.choices[letter]}`);
  const one = choices.join(gap), pairs = [`${choices[0]}${gap}${choices[1]}`, `${choices[2]}${gap}${choices[3]}`];
  return one.length <= 72 ? [one] : pairs.every(line => line.length <= 72) ? pairs : choices;
}

// "SPREADSHEET" -> "S_R_A_S_E_T": keep the first letter and every other letter.
export function maskTerm(term: string) {
  let index = 0;
  return [...term.toUpperCase()].map(character => { if (!/\p{L}/u.test(character)) return character; const n = index++; return n % 2 === 0 ? character : "_"; }).join("");
}

// Key terms come from the AI answer; older lessons fall back to "Term – definition" lines in the activities.
export function cotKeyTerms(p: CotLesson) {
  if (p.keyTerms?.length) return p.keyTerms.slice(0, 4);
  const found: { term: string; definition: string }[] = [];
  for (const a of p.activities) for (const line of lines(a.teacherActivity)) {
    const match = line.match(/^([\p{L}][\p{L}\d .'/()+#-]{1,38}?)\s+[–—-]\s+(.{8,160})$/u);
    if (!match || /^(teacher|learners?|students?|activity|tasks?|guro|mga mag-aaral)\b/i.test(match[1])) continue;
    if (!found.some(item => item.term.toLowerCase() === match[1].trim().toLowerCase())) found.push({ term: match[1].trim(), definition: match[2].trim() });
  }
  return found.slice(0, 4);
}

export function buildCotSlides(p: CotLesson, annotationsFor: (activityId: string) => string[]): WeeklySlide[] {
  const t = copy(isTagalogLearningArea(p.sourcePlan.area));
  const profile = p.sourcePlan.profile;
  const slides: WeeklySlide[] = [];
  const add = (layout: CotSlideLayout, title: string, bullets: string[], options: { notes?: string; callout?: string; kind?: WeeklySlide["kind"]; questions?: QuizItem[] } = {}) => {
    slides.push({ id: crypto.randomUUID(), kind: options.kind ?? "content", day: 0, title: brief(title, 110), bullets: bullets.map(text => brief(text)).filter(Boolean).slice(0, MAX_BULLETS), visual: "", table: null, notes: options.notes ?? "", questions: options.questions ?? [], cotLayout: layout, ...(options.callout?.trim() ? { callout: brief(options.callout, 200) } : {}) });
  };
  // Long lists continue on the next slide instead of being cut off.
  const addList = (layout: CotSlideLayout, title: string, items: string[], options: { notes?: string; callout?: string } = {}, perSlide = MAX_BULLETS) => {
    const all = items.flatMap(item => chunks(item));
    for (let n = 0; n < Math.max(all.length, 1); n += perSlide) add(layout, n ? `${title} (${t.continued})` : title, all.slice(n, n + perSlide), n ? { notes: options.notes } : options);
  };
  const notesFor = (a: CotActivity) => [
    `${a.phase} · ${a.minutes} min`,
    `Teacher: ${a.teacherActivity}`, `Learners: ${a.learnerActivity}`,
    ...a.questions.map(q => `Q: ${q.question}\nAnticipated: ${q.responses.join("; ")}\nFollow-up: ${q.followUp}`),
    `Check for understanding: ${a.formative.task}\nExpected: ${a.formative.expectedEvidence}`,
    ...annotationsFor(a.id),
  ].join("\n\n");
  const firstQuestion = (a: CotActivity) => a.questions[0]?.question ? `“${a.questions[0].question.replace(/^["“]|["”]$/g, "")}”` : "";
  const afterActivity = (a: CotActivity) => { const notes = annotationsFor(a.id); if (p.showAnnotations && notes.length) addList("annotations", t.annotations, notes.map(text => brief(text)), {}, 3); };

  add("title", p.title, [learningAreaLabel(p.sourcePlan.grade, p.sourcePlan.area), p.teacherName, p.position, profile.school].filter(Boolean), { kind: "title" });
  const opening = p.activities.find(a => a.phase === "Opening and routine");
  add("prayer", t.prayerTitle, t.prayer, { notes: opening ? notesFor(opening) : "" });
  add("rules", t.rulesTitle, t.rules);
  addList("objectives", t.objectives, p.objectives);

  const terms = cotKeyTerms(p);
  p.selectedSessions.forEach((session, sessionIndex) => {
    const activities = p.activities.filter(a => a.session === session);
    for (const a of activities) {
      if (a.phase === "Opening and routine") {
        if (sessionIndex > 0) { addList("activity", a.title, a.slideBullets, { notes: notesFor(a) }); afterActivity(a); }
        continue;
      }
      if (a.phase === "Review") addList("activity", `${t.review}: ${a.title}`, a.slideBullets, { notes: notesFor(a), callout: firstQuestion(a) });
      else if (a.phase === "Motivation") {
        addList("activity", `${t.activity}: “${a.title}”`, a.slideBullets, { notes: notesFor(a), callout: firstQuestion(a) });
        if (sessionIndex === 0 && terms.length) {
          add("game", t.game, [t.gameSubtitle, t.gameInstruction]);
          for (const item of terms) {
            add("puzzle", t.gameSubtitle, [maskTerm(item.term)], { notes: `Answer: ${item.term.toUpperCase()} — ${item.definition}` });
            add("term", item.term.toUpperCase(), [item.definition]);
          }
          addList("terms", t.terms, terms.map(item => `${item.term} – ${item.definition}`));
        }
      } else if (a.phase === "Discussion and examples") {
        addList("activity", a.title, a.slideBullets, { notes: notesFor(a) });
        if (a.questions.length) addList("questions", t.guideQuestions, a.questions.map(q => q.question), { notes: a.questions.map(q => `${q.question}\nAnticipated: ${q.responses.join("; ")}`).join("\n\n") });
      } else if (a.phase === "Guided activity") {
        addList("practice", `${t.guided}: ${a.title}`, a.worksheet?.tasks.length ? a.worksheet.tasks : a.slideBullets, { notes: notesFor(a), callout: a.worksheet?.instructions || a.questions[0]?.question || "" });
      } else if (a.phase === "Differentiated practice") {
        addList("practice", `${t.groupActivity}: ${a.title}`, a.slideBullets, { notes: notesFor(a), callout: a.worksheet?.instructions || "" });
        [a.differentiation.support, a.differentiation.core, a.differentiation.extension].forEach((task, n) => {
          if (task.trim()) addList("group", `${t.group} ${n + 1} – ${t.groupNames[n]}`, paragraphs(task).flatMap(sentences), { callout: `${t.activity}: ${a.title}`, notes: n === 0 ? notesFor(a) : "" });
        });
      } else if (a.phase === "Formative assessment") {
        addList("activity", a.title, a.slideBullets, { notes: notesFor(a) });
        addQuiz(session);
      } else if (a.phase === "Generalization and closing") {
        addList("activity", `${t.generalization}: ${a.title}`, a.slideBullets, { notes: notesFor(a), callout: firstQuestion(a) });
      } else addList("activity", a.title, a.slideBullets, { notes: notesFor(a) });
      afterActivity(a);
    }
    // A session without a formative-assessment activity still shows its quiz before the closing slides.
    if (!activities.some(a => a.phase === "Formative assessment")) addQuiz(session);
  });
  if (p.extendedLearning.trim()) addList("assignment", t.assignment, paragraphs(p.extendedLearning).flatMap(sentences));
  add("thanks", t.thanks, [p.teacherName, profile.school].filter(Boolean));
  return slides;

  function addQuiz(session: number) {
    const items = p.assessment.map((item, index) => ({ item, number: index + 1 })).filter(({ item }) => p.activities.find(a => a.id === item.activityId)?.session === session);
    if (!items.length) return;
    if (p.assessmentKind === "multiple-choice" && items.every(({ item }) => item.choices)) {
      const quiz: QuizItem[] = items.map(({ item, number }) => ({ number, question: item.question, choices: item.choices!, correctAnswer: (["A", "B", "C", "D"].includes(item.answer) ? item.answer : "A") as QuizItem["correctAnswer"], rationale: item.expectedEvidence }));
      // Pack questions while they stay readable (about 12 lines per slide), like the reference deck.
      const linesFor = (q: QuizItem) => Math.ceil(q.question.length / 75) + quizChoiceLines(q).reduce((sum, line) => sum + Math.ceil(line.length / 80), 0) + .6;
      const fits = (group: QuizItem[]) => group.reduce((sum, item) => sum + linesFor(item), 0) <= 12;
      let groups: QuizItem[][] = [];
      for (const q of quiz) { const last = groups[groups.length - 1]; if (last && fits([...last, q])) last.push(q); else groups.push([q]); }
      // Spread the questions evenly (e.g. 3 + 2 instead of 4 + 1) when that still fits.
      const even = Array.from({ length: groups.length }, (_, n) => quiz.slice(Math.round(n * quiz.length / groups.length), Math.round((n + 1) * quiz.length / groups.length)));
      if (even.every(fits)) groups = even;
      groups.forEach((group, n) => add("quiz", n ? `${t.multipleChoice} (${t.continued})` : t.multipleChoice, [], { questions: group, notes: group.map(q => `${q.number}. Answer ${q.correctAnswer}: ${q.choices[q.correctAnswer]}${q.rationale ? ` — ${q.rationale}` : ""}`).join("\n") }));
    } else {
      addList("practice", t.check, items.map(({ item, number }) => `${number}. ${item.question}`), { notes: items.map(({ item, number }) => `${number}. ${item.answer}\n${item.expectedEvidence}`).join("\n\n") });
    }
  }
}
