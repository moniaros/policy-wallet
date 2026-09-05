import { beforeEach, describe, expect, it, vi } from "vitest"

const dbMock = vi.hoisted(() => ({
    gapDefinition: { findMany: vi.fn() },
}))
vi.mock("@/lib/db", () => ({ db: dbMock }))

import {
    planAttemptedRules,
    writeRuleDecidedGaps,
    SUPERSEDED_GAP_STATUS,
} from "@/lib/gaps/gap-instance-writer"
import { GAP_ENGINE_VERSION } from "@/lib/gap-detection"
import { fingerprintGapDefinitions } from "@/lib/gaps/catalogue-version"
import { AUTHORED_GAP_DEFINITIONS } from "@/lib/gaps/authored-catalogue"

/**
 * The writer's semantics (B0.1 / B0.2), asserted on a transaction double:
 *   - every row it writes carries the run, the branch and the catalogue version;
 *   - a rule that fires, resolves and fires again is TWO rows — the first is
 *     superseded with its prior status kept, never updated back to open;
 *   - the attempted-rule plan is recorded from the catalogue before any
 *     evaluation, so it survives a run that later fails.
 */
function txDouble(live: Array<{ id: string; status: string }>) {
    return {
        gapInstance: {
            findMany: vi.fn().mockResolvedValue(live),
            updateMany: vi.fn().mockImplementation(async ({ where }: any) => ({ count: where.id.in.length })),
            createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
    }
}

const decided = {
    gapDefinitionId: "def-glass",
    severity: "medium",
    ruleId: "acord_deterministic",
    ruleInputs: { "vehicle.glassBreakage": false },
    aiExplanation: "en",
    aiExplanationEl: "el",
    aiSuggestion: null,
    aiSuggestionEl: null,
}

describe("writeRuleDecidedGaps", () => {
    it("writes rows attributed to the run, the branch and the catalogue version", async () => {
        const tx = txDouble([])
        const now = new Date("2026-09-05T10:00:00.000Z")
        const result = await writeRuleDecidedGaps(tx as any, {
            policyId: "pol-1",
            runId: "run-1",
            lineOfBusiness: "motor",
            catalogueVersion: "2df9d0fd4b581caa",
            decided: [decided],
            now,
        })
        expect(result).toEqual({ superseded: 0, written: 1 })
        expect(tx.gapInstance.updateMany).not.toHaveBeenCalled()
        const [row] = tx.gapInstance.createMany.mock.calls[0][0].data
        expect(row).toMatchObject({
            policyId: "pol-1",
            analysisRunId: "run-1",
            lineOfBusiness: "motor",
            catalogueVersion: "2df9d0fd4b581caa",
            engineVersion: GAP_ENGINE_VERSION,
            status: "open",
            detectedAt: now,
            ruleId: "acord_deterministic",
        })
    })

    it("fires → resolves → fires again is two rows: the first superseded with its prior status, never reactivated", async () => {
        // Run 2 finds the row run 1 wrote, since resolved by the customer.
        const tx = txDouble([{ id: "row-run1", status: "resolved" }])
        const now = new Date("2026-10-05T10:00:00.000Z")
        const result = await writeRuleDecidedGaps(tx as any, {
            policyId: "pol-1",
            runId: "run-2",
            lineOfBusiness: "motor",
            catalogueVersion: "2df9d0fd4b581caa",
            decided: [decided],
            now,
        })
        expect(result).toEqual({ superseded: 1, written: 1 })
        expect(tx.gapInstance.updateMany).toHaveBeenCalledTimes(1)
        expect(tx.gapInstance.updateMany.mock.calls[0][0]).toEqual({
            where: { id: { in: ["row-run1"] } },
            data: {
                supersededAt: now,
                supersededByRunId: "run-2",
                priorStatus: "resolved",
                status: SUPERSEDED_GAP_STATUS,
            },
        })
        // The new finding is a NEW row for run 2 — createMany, not an update to "open".
        const [row] = tx.gapInstance.createMany.mock.calls[0][0].data
        expect(row.analysisRunId).toBe("run-2")
        expect(row.status).toBe("open")
        const updates = tx.gapInstance.updateMany.mock.calls.map((c: any[]) => c[0].data.status)
        expect(updates).not.toContain("open")
        expect(updates).not.toContain("detected")
    })

    it("keeps each prior status on the rows it belonged to", async () => {
        const tx = txDouble([
            { id: "a", status: "open" },
            { id: "b", status: "dismissed" },
            { id: "c", status: "open" },
        ])
        await writeRuleDecidedGaps(tx as any, {
            policyId: "pol-1",
            runId: "run-3",
            lineOfBusiness: "home",
            catalogueVersion: "x",
            decided: [],
        })
        const groups = tx.gapInstance.updateMany.mock.calls.map((c: any[]) => [c[0].where.id.in, c[0].data.priorStatus])
        expect(groups).toEqual(
            expect.arrayContaining([
                [["a", "c"], "open"],
                [["b"], "dismissed"],
            ])
        )
        expect(tx.gapInstance.createMany).not.toHaveBeenCalled()
    })

    it("writes one row per definition even if the decision list repeats one", async () => {
        const tx = txDouble([])
        const result = await writeRuleDecidedGaps(tx as any, {
            policyId: "pol-1",
            runId: "run-4",
            lineOfBusiness: "motor",
            catalogueVersion: "x",
            decided: [decided, { ...decided, severity: "low" }],
        })
        expect(result.written).toBe(1)
    })
})

describe("planAttemptedRules", () => {
    beforeEach(() => {
        dbMock.gapDefinition.findMany.mockReset()
    })

    it("records the branch's evaluable rules and the catalogue version before evaluation", async () => {
        const rows = AUTHORED_GAP_DEFINITIONS.map((d) => ({
            slug: d.slug,
            lineOfBusiness: d.lineOfBusiness,
            severity: d.severity,
            defaultSeverity: d.defaultSeverity,
            ruleId: d.ruleId,
            detectionLogic: d.detectionLogic,
        }))
        // Plus one active definition with no evaluable rule — a prompt, not a rule.
        rows.push({
            slug: "prompt_only",
            lineOfBusiness: "motor",
            severity: "medium",
            defaultSeverity: "medium",
            ruleId: "prompt",
            detectionLogic: { check: "Does the policy cover X?" } as any,
        })
        dbMock.gapDefinition.findMany.mockResolvedValue(rows)

        const plan = await planAttemptedRules("motor")
        expect(plan.phase).toBe("planned")
        expect(plan.lineOfBusiness).toBe("motor")
        expect(plan.engineVersion).toBe(GAP_ENGINE_VERSION)
        expect(plan.catalogueVersion).toBe(fingerprintGapDefinitions(rows))
        expect(plan.catalogueVersion).toMatch(/^[0-9a-f]{16}$/)
        expect(plan.slugs).toEqual([
            "green_card_expiring",
            "insured_value_above_declared",
            "missing_accident_declaration_phone",
            "no_glass_breakage_cover",
            "no_own_damage_cover",
            "no_roadside_assistance",
        ])
        expect(plan.slugs).not.toContain("prompt_only")
        expect(dbMock.gapDefinition.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { isActive: true } })
        )
    })

    it("a branch with no authored rules plans an empty denominator, not a missing one", async () => {
        dbMock.gapDefinition.findMany.mockResolvedValue([])
        const plan = await planAttemptedRules("renters")
        expect(plan.slugs).toEqual([])
        expect(plan.lineOfBusiness).toBe("renters")
        expect(plan.catalogueVersion).toMatch(/^[0-9a-f]{16}$/)
    })
})
