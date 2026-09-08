import { describe, expect, it } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import path from "node:path"

import { NOTIFICATION_EVENTS, type RecipientKind } from "@/lib/notifications/registry"

/**
 * An effect on someone's record leaves a trace on THEIR side — PW-BRIDGE-01
 * Queue B, tier 1.
 *
 * The interaction ledger (`docs/bridge/INTERACTIONS.md`) found seven paths by
 * which one person changed what another person holds, or can see, while the
 * affected party was told nothing: a share revoked, a relationship ended from
 * either side, a customer moved to a different advisor, an agent confirming
 * (and thereby overwriting) the extracted values on someone's policy, a branded
 * report produced about it, and the owner's own edit or deletion of a policy
 * someone else could see. Each one is legitimate; none of them was visible.
 *
 * WHAT THIS GUARDS, and why the shape is what it is:
 *
 *  (a) The UNIVERSE is read from `docs/bridge/QUEUES.md` — the tier-1 row of
 *      Queue B — not from the table below. Adding an eighth invisible
 *      interaction to the ledger therefore fails this test until it is wired,
 *      which is the whole point: a guard scoped to a hand-written list guards
 *      that list, not the invariant.
 *  (b) Each interaction names the file and the function that causes the effect,
 *      and the event that must be emitted INSIDE that function's body (brace
 *      matched — an emit elsewhere in a 1,700-line actions file proves nothing).
 *  (c) The event must be declared `live` in the registry and must list the
 *      affected party among its `recipients`, so the declaration and the code
 *      cannot drift apart — the mismatch class the ledger filed as I-09.
 *
 * It deliberately does NOT assert the copy: wording is reviewed by people, and
 * a guard that pins sentences turns every editorial fix into a test failure.
 */

const ROOT = process.cwd()
const QUEUES = "docs/bridge/QUEUES.md"

interface Interaction {
    /** Ledger id, as it appears in Queue B's tier-1 row. */
    id: string
    file: string
    /** The function whose body must carry the emit. */
    fn: string
    event: string
    /** Who is told — must be among the event's declared recipients. */
    affected: RecipientKind
    why: string
}

/**
 * One entry per tier-1 interaction. `id` is checked against the ledger, so this
 * table cannot silently fall behind it.
 */
const INTERACTIONS: Interaction[] = [
    {
        id: "I-04",
        file: "app/(protected)/wallet/actions.ts",
        fn: "revokeShare",
        event: "policy_share_revoked",
        affected: "counterparty",
        why: "The advisor loses sight of the policy; it simply vanished from their book.",
    },
    {
        id: "I-05",
        file: "app/(protected)/agent/relationship-actions.ts",
        fn: "terminateRelationship",
        event: "advisor_relationship_ended",
        affected: "advisor",
        why: "The customer disconnects; the advisor is told nothing. Shared function — the same emit covers I-06.",
    },
    {
        id: "I-06",
        file: "app/(protected)/agent/relationship-actions.ts",
        fn: "terminateRelationship",
        event: "advisor_relationship_ended",
        affected: "owner",
        why: "The agent ends it; the advisor vanishes from the customer's /agent with no message.",
    },
    {
        id: "I-07",
        file: "lib/services/team.service.ts",
        fn: "transferCustomer",
        event: "customer_transferred",
        affected: "owner",
        why: "Both agents were notified; the person whose policies a new human can now see was not.",
    },
    {
        id: "I-08",
        file: "app/(protected)/wallet/actions.ts",
        fn: "confirmPolicyReview",
        event: "policy_details_confirmed",
        affected: "owner",
        why: "An agent's confirmation overwrites the owner's columns and clears the «unverified» badge.",
    },
    {
        id: "I-17",
        file: "app/api/v1/agent/policies/[id]/branded-report/route.ts",
        fn: "*",
        event: "branded_report_generated",
        affected: "owner",
        why: "A document about their cover exists in someone else's hands, including under-review findings. Whole-file scope: the route is wrapped in withApiGuard and has no named handler.",
    },
    {
        id: "I-22",
        file: "app/(protected)/wallet/actions.ts",
        fn: "deletePolicy",
        event: "policy_removed",
        affected: "advisor",
        why: "The owner deletes a shared policy; it leaves the advisor's book unexplained.",
    },
]

/** Strip comments so a mention inside prose never counts as wiring. */
function strip(src: string): string {
    return src
        .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
        .replace(/(^|[^:\\])\/\/[^\n]*/g, (m, p) => p + " ".repeat(m.length - p.length))
}

/** Skip a parameter list, so a default value like `edits = {}` is not mistaken for the body. */
function afterParams(src: string, from: number): number {
    // A pattern may already have consumed the opening paren (`function f(`), so
    // look one character back before searching forward.
    const open = src[from - 1] === "(" ? from - 1 : src.indexOf("(", from)
    if (open < 0 || open > from + 40) return from
    let depth = 0
    for (let i = open; i < src.length; i++) {
        if (src[i] === "(") depth++
        else if (src[i] === ")") {
            depth--
            if (depth === 0) return i + 1
        }
    }
    return from
}

/** The balanced `{ … }` that begins at or after `from`, or null. */
function bodyAfter(src: string, from: number): string | null {
    const open = src.indexOf("{", from)
    if (open < 0) return null
    let depth = 0
    for (let i = open; i < src.length; i++) {
        const c = src[i]
        if (c === '"' || c === "'" || c === "`") {
            const q = c
            i++
            while (i < src.length && src[i] !== q) {
                if (src[i] === "\\") i++
                i++
            }
            continue
        }
        if (c === "{") depth++
        else if (c === "}") {
            depth--
            if (depth === 0) return src.slice(open, i + 1)
        }
    }
    return null
}

/**
 * The body of `fn`, however it is declared (function, const arrow, method).
 *
 * `"*"` means the whole file: a route module wrapped in `withApiGuard` has no
 * named handler to anchor on, and a file whose only job is that one route is a
 * tight enough scope for the rule.
 */
export function functionBody(src: string, fn: string): string | null {
    const code = strip(src)
    if (fn === "*") return code
    const patterns = [
        new RegExp(`\\bfunction\\s+${fn}\\s*\\(`),
        new RegExp(`\\bexport\\s+const\\s+${fn}\\s*=`),
        new RegExp(`\\b(?:const|let|var)\\s+${fn}\\s*[=:]`),
        new RegExp(`\\b${fn}\\s*[:=]\\s*(?:async\\s*)?\\(`),
    ]
    for (const re of patterns) {
        const m = re.exec(code)
        if (m) {
            const body = bodyAfter(code, afterParams(code, m.index + m[0].length))
            if (body) return body
        }
    }
    return null
}

/** Does this body emit `event`, by any sanctioned entry point? */
export function emitsEvent(body: string, event: string): boolean {
    return new RegExp(`(?:event|eventType):\\s*["']${event}["']`).test(body)
}

/** Tier-1 interaction ids, read from the queue ledger rather than assumed. */
export function tierOneIdsFromLedger(doc = readFileSync(path.join(ROOT, QUEUES), "utf8")): string[] {
    const row = doc.split("\n").find((l) => /^\|\s*1\s*—/.test(l))
    if (!row) return []
    return [...new Set([...row.matchAll(/\bI-\d{2}\b/g)].map((m) => m[0]))].sort()
}

describe("an effect on someone's record is told to them (PW-BRIDGE-01 Queue B, tier 1)", () => {
    it("covers exactly the tier-1 interactions the queue ledger names", () => {
        const fromLedger = tierOneIdsFromLedger()
        expect(fromLedger.length, "Queue B's tier-1 row was not found in the ledger").toBeGreaterThan(4)
        const covered = [...new Set(INTERACTIONS.map((i) => i.id))].sort()
        expect(
            covered,
            "the ledger's tier-1 row and this table disagree — wire the new interaction, or move the row out of tier 1 with a reason"
        ).toEqual(fromLedger)
    })

    it.each(INTERACTIONS.map((i) => [`${i.id} ${i.fn}`, i] as const))(
        "%s emits its event inside the function that causes the effect",
        (_name, interaction) => {
            const full = path.join(ROOT, interaction.file)
            expect(existsSync(full), `${interaction.file} does not exist`).toBe(true)
            const body = functionBody(readFileSync(full, "utf8"), interaction.fn)
            expect(body, `${interaction.fn} not found in ${interaction.file}`).not.toBeNull()
            expect(
                emitsEvent(body!, interaction.event),
                `${interaction.id}: ${interaction.why}\nEmit "${interaction.event}" inside ${interaction.fn} (${interaction.file}).`
            ).toBe(true)
        }
    )

    it.each(INTERACTIONS.map((i) => [`${i.id} ${i.event}`, i] as const))(
        "%s is declared live, and declares the affected party as a recipient",
        (_name, interaction) => {
            const def = NOTIFICATION_EVENTS[interaction.event]
            expect(def, `${interaction.event} is not in the registry`).toBeTruthy()
            expect(def.status, `${interaction.event} must be live`).toBe("live")
            expect(
                def.recipients,
                `${interaction.event} must list "${interaction.affected}" — the code tells them, so the declaration has to say so`
            ).toContain(interaction.affected)
            expect(def.copy, `${interaction.event} needs customer-facing copy`).toBeTruthy()
        }
    )

    it("is proven red on an action that changes a record and tells nobody", () => {
        const probe = readFileSync(path.join(ROOT, "tests/fixtures/guard-probes/effect-not-told.ts.txt"), "utf8")

        const silentRevoke = functionBody(probe, "revokeShare")
        expect(silentRevoke).not.toBeNull()
        expect(emitsEvent(silentRevoke!, "policy_share_revoked")).toBe(false)

        const silentConfirm = functionBody(probe, "confirmPolicyReview")
        expect(silentConfirm).not.toBeNull()
        expect(emitsEvent(silentConfirm!, "policy_details_confirmed")).toBe(false)

        // ...and green on the same action once it tells the affected party.
        const told = functionBody(probe, "revokeShareTold")
        expect(told).not.toBeNull()
        expect(emitsEvent(told!, "policy_share_revoked")).toBe(true)
    })
})
