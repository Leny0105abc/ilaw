/* eslint-disable @typescript-eslint/no-require-imports -- Render the actual workflow component. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

require.extensions['.tsx'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, file);
const { CotPromptWorkflow } = require('../components/cot-prompt-workflow.tsx');
const props = { prompt: 'Generate a COT JSON response. <h1>Example</h1>', response: '', busy: false, error: '', copyNotice: '', sectionRef: null, onCopy() {}, onResponseChange() {}, onImport() {} };
const render = overrides => renderToStaticMarkup(React.createElement(CotPromptWorkflow, { ...props, ...overrides }));
const empty = render({});
for (const label of ['Step 1', 'Step 2', 'Step 3', 'Step 4', 'Open ChatGPT', 'Open Gemini', 'Open Copilot', 'Import COT lesson', 'Save COT lesson', 'Review and export']) assert.ok(empty.includes(label), label);
assert.match(empty, /<button[^>]*disabled=""[^>]*>Import COT lesson<\/button>/);
assert.ok(empty.includes('This button becomes available'));
assert.match(empty, /for="cot-json-response"/);
assert.match(empty, /id="cot-json-response"[^>]*aria-describedby="cot-import-help"/);
assert.ok(empty.includes('&lt;h1&gt;Example&lt;/h1&gt;'), 'Prompt is text, never interpreted as HTML');
const links = [...empty.matchAll(/<a ([^>]+)>Open /g)];
assert.equal(links.length, 3);
for (const [, attributes] of links) { assert.ok(attributes.includes('target="_blank"')); assert.ok(attributes.includes('rel="noopener noreferrer"')); assert.ok(!attributes.includes('?'), 'Opening an AI chat must not transmit prompt data in its URL'); }
assert.match(render({ response: ' \n ' }), /<button[^>]*disabled=""[^>]*>Import COT lesson<\/button>/);
const entered = render({ response: '{"version":1,"requestId":"cot-test"}' });
assert.ok(!/<button[^>]*disabled=""[^>]*>Import COT lesson<\/button>/.test(entered));
assert.ok(entered.includes('Ready to import.'));
assert.ok(entered.includes('This does not save it yet.'));
assert.match(render({ response: '{}', busy: true }), /<button[^>]*disabled=""[^>]*>Import COT lesson<\/button>/);
assert.ok(render({ error: 'Invalid JSON. Your draft is unchanged.' }).includes('role="alert"'));
assert.ok(render({ copyNotice: 'Prompt copied.' }).includes('Prompt copied.'));
console.log('COT workflow checks passed: ChatGPT/Gemini/Copilot instructions, accessible response field, empty/whitespace/busy button states, import/save guidance, safe external links and escaped prompt text.');
