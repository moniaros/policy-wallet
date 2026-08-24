import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"
import {
    NOTIFICATION_EVENTS,
    deliverableEvents,
    isSuppressible,
    retryDelayMinutes,
    type NotificationEventDefinition,
} from "@/lib/notifications/registry"
import { IMPLEMENTED_CHANNELS } from "@/lib/notifications/channels"
import { BUSINESS_EVENTS } from "@/lib/events/catalog"
import { presentStoredNotification } from "@/lib/notifications/stored-content"
// The SHARED locale-purity definitions (T-011) — one meaning of "Latin
// sentence" / "internal token" across surface baselines, outbound inventory
// and this guard.
import { findLatinSentences, findInternalTokens } from "../measure/metrics"

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

const SOURCES = [...globSync("lib/**/*.ts"), ...globSync("app/**/*.ts"), ...globSync("app/**/*.tsx")]

/**
 * The rules that make the notification architecture true rather than merely
 * intended. Each one below is a defect this codebase actually shipped.
 */
describe("one bus: nothing writes a notification behind the dispatcher's back", () => {
    it("no notificationEvent.create outside lib/notifications/", () => {
        const offenders: string[] = []
        for (const f of SOURCES) {
            if (f.startsWith("lib/notifications/")) continue
            const src = strip(readFileSync(f, "utf-8"))
            if (/\bnotificationEvent\s*\.\s*create\b/.test(src)) offenders.push(f)
        }
        // There were ~20 of these. Each hardcoded `channel: 'in_app'` at the call
        // site, skipped the user's preferences entirely, and could never reach a
        // second channel — per-channel business logic copied across the codebase.
        expect(
            offenders,
            `write notifications through emit() instead:\n${offenders.join("\n")}`
        ).toEqual([])
    })

    it("every event a sender emits is declared in the registry", () => {
        const undeclared = new Set<string>()
        for (const f of SOURCES) {
            const src = strip(readFileSync(f, "utf-8"))
            for (const m of src.matchAll(/\b(?:emit|orchestrate)\(\{\s*event:\s*["']([A-Za-z0-9_]+)["']/g)) {
                if (!(m[1] in NOTIFICATION_EVENTS)) undeclared.add(m[1])
            }
        }
        expect(
            [...undeclared],
            `emitted but not declared in lib/notifications/registry.ts:\n${[...undeclared].join("\n")}`
        ).toEqual([])
    })

    it("every live event has an emitter, and planned events have none", () => {
        const emitted = new Set<string>()
        for (const f of SOURCES) {
            const src = strip(readFileSync(f, "utf-8"))
            // `emit` and `orchestrate` are both sanctioned entry points — the
            // orchestrator resolves recipients and applies quiet hours, then
            // calls emit. A guard that knew only about emit would report every
            // orchestrated event as an orphan.
            for (const m of src.matchAll(/\b(?:emit|orchestrate)\(\{\s*event:\s*["']([A-Za-z0-9_]+)["']/g)) {
                emitted.add(m[1])
            }
            // The compatibility shims still route eventType through the bus.
            for (const m of src.matchAll(/eventType:\s*["']([A-Za-z0-9_]+)["']/g)) {
                emitted.add(m[1])
            }
        }

        // An escalation TARGET is emitted by the retry sweep, which reads
        // `rule.event` off the registry rather than naming the event in source.
        // Derived rather than flagged: the wiring genuinely exists, and a
        // rule pointing at it is the proof.
        const escalationTargets = new Set(
            Object.values(NOTIFICATION_EVENTS)
                .map((d) => d.escalation?.event)
                .filter(Boolean) as string[]
        )

        const liveWithoutEmitter = Object.entries(NOTIFICATION_EVENTS)
            .filter(
                ([key, d]) =>
                    d.status === "live" &&
                    !emitted.has(key) &&
                    !d.emittedDynamically &&
                    !escalationTargets.has(key)
            )
            .map(([key]) => key)

        // A `live` event nothing emits is the failure mode this registry exists
        // to surface: eleven of the brief's required triggers were simply
        // missing, and nothing anywhere said so.
        expect(
            liveWithoutEmitter,
            `declared live but never emitted:\n${liveWithoutEmitter.join("\n")}`
        ).toEqual([])
    })

    it("a dynamically-named emitter still names the module it lives in", () => {
        // The escape hatch for `conv_${type}`-style names must not become a way
        // to declare an event live with nothing behind it at all.
        for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
            if (!def.emittedDynamically) continue
            expect(def.emittedBy, `${key} claims a dynamic emitter but names no module`).toBeTruthy()
        }
    })

    it("planned events are declared with a note explaining what blocks them", () => {
        for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
            if (def.status !== "planned") continue
            expect(def.note, `${key} is planned with no explanation`).toBeTruthy()
        }
    })
})

describe("every event carries a complete rule", () => {
    const REQUIRED: (keyof NotificationEventDefinition)[] = [
        "businessEvent",
        "triggerCondition",
        "category",
        "priority",
        "channels",
        "recipients",
        "transactional",
        "retry",
        "audit",
        "status",
        // `copy` may be null (analytics mirrors) but must be STATED —
        // the locale-purity block below decides when null is legal.
        "copy",
    ]

    it("declares all required fields", () => {
        for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
            for (const field of REQUIRED) {
                expect(def[field], `${key} is missing ${String(field)}`).not.toBeUndefined()
            }
            // Nullable but must be stated, never merely absent.
            expect(def, `${key} must state requiredAction (null is an answer)`).toHaveProperty("requiredAction")
            expect(def, `${key} must state escalation (null is an answer)`).toHaveProperty("escalation")
            expect(def, `${key} must state expiresAfterHours (null is an answer)`).toHaveProperty("expiresAfterHours")
        }
    })

    it("names at least one recipient and one channel", () => {
        for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
            expect(def.recipients.length, `${key} reaches nobody`).toBeGreaterThan(0)
            expect(def.channels.length, `${key} has no channel`).toBeGreaterThan(0)
        }
    })

    it("only uses channels that exist", () => {
        const known = new Set([...IMPLEMENTED_CHANNELS, "sms", "whatsapp", "webhook", "analytics"])
        for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
            for (const channel of def.channels) {
                expect(known.has(channel), `${key} declares unknown channel ${channel}`).toBe(true)
            }
        }
    })

    it("escalates only to events that exist", () => {
        for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
            if (!def.escalation) continue
            expect(
                NOTIFICATION_EVENTS[def.escalation.event],
                `${key} escalates to undeclared event ${def.escalation.event}`
            ).toBeTruthy()
        }
    })

    it("gives every escalation a threshold to cross", () => {
        for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
            if (!def.escalation) continue
            const hasThreshold =
                typeof def.escalation.afterFailures === "number" ||
                typeof def.escalation.afterUnreadHours === "number"
            expect(hasThreshold, `${key} escalates but names no threshold`).toBe(true)
        }
    })

    it("only escalates unread thresholds on events the user can actually read", () => {
        for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
            if (typeof def.escalation?.afterUnreadHours !== "number") continue
            // Read state exists on in-app rows only. An "unread for 3 days"
            // rule on an email-only event would never fire.
            expect(def.channels, `${key} escalates on unread but never goes in-app`).toContain("in_app")
        }
    })
})

describe("the settings screen can only offer switches the dispatcher honours", () => {
    it("transactional and analytics events are not suppressible", () => {
        for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
            if (def.transactional || def.category === "analytics") {
                expect(isSuppressible(key), `${key} must not be switchable off`).toBe(false)
            }
        }
    })

    it("security and billing events are always transactional", () => {
        for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
            if (def.category === "security" || def.category === "billing") {
                // Nobody consents away from being told their card failed or
                // their password changed.
                expect(def.transactional, `${key} must be transactional`).toBe(true)
            }
        }
    })

    it("critical events reach more than one channel", () => {
        for (const [key, def] of deliverableEvents()) {
            if (def.priority !== "critical") continue
            const reach = def.channels.filter((c) => c !== "analytics")
            expect(reach.length, `${key} is critical but has one way through`).toBeGreaterThan(1)
        }
    })
})

describe("retry and expiry are coherent", () => {
    it("backs off increasingly, and never instantly", () => {
        for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
            if (def.retry.attempts <= 1) continue
            const first = retryDelayMinutes(def.retry, 1)
            const second = retryDelayMinutes(def.retry, 2)
            expect(first, `${key} retries immediately`).toBeGreaterThan(0)
            expect(second, `${key} does not back off`).toBeGreaterThanOrEqual(first)
        }
    })

    it("never keeps retrying past the point the message expires", () => {
        for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
            if (def.expiresAfterHours === null || def.retry.attempts <= 1) continue
            let total = 0
            for (let attempt = 1; attempt < def.retry.attempts; attempt++) {
                total += retryDelayMinutes(def.retry, attempt)
            }
            // A renewal reminder that arrives after the renewal has passed is
            // worse than one that never came, so the retry schedule must fit
            // inside the window in which the message is still true.
            expect(
                total / 60,
                `${key} could still be retrying ${Math.round(total / 60)}h after it expires at ${def.expiresAfterHours}h`
            ).toBeLessThanOrEqual(def.expiresAfterHours)
        }
    })
})

describe("risk notifications cannot be lost or skipped", () => {
    const ENGINE = strip(readFileSync("lib/services/gap-engine/index.ts", "utf-8"))
    const LIFE = strip(readFileSync("lib/services/life-events/service.ts", "utf-8"))

    it("the risk-profile version write is awaited, not floated", () => {
        // It used to be `void import(...).then(recordRiskProfileVersion)`, which
        // was defensible while versioning was pure observability. It stopped
        // being defensible when GAP_DETECTED and risk_level_changed were hung
        // off it: a floating promise in a
        // serverless function may be terminated when the response returns, so
        // the customer-facing consequence of an upload could never fire.
        expect(ENGINE).not.toMatch(/void\s+import\([^)]*risk-profile-version/)
        expect(ENGINE).toMatch(/await\s+recordRiskProfileVersion\(/)
    })

    it("the life-event path runs the FULL engine, not a version-only recompute", () => {
        // The dashboard reads the CACHED score. A version-only recompute left a
        // customer who declared "a child was born" looking at their pre-event
        // score, with recommendations that did not mention the new gap, moments
        // after being notified that it had opened.
        expect(LIFE).toMatch(/runGapEngine\(userId, \{ trigger, lifeEventId/)
        expect(LIFE).not.toMatch(/getGapEngineSnapshot/)
    })

    it("the causal link to the life event survives the full engine", () => {
        // The only thing the reduced path was really protecting was
        // `lifeEventId` — the link the timeline uses to say "this risk opened
        // because you declared a mortgage on the 14th".
        expect(ENGINE).toMatch(/lifeEventId: opts\?\.lifeEventId/)
    })
})

/**
 * ── Stored notification content is customer copy — bilingual, Greek-pure ────
 *
 * P1-05: internal English documentation reached Greek customers because the
 * generic executor composed notifications from `businessEvent` and the events
 * catalog's `description`, and the bus stored whatever it was given. The fix
 * is at COMPOSITION: `LocalizedText` no longer admits a bare string (tsc, a
 * blocking CI check, enforces that on every caller), the registry carries the
 * bilingual `copy` the executor composes from, and legacy rows are presented
 * through lib/notifications/stored-content.ts. This block guards each seam,
 * enumerating events from the registry module and call sites from the
 * filesystem — never from a hand-kept list.
 *
 * Locale-purity definitions are the SHARED ones (tests/measure/metrics.ts) so
 * a "Latin sentence" means the same thing here as in the outbound inventory
 * and the surface baselines.
 */
describe("stored notification content is bilingual customer copy", () => {
    const GREEK = /[Ͱ-Ͽἀ-῿]/

    /** Internal documentation strings, enumerated from the declaring modules. */
    const INTERNAL_DOCS = (() => {
        const docs = new Set<string>()
        for (const def of Object.values(NOTIFICATION_EVENTS)) {
            docs.add(def.businessEvent)
            docs.add(def.triggerCondition)
        }
        for (const def of Object.values(BUSINESS_EVENTS)) {
            docs.add(def.description)
            docs.add(def.trigger)
        }
        return docs
    })()

    it("every readable event declares bilingual copy; analytics mirrors declare null", () => {
        for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
            if (def.category === "analytics") {
                // Machine rows every surface filters out. Prose here would
                // claim a readership that does not exist.
                expect(def.copy, `${key} is an analytics mirror and must declare copy: null`).toBeNull()
                continue
            }
            expect(def.copy, `${key} has no customer copy — a person can read this event`).not.toBeNull()
            for (const arm of ["title", "message"] as const) {
                for (const lang of ["el", "en"] as const) {
                    const text = def.copy?.[arm][lang]
                    expect(
                        Boolean(text && text.trim().length > 0),
                        `${key} copy.${arm}.${lang} is empty`
                    ).toBe(true)
                }
            }
        }
    })

    it("the Greek arm of every copy is Greek — no Latin sentences, no internal tokens", () => {
        const offenders: string[] = []
        for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
            if (!def.copy) continue
            for (const arm of ["title", "message"] as const) {
                const el = def.copy[arm].el
                if (!GREEK.test(el)) offenders.push(`${key} copy.${arm}.el has no Greek script: "${el}"`)
                for (const hit of findLatinSentences(el)) {
                    offenders.push(`${key} copy.${arm}.el reads as English: "${hit}"`)
                }
                for (const hit of findInternalTokens(el)) {
                    offenders.push(`${key} copy.${arm}.el carries internal token (${hit}): "${el}"`)
                }
            }
        }
        expect(offenders, offenders.join("\n")).toEqual([])
    })

    it("no copy arm is an internal documentation string", () => {
        // Satisfying the `copy` requirement by pasting the businessEvent in
        // would reintroduce the defect with the field that exists to end it.
        const offenders: string[] = []
        for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
            if (!def.copy) continue
            for (const arm of ["title", "message"] as const) {
                for (const lang of ["el", "en"] as const) {
                    if (INTERNAL_DOCS.has(def.copy[arm][lang])) {
                        offenders.push(`${key} copy.${arm}.${lang} is an internal doc string`)
                    }
                }
            }
        }
        expect(offenders, offenders.join("\n")).toEqual([])
    })

    it("no emit/orchestrate call site wires internal documentation into title or message", () => {
        // The executor did exactly this (`title: definition.businessEvent`,
        // `message: ctx.definition.description`) until Aug 2026. SOURCES is the
        // full lib/app tree, so a new caller anywhere goes red. The type system
        // is the deeper defence — LocalizedText has no string arm — but a
        // bilingual object built FROM a doc field would type-check, which is
        // what this scan exists to catch.
        // Scoped to the bus entry points — `businessEvent` legitimately
        // appears in operator-facing admin validation messages, and the
        // catalog description in advisor TASK rows, neither of which is
        // notification content. The window is generous enough to cover any
        // params object these calls actually build; a call so large it
        // overflows it has bigger problems than this guard.
        const offenders: string[] = []
        const ENTRY = /\b(?:emit|orchestrate|sendNotification|notifyCounterparty)\(\{/g
        const DOC_WIRED = /(?:title|message):[^,\n]*\b(?:businessEvent|definition\s*\.\s*description|triggerCondition)\b/
        for (const f of SOURCES) {
            const src = strip(readFileSync(f, "utf-8"))
            for (const call of src.matchAll(ENTRY)) {
                const window = src.slice(call.index, call.index + 1500)
                const m = window.match(DOC_WIRED)
                if (m) offenders.push(`${f}: ${m[0].trim().slice(0, 90)}`)
            }
        }
        expect(
            offenders,
            `internal documentation wired into notification content:\n${offenders.join("\n")}`
        ).toEqual([])
    })

    it("a legacy row storing internal prose is substituted with the event's copy, for EVERY event", () => {
        for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
            if (!def.copy) continue
            const presented = presentStoredNotification(key, def.businessEvent, def.businessEvent)
            expect(presented.sanitized, `${key}: internal prose passed through unsanitized`).toBe(true)
            for (const lang of ["el", "en"] as const) {
                expect(presented.title[lang], `${key}: internal prose survived in title.${lang}`)
                    .not.toBe(def.businessEvent)
            }
            expect(presented.title).toEqual(def.copy.title)
            expect(presented.message).toEqual(def.copy.message)
        }
    })

    it("the two production strings from the defect report are caught", () => {
        // registry.ts businessEvent + lib/events/catalog.ts description for
        // policy_analyzed — both found stored verbatim in the dev database.
        const presented = presentStoredNotification(
            "policy_analyzed",
            "AI extraction finished and the policy is readable",
            "AI extraction read the policy successfully"
        )
        expect(presented.sanitized).toBe(true)
        expect(presented.title.el).toBe("Η ανάλυση ολοκληρώθηκε")
        expect(presented.message.el).toBe("Το ασφαλιστήριο διαβάστηκε και αναλύθηκε επιτυχώς.")
    })

    it("emitter-composed content passes through untouched", () => {
        const presented = presentStoredNotification(
            "GAP_DETECTED",
            "Εντοπίσαμε 2 κενά κάλυψης",
            "Διαδικτυακή απάτη και παραβίαση λογαριασμού και 1 ακόμη."
        )
        expect(presented.sanitized).toBe(false)
        expect(presented.title.el).toBe("Εντοπίσαμε 2 κενά κάλυψης")
        expect(presented.message.el).toBe("Διαδικτυακή απάτη και παραβίαση λογαριασμού και 1 ακόμη.")
    })

    it("internal prose on an event that no longer exists degrades to the truthful generic", () => {
        // e.g. rows whose eventType was renamed away. The stored prose must
        // not render; nothing may be invented about what happened either.
        const stored = "AI extraction finished and the policy is readable"
        const presented = presentStoredNotification("some_event_renamed_away", stored, stored)
        expect(presented.sanitized).toBe(true)
        expect(presented.title.el).toBe("Ειδοποίηση")
        expect(presented.title.en).toBe("Notification")
        expect(presented.message.el).not.toContain("AI extraction")
        expect(presented.message.en).not.toContain("AI extraction")
    })

    it("every non-admin display surface reading notification rows presents through stored-content", () => {
        // Enumerated from the filesystem: any file under app/ that queries
        // notificationEvent.findMany AND serves title/message to a client must
        // import the presenter. The admin console is exempt — operators
        // inspect the raw delivery log there, and dressing it up would hide
        // exactly what an audit needs to see.
        const offenders: string[] = []
        for (const f of SOURCES) {
            if (!f.startsWith("app/")) continue
            if (f.startsWith("app/(protected)/admin/")) continue
            const src = strip(readFileSync(f, "utf-8"))
            if (!/\bnotificationEvent\s*\.\s*findMany\b/.test(src)) continue
            // Reads that never render (dedupe lookups etc.) select neither
            // title nor message into a response; displaying code does.
            if (!/\btitle\b/.test(src)) continue
            if (!/StoredNotification\b/.test(src)) {
                offenders.push(f)
            }
        }
        expect(
            offenders,
            `these surfaces render stored notification rows without the presenter:\n${offenders.join("\n")}`
        ).toEqual([])
    })
})

/**
 * P1-09b — the §9.5 cadence controls must be impossible to route around.
 *
 * The controls themselves are proven behaviourally in
 * tests/unit/cadence-controls.test.ts: the dispatcher and the retry sweep skip
 * outbound sends (and record why) when a user's global off switch or monthly
 * ceiling says so. That proof covers the PIPELINE. What it cannot cover is a
 * send path that never enters the pipeline — a module that imports a transport
 * directly and mails whoever it likes, which is exactly what the app's auth
 * and admin flows legitimately do today.
 *
 * THE UNIVERSE (D-005 — a guard states what it walks and what it claims):
 * every .ts/.tsx file under lib/, app/ and components/, enumerated from the
 * filesystem at test time. A file is a TRANSPORT TOUCHER when, after comment
 * stripping, it names a transport module in any import form — static, dynamic
 * `import("…")` or require — matched on the module SPECIFIER, so aliasing the
 * imported symbol cannot hide it. The transport modules are the three that
 * exist (`lib/email/email-service`, `lib/mail`, `lib/push/web-push`) plus the
 * dead FCM path (`lib/services/push.service`), kept in the net so reviving it
 * lands here too. NOT covered, stated plainly: a send path that inlines its
 * own HTTP call to a mail provider would not import any of these — the sibling
 * outbound-dispatch guard (lib/outbound/dispatch-guard.ts) is the env-level
 * backstop for that, and `fetch(BREVO…)` exists only inside email-service.
 *
 * Every toucher must be classified below — gated pipeline, transport plumbing,
 * or an exemption with a reason a reviewer can reject. An unclassified toucher
 * fails the test, so a NEW send path cannot ship without answering "why may
 * this ignore the customer's off switch?" in this file, in review.
 */
describe("outbound transports are invoked only where the §9.5 cadence gate can see them", () => {
    const TRANSPORT_UNIVERSE = [
        ...globSync("lib/**/*.ts"),
        ...globSync("lib/**/*.tsx"),
        ...globSync("app/**/*.ts"),
        ...globSync("app/**/*.tsx"),
        ...globSync("components/**/*.ts"),
        ...globSync("components/**/*.tsx"),
    ]

    // Module specifiers, not symbol names: `import { sendEmail as x }` and
    // `await import("@/lib/email/email-service")` both still name the module.
    // Anchored on the closing quote so `@/lib/mail-templates` (markup only)
    // does not match `@/lib/mail`.
    const TRANSPORT_SPECIFIER =
        /["'](?:@\/lib\/email\/email-service|@\/lib\/mail|@\/lib\/push\/web-push|@\/lib\/services\/push\.service|\.{1,2}\/(?:[\w/.-]*\/)?(?:email-service|web-push|push\.service|mail))["']/

    const touchesTransport = (source: string) => TRANSPORT_SPECIFIER.test(strip(source))

    /**
     * Path → why it may touch a transport. Three kinds of answer:
     *   pipeline  — reached only via deliver(), whose only callers are the
     *               dispatcher and the sweep (pinned below), both of which
     *               consult the cadence gate (proven by outcome, in
     *               cadence-controls.test.ts).
     *   plumbing  — defines or wraps the transport; makes no send decision.
     *   exempt    — sends outside the pipeline ON PURPOSE, with the reason.
     *               Everything here is transactional, operational or
     *               compliance mail: the same class the dispatcher itself
     *               refuses to suppress ("nobody consents away a failed
     *               payment"), or mail to admins / to people who are not
     *               users yet, where no per-user gate can exist.
     */
    const CLASSIFIED: Record<string, string> = {
        "lib/notifications/channels/email.ts": "pipeline — the email adapter behind deliver()",
        "lib/notifications/channels/push.ts": "pipeline — the push adapter behind deliver()",
        "lib/mail.ts": "plumbing — legacy sendMail wrapper around sendEmail; no live callers",
        "lib/email/admin-emails.ts": "exempt — signup alerts to the operations inbox, not to a customer",
        "lib/email/form-emails.ts":
            "exempt — contact/quote submissions to the operations inbox, plus the submitter's receipt (transactional)",
        "lib/email/invite-emails.ts":
            "exempt — person-initiated invitations; recipients are usually not users yet, so no per-user gate exists",
        "app/auth/actions.ts": "exempt — verification and password mail; account security is transactional",
        "app/api/auth/reset-password/route.ts": "exempt — password reset; account security is transactional",
        "app/(protected)/admin/actions.ts":
            "exempt — agent-verification outcomes and GDPR/DSR lifecycle mail; compliance must reach even a user who muted everything",
    }

    it("every module that touches a transport is classified, and the classification is not stale", () => {
        const touchers = TRANSPORT_UNIVERSE.filter((f) => touchesTransport(readFileSync(f, "utf-8")))

        const unclassified = touchers.filter((f) => !(f in CLASSIFIED))
        expect(
            unclassified,
            `new outbound send path(s) with no answer to "why may this ignore the customer's off switch?" — classify or route through emit():\n${unclassified.join("\n")}`
        ).toEqual([])

        // Both directions: an entry whose file no longer touches a transport is
        // a stale exemption someone could later hide a new sender behind.
        const stale = Object.keys(CLASSIFIED).filter((f) => !touchers.includes(f))
        expect(stale, `stale classification entries:\n${stale.join("\n")}`).toEqual([])
    })

    it("deliver() is called only by the dispatcher and the sweep — the two places that consult the gate", () => {
        const callers = globSync("lib/**/*.ts").filter((f) => {
            if (f === "lib/notifications/channels/index.ts") return false // defines it
            return /\bdeliver\(/.test(strip(readFileSync(f, "utf-8")))
        })
        expect(callers.sort()).toEqual(["lib/notifications/dispatch.ts", "lib/notifications/retry.ts"])
    })

    it("the dispatcher and the sweep actually import the cadence gate", () => {
        // Belt to the behavioural braces: outcome tests prove the gate works
        // when consulted; this pins that the two deliver() callers above still
        // import the module that does the consulting. Import specifier, not a
        // word match, so a comment cannot satisfy it.
        for (const f of ["lib/notifications/dispatch.ts", "lib/notifications/retry.ts"]) {
            expect(
                /["']\.\/cadence["']/.test(strip(readFileSync(f, "utf-8"))),
                `${f} no longer imports ./cadence`
            ).toBe(true)
        }
    })

    it("RED PROBE: an unclassified direct sender is detected, through the same detector", () => {
        const probePath = "tests/fixtures/guard-probes/unclassified-transport-import.ts.txt"
        const probe = readFileSync(probePath, "utf-8")

        // The probe must trip the detector on BOTH import forms it contains…
        expect(touchesTransport(probe), "static-import probe went undetected").toBe(true)
        expect(
            TRANSPORT_SPECIFIER.test(strip(probe).split("await import")[1] ?? ""),
            "dynamic-import probe went undetected"
        ).toBe(true)

        // …and flow through the real classification over the real universe:
        // injected as a file, it must come out as exactly the offender list.
        const withProbe = [...TRANSPORT_UNIVERSE, probePath]
        const offenders = withProbe
            .filter((f) => touchesTransport(readFileSync(f, "utf-8")))
            .filter((f) => !(f in CLASSIFIED))
        expect(offenders).toEqual([probePath])

        // Negative control: naming a NEIGHBOURING module must not match, or
        // the guard would train people to ignore it.
        expect(touchesTransport(`import { x } from "@/lib/mail-templates"`)).toBe(false)
        expect(touchesTransport(`import { y } from "./mailbox"`)).toBe(false)
    })
})
