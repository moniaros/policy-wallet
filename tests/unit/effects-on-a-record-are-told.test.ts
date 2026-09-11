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

/** Every `emit({ … })` / `emitToMany(x, { … })` call in a body, as source text. */
export function emitCalls(body: string): string[] {
    const out: string[] = []
    const re = /\b(?:emit|emitToMany|orchestrate|sendNotification|notifyCounterparty)\s*\(/g
    let m: RegExpExecArray | null
    while ((m = re.exec(body))) {
        const call = bodyAfter(body, m.index + m[0].length - 1)
        if (call) out.push(call)
    }
    return out
}

/** The emit call in `body` that sends `event`, or null. */
export function emitCallFor(body: string, event: string): string | null {
    return emitCalls(body).find((c) => new RegExp(`(?:event|eventType):\\s*["']${event}["']`).test(c)) ?? null
}

/** Interaction ids on one tier row of Queue B, read from the ledger rather than assumed. */
export function tierIdsFromLedger(tier: number, doc = readFileSync(path.join(ROOT, QUEUES), "utf8")): string[] {
    const row = doc.split("\n").find((l) => new RegExp(`^\\|\\s*${tier}\\s*—`).test(l))
    if (!row) return []
    return [...new Set([...row.matchAll(/\bI-\d{2}\b/g)].map((m) => m[0]))].sort()
}

/** Tier-1 interaction ids. */
export function tierOneIdsFromLedger(doc = readFileSync(path.join(ROOT, QUEUES), "utf8")): string[] {
    return tierIdsFromLedger(1, doc)
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

/**
 * Tiers 3 and 4 of the same queue: one truth per fact, and a SPECIFIED state
 * when half an interaction fails.
 *
 * Each id on those ledger rows is either checked here or listed as closed
 * elsewhere with the reason — the union has to equal the ledger, so an id
 * cannot quietly go unaddressed.
 */
const TIER_3_4_CLOSED_ELSEWHERE: Record<string, string> = {
    "I-08": "Queue A row A-06 (ACT done 2026-09-06): record status and the «unverified» badge now tell the same story, and the customer-facing half is I-08 in tier 1, checked above.",
    "I-13": "Already the reference shape (tier 6): the questionnaire task carries `creatorUserId` and renders the creator's name; its emit follows the task create, which is the same after-the-write ordering every interaction here uses.",
}

describe("tiers 3 and 4: one truth per fact, and a specified half-failure state", () => {
    const flagFile = "app/(protected)/wallet/actions.ts"
    const adminFile = "app/(protected)/admin/actions.ts"

    it("addresses every id the ledger puts on the tier-3 and tier-4 rows", () => {
        const ids = [...new Set([...tierIdsFromLedger(3), ...tierIdsFromLedger(4)])].sort()
        expect(ids.length, "tier 3/4 rows not found in the ledger").toBeGreaterThan(2)
        const checked = ["I-03", "I-09"]
        const accounted = [...new Set([...checked, ...Object.keys(TIER_3_4_CLOSED_ELSEWHERE)])].sort()
        expect(
            accounted,
            "an id on tier 3 or 4 is neither checked here nor recorded as closed elsewhere with a reason"
        ).toEqual(ids)
    })

    it("I-09: the flag tells the OWNER, and the triage row goes to whoever raised it", () => {
        const body = functionBody(readFileSync(path.join(ROOT, flagFile), "utf8"), "flagPolicyExtraction")
        expect(body, "flagPolicyExtraction not found").not.toBeNull()

        const customerFacing = emitCallFor(body!, "extraction_flagged")
        expect(customerFacing, "extraction_flagged is not emitted here").not.toBeNull()
        expect(
            /userId:\s*policy\.ownerUserId/.test(customerFacing!),
            "extraction_flagged must reach the policy's OWNER — the registry declares `owner`, the copy speaks to them, and they are the only person who can resolve a flagged reading"
        ).toBe(true)

        const triage = emitCallFor(body!, "extraction_flag_raised")
        expect(triage, "the triage event is not emitted here").not.toBeNull()
        expect(
            /userId:\s*dbUser\.id/.test(triage!),
            "the triage row belongs to the person who raised the flag — the admin queue reads it as «who flagged this»"
        ).toBe(true)
    })

    it("I-09: the admin flag queue reads the triage event, never the customer-facing one", () => {
        const src = readFileSync(path.join(ROOT, adminFile), "utf8")
        expect(src).toMatch(/eventType:\s*"extraction_flag_raised"/)
        expect(
            /eventType:\s*"extraction_flagged"/.test(src),
            "reading the customer-facing event here would list the CUSTOMER as the flagger"
        ).toBe(false)
    })

    it("I-03: a share creates the grant and the relationship in ONE transaction", () => {
        const body = functionBody(readFileSync(path.join(ROOT, flagFile), "utf8"), "sharePolicy")
        expect(body, "sharePolicy not found").not.toBeNull()
        // Brace-matched, not regex-bounded: a non-greedy `[\s\S]*?\}\)` stops at
        // the first nested `})`, which is inside the grant create.
        const at = body!.indexOf("$transaction(")
        expect(at, "sharePolicy must wrap the grant and the relationship in one $transaction").toBeGreaterThan(-1)
        const tx = bodyAfter(body!, at)
        expect(tx, "could not read the transaction body").not.toBeNull()
        expect(
            /tx\.accessGrant\.create/.test(tx!),
            "the grant must be created inside the transaction"
        ).toBe(true)
        expect(
            /tx\.customerRelationship\.create/.test(tx!),
            "the relationship must be created inside the same transaction — computePolicyAccess derives access from the grant alone, so a grant without a relationship is access nothing explains and no termination path can find"
        ).toBe(true)
        // ...and nothing else: a query on the OUTER client inside a transaction
        // is the 15-second deadlock this repo already documented in CLAUDE.md.
        expect(/\bdb\.\w+\.(?:find|create|update|delete)/.test(tx!), "no outer-client query inside the transaction").toBe(false)
    })
})

/**
 * Tiers 2 and 5: the actor is NAMED, and a passive interaction is a decision
 * rather than an oversight.
 *
 * `notification_events` has no actor column, and the ledger sanctions the
 * alternative: attribution in the copy. That only works if the name comes from
 * `displayPersonName` — a raw `.name` renders fixture and placeholder tokens
 * verbatim, which is the whole reason that module exists.
 */
const ATTRIBUTED: Array<{ id: string; file: string; fn: string; why: string }> = [
    { id: "I-10", file: "app/(protected)/agent/actions.ts", fn: "addPolicyForCustomer", why: "tells the customer another party can now see their policy" },
    { id: "I-11", file: "app/(protected)/agent/actions.ts", fn: "requestAiConsent", why: "asks the customer to let a model read their document" },
    { id: "I-12", file: "app/(protected)/wallet/actions.ts", fn: "notifyAgentAboutGap", why: "turns the customer's question into an advisor's opportunity" },
    { id: "I-14", file: "app/(protected)/tasks/actions.ts", fn: "submitQuestionnaireResponse", why: "an advisor with a book needs to know WHICH client answered" },
]

const PASSIVE_BY_DECISION: Record<string, string> = {
    "I-15": "Justified-passive WITH disclosure: the Task row carries `creatorUserId` and renders the creator's name in /tasks, so the actor is declared where the work appears. A notification per assigned task would be noise on the one surface a person already opens to see them.",
    "I-23": "Justified-passive WITH disclosure: an analysis completing is announced to the policy's OWNER (`policy_analyzed`); the advisor sees the run, dated, whenever they open the policy — the findings-provenance line states which run they came from. The advisor is not the subject of the analysis, and a per-run alert across a book is noise.",
    "I-21": "The actor is the system: the weekly digest has no person to attribute. Its honesty problem is its CONTENT (counts and dates), which is C-01/C-02's territory, not attribution.",
}

describe("tiers 2 and 5: the actor is named, and passive is a decision", () => {
    it("accounts for every id the ledger puts on the tier-2 and tier-5 rows", () => {
        const ids = [...new Set([...tierIdsFromLedger(2), ...tierIdsFromLedger(5)])].sort()
        expect(ids.length, "tier 2/5 rows not found in the ledger").toBeGreaterThan(4)
        const accounted = [
            ...new Set([
                ...ATTRIBUTED.map((a) => a.id),
                ...Object.keys(PASSIVE_BY_DECISION),
                "I-02", // checked below: redemption announces what it activates
                "I-03", // tier 4 above: one transaction, and both emits name the other party
                "I-07", // tier 1 above: the customer is told, naming the new advisor
                "I-16", // checked below: both directions name the actor
            ]),
        ].sort()
        expect(
            accounted,
            "an id on tier 2 or 5 is neither attributed, checked, nor recorded as a passive decision with its reason"
        ).toEqual(ids)
    })

    it.each(ATTRIBUTED.map((a) => [`${a.id} ${a.fn}`, a] as const))(
        "%s names the actor through the identity module",
        (_name, entry) => {
            const body = functionBody(readFileSync(path.join(ROOT, entry.file), "utf8"), entry.fn)
            expect(body, `${entry.fn} not found in ${entry.file}`).not.toBeNull()
            expect(
                /displayPersonName\(/.test(body!),
                `${entry.id}: this notification ${entry.why}, so it must name the actor — and through displayPersonName, since a raw .name renders fixture tokens`
            ).toBe(true)
        }
    )

    it("I-16: both directions of a document request name the person, not the role", () => {
        const req = readFileSync(path.join(ROOT, "app/api/v1/collaboration/document-requests/route.ts"), "utf8")
        const up = readFileSync(path.join(ROOT, "app/api/v1/collaboration/document-requests/[id]/route.ts"), "utf8")
        expect(req).toMatch(/displayPersonName\(/)
        expect(up).toMatch(/displayPersonName\(/)
    })

    it("I-02: redeeming an invite announces what it activates", () => {
        const src = readFileSync(path.join(ROOT, "app/auth/actions.ts"), "utf8")
        const body = functionBody(src, "applyInviteRedemption")
        expect(body, "applyInviteRedemption not found").not.toBeNull()
        // Both relationship branches announce it...
        expect(
            (body!.match(/announceRelationshipActivated\(/g) ?? []).length,
            "both relationship branches (client_agent connect, and the agent→client signup invite) must announce the activation"
        ).toBe(2)
        // ...and the share branch, where the GRANT is minted, tells both sides.
        expect(
            emitCallFor(body!, "policy_shared"),
            "a share COMPLETES at redemption when the advisor had no account; sharePolicy announces the same fact when they do"
        ).not.toBeNull()
        const announce = functionBody(src, "announceRelationshipActivated")
        expect(announce, "announceRelationshipActivated not found").not.toBeNull()
        expect(emitCallFor(announce!, "advisor_assigned"), "it must emit advisor_assigned").not.toBeNull()
        expect(/displayPersonName\(/.test(announce!), "each side is named").toBe(true)
    })
})

/**
 * Queue C: the report is the THIRD surface, and it may not contradict the other
 * two by omission.
 *
 * A report that lists findings while saying nothing about what was checked, or
 * about whether a person has confirmed the record, implies a completeness the
 * app never claims — and an advisor hands it to a customer.
 */
const REPORT_ROUTES = [
    "app/api/v1/agent/policies/[id]/branded-report/route.ts",
    "app/api/v1/policies/[id]/savings-report/route.ts",
]

describe("Queue C: the report says what the app says", () => {
    const generator = "lib/services/reports/savings-report.ts"

    it("C-04: the report renders the composition's two lines, from the app's own copy keys", () => {
        const src = readFileSync(path.join(ROOT, generator), "utf8")
        expect(src, "the coverage line").toMatch(/data-fact="composition\.coverage"/)
        expect(src, "the recording line").toMatch(/data-fact="composition\.recording"/)
        // Same translation bundle as components/gaps/CoverageComposition — a
        // second wording is a second truth.
        expect(src).toMatch(/composition\.\$\{k\}|`composition\.\$/)
        expect(src, "the denominators must come from the composition, not be recomputed").toMatch(
            /coverage\.checked|recording\.checked/
        )
    })

    it("C-03: the report states the record's state unless a person has confirmed it", () => {
        const src = readFileSync(path.join(ROOT, generator), "utf8")
        expect(src).toMatch(/data-fact="record\.status"/)
        expect(src, "the app's own labels").toMatch(/recordStatus\.awaitingConfirmation/)
        expect(
            src,
            "and the framing that the status describes the RECORD, not the person's insurance"
        ).toMatch(/recordStatus\.describesRecord/)
    })

    it("C-05: findings still under review are labelled, never counted", () => {
        const src = readFileSync(path.join(ROOT, generator), "utf8")
        expect(src, "they are excluded from the listed findings").toMatch(/excludeUnderReview\(/)
        expect(src, "and the report says so").toMatch(/underReviewOmitted/)
    })

    it.each(REPORT_ROUTES)("%s builds its report from the one shared context", (route) => {
        const src = readFileSync(path.join(ROOT, route), "utf8")
        expect(
            src,
            "both reports read buildReportContext — building the inputs inline, twice, is how the report drifted from the app in the first place"
        ).toMatch(/buildReportContext\(/)
        expect(src, "and pass the composition and the record status through").toMatch(/ctx\.composition/)
        expect(src).toMatch(/ctx\.recordStatus/)
    })

    it("C-08: the registry's recipients and the code agree on extraction_flagged", () => {
        const def = NOTIFICATION_EVENTS["extraction_flagged"]
        expect(def.recipients).toContain("owner")
        const src = readFileSync(path.join(ROOT, "app/(protected)/wallet/actions.ts"), "utf8")
        const body = functionBody(src, "flagPolicyExtraction")
        const call = emitCallFor(body!, "extraction_flagged")
        expect(
            /userId:\s*policy\.ownerUserId/.test(call!),
            "the registry is documentation the loop must keep true (PARITY E4)"
        ).toBe(true)
    })
})
