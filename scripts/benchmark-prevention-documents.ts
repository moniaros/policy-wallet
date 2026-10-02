/** Read-only corpus check. No model calls, uploads, customer identifiers or source text written to the report. */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { probePdf } from '../lib/ingestion/pdf-probe'
import { classifyLexically } from '../lib/ingestion/lexical-classifier'
import { verifyExtractionSources } from '../lib/services/ai/extraction-citations'
async function main() {
    const directory=process.argv[2]
    if (!directory) throw new Error('Pass the private demo PDF directory')
    const expected=JSON.parse(readFileSync('docs/evidence/prevention-hub/pdf-expectations.json','utf8'))
    const files=new Map(readdirSync(directory).filter(n=>/\.pdf$/i.test(n)).map(n=>{const bytes=readFileSync(path.join(directory,n));return [createHash('sha256').update(bytes).digest('hex'),bytes] as const}))
    const results=[]
    for (const record of expected) {
        const bytes=files.get(record.sha256);if(!bytes)throw new Error(`Missing corpus sample ${record.sample}`)
        const started=performance.now()
        const intake=await probePdf(new Uint8Array(bytes))
        const full=await probePdf(new Uint8Array(bytes),{samplePages:200,budgetMs:30000})
        if (!full.ok || !intake.ok) {results.push({sample:record.sample,probeFailure:!full.ok?full.failure:!intake.ok?intake.failure:null});continue}
        const classification=classifyLexically(intake.text)
        const checks=record.expectedTextSpans.map((span:any)=>{
            const verified=verifyExtractionSources({benefit:{page:span.page,snippet:span.snippet}}, {pages:full.pages,pageCount:full.pageCount,sampledPages:full.sampledPages} as any)?.benefit
            return {page:span.page,role:span.role,located:verified?.verified===true,locatedPage:verified?.verifiedPage??span.page}
        })
        results.push({sample:record.sample,sha256:record.sha256,pageCount:full.pageCount,expectedPagesMatch:record.expectedPages===full.pageCount,intakePages:intake.sampledPages,benchmarkPages:full.sampledPages,imageOnly:intake.imageOnly,needsVision:intake.needsVision??intake.imageOnly,localClassification:classification.documentType,ms:Math.round(performance.now()-started),checks})
    }
    const report={scope:'Local PDF reading and independently authored citation spans, not a live model accuracy benchmark or entitlement confirmation.',modelsCalled:0,reportDate:new Date().toISOString(),samples:results}
    writeFileSync('docs/evidence/prevention-hub/pdf-results.json',JSON.stringify(report,null,2)+'\n')
    console.log(JSON.stringify({samples:results.length,pages:results.reduce((a,r)=>a+(r.pageCount??0),0),spans:results.flatMap(r=>r.checks??[]).length,located:results.flatMap(r=>r.checks??[]).filter(c=>c.located).length,vision:results.filter(r=>r.needsVision).map(r=>r.sample),failed:results.filter(r=>r.probeFailure||r.expectedPagesMatch===false).map(r=>r.sample)}))
}
main()
