import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import { globSync } from "../helpers/glob"

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
const CONSOLE_PAGES = globSync("app/(protected)/admin/automation/**/page.tsx")
const ADMIN_NOTIF_PAGES = globSync("app/(protected)/admin/notifications/**/page.tsx")
const ALL = [...CONSOLE_PAGES, ...ADMIN_NOTIF_PAGES]

/**
 * The console is the surface an operator reaches for when something is wrong.
 * These are the properties that decide whether it helps them or misleads them.
 */
describe("every automation console page is guarded", () => {
    it("checks the admin role and redirects otherwise", () => {
        for (const file of ALL) {
            const src = strip(readFileSync(file, "utf-8"))
            expect(src, `${file} does not check the admin role`).toMatch(/hasAnyRole\([^)]*\["admin"\]\)/)
            expect(src, `${file} does not redirect a non-admin`).toContain("redirect(")
        }
    })

    it("runs on Node, not the edge", () => {
        // Every page reads Prisma directly.
        for (const file of ALL) {
            expect(readFileSync(file, "utf-8"), `${file} is missing the runtime pin`).toContain(
                "export const runtime = 'nodejs'"
            )
        }
    })
})

describe("the console is mobile-first", () => {
    it("never renders three or more columns at phone width", () => {
        // 3 columns at 375px leaves ~105px per cell. The repo's design-system
        // guard enforces this globally; asserted here too because the console
        // is where an operator works from a phone during an incident.
        const offenders: string[] = []
        for (const file of ALL) {
            const src = readFileSync(file, "utf-8")
            for (const match of src.matchAll(/className="[^"]*\bgrid-cols-([3-9]|1[0-2])\b[^"]*"/g)) {
                // A responsive prefix makes it fine.
                if (!/\b(sm|md|lg):grid-cols-/.test(match[0])) offenders.push(`${file}: ${match[0]}`)
            }
        }
        expect(offenders, `unprefixed wide grids:\n${offenders.join("\n")}`).toEqual([])
    })

    it("gives every console page horizontal breathing room on a phone", () => {
        // `p-4 sm:p-6` rather than a flat `p-6`: 24px of padding either side of a
        // 375px screen is 13% of the width spent on nothing.
        for (const file of CONSOLE_PAGES) {
            const src = readFileSync(file, "utf-8")
            expect(src, `${file} should use p-4 sm:p-6`).toMatch(/p-4 sm:p-6/)
        }
    })
})

describe("scheduled jobs are observable", () => {
    const JOB_ROUTES = globSync("app/api/v1/jobs/*/route.ts")

    it("records every run", () => {
        // Without run history the schedules page could only render vercel.json
        // back at the operator — and the audit found two job routes that no cron
        // had ever invoked precisely because nothing would have shown it.
        const unrecorded = JOB_ROUTES.filter(
            (f) => !strip(readFileSync(f, "utf-8")).includes("withJobRun")
        )
        // execute-analysis is the QStash worker, not a schedule: it is invoked
        // per policy, and a "run history" of it would be an upload log.
        const expected = unrecorded.filter((f) => !f.includes("execute-analysis"))
        expect(expected, `these jobs record no run:\n${expected.join("\n")}`).toEqual([])
    })

    it("honours the pause switch and reports it", () => {
        const src = strip(readFileSync("lib/jobs/run-record.ts", "utf-8"))
        // A paused job must RECORD that it was paused. "This did not happen
        // because you paused it" is exactly what an operator needs, and it is
        // invisible if a paused job simply returns.
        expect(src).toMatch(/status:\s*"paused"/)
    })

    it("never lets its own bookkeeping break the job", () => {
        const src = readFileSync("lib/jobs/run-record.ts", "utf-8")
        // `x.y().catch()` is not enough — if the model is missing the member
        // access throws before there is a promise to catch on. Observability
        // must never be load-bearing.
        expect(src).toContain("async function quietly")
        expect(strip(src)).not.toMatch(/db\.job(Schedule|Run)\.\w+\([^)]*\)\s*\.catch/)
    })

    it("distinguishes a manual run from a scheduled one", () => {
        // An operator pressing a button proves the job works, not that the cron
        // fires. Conflating them would hide a dead schedule.
        const src = strip(readFileSync("lib/jobs/run-record.ts", "utf-8"))
        expect(src).toMatch(/trigger.*"cron"/)
        const actions = strip(
            readFileSync("app/(protected)/admin/automation/actions.ts", "utf-8")
        )
        expect(actions).toContain('trigger: "manual"')
    })
})

describe("destructive and surprising actions are constrained", () => {
    const ACTIONS = strip(readFileSync("app/(protected)/admin/automation/actions.ts", "utf-8"))

    it("a cloned template arrives inactive", () => {
        // A copy is almost always about to be translated. Publishing Greek copy
        // to English readers the moment it is cloned is the obvious way for this
        // feature to cause harm.
        expect(ACTIONS).toMatch(/isActive:\s*false/)
    })

    it("cloning cannot target itself", () => {
        expect(ACTIONS).toMatch(/cannot be cloned onto itself/)
    })

    it("only allow-listed jobs can be run from the console", () => {
        // A button for a job whose side-effects assume a daily cadence is a trap.
        expect(ACTIONS).toMatch(/cannot be run from the console/)
    })

    it("every write records an admin action", () => {
        const exported = [...ACTIONS.matchAll(/export async function (\w+)/g)].map((m) => m[1])
        expect(exported.length).toBeGreaterThan(0)
        // Each action's body should reach logAdminAction — the audit trail is
        // not optional on a console that changes what customers receive.
        const logCount = (ACTIONS.match(/logAdminAction\(/g) ?? []).length
        expect(logCount).toBeGreaterThanOrEqual(exported.length)
    })
})

describe("disabling a business event stops reactions, not the record", () => {
    it("the dispatcher skips the decision engine but keeps the event", () => {
        const src = strip(readFileSync("lib/events/dispatcher.ts", "utf-8"))
        expect(src).toContain("businessEventOverride")
        expect(src).toMatch(/skipReason:\s*"event_disabled"/)
        // The event row itself is never deleted or rewritten — the fact
        // happened, and denying it would corrupt the log.
        expect(src).not.toMatch(/businessEvent\.delete/)
    })
})

describe("the console covers the whole surface", () => {
    it("has a page for every area the brief names", () => {
        for (const page of [
            "app/(protected)/admin/automation/page.tsx",
            "app/(protected)/admin/automation/events/page.tsx",
            "app/(protected)/admin/automation/schedules/page.tsx",
            "app/(protected)/admin/automation/queues/page.tsx",
            "app/(protected)/admin/automation/localization/page.tsx",
            "app/(protected)/admin/automation/analytics/page.tsx",
        ]) {
            expect(existsSync(page), `${page} is missing`).toBe(true)
        }
    })

    it("links out to the surfaces that already existed rather than duplicating them", () => {
        // Templates, triggers, history and workflows were built earlier. A
        // console that rebuilt them would be two places to change one rule.
        const home = readFileSync("app/(protected)/admin/automation/page.tsx", "utf-8")
        for (const href of [
            "/admin/notifications/triggers",
            "/admin/notifications/templates",
            "/admin/notifications/history",
            "/admin/notifications/workflows",
            "/admin/ai/prompts",
            "/admin/gaps",
        ]) {
            expect(home, `console home does not link ${href}`).toContain(href)
        }
    })
})
