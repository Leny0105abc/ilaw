import { DifficultySettings } from "@/types/assessment";
import { difficulties, difficultyCounts, difficultyError } from "@/services/assessment-quality";

export function AssessmentDifficulty({ value, total, onChange }: { value: DifficultySettings; total: number; onChange: (value: DifficultySettings) => void }) {
  const error = difficultyError(value);
  const counts = error ? null : difficultyCounts(Number.isInteger(total) && total > 0 ? total : 0, value);
  return <div className="assessment-difficulty"><label>Difficulty Level<select value={value.level} onChange={event => onChange({ ...value, level: event.target.value as DifficultySettings["level"] })}>{[...difficulties, "Mixed"].map(level => <option key={level}>{level}</option>)}</select></label>
    {value.level === "Mixed" && <><div className="difficulty-percentages">{difficulties.map(level => <label key={level}>{level} (%)<input type="number" min={0} max={100} step={1} value={value.percentages[level]} onChange={event => onChange({ ...value, percentages: { ...value.percentages, [level]: Number(event.target.value) } })}/></label>)}</div><p className={error ? "form-error" : "difficulty-total"}>Total: {difficulties.reduce((sum, level) => sum + value.percentages[level], 0)}%{error ? ` — ${error}` : ""}</p></>}
    {counts && <p className="difficulty-counts">{difficulties.map(level => `${level}: ${counts[level]} items`).join(" · ")}{value.level === "Mixed" ? " (rounded to whole items)" : ""}</p>}
    <p className="difficulty-help">Easy: recall and basic understanding. Moderate: application, comparison, and procedures. Difficult: analysis, evaluation, and decisions. Difficulty does not alter your TOS.</p>
  </div>;
}
