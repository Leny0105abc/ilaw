import { LessonFlowFormat, LessonFlowStep } from "@/types/lesson-plan";

export const lessonFlowOptions: { value: LessonFlowFormat; label: string }[] = [
  { value: "ilaw", label: "ILAW Learning Design Principles (default)" },
  { value: "4as", label: "4A’s – Activity, Analysis, Abstraction, Application" },
  { value: "4es", label: "4E’s – Engage, Explore, Explain, Evaluate" },
  { value: "5es", label: "5E’s – Engage, Explore, Explain, Elaborate, Evaluate" },
  { value: "7es", label: "7E’s – Elicit, Engage, Explore, Explain, Elaborate, Evaluate, Extend" },
  { value: "gradual-release", label: "Gradual Release – I Do, We Do, You Do" },
  { value: "ppp", label: "PPP – Presentation, Practice, Production" },
];

export const flowFormatName = (format: LessonFlowFormat) => lessonFlowOptions.find((item) => item.value === format)?.label || lessonFlowOptions[0].label;

const stageLabels: Record<LessonFlowFormat, string[]> = {
  ilaw: ["Activate", "Investigate", "Learn", "Apply", "Wrap-up"],
  "4as": ["Activity", "Analysis", "Abstraction", "Application"],
  "4es": ["Engage", "Explore", "Explain", "Evaluate"],
  "5es": ["Engage", "Explore", "Explain", "Elaborate", "Evaluate"],
  "7es": ["Elicit", "Engage", "Explore", "Explain", "Elaborate", "Evaluate", "Extend"],
  "gradual-release": ["Modeling", "Guided Practice", "Independent Practice", "Synthesis"],
  ppp: ["Presentation", "Practice", "Production"],
};
const tagalogStageLabels: Record<LessonFlowFormat, string[]> = {
  ilaw: ["Pukawin", "Siyasatin", "Unawain", "Ilapat", "Lagumin"],
  "4as": ["Gawain", "Pagsusuri", "Paglalahat", "Paglalapat"],
  "4es": ["Hikayatin", "Tuklasin", "Ipaliwanag", "Tayahin"],
  "5es": ["Hikayatin", "Tuklasin", "Ipaliwanag", "Palalimin", "Tayahin"],
  "7es": ["Alamin", "Hikayatin", "Tuklasin", "Ipaliwanag", "Palalimin", "Tayahin", "Palawakin"],
  "gradual-release": ["Pagmomodelo", "Ginabayang Pagsasanay", "Malayang Pagsasanay", "Paglalagom"],
  ppp: ["Paglalahad", "Pagsasanay", "Pagbuo"],
};

type CoreStage = "elicit" | "engage" | "explore" | "explain" | "elaborate" | "evaluate" | "extend";
const stageMap: Record<LessonFlowFormat, CoreStage[]> = {
  ilaw: ["elicit", "explore", "explain", "elaborate", "evaluate"],
  "4as": ["engage", "explore", "explain", "elaborate"],
  "4es": ["engage", "explore", "explain", "evaluate"],
  "5es": ["engage", "explore", "explain", "elaborate", "evaluate"],
  "7es": ["elicit", "engage", "explore", "explain", "elaborate", "evaluate", "extend"],
  "gradual-release": ["explain", "explore", "elaborate", "evaluate"],
  ppp: ["explain", "explore", "elaborate"],
};

function englishContent(stage: CoreStage, session: number, focus: string) {
  const sessionWork = ["key concepts and familiar examples", "important characteristics, categories, and comparisons", "correct procedures, safety, and quality criteria", "an authentic challenge and a culminating product or performance"][session];
  const content: Record<CoreStage, string> = {
    elicit: `Check prior knowledge about ${focus} through a quick prompt, picture, or agree/disagree response. Learners share what they know and one question about ${sessionWork}.`,
    engage: `Present a relevant home, school, or community situation about ${focus}. Learners make a prediction, identify the problem, and connect it to their own experience.`,
    explore: `Learners work in pairs or small groups on a ${session === 0 ? "picture-and-word sort" : session === 1 ? "card sort and gallery check" : session === 2 ? "guided practice station" : "case-based planning task"}. They record evidence and compare ideas while the teacher asks guiding questions.`,
    explain: `Model and clarify ${sessionWork} related to ${focus} using a visual organizer and think-aloud. Learners explain their findings, use the lesson vocabulary, and correct misconceptions with evidence.`,
    elaborate: `Learners apply ${focus} to a new ${session < 2 ? "example or scenario" : "practical task or real-life problem"}. They create, demonstrate, or justify an output using the shared success criteria.`,
    evaluate: `Use a short ${session === 0 ? "3–2–1 exit response" : session === 1 ? "evidence check" : session === 2 ? "performance checklist" : "presentation rubric and reflection"}. Learners identify a strength, a needed improvement, and their next step.`,
    extend: `Learners connect ${focus} to home or community by observing a safe example, interviewing a family member, or planning one responsible action to share in the next class.`,
  };
  return content[stage];
}

function tagalogContent(stage: CoreStage, session: number, focus: string) {
  const sessionWork = ["mahahalagang konsepto at pamilyar na halimbawa", "mahahalagang katangian, pag-uuri, at paghahambing", "wastong hakbang, kaligtasan, at pamantayan ng kalidad", "isang tunay na hamon at pangwakas na produkto o pagganap"][session];
  const content: Record<CoreStage, string> = {
    elicit: `Suriin ang dating kaalaman tungkol sa ${focus} sa pamamagitan ng mabilis na tanong, larawan, o pagsang-ayon at di-pagsang-ayon. Ibahagi ng mga mag-aaral ang nalalaman at isang tanong tungkol sa ${sessionWork}.`,
    engage: `Maglahad ng makabuluhang sitwasyon sa tahanan, paaralan, o pamayanan tungkol sa ${focus}. Bumuo ang mga mag-aaral ng hinuha, tukuyin ang suliranin, at iugnay ito sa sariling karanasan.`,
    explore: `Gumawa ang mga mag-aaral sa pares o maliit na pangkat ng ${session === 0 ? "pag-uuri ng larawan at salita" : session === 1 ? "card sort at gallery check" : session === 2 ? "ginabayang learning station" : "pagpaplano batay sa isang kaso"}. Magtala sila ng ebidensiya at maghambing ng ideya habang nagbibigay ang guro ng gabay na tanong.`,
    explain: `Ipakita at linawin ang ${sessionWork} na kaugnay ng ${focus} gamit ang biswal na organizer at think-aloud. Ipaliwanag ng mga mag-aaral ang kanilang natuklasan, gamitin ang wastong bokabularyo, at iwasto ang maling pagkaunawa gamit ang ebidensiya.`,
    elaborate: `Ilapat ng mga mag-aaral ang ${focus} sa bagong ${session < 2 ? "halimbawa o sitwasyon" : "praktikal na gawain o tunay na suliranin"}. Lumikha, magpakita, o magbigay-katwiran sila sa isang output gamit ang napagkasunduang pamantayan.`,
    evaluate: `Gumamit ng maikling ${session === 0 ? "3–2–1 exit response" : session === 1 ? "pagsusuri ng ebidensiya" : session === 2 ? "performance checklist" : "rubric sa presentasyon at pagninilay"}. Tukuyin ng mga mag-aaral ang isang kalakasan, dapat pang pagbutihin, at susunod na hakbang.`,
    extend: `Iugnay ng mga mag-aaral ang ${focus} sa tahanan o pamayanan sa pamamagitan ng pagmamasid sa ligtas na halimbawa, pakikipanayam sa kasapi ng pamilya, o pagpaplano ng isang responsableng kilos na ibabahagi sa susunod na klase.`,
  };
  return content[stage];
}

export function buildLessonFlow(format: LessonFlowFormat, session: number, focus: string, tagalog: boolean): LessonFlowStep[] {
  const labels = tagalog ? tagalogStageLabels[format] : stageLabels[format];
  return stageMap[format].map((stage, index) => ({ label: labels[index], content: tagalog ? tagalogContent(stage, session, focus) : englishContent(stage, session, focus) }));
}
