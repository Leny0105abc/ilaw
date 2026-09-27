import { LessonPlan } from "@/types/lesson-plan";
import { learningAreaLabel } from "@/data/curriculum";
import { assessmentDescription, learningExperienceDescription, lessonNameWithWeek, lessonPlanLabels, localizedPosition } from "@/data/lesson-plan-copy";

export function LessonPreview({ plan }: { plan: LessonPlan }) {
  const labels = lessonPlanLabels(plan.area);
  const cell = (getter: (index:number)=>React.ReactNode) => Array.from({length:4},(_,i)=><td key={i}>{i<plan.sessions.length?getter(i):""}</td>);
  const dayHeader = <thead><tr><th></th>{labels.days.map(day=><th key={day}>{day}</th>)}</tr></thead>;
  const flow = (index:number) => <div className="flow-cell"><b>{labels.flowParts[0]}</b>{plan.sessions[index].flow.iDo}<b>{labels.flowParts[1]}</b>{plan.sessions[index].flow.weDo}<b>{labels.flowParts[2]}</b>{plan.sessions[index].flow.youDo}<b>{labels.flowParts[3]}</b>{plan.sessions[index].flow.synthesis}</div>;

  return <div className="lesson-document" id="printable-plan">
    <article className="paper page-one"><DocumentHeader plan={plan}/><table>{dayHeader}<tbody>
      <MergedRow label={labels.name}>{lessonNameWithWeek(plan.title, plan.week)}</MergedRow><MergedRow label={labels.area}>{learningAreaLabel(plan.grade, plan.area)}</MergedRow><MergedRow label={labels.teacher}>{plan.profile.teacherName}</MergedRow><MergedRow label={labels.gradeSection}>{`${labels.gradeWord} ${plan.grade} - ${plan.section}`}</MergedRow><Row label={labels.sessions} className="session-row">{cell(i=>`${labels.session} ${i+1}`)}</Row><MergedRow label={labels.references}>{plan.references}</MergedRow><MergedRow label={labels.ai}>{plan.aiDeclaration}</MergedRow>
      <SectionRow title={labels.intentions} description={labels.intentionDescription}/><Row label={labels.competency}>{cell(()=>plan.competencyText)}</Row><Row label={labels.objectives}>{cell(i=><ul>{plan.sessions[i].objectives.map(o=><li key={o}>{o}</li>)}</ul>)}</Row><Row label={labels.context}>{cell(i=>plan.sessions[i].learnerContext)}</Row>
      <SectionRow title={labels.experience} description={learningExperienceDescription(plan.area)}/><Row label={labels.preLesson}>{cell(i=>plan.sessions[i].preLesson)}</Row><Row label={labels.flow}>{cell(flow)}</Row><Row label={labels.resources}>{cell(i=>plan.sessions[i].resources.join(", "))}</Row><Row label={labels.integration}>{cell(i=>plan.sessions[i].integration)}</Row>
    </tbody></table></article>
    <article className="paper page-two"><header className="continuation-header"><h2>{labels.lessonPlan} – {labels.continuation}</h2></header><table>{dayHeader}<tbody>
      <SectionRow title={labels.assessment} description={assessmentDescription(plan.area)}/><Row label={labels.formative}>{cell(i=>plan.sessions[i].assessment)}</Row><SectionRow title={labels.waysForward} description={labels.waysDescription}/><Row label={labels.extended}>{cell(i=>plan.sessions[i].extendedLearning)}</Row><Row label={labels.reflections}>{cell(i=>plan.sessions[i].reflection)}</Row>
    </tbody></table><SignatureFooter plan={plan}/></article>
  </div>;
}

function DocumentHeader({plan}:{plan:LessonPlan}) { const labels=lessonPlanLabels(plan.area); return <header><img className="document-logo" src="/deped-seal.png" alt="Department of Education seal"/><p>{labels.republic}</p><b>{labels.department}</b><p>{plan.profile.region}</p><p>{plan.profile.division}</p><p>{plan.profile.district}</p><strong>{plan.profile.school}</strong><p>{plan.profile.location}</p><h2>{labels.lessonPlan}</h2></header>; }
function SignatureFooter({plan}:{plan:LessonPlan}) { const labels=lessonPlanLabels(plan.area); return <footer><div className="signature-block"><span className="signature-label">{labels.preparedBy}</span><strong>{plan.profile.teacherName}</strong><span>{localizedPosition(plan.profile.position, plan.area)}</span></div><div className="signature-block"><span className="signature-label">{labels.reviewedBy}</span><strong>{plan.profile.schoolHead}</strong><span>{localizedPosition(plan.profile.schoolHeadPosition, plan.area)}</span></div></footer>; }
function Row({label,children,className}: {label:string;children:React.ReactNode;className?:string}) { return <tr className={className}><th>{label}</th>{children}</tr>; }
function MergedRow({label,children}: {label:string;children:React.ReactNode}) { return <tr><th>{label}</th><td colSpan={4}>{children}</td></tr>; }
function SectionRow({title,description}: {title:string;description:string}) { return <tr className="section-row"><th>{title}</th><td colSpan={4}>{description}</td></tr>; }
