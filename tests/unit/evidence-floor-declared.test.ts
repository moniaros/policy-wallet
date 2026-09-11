import { describe, it, expect, vi } from "vitest"

const findMany = vi.fn(async (..._args: unknown[]): Promise<unknown[]> => [])
vi.mock("@/lib/db", () => ({ db: { gapInstance: { findMany: (...a: unknown[]) => findMany(...a) } } }))

import { AUTHORED_GAP_DEFINITIONS } from "@/lib/gaps/authored-catalogue"
import { fieldsReadByDetectionLogic } from "@/lib/gaps/rule-read-fields"
import {
    EVIDENCE_FLOOR_BY_SLUG,
    defaultEvidenceFloor,
    evidenceFloorFor,
    evidenceFloorForSlug,
    evidenceVerdictFor,
    lowestEvidenceOf,
} from "@/lib/gaps/evidence-floor"
import { DOCUMENT_EVIDENCE_STATES } from "@/lib/gaps/document-evidence"
import { readLiveGapRows, countLiveGapRows } from "@/lib/gaps/gap-rows"
import { provenanceOf } from "@/lib/gaps/provenance"

/** A slug that is both classified (provenance) and asks the document (floor verified) — the accessor's classified read needs both. */
const CLASSIFIED_VERIFIED_SLUG = AUTHORED_GAP_DEFINITIONS.find(
    (d) => d.isActive && provenanceOf(d.slug) !== "under_review" && !/missing|not_recorded/.test(d.slug)
)!.slug

/**
 * PW-PROVENANCE-01 W2-02. Every ACTIVE definition in the authored catalogue
 * resolves an evidence floor; a rule that fires a GAP on what the document
 * says needs `policy_verified`, a rule that fires on silence needs
 * `policy_silent`; the verdict for a stored row follows from its floor and
 * the evidence its run recorded; and the ONE accessor keeps a finding below
 * its floor out of every classified read while a disclosed read labels it.
 */

const active = AUTHORED_GAP_DEFINITIONS.filter((d) => d.isActive)
const operatorsOf = (logic: unknown): string[] => {
    const l = logic as { rules?: unknown }
    const rules: unknown[] = Array.isArray(l?.rules) ? (l.rules as unknown[]) : [logic]
    return rules.map((r) => String((r as any)?.operator ?? (r as any)?.type ?? "")).filter(Boolean)
}

describe("every active rule declares, or derives, an evidence floor", () => {
    it("enumerates the catalogue and resolves a floor for every active definition", () => {
        expect(active.length).toBeGreaterThan(40)
        for (const d of active) {
            const floor = evidenceFloorFor(d)
            expect(DOCUMENT_EVIDENCE_STATES, `${d.slug}: ${floor}`).toContain(floor)
            expect(EVIDENCE_FLOOR_BY_SLUG[d.slug]).toBe(floor)
        }
    })

    it("a rule that fires on silence asks for policy_silent; every other rule asks the document", () => {
        const undeclared: string[] = []
        for (const d of active) {
            const ops = operatorsOf(d.detectionLogic)
            const silenceOnly = ops.length > 0 && ops.every((o) => o === "missing" || o === "all_missing")
            const expected = silenceOnly ? "policy_silent" : "policy_verified"
            if (!d.evidenceFloor && evidenceFloorFor(d) !== expected) undeclared.push(`${d.slug}: ${evidenceFloorFor(d)} (expected ${expected})`)
        }
        expect(undeclared).toEqual([])
        // Both kinds exist in the catalogue — the derivation is not vacuous.
        expect(Object.values(EVIDENCE_FLOOR_BY_SLUG)).toContain("policy_silent")
        expect(Object.values(EVIDENCE_FLOOR_BY_SLUG)).toContain("policy_verified")
    })

    it("a silence rule never says «not covered» — it asks whether a value was recorded (CLAUDE.md, the missing operator)", () => {
        const silent = active.filter((d) => EVIDENCE_FLOOR_BY_SLUG[d.slug] === "policy_silent")
        expect(silent.length).toBeGreaterThan(5)
        const overclaims = silent
            .filter((d) => /δεν καλύπτ|not covered|no cover\b|excluded/i.test(`${d.title} ${d.description}`))
            .map((d) => d.slug)
        expect(overclaims, `silence rules worded as absence of cover: ${overclaims.join(", ")}`).toEqual([])
    })

    it("every path a verified-floor rule reads is a citation field, so the floor can be met at all", () => {
        for (const d of active) {
            if (EVIDENCE_FLOOR_BY_SLUG[d.slug] !== "policy_verified") continue
            expect(fieldsReadByDetectionLogic(d.detectionLogic).length, d.slug).toBeGreaterThan(0)
        }
    })
})

describe("the verdict for a stored row", () => {
    const verified = { _evidence: { "property.earthquakeCoverageIncluded": "policy_verified", lowest: "policy_verified" } }
    const asserted = { _evidence: { "property.earthquakeCoverageIncluded": "policy_asserted", lowest: "policy_asserted" } }
    const silent = { _evidence: { x: "policy_silent", lowest: "policy_silent" } }
    const legacy = { "property.earthquakeCoverageIncluded": false }

    it("meets the floor → gap; asserted under a verified floor → review; silent under a verified floor → not_recorded", () => {
        expect(evidenceVerdictFor(CLASSIFIED_VERIFIED_SLUG, verified)).toBe("gap")
        expect(evidenceVerdictFor(CLASSIFIED_VERIFIED_SLUG, asserted)).toBe("review")
        expect(evidenceVerdictFor(CLASSIFIED_VERIFIED_SLUG, silent)).toBe("not_recorded")
    })

    it("a silence rule is a gap on silence — that is what it asks", () => {
        const slug = Object.entries(EVIDENCE_FLOOR_BY_SLUG).find(([, f]) => f === "policy_silent")![0]
        expect(evidenceVerdictFor(slug, silent)).toBe("gap")
        expect(evidenceVerdictFor(slug, asserted)).toBe("gap")
    })

    it("a row written before evidence was recorded is asserted, not grandfathered (HANDOFF P-H3)", () => {
        expect(lowestEvidenceOf(legacy)).toBe("policy_asserted")
        expect(lowestEvidenceOf(null)).toBe("policy_asserted")
        expect(evidenceVerdictFor(CLASSIFIED_VERIFIED_SLUG, legacy)).toBe("review")
    })

    it("an unknown slug gets the strictest floor; the kebab form of a known slug resolves", () => {
        expect(evidenceFloorForSlug("nobody_authored_this")).toBe("policy_verified")
        expect(evidenceFloorForSlug(null)).toBe("policy_verified")
        const [snake, floor] = Object.entries(EVIDENCE_FLOOR_BY_SLUG)[0]
        expect(evidenceFloorForSlug(snake.replace(/_/g, "-"))).toBe(floor)
    })

    it("probe — the derivation reads every rule shape", () => {
        expect(defaultEvidenceFloor({ rules: [{ type: "acord_field_check", operator: "is_false" }] })).toBe("policy_verified")
        expect(defaultEvidenceFloor({ rules: [{ type: "acord_field_check", operator: "missing" }] })).toBe("policy_silent")
        expect(defaultEvidenceFloor({ rules: [{ type: "acord_field_check", operator: "missing" }, { type: "acord_field_check", operator: "is_false" }] })).toBe("policy_verified")
        expect(defaultEvidenceFloor({ type: "date_within_days", field: "x" })).toBe("policy_verified")
        expect(defaultEvidenceFloor({ check: "prose" })).toBe("policy_verified")
        expect(evidenceFloorFor({ detectionLogic: { rules: [{ operator: "is_false" }] }, evidenceFloor: "policy_silent" })).toBe("policy_silent")
    })
})

describe("the ONE accessor applies the verdict", () => {
    const rows = [
        { id: "a", definition: { slug: CLASSIFIED_VERIFIED_SLUG }, ruleInputs: { _evidence: { lowest: "policy_verified" } }, detectedAt: new Date("2026-09-01") },
        { id: "b", definition: { slug: CLASSIFIED_VERIFIED_SLUG }, ruleInputs: { _evidence: { lowest: "policy_asserted" } }, detectedAt: new Date("2026-09-02") },
        { id: "c", definition: { slug: CLASSIFIED_VERIFIED_SLUG }, ruleInputs: { "property.earthquakeCoverageIncluded": false }, detectedAt: new Date("2026-09-03") },
    ]

    it("classified keeps only rows that meet their floor; disclosed returns all, each labelled", async () => {
        findMany.mockResolvedValueOnce(rows)
        const classified = await readLiveGapRows({ scope: "classified", where: { policyId: "p1" } })
        expect(classified.map((r) => r.id)).toEqual(["a"])
        findMany.mockResolvedValueOnce(rows)
        const disclosed = await readLiveGapRows({ scope: "disclosed", where: { policyId: "p1" } })
        expect(disclosed.map((r) => [r.id, r.evidence])).toEqual([["a", "gap"], ["b", "review"], ["c", "review"]])
    })

    it("a count over a classified scope counts only confirmed findings, and asks for ruleInputs", async () => {
        findMany.mockResolvedValueOnce(rows)
        expect(await countLiveGapRows({ scope: "classified", where: { policyId: "p1" } })).toBe(1)
        const args = findMany.mock.calls.at(-1)![0] as any
        expect(args.select.ruleInputs).toBe(true)
        expect(args.select.definition.select.slug).toBe(true)
    })
})
