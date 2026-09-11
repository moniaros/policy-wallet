/**
 * Generate the compliance documents that are derived, never written by hand:
 * the Art. 30 record (docs/compliance/ROPA.md) and the DPIA input pack
 * (docs/compliance/DPIA-INPUTS.md).
 *
 *   npx tsx scripts/generate-ropa.ts          # write both files
 *   npx tsx scripts/generate-ropa.ts --check  # fail if either committed file is stale
 *
 * PW-PROVENANCE-01 W4-01 / W4-02. The rendering lives in
 * lib/compliance/ropa-report.ts so that `tests/unit/generated-compliance-docs-current.test.ts`
 * can enforce in CI what `--check` offers on request. What this does NOT
 * produce is a DPIA — that assessment is counsel's (H-P2).
 */

import { readFileSync, writeFileSync } from "node:fs"

import { buildGeneratedDocs } from "../lib/compliance/ropa-report"

function main() {
    const docs = buildGeneratedDocs()

    if (process.argv.includes("--check")) {
        let stale = 0
        for (const doc of docs) {
            let current = ""
            try {
                current = readFileSync(doc.path, "utf-8")
            } catch {
                console.error(`${doc.path} does not exist. Run: npx tsx scripts/generate-ropa.ts`)
                stale++
                continue
            }
            if (current !== doc.content) {
                console.error(`${doc.path} is stale — a source changed since it was generated. Run: npx tsx scripts/generate-ropa.ts`)
                stale++
            } else {
                console.log(`${doc.path} is up to date.`)
            }
        }
        process.exit(stale > 0 ? 1 : 0)
    }

    for (const doc of docs) {
        writeFileSync(doc.path, doc.content)
        console.log(`Wrote ${doc.path} (${doc.content.split("\n").length} lines)`)
    }
}

main()
