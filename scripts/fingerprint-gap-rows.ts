/**
 * Fingerprint a set of gap definitions handed over as JSON, with the repo's own
 * function — for an environment this machine holds no credentials for.
 *
 * `verify:gap-catalogue` compares the authored catalogue against a database it
 * can connect to. Production is reached here through the Supabase MCP, not a
 * connection string, so the rows arrive as JSON:
 *
 *   SELECT json_agg(json_build_object(
 *     'slug', slug, 'lineOfBusiness', line_of_business, 'severity', severity,
 *     'defaultSeverity', default_severity, 'ruleId', rule_id,
 *     'detectionLogic', detection_logic) ORDER BY slug)
 *   FROM gap_definitions WHERE is_active = true;
 *
 * Save that to a file and run:
 *   npx tsx scripts/fingerprint-gap-rows.ts <file.json>
 *
 * It prints the same 16-hex fingerprint `verify:gap-catalogue` prints, and the
 * authored catalogue's, so the two can be compared by eye — no rows leave the
 * environment they came from, which is the point of a fingerprint.
 */
import { readFileSync } from "node:fs"

import { AUTHORED_GAP_DEFINITIONS } from "../lib/gaps/authored-catalogue"
import { fingerprintGapDefinitions } from "../lib/gaps/catalogue-version"

const file = process.argv[2]
if (!file) {
    console.error("usage: npx tsx scripts/fingerprint-gap-rows.ts <rows.json>")
    process.exit(2)
}

const rows = JSON.parse(readFileSync(file, "utf8"))
if (!Array.isArray(rows)) {
    console.error(`${file}: expected a JSON array of rows`)
    process.exit(2)
}

const malformed = rows.filter(
    (r: Record<string, unknown>) => !r || typeof r.slug !== "string" || typeof r.ruleId !== "string"
)
if (malformed.length) {
    console.error(`${file}: ${malformed.length} row(s) lack slug/ruleId — check the SELECT's aliases`)
    process.exit(2)
}

const supplied = fingerprintGapDefinitions(rows)
const authored = fingerprintGapDefinitions(AUTHORED_GAP_DEFINITIONS as never)

console.log(`supplied rows      : ${rows.length} definitions  fingerprint ${supplied}`)
console.log(`authored catalogue : ${AUTHORED_GAP_DEFINITIONS.length} definitions  fingerprint ${authored}`)

if (supplied === authored) {
    console.log("\nThe supplied set matches the repo. No drift.")
    process.exit(0)
}

const authoredSlugs = new Set(AUTHORED_GAP_DEFINITIONS.map((d) => d.slug))
const suppliedSlugs = new Set(rows.map((r: { slug: string }) => r.slug))
const absent = [...authoredSlugs].filter((s) => !suppliedSlugs.has(s))
const extra = [...suppliedSlugs].filter((s) => !authoredSlugs.has(s))
console.error("\nDRIFT against the authored catalogue.")
if (absent.length) console.error(`  authored but not supplied (${absent.length}): ${absent.join(", ")}`)
if (extra.length) console.error(`  supplied but not authored (${extra.length}): ${extra.join(", ")}`)
process.exit(1)
