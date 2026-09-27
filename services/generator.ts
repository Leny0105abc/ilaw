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

  const sessions: LessonSession[] = Array.from({ length: input.sessions }, (_, index) => {
    const verb = (tagalog ? tagalogActionVerbs : actionVerbs)[index];
    const support = input.learnerContext.trim() || (tagalog ? "Ang mga mag-aaral ay may iba-ibang dating kaalaman at higit na natututo sa malinaw na halimbawa, biswal na gabay, ginabayang pagsasanay, at malayang pasalita o pasulat na pagsagot." : "Learners bring varied prior experiences and benefit from clear models, visual examples, guided practice, and flexible oral or written responses.");
    if (tagalog) return {
      session: index + 1,
      day: ["LUNES", "MARTES", "MIYERKULES", "HUWEBES"][index],
      objectives: [
        `${verb.charAt(0).toUpperCase() + verb.slice(1)} ang mahahalagang konseptong kaugnay ng ${focus} nang may hindi bababa sa 80% kawastuhan.`,
        `${index < 2 ? "Makumpleto ang ginabayang pagsusuri o pag-uuri" : "Mailapat ang aralin sa isang indibidwal o pangkatang gawaing pagganap"} gamit ang napagkasunduang pamantayan.`,
        `Maipakita ang ${index % 2 ? "pananagutan at pakikipagtulungan" : "pagmamalasakit, pag-uusisa, at paggalang"} habang isinasagawa ang mga gawain.`,
      ],
      learnerContext: `${support} Sa Sesyon ${index + 1}, gagamit ng ${index < 2 ? "mga ginabayang halimbawa at biswal na pahiwatig" : "nakabalangkas na aplikasyon, tseklist, at suporta ng kapwa mag-aaral"} upang matugunan ang mga hamon sa pagbasa, tiwala sa sarili, o kakulangan sa kagamitan.`,
      preLesson: tagalogHooks[index],
      flow: {
        iDo: `Ilahad ang mga layunin at iugnay ang aralin sa pamilyar na halimbawa sa tahanan, paaralan, o pamayanan. Ipakita kung paano ${verb} ang ${focus} gamit ang halimbawang may paliwanag at malinaw na pamantayan ng tagumpay.`,
        weDo: `Gabayan ang mga mag-aaral sa dalawang halimbawa. Itanong: “Ano ang napansin mo?”, “Anong patunay ang sumusuporta sa iyong sagot?”, at “Paano ito magagamit sa tunay na buhay?” Suriin ang pag-unawa sa pamamagitan ng response cards, senyas ng kamay, o maikling pasalitang sagot.`,
        youDo: `${index < 2 ? "Kumpletuhin ng mga pares ang maikling gawain sa pag-uuri, paglalagay ng label, o paghahambing" : "Kumpletuhin ng mga mag-aaral ang praktikal na aplikasyon o maikling presentasyon"}. Magbigay ng biswal na pahiwatig, talaan ng salita, at gabay sa maliit na pangkat kung kinakailangan; pahintulutan ang pasalita o pasulat na pagsagot.`,
        synthesis: `Kumpletuhin ng mga mag-aaral ang pahayag: “Ang pinakamahalagang ideya tungkol sa ${focus} ay ___ dahil ___.” Linawin ng guro ang maling pagkaunawa at ihanda ang susunod na sesyon.`,
      },
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
      learnerContext: `${support} Session ${index + 1} uses ${index < 2 ? "guided examples and visual prompts" : "structured application with checklists and peer support"} to address possible reading, confidence, or resource barriers.`,
      preLesson: hooks[index],
      flow: {
        iDo: `State the objectives and connect the lesson to a familiar home, school, or community example. Model how to ${verb} ${focus} using a worked example, think-aloud, and a visible success checklist.`,
        weDo: `Guide learners through two examples. Ask “What do you notice?”, “What evidence supports your answer?”, and “How is this useful in real life?” Check understanding through response cards, hand signals, or brief oral answers.`,
        youDo: `${index < 2 ? "Pairs complete a short sorting, labeling, or comparison task" : "Learners complete a practical application or mini-presentation"}. Provide visual cues, a word bank, and small-group guidance where needed; allow oral or written responses.`,
        synthesis: `Learners complete the statement: “The most important idea about ${focus} is ___ because ___.” The teacher clarifies misconceptions and previews the next session.`,
      },
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
