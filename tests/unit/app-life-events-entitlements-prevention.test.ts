import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { LIFE_EVENT_CHIPS, LIFE_EVENTS_OFF_CHIPS } from "@/lib/app/lifeEvents"
import { LIFE_EVENT_REGISTRY } from "@/lib/services/life-events/registry"
import { checksNotInPlan, tierThatRuns, planTierName } from "@/lib/app/entitlements"
import { BUSINESS_EVENTS, AGGREGATES } from "@/lib/events/catalog"

function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
        if (name === "node_modules" || name === ".next" || name.startsWith(".")) continue
        const p = join(dir, name)
        if (statSync(p).isDirectory()) walk(p, out)
        else if (/\.(ts|tsx|mjs|js)$/.test(name)) out.push(p)
    }
    return out
}

describe("life-event chips (A-15)", () => {
    it("ten chips, in the brief's order, every id a registry event", () => {
        const ids = LIFE_EVENT_CHIPS.map((c) => c.id)
        expect(ids).toEqual(["marriage", "birth", "property_purchase", "vehicle_purchase", "job_change", "mortgage", "divorce", "relocation", "retirement", "other"])
        const registry = new Set(LIFE_EVENT_REGISTRY.map((e) => e.id))
        for (const id of ids) expect(registry.has(id), `${id} missing from the registry`).toBe(true)
    })
    it("special-category events stay off the chips", () => {
        for (const off of LIFE_EVENTS_OFF_CHIPS) expect(LIFE_EVENT_CHIPS.map((c) => c.id as string)).not.toContain(off)
    })
})

describe("entitlements — re-exported, never re-stated", () => {
    it("gap detection is not in Free or Plus and is in Family (code key pro)", () => {
        expect(checksNotInPlan("free")).toContain("gap_detection")
        expect(checksNotInPlan("plus")).toContain("gap_detection")
        expect(checksNotInPlan("pro")).toEqual([])
        expect(tierThatRuns("gap_detection")).toBe("pro")
    })
    it("the display name comes from the single source", () => {
        expect(planTierName("pro", "el")).toBe("Family")
    })
})

describe("prevention readiness — types only, nothing rendered or emitted", () => {
    const root = process.cwd()
    it("the ledger aggregates and planned events are declared in the catalogue", () => {
        for (const a of ["finding", "benefit", "question", "household", "advisor"]) expect(AGGREGATES).toContain(a)
        for (const n of ["finding.shown", "benefit.surfaced", "question.answered", "advisor.help_requested", "household.person_added"]) {
            expect(BUSINESS_EVENTS[n], `${n} missing`).toBeTruthy()
        }
    })
    it("lib/app/prevention is imported by nothing outside lib/app", () => {
        const files = [...walk(join(root, "app")), ...walk(join(root, "components")), ...walk(join(root, "lib")), ...walk(join(root, "src"))]
        const offenders = files.filter((f) => !f.includes(`${join("lib", "app")}${require("node:path").sep}`) && /from\s+["'][^"']*lib\/app\/prevention["']/.test(readFileSync(f, "utf-8")))
        expect(offenders).toEqual([])
    })
    it("no prevention.* analytics event has a call site", () => {
        const files = [...walk(join(root, "app")), ...walk(join(root, "components")), ...walk(join(root, "lib")), ...walk(join(root, "src"))]
        const offenders = files.filter((f) => {
            if (f.endsWith(join("lib", "app", "prevention.ts"))) return false
            const src = readFileSync(f, "utf-8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
            return /["'`]prevention\.(opportunity_shown|action_started|action_completed|service_connected)["'`]/.test(src)
        })
        expect(offenders).toEqual([])
    })
    it("no prevention table exists", () => {
        const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf-8")
        expect(schema).not.toMatch(/model\s+Prevention\w*\s*\{/)
    })
})
