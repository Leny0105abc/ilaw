import { z } from "zod";
import { Competency, GradeLevel, LessonPlan, LessonSession, TeacherProfile, Term } from "@/types/lesson-plan";
import { isTagalogLearningArea } from "@/data/lesson-plan-copy";

const sessionSchema = z.object({
  session: z.number(), day: z.string(), objectives: z.array(z.string()).length(3), learnerContext: z.string(),
  preLesson: z.string(), flow: z.object({ iDo: z.string(), weDo: z.string(), youDo: z.string(), synthesis: z.string() }),
  resources: z.array(z.string()), integration: z.string(), assessment: z.string(), extendedLearning: z.string(), reflection: z.string(),
});

const planSchema = z.object({ title: z.string(), competency: z.string(), sessions: z.array(sessionSchema).min(1).max(4) });

const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY"];
const hooks = [
  "Picture analysis: learners study three lesson-related images and share one observation and one question.",
  "Fact or Bluff: learners respond to five statements, then justify one answer with a partner.",
  "Quick sort: pairs classify picture or word cards and explain the rule they used.",
  "Scenario check: learners identify what is safe, effective, or appropriate in a short real-life situation.",
];

const actionVerbs = ["identify and explain", "classify and compare", "demonstrate and apply", "evaluate and communicate"];
const tagalogHooks = [
  "Pagsusuri ng larawan: Pag-aralan ng mga mag-aaral ang tatlong larawang kaugnay ng aralin at magbahagi ng isang obserbasyon at isang tanong.",
  "Tama o Mali: Tumugon ang mga mag-aaral sa limang pahayag at ipaliwanag sa kapareha ang batayan ng isang sagot.",
  "Mabilisang pag-uuri: Pagpangkat-pangkatin ng mga pares ang mga kard na may larawan o salita at ipaliwanag ang ginamit na batayan.",
  "Pagsusuri ng sitwasyon: Tukuyin ng mga mag-aaral kung ano ang wasto, responsable, o angkop sa isang maikling sitwasyon sa tunay na buhay.",
];
const tagalogActionVerbs = ["tukuyin at ipaliwanag", "uriin at paghambingin", "ipakita at isabuhay", "suriin at ipahayag"];

function englishFlow(session: number, focus: string, verb: string): LessonSession["flow"] {
  const flows: LessonSession["flow"][] = [
    {
      iDo: `Introduce ${focus} through a familiar home, school, or community example. Use a short think-aloud to model how to ${verb} the essential ideas, then unpack the lesson vocabulary and success criteria with a visual concept map.`,
      weDo: `Conduct a Notice–Think–Wonder activity using two contrasting examples. Learners contribute observations while the class completes a shared organizer that separates prior knowledge, new information, and questions for investigation.`,
      youDo: `Learners create an individual mini concept map or vocabulary match showing the key ideas and one real-life connection. Provide picture cues, sentence starters, or a word bank; early finishers add a second example and explain why it fits.`,
      synthesis: `Use a 3–2–1 exit response: three ideas learned, two useful examples, and one remaining question. Group the questions to identify what needs clarification at the start of Session 2.`,
    },
    {
      iDo: `Review the Session 1 exit responses, then model how to compare, classify, or analyze examples related to ${focus}. Think aloud while applying clear criteria and deliberately correct one common misconception.`,
      weDo: `Run a guided card-sort or gallery analysis. Small groups place examples under agreed categories, rotate to inspect another group’s work, and use evidence from the lesson to confirm or revise one placement.`,
      youDo: `Pairs analyze a new scenario or set of examples and complete a compare-and-justify organizer. Each pair must cite two details, explain its decision, and prepare one question for another pair.`,
      synthesis: `Pairs exchange answers for a brief evidence check. Learners complete: “I first thought ___; now I understand ___ because ___,” and the teacher records one class rule or principle to carry into Session 3.`,
    },
    {
      iDo: `Demonstrate a practical application of ${focus} from start to finish. Pause at each decision point to highlight safety, accuracy, responsible practice, and the quality indicators on the performance checklist.`,
      weDo: `Lead a guided rehearsal in pairs or stations. Learners take rotating roles as performer, observer, and coach while the class practices one step at a time and gives feedback using the checklist.`,
      youDo: `Learners complete an individual or paired application task that produces a concrete output, demonstration, solution, or action plan. Offer adapted materials and role choices without changing the required success criteria.`,
      synthesis: `Use “Two strengths and one next step.” Learners compare their output with the checklist, identify evidence of quality, and revise one part before explaining how the skill can be used beyond the classroom.`,
    },
    {
      iDo: `Present an authentic challenge that requires learners to transfer what they learned about ${focus}. Model how to define the problem, weigh possible actions, choose a solution, and verify it against the week’s criteria.`,
      weDo: `Facilitate a team planning conference. Groups examine a case, assign roles, draft a solution or product, and receive one round of teacher and peer questions before finalizing their approach.`,
      youDo: `Learners complete and present a culminating performance, product, or solution for the challenge. The audience uses the shared rubric to note evidence, ask a clarifying question, and suggest one realistic improvement.`,
      synthesis: `Learners complete a final reflection: “What I can now do,” “What evidence proves it,” and “What I will improve next.” Close with a short retrieval check that connects the four sessions and confirms the competency.`,
    },
  ];
  return flows[session];
}

function tagalogFlow(session: number, focus: string, verb: string): LessonSession["flow"] {
  const flows: LessonSession["flow"][] = [
    {
      iDo: `Ipakilala ang ${focus} sa pamamagitan ng pamilyar na halimbawa mula sa tahanan, paaralan, o pamayanan. Ipakita sa think-aloud kung paano ${verb} ang mahahalagang ideya, saka linawin ang pangunahing bokabularyo at pamantayan ng tagumpay gamit ang biswal na concept map.`,
      weDo: `Isagawa ang Pansinin–Isipin–Itanong gamit ang dalawang magkaibang halimbawa. Magbahagi ang mga mag-aaral ng obserbasyon habang sama-samang pinupunan ang organizer para sa dating kaalaman, bagong impormasyon, at mga tanong na dapat siyasatin.`,
      youDo: `Gumawa ang bawat mag-aaral ng mini concept map o pagtutugma ng salita at kahulugan na nagpapakita ng mahahalagang ideya at isang ugnay sa tunay na buhay. Magbigay ng larawang pahiwatig, panimulang pangungusap, o talaan ng salita kung kailangan.`,
      synthesis: `Gamitin ang 3–2–1 exit response: tatlong natutuhan, dalawang kapaki-pakinabang na halimbawa, at isang natitirang tanong. Pangkatin ang mga tanong upang malaman ang dapat linawin sa simula ng Sesyon 2.`,
    },
    {
      iDo: `Balikan ang exit responses sa Sesyon 1 at ipakita kung paano paghambingin, uriin, o suriin ang mga halimbawang kaugnay ng ${focus}. Ipaliwanag ang bawat pamantayan at sadyang itama ang isang karaniwang maling pagkaunawa.`,
      weDo: `Magsagawa ng ginabayang card-sort o gallery analysis. Iuri ng maliliit na pangkat ang mga halimbawa, suriin ang gawa ng ibang pangkat, at gumamit ng ebidensiya mula sa aralin upang pagtibayin o baguhin ang isang sagot.`,
      youDo: `Suriin ng mga pares ang isang bagong sitwasyon o pangkat ng halimbawa at kumpletuhin ang organizer na naghahambing at nagbibigay-katwiran. Dapat magbanggit ng dalawang detalye, ipaliwanag ang pasya, at bumuo ng isang tanong para sa ibang pares.`,
      synthesis: `Magpalitan ng sagot ang mga pares para sa maikling pagsusuri ng ebidensiya. Kumpletuhin ang pahayag: “Noong una, akala ko ___; ngayon, nauunawaan kong ___ dahil ___,” saka buuin ang isang tuntuning dadalhin sa Sesyon 3.`,
    },
    {
      iDo: `Ipakita mula simula hanggang wakas ang praktikal na aplikasyon ng ${focus}. Huminto sa bawat mahalagang pagpapasya upang bigyang-diin ang kaligtasan, kawastuhan, responsableng pagkilos, at mga pamantayan sa performance checklist.`,
      weDo: `Pangunahan ang ginabayang ensayo sa pares o learning stations. Magpalitan ang mga mag-aaral bilang tagaganap, tagamasid, at coach habang isinasagawa ang bawat hakbang at nagbibigay ng puna gamit ang checklist.`,
      youDo: `Kumpletuhin ng mga mag-aaral ang indibidwal o pares na gawaing aplikasyon na may kongkretong output, demonstrasyon, solusyon, o plano ng pagkilos. Magbigay ng angkop na kagamitan at pagpipilian sa papel nang hindi binabago ang pamantayan.`,
      synthesis: `Gamitin ang “Dalawang kalakasan at isang susunod na hakbang.” Ihambing ng mga mag-aaral ang kanilang output sa checklist, tukuyin ang patunay ng kalidad, at baguhin ang isang bahagi bago ipaliwanag ang gamit nito sa labas ng klase.`,
    },
    {
      iDo: `Maglahad ng tunay na hamon na nangangailangan ng paglilipat ng natutuhan tungkol sa ${focus}. Ipakita kung paano tukuyin ang suliranin, timbangin ang mga posibleng kilos, pumili ng solusyon, at suriin ito ayon sa pamantayan ng buong linggo.`,
      weDo: `Magsagawa ng pangkatang planning conference. Suriin ng bawat pangkat ang kaso, magtalaga ng tungkulin, bumuo ng solusyon o produkto, at tumanggap ng isang ikot ng tanong mula sa guro at kapwa mag-aaral bago ito tapusin.`,
      youDo: `Tapusin at ilahad ng mga mag-aaral ang pangwakas na pagganap, produkto, o solusyon. Gamitin ng tagapakinig ang iisang rubric upang magtala ng ebidensiya, magtanong para sa paglilinaw, at magmungkahi ng isang makatotohanang pagpapahusay.`,
      synthesis: `Kumpletuhin ang pangwakas na pagninilay: “Ano na ang kaya kong gawin,” “Anong ebidensiya ang nagpapatunay nito,” at “Ano pa ang pagbubutihin ko.” Magtapos sa maikling retrieval check na nag-uugnay sa apat na sesyon.`,
    },
  ];
  return flows[session];
}

function englishLearnerContext(session: number, focus: string, teacherNotes: string) {
  const profiles = [
    `Learners have introductory knowledge and everyday experiences related to ${focus}, but many may not yet recognize the topic’s essential concepts or vocabulary. They are interested in games, pictures, stories, and familiar examples, so the learning environment should provide visual prompts, short oral exchanges, and low-risk ways to share prior knowledge.`,
    `Learners can recall the basic ideas introduced in the previous session and are beginning to identify examples related to ${focus}. They learn well through videos, demonstrations, guided classification, and comparison activities, although some need repeated modeling, a word bank, and partner support to recognize important characteristics accurately.`,
    `Learners are ready to apply their understanding of ${focus} through collaborative and hands-on tasks. They are generally engaged when given clear roles and concrete materials, but some need step-by-step scaffolds, sentence starters, checklists, and feedback to explain their reasoning and perform the task with confidence.`,
    `Learners show strong interest in authentic, real-life applications of ${focus} and are prepared to create, demonstrate, or present what they have learned. They benefit from choice and peer collaboration, but still require clear safety expectations, teacher supervision, accessible resources, and structured reflection during culminating or field-based activities.`,
  ];
  return `${profiles[session]}${teacherNotes ? ` Teacher-provided learner information to consider: ${teacherNotes}` : ""}`;
}

function tagalogLearnerContext(session: number, focus: string, teacherNotes: string) {
  const profiles = [
    `Ang mga mag-aaral ay may panimulang kaalaman at karanasang pang-araw-araw na kaugnay ng ${focus}, ngunit marami ang hindi pa nakikilala ang mahahalagang konsepto at bokabularyo nito. Nahihikayat sila ng laro, larawan, kuwento, at pamilyar na halimbawa, kaya kailangan ang biswal na pahiwatig, maikling talakayan, at ligtas na pagkakataong maibahagi ang dating kaalaman.`,
    `Ang mga mag-aaral ay nakaaalala sa mga batayang ideyang tinalakay sa nakaraang sesyon at nagsisimula nang tumukoy ng mga halimbawang kaugnay ng ${focus}. Mas nauunawaan nila ang aralin sa pamamagitan ng bidyo, demonstrasyon, ginabayang pag-uuri, at paghahambing, ngunit ang ilan ay nangangailangan ng paulit-ulit na pagmomodelo, talaan ng salita, at suporta ng kapareha.`,
    `Ang mga mag-aaral ay handa nang ilapat ang kanilang pag-unawa sa ${focus} sa kolaboratibo at praktikal na gawain. Aktibo sila kapag malinaw ang tungkulin at kongkreto ang kagamitan, ngunit ang ilan ay nangangailangan ng sunod-sunod na gabay, panimulang pangungusap, checklist, at puna upang malinaw na maipaliwanag ang konsepto at maisagawa ang gawain.`,
    `Ang mga mag-aaral ay lubos na interesado sa makatotohanang aplikasyon ng ${focus} at handa nang lumikha, magpakita, o maglahad ng kanilang natutuhan. Nakikinabang sila sa pagpili at pakikipagtulungan, ngunit kailangan pa rin ang malinaw na panuntunan sa kaligtasan, superbisyon ng guro, madaling gamiting kagamitan, at nakabalangkas na pagninilay.`,
  ];
  return `${profiles[session]}${teacherNotes ? ` Karagdagang impormasyong ibinigay ng guro na dapat isaalang-alang: ${teacherNotes}` : ""}`;
}

type Input = {
  grade: GradeLevel; area: Competency["area"]; term: Term; week: number; competencies: Competency[]; topic: string;
  sessions: number; learnerContext: string; duration: number; availableResources: string; instructions: string; profile: TeacherProfile; section: string; schoolYear: string;
};

function focusText(text: string) {
  return text.replace(/^(Discuss|Identify|Determine|Explain|Perform|Apply|Recognize|Differentiate|Distinguish|Examine|Create|Develop|Interpret|Demonstrate|Familiarize themselves with)\s+/i, "").replace(/\.$/, "");
}

function lessonNameFromCompetency(competency: Competency | undefined) {
  if (!competency) return "Lesson based on the selected learning competency";
  const source = competency.strand?.trim() || focusText(competency.text);
  const clean = source.replace(/[.;:,]+$/, "").replace(/\s+/g, " ").trim();
  const words = clean.split(" ");
  const concise = words.length > 16 ? `${words.slice(0, 16).join(" ")}…` : clean;
  return concise.charAt(0).toUpperCase() + concise.slice(1);
}

export function generateLessonPlan(input: Input): LessonPlan {
  const tagalog = isTagalogLearningArea(input.area);
  const competencyText = input.competencies.map((item) => item.text).join("\n");
  const focus = input.topic.trim() || focusText(input.competencies[0]?.text || "the selected competency");
  const title = lessonNameFromCompetency(input.competencies[0]);
  const resources = input.availableResources.trim()
    ? input.availableResources.split(",").map((item) => item.trim()).filter(Boolean)
    : tagalog ? ["PowerPoint o nakalimbag na biswal", "mga gawaing papel", "mga kard na may larawan o salita", "mga kagamitang makikita sa paaralan o tahanan"] : ["PowerPoint or printed visual aids", "activity sheets", "picture/word cards", "available real objects or tools"];
  const teacherContextNotes = input.learnerContext.trim();

  const sessions: LessonSession[] = Array.from({ length: input.sessions }, (_, index) => {
    const verb = (tagalog ? tagalogActionVerbs : actionVerbs)[index];
    if (tagalog) return {
      session: index + 1,
      day: ["LUNES", "MARTES", "MIYERKULES", "HUWEBES"][index],
      objectives: [
        `${verb.charAt(0).toUpperCase() + verb.slice(1)} ang mahahalagang konseptong kaugnay ng ${focus} nang may hindi bababa sa 80% kawastuhan.`,
        `${index < 2 ? "Makumpleto ang ginabayang pagsusuri o pag-uuri" : "Mailapat ang aralin sa isang indibidwal o pangkatang gawaing pagganap"} gamit ang napagkasunduang pamantayan.`,
        `Maipakita ang ${index % 2 ? "pananagutan at pakikipagtulungan" : "pagmamalasakit, pag-uusisa, at paggalang"} habang isinasagawa ang mga gawain.`,
      ],
      learnerContext: tagalogLearnerContext(index, focus, teacherContextNotes),
      preLesson: tagalogHooks[index],
      flow: tagalogFlow(index, focus, verb),
      resources,
      integration: `Filipino at GMRC: Gamitin ng mga mag-aaral ang wastong bokabularyo upang maipahayag ang kanilang pangangatwiran at maiugnay ang aralin sa responsable at makataong pagpapasya sa tahanan, paaralan, at pamayanan.`,
      assessment: `Gumamit ng ${index < 2 ? "5-aytem na gawain sa pag-uuri o pagsusuri ng pag-unawa" : "maikling gawaing pagganap na may 4-puntong tseklist"} na nakaayon sa mga layunin ng sesyon. Tanggapin ang pasalita, pasulat, o aktuwal na pagpapakita; magbigay ng biswal na suporta, karagdagang gabay, at opsiyon para sa maliit na pangkat.`,
      extendedLearning: `Sa tahanan o pamayanan, magmasid ng isang ligtas at walang-gastos na halimbawa na kaugnay ng ${focus}, itala o ilarawan ang napansin, at ibahagi ito sa susunod na klase. Maaaring tumulong ang isang kasapi ng pamilya.`,
      reflection: `Natamo ba ng mga mag-aaral ang tatlong layunin para sa Sesyon ${index + 1}? Sino ang nangangailangan ng karagdagang suporta, anong maling pagkaunawa ang dapat muling talakayin, at ano ang dapat baguhin sa susunod na sesyon?`,
    };
    return {
      session: index + 1,
      day: days[index],
      objectives: [
        `${verb.charAt(0).toUpperCase() + verb.slice(1)} key concepts related to ${focus} with at least 80% accuracy.`,
        `${index < 2 ? "Complete a guided classification or analysis task" : "Apply the lesson through an individual or collaborative performance task"} using the agreed criteria.`,
        `Show ${index % 2 ? "responsibility and cooperation" : "care, curiosity, and respect"} while completing lesson activities.`,
      ],
      learnerContext: englishLearnerContext(index, focus, teacherContextNotes),
      preLesson: hooks[index],
      flow: englishFlow(index, focus, verb),
      resources,
      integration: index % 2 === 0
        ? `English: learners use lesson-specific vocabulary to explain evidence and communicate a clear conclusion during paired discussion.`
        : `${input.area === "Family and Consumer Science" ? "Values Education" : input.area === "Industrial Arts" ? "Mathematics" : "Science"}: learners connect the competency to ${input.area === "Industrial Arts" ? "measurement, accuracy, and safe problem solving" : "responsible decisions affecting people, resources, and the environment"}.`,
      assessment: `Use a ${index < 2 ? "5-item classification/check-for-understanding task" : "brief performance task with a 4-point checklist"} aligned with the session objectives. Accept oral, written, or demonstrated responses; provide visual support, additional guidance, and a small-group option.`,
      extendedLearning: `At home or in the community, learners observe one safe and no-cost example related to ${focus}, record or describe what they noticed, and share it in the next class. A family member may assist.` ,
      reflection: `Were learners able to meet the three objectives for Session ${index + 1}? Which learners need additional support, what misconception needs reteaching, and what should be adjusted for the next session?`,
    };
  });

  const validated = planSchema.parse({ title, competency: competencyText, sessions });
  const now = new Date().toISOString();
  return {
    id: `ilaw-${Date.now()}`, title: validated.title, grade: input.grade, section: input.section, area: input.area,
    term: input.term, week: input.week, schoolYear: input.schoolYear, classDuration: input.duration,
    competencyIds: input.competencies.map((item) => item.id), competencyText: validated.competency, topic: input.topic,
    references: Array.from(new Set(input.competencies.map((item) => item.source).filter(Boolean))).join("; ") || `Grade ${input.grade} Budget of Work`,
    aiDeclaration: tagalog ? "Ginamit ang AI upang tumulong sa pag-aayos ng estruktura ng banghay-aralin, pag-uugnay ng mga layunin sa napiling kasanayang pampagkatuto, pagpapahusay ng pananalita, at pagmumungkahi ng mga gawain at pagkakataon para sa integrasyon. Sinuri at pinagtibay ng guro ang nabuong nilalaman bago ito gamitin." : "AI was used to assist in organizing the lesson-plan structure, aligning objectives with the selected learning competency, improving wording, and suggesting learning activities and integration opportunities. The teacher reviewed and validated the generated content before use.",
    learnerNotes: input.learnerContext, availableResources: input.availableResources, teacherInstructions: input.instructions,
    status: "Draft", createdAt: now, updatedAt: now, profile: input.profile, sessions: validated.sessions,
  };
}
