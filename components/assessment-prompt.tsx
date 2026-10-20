"use client";

import { useMemo, useRef, useState } from "react";
import { Copy, FileInput } from "lucide-react";
import { Assessment } from "@/types/assessment";
import { buildAssessmentPrompt, importAssessmentResponse } from "@/services/assessment-prompt";

export function AssessmentPrompt({ assessment, open, onOpenChange, onImport }: {
  assessment: Assessment; open: boolean; onOpenChange: (open: boolean) => void; onImport: (next: Assessment) => void;
}) {
  const [response, setResponse] = useState("");
  const [message, setMessage] = useState("");
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const prepared = useMemo(() => {
    try { return { text: buildAssessmentPrompt(assessment), error: "" }; }
    catch (error) { return { text: "", error: error instanceof Error ? error.message : "Balance the TOS first." }; }
  }, [assessment]);

  async function copy() {
    if (!prepared.text) return;
    try { await navigator.clipboard.writeText(prepared.text); setMessage("Prompt copied. Paste it into Gemini or Copilot, then copy the complete JSON response back here."); }
    catch { onOpenChange(true); promptRef.current?.focus(); promptRef.current?.select(); setMessage("Clipboard access was blocked. Select the prompt below and use Copy (Ctrl+C on a computer)."); }
  }
  function importResponse() {
    try {
      const next = importAssessmentResponse(assessment, response);
      if (assessment.questions.length && !confirm("Replace the current test with these imported questions? Your TOS will stay unchanged.")) return;
      onImport(next); setResponse(""); setMessage("Questions imported. Check each question and its answer, then confirm teacher content review before saving or exporting.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Import failed. Your current test was retained."); }
  }

  return <section className="assessment-prompt" aria-label="Generate with Gemini or Copilot">
    <div className="panel-heading"><div><h2>Use Gemini or Copilot — no API key</h2><p>Copy the prompt, paste it into your AI chat, then bring the response back into ILAW.</p></div><div className="panel-actions"><button type="button" className="secondary-btn" disabled={!prepared.text} onClick={copy}><Copy/>Copy prompt</button><button type="button" className="text-btn" aria-expanded={open} onClick={() => onOpenChange(!open)}>{open ? "Hide prompt and import" : "Show prompt and import"}</button></div></div>
    <p className="prompt-privacy">The prompt contains curriculum and test settings only, not your teacher profile, passwords, or student names. ILAW sends nothing to an AI service in this mode; you choose what to paste.</p>
    {prepared.error && <p className="form-error" role="alert">{prepared.error}</p>}
    {message && <p className="prompt-message" role="status" aria-live="polite">{message}</p>}
    {open && <div className="prompt-workflow"><label>1. Copy this prompt into Gemini or Copilot<textarea ref={promptRef} value={prepared.text} readOnly rows={10} spellCheck={false}/></label><label>2. Paste the complete AI response<textarea value={response} onChange={event => setResponse(event.target.value)} rows={8} spellCheck={false} placeholder={'Paste the complete JSON response, starting with {"version": 1, "requestId": ...'}/></label><div className="prompt-import-actions"><button type="button" className="primary-btn" disabled={!prepared.text || !response.trim()} onClick={importResponse}><FileInput/>Import questions</button><span>3. Review and edit the test, confirm teacher review, then export or save.</span></div></div>}
  </section>;
}
