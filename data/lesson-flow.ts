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
  const sessionWork = ["the meaning of essential terms and familiar examples", "evidence from a video, benchmark examples, and important characteristics", "selected examples, their characteristics, and correct procedures", "a real-life application and a culminating solution or performance"][session];
  const learnerGoal = ["define essential terms and identify appropriate examples", "compare examples and identify benchmark characteristics", "explain selected examples, characteristics, and correct procedures", "apply the learning to a real-life challenge and justify a solution"][session];
  const guidedActivity = ["guided vocabulary-and-picture sort", "guided video evidence table and benchmarking activity", "guided characteristics-and-procedure analysis", "guided case-planning conference"][session];
  const independentActivity = ["individual vocabulary map with examples", "individual comparison based on a new video clip or example", "individual explanation or demonstration using a checklist", "real-life solution, product, or performance using the shared rubric"][session];
  const activityLaunch = [
    `Present and define essential words related to ${focus} using pictures and familiar examples.`,
    `Show a short educational video or demonstration about ${focus} and provide guide questions for benchmarking.`,
    `Present selected examples related to ${focus} and ask learners to notice their characteristics, purpose, procedure, or safety features.`,
    `Present a realistic home, school, or community situation that requires learners to apply ${focus}.`,
  ][session];
  const content: Record<CoreStage, string> = {
    elicit: `Begin with a quick well-being and readiness check. Share the objective—learners will ${learnerGoal}—and explain the success criteria. Use a short recall prompt about ${sessionWork} so the teacher can identify prior knowledge and needed support.`,
    engage: session === 0
      ? `Introduce and define essential words related to ${focus} through pictures and familiar examples. Learners predict meanings, ask questions, and connect each word to home, school, or community experience.`
      : session === 1
        ? `Show a short educational video or teacher-selected demonstration about ${focus}. Provide guide questions so learners can notice benchmark practices, important characteristics, and differences between examples.`
        : session === 2
          ? `Present selected examples related to ${focus}. Learners identify their visible characteristics, purpose, procedure, or safety features and explain which details make each example appropriate.`
          : `Present a realistic home, school, or community situation requiring ${focus}. Learners identify the need, predict a responsible response, and connect the challenge to the week’s objectives.`,
    explore: `${activityLaunch} Guide learners through a ${guidedActivity}. Model the first item, complete the next item with the class, then let pairs or groups complete the remaining items while the teacher asks questions and checks understanding.`,
    explain: `Clarify ${sessionWork} related to ${focus} using a visual organizer, worked example, or think-aloud. Learners explain their evidence, correct misconceptions, and restate the objective and success criteria in their own words.`,
    elaborate: `Learners complete the following independent task: ${independentActivity}. Provide cues or adapted materials to learners who need support, then use a brief conference, peer check, or self-check to monitor well-being, understanding, and progress toward mastery.`,
    evaluate: `Check mastery through a ${session === 0 ? "3–2–1 exit response and vocabulary check" : session === 1 ? "video-evidence comparison" : session === 2 ? "performance checklist and oral explanation" : "presentation rubric and reflection"}. Learners rate their confidence, identify one strength and one difficulty, and state their next step.`,
    extend: `Learners reinforce ${focus} outside class through a safe observation, educational video or article, explanation to a family member, or supervised real-life application. They bring brief evidence or a reflection to the next session.`,
  };
  return content[stage];
}

function tagalogContent(stage: CoreStage, session: number, focus: string) {
  const sessionWork = ["kahulugan ng mahahalagang salita at pamilyar na halimbawa", "ebidensiya mula sa bidyo, batayang halimbawa, at mahahalagang katangian", "mga piling halimbawa, katangian, at wastong pamamaraan", "tunay na aplikasyon at pangwakas na solusyon o pagganap"][session];
  const learnerGoal = ["bigyang-kahulugan ang mahahalagang salita at tukuyin ang angkop na halimbawa", "paghambingin ang mga halimbawa at tukuyin ang batayang katangian", "ipaliwanag ang mga piling halimbawa, katangian, at wastong pamamaraan", "ilapat ang natutuhan sa tunay na hamon at bigyang-katwiran ang solusyon"][session];
  const guidedActivity = ["ginabayang pag-uuri ng bokabularyo at larawan", "ginabayang video evidence table at benchmarking activity", "ginabayang pagsusuri ng katangian at pamamaraan", "ginabayang pagpupulong sa pagpaplano batay sa isang kaso"][session];
  const independentActivity = ["indibidwal na vocabulary map na may mga halimbawa", "indibidwal na paghahambing batay sa bagong bidyo o halimbawa", "indibidwal na paliwanag o demonstrasyon gamit ang checklist", "solusyon, produkto, o pagganap sa tunay na buhay gamit ang napagkasunduang rubric"][session];
  const activityLaunch = [
    `Ilahad at bigyang-kahulugan ang mahahalagang salitang kaugnay ng ${focus} gamit ang mga larawan at pamilyar na halimbawa.`,
    `Magpakita ng maikling bidyong pang-edukasyon o demonstrasyon tungkol sa ${focus} at magbigay ng gabay na tanong para sa benchmarking.`,
    `Maglahad ng mga piling halimbawang kaugnay ng ${focus} at ipapansin ang kanilang katangian, gamit, pamamaraan, o tuntuning pangkaligtasan.`,
    `Maglahad ng makatotohanang sitwasyon sa tahanan, paaralan, o pamayanan na nangangailangan ng paglalapat ng ${focus}.`,
  ][session];
  const content: Record<CoreStage, string> = {
    elicit: `Magsimula sa mabilis na pagsusuri ng kalagayan at kahandaan. Ilahad ang layunin—ang mga mag-aaral ay inaasahang ${learnerGoal}—at ipaliwanag ang pamantayan ng tagumpay. Gumamit ng maikling tanong tungkol sa ${sessionWork} upang malaman ang dating kaalaman at kinakailangang suporta.`,
    engage: session === 0
      ? `Ipakilala at bigyang-kahulugan ang mahahalagang salitang kaugnay ng ${focus} gamit ang mga larawan at pamilyar na halimbawa. Hulaan ng mga mag-aaral ang kahulugan, magtanong, at iugnay ang bawat salita sa karanasan sa tahanan, paaralan, o pamayanan.`
      : session === 1
        ? `Magpakita ng maikling bidyong pang-edukasyon o demonstrasyong pinili ng guro tungkol sa ${focus}. Magbigay ng gabay na tanong upang mapansin ng mga mag-aaral ang batayang gawain, mahahalagang katangian, at pagkakaiba ng mga halimbawa.`
        : session === 2
          ? `Maglahad ng mga piling halimbawang kaugnay ng ${focus}. Tukuyin at ipaliwanag ng mga mag-aaral ang nakikitang katangian, gamit, pamamaraan, o tuntuning pangkaligtasan at ang mga detalyeng nagpapakitang angkop ang bawat halimbawa.`
          : `Maglahad ng makatotohanang sitwasyon sa tahanan, paaralan, o pamayanan na nangangailangan ng ${focus}. Tukuyin ng mga mag-aaral ang pangangailangan, bumuo ng responsableng tugon, at iugnay ang hamon sa mga layunin ng linggo.`,
    explore: `${activityLaunch} Gabayan ang mga mag-aaral sa ${guidedActivity}. Imodelo ang unang item, sagutan ang kasunod kasama ang klase, at ipagawa sa pares o pangkat ang natitirang item habang nagtatanong ang guro at sinusuri ang pag-unawa.`,
    explain: `Linawin ang ${sessionWork} na kaugnay ng ${focus} gamit ang biswal na organizer, worked example, o think-aloud. Ipaliwanag ng mga mag-aaral ang ebidensiya, iwasto ang maling pagkaunawa, at sabihin sa sariling salita ang layunin at pamantayan ng tagumpay.`,
    elaborate: `Kumpletuhin ng mga mag-aaral ang ${independentActivity}. Magbigay ng pahiwatig o angkop na kagamitan sa nangangailangan ng suporta at gumamit ng maikling kumperensiya, peer check, o self-check upang masubaybayan ang kalagayan, pag-unawa, at pag-unlad tungo sa mastery.`,
    evaluate: `Suriin ang mastery sa pamamagitan ng ${session === 0 ? "3–2–1 exit response at pagsusulit sa bokabularyo" : session === 1 ? "paghahambing ng ebidensiya mula sa bidyo" : session === 2 ? "performance checklist at pasalitang paliwanag" : "rubric sa presentasyon at pagninilay"}. Tayahin ng mga mag-aaral ang sariling tiwala, tukuyin ang isang kalakasan at kahirapan, at sabihin ang susunod na hakbang.`,
    extend: `Palalimin ang ${focus} sa labas ng klase sa pamamagitan ng ligtas na pagmamasid, bidyo o artikulong pang-edukasyon, pagpapaliwanag sa kasapi ng pamilya, o superbisadong aplikasyon sa tunay na buhay. Magdala ng maikling ebidensiya o pagninilay sa susunod na sesyon.`,
  };
  return content[stage];
}

export function buildLessonFlow(format: LessonFlowFormat, session: number, focus: string, tagalog: boolean): LessonFlowStep[] {
  const labels = tagalog ? tagalogStageLabels[format] : stageLabels[format];
  return stageMap[format].map((stage, index) => ({ label: labels[index], content: tagalog ? tagalogContent(stage, session, focus) : englishContent(stage, session, focus) }));
}
