import { describe, it, expect, vi, beforeEach } from "vitest"
import {
    defaultSettingsForRoles,
    isQuietHour,
    localHour,
    nextAllowedTime,
    type DeliverySettings,
} from "@/lib/notifications/orchestrator"
import { NOTIFICATION_EVENTS } from "@/lib/notifications/registry"
import { IMPLEMENTED_CHANNELS } from "@/lib/notifications/channels"

const settings = (patch: Partial<DeliverySettings> = {}): DeliverySettings => ({
    timezone: "Europe/Athens",
    quietHoursEnabled: true,
    quietHoursStart: 22,
    quietHoursEnd: 8,
    maxPerDay: 12,
    digestMode: "immediate",
    ...patch,
})

/**
 * The orchestrator decides WHO, WHEN and WHETHER. These are the rules that stop
 * "when" from quietly becoming "never".
 */
describe("quiet hours", () => {
    it("recognises a window that crosses midnight", () => {
        // 22:00 → 08:00 is the normal case and the one a naive `start <= h < end`
        // gets exactly backwards.
        for (const hour of [22, 23, 0, 3, 7]) {
            expect(isQuietHour(hour, 22, 8), `${hour}:00 should be quiet`).toBe(true)
        }
        for (const hour of [8, 12, 18, 21]) {
            expect(isQuietHour(hour, 22, 8), `${hour}:00 should be loud`).toBe(false)
        }
    })

    it("recognises a window inside one day", () => {
        expect(isQuietHour(14, 13, 16)).toBe(true)
        expect(isQuietHour(12, 13, 16)).toBe(false)
        expect(isQuietHour(16, 13, 16)).toBe(false)
    })

    it("treats an empty window as no window", () => {
        // start === end is ambiguous — "always" or "never". Reading it as
        // neither is the only answer that cannot silently silence someone.
        expect(isQuietHour(3, 22, 22)).toBe(false)
    })

    it("resolves the recipient's local hour, not the server's", () => {
        // Athens is ahead of UTC, and by a different amount in summer and
        // winter. A fixed offset would put the window an hour wrong for half
        // the year — precisely the season where being woken matters.
        const summer = new Date("2026-07-15T21:30:00Z") // 00:30 Athens (UTC+3)
        const winter = new Date("2026-01-15T21:30:00Z") // 23:30 Athens (UTC+2)
        expect(localHour(summer, "Europe/Athens")).toBe(0)
        expect(localHour(winter, "Europe/Athens")).toBe(23)
    })

    it("falls back rather than throwing on an invalid timezone", () => {
        // Stored user data on a delivery path: it must degrade, not explode.
        const at = new Date("2026-07-15T21:30:00Z")
        expect(() => localHour(at, "Not/AZone")).not.toThrow()
        expect(localHour(at, "Not/AZone")).toBe(21)
    })

    it("defers to the START of the morning, not now-plus-N-hours", () => {
        // Two notifications raised at 23:00 and 03:00 should arrive together
        // when the person wakes, not eight hours after each was raised.
        const late = nextAllowedTime(new Date("2026-01-15T21:30:00Z"), settings()) // 23:30 Athens
        const small = nextAllowedTime(new Date("2026-01-16T01:00:00Z"), settings()) // 03:00 Athens
        expect(late).not.toBeNull()
        expect(small).not.toBeNull()
        expect(localHour(late!, "Europe/Athens")).toBe(8)
        expect(localHour(small!, "Europe/Athens")).toBe(8)
    })

    it("does not defer outside the window, or when switched off", () => {
        const noon = new Date("2026-01-15T10:00:00Z") // 12:00 Athens
        expect(nextAllowedTime(noon, settings())).toBeNull()
        const night = new Date("2026-01-15T21:30:00Z")
        expect(nextAllowedTime(night, settings({ quietHoursEnabled: false }))).toBeNull()
    })

    it("lands on the hour so a deferred batch arrives together", () => {
        const next = nextAllowedTime(new Date("2026-01-15T21:37:00Z"), settings())
        expect(next!.getMinutes()).toBe(0)
        expect(next!.getSeconds()).toBe(0)
    })

    it("still respects quiet hours on the night the clocks go back", () => {
        // Greece ends summer time on the last Sunday of October: at 04:00 EEST
        // the clock returns to 03:00 EET. A notification deferred at 23:00 that
        // night is NINE elapsed hours from 08:00 by the calendar but ten by the
        // clock, so `now + 9h` arrived at 07:00 — inside the window the whole
        // mechanism exists to protect. Once a year, we woke people early.
        const beforeChange = new Date("2026-10-24T20:00:00Z") // 23:00 Athens, EEST
        const next = nextAllowedTime(beforeChange, settings())

        expect(next).not.toBeNull()
        expect(
            localHour(next!, "Europe/Athens"),
            "delivery must land at the recipient's 08:00, whatever the clocks did overnight"
        ).toBe(8)
        expect(isQuietHour(localHour(next!, "Europe/Athens"), 22, 8)).toBe(false)
    })

    it("still respects quiet hours on the night the clocks go forward", () => {
        // The spring change skips 03:00 → 04:00, so the same arithmetic
        // overshoots rather than undershoots.
        const beforeChange = new Date("2026-03-28T21:00:00Z") // 23:00 Athens, EET
        const next = nextAllowedTime(beforeChange, settings())

        expect(next).not.toBeNull()
        expect(localHour(next!, "Europe/Athens")).toBe(8)
    })

    it("never returns a time that is itself inside quiet hours", () => {
        // The invariant, stated once rather than per scenario: whatever the
        // window and whatever the date, the answer is deliverable.
        for (const iso of [
            "2026-01-15T21:30:00Z",
            "2026-06-15T22:10:00Z",
            "2026-10-24T20:00:00Z",
            "2026-10-25T01:30:00Z",
            "2026-03-28T23:45:00Z",
        ]) {
            for (const window of [
                { quietHoursStart: 22, quietHoursEnd: 8 },
                { quietHoursStart: 1, quietHoursEnd: 6 },
                { quietHoursStart: 20, quietHoursEnd: 9 },
            ]) {
                const config = settings(window)
                const next = nextAllowedTime(new Date(iso), config)
                if (!next) continue
                expect(
                    isQuietHour(
                        localHour(next, config.timezone),
                        config.quietHoursStart,
                        config.quietHoursEnd
                    ),
                    `${iso} with ${window.quietHoursStart}→${window.quietHoursEnd} deferred INTO quiet hours`
                ).toBe(false)
            }
        }
    })
})

describe("role-derived defaults", () => {
    it("gives advisors an earlier evening and a higher ceiling", () => {
        const customer = defaultSettingsForRoles("policyholder")
        const advisor = defaultSettingsForRoles("agent")

        // An advisor is being handed WORK; a customer is being told about their
        // own life. A book of clients legitimately generates more than one
        // person's life does.
        expect(advisor.quietHoursStart).toBeLessThan(customer.quietHoursStart)
        expect(advisor.maxPerDay).toBeGreaterThan(customer.maxPerDay)
    })

    it("defaults quiet hours ON for everyone", () => {
        // A push at 03:00 is a reason to uninstall. Nobody should have to
        // discover this setting only after being woken by its absence.
        for (const roles of ["policyholder", "agent", "admin", "", null]) {
            expect(defaultSettingsForRoles(roles).quietHoursEnabled).toBe(true)
        }
    })

    it("uses Athens, not UTC", () => {
        // Greek-market product. UTC would be an hour or two wrong for every user.
        expect(defaultSettingsForRoles("policyholder").timezone).toBe("Europe/Athens")
    })
})

describe("urgency overrides politeness", () => {
    it("every critical or transactional event bypasses quiet hours", () => {
        // The orchestrator exempts these. Asserted on the registry so the set is
        // visible: a payment failure, a credential change and a lapsed policy
        // are what a person WANTS to be woken for.
        const exempt = Object.entries(NOTIFICATION_EVENTS).filter(
            ([, d]) => d.priority === "critical" || d.transactional
        )
        expect(exempt.length).toBeGreaterThan(0)

        for (const key of ["payment_failed", "credential_change", "renewal_overdue"]) {
            const def = NOTIFICATION_EVENTS[key]
            if (!def) continue
            expect(
                def.priority === "critical" || def.transactional,
                `${key} must bypass quiet hours`
            ).toBe(true)
        }
    })

    it("security events are never merely polite", () => {
        for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
            if (def.category !== "security") continue
            expect(def.transactional, `${key} must not be deferrable`).toBe(true)
        }
    })
})

describe("the channel vocabulary is future-ready and honest", () => {
    it("declares every channel the architecture supports", () => {
        // Declared ≠ built. The registry can express "this event would use
        // WhatsApp" before the transport exists, so adding it later is one
        // adapter rather than a change to every event that wants it.
        const declared = new Set(
            Object.values(NOTIFICATION_EVENTS).flatMap((d) => d.channels)
        )
        for (const built of IMPLEMENTED_CHANNELS) {
            expect(declared.has(built), `${built} is built but no event uses it`).toBe(true)
        }
    })

    it("only in-app, email and push are claimed as implemented", () => {
        // The help centre once offered SMS "(Premium only)" — a paid channel
        // that has never existed. This is the list user-facing copy may promise.
        expect([...IMPLEMENTED_CHANNELS].sort()).toEqual(["email", "in_app", "push"])
    })
})

describe("no duplicated notification logic", () => {
    it("only the orchestrator and the shims call emit()", async () => {
        const { globSync } = await import("../helpers/glob")
        const { readFileSync } = await import("node:fs")
        const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

        const offenders: string[] = []
        for (const f of [...globSync("lib/events/**/*.ts")]) {
            const src = strip(readFileSync(f, "utf-8"))
            // The event layer must reach the bus THROUGH the orchestrator, or it
            // would deliver without quiet hours, the daily cap or multi-recipient
            // resolution — a second delivery path with none of the policies.
            if (/\bemit\(\{/.test(src)) offenders.push(f)
        }
        expect(
            offenders,
            `use orchestrate() instead of emit():\n${offenders.join("\n")}`
        ).toEqual([])
    })
})
