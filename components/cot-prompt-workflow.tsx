import type { Ref } from "react";

type Props = {
  prompt: string;
  response: string;
  busy: boolean;
  error: string;
  copyNotice: string;
  sectionRef: Ref<HTMLElement>;
  onCopy: () => void;
  onResponseChange: (value: string) => void;
  onImport: () => void;
};

export function CotPromptWorkflow({ prompt, response, busy, error, copyNotice, sectionRef, onCopy, onResponseChange, onImport }: Props) {
  return <section className="assessment-prompt cot-prompt-workflow" ref={sectionRef} aria-label="COT copy and import steps">
    <h2>Generate your COT lesson with ChatGPT, Gemini or Copilot</h2>
    <p>No API key is needed. ILAW does not send anything to an AI chat automatically. Only selected lesson content and official indicator snapshots are in the prompt; teacher name, observer, section and observation date are excluded. Check lesson text for personal information before sharing it.</p>
    <h3>Step 1 — Copy the prompt into an AI chat</h3>
    <p>Click <b>Copy COT prompt</b>, open ChatGPT, Gemini or Copilot, paste the prompt into its message box, and send it. Wait for the complete answer.</p>
    <div className="cot-actions">
      <button className="secondary-btn" onClick={onCopy}>Copy COT prompt</button>
      <a className="secondary-btn" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">Open ChatGPT ↗</a>
      <a className="secondary-btn" href="https://gemini.google.com/" target="_blank" rel="noopener noreferrer">Open Gemini ↗</a>
      <a className="secondary-btn" href="https://copilot.microsoft.com/" target="_blank" rel="noopener noreferrer">Open Copilot ↗</a>
    </div>
    {copyNotice && <p className="prompt-message" role="status">{copyNotice}</p>}
    <label>Prompt to copy — paste this into your AI chat<textarea readOnly rows={6} value={prompt}/></label>
    <h3>Step 2 — Bring the AI answer back to ILAW</h3>
    <p>Copy the AI&apos;s complete JSON answer, not the prompt above. If the answer is in a code block, use its Copy button. Include the whole response from the opening <code>{"{"}</code> to the closing <code>{"}"}</code>. Do not paste a screenshot or only part of the answer.</p>
    <label htmlFor="cot-json-response">Paste the complete COT JSON response</label>
    <textarea id="cot-json-response" rows={8} value={response} placeholder={'Paste the AI answer here, starting with {"version":1,"requestId":...'} aria-describedby="cot-import-help" spellCheck={false} onChange={e => onResponseChange(e.target.value)}/>
    <h3>Step 3 — Apply the answer to your COT draft</h3>
    <div className="prompt-import-actions">
      <button className="primary-btn" disabled={!response.trim() || busy} aria-describedby="cot-import-help" onClick={onImport}>Import COT lesson</button>
      <span id="cot-import-help" role="status">{!response.trim() ? "This button becomes available after you paste the AI's JSON answer into the box above." : "Ready to import. Click Import COT lesson to check the JSON and fill your editable COT draft. This does not save it yet."}</span>
    </div>
    {error && <p className="weekly-error" role="alert">{error}</p>}
    <h3>Step 4 — Review, save and export</h3>
    <p>After a successful import, review the five COT tabs and click <b>Save COT lesson</b>. Then scroll to <b>Review and export</b> at the bottom of this page to download the Word, PDF, PowerPoint or ZIP files. If import reports an error, your current draft and pasted response stay available for correction.</p>
  </section>;
}
