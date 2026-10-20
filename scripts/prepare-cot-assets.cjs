/* eslint-disable @typescript-eslint/no-require-imports */
const fs=require('node:fs');const path=require('node:path');const Module=require('node:module');const ts=require('typescript');
const root=path.resolve(__dirname,'..');const resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...args){return resolve.call(this,request.startsWith('@/')?path.join(root,request.slice(2)):request,parent,...args);};
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const {z}=require('zod');const {cotResponseSchema}=require('../services/cot-generator.ts');
function providerSchema(value){if(Array.isArray(value))return value.map(providerSchema);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>key!=='default'&&key!=='$schema').map(([key,entry])=>[key,providerSchema(entry)]));return value;}
fs.writeFileSync(path.join(root,'public/cot-response-schema.json'),JSON.stringify(providerSchema(z.toJSONSchema(cotResponseSchema))));
const worker=path.join(path.dirname(require.resolve('pdfjs-dist/package.json')),'build/pdf.worker.min.mjs');
const destination=path.join(root,'public/cot');fs.mkdirSync(destination,{recursive:true});fs.copyFileSync(worker,path.join(destination,'pdf.worker.min.mjs'));
console.log('Prepared the trusted COT response schema and bundled PDF worker.');
