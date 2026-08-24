/**
 * The metrics this surface adds. Most of what a dashboard capture records —
 * scroll height, sections, containers, duplicate facts, tap targets, clipped
 * labels, Latin sentences, 1.4.3 and 1.4.11 — is imported from `./metrics`
 * (renamed from `./policy-detail`, T-011) unchanged, so a metric definition
 * can never fork between surfaces and make their numbers incomparable.
 *
 * `internalTokenLeaks` / `findInternalTokens` used to be DEFINED here, but the
 * pure predicate (leakage detection over a bare string, no DOM) needs to be
 * importable by more than this one surface — T-013's outbound-copy inventory
 * runs it against rendered email/push template strings, which never touch a
 * page. Same shared-definition argument as the file rename: it now lives in
 * `./metrics` and is re-exported here so existing callers of
 * `import { internalTokenLeaks } from "./dashboard"` need no changes.
 */

import type { Page } from "@playwright/test"

export { internalTokenLeaks, findInternalTokens } from "./metrics"

/**
 * COUNT-CONSISTENCY FAILURES.
 *
 * The dashboard states the same quantity in several places — "12 policies" in
 * the hero and "6 policies" on the renewal timeline, "6 areas" beside
 * "4 high · 7 medium · 3 low". Some of those disagreements are legitimate
 * (upcoming renewals are a subset; recommendation areas are not gap instances)
 * and some are not. A reader cannot tell which, because neither number carries
 * a label saying what it counts.
 *
 * So the metric is NOT "two numbers differ". It is: a quantity whose instances
 * disagree WITHOUT a label that explains why. That definition is what makes the
 * fix a labelling fix where both numbers are right, and an arithmetic fix only
 * where one is wrong.
 *
 * BASELINE MODE — value scan. The brief specifies `data-count="<ns>.<key>"`,
 * which is an app-code change, and Goal 0 makes none. This is resolved exactly
 * as `data-fact` was on policy-detail: the baseline scans rendered numbers and
 * their nearest label, the attribute is added in Goal 1, and BOTH are recorded
 * per capture so the two passes compare like with like. A baseline that waited
 * for instrumentation would be a baseline of an instrumented page, which is not
 * the page that shipped.
 */
export interface CountInstance {
    value: number
    /** The nearest preceding or containing text — what the reader sees it as. */
    label: string
    where: string
}

export interface CountConsistencyResult {
    /** Every number rendered on the page, with the label a reader attaches to it. */
    instances: CountInstance[]
    /** Values that appear with DIFFERENT labels — candidate disagreements. */
    disagreements: { value: number; labels: string[] }[]
    /** `data-count` keys rendering more than one distinct value (Goal 1 onward). */
    attributeDisagreements: { key: string; values: number[] }[]
    failures: number
}

export async function countConsistency(page: Page): Promise<CountConsistencyResult> {
    return page.evaluate(() => {
        const visible = (el: HTMLElement) => {
            if (/^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT|TITLE)$/.test(el.tagName)) return false
            const cs = getComputedStyle(el)
            if (cs.display === "none" || cs.visibility === "hidden") return false
            const r = el.getBoundingClientRect()
            if (r.width === 0 || r.height === 0) return false
            if (r.right <= 0 || r.bottom <= 0 || r.left >= document.documentElement.clientWidth) return false
            return true
        }

        // (a) attribute scan — authoritative once Goal 1 instruments the page.
        //
        // Two refinements from the V2-P1-11 instrumentation pass:
        //  - SUBJECT-SCOPED keys (`data-count-subject`) group by key+subject —
        //    per-branch tiles and per-severity chips legitimately render one
        //    value per subject, and grouping them by key alone would report
        //    every list as a contradiction.
        //  - The value is the FIRST integer in the element's text, not every
        //    digit concatenated: «3 λήγουν μέσα σε 30 ημέρες» is 3, not 330.
        const byKey = new Map<string, Set<number>>()
        document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
            if (!visible(el)) return
            const key = el.getAttribute("data-count") || ""
            const subject = el.getAttribute("data-count-subject")
            const groupKey = subject ? `${key}#${subject}` : key
            const firstNumber = (el.textContent || "").match(/\d+/)
            if (!firstNumber) return
            const n = Number(firstNumber[0])
            if (!Number.isFinite(n)) return
            const set = byKey.get(groupKey) || new Set<number>()
            set.add(n)
            byKey.set(groupKey, set)
        })
        const attributeDisagreements = Array.from(byKey.entries())
            .filter(([, v]) => v.size > 1)
            .map(([key, v]) => ({ key, values: Array.from(v) }))

        // (b) value scan — the honest baseline before instrumentation exists
        const instances: { value: number; label: string; where: string }[] = []
        const shell = document.querySelector(".pw-page-shell") || document.body
        shell.querySelectorAll<HTMLElement>("*").forEach((el) => {
            if (!visible(el)) return
            // PER-ROW facts are not page-level counts. Each renewal row states
            // its own countdown, each policy link its own premium; grouping
            // those by the noun they share makes every list look like a
            // contradiction. Only quantities stated ABOUT the page count here.
            if (el.closest("li, a[href^='/wallet/'], [data-row]")) return
            const own = Array.from(el.childNodes)
                .filter((n) => n.nodeType === 3)
                .map((n) => (n.textContent || "").trim())
                .join(" ")
                .trim()
            if (!own) return
            // A COUNT, not a date, a price, or a percentage: a bare integer with
            // words around it. Currency and percent signs are excluded because
            // the page legitimately states the same premium in two places and
            // that is a duplicate-fact question, not a count-consistency one.
            const m = own.match(/(?:^|\s)(\d{1,4})(?=\s|$)/)
            if (!m) return
            if (/[€%]|\d{1,2}\/\d{1,2}\/\d{4}/.test(own)) return
            const value = Number(m[1])
            if (!Number.isFinite(value)) return
            // The label the reader attaches: the rest of this element's own
            // text, else the nearest heading above it.
            let label = own.replace(m[1], "").replace(/\s+/g, " ").trim()
            if (label.length < 3) {
                const section = el.closest("section, article, div[class*='card']")
                const heading = section?.querySelector("h1,h2,h3,h4")
                label = (heading?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60)
            }
            instances.push({ value, label: label.slice(0, 60), where: el.tagName.toLowerCase() })
        })

        // Group by the NOUN the number counts, not by the whole label.
        //
        // The first version of this normalised the entire label string, so
        // «12 ασφαλιστήρια καταχωρημένα» and «6 ασφαλιστήρια» became different
        // keys and the metric reported ZERO failures on a page that states two
        // different policy counts in plain sight. A metric that cannot see the
        // defect it was written for is worse than no metric — the same mistake
        // as the 1.4.3-only contrast pass, caught here before the baseline was
        // published rather than in review.
        //
        // The noun is the longest word in the label: «ασφαλιστήρια» survives
        // both phrasings, «καταχωρημένα» is a qualifier and drops out.
        const nounOf = (label: string): string => {
            const words = label.toLowerCase().replace(/[^\p{L}\s]/gu, " ").split(/\s+/).filter((w) => w.length >= 5)
            if (!words.length) return ""
            return words.sort((a, b) => b.length - a.length)[0]
        }
        const byNoun = new Map<string, { value: number; label: string }[]>()
        for (const inst of instances) {
            const noun = nounOf(inst.label)
            if (!noun) continue
            const arr = byNoun.get(noun) || []
            arr.push({ value: inst.value, label: inst.label })
            byNoun.set(noun, arr)
        }
        const disagreements = Array.from(byNoun.entries())
            .filter(([, arr]) => new Set(arr.map((a) => a.value)).size > 1)
            .map(([noun, arr]) => ({
                value: arr[0].value,
                labels: [noun, ...arr.map((a) => `${a.value} = "${a.label}"`)],
            }))

        // ONCE THE PAGE IS INSTRUMENTED, THE ATTRIBUTES ARE THE ANSWER.
        //
        // The value scan was the honest stand-in before `data-count` existed,
        // but it can only group by the words around a number, and that grouped
        // three things that are correctly different: the protection score (it
        // sits in the same sentence as the policy count), an upsell's plan limit
        // («το Plus έχει χώρο για έως 10 ασφαλιστήρια»), and a subset that now
        // carries its own label («6 ασφαλιστήρια με επερχόμενη ανανέωση»). A
        // metric that reports those as contradictions cannot reach zero, and one
        // that cannot reach zero stops being read.
        //
        // With attributes present, a failure is what the definition always said
        // it was: ONE key rendering more than one value. The value scan is still
        // recorded, as context rather than a verdict.
        const instrumented = document.querySelectorAll("[data-count]").length > 0
        return {
            instances,
            disagreements,
            attributeDisagreements,
            failures: instrumented ? attributeDisagreements.length : disagreements.length,
        }
    })
}

/**
 * DUPLICATE-BLOCK COUNT — boilerplate proliferation.
 *
 * Distinct from duplicate FACTS (the same value in two places) and duplicate
 * ACTIONS (the same verb as two controls): this is the same PARAGRAPH rendered
 * more than once, which is what the AI disclaimer does on this page. 80
 * characters is the threshold because it excludes labels and chips while
 * catching any real sentence.
 */
export async function duplicateBlocks(
    page: Page,
    minLength = 80
): Promise<{ text: string; count: number; where: string[] }[]> {
    return page.evaluate((min: number) => {
        const byText = new Map<string, string[]>()
        const shell = document.querySelector(".pw-page-shell") || document.body
        shell.querySelectorAll<HTMLElement>("*").forEach((el) => {
            if (/^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT|TITLE)$/.test(el.tagName)) return
            const cs = getComputedStyle(el)
            if (cs.display === "none" || cs.visibility === "hidden") return
            const r = el.getBoundingClientRect()
            if (r.width === 0 || r.height === 0) return
            const own = Array.from(el.childNodes)
                .filter((n) => n.nodeType === 3)
                .map((n) => (n.textContent || "").trim())
                .join(" ")
                .replace(/\s+/g, " ")
                .trim()
            if (own.length < min) return
            const arr = byText.get(own) || []
            const section = el.closest("section, article")
            arr.push(`${section?.id ? "#" + section.id : el.tagName.toLowerCase()}`)
            byText.set(own, arr)
        })
        return Array.from(byText.entries())
            .filter(([, w]) => w.length > 1)
            .map(([text, where]) => ({ text: text.slice(0, 100), count: where.length, where }))
    }, minLength)
}

/**
 * CLIPPED TEXT — the dashboard's own elements.
 *
 * @deprecated Reconciled into `truncationFailures()` in `./metrics` (T-011),
 * which is the UNION of this function and `clippedLabels` — every element
 * this one catches (a CSS truncation class whose content is actually
 * clipped), plus the generic `scrollWidth > clientWidth` scan the other one
 * ran on a narrower selector list. Kept here, unchanged, only because
 * existing baseline captures under docs/evidence/dashboard-mobile/ record a
 * `clippedContent` field and re-running the baseline spec must keep producing
 * it for continuity. New callers should use `truncationFailures()` instead.
 *
 * `clippedLabels` in ./metrics is imported and used unchanged, but its
 * selector list was written for that surface (nav links, headings, `dt`, `th`,
 * `.pw-kicker`). The dashboard truncates in `<p>` and `<span>` carrying
 * `truncate` / `line-clamp-*`, which that list does not reach — so it reported
 * ZERO clipped labels on a capture whose 57-character insurer name is visibly
 * cut off. `innerText` returns the full string either way; only the geometry
 * shows it.
 *
 * This is additive, not a fork: the shared probe still runs, and this covers
 * what it structurally cannot see.
 */
export async function clippedContent(page: Page): Promise<string[]> {
    return page.evaluate(() => {
        const out: string[] = []
        const shell = document.querySelector(".pw-page-shell") || document.body
        shell.querySelectorAll<HTMLElement>("*").forEach((el) => {
            const cs = getComputedStyle(el)
            if (cs.display === "none" || cs.visibility === "hidden") return
            const r = el.getBoundingClientRect()
            if (r.width === 0 || r.height === 0) return
            const cls = String(el.className || "")
            const truncating =
                /\btruncate\b|\bline-clamp-\d\b/.test(cls) ||
                cs.textOverflow === "ellipsis" ||
                cs.webkitLineClamp !== "none"
            if (!truncating) return
            const horizontal = el.scrollWidth > el.clientWidth + 1
            const vertical = el.scrollHeight > el.clientHeight + 1
            if (!horizontal && !vertical) return
            const text = (el.textContent || "").trim()
            out.push(
                `${horizontal ? "clipped-h" : "clipped-v"} <${el.tagName.toLowerCase()}> ` +
                `${el.scrollWidth}/${el.clientWidth}px "${text.slice(0, 60)}"`
            )
        })
        return Array.from(new Set(out))
    })
}

/**
 * EVERY CALL TO ACTION, WITH ITS DESTINATION.
 *
 * Goal 0's ledger enumerated by SECTION and explicitly left this outstanding:
 * "needed before Goal 2 can claim one primary CTA". A count of sections cannot
 * answer "how many things is this page asking the reader to do", because a
 * single card can carry three.
 *
 * `primary` is by APPEARANCE, not intent — a control styled as the page's main
 * action is one, whatever its author meant. Two primaries is the defect: it
 * makes the reader choose which of two things is the thing to do.
 */
export interface CtaRecord {
    label: string
    href: string | null
    kind: "primary" | "secondary" | "inline" | "card"
    where: string
}

export async function callsToAction(page: Page): Promise<CtaRecord[]> {
    return page.evaluate(() => {
        const out: CtaRecord[] = []
        const shell = document.querySelector(".pw-page-shell") || document.body
        shell.querySelectorAll<HTMLElement>("a[href], button").forEach((el) => {
            const cs = getComputedStyle(el)
            if (cs.display === "none" || cs.visibility === "hidden") return
            const r = el.getBoundingClientRect()
            if (r.width === 0 || r.height === 0) return
            if (r.right <= 0 || r.left >= document.documentElement.clientWidth) return
            const label = (el.textContent || "").replace(/\s+/g, " ").trim()
            if (!label) return
            const cls = String(el.className || "")
            const kind = /pw-primary-button/.test(cls)
                ? "primary"
                : /pw-secondary-button/.test(cls)
                    ? "secondary"
                    : /pw-inline-action/.test(cls)
                        ? "inline"
                        : "card"
            const section = el.closest("section, article, [class*='pw-card']")
            const heading = section?.querySelector("h1,h2,h3,.pw-kicker")
            out.push({
                label: label.slice(0, 60),
                href: el.getAttribute("href"),
                kind: kind as CtaRecord["kind"],
                where: (heading?.textContent || section?.tagName || "?").replace(/\s+/g, " ").trim().slice(0, 40),
            })
        })
        return out
    })
}

/**
 * HOW MANY TIMES THE PAGE TALKS ABOUT COVERAGE GAPS.
 *
 * The brief calls this the "three-way gap duplication": the same findings reach
 * the reader as an attention list, as severity chips, and again inside the
 * protection plan. Each is a different SHAPE of the same underlying set, and
 * none of them says it is the same set — so a reader counting them believes
 * they have three separate problems to work through.
 *
 * Counted by the containers that render gap-derived content, not by words.
 */
export async function gapSurfaces(page: Page): Promise<string[]> {
    return page.evaluate(() => {
        const shell = document.querySelector(".pw-page-shell") || document.body
        const matches: HTMLElement[] = []
        shell.querySelectorAll<HTMLElement>("section, article, [class*='pw-card']").forEach((el) => {
            const cs = getComputedStyle(el)
            if (cs.display === "none" || el.getBoundingClientRect().height === 0) return
            // innerText, NOT textContent. textContent includes the contents of a
            // CLOSED <details>, so the hero counted as a gap surface on the
            // strength of a delta the reader cannot see until they open the
            // score disclosure. The question is where findings are RENDERED.
            const text = (el.innerText || "").replace(/\s+/g, " ")
            // Gap-derived vocabulary: the severity ladder, the gaps kicker, and
            // the attention framing all describe findings from the same engine.
            // RENDERS findings, not merely LINKS to them. «Ελέγξτε τα κενά
            // κάλυψης» is a setup step pointing at the gaps page; it does not
            // restate a single finding, and counting it made the plan look like
            // a third copy of the list when it was a signpost. A surface that
            // renders findings carries the severity ladder or the attention
            // framing with them.
            if (!/υψηλ[ήής]|μέτρι[αοη]|χαμηλ[άήό]|προτεραιότητα|χρειάζεται την προσοχή/i.test(text)) return
            matches.push(el)
        })

        // INNERMOST ONLY. Goal 2 grouped the page into `section[id]` blocks, and
        // a section that WRAPS a gap surface matched too — so the restructure
        // read as 4 surfaces becoming 5 when nothing had been added. An ancestor
        // of a match is the same surface seen from further out, not another one.
        const innermost = matches.filter((el) => !matches.some((other) => other !== el && el.contains(other)))

        const hits: string[] = []
        for (const el of innermost) {
            const heading = el.querySelector("h1,h2,h3,.pw-kicker")
            const name = (heading?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 44)
            if (name && !hits.includes(name)) hits.push(name)
        }
        return hits
    })
}
