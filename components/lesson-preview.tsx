import { LessonPlan } from "@/types/lesson-plan";
import { learningAreaLabel } from "@/data/curriculum";
import { assessmentDescription, firstColumnLabels, learningExperienceDescription, lessonNameWithWeek, lessonPlanLabels, localizedPosition } from "@/data/lesson-plan-copy";

export function LessonPreview({ plan }: { plan: LessonPlan }) {
  const labels = lessonPlanLabels(plan.area);
  const columnLabels = firstColumnLabels();
  const cell = (getter: (index:number)=>React.ReactNode) => Array.from({length:4},(_,i)=><td key={i}>{i<plan.sessions.length?getter(i):""}</td>);
  const flow = (index:number) => <div className="flow-cell"><span className="flow-step">{plan.sessions[index].flow.iDo}</span><span className="flow-step">{plan.sessions[index].flow.weDo}</span><span className="flow-step">{plan.sessions[index].flow.youDo}</span><b>{labels.flowParts[3]}</b><span className="flow-step">{plan.sessions[index].flow.synthesis}</span></div>;

  return <div className="lesson-document" id="printable-plan">
    <article className="paper page-one"><DocumentHeader plan={plan}/><table><tbody>
      <MergedRow label={columnLabels.name}>{lessonNameWithWeek(plan.title, plan.week)}</MergedRow><MergedRow label={columnLabels.area}>{learningAreaLabel(plan.grade, plan.area)}</MergedRow><MergedRow label={columnLabels.teacher}>{plan.profile.teacherName}</MergedRow><MergedRow label={columnLabels.gradeSection}>{`${labels.gradeWord} ${plan.grade} - ${plan.section}`}</MergedRow><Row label={columnLabels.sessions} className="session-row">{cell(i=>`${labels.session} ${i+1}`)}</Row><MergedRow label={columnLabels.references}>{plan.references}</MergedRow><MergedRow label={columnLabels.ai}>{plan.aiDeclaration}</MergedRow>
      <SectionRow title={columnLabels.intentions} description={labels.intentionDescription}/><MergedRow label={columnLabels.competency}>{plan.competencyText}</MergedRow><Row label={columnLabels.objectives}>{cell(i=><div className="numbered-objectives">{plan.sessions[i].objectives.map((objective,index)=><p key={objective}><span>{index+1}.</span><span>{objective}</span></p>)}</div>)}</Row><Row label={columnLabels.context}>{cell(i=>plan.sessions[i].learnerContext)}</Row>
      <SectionRow title={columnLabels.experience} description={learningExperienceDescription(plan.area)}/><Row label={columnLabels.preLesson}>{cell(i=>plan.sessions[i].preLesson)}</Row><Row label={columnLabels.flow}>{cell(flow)}</Row><Row label={columnLabels.resources}>{cell(i=>plan.sessions[i].resources.join(", "))}</Row><Row label={columnLabels.integration}>{cell(i=>plan.sessions[i].integration)}</Row>
    </tbody></table></article>
    <article className="paper page-two"><header className="continuation-header"><h2>{labels.lessonPlan} – {labels.continuation}</h2></header><table><tbody>
      <SectionRow title={columnLabels.assessment} description={assessmentDescription(plan.area)}/><Row label={columnLabels.formative}>{cell(i=>plan.sessions[i].assessment)}</Row><SectionRow title={columnLabels.waysForward} description={labels.waysDescription}/><Row label={columnLabels.extended}>{cell(i=>plan.sessions[i].extendedLearning)}</Row><Row label={columnLabels.reflections}>{cell(i=>plan.sessions[i].reflection)}</Row>
    </tbody></table><SignatureFooter plan={plan}/></article>
  </div>;
}

function DocumentHeader({plan}:{plan:LessonPlan}) { const labels=lessonPlanLabels(plan.area); return <header><img className="document-logo" src="/deped-seal.png" alt="Department of Education seal"/><p>{labels.republic}</p><b>{labels.department}</b><p>{plan.profile.region}</p><p>{plan.profile.division}</p><p>{plan.profile.district}</p><strong>{plan.profile.school}</strong><p>{plan.profile.location}</p><h2>{labels.lessonPlan}</h2></header>; }
function SignatureFooter({plan}:{plan:LessonPlan}) { const labels=lessonPlanLabels(plan.area); return <footer><div className="signature-block"><span className="signature-label">{labels.preparedBy}</span><strong>{plan.profile.teacherName}</strong><span>{localizedPosition(plan.profile.position, plan.area)}</span></div><div className="signature-block"><span className="signature-label">{labels.reviewedBy}</span><strong>{plan.profile.schoolHead}</strong><span>{localizedPosition(plan.profile.schoolHeadPosition, plan.area)}</span></div></footer>; }
function Row({label,children,className}: {label:string;children:React.ReactNode;className?:string}) { return <tr className={className}><th>{label}</th>{children}</tr>; }
function MergedRow({label,children}: {label:string;children:React.ReactNode}) { return <tr><th>{label}</th><td colSpan={4}>{children}</td></tr>; }
function SectionRow({title,description}: {title:string;description:string}) { return <tr className="section-row"><th>{title}</th><td colSpan={4}>{description}</td></tr>; }
