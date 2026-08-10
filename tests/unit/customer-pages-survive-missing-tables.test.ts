import { describe, it, expect, vi, beforeEach } from "vitest"
import { readFileSync } from "node:fs"
import { globSync } from "glob"

/**
 * A customer-facing page must not depend on a table that might not be there.
 *
 * Two situations make this concrete rather than theoretical:
 *
 * 1. **The deploy window.** Code ships before its migration is applied — the
 *    exact state production is in right now, six migrations behind this branch.
 *    A page that queries a table Prisma knows about and Postgres does not throws
 *    at request time, and the customer gets an error boundary on their account.
 * 2. **Any transient database error at all.** A preference lookup failing should
 *    cost the reader a preference, not the page.
 *
 * The rest of this subsystem already gets this right — `publish()`, `emit()`,
 * `orchestrate()` and `getOpenReview()` are all written never to throw into
 * their caller. `getQuietHours` was the one read that was not, and it sat on the
 * account page: billing, security, data export, all behind one optional lookup.
 */

const NEW_TABLES = [
    "userNotificationSettings",
    "riskReview",
    "businessEvent",
    "businessEventDelivery",
    "businessEventOverride",
    "pushDevice",
    "notificationRuleOverride",
    "notificationTemplate",
    "notificationSetting",
    "jobRun",
    "jobSchedule",
]

/**
 * Admin surfaces are deliberately excluded. An operator seeing the admin error
 * boundary during a deploy window is an acceptable cost; a customer seeing one
 * on their own account is not, and pretending both matter equally would just
 * make this guard too noisy to keep.
 */
const CUSTOMER_FILES = globSync("app/**/*.{ts,tsx}", {
    ignore: ["**/node_modules/**", "**/admin/**", "**/*.test.*"],
})

describe("no customer-facing read depends on a table surviving", () => {
    it("scans a realistic number of files", () => {
        expect(CUSTOMER_FILES.length).toBeGreaterThan(100)
    })

    it("every query against a newly-added table has a fallback", () => {
        const offenders: string[] = []

        for (const file of CUSTOMER_FILES) {
            const src = readFileSync(file, "utf-8")
            for (const table of NEW_TABLES) {
                const pattern = new RegExp(
                    `db\\.${table}\\.(findUnique|findFirst|findMany|count)\\(`,
                    "g"
                )
                for (const match of src.matchAll(pattern)) {
                    // Guarded either by `.catch(` on the call chain, or by the
                    // whole function body being wrapped in try/catch.
                    const after = src.slice(match.index!, match.index! + 400)
                    const before = src.slice(Math.max(0, match.index! - 1200), match.index!)
                    const chained = /\.catch\(/.test(after)
                    const wrapped = (before.match(/\btry\s*\{/g) ?? []).length >
                        (before.match(/\}\s*catch\b/g) ?? []).length
                    if (chained || wrapped) continue

                    const line = src.slice(0, match.index).split("\n").length
                    offenders.push(`${file}:${line}  db.${table}`)
                }
            }
        }

        expect(
            offenders,
            "These read a table added by an unapplied migration, on a customer\n" +
                "surface, with no fallback. Add `.catch(() => null)` or wrap the body:\n" +
                `  ${offenders.join("\n  ")}`
        ).toEqual([])
    })
})

describe("quiet hours degrade to the role default", () => {
    beforeEach(() => vi.resetModules())

    it("returns the default window when the settings table cannot be read", async () => {
        vi.doMock("@/lib/db", () => ({
            db: {
                userNotificationSettings: {
                    // What Postgres says when the migration has not been applied.
                    findUnique: vi.fn(async () => {
                        throw new Error('relation "user_notification_settings" does not exist')
                    }),
                },
                user: { findUnique: vi.fn(async () => ({ roles: "policyholder" })) },
            },
        }))
        vi.doMock("@/lib/auth-helpers", () => ({
            getAuthenticatedUserOrNull: async () => ({ dbUser: { id: "u1", roles: "policyholder" } }),
        }))
        vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }))

        const { getQuietHours } = await import("@/app/(protected)/account/quiet-hours-actions")
        const state = await getQuietHours()

        expect(state, "the page got nothing at all").not.toBeNull()
        // On by default: a push at 03:00 is a reason to uninstall, and a failed
        // read must never be read as "this customer opted out of quiet hours".
        expect(state!.enabled).toBe(true)
        expect(state!.timezone).toBe("Europe/Athens")
        expect(state!.start).toBeGreaterThanOrEqual(0)
        expect(state!.end).toBeLessThanOrEqual(23)
    })

    it("still prefers what the customer actually chose", async () => {
        vi.doMock("@/lib/db", () => ({
            db: {
                userNotificationSettings: {
                    findUnique: vi.fn(async () => ({
                        quietHoursEnabled: false,
                        quietHoursStart: 1,
                        quietHoursEnd: 6,
                        timezone: "Europe/Berlin",
                    })),
                },
                user: { findUnique: vi.fn(async () => ({ roles: "policyholder" })) },
            },
        }))
        vi.doMock("@/lib/auth-helpers", () => ({
            getAuthenticatedUserOrNull: async () => ({ dbUser: { id: "u1", roles: "policyholder" } }),
        }))
        vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }))

        const { getQuietHours } = await import("@/app/(protected)/account/quiet-hours-actions")
        const state = await getQuietHours()

        expect(state).toEqual({
            enabled: false,
            start: 1,
            end: 6,
            timezone: "Europe/Berlin",
        })
    })
})
