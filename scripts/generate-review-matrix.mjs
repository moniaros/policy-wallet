#!/usr/bin/env node
/**
 * Regenerate the review trigger matrix in docs/architecture/risk-review.md from
 * lib/services/risk-review/policy.ts.
 *
 * A hand-maintained table of 20 triggers × 5 decisions is wrong within a month,
 * and a wrong table about when we interrupt customers is worse than none.
 */
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

const DOC = "docs/architecture/risk-review.md"
const START = "<!-- BEGIN GENERATED REVIEW MATRIX -->"
const END = "<!-- END GENERATED REVIEW MATRIX -->"

const scratch = mkdtempSync(join(tmpdir(), "pw-review-"))
const compiled = join(scratch, "policy.mjs")
execFileSync("npx", ["esbuild", "lib/services/risk-review/policy.ts", "--format=esm", `--outfile=${compiled}`], { stdio: "pipe" })
const { REVIEW_POLICIES } = await import(pathToFileURL(compiled).href)

const yn = (b) => (b ? "**yes**" : "no")
const rows = Object.values(REVIEW_POLICIES)

const GROUPS = [
  ["Life events", ["life_event", "child_born", "marriage", "divorce", "mortgage_added", "property_purchased", "business_started", "travel_increased"]],
  ["Portfolio", ["policy_uploaded", "policy_renewal", "claim"]],
  ["Derived", ["protection_score_drop", "coverage_gap", "ai_confidence_drop"]],
  ["Relationship", ["questionnaire_update", "customer_inactivity", "advisor_assignment"]],
  ["Periodic", ["annual", "quarterly", "birthday"]],
]

const out = [START, ""]
out.push(`_Generated from \`lib/services/risk-review/policy.ts\` by \`scripts/generate-review-matrix.mjs\`. Do not edit by hand._`)
out.push("")
const opening = rows.filter((r) => r.startsReview).length
out.push(`**${rows.length} triggers — ${opening} open a review, ${rows.length - opening} recalculate without interrupting.**`)
out.push("")

for (const [title, keys] of GROUPS) {
  out.push(`### ${title}`)
  out.push("")
  out.push("| Trigger | Review starts? | AI recalculates? | Advisor notified? | Customer guided? | Score can move? | Due | Cooldown |")
  out.push("|---|---|---|---|---|---|---|---|")
  for (const key of keys) {
    const p = REVIEW_POLICIES[key]
    if (!p) continue
    out.push(`| \`${key}\` | ${yn(p.startsReview)} | ${yn(p.recalculates)} | ${yn(p.notifiesAdvisor)} | ${yn(p.guidesCustomer)} | ${yn(p.movesScore)} | ${p.startsReview ? p.dueInDays + "d" : "—"} | ${p.cooldownDays > 0 ? p.cooldownDays + "d" : "—"} |`)
  }
  out.push("")
}

out.push("### Why each decision is what it is")
out.push("")
for (const p of rows) out.push(`- **\`${p.trigger}\`** — ${p.rationale}`)
out.push("")
out.push(END)

const doc = readFileSync(DOC, "utf-8")
writeFileSync(DOC, doc.slice(0, doc.indexOf(START)) + out.join("\n") + doc.slice(doc.indexOf(END) + END.length))
console.log(`Wrote ${rows.length} triggers (${opening} open a review) to ${DOC}`)
