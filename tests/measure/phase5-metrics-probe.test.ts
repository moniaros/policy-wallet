/**
 * THE PROBES FOR §11 METRICS 7 AND 8 — duplicateActions / countConsistency
 * (tests/measure/action-collector.ts, tests/measure/count-collector.ts).
 *
 * A metric without a committed probe proven to turn it red is not a metric
 * (CLAUDE.md, "Guards must enumerate, not assume" — a guard without a probe
 * in the repo is not a guard; the same rule applies to the instruments).
 * Each describe block below plants the defect its metric exists to detect —
 * a duplicate action, a count mismatch — and asserts the metric FIRES, then
 * walks the deliberate non-findings (visibility, subject scoping, nav
 * policy, Greek number forms) so the red-proof cannot be satisfied by an
 * instrument that simply fires on everything.
 *
 * RUNTIME. jsdom, because the collectors are self-contained functions on the
 * section-collector pattern: the same source runs here directly and inside
 * the browser via `page.evaluate`. jsdom has no layout (every rect is 0×0),
 * so every call passes `assumeVisible: true` — exactly as the section-budget
 * guard calls `collectSections`. The geometric arms (zero-size, off-canvas)
 * are therefore NOT exercised here; they are the same three lines every
 * shared metric uses and they run on every real Playwright capture.
 *
 * SERIALISATION PROOF. `page.evaluate` serialises the collector's SOURCE into
 * the browser, where module imports do not exist — a closed-over helper
 * compiles fine and throws ReferenceError in production use. So the last test
 * of each block rebuilds the collector with `new Function(fn.toString())`,
 * which fails the same way serialisation would, and re-runs the red case
 * through the rebuilt copy.
 *
 * Run: npx vitest --run tests/measure/phase5-metrics-probe.test.ts
 * (vitest-only: the Playwright `measure` project matches *.spec.ts, so this
 * file is invisible to it by construction.)
 */

import { describe, it, expect, beforeEach } from "vitest"

import { collectDuplicateActions } from "./action-collector"
import type { DuplicateActionsOptions, DuplicateActionsResult } from "./action-collector"
import { collectCountConsistency } from "./count-collector"
import type { CountConsistencyOptions, CountConsistencyMetricResult } from "./count-collector"

/** Rebuild a collector from its own source — the page.evaluate path. */
function reserialised<O, R>(fn: (opts?: O) => R): (opts?: O) => R {
    return new Function("opts", `return (${fn.toString()})(opts)`) as (opts?: O) => R
}

const actions = (opts?: DuplicateActionsOptions): DuplicateActionsResult =>
    collectDuplicateActions({ assumeVisible: true, ...opts })
const counts = (opts?: CountConsistencyOptions): CountConsistencyMetricResult =>
    collectCountConsistency({ assumeVisible: true, ...opts })

beforeEach(() => {
    document.body.innerHTML = ""
})

// ─────────────────────────────────────────────────────────────────────────────
describe("duplicateActions — the probe that turns it red, and the non-findings", () => {
    it("RED: two content buttons carrying the same data-action verb are one action offered twice", () => {
        document.body.innerHTML = `
            <section id="hero"><button data-action="upload">Ανεβάστε συμβόλαιο</button></section>
            <section id="empty-state"><button data-action="upload">Ξεκινήστε εδώ</button></section>`
        const r = actions()
        expect(r.duplicateActionCount, JSON.stringify(r.groups)).toBe(1)
        expect(r.groups[0].identity).toBe("action:upload")
        expect(r.groups[0].identitySource).toBe("data-action")
        expect(r.groups[0].classification).toBe("content-repeat")
        expect(r.groups[0].gated).toBe(true)
        expect(r.groups[0].instances.map((i) => i.where).sort()).toEqual(["#empty-state", "#hero"])
    })

    it("RED: a card CTA and a sticky-bar CTA with DIFFERENT labels but one destination are one action", () => {
        // Trailing slash on the second href proves normalisation carries the match.
        document.body.innerHTML = `
            <section id="card"><a href="/wallet/add">Προσθήκη συμβολαίου</a></section>
            <div><a href="/wallet/add/">Ανεβάστε το πρώτο σας συμβόλαιο</a></div>`
        const r = actions()
        expect(r.duplicateActionCount, JSON.stringify(r.groups)).toBe(1)
        expect(r.groups[0].identity).toBe("href:/wallet/add")
        expect(r.groups[0].identitySource).toBe("href")
    })

    it("two identically-labelled links to DIFFERENT destinations are two actions, not one", () => {
        document.body.innerHTML = `
            <a href="/wallet/a1">Προβολή</a>
            <a href="/wallet/a2">Προβολή</a>`
        const r = actions()
        expect(r.groups, JSON.stringify(r.groups)).toEqual([])
        expect(r.duplicateActionCount).toBe(0)
    })

    it("a hidden copy is not an offer — and its exclusion is tallied, not silent", () => {
        document.body.innerHTML = `
            <button data-action="upload">Ανεβάστε</button>
            <button data-action="upload" style="display:none">Ανεβάστε</button>`
        const r = actions()
        expect(r.duplicateActionCount).toBe(0)
        expect(r.excluded).toContainEqual({ reason: "hidden", count: 1 })
        expect(r.offeredInstances).toBe(1)
    })

    it("inert, aria-hidden and disabled copies are not offers either", () => {
        document.body.innerHTML = `
            <button data-action="upload">Α</button>
            <div inert><button data-action="upload">Β</button></div>
            <div aria-hidden="true"><button data-action="upload">Γ</button></div>
            <button data-action="upload" disabled>Δ</button>`
        const r = actions()
        expect(r.duplicateActionCount, JSON.stringify(r)).toBe(0)
        expect(r.excluded).toContainEqual({ reason: "inert", count: 1 })
        expect(r.excluded).toContainEqual({ reason: "aria-hidden", count: 1 })
        expect(r.excluded).toContainEqual({ reason: "disabled", count: 1 })
    })

    it("nav + content reaching one destination is REPORTED, and gates only under navPolicy 'count'", () => {
        document.body.innerHTML = `
            <nav><a href="/wallet/add">Πορτοφόλι</a></nav>
            <section id="hero"><a href="/wallet/add">Προσθέστε συμβόλαιο</a></section>`
        const separate = actions()
        expect(separate.duplicateActionCount, JSON.stringify(separate.groups)).toBe(0)
        expect(separate.navOverlapCount).toBe(1)
        expect(separate.groups[0].classification).toBe("nav-overlap")
        expect(separate.groups[0].gated).toBe(false)

        const strict = actions({ navPolicy: "count" })
        expect(strict.duplicateActionCount).toBe(1)
        expect(strict.groups[0].gated).toBe(true)
    })

    it("the same destination twice inside ONE nav gates even under the default policy", () => {
        document.body.innerHTML = `
            <nav>
                <a href="/wallet">Πορτοφόλι</a>
                <a href="/wallet">Τα συμβόλαιά μου</a>
            </nav>`
        const r = actions()
        expect(r.duplicateActionCount, JSON.stringify(r.groups)).toBe(1)
        expect(r.groups[0].classification).toBe("same-nav-repeat")
    })

    it("per-row same-label buttons in separate list items are each row's control, not a page repeat", () => {
        document.body.innerHTML = `
            <ul>
                <li>Συμβόλαιο Α <button>Ανανέωση</button></li>
                <li>Συμβόλαιο Β <button>Ανανέωση</button></li>
            </ul>`
        const r = actions()
        expect(r.groups, JSON.stringify(r.groups)).toEqual([])

        // The control case: the SAME pair outside any list structure is the
        // label-keyed candidate class, tagged with its confidence.
        document.body.innerHTML = `
            <div><button>Ανανέωση</button></div>
            <div><button>Ανανέωση</button></div>`
        const flat = actions()
        expect(flat.duplicateActionCount).toBe(1)
        expect(flat.groups[0].identitySource).toBe("label")
    })

    it("two same-named submits of one form are one action twice; Save vs Delete are not", () => {
        document.body.innerHTML = `
            <form action="/api/profile">
                <button type="submit">Αποθήκευση</button>
                <button type="submit">Αποθήκευση</button>
            </form>
            <form action="/api/thing">
                <button type="submit">Αποθήκευση</button>
                <button type="submit">Διαγραφή</button>
            </form>`
        const r = actions()
        expect(r.duplicateActionCount, JSON.stringify(r.groups)).toBe(1)
        expect(r.groups[0].identitySource).toBe("form")
        expect(r.groups[0].identity).toContain("/api/profile")
    })

    it("nameless icon buttons are counted as unidentifiable, never silently dropped or force-grouped", () => {
        document.body.innerHTML = `<button></button><button></button>`
        const r = actions()
        expect(r.unidentifiable).toBe(2)
        expect(r.groups).toEqual([])
    })

    it("SERIALISATION: the collector survives Function-reconstruction (the page.evaluate path) and still fires", () => {
        document.body.innerHTML = `
            <section id="a"><button data-action="upload">Α</button></section>
            <section id="b"><button data-action="upload">Β</button></section>`
        const rebuilt = reserialised(collectDuplicateActions)
        const r = rebuilt({ assumeVisible: true })
        expect(r.duplicateActionCount).toBe(1)
    })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("countConsistency — the probe that turns it red, and the non-findings", () => {
    it("RED: one key rendering two different numbers is the §2.8 defect, with both values named", () => {
        document.body.innerHTML = `
            <section id="hero"><span data-count="portfolio.policyCount">3 ασφαλιστήρια</span></section>
            <section id="summary"><span data-count="portfolio.policyCount">4</span></section>`
        const r = counts()
        expect(r.failures, JSON.stringify(r.inconsistent)).toBe(1)
        expect(r.verdict).toBe("inconsistent")
        expect(r.inconsistent[0].key).toBe("portfolio.policyCount")
        expect(r.inconsistent[0].values.sort()).toEqual(["3", "4"])
        expect(r.inconsistent[0].renders.map((x) => x.where).sort()).toEqual(["#hero", "#summary"])
    })

    it("an uninstrumented numeral is UNMEASURABLE — and unmeasured is not a pass", () => {
        document.body.innerHTML = `
            <span data-count="portfolio.policyCount">3</span>
            <span data-count="portfolio.policyCount">3</span>
            <p>6 συμβόλαια χωρίς κάλυψη</p>`
        const r = counts()
        expect(r.failures).toBe(0)
        expect(r.unmeasurable).toHaveLength(1)
        expect(r.unmeasurable[0].text).toContain("6 συμβόλαια")
        expect(r.fullyMeasured).toBe(false)
        // The three-valued verdict is the point: zero failures here must NOT
        // read as the clean outcome.
        expect(r.verdict).toBe("consistent-but-unmeasured")
        expect(r.corroboratedKeys).toBe(1)
    })

    it("Greek thousands: «1.234» and «1234» agree; «1.235» fires", () => {
        document.body.innerHTML = `
            <span data-fact="portfolio.totalAnnualPremium">1.234</span>
            <span data-fact="portfolio.totalAnnualPremium">1234</span>
            <span data-fact="probe.other">1.234</span>
            <span data-fact="probe.other">1.235</span>`
        const r = counts()
        expect(r.failures, JSON.stringify(r.inconsistent)).toBe(1)
        expect(r.inconsistent[0].key).toBe("probe.other")
        expect(r.inconsistent[0].values.sort()).toEqual(["1234", "1235"])
        expect(r.corroboratedKeys).toBe(1)
    })

    it("«Απεριόριστα» is not a number: against a numeral it fires, against itself it agrees", () => {
        document.body.innerHTML = `
            <span data-count="entitlement.policyLimit">Απεριόριστα</span>
            <span data-count="entitlement.policyLimit">10</span>
            <span data-count="probe.limit">Απεριόριστα</span>
            <span data-count="probe.limit">Απεριόριστα</span>`
        const r = counts()
        expect(r.failures, JSON.stringify(r.inconsistent)).toBe(1)
        expect(r.inconsistent[0].values.sort()).toEqual(["10", "unlimited"])
        expect(r.corroboratedKeys).toBe(1)
    })

    it("the value is the FIRST number with dates and times stripped — «3 … έως 12/10/2026» is 3", () => {
        document.body.innerHTML = `
            <span data-count="portfolio.expiringCount">3 ασφαλιστήρια λήγουν έως 12/10/2026</span>
            <span data-count="portfolio.expiringCount">3</span>
            <span data-count="probe.win">3 λήγουν μέσα σε 30 ημέρες</span>
            <span data-count="probe.win">3</span>`
        const r = counts()
        expect(r.failures, JSON.stringify(r.inconsistent)).toBe(0)
        expect(r.corroboratedKeys).toBe(2)
    })

    it("a pure-date fact compares as a date: two spellings of one date agree, a different date fires", () => {
        document.body.innerHTML = `
            <span data-fact="policy.endDate">Λήγει 12/10/2026</span>
            <span data-fact="policy.endDate">12.10.2026</span>
            <span data-fact="probe.endDate">12/10/2026</span>
            <span data-fact="probe.endDate">13/10/2026</span>`
        const r = counts()
        expect(r.failures, JSON.stringify(r.inconsistent)).toBe(1)
        expect(r.inconsistent[0].key).toBe("probe.endDate")
        expect(r.corroboratedKeys).toBe(1)
    })

    it("«Καμία» is zero: it corroborates a 0 badge instead of reading as textual", () => {
        document.body.innerHTML = `
            <span data-count="probe.pending">Καμία εκκρεμότητα</span>
            <span data-count="probe.pending">0</span>`
        const r = counts()
        expect(r.failures).toBe(0)
        expect(r.corroboratedKeys).toBe(1)
    })

    it("subject-scoped severities are four subjects, not one contradiction — same subject still fires", () => {
        document.body.innerHTML = `
            <span data-count="gap.severityCount" data-count-subject="high">4 υψηλής</span>
            <span data-count="gap.severityCount" data-count-subject="low">3 χαμηλής</span>
            <span data-count="probe.scoped" data-count-subject="same">4</span>
            <span data-count="probe.scoped" data-count-subject="same">5</span>`
        const r = counts()
        expect(r.failures, JSON.stringify(r.inconsistent)).toBe(1)
        expect(r.inconsistent[0].key).toBe("probe.scoped")
        expect(r.inconsistent[0].subject).toBe("same")
    })

    it("a hidden element's divergent value does not fire — it is not rendered to the reader", () => {
        document.body.innerHTML = `
            <span data-count="portfolio.policyCount">3</span>
            <span data-count="portfolio.policyCount" style="display:none">4</span>`
        const r = counts()
        expect(r.failures).toBe(0)
    })

    it("currency, percent, dates, years and phones are excluded from the unmeasurable scan BY DESIGN — and tallied", () => {
        document.body.innerHTML = `
            <p>Σύνολο 150€ ετησίως</p>
            <p>Κάλυψη 85%</p>
            <p>Έως 12/10/2026</p>
            <p>© 2026 PolicyWallet</p>
            <p>Τηλέφωνο 2101234567</p>`
        const r = counts()
        expect(r.unmeasurable, JSON.stringify(r.unmeasurable)).toEqual([])
        const reasons = r.excludedByDesign.map((x) => x.reason).sort()
        expect(reasons).toEqual(["currency", "date", "percent", "phone", "year"])
    })

    it("a data-count that renders NO number is a failed reading; a textual data-fact is out of scope", () => {
        document.body.innerHTML = `
            <span data-count="portfolio.policyCount"> </span>
            <span data-fact="policy.insurer">Interamerican</span>`
        const r = counts()
        expect(r.nonComparable.map((x) => x.key)).toEqual(["portfolio.policyCount"])
        expect(r.textualFacts.map((x) => x.key)).toEqual(["policy.insurer"])
        // The failed count reading blocks fullyMeasured; the textual fact does not.
        expect(r.fullyMeasured).toBe(false)
        expect(r.verdict).toBe("consistent-but-unmeasured")
    })

    it("SERIALISATION: the collector survives Function-reconstruction (the page.evaluate path) and still fires", () => {
        document.body.innerHTML = `
            <span data-count="portfolio.policyCount">3</span>
            <span data-count="portfolio.policyCount">4</span>`
        const rebuilt = reserialised(collectCountConsistency)
        const r = rebuilt({ assumeVisible: true })
        expect(r.failures).toBe(1)
        expect(r.verdict).toBe("inconsistent")
    })
})
