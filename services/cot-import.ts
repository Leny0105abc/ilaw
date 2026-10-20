import { CotIndicator, TeacherPosition } from "@/types/cot";
export type IndicatorExtraction = {
    text: string;
    metadata: {
        schoolYears: string[];
        positions: string[];
    };
    candidates: {
        code: string;
        wording: string;
        domain: string;
        strand: string;
    }[];
};
export function indicatorCellText(value:unknown):string {
    if(value===null||value===undefined)return "";
    if(typeof value==="string"||typeof value==="number"||typeof value==="boolean")return String(value);
    if(value instanceof Date)return value.toISOString();
    if(typeof value!=="object")return "";
    const cell=value as Record<string,unknown>;
    if(Array.isArray(cell.richText))return cell.richText.map(run=>typeof run?.text==="string"?run.text:"").join("");
    if("result" in cell)return indicatorCellText(cell.result);
    if(typeof cell.text==="string")return cell.text;
    if(typeof cell.error==="string")return cell.error;
    return "";
}
export function extractIndicatorCandidates(text: string): IndicatorExtraction {
    const table=text.split(/\r?\n/).map(line=>line.split("\t"));
    const heading=table.findIndex(row=>row.some(cell=>/ppst.*(?:code|number)|indicator\s*(?:code|number)/i.test(cell))&&row.some(cell=>/wording|indicator\s*(?:text|description)/i.test(cell)));
    const columns=heading<0?[]:table[heading];
    const column=(pattern:RegExp)=>columns.findIndex(cell=>pattern.test(cell));
    const codeColumn=column(/ppst.*(?:code|number)|indicator\s*(?:code|number)/i),wordingColumn=column(/wording|indicator\s*(?:text|description)/i),domainColumn=column(/^\s*domain\s*$/i),strandColumn=column(/^\s*strand\s*$/i);
    const tableCandidates=heading<0?[]:table.slice(heading+1).filter(row=>/^[1-7]\.[1-9]\.[1-4]$/.test(row[codeColumn]?.trim()||"")).map(row=>({code:row[codeColumn].trim(),wording:row[wordingColumn]||"",domain:row[domainColumn]||"",strand:row[strandColumn]||""})).filter(row=>row.wording.length>=12);
    const matches = [...text.matchAll(/\b([1-7]\.[1-9]\.[1-4])\s+/g)];
    const candidates = matches.map((match, index) => {
        const code = match[1];
        const wording = text.slice(match.index! + match[0].length, matches[index + 1]?.index ?? text.length).replace(/\s+/g, " ").trim();
        const preceding = text.slice(0, match.index);
        const domain = [...preceding.matchAll(/Domain\s+[1-7][.:]?\s+([^\n\r]+)/gi)].at(-1)?.[1]?.trim() || "";
        const strand = [...preceding.matchAll(/Strand\s+[1-7]\.[1-9]\s*[\r\n]+([^\n\r]+)/gi)].at(-1)?.[1]?.trim() || "";
        return { code, wording, domain, strand };
    }).filter(row => row.wording.length >= 12 && row.wording.length <= 6000 && !/^\d[.\s]/.test(row.wording));
    return { text, metadata: { schoolYears: [...new Set([...text.matchAll(/\b(20\d{2})\s*[-–—]\s*(20\d{2})\b/g)].map(m => `${m[1]}-${m[2]}`))], positions: [...new Set([...text.matchAll(/\b(?:Master\s+)?Teachers?\s+(?:VII|VI|IV|III|II|V|I)(?:\s*[-–—]\s*(?:VII|VI|IV|III|II|V|I))?\b/gi)].map(m => m[0]))] }, candidates:tableCandidates.length?tableCandidates:candidates };
}
export async function readIndicatorFile(file: File): Promise<IndicatorExtraction> {
    if (file.size > 20 * 1024 * 1024)
        throw new Error("Use a file no larger than 20 MB.");
    const buffer = await file.arrayBuffer();
    const extension = file.name.split(".").at(-1)?.toLowerCase();
    let text = "";
    if (extension === "pdf") {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/cot/pdf.worker.min.mjs";
        const loading = pdfjs.getDocument({ data: new Uint8Array(buffer) });
        const pdf = await loading.promise;
        try {
            if (pdf.numPages > 100)
                throw new Error("Import at most 100 PDF pages at a time.");
            const pages = [];
            for (let n = 1; n <= pdf.numPages; n++) {
                const page = await pdf.getPage(n);
                const content = await page.getTextContent();
                pages.push(content.items.map(item => "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "").join(""));
                page.cleanup();
            }
            text = pages.join("\n\n");
        }
        finally {
            await loading.destroy();
        }
        if (!text.trim())
            throw new Error("This PDF has no extractable text. Use a text-based PDF, DOCX, or Excel copy; scanned wording must be checked manually.");
    }
    else if (extension === "docx") {
        const mammoth = await import("mammoth/mammoth.browser");
        text = (await mammoth.extractRawText({ arrayBuffer: buffer })).value;
    }
    else if (extension === "xlsx") {
        const { Workbook } = await import("exceljs");
        const workbook = new Workbook();
        await workbook.xlsx.load(buffer);
        const rows: string[] = [];
        workbook.eachSheet(sheet => { sheet.eachRow(row => { const values: string[] = []; row.eachCell({ includeEmpty: true }, cell => values.push(indicatorCellText(cell.value))); rows.push(values.join("\t")); }); });
        text = rows.join("\n");
    }
    else
        throw new Error("Choose an official PDF, DOCX, or XLSX file. Convert legacy Word/Excel files first.");
    if (text.length > 1000000)
        throw new Error("The extracted document is too large. Import a smaller official section.");
    return extractIndicatorCandidates(text);
}
export function draftImportedIndicators(extraction: IndicatorExtraction, metadata: {
    schoolYear: string;
    positions: TeacherPosition[];
    careerStage: string;
    source: string;
    sourceUrl: string;
    sourcePage: string;
    version: string;
    observationType: CotIndicator["observationType"];
    cycles: CotIndicator["cycles"];
}): CotIndicator[] {
    return metadata.positions.flatMap(position => extraction.candidates.map((row, index) => ({ id: `import-${crypto.randomUUID()}-${index}`, schoolYear: metadata.schoolYear, position, careerStage: metadata.careerStage, ...row, observationType: metadata.observationType, cycles: metadata.cycles, source: metadata.source, sourceUrl: metadata.sourceUrl, sourcePage: metadata.sourcePage, version: metadata.version, active: false, verified: false, verifiedAt: "" })));
}
