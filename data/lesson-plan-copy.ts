export const LEARNING_EXPERIENCE_DESCRIPTION = "A learning experience is like a thoughtfully designed journey. Each activity and interaction builds towards meaningful understanding and growth. Identify activities and interactions to help learners gain knowledge, skills, or understanding in a purposeful way.";

export const ASSESSMENT_DESCRIPTION = "Assessments reveal what learners have gained and what they still need help with. These are helpful in providing you with information to guide your future instruction throughout the entire session.";

export const TAGALOG_LEARNING_EXPERIENCE_DESCRIPTION = "Ang karanasan sa pagkatuto ay tulad ng isang maingat na idinisenyong paglalakbay. Ang bawat gawain at pakikipag-ugnayan ay humahantong sa makabuluhang pag-unawa at pag-unlad. Tukuyin ang mga gawain at pakikipag-ugnayan na tutulong sa mga mag-aaral na magkaroon ng kaalaman, kasanayan, o pag-unawa sa isang makabuluhang paraan.";

export const TAGALOG_ASSESSMENT_DESCRIPTION = "Ipinakikita ng mga pagtataya kung ano ang natutuhan ng mga mag-aaral at kung saan pa nila kailangan ng tulong. Nakatutulong ang mga ito sa pagbibigay sa iyo ng impormasyong gagabay sa iyong susunod na pagtuturo sa buong sesyon.";

export function isTagalogLearningArea(area: string) {
  return ["Good Manners and Right Conduct", "Filipino", "Araling Panlipunan"].includes(area);
}

const englishLabels = {
  republic: "Republic of the Philippines", department: "DEPARTMENT OF EDUCATION", lessonPlan: "LESSON PLAN", continuation: "CONTINUATION",
  days: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY"], session: "SESSION", gradeWord: "GRADE",
  name: "Name of Lesson", area: "Learning Area/s", teacher: "Designed by Teacher/s", gradeSection: "Designed for which Grade Level and Section", sessions: "No. of Sessions", references: "References", ai: "Declaration of AI use",
  intentions: "INTENTIONS", competency: "Learning Competency", objectives: "Learning Objectives", context: "Learner Context",
  experience: "LEARNING EXPERIENCE", preLesson: "Pre-Lesson", flow: "Flow", resources: "Learning Resources", integration: "Opportunities for integration",
  assessment: "ASSESSMENT", formative: "Formative Assessment", waysForward: "WAYS FORWARD", extended: "Extended learning opportunities", reflections: "Reflections",
  intentionDescription: "Meaningful learning experiences are anchored in clear, relevant intentions.", waysDescription: "Learning continues through reflection and realistic experiences beyond class.",
  preparedBy: "Prepared by:", reviewedBy: "Checked and Reviewed by:", flowParts: ["I DO", "WE DO", "YOU DO", "SYNTHESIS"],
};

const tagalogLabels = {
  republic: "Republika ng Pilipinas", department: "KAGAWARAN NG EDUKASYON", lessonPlan: "BANGHAY-ARALIN", continuation: "KARUGTONG",
  days: ["LUNES", "MARTES", "MIYERKULES", "HUWEBES"], session: "SESYON", gradeWord: "BAITANG",
  name: "Pangalan ng Aralin", area: "Larangan ng Pagkatuto", teacher: "Idinisenyo ng Guro/mga Guro", gradeSection: "Baitang at Seksyon na Paglalaanan", sessions: "Bilang ng mga Sesyon", references: "Mga Sanggunian", ai: "Pahayag sa Paggamit ng AI",
  intentions: "MGA LAYUNIN", competency: "Kasanayang Pampagkatuto", objectives: "Mga Layunin sa Pagkatuto", context: "Konteksto ng Mag-aaral",
  experience: "KARANASAN SA PAGKATUTO", preLesson: "Bago ang Aralin", flow: "Daloy", resources: "Mga Kagamitan sa Pagkatuto", integration: "Mga Pagkakataon para sa Integrasyon",
  assessment: "PAGTATAYA", formative: "Pormatibong Pagtataya", waysForward: "MGA SUSUNOD NA HAKBANG", extended: "Pinalawak na mga Pagkakataon sa Pagkatuto", reflections: "Mga Pagninilay",
  intentionDescription: "Ang makabuluhan, inklusibo, at may layuning karanasan sa pagkatuto ay nakabatay sa malinaw at makabuluhang mga layunin.", waysDescription: "Nagpapatuloy ang pagkatuto sa pamamagitan ng pagninilay at makatotohanang mga karanasan sa labas ng klase.",
  preparedBy: "Inihanda ni:", reviewedBy: "Sinuri at nirepaso ni:", flowParts: ["GAGAWIN KO", "GAGAWIN NATIN", "GAGAWIN MO", "PAGLALAGOM"],
};

export function lessonPlanLabels(area: string) {
  if (["Good Manners and Right Conduct", "GMRC"].includes(area)) {
    return { ...tagalogLabels, lessonPlan: "LESSON PLAN" };
  }
  return isTagalogLearningArea(area) ? tagalogLabels : englishLabels;
}

export function firstColumnLabels() {
  return englishLabels;
}

export function learningExperienceDescription(area: string) {
  return isTagalogLearningArea(area) ? TAGALOG_LEARNING_EXPERIENCE_DESCRIPTION : LEARNING_EXPERIENCE_DESCRIPTION;
}

export function assessmentDescription(area: string) {
  return isTagalogLearningArea(area) ? TAGALOG_ASSESSMENT_DESCRIPTION : ASSESSMENT_DESCRIPTION;
}

export function localizedPosition(position: string, area: string) {
  if (!isTagalogLearningArea(area)) return position;
  return position.replace(/^Teacher\s+/i, "Guro ").replace(/^Principal\s+/i, "Punong-guro ");
}

export function lessonNameWithWeek(title: string, week: number) {
  const cleanTitle = title.replace(/\s*\(Week\s+\d+\)\s*$/i, "").trim();
  return `${cleanTitle} (Week ${week})`;
}
