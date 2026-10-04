"use client";

import { Fragment } from "react";
import { Assessment, BloomLevel, bloomLevels } from "@/types/assessment";
import { getTOSPresentation, itemPlacementText } from "@/services/tos-presentation";

export function TOSTable({ assessment, onSessionsChange, onBloomChange }: {
  assessment: Assessment;
  onSessionsChange: (index: number, sessions: number) => void;
  onBloomChange: (index: number, level: BloomLevel, count: number) => void;
}) {
  const view=getTOSPresentation(assessment);
  const placement=assessment.tosFormat==="item-placement";
  const span=placement?2:1;
  return <div className="tos-scroll"><table className="tos-table tos-reference-table">
    <thead><tr><th rowSpan={2}>LEARNING COMPETENCIES</th><th rowSpan={2}>Time Spent<br/>(in hr)</th><th colSpan={6}>COGNITIVE PROCESS DIMENSIONS</th><th colSpan={2}>Total Number of Items</th></tr>
      <tr>{view.levelLabels.map((label,index)=><th key={bloomLevels[index]}>{label.split("\n").map((line,i)=><Fragment key={line}>{i>0&&<br/>}{line}</Fragment>)}</th>)}<th>Computed</th><th>Adjusted</th></tr></thead>
    <tbody>{view.rows.map((row,index)=><Fragment key={row.competencyId}>
      <tr><td rowSpan={span}>{row.competency}<small>{row.percentage}% of items</small></td>
        <td rowSpan={span}><b>{Number(row.hours.toFixed(2))}</b><label className="tos-session-input">Sessions<input aria-label={`Teaching sessions: ${row.competency}`} type="number" min={0.25} step={0.25} value={row.teachingDays} onChange={event=>onSessionsChange(index,Math.max(0.25,Number(event.target.value)||0.25))}/></label></td>
        {bloomLevels.map(level=><td key={level}>{assessment.tosMode==="manual"?<input aria-label={`${row.competency} ${level}`} type="number" min={0} value={row.distribution[level]} onChange={event=>onBloomChange(index,level,Number(event.target.value))}/>:row.distribution[level]}</td>)}
        <td rowSpan={span}>{row.computed.toFixed(2)}</td><td rowSpan={span}><b>{row.totalItems}</b></td></tr>
      {placement&&<tr className="tos-placement-row">{bloomLevels.map(level=><td key={level} aria-label={`${level} item placement for ${row.competency}`}>{itemPlacementText(row.placement[level])||"—"}</td>)}</tr>}
    </Fragment>)}</tbody>
    <tfoot><tr><td>Total</td><td>{Number(view.totalHours.toFixed(2))}</td>{bloomLevels.map(level=><td key={level}>{view.totals[level]}</td>)}<td>{assessment.totalItems.toFixed(2)}</td><td>{view.totalItems}</td></tr></tfoot>
  </table></div>;
}
