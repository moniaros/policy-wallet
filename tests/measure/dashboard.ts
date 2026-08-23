/**
 * The TWO metrics this surface adds. Everything else — scroll height, sections,
 * containers, duplicate facts, tap targets, clipped labels, Latin sentences,
 * 1.4.3 and 1.4.11 — is imported from `./policy-detail` unchanged, so a metric
 * definition can never fork between the two surfaces and make their numbers
 * incomparable.
 */

import type { Page } from "@playwright/test"

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

        // (a) attribute scan — authoritative once Goal 1 instruments the page
        const byKey = new Map<string, Set<number>>()
        document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
            if (!visible(el)) return
            const key = el.getAttribute("data-count") || ""
            const n = Number((el.textContent || "").replace(/[^\d]/g, ""))
            if (!Number.isFinite(n)) return
            const set = byKey.get(key) || new Set<number>()
            set.add(n)
            byKey.set(key, set)
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
 * Internal identifiers that must never reach a customer (D5, invariant 3).
 *
 * Deliberately narrow so it cannot cry wolf: fixture-shaped identifiers, raw
 * UUIDs, and snake_case enum tokens standing alone as content. A brand name or
 * an acronym is not a leak.
 */
export async function internalTokenLeaks(page: Page): Promise<string[]> {
    return page.evaluate(() => {
        const out: string[] = []
        const shell = document.querySelector(".pw-page-shell") || document.body
        const walker = document.createTreeWalker(shell, NodeFilter.SHOW_TEXT)
        let n: Node | null
        while ((n = walker.nextNode())) {
            const el = n.parentElement
            if (!el) continue
            const cs = getComputedStyle(el)
            if (cs.display === "none" || cs.visibility === "hidden") continue
            if (el.getBoundingClientRect().width === 0) continue
            const text = (n.textContent || "").trim()
            if (!text) continue
            const hits: string[] = []
            if (/\bE2E[-\s]/i.test(text)) hits.push("E2E fixture identifier")
            // PLACEHOLDER / DRAFT / TEST content must never reach a customer.
            // Extended here rather than in a second probe so one definition
            // covers both classes: a fixture identifier and a fixture STRING are
            // the same failure — internal material rendered as product.
            if (/δοκιμαστικ\w*|υπόδειγμα|placeholder|lorem ipsum|\bTODO\b|\bFIXME\b/i.test(text)) {
                hits.push("placeholder/draft content")
            }
            if (/\bPENDING-|__[A-Z_]+__/.test(text)) hits.push("pending/sentinel marker")
            // A standalone English word like "sample"/"draft"/"test" is too
            // common to match blindly; require it to be labelling the content.
            if (/\((?:sample|draft|test|dummy)[^)]*\)/i.test(text)) hits.push("content marked as sample/draft")
            if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(text)) hits.push("UUID")
            if (/\b(?:c[a-z0-9]{24})\b/.test(text)) hits.push("cuid")
            // A bare snake_case token as content — the raw-enum class.
            if (/(?:^|\s)[a-z]+(?:_[a-z]+){1,3}(?:\s|$)/.test(text) && !/https?:|@/.test(text)) {
                hits.push("snake_case enum token")
            }
            if (hits.length) out.push(`${hits.join("+")}: "${text.slice(0, 80)}"`)
        }
        return Array.from(new Set(out))
    })
}

/**
 * CLIPPED TEXT — the dashboard's own elements.
 *
 * `clippedLabels` in ./policy-detail is imported and used unchanged, but its
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
