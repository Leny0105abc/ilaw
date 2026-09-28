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

export type LessonFlowContext = {
  objectives: string[];
  learnerContext: string;
  resources: string[];
  sessionCount: number;
};

type FlowDetails = {
  objective: string;
  sessionWork: string;
  guidedActivity: string;
  independentActivity: string;
  check: string;
  resources: string;
  support: string;
};

function phaseIndex(session: number, sessionCount: number) {
  if (sessionCount <= 1) return 0;
  return Math.round((session * 3) / (sessionCount - 1));
}

function learnerSupport(context: string, tagalog: boolean) {
  const value = context.toLowerCase();
  if (value.includes("struggling readers") || value.includes("nahihirapang bumasa")) return tagalog ? "Gumamit ng larawan at word bank." : "Use picture cues and a word bank.";
  if (value.includes("limited internet") || value.includes("limitadong internet")) return tagalog ? "Gumamit ng nakalimbag at offline na kagamitan." : "Use printed and offline materials.";
  if (value.includes("large class") || value.includes("malaking klase")) return tagalog ? "Magtalaga ng tungkulin sa pares at gumamit ng checklist." : "Assign pair roles and use a checklist.";
  if (value.includes("low participation") || value.includes("mababang pakikilahok")) return tagalog ? "Gumamit ng think-pair-share at sentence starter." : "Use think-pair-share and sentence starters.";
  return tagalog ? "Magbigay ng gabay na tanong at maikling puna." : "Provide guide questions and brief feedback.";
}

function flowDetails(session: number, focus: string, tagalog: boolean, context: LessonFlowContext): FlowDetails {
  const phase = phaseIndex(session, context.sessionCount);
  const singleSession = context.sessionCount === 1;
  const resources = context.resources.slice(0, 2).join(tagalog ? " at " : " and ") || (tagalog ? "mga larawan at activity sheet" : "pictures and an activity sheet");
  const objective = (context.objectives[0] || (tagalog ? `Maunawaan at mailapat ang ${focus}` : `Understand and apply ${focus}`)).replace(/\.$/, "");
  const englishWork = ["essential terms and familiar examples", "video examples and benchmark characteristics", "selected examples, characteristics, and procedures", "a real-life application of the competency"];
  const tagalogWork = ["mahahalagang salita at pamilyar na halimbawa", "mga halimbawa sa bidyo at batayang katangian", "mga piling halimbawa, katangian, at pamamaraan", "tunay na aplikasyon ng kasanayan"];
  const englishGuided = ["vocabulary-and-picture sort", "video evidence table", "characteristics-and-procedure analysis", "case-planning task"];
  const tagalogGuided = ["pag-uuri ng salita at larawan", "video evidence table", "pagsusuri ng katangian at pamamaraan", "pagpaplano batay sa isang kaso"];
  const englishIndependent = ["a short concept map", "a comparison of a new example", "an explanation or demonstration", "a practical solution or performance"];
  const tagalogIndependent = ["maikling concept map", "paghahambing ng bagong halimbawa", "paliwanag o demonstrasyon", "praktikal na solusyon o pagganap"];
  const englishCheck = ["vocabulary exit check", "evidence comparison", "performance checklist", "rubric and reflection"];
  const tagalogCheck = ["exit check sa bokabularyo", "paghahambing ng ebidensiya", "performance checklist", "rubric at pagninilay"];
  return {
    objective,
    sessionWork: singleSession ? (tagalog ? "mahahalagang konsepto at payak na aplikasyon" : "key concepts and a simple application") : (tagalog ? tagalogWork : englishWork)[phase],
    guidedActivity: singleSession ? (tagalog ? "ginabayang gawain sa halimbawa at aplikasyon" : "guided example-and-application task") : (tagalog ? tagalogGuided : englishGuided)[phase],
    independentActivity: singleSession ? (tagalog ? "maikling indibidwal na aplikasyon" : "short individual application") : (tagalog ? tagalogIndependent : englishIndependent)[phase],
    check: singleSession ? (tagalog ? "maikling checklist at pagninilay" : "short checklist and reflection") : (tagalog ? tagalogCheck : englishCheck)[phase],
    resources,
    support: learnerSupport(context.learnerContext, tagalog),
  };
}

function englishContent(stage: CoreStage, focus: string, details: FlowDetails) {
  const content: Record<CoreStage, string> = {
    elicit: `Share the objective: “${details.objective}.” Check readiness with one recall question.`,
    engage: `Using ${details.resources}, show one familiar example of ${focus}. Learners share one observation.`,
    explore: `Model one ${details.guidedActivity}, complete one together, then let pairs try. ${details.support}`,
    explain: `Discuss ${details.sessionWork}. Learners explain one example; give corrective feedback.`,
    elaborate: `Learners independently complete ${details.independentActivity} using ${details.resources}. Check it against the objective.`,
    evaluate: `Use a ${details.check} to confirm learning and set one next step.`,
    extend: `Learners apply ${focus} to one safe home or community example and report their evidence.`,
  };
  return content[stage];
}

function tagalogContent(stage: CoreStage, focus: string, details: FlowDetails) {
  const content: Record<CoreStage, string> = {
    elicit: `Ilahad ang layunin: “${details.objective}.” Suriin ang kahandaan gamit ang isang recall question.`,
    engage: `Gamit ang ${details.resources}, magpakita ng isang pamilyar na halimbawa ng ${focus}. Magbahagi ang mga mag-aaral ng isang obserbasyon.`,
    explore: `Imodelo ang isang ${details.guidedActivity}, sagutan ang isa nang sama-sama, saka ipasubok sa pares. ${details.support}`,
    explain: `Talakayin ang ${details.sessionWork}. Magpaliwanag ng isang halimbawa; magbigay ng wastong puna.`,
    elaborate: `Malayang kumpletuhin ang ${details.independentActivity} gamit ang ${details.resources}. Suriin ito ayon sa layunin.`,
    evaluate: `Gumamit ng ${details.check} upang tiyakin ang pagkatuto at magtakda ng susunod na hakbang.`,
    extend: `Ilapat ang ${focus} sa isang ligtas na halimbawa sa tahanan o pamayanan at iulat ang ebidensiya.`,
  };
  return content[stage];
}

export function buildLessonFlow(format: LessonFlowFormat, session: number, focus: string, tagalog: boolean, context: LessonFlowContext): LessonFlowStep[] {
  const labels = tagalog ? tagalogStageLabels[format] : stageLabels[format];
  const details = flowDetails(session, focus, tagalog, context);
  return stageMap[format].map((stage, index) => {
    const activity = tagalog ? tagalogContent(stage, focus, details) : englishContent(stage, focus, details);
    const objectivePrefix = index === 0 && stage !== "elicit"
      ? tagalog ? `Ilahad ang layunin: “${details.objective}.” ` : `Share the objective: “${details.objective}.” `
      : "";
    return { label: labels[index], content: `${objectivePrefix}${activity}` };
  });
}
