// Three consecutive clean rounds: the geometry fields must be identical across
// docs/evidence/dashboard-facts/<round-a> … <round-c>. Usage:
//   node tests/measure/dashboard-facts-rounds.mjs round-1 round-2 round-3
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
const [a, ...rest] = process.argv.slice(2)
if (!a || rest.length === 0) { console.error("usage: dashboard-facts-rounds.mjs <round> <round> [<round>]"); process.exit(2) }
const base = path.join(process.cwd(), "docs", "evidence", "dashboard-facts")
const strip = (j) => { const g = j.geometry; return JSON.stringify({ layout: g.layout, rows: g.rows, cellsPerRow: g.cellsPerRow, hairlineAtRowStart: g.hairlineAtRowStart, missingHairlines: g.missingHairlines, baselineSpread: g.baselineSpread, cells: g.cells.map((c) => [c.key, c.labelLines, c.noteLines, c.borderLeftPx > 0, c.numberFontPx, c.labelFontPx]), overlaps: j.overlaps.length, small: j.smallTargets.length, fonts: g.smallFonts.length, hscroll: g.hscroll }) }
let drift = 0
for (const f of readdirSync(path.join(base, a)).filter((n) => n.endsWith(".json"))) {
  const ref = strip(JSON.parse(readFileSync(path.join(base, a, f), "utf8")))
  for (const r of rest) {
    const other = strip(JSON.parse(readFileSync(path.join(base, r, f), "utf8")))
    if (other !== ref) { drift++; console.log(`DRIFT ${f}: ${a} vs ${r}`) }
  }
}
console.log(drift === 0 ? `identical geometry across ${[a, ...rest].join(", ")}` : `${drift} drift(s)`)
process.exit(drift === 0 ? 0 : 1)
