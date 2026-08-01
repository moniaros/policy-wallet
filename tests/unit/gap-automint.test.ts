/**
 * Gap-definition auto-mint controls (source-text).
 *
 * The clarity pipeline emits free vocabulary, and the orchestrator used to
 * upsert an ACTIVE GapDefinition for every slug it invented — which
 * getGapDefinitionsForPolicy then fed into every future gap-detection prompt
 * for that line of business with the junk "Auto-created…" description as
 * checkCriteria. Unbounded prompt bloat: motor reached 8 checks, 3 redundant.
 *
 * These pins hold the two guards in place so a refactor cannot silently
 * regress to active-minting:
 *  (1) emitted slugs are canonicalized by concept onto existing definitions;
 *  (2) a genuinely novel concept mints its definition INACTIVE (admins
 *      activate deliberately in /admin/gaps, where the "no content entry"
 *      badge flags it at the same time);
 *  (3) gapRows are deduped by definitionId (no DB unique protects this);
 *  (4) the dead ensureGapDefinition path stays deleted — it minted active.
 */

import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const src = readFileSync(
    join(process.cwd(), "lib/services/analysis/policy-analysis-orchestrator.service.ts"),
    "utf8"
)

describe("clarity auto-mint is canonicalized and inactive-by-default", () => {
    it("the persist loop resolves emitted slugs through pickCanonicalGapDefinition", () => {
        expect(src).toMatch(/pickCanonicalGapDefinition\(slug, lobDefinitions\)/)
    })

    it("a novel concept mints its definition INACTIVE (mutation check)", () => {
        // The upsert create block must set isActive: false — and the old
        // active-minting form must be gone entirely.
        expect(src).toMatch(/detectionLogic: \{ source: "ai_clarity_pipeline" \},\s*\n\s*isActive: false,/)
        expect(src).not.toMatch(/detectionLogic: \{ source: "ai_clarity_pipeline" \},\s*\n\s*isActive: true,/)
    })

    it("gapRows are deduped by definitionId before createMany (no DB unique backs this)", () => {
        expect(src).toMatch(/seenDefinitionIds/)
        const dedupeAt = src.indexOf("seenDefinitionIds.has(definitionId)")
        const createManyAt = src.indexOf("tx.gapInstance.createMany")
        expect(dedupeAt).toBeGreaterThan(-1)
        expect(createManyAt).toBeGreaterThan(dedupeAt)
    })

    it("the canonical lookup loads the LoB's definitions INCLUDING inactive ones", () => {
        // FILTERING on isActive here would re-mint a definition the moment an
        // admin deactivates its duplicate — the exact loop this fix closes.
        // (Selecting the column is fine; the where clause must not constrain it.)
        const start = src.indexOf("const lobDefinitions = await db.gapDefinition.findMany")
        expect(start).toBeGreaterThan(-1)
        const query = src.slice(start, start + 300)
        const whereClause = query.slice(query.indexOf("where:"), query.indexOf("select:"))
        expect(whereClause).toMatch(/lineOfBusiness/)
        expect(whereClause).not.toMatch(/isActive/)
    })

    it("the dead ensureGapDefinition (active-minting) path stays deleted", () => {
        expect(src).not.toMatch(/ensureGapDefinition/)
    })
})
