/**
 * A customer-facing notification list renders EVENTS, not delivery records (§2.7).
 *
 * One emission writes ONE ROW PER CHANNEL (dispatch.ts creates a row per
 * channel, storing the caller's `dedupeKey` verbatim on each — the
 * `@@unique([userId, dedupeKey, channel])` index is what permits that). The
 * /notifications page read them all back raw, so a renewal reminder sent to
 * in-app and email rendered as two identical cards distinguished only by a
 * channel chip — and the chip itself leaked the raw enum `in_app` (evidence:
 * docs/transformation/evidence/notifications/BASELINE.md, finding N1).
 *
 * The invariant, in both directions:
 *   1. one event never renders twice — delivery rows sharing a stored
 *      `dedupeKey` collapse to one entry (exact match on the stored key,
 *      per user; see lib/notifications/event-grouping.ts for why no suffix
 *      stripping happens);
 *   2. unkeyed rows (`dedupeKey: null`) are NEVER merged — not on title, not
 *      on timestamp, not on eventType. Heuristic grouping is a §12.2 halt
 *      condition, so the fixture below deliberately contains two unkeyed rows
 *      similar enough to tempt one.
 *
 * Enforced three ways, per CLAUDE.md ("guards must enumerate, not assume"):
 *   - behaviourally against the grouping helper (the semantics);
 *   - behaviourally against BOTH grouped read surfaces, getNotificationData
 *     and GET /api/v1/notifications, through a mocked db (the wiring);
 *   - statically over a filesystem-enumerated universe: every
 *     `notificationEvent.findMany` call site in app/, lib/ and components/
 *     must either pin `channel: 'in_app'` (one row per event, for events with
 *     an in-app arm), route through `groupNotificationEventRows`, or carry an
 *     explicit exemption with a reason. The matcher is proven against
 *     committed probes in tests/fixtures/guard-probes/ — including one where
 *     the compliant filter appears only in a comment, the historical way a
 *     guard in this repo went blind.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import { globSync } from "../helpers/glob"
import {
    groupNotificationEventRows,
    type DeliveryRowLike,
} from "@/lib/notifications/event-grouping"

// ─────────────────────────────────────────────────────────────────────────────
// Mocks for the two grouped surfaces (declared before their imports; hoisted).
// ─────────────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth-helpers", () => ({ getAuthenticatedUserOrNull: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/db", () => ({
    db: {
        notificationEvent: {
            findMany: vi.fn(async () => []),
            updateMany: vi.fn(async () => ({ count: 0 })),
            count: vi.fn(async () => 0),
        },
        policy: { findMany: vi.fn(async () => []) },
        customerRelationship: { findMany: vi.fn(async () => []) },
        user: {
            findUnique: vi.fn(async () => ({
                id: "u1",
                email: "reader@example.com",
                roles: "policyholder",
                createdAt: new Date("2026-01-01T00:00:00Z"),
            })),
        },
    },
}))
vi.mock("@/lib/api-auth", () => ({ requireApiUser: vi.fn() }))
vi.mock("@/lib/api-utils", () => ({
    createApiResponse: (data: unknown) => ({ ok: true, data }),
    createApiError: (code: string, message: string) => ({ ok: false, code, message }),
}))

import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { requireApiUser } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { getNotificationData } from "@/app/(protected)/notifications/actions"
import { GET as getV1Notifications } from "@/app/api/v1/notifications/route"

const mockAuth = vi.mocked(getAuthenticatedUserOrNull)
const mockApiAuth = vi.mocked(requireApiUser)
const mockFindMany = vi.mocked(db.notificationEvent.findMany)

// ─────────────────────────────────────────────────────────────────────────────
// The fixture shape — mirrors tests/measure/dashboard-fixtures.ts's
// applyNotificationDuplicateFixture: two rows sharing ONE stored dedupeKey
// (email + push, one renewal-reminder emission), and two `dedupeKey: null`
// rows for DIFFERENT events, deliberately alike in channel and recency so a
// heuristic merge would swallow one.
// ─────────────────────────────────────────────────────────────────────────────

const SHARED_KEY = "e2e-fixture-renewal-reminder:pol-fixture:owner"
const T = (ms: number) => new Date(Date.UTC(2026, 7, 23, 10, 0, 0, ms))

function row(over: Partial<Record<string, unknown>>) {
    return {
        id: "row",
        userId: "u1",
        eventType: "policy_renewal_reminder",
        channel: "in_app",
        status: "sent",
        priority: "normal",
        title: "Η ανανέωση του συμβολαίου σας πλησιάζει",
        message: "Το συμβόλαιό σας λήγει σε 15 ημέρες.",
        relatedObjectType: null,
        relatedObjectId: null,
        dedupeKey: null,
        readAt: null,
        sentAt: T(0),
        createdAt: T(0),
        ...over,
    }
}

/** Newest-first, the order the queries return. */
const FIXTURE_ROWS = [
    row({ id: "push-1", channel: "push", dedupeKey: SHARED_KEY, createdAt: T(3) }),
    row({ id: "email-1", channel: "email", dedupeKey: SHARED_KEY, createdAt: T(2) }),
    row({
        id: "inapp-doc",
        channel: "in_app",
        eventType: "document_requested",
        title: "Ο σύμβουλός σας ζήτησε ένα έγγραφο",
        message: "Ανεβάστε το έγγραφο για να συνεχίσει ο σύμβουλός σας.",
        createdAt: T(1),
    }),
    row({
        id: "inapp-q",
        channel: "in_app",
        eventType: "questionnaire_sent",
        title: "Νέο ερωτηματολόγιο από τον σύμβουλό σας",
        message: "Απαντήστε το για να εντοπίσουμε κενά στην κάλυψή σας.",
        createdAt: T(0),
    }),
]

// ─────────────────────────────────────────────────────────────────────────────
// Part 1 — the grouping semantics themselves.
// ─────────────────────────────────────────────────────────────────────────────

describe("groupNotificationEventRows — one event, one entry", () => {
    it("collapses the fixture's email+push pair and keeps both unkeyed rows: 4 rows → 3 events", () => {
        const groups = groupNotificationEventRows(FIXTURE_ROWS as unknown as DeliveryRowLike[])
        expect(groups).toHaveLength(3)
        expect(groups[0].rows.map((r) => r.id).sort()).toEqual(["email-1", "push-1"])
        expect(groups[1].representative.id).toBe("inapp-doc")
        expect(groups[2].representative.id).toBe("inapp-q")
    })

    it("NEVER merges unkeyed rows — even two of the same event type, same channel, same instant", () => {
        const a = row({ id: "n1", dedupeKey: null, createdAt: T(0) })
        const b = row({ id: "n2", dedupeKey: null, createdAt: T(0) })
        const groups = groupNotificationEventRows([a, b] as unknown as DeliveryRowLike[])
        expect(groups).toHaveLength(2)
    })

    it("treats an empty-string key as no key", () => {
        const a = row({ id: "n1", dedupeKey: "" })
        const b = row({ id: "n2", dedupeKey: "" })
        expect(groupNotificationEventRows([a, b] as unknown as DeliveryRowLike[])).toHaveLength(2)
    })

    it("matches the stored key EXACTLY — no suffix surgery that would merge renewal milestones", () => {
        // dispatch.ts stores the caller's key verbatim on every channel row, so
        // exact match is complete. Stripping a trailing `:segment` (what a
        // misreading of D-002 would do) merges these two DIFFERENT reminders.
        const thirty = row({ id: "n1", dedupeKey: "renewal:pol-9:30d" })
        const seven = row({ id: "n2", dedupeKey: "renewal:pol-9:7d" })
        expect(groupNotificationEventRows([thirty, seven] as unknown as DeliveryRowLike[])).toHaveLength(2)
    })

    it("the in-app arm is the representative: its id is what mark-read targets", () => {
        const email = row({ id: "email-9", channel: "email", dedupeKey: "gap:v3:owner", createdAt: T(2) })
        const inApp = row({ id: "inapp-9", channel: "in_app", dedupeKey: "gap:v3:owner", createdAt: T(1) })
        const [group] = groupNotificationEventRows([email, inApp] as unknown as DeliveryRowLike[])
        expect(group.representative.id).toBe("inapp-9")
        expect(group.hasInAppArm).toBe(true)
    })

    describe("read state — one home, no flicker", () => {
        it("in-app arm read + email arm unread ⇒ the EVENT is read (the email row's readAt is not evidence)", () => {
            // The bell marks the in_app row. If grouping consulted the email
            // row's forever-null readAt, the event would flip back to unread
            // on the next page load — the flicker this decision forbids.
            const email = row({ id: "e", channel: "email", dedupeKey: "k", readAt: null })
            const inApp = row({ id: "i", channel: "in_app", dedupeKey: "k", readAt: T(5) })
            const [group] = groupNotificationEventRows([email, inApp] as unknown as DeliveryRowLike[])
            expect(group.unread).toBe(false)
            expect(group.readAt).toEqual(T(5))
        })

        it("in-app arm unread ⇒ unread, whatever the other arms say", () => {
            const email = row({ id: "e", channel: "email", dedupeKey: "k", readAt: T(5) })
            const inApp = row({ id: "i", channel: "in_app", dedupeKey: "k", readAt: null })
            const [group] = groupNotificationEventRows([email, inApp] as unknown as DeliveryRowLike[])
            expect(group.unread).toBe(true)
        })

        it("an event with NO in-app arm has no read state and must not render unread", () => {
            // markAllNotificationsRead stamps in_app rows only; an "unread"
            // email-only event would be a badge nothing can clear.
            const email = row({ id: "e", channel: "email", dedupeKey: "k", readAt: null })
            const push = row({ id: "p", channel: "push", dedupeKey: "k", readAt: null })
            const [group] = groupNotificationEventRows([email, push] as unknown as DeliveryRowLike[])
            expect(group.hasInAppArm).toBe(false)
            expect(group.unread).toBe(false)
        })
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// Part 2 — the /notifications page's server action, end to end through a
// mocked db. This is the surface the defect lived on.
// ─────────────────────────────────────────────────────────────────────────────

describe("getNotificationData — the Ειδοποιήσεις page lists events", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockAuth.mockResolvedValue({ dbUser: { id: "u1", preferredLanguage: "el" } } as any)
        mockFindMany.mockResolvedValue(FIXTURE_ROWS as any)
    })

    it("the fixture's 4 delivery rows render as 3 events, ids unique, unkeyed rows intact", async () => {
        const data = await getNotificationData()
        expect(data).not.toBeNull()
        const ids = data!.history.map((e: any) => e.event_id)
        expect(ids).toHaveLength(3)
        expect(new Set(ids).size).toBe(3)
        // The channel-duplicated emission appears ONCE…
        const renewal = data!.history.filter((e: any) => e.event_type === "policy_renewal_reminder")
        expect(renewal).toHaveLength(1)
        // …and the two deliberately-similar unkeyed rows both survive.
        expect(ids).toContain("inapp-doc")
        expect(ids).toContain("inapp-q")
    })

    it("delivery channel is not in the payload at all — nothing for a chip to render", async () => {
        const data = await getNotificationData()
        for (const item of data!.history as any[]) {
            expect(Object.keys(item)).not.toContain("channel")
        }
    })

    it("read state: no in-app arm ⇒ not unread; unread in-app rows ⇒ unread", async () => {
        const data = await getNotificationData()
        const byId = new Map((data!.history as any[]).map((e) => [e.event_id, e]))
        // email+push group — no in-app arm, no read state, never "unread".
        const renewal = (data!.history as any[]).find((e) => e.event_type === "policy_renewal_reminder")
        expect(renewal.unread).toBe(false)
        expect(byId.get("inapp-doc")!.unread).toBe(true)
        expect(byId.get("inapp-q")!.unread).toBe(true)
    })

    it("flow-through: the query still spans real channels (grouping, not an in_app filter that would drop email-only events)", async () => {
        await getNotificationData()
        // Proves the mocked rows actually travelled the guarded path — a
        // no-op probe that never reached the query would fail here.
        expect(mockFindMany).toHaveBeenCalledTimes(1)
        expect(mockFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    userId: "u1",
                    channel: { not: "analytics" },
                }),
            })
        )
    })

    it("a keyed event with an in-app arm is identified by that arm — mark-read targets the row that owns read state", async () => {
        mockFindMany.mockResolvedValue([
            row({ id: "email-x", channel: "email", dedupeKey: "score:v2:owner", createdAt: T(2) }),
            row({ id: "inapp-x", channel: "in_app", dedupeKey: "score:v2:owner", readAt: T(9), createdAt: T(1) }),
        ] as any)
        const data = await getNotificationData()
        expect(data!.history).toHaveLength(1)
        const item = data!.history[0] as any
        expect(item.event_id).toBe("inapp-x")
        expect(item.unread).toBe(false) // read via the bell stays read here — no flicker
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// Part 3 — the v1 API, the second all-channels reader. Same invariant.
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/v1/notifications — lists events", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockApiAuth.mockResolvedValue({
            auth: { dbUser: { id: "u1", preferredLanguage: "en" } },
        } as any)
        mockFindMany.mockResolvedValue(FIXTURE_ROWS as any)
    })

    it("4 delivery rows → 3 events; unkeyed rows never merged; no channel field", async () => {
        const res: any = await getV1Notifications(new Request("http://test/api/v1/notifications"))
        expect(res.ok).toBe(true)
        const items = res.data.notifications
        expect(items).toHaveLength(3)
        expect(new Set(items.map((n: any) => n.id)).size).toBe(3)
        expect(items.map((n: any) => n.id)).toEqual(expect.arrayContaining(["inapp-doc", "inapp-q"]))
        for (const n of items) {
            expect(Object.keys(n)).not.toContain("channel")
        }
    })

    it("flow-through: the fixture rows travelled the route's own query", async () => {
        await getV1Notifications(new Request("http://test/api/v1/notifications"))
        expect(mockFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ channel: { not: "analytics" } }),
            })
        )
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// Part 4 — the static scanner: universe enumerated from the filesystem.
// Primitives lifted from live-policy-status-filter.test.ts (proven there).
// ─────────────────────────────────────────────────────────────────────────────

/** Strip // and /* comments while respecting ' " ` strings and `${…}`. */
function stripComments(src: string): string {
    let out = ""
    let i = 0
    let mode: "code" | "line" | "block" | "squote" | "dquote" | "template" = "code"
    const templateDepth: number[] = []
    while (i < src.length) {
        const c = src[i]
        const c2 = src[i + 1]
        if (mode === "code") {
            if (c === "/" && c2 === "/") { mode = "line"; i += 2; continue }
            if (c === "/" && c2 === "*") { mode = "block"; i += 2; continue }
            if (c === "'") { mode = "squote"; out += c; i++; continue }
            if (c === '"') { mode = "dquote"; out += c; i++; continue }
            if (c === "`") { mode = "template"; out += c; i++; continue }
            if (c === "}" && templateDepth.length) {
                if (templateDepth[templateDepth.length - 1] === 0) {
                    templateDepth.pop(); mode = "template"; out += c; i++; continue
                }
                templateDepth[templateDepth.length - 1]--
            }
            if (c === "{" && templateDepth.length) templateDepth[templateDepth.length - 1]++
            out += c; i++; continue
        }
        if (mode === "line") { if (c === "\n") { mode = "code"; out += c } i++; continue }
        if (mode === "block") { if (c === "*" && c2 === "/") { mode = "code"; i += 2; continue } if (c === "\n") out += c; i++; continue }
        if (mode === "squote") { if (c === "\\") { out += c + (c2 ?? ""); i += 2; continue } if (c === "'" || c === "\n") mode = "code"; out += c; i++; continue }
        if (mode === "dquote") { if (c === "\\") { out += c + (c2 ?? ""); i += 2; continue } if (c === '"' || c === "\n") mode = "code"; out += c; i++; continue }
        // template
        if (c === "\\") { out += c + (c2 ?? ""); i += 2; continue }
        if (c === "`") { mode = "code"; out += c; i++; continue }
        if (c === "$" && c2 === "{") { templateDepth.push(0); mode = "code"; out += c + c2; i += 2; continue }
        out += c; i++; continue
    }
    return out
}

/** Balanced ( … ) or { … } span starting at src[open], strings skipped. */
function balancedSpan(src: string, open: number): string | null {
    const openCh = src[open]
    const closeCh = openCh === "(" ? ")" : openCh === "{" ? "}" : null
    if (!closeCh) return null
    let depth = 0
    for (let i = open; i < src.length; i++) {
        const c = src[i]
        if (c === "'" || c === '"' || c === "`") {
            const q = c
            i++
            while (i < src.length && src[i] !== q) { if (src[i] === "\\") i++; i++ }
            continue
        }
        if (c === openCh) depth++
        else if (c === closeCh) { depth--; if (depth === 0) return src.slice(open, i + 1) }
    }
    return null
}

/** Nesting depth ({[( alike) at every index of an object literal. */
function braceDepths(text: string): number[] {
    const depths = new Array<number>(text.length).fill(0)
    let depth = 0
    for (let i = 0; i < text.length; i++) {
        const c = text[i]
        if (c === "'" || c === '"' || c === "`") {
            const q = c
            depths[i] = depth
            i++
            while (i < text.length && text[i] !== q) { if (text[i] === "\\") { depths[i] = depth; i++ } depths[i] = depth; i++ }
            if (i < text.length) depths[i] = depth
            continue
        }
        if (c === "{" || c === "[" || c === "(") { depths[i] = depth; depth++; continue }
        if (c === "}" || c === "]" || c === ")") { depth--; depths[i] = depth; continue }
        depths[i] = depth
    }
    return depths
}

/** The `where: { … }` block at the TOP level of a Prisma options object. */
function topLevelWhereBlock(optionsObj: string): string | null {
    const depths = braceDepths(optionsObj)
    const re = /\bwhere\s*:\s*\{/g
    let m: RegExpExecArray | null
    while ((m = re.exec(optionsObj))) {
        if (depths[m.index] === 1) return balancedSpan(optionsObj, re.lastIndex - 1)
    }
    return null
}

const IN_APP_PIN = /\bchannel\s*:\s*(["'`])in_app\1/
const FINDMANY_RE = /\.\s*notificationEvent\s*\.\s*findMany\s*\(/g

type ListViolation = { line: number; snippet: string }

/**
 * Scan one file's source for notificationEvent.findMany call sites that are
 * neither in_app-pinned nor routed through the grouping helper.
 *
 * Passes, in order, per call site:
 *  1. the top-level where pins `channel: 'in_app'` — one row per event;
 *  2. the where spreads a local (`...scope`) whose same-file declaration pins
 *     it (the bell route's shape);
 *  3. the FILE calls `groupNotificationEventRows(` — the grouped surfaces,
 *     whose semantics Parts 1–3 prove behaviourally. File-level, so it is a
 *     documented blind spot: a second, ungrouped query added to a grouped
 *     file would ride along. GROUPED_SURFACE_CALL_COUNTS closes that by
 *     pinning each grouped file's exact call-site count.
 */
function scanNotificationListSource(raw: string): { violations: ListViolation[]; callSites: number } {
    const src = stripComments(raw)
    const fileGroups = /\bgroupNotificationEventRows\s*\(/.test(src)
    const violations: ListViolation[] = []
    let callSites = 0
    let m: RegExpExecArray | null
    FINDMANY_RE.lastIndex = 0
    while ((m = FINDMANY_RE.exec(src))) {
        callSites++
        const line = src.slice(0, m.index).split("\n").length
        const args = balancedSpan(src, FINDMANY_RE.lastIndex - 1)
        const objStart = args?.indexOf("{") ?? -1
        const options = args && objStart !== -1 ? balancedSpan(args, objStart) : null
        const where = options ? topLevelWhereBlock(options) : null

        if (where) {
            if (IN_APP_PIN.test(where)) continue
            // Follow spreads to same-file declarations (`const scope = { channel: 'in_app' … }`).
            let spreadPinned = false
            const spreadRe = /\.\.\.\s*([A-Za-z_$][\w$]*)/g
            let s: RegExpExecArray | null
            while ((s = spreadRe.exec(where))) {
                const declRe = new RegExp(`\\b(?:const|let|var)\\s+${s[1]}\\s*(?::[^=\\n]+)?=\\s*\\{`)
                const d = declRe.exec(src)
                if (!d) continue
                const decl = balancedSpan(src, d.index + d[0].length - 1)
                if (decl && IN_APP_PIN.test(decl)) { spreadPinned = true; break }
            }
            if (spreadPinned) continue
        }
        if (fileGroups) continue
        const snippet = (where ?? args ?? "").replace(/\s+/g, " ").slice(0, 100)
        violations.push({ line, snippet })
    }
    return { violations, callSites }
}

// Exemptions: every entry is a CONSCIOUS decision with a reason, counts exact
// in both directions — a new offender in an exempted file fails, and fixing
// one fails until the entry is ratcheted down.
const NON_LIST_EXEMPTIONS: Record<string, { count: number; reason: string }> = {
    "app/(protected)/admin/actions.ts": {
        count: 2,
        reason:
            "Admin/operator reads (conversion-funnel counts over the analytics mirror; the " +
            "extraction-flag queue). Delivery and mirror rows ARE the subject for an operator. " +
            "Admin surfaces are fenced from run PW-MOBILE-TRANSFORM-01 (§12.4).",
    },
    "app/(protected)/admin/notifications/history/page.tsx": {
        count: 1,
        reason:
            "The admin DELIVERY history — the one surface whose entire job is delivery records " +
            "per channel. §2.7 is about customer-facing lists; this is the operator's ledger.",
    },
    "lib/notifications/retry.ts": {
        count: 3,
        reason:
            "The retry/escalation worker reads failed, queued and exhausted DELIVERIES in order " +
            "to redeliver them. Not a render surface; grouping here would drop retries.",
    },
    "lib/services/achievements.service.ts": {
        count: 2,
        reason:
            "Idempotency reads — which achievement notifications were already emitted. Business " +
            "logic over its own emissions, not a customer list.",
    },
    "lib/services/perk-reminder.service.ts": {
        count: 1,
        reason: "90-day resend suppression — an idempotency read, not a customer list.",
    },
    "lib/notifications/cadence.ts": {
        count: 1,
        reason:
            "The §9.5 monthly-ceiling COUNT: sent outbound engagement deliveries in the rolling " +
            "month, deduplicated by stored dedupeKey in code (one message on two channels counts " +
            "once — the same per-event collapse the grouping helper performs, applied to a number " +
            "rather than a render). Never rendered to anyone.",
    },
    "lib/services/compliance.service.ts": {
        count: 1,
        reason:
            "GDPR export (Art. 15) must export every stored row, per-channel deliveries " +
            "included. Grouping would HIDE personal data from the export.",
    },
}

// Files allowed to pass on the grouping-helper call, ratcheted to their exact
// findMany count so a new, ungrouped query added to them cannot ride along on
// the file-level grouping check.
const GROUPED_SURFACE_CALL_COUNTS: Record<string, number> = {
    "app/(protected)/notifications/actions.ts": 2, // grouped history + in_app watcher feed
    "app/api/v1/notifications/route.ts": 1, // grouped event list
}

const ROOT = path.resolve(__dirname, "../..")

describe("every notification list in the tree renders events, not delivery records", () => {
    const files = [
        ...globSync("app/**/*.ts"),
        ...globSync("app/**/*.tsx"),
        ...globSync("lib/**/*.ts"),
        ...globSync("lib/**/*.tsx"),
        ...globSync("components/**/*.ts"),
        ...globSync("components/**/*.tsx"),
    ]

    it("the universe enumeration actually found the known reader files", () => {
        // A glob that silently matches nothing is a guard that guards nothing.
        expect(files).toContain("app/(protected)/notifications/actions.ts")
        expect(files).toContain("app/api/v1/notifications/route.ts")
        expect(files).toContain("app/api/notifications/route.ts")
        expect(files).toContain("app/(protected)/activity/actions.ts")
    })

    it("no unexempted findMany call site is both unscoped and ungrouped", () => {
        const failures: string[] = []
        for (const rel of files) {
            const raw = readFileSync(path.join(ROOT, rel), "utf-8")
            if (!raw.includes("notificationEvent")) continue
            const { violations, callSites } = scanNotificationListSource(raw)
            const exemption = NON_LIST_EXEMPTIONS[rel]
            if (exemption) {
                if (callSites !== exemption.count) {
                    failures.push(
                        `${rel}: exempted for exactly ${exemption.count} call site(s) but has ${callSites} — ` +
                        `a query was added or removed; re-decide the exemption. Reason on file: ${exemption.reason}`
                    )
                }
                continue
            }
            for (const v of violations) {
                failures.push(
                    `${rel}:${v.line} reads notification delivery rows without pinning channel:'in_app' ` +
                    `and without groupNotificationEventRows — a customer would see one event once per ` +
                    `channel. where: ${v.snippet}`
                )
            }
        }
        expect(failures, failures.join("\n")).toEqual([])
    })

    it("grouped surfaces keep their exact call-site counts (closes the file-level blind spot)", () => {
        for (const [rel, expected] of Object.entries(GROUPED_SURFACE_CALL_COUNTS)) {
            const raw = readFileSync(path.join(ROOT, rel), "utf-8")
            const { callSites } = scanNotificationListSource(raw)
            expect(
                callSites,
                `${rel}: expected exactly ${expected} notificationEvent.findMany call site(s); a new ` +
                `query added to a grouped file must be individually scoped or grouped, then this ` +
                `count updated`
            ).toBe(expected)
        }
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// Part 5 — the matcher proven against committed probes. A guard without a
// probe in the repo is not a guard.
// ─────────────────────────────────────────────────────────────────────────────

describe("the scanner is proven against committed probes", () => {
    const probe = (name: string) =>
        readFileSync(path.join(ROOT, "tests/fixtures/guard-probes", name), "utf-8")

    it("flags the ungrouped all-channels list (red proof)", () => {
        expect(scanNotificationListSource(probe("notif-list-ungrouped.ts.txt")).violations).toHaveLength(1)
    })

    it("flags it even when a COMMENT mentions the compliant filter", () => {
        expect(scanNotificationListSource(probe("notif-list-comment-only-inapp.ts.txt")).violations).toHaveLength(1)
    })

    it("accepts an in_app-pinned where", () => {
        expect(scanNotificationListSource(probe("notif-list-inapp-pinned.ts.txt")).violations).toEqual([])
    })

    it("accepts the pin behind a same-file spread (the bell route's shape)", () => {
        expect(scanNotificationListSource(probe("notif-list-spread-scope.ts.txt")).violations).toEqual([])
    })

    it("accepts an all-channels read routed through the grouping helper", () => {
        expect(scanNotificationListSource(probe("notif-list-grouped.ts.txt")).violations).toEqual([])
    })
})
