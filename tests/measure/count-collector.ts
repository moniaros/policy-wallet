/**
 * COUNT CONSISTENCY — §11 metric 8, the one definition, shared by two runtimes.
 *
 * v2's headline defect (DECISIONS.md D-025: "§2.8, five surfaces"): the same
 * underlying quantity rendered as two different numbers — «3 ασφαλιστήρια» on
 * one surface, «4» on another, no way for the reader to tell which is true.
 *
 * `collectCountConsistency` is SELF-CONTAINED (no imports, no outer
 * references) for the same reason `collectSections` is: it runs both under
 * Playwright (`metrics.ts#countConsistency` serialises it into the browser
 * via `page.evaluate`) and directly under jsdom (the probe in
 * phase5-metrics-probe.test.ts, which also re-runs it through a
 * `new Function(...)` reconstruction to prove the serialisation holds).
 *
 * ── THE RULE ───────────────────────────────────────────────────────────────
 *
 * The instrumentation vocabulary IS the identity of a quantity:
 * `data-count="<ns>.<key>"` marks a cardinality, `data-fact="<ns>.<key>"`
 * marks any other fact (lib/instrumentation/count-keys.ts). BOTH channels are
 * read — the plan splits counts from other quantities, but a key rendering
 * two values is the defect on either channel. Elements are grouped by
 * key + subject (`data-count-subject` / `data-fact-subject`, exactly the
 * discipline `duplicateFacts` uses: a per-severity chip renders one value per
 * subject legitimately, and grouping by key alone would report every list as
 * a contradiction). A group whose extracted values contain more than one
 * distinct member is INCONSISTENT.
 *
 * ── WHERE THIS DIFFERS FROM dashboard.ts#countConsistency ──────────────────
 *
 * That function is the dashboard surface's baseline-era scan: it reads
 * `data-count` only, plus a label-noun value scan whose false-positive
 * classes are documented inside it. It stays as-is because committed baseline
 * captures depend on its exact output shape (the clippedContent precedent).
 * THIS is the shared §11 metric: both attribute channels, honest
 * unmeasurable reporting, no noun heuristics as a verdict.
 *
 * ── UNMEASURABLE IS NOT CONSISTENT ─────────────────────────────────────────
 *
 * A count rendered WITHOUT instrumentation cannot be compared to anything, so
 * it is reported under `unmeasurable`, and a page with unmeasured numerals
 * can never read as a clean pass: the verdict is three-valued
 * ("inconsistent" / "consistent-but-unmeasured" /
 * "consistent-and-fully-measured") precisely so absence of a finding cannot
 * masquerade as one — the failure shape this programme has documented on
 * three surfaces (CLAUDE.md, "Absence of a detected problem is not evidence
 * of no problem"). `corroboratedKeys` is reported for the same reason: a key
 * rendered once is only vacuously consistent, and a caller should be able to
 * see how much of "consistent" is corroboration and how much is silence.
 *
 * ── VALUE EXTRACTION (each decision stated) ────────────────────────────────
 *
 *  - «Απεριόριστα» / "unlimited" / "∞" is NOT a number: it becomes the
 *    canonical token `unlimited`. Two unlimiteds agree; `unlimited` vs `10`
 *    on one key is a real inconsistency and fires.
 *  - Greek zero-words: «καμία/κανένα/κανένας/καμιά» standing in an
 *    instrumented element canonicalise to `0` — «Καμία εκκρεμότητα» and a
 *    `0` badge are the same fact.
 *  - Thousands separators: Greek writes 1.234 for 1234. A dot is a
 *    thousands separator ONLY between strict 3-digit groups; a decimal COMMA
 *    may follow («1.234,56» → 1234.56). So «1.234» and «1234» agree, and
 *    «1.234» vs «1.235» fires.
 *  - «3» inside a longer string: the value is the FIRST number token of the
 *    element's text with date and time tokens stripped first —
 *    «3 λήγουν μέσα σε 30 ημέρες» is 3, not 30 and not 330, and
 *    «3 ασφαλιστήρια λήγουν έως 12/10/2026» is 3, not 12. The attribute
 *    marks the element that renders THE value (plan rule 1), so the first
 *    number after stripping is the fact by construction.
 *  - Dates: an instrumented element whose text is ONLY a date
 *    (policy.endDate rendered «Λήγει 12/10/2026») compares as a canonical
 *    date token (leading zeros dropped, `/` and `.` separators unified), so
 *    two spellings of one date agree and two different dates fire.
 *  - Signs: «+3» / «−3» (minus sign or hyphen) are kept — timeline.scoreDelta
 *    is a signed fact.
 *  - An instrumented element from which NO value can be extracted: the
 *    CHANNEL decides what that means. `data-count` marks a cardinality by
 *    definition, so a count render with no extractable number is a FAILED
 *    READING — it goes to `nonComparable` and counts against
 *    `fullyMeasured`. `data-fact` legitimately carries textual facts
 *    (policy.insurer, policy.status), so a fact group with no numeric render
 *    AT ALL is `textualFacts` — reported, out of this metric's scope (its
 *    render-site duplication is duplicateFacts territory), and NOT counted
 *    against `fullyMeasured`. A fact group where SOME renders extract a value
 *    and others do not is a numeric fact that failed to read somewhere: the
 *    blank renders go to `nonComparable`.
 *
 * ── THE UNMEASURABLE SCAN — what it includes and what it deliberately skips
 *
 * Every visible element's OWN text (direct text nodes, so an ancestor chain
 * is not reported once per level — the duplicateFacts convention) is scanned
 * for count-shaped numerals outside any `[data-count]`/`[data-fact]`
 * element. Excluded BY DESIGN, each tallied in `excludedByDesign` so the
 * exclusions themselves are visible:
 *  - currency amounts (€ / EUR adjacent) — an uninstrumented premium is a
 *    duplicate-fact / instrumentation-coverage question, not a count;
 *  - percentages — same reasoning (scores carry fact keys when instrumented);
 *  - date-shaped and time-shaped tokens;
 *  - standalone years 19xx/20xx (© lines, vintages);
 *  - 10-digit Greek phone numbers (the nonTelPhoneNumbers probe's domain);
 *  - numerals of 5+ digits (identifiers and amounts, not counts — counts on
 *    these surfaces are ≤4 digits, the bound dashboard.ts also chose).
 * A number+«ημέρες» phrase is deliberately NOT excluded: an uninstrumented
 * day-count is exactly the §2.8 countdown-disagreement class, and a
 * hardcoded «30 ημέρες» window is still a quantity this metric cannot vouch
 * for. That produces some noise on static copy; noise in a report list is
 * honest, silence is not.
 *
 * ── BLIND SPOTS ────────────────────────────────────────────────────────────
 *  1. Two renders instrumented with DIFFERENT keys for the same real-world
 *    quantity do not compare — the registry guard
 *    (count-instrumentation-registry.test.tsx) owns vocabulary discipline,
 *    not this scan.
 *  2. A count rendered as a WORD («τρία ασφαλιστήρια») extracts nothing and
 *    lands in nonComparable/unmeasurable rather than comparing as 3.
 *  3. The unmeasurable scan cannot tell a count from an arbitrary numeral
 *    (a step number, a version); it reports candidates for a human, it does
 *    not gate.
 *  3b. The collector cannot know from the DOM alone whether a data-fact key
 *    is MEANT to be numeric (the registry knows, but this function must stay
 *    import-free to serialise) — so a numeric fact key whose every render
 *    failed to produce a number reads as textual, not as a failed reading.
 *    A stray digit inside a genuinely textual fact ("AIG 2000") also
 *    extracts as a value; both sides of the channel rule are approximations.
 *  4. Visibility parity with section-collector: opacity:0 / transform-hidden
 *     elements still count (shared discipline; see action-collector note 4).
 */

export interface CountConsistencyOptions {
    /** jsdom has no layout — every rect is 0×0. See collectSections. */
    assumeVisible?: boolean
}

export interface CountRender {
    text: string
    where: string
    channel: "count" | "fact"
    /** canonical extracted value, or null when nothing was extractable */
    value: string | null
}

export interface InconsistentCountKey {
    key: string
    /** "" when the key is unscoped */
    subject: string
    /** the competing canonical values */
    values: string[]
    renders: CountRender[]
}

export interface CountConsistencyMetricResult {
    /** distinct key+subject groups seen on the page */
    totalKeys: number
    /** groups with at least one extractable value */
    comparableKeys: number
    /** groups with ≥2 renders whose values AGREE — non-vacuous consistency */
    corroboratedKeys: number
    inconsistent: InconsistentCountKey[]
    /**
     * Failed readings: a data-count render with no extractable number, or a
     * blank render inside an otherwise-numeric data-fact group. Counts
     * against fullyMeasured.
     */
    nonComparable: { key: string; subject: string; texts: string[] }[]
    /**
     * data-fact groups with no numeric render at all — textual facts, out of
     * this metric's scope, reported so nothing vanishes silently.
     */
    textualFacts: { key: string; subject: string; texts: string[] }[]
    /** count-shaped numerals rendered with no instrumentation — not comparable, NOT a pass */
    unmeasurable: { text: string; where: string }[]
    /** numerals the unmeasurable scan skipped on purpose, tallied by reason */
    excludedByDesign: { reason: string; count: number }[]
    /** inconsistent.length — the gated number */
    failures: number
    fullyMeasured: boolean
    verdict: "inconsistent" | "consistent-but-unmeasured" | "consistent-and-fully-measured"
}

export function collectCountConsistency(opts?: CountConsistencyOptions): CountConsistencyMetricResult {
    const assumeVisible = !!(opts && opts.assumeVisible)

    // The section-collector visibility discipline, verbatim (copied, not
    // imported — both functions must serialise standalone; change both or
    // neither).
    const visible = (el: Element): boolean => {
        const cs = getComputedStyle(el as HTMLElement)
        if (cs.display === "none" || cs.visibility === "hidden") return false
        if (assumeVisible) return true
        const r = (el as HTMLElement).getBoundingClientRect()
        if (r.width <= 0 || r.height <= 0) return false
        if (r.right <= 0 || r.bottom <= 0 || r.left >= document.documentElement.clientWidth) return false
        return true
    }

    const whereOf = (el: Element): string => {
        const sec = el.closest("section[id]")
        if (sec) return "#" + (sec as HTMLElement).id
        if (el.closest("nav")) return "nav"
        if (el.closest("aside")) return "aside"
        return "top"
    }

    const DATE_RE = /\b\d{1,2}[./]\d{1,2}[./]\d{2,4}\b/
    const TIME_RE = /\b\d{1,2}:\d{2}\b/

    /** Canonical value of an instrumented element's text, or null. */
    const valueOf = (raw: string): string | null => {
        const text = raw.replace(/\s+/g, " ").trim()
        if (!text) return null
        if (/απεριόριστ|unlimited|∞/i.test(text)) return "unlimited"
        // NOT \b: JS word boundaries are ASCII-only, so Greek text never has
        // one — \b(καμία)\b matches NOTHING. Unicode property escapes instead.
        if (/(?:^|\P{L})(καμία|καμιά|κανένα|κανένας|καμμία)(?!\p{L})/iu.test(text)) return "0"
        // Numbers, with date/time tokens stripped first so «έως 12/10/2026»
        // cannot donate a 12.
        const stripped = text.replace(new RegExp(DATE_RE.source, "g"), " ").replace(new RegExp(TIME_RE.source, "g"), " ")
        const num = stripped.match(/([+\-−]?)(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?/)
        if (num) {
            const sign = num[1] === "−" ? "-" : num[1] === "+" ? "" : num[1]
            const intPart = num[2].replace(/\./g, "")
            return sign + intPart + (num[3] ? "." + num[3] : "")
        }
        // No number left — a pure date is itself the fact (policy.endDate).
        const date = text.match(/\b(\d{1,2})[./](\d{1,2})[./](\d{2,4})\b/)
        if (date) return "date:" + Number(date[1]) + "/" + Number(date[2]) + "/" + Number(date[3])
        return null
    }

    // ── (a) the attribute scan — the metric proper ──────────────────────────
    interface Group {
        key: string
        subject: string
        renders: CountRender[]
    }
    const groupsByComposite = new Map<string, Group>()

    const record = (el: HTMLElement, channel: "count" | "fact") => {
        const attr = channel === "count" ? "data-count" : "data-fact"
        const key = el.getAttribute(attr) || ""
        if (!key) return
        const subject = el.getAttribute(attr + "-subject") || ""
        const composite = channel + "\u0000" + key + "\u0000" + subject
        const text = (el.textContent || "").replace(/\s+/g, " ").trim()
        const g = groupsByComposite.get(composite) || { key, subject, renders: [] }
        g.renders.push({ text: text.slice(0, 80), where: whereOf(el), channel, value: valueOf(text) })
        groupsByComposite.set(composite, g)
    }

    document.querySelectorAll<HTMLElement>("[data-count], [data-fact]").forEach((el) => {
        if (!visible(el)) return
        if (el.hasAttribute("data-count")) record(el, "count")
        if (el.hasAttribute("data-fact")) record(el, "fact")
    })

    const inconsistent: InconsistentCountKey[] = []
    const nonComparable: { key: string; subject: string; texts: string[] }[] = []
    const textualFacts: { key: string; subject: string; texts: string[] }[] = []
    let comparableKeys = 0
    let corroboratedKeys = 0

    for (const g of groupsByComposite.values()) {
        const values = g.renders.map((r) => r.value).filter((v): v is string => v !== null)
        const blank = g.renders.filter((r) => r.value === null)
        if (blank.length) {
            // The channel decides (see header): a blank COUNT render, or a
            // blank render inside an otherwise-numeric fact group, is a
            // failed reading; an all-blank FACT group is a textual fact.
            const channel = g.renders[0].channel
            if (channel === "count" || values.length > 0) {
                nonComparable.push({ key: g.key, subject: g.subject, texts: blank.map((r) => r.text) })
            } else {
                textualFacts.push({ key: g.key, subject: g.subject, texts: blank.map((r) => r.text) })
            }
        }
        if (!values.length) continue
        comparableKeys++
        const distinct = Array.from(new Set(values))
        if (distinct.length > 1) {
            inconsistent.push({ key: g.key, subject: g.subject, values: distinct, renders: g.renders })
        } else if (values.length >= 2) {
            corroboratedKeys++
        }
    }

    // ── (b) the unmeasurable scan — what the metric CANNOT vouch for ────────
    const excludedTally = new Map<string, number>()
    const skip = (reason: string, n: number) => {
        if (n > 0) excludedTally.set(reason, (excludedTally.get(reason) || 0) + n)
    }
    const countTokens = (s: string, re: RegExp): number => (s.match(re) || []).length

    const unmeasurable: { text: string; where: string }[] = []
    const UNMEASURABLE_CAP = 100
    let unmeasurableOverflow = 0

    document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
        if (/^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT|TITLE)$/.test(el.tagName)) return
        if (!visible(el)) return
        // The element that renders the value carries the attribute (plan rule
        // 1), so anything inside an instrumented element is measured.
        if (el.closest("[data-count], [data-fact]")) return
        // OWN text only — direct text nodes — so an ancestor chain is not
        // reported once per level.
        const own = Array.prototype.slice
            .call(el.childNodes)
            .filter((n: Node) => n.nodeType === 3)
            .map((n: Node) => (n.textContent || "").trim())
            .join(" ")
            .replace(/\s+/g, " ")
            .trim()
        if (!own || !/\d/.test(own)) return

        // Deliberate exclusions, each tallied so the skipping is visible.
        let s = own
        const currencyRe = /(?:€\s*\d[\d.,]*|\d[\d.,]*\s*€|\d[\d.,]*\s*EUR\b)/g
        skip("currency", countTokens(s, currencyRe))
        s = s.replace(currencyRe, " ")
        const percentRe = /\d+(?:[.,]\d+)?\s*%/g
        skip("percent", countTokens(s, percentRe))
        s = s.replace(percentRe, " ")
        const dateRe = new RegExp(DATE_RE.source, "g")
        skip("date", countTokens(s, dateRe))
        s = s.replace(dateRe, " ")
        const timeRe = new RegExp(TIME_RE.source, "g")
        skip("time", countTokens(s, timeRe))
        s = s.replace(timeRe, " ")
        const phoneRe = /(?:^|\D)(2\d{2}\s?\d{3}\s?\d{4}|2\d{9}|69\d{8})(?=\D|$)/g
        skip("phone", countTokens(s, phoneRe))
        s = s.replace(phoneRe, " ")
        const longRe = /\d{5,}/g
        skip("long-numeral", countTokens(s, longRe))
        s = s.replace(longRe, " ")
        const yearRe = /\b(?:19|20)\d{2}\b/g
        skip("year", countTokens(s, yearRe))
        s = s.replace(yearRe, " ")

        if (!/\d/.test(s)) return
        if (unmeasurable.length >= UNMEASURABLE_CAP) {
            unmeasurableOverflow++
            return
        }
        unmeasurable.push({ text: own.slice(0, 80), where: whereOf(el) })
    })
    if (unmeasurableOverflow > 0) skip("over-cap-not-listed", unmeasurableOverflow)

    const failures = inconsistent.length
    const fullyMeasured = unmeasurable.length === 0 && unmeasurableOverflow === 0 && nonComparable.length === 0
    const verdict: CountConsistencyMetricResult["verdict"] =
        failures > 0
            ? "inconsistent"
            : fullyMeasured
                ? "consistent-and-fully-measured"
                : "consistent-but-unmeasured"

    return {
        totalKeys: groupsByComposite.size,
        comparableKeys,
        corroboratedKeys,
        inconsistent,
        nonComparable,
        textualFacts,
        unmeasurable,
        excludedByDesign: Array.from(excludedTally.entries()).map(([reason, count]) => ({ reason, count })),
        failures,
        fullyMeasured,
        verdict,
    }
}
