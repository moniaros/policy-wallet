import { expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
const root=process.cwd()
function files(dir:string):string[]{ return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):/\.[cm]?[jt]sx?$/.test(e.name)?[path.join(dir,e.name)]:[]) }
function violations(code:string){
    const found:string[]=[]
    const source=ts.createSourceFile('probe.tsx',code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
    const visit=(n:ts.Node)=>{ if(ts.isCallExpression(n)){
        const name=n.expression.getText(source)
        if (/(?:^|\.)scoreAssessment$/.test(name) || /healthRiskAssessment\.(?:create|createMany|upsert|update|updateMany)$/.test(name)) found.push(name)
    }
    if(ts.isJsxExpression(n) && n.expression && /(?:latestAssessment|snap\.assessment)\??\.scores/.test(n.expression.getText(source))) found.push('active_score_render')
    ts.forEachChild(n,visit)}
    visit(source);return found
}
it('enumerates app, lib and components: no active health scoring or score write/display path',()=>{
    const errors=['app','lib','components'].flatMap(d=>files(path.join(root,d))).flatMap(f=>violations(readFileSync(f,'utf8')).map(v=>`${path.relative(root,f)}: ${v}`))
    expect(errors).toEqual([])
})
it('the committed arbitrary-location probe detects score creation',()=>{expect(violations(readFileSync('tests/fixtures/guard-probes/health-score-retired.ts.txt','utf8'))).toHaveLength(2)})
