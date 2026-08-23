import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { monitorRisk, type MonitoringInputs } from "@/lib/services/risk-dna/monitoring"

import { getBaseEmailTemplate } from "@/lib/email/templates/base-template"
import {
    getChurnDay7Email,
    getChurnDay14Email,
    getChurnDay30Email,
    getChurnDay60Email,
} from "@/lib/email/templates/churn-prevention"
import {
    getDeletionApprovedEmail,
    getDeletionRejectedEmail,
    getDeletionCompletedEmail,
    getDataExportReadyEmail,
} from "@/lib/email/templates/dsr-emails"
import { getWelcomeEmail, getDay3Email, getDay7Email } from "@/lib/email/templates/engagement-drip"
import { getWeeklyDigestEmail } from "@/lib/email/templates/weekly-digest"
import {
    getAgentApprovalEmail,
    getAgentRejectionEmail,
    getAgentWelcomeEmail,
} from "@/lib/email/templates/agent-emails"

/**
 * ABSENCE OF A DETECTED PROBLEM IS NOT EVIDENCE OF NO PROBLEM.
 *
 * The dashboard's monitoring card renders three checks, each with a verdict, and
 * `clear` is drawn as reassurance. On a wallet whose cover had entirely expired
 * it rendered «Κάλυψη που λήγει: Εντάξει» — because the lapse window was
 * `days >= 0 && days <= 45`, which silently excluded every policy that had
 * ALREADY ended. The check found nothing about to lapse because there was
 * nothing left to lapse, and said so as good news.
 *
 * Same shape as the protection score over a never-analysed portfolio and the
 * gap engine's `is_false` operators: silence is not a negative finding. See the
 * invariant in CLAUDE.md.
 */
const base = (policies: MonitoringInputs["policies"]): MonitoringInputs => ({
    ctx: {} as any,
    dimensions: [],
    lastAssessedAt: new Date("2026-08-20T00:00:00Z"),
    policies,
    now: new Date("2026-08-23T00:00:00Z"),
})

const lapse = (inputs: MonitoringInputs) =>
    monitorRisk(inputs).find((s) => s.id === "cover_lapsing")!

const policy = (id: string, endsInDays: number | null) => ({
    id,
    endDate: endsInDays === null ? null : new Date(Date.UTC(2026, 7, 23 + endsInDays)),
    lineOfBusiness: "motor",
})

describe("the lapse watch never calls an expired portfolio clear", () => {
    it("does not report `clear` when every policy has already ended", () => {
        const signal = lapse(base([policy("a", -20), policy("b", -200)]))
        expect(signal.verdict).not.toBe("clear")
        expect(signal.verdict).toBe("action")
    })

    it("says what is wrong, in Greek, rather than staying silent", () => {
        const signal = lapse(base([policy("a", -20), policy("b", -200)]))
        expect(signal.detail?.el).toMatch(/έχουν ήδη λήξει/)
        expect(signal.action?.el).toBeTruthy()
    })

    it("counts the expired ones AND the ones about to go", () => {
        const signal = lapse(base([policy("a", -20), policy("b", 10)]))
        expect(signal.detail?.el).toMatch(/1 ασφαλιστήριο έχει ήδη λήξει/)
        // Was `άλλα 1 λήγουν` — this assertion pinned the agreement bug that
        // production later showed. Fixed with the string it was guarding.
        expect(signal.detail?.el).toMatch(/και άλλο 1 λήγει μέσα σε 45 ημέρες/)
    })

    it("still reports `action` for cover that is merely about to lapse", () => {
        expect(lapse(base([policy("a", 10)])).verdict).toBe("action")
    })

    it("is `clear` only when there is live cover and none of it is ending", () => {
        // The one state that genuinely warrants reassurance.
        const signal = lapse(base([policy("a", 200), policy("b", 300)]))
        expect(signal.verdict).toBe("clear")
        expect(signal.detail).toBeNull()
    })

    it("is `clear` on an empty wallet, which the hero handles separately", () => {
        expect(lapse(base([])).verdict).toBe("clear")
    })
})

/**
 * Same slip, same cause: the fixtures never reached a count of one.
 *
 * Production rendered «1 ασφαλιστήριο έχει ήδη λήξει και άλλα 1 λήγουν μέσα σε
 * 45 ημέρες» — the first clause inflected, the second did not.
 */
describe("the lapse detail agrees with its counts", () => {
    it("uses the singular for one more policy about to lapse", () => {
        const s = lapse(base([policy("a", -20), policy("b", 10)]))
        expect(s.detail?.el).toContain("και άλλο 1 λήγει")
        expect(s.detail?.el).not.toContain("άλλα 1 λήγουν")
        expect(s.detail?.en).toContain("1 more ends within")
    })

    it("uses the plural for two or more", () => {
        const s = lapse(base([policy("a", -20), policy("b", 10), policy("c", 20)]))
        expect(s.detail?.el).toContain("άλλα 2 λήγουν")
        expect(s.detail?.en).toContain("2 more end within")
    })
})

/* ────────────────────────────────────────────────────────────────────────────
 * THE OUTBOUND ARM.
 *
 * The suite above imports ONE function and asserts on its output, so it
 * structurally cannot see an email template — and the worst instance of this
 * invariant lived in one: the day-7 drip's gap tile rendered green over
 * `gapCount === 0` (lib/email/templates/engagement-drip.ts, P1-02), where zero
 * meant "no GapInstance rows", which a portfolio nobody has ever analysed also
 * produces. A green all-clear, mailed to people whose documents were never
 * opened, with colour as the only carrier.
 *
 * This arm enforces "no all-clear where the check could not run" against
 * RENDERED outbound templates:
 *
 *   - The universe is enumerated from the filesystem (lib/email/templates/*.ts
 *     and their exported render functions) — a new template cannot dodge the
 *     guard by not being on a list, because the list is the directory.
 *   - Every enumerated export must be registered below: either rendered in the
 *     never-looked portfolio state and swept for all-clear claims, or skipped
 *     WITH A REASON (repo rule: guards enumerate, exemptions carry reasons).
 *   - The matcher is proven against committed probe fixtures — red on the
 *     removed defect's exact shape, green on the honest disclosure — because a
 *     guard never shown to fail is not a guard.
 * ──────────────────────────────────────────────────────────────────────────── */

const ROOT = process.cwd()
const TEMPLATE_DIR = path.join(ROOT, "lib/email/templates")

/** HTML → the text a reader actually sees (same mechanics as tests/measure). */
function toText(html: string): string {
    return html
        .replace(/<!--[\s\S]*?-->/g, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim()
}

/**
 * Reassurance about coverage-gap state. Narrow on purpose: these are CLAIMS
 * that a check ran and found nothing («0 κενά κάλυψης», «δεν εντοπίσαμε»,
 * "all clear"), not mere mentions of gaps — welcome copy saying "discover
 * your coverage gaps" claims nothing. In the never-looked state, ANY match is
 * a lie: the honest rendering states that nobody has looked, which none of
 * these patterns match.
 */
const ALL_CLEAR_CLAIMS: RegExp[] = [
    /\b0\s*κεν[όά]\s+κάλυψης/iu,
    /\b0\s+coverage\s+gaps?/iu,
    /κανένα\s+κενό/iu,
    /\bno\s+(?:coverage\s+)?gaps\b/iu,
    /δεν\s+εντοπίσαμε/iu,
    /δεν\s+εντοπίστηκ/iu,
    /found\s+nothing/iu,
    /nothing\s+that\s+needs\s+action/iu,
    /όλα\s+καλά/iu,
    /\ball\s+clear\b/iu,
    /εντάξει/iu,
    /καλή\s+κάλυψη/iu,
    /πλήρης\s+κάλυψη/iu,
    /fully\s+covered/iu,
    /you(?:'|’)re\s+all\s+set/iu,
]

function findAllClearClaims(text: string): string[] {
    return ALL_CLEAR_CLAIMS.filter((re) => re.test(text)).map((re) => String(re))
}

/**
 * The portfolio state that matters: policies exist, NOTHING has been analysed.
 * `gapCount: 0` here is zero recorded rows, not a finding of zero gaps.
 */
const NEVER_LOOKED = { policyCount: 3, gapCount: 0, analysedPolicyCount: 0 }

type Rendered = string | { subject?: string; html: string }
type RegistryEntry =
    | { skip: string }
    | {
          render: () => Rendered[]
          /**
           * Pinned debt: the render CURRENTLY violates the invariant, the fix
           * belongs to another brief, and this entry is asserted still-red so
           * whoever fixes it must delete the entry (same pattern as the
           * severity-display migration-debt list).
           */
          knownDefect?: string
      }

const REGISTRY: Record<string, RegistryEntry> = {
    "agent-emails.ts#getAgentApprovalEmail": {
        render: () => [getAgentApprovalEmail({ agentName: "Νίκος", agentEmail: "agent@example.com", agencyName: "Agency" })],
    },
    "agent-emails.ts#getAgentRejectionEmail": {
        render: () => [getAgentRejectionEmail({ agentName: "Νίκος", reason: "Ελλιπή δικαιολογητικά" })],
    },
    "agent-emails.ts#getAgentWelcomeEmail": {
        render: () => [getAgentWelcomeEmail("Νίκος")],
    },
    "base-template.ts#getBaseEmailTemplate": {
        // The shell around every other render; swept with neutral content so a
        // reassuring footer or header could not hide in the chrome.
        render: () => [getBaseEmailTemplate("<p>.</p>", "el"), getBaseEmailTemplate("<p>.</p>", "en")],
    },
    "churn-prevention.ts#getChurnDay7Email": {
        render: () => [
            getChurnDay7Email({ name: "Νίκος", language: "el", expiringPolicies: 0, openGaps: 0 }),
            getChurnDay7Email({ name: "Νίκος", language: "en", expiringPolicies: 0, openGaps: 0 }),
        ],
        knownDefect:
            "Says «Δεν εντοπίσαμε κάτι που να απαιτεί ενέργεια» / 'We found nothing that needs " +
            "action' when openGaps === 0 — but its producer (churn-prevention.service.ts) counts " +
            "GapInstance rows with no analysis state, so a never-analysed portfolio gets the same " +
            "sentence. Same defect class as P1-02's tile; churn-prevention was outside that brief " +
            "(reported in its P1-02 report). Fix the producer+template, then DELETE this entry.",
    },
    "churn-prevention.ts#getChurnDay14Email": {
        render: () => [
            getChurnDay14Email({ name: "Νίκος", language: "el" }),
            getChurnDay14Email({ name: "Νίκος", language: "en" }),
        ],
    },
    "churn-prevention.ts#getChurnDay30Email": {
        render: () => [
            getChurnDay30Email({ name: "Νίκος", language: "el" }),
            getChurnDay30Email({ name: "Νίκος", language: "en" }),
        ],
    },
    "churn-prevention.ts#getChurnDay60Email": {
        render: () => [
            getChurnDay60Email({ name: "Νίκος", language: "el" }),
            getChurnDay60Email({ name: "Νίκος", language: "en" }),
        ],
    },
    "dsr-emails.ts#getDeletionApprovedEmail": {
        render: () => [getDeletionApprovedEmail("el"), getDeletionApprovedEmail("en")],
    },
    "dsr-emails.ts#getDeletionRejectedEmail": {
        render: () => [getDeletionRejectedEmail("el", "λόγος"), getDeletionRejectedEmail("en", "reason")],
    },
    "dsr-emails.ts#getDeletionCompletedEmail": {
        render: () => [getDeletionCompletedEmail("el"), getDeletionCompletedEmail("en")],
    },
    "dsr-emails.ts#getDataExportReadyEmail": {
        render: () => [
            getDataExportReadyEmail("el", "https://example.invalid/export"),
            getDataExportReadyEmail("en", "https://example.invalid/export"),
        ],
    },
    "engagement-drip.ts#getWelcomeEmail": {
        render: () => [getWelcomeEmail("el", "Νίκος"), getWelcomeEmail("en", "Νίκος")],
    },
    "engagement-drip.ts#getDay3Email": {
        render: () => [getDay3Email("el", "Νίκος"), getDay3Email("en", "Νίκος")],
    },
    "engagement-drip.ts#getDay7Email": {
        render: () => [
            getDay7Email("el", "Νίκος", NEVER_LOOKED),
            getDay7Email("en", "Νίκος", NEVER_LOOKED),
        ],
    },
    "phrases.ts#counted": {
        skip: "Phrase fragment, not a template — `counted(0, …)` legitimately says «0 κενά» when a CALLER that analysed everything asks it to; the callers' rendered output is what this arm sweeps.",
    },
    "phrases.ts#daysToExpiryPhrase": {
        skip: "Phrase fragment, not a template — swept through the templates that interpolate it.",
    },
    "phrases.ts#greeting": {
        skip: "Phrase fragment, not a template — swept through the templates that interpolate it.",
    },
    "weekly-digest.ts#getWeeklyDigestEmail": {
        render: () => [
            getWeeklyDigestEmail("el", "Νίκος", { renewingSoon: [], newGaps: 0, unreadMessages: 0 }),
            getWeeklyDigestEmail("en", "Νίκος", { renewingSoon: [], newGaps: 0, unreadMessages: 0 }),
        ],
    },
}

/** Exported render functions, from source text — the universe, from disk. */
function exportedFunctions(file: string): string[] {
    const src = readFileSync(path.join(TEMPLATE_DIR, file), "utf-8")
    const names: string[] = []
    const re = /^export\s+(?:async\s+)?(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\()/gm
    let m: RegExpExecArray | null
    while ((m = re.exec(src))) names.push(m[1] ?? m[2])
    return names
}

describe("no outbound template mails an all-clear the engine never earned", () => {
    const files = readdirSync(TEMPLATE_DIR).filter((f) => f.endsWith(".ts")).sort()

    it("enumerates a real universe", () => {
        expect(files.length).toBeGreaterThanOrEqual(7)
        expect(files.flatMap(exportedFunctions).length).toBeGreaterThanOrEqual(15)
    })

    it("every exported template function is registered — render or skip with a reason", () => {
        const missing = files
            .flatMap((f) => exportedFunctions(f).map((fn) => `${f}#${fn}`))
            .filter((key) => !(key in REGISTRY))
        expect(
            missing,
            `Unregistered outbound template exports (add a renderer for the never-looked state, or a skip WITH a reason):\n${missing.join("\n")}`
        ).toEqual([])
    })

    it("carries no stale registry entries for exports that no longer exist", () => {
        const universe = new Set(files.flatMap((f) => exportedFunctions(f).map((fn) => `${f}#${fn}`)))
        const stale = Object.keys(REGISTRY).filter((key) => !universe.has(key))
        expect(stale, `Registry entries with no matching export:\n${stale.join("\n")}`).toEqual([])
    })

    it("no rendered template claims an all-clear in the never-looked state", () => {
        const offenders: string[] = []
        for (const [key, entry] of Object.entries(REGISTRY)) {
            if ("skip" in entry || entry.knownDefect) continue
            for (const rendered of entry.render()) {
                const html = typeof rendered === "string" ? rendered : rendered.html
                const subject = typeof rendered === "string" ? "" : rendered.subject ?? ""
                const claims = findAllClearClaims(`${subject} ${toText(html)}`)
                if (claims.length) offenders.push(`${key}: ${claims.join(", ")}`)
            }
        }
        expect(
            offenders,
            `All-clear claimed where nothing was checked (zero recorded findings is not a finding of zero):\n${offenders.join("\n")}`
        ).toEqual([])
    })

    it("pinned debt is still red — fixing it must delete its registry entry", () => {
        for (const [key, entry] of Object.entries(REGISTRY)) {
            if ("skip" in entry || !entry.knownDefect) continue
            const violating = entry.render().some((rendered) => {
                const html = typeof rendered === "string" ? rendered : rendered.html
                return findAllClearClaims(toText(html)).length > 0
            })
            expect(
                violating,
                `${key} no longer violates the invariant — delete its knownDefect entry so the guard enforces it:\n${entry.knownDefect}`
            ).toBe(true)
        }
    })
})

describe("the outbound matcher is proven against committed probes", () => {
    const probe = (name: string) =>
        readFileSync(path.join(ROOT, "tests/fixtures/guard-probes", name), "utf-8")

    it("flags the basis-free green zero (the removed day-7 tile's exact shape)", () => {
        expect(findAllClearClaims(toText(probe("allclear-basis-free-email.html.txt"))).length).toBeGreaterThan(0)
    })

    it("does not flag the honest disclosure of the same portfolio state", () => {
        expect(findAllClearClaims(toText(probe("allclear-declared-unanalysed-email.html.txt")))).toEqual([])
    })
})

/**
 * The day-7 tile itself, state by state. "0 κενά κάλυψης" (we looked and found
 * none) and «δεν έχει αναλυθεί ακόμη» (we have not looked) must not render
 * identically — and no meaning may ride on colour alone.
 */
describe("the day-7 snapshot tile states its basis in words", () => {
    const el = (stats: { policyCount: number; gapCount: number; analysedPolicyCount: number }) =>
        getDay7Email("el", "Νίκος", stats)

    it("never analysed: no count, no green, and it says nobody has looked", () => {
        const { html } = el(NEVER_LOOKED)
        const text = toText(html)
        expect(text).toContain("Δεν έχει αναλυθεί ακόμη")
        expect(text).toContain("δεν γνωρίζουμε αν υπάρχουν κενά κάλυψης")
        expect(text).not.toMatch(/0\s+Κενά κάλυψης/u)
        expect(html).not.toContain("#F0FDF4")
        expect(findAllClearClaims(text)).toEqual([])
    })

    it("analysed and clean: the zero carries its basis, in words", () => {
        const { html } = el({ policyCount: 3, gapCount: 0, analysedPolicyCount: 3 })
        const text = toText(html)
        expect(text).toMatch(/0\s+Κενά κάλυψης/u)
        expect(text).toContain("Αναλύθηκαν και τα 3 ασφαλιστήρια")
        const en = toText(getDay7Email("en", "Νίκος", { policyCount: 3, gapCount: 0, analysedPolicyCount: 3 }).html)
        expect(en).toContain("All 3 policies analysed")
    })

    it("the two zeros do not render identically", () => {
        const never = toText(el(NEVER_LOOKED).html)
        const clean = toText(el({ policyCount: 3, gapCount: 0, analysedPolicyCount: 3 }).html)
        expect(never).not.toBe(clean)
    })

    it("partially analysed: zero findings is scoped, not green, and the remainder is stated", () => {
        const { html } = el({ policyCount: 3, gapCount: 0, analysedPolicyCount: 1 })
        const text = toText(html)
        expect(text).toContain("Αναλύθηκε 1 από 3 ασφαλιστήρια")
        expect(text).toContain("2 ασφαλιστήρια δεν έχουν αναλυθεί ακόμη.")
        expect(html).not.toContain("#F0FDF4")
    })

    it("findings render amber with the warning text, whatever the colour does", () => {
        const { html } = el({ policyCount: 3, gapCount: 2, analysedPolicyCount: 3 })
        expect(html).toContain("#FEF3C7")
        expect(toText(html)).toContain("2 κενά κάλυψης χρειάζονται προσοχή")
    })

    it("agrees with itself at a count of one", () => {
        const one = toText(el({ policyCount: 1, gapCount: 0, analysedPolicyCount: 1 }).html)
        expect(one).toContain("Αναλύθηκε 1 ασφαλιστήριο")
        const oneEn = toText(getDay7Email("en", "Νίκος", { policyCount: 1, gapCount: 0, analysedPolicyCount: 1 }).html)
        expect(oneEn).toContain("1 policy analysed")
    })

    it("english never-analysed state says so in english", () => {
        const text = toText(getDay7Email("en", "Νίκος", NEVER_LOOKED).html)
        expect(text).toContain("Not analysed yet")
        expect(text).toContain("we do not know whether there are coverage gaps")
    })
})
