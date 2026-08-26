/**
 * DUPLICATE ACTIONS — §11 metric 7, the one definition, shared by two runtimes.
 *
 * The defect: the same ACTION offered to the reader more than once on one
 * page — two «Ανεβάστε συμβόλαιο» buttons, or a CTA repeated in a card and
 * again in a sticky bar. INSTRUMENTATION-PLAN.md states why this is its own
 * metric and not duplicate-facts: "one quote CTA rendered three times is one
 * duplicated action, not three duplicated facts, and the fix is different
 * (consolidate the call to action, versus link the second render site to the
 * first)."
 *
 * `collectDuplicateActions` is SELF-CONTAINED (no imports, no outer
 * references) for the same reason `collectSections` is: it runs both under
 * Playwright (`metrics.ts#duplicateActions` serialises the function source
 * into the browser via `page.evaluate`) and directly under jsdom (the probe
 * in phase5-metrics-probe.test.ts, which also re-runs it through a
 * `new Function(...)` reconstruction to prove the serialisation holds). A
 * closed-over helper would compile here and throw ReferenceError in the
 * browser on first real use.
 *
 * ── WHAT IDENTIFIES "THE SAME ACTION" — the rule, and why ──────────────────
 *
 * Neither label nor destination alone survives the brief's own examples: two
 * buttons with different labels going to the same place ARE one action; two
 * identically-labelled buttons going to different places are NOT. So identity
 * is resolved per element, best evidence first:
 *
 *   1. `data-action="<verb>"` — the repo's ratified instrumentation channel
 *      (INSTRUMENTATION-PLAN.md "Action verbs"). When the author has said
 *      what the action IS, that statement wins over any inference.
 *   2. `href` for links — the destination, normalised (same-origin reduced to
 *      path+query+hash, trailing slash trimmed). Destination is the action
 *      for navigation: labels are wording, the place is the act. `#`-only and
 *      `javascript:` hrefs carry no destination and fall through to 4.
 *   3. Form submission for submit controls — the form's action URL PLUS the
 *      control's accessible name. Destination alone over-merges here: one
 *      form legitimately carries «Αποθήκευση» and «Διαγραφή» submitting the
 *      same URL, distinguished only by the button. Two same-named submits to
 *      the same action are one action twice.
 *   4. Accessible name for handler-only buttons — the DOM cannot see where a
 *      click handler goes, so the label is ALL the evidence there is. These
 *      groups carry `identitySource: "label"` so a reader knows the
 *      confidence class: a same-label pair reported here is a candidate, not
 *      a proof. The converse gap is structural and stated below under BLIND
 *      SPOTS: two differently-labelled handler buttons doing the same thing
 *      are invisible to any DOM scan.
 *
 * An element with no name at all under rule 4 (icon button with no
 * aria-label) cannot be identified and is counted under `unidentifiable`
 * rather than silently dropped — an unnameable control is an accessibility
 * defect for another metric, but here it is a reading the instrument could
 * not take, and those are always reported as such (the 1.4.11 sampler's
 * rule).
 *
 * ── SUBJECT SCOPING — a row's control is not a page-level repeat ───────────
 *
 * A wallet of 29 policies renders 29 «Προβολή» controls legitimately — 29
 * different subjects, exactly the lesson `duplicateFacts` learned from
 * `data-fact-subject`. Scope resolution, best evidence first:
 *   - `data-action-subject` on the element or an ancestor (the analogue of
 *     the ratified `data-fact-subject` discipline);
 *   - else the nearest repeated-structure item ancestor: `li`, `tr`,
 *     `[data-row]`, or `[data-testid="policy-card"]` — the last is not a
 *     hand-guessed selector but THE row hook `duplicateIdentityRows` already
 *     documents as the one hook both wallet renderers carry.
 * Each item element is its own subject, so repetition ACROSS items never
 * groups. The cost is stated under BLIND SPOTS: a genuine page-level
 * duplicate that happens to sit inside two different list items is excused.
 *
 * ── VISIBILITY — the section-collector discipline, not a second one ────────
 *
 * A repeated action does NOT count when an instance is one the customer
 * cannot perceive or operate: the defect is the same choice VISIBLY offered
 * twice, and a drawer's off-canvas copy of the tab bar is one nav rendered
 * two ways, not two offers. The visibility test is the same rule
 * `collectSections` uses (display/visibility always; zero-size and off-canvas
 * geometry unless `assumeVisible`, which jsdom callers pass because every
 * jsdom rect is 0×0). It is COPIED, not imported, because both functions must
 * serialise standalone — if you change one, change the other. On top of the
 * perceivability rule, an instance is not an OFFER when it is `inert`, inside
 * `aria-hidden="true"`, or disabled; those are excluded from grouping and
 * tallied under `excluded` by reason, so nothing vanishes silently.
 *
 * ── NAVIGATION IS (BY DEFAULT) NOT DUPLICATION — configurable ──────────────
 *
 * A tab bar and a page CTA both reaching /wallet/add may be deliberate: the
 * shell offers standing navigation, the page offers the moment's action. So
 * groups are classified by where their instances sit (`nav` = inside a
 * semantic navigation container: `nav`, `[role="navigation"]`,
 * `[role="tablist"]`, `[role="menubar"]`; `content` = anywhere else) and the
 * default `navPolicy: "separate"` GATES only:
 *   - `content-repeat` — the page's own content offers it ≥2 times;
 *   - `same-nav-repeat` — ONE nav element offers it ≥2 times (a tab bar
 *     listing the same destination twice is a defect in anyone's reading).
 * and REPORTS without gating:
 *   - `nav-overlap`  — once in content, again in navigation;
 *   - `cross-nav`    — in two different navs (header + footer linking
 *     /support is a convention, not a defect).
 * `navPolicy: "count"` gates all four, for a caller who wants the strict
 * reading rather than this default. The choice is data either way — every
 * group is in `groups` with its classification; only `duplicateActionCount`
 * moves.
 *
 * ── ENUMERATION ────────────────────────────────────────────────────────────
 * Candidates are every element matching the DOM's own command semantics —
 * `a[href]`, `button`, `[role="button"]`, `input[type=submit|button]` — over
 * the whole document, never a curated list of app selectors. `summary` is
 * deliberately NOT a candidate: it toggles its own disclosure, so two
 * summaries are two disclosures, not one action twice.
 *
 * ── BLIND SPOTS (what this metric cannot see — silent gaps read as coverage)
 *   1. Two handler-only buttons with DIFFERENT labels doing the same thing:
 *      no DOM evidence links them. Only `data-action` instrumentation makes
 *      that pair visible — which is an argument for instrumenting, not for
 *      pretending the scan sees it.
 *   2. Same-label handler buttons repeated across DIV-based card lists (no
 *      li/tr/[data-row] ancestor): they group as a duplicate even when each
 *      card is a different subject. False-positive class, tagged
 *      `identitySource: "label"` so it is reviewable; the fix is
 *      `data-action` + `data-action-subject` on the cards.
 *   3. A genuine page-level duplicate sitting inside two different list
 *      items is excused by subject scoping (stated trade-off above).
 *   4. Visibility parity with section-collector means opacity:0 and
 *      transform-offscreen instances still count as offers — the shared
 *      discipline does not test those, and inventing a stricter test here
 *      would fork it.
 *   5. A link and a button that reach the same place through different
 *      mechanisms (href vs router.push in a handler) do not group — the
 *      handler's destination is invisible (see 1).
 */

export interface DuplicateActionsOptions {
    /** jsdom has no layout — every rect is 0×0. See collectSections. */
    assumeVisible?: boolean
    /**
     * "separate" (default): nav-overlap / cross-nav groups are reported but
     * not gated. "count": every group of ≥2 offers gates.
     */
    navPolicy?: "separate" | "count"
}

export type ActionIdentitySource = "data-action" | "href" | "form" | "label"

export type ActionGroupClassification =
    | "content-repeat"
    | "same-nav-repeat"
    | "nav-overlap"
    | "cross-nav"

export interface ActionInstanceRecord {
    label: string
    href: string | null
    region: "nav" | "content"
    where: string
}

export interface DuplicateActionGroup {
    identity: string
    identitySource: ActionIdentitySource
    /** "" when unscoped; "s:<id>" or "item:<n>" when subject-scoped. */
    subject: string
    count: number
    contentCount: number
    navCount: number
    classification: ActionGroupClassification
    /** Whether this group counts toward duplicateActionCount under the active navPolicy. */
    gated: boolean
    instances: ActionInstanceRecord[]
}

export interface DuplicateActionsResult {
    /** Every command element found, before any filtering. */
    totalCandidates: number
    /** Instances that are actually OFFERED (visible, operable) and identified. */
    offeredInstances: number
    /** Instances removed before grouping, tallied by reason — nothing vanishes silently. */
    excluded: { reason: string; count: number }[]
    /** Offered instances with no derivable identity (nameless handler buttons). */
    unidentifiable: number
    /** Every identity offered more than once, whatever its classification. */
    groups: DuplicateActionGroup[]
    /** The gated total: groups that count as the duplicate-action defect. */
    duplicateActionCount: number
    /** Reported-not-gated groups under the default policy. */
    navOverlapCount: number
    navPolicy: "separate" | "count"
}

export function collectDuplicateActions(opts?: DuplicateActionsOptions): DuplicateActionsResult {
    const assumeVisible = !!(opts && opts.assumeVisible)
    const navPolicy: "separate" | "count" = opts && opts.navPolicy === "count" ? "count" : "separate"

    // The section-collector visibility discipline appears INLINE in the
    // candidate loop below rather than as the usual `visible()` helper —
    // same rule, same order, same thresholds (copied, not imported: both
    // functions must serialise standalone; change both or neither) — because
    // this metric additionally promises that every exclusion is TALLIED by
    // reason, and a boolean helper cannot say which arm rejected.

    const NAV_SEL = 'nav, [role="navigation"], [role="tablist"], [role="menubar"]'
    const ITEM_SEL = 'li, tr, [data-row], [data-testid="policy-card"]'

    const whereOf = (el: Element): string => {
        const sec = el.closest("section[id]")
        if (sec) return "#" + (sec as HTMLElement).id
        if (el.closest(NAV_SEL)) return "nav"
        if (el.closest("aside")) return "aside"
        return "top"
    }

    const accessibleName = (el: HTMLElement): string => {
        const aria = el.getAttribute("aria-label")
        if (aria && aria.trim()) return aria.trim()
        const labelledBy = el.getAttribute("aria-labelledby")
        if (labelledBy) {
            const parts = labelledBy
                .split(/\s+/)
                .map((id) => {
                    const ref = document.getElementById(id)
                    return ref ? (ref.textContent || "").trim() : ""
                })
                .filter(Boolean)
            if (parts.length) return parts.join(" ")
        }
        const text = (el.textContent || "").trim()
        if (text) return text
        const title = el.getAttribute("title")
        if (title && title.trim()) return title.trim()
        const value = el.getAttribute("value")
        if (value && value.trim()) return value.trim()
        return ""
    }
    const normName = (s: string): string => s.replace(/\s+/g, " ").trim().toLowerCase()

    const normPath = (p: string): string => (p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p)
    const hrefIdentity = (raw: string): string | null => {
        const trimmed = raw.trim()
        // No destination: same-page fragment or script pseudo-URL.
        if (trimmed === "" || trimmed.startsWith("#") || /^javascript:/i.test(trimmed)) return null
        try {
            const u = new URL(trimmed, document.baseURI)
            if (u.origin === location.origin) return "href:" + normPath(u.pathname) + u.search + u.hash
            return "href:" + u.href
        } catch {
            return "href:" + trimmed
        }
    }

    // Repeated-structure items in document order, so each gets a stable index
    // that serves as its subject.
    const items = Array.prototype.slice.call(document.querySelectorAll(ITEM_SEL)) as Element[]
    const subjectOf = (el: Element): string => {
        const scoped = el.closest("[data-action-subject]")
        if (scoped) return "s:" + (scoped.getAttribute("data-action-subject") || "")
        const item = el.closest(ITEM_SEL)
        if (!item) return ""
        return "item:" + items.indexOf(item)
    }

    interface Working {
        identity: string
        identitySource: ActionIdentitySource
        subject: string
        label: string
        href: string | null
        region: "nav" | "content"
        where: string
        navEl: Element | null
    }

    const CANDIDATE_SEL = 'a[href], button, [role="button"], input[type="submit"], input[type="button"]'
    const candidates = Array.prototype.slice.call(
        document.querySelectorAll(CANDIDATE_SEL)
    ) as HTMLElement[]

    const excludedTally = new Map<string, number>()
    const exclude = (reason: string) => excludedTally.set(reason, (excludedTally.get(reason) || 0) + 1)

    const offered: Working[] = []
    let unidentifiable = 0

    for (const el of candidates) {
        // Perceivability first (the shared discipline), then operability.
        const cs = getComputedStyle(el)
        if (cs.display === "none" || cs.visibility === "hidden") {
            exclude("hidden")
            continue
        }
        if (!assumeVisible) {
            const r = el.getBoundingClientRect()
            if (r.width <= 0 || r.height <= 0) {
                exclude("zero-size")
                continue
            }
            if (r.right <= 0 || r.bottom <= 0 || r.left >= document.documentElement.clientWidth) {
                exclude("off-canvas")
                continue
            }
        }
        if (el.closest('[aria-hidden="true"]')) {
            exclude("aria-hidden")
            continue
        }
        if (el.closest("[inert]")) {
            exclude("inert")
            continue
        }
        if (
            (el as HTMLButtonElement).disabled === true ||
            el.getAttribute("aria-disabled") === "true"
        ) {
            exclude("disabled")
            continue
        }
        // An ancestor command element (a button wrapped in a link) would count
        // the same offer twice from one rendered control.
        if (el.parentElement && el.parentElement.closest(CANDIDATE_SEL)) {
            exclude("nested-in-command")
            continue
        }

        const name = accessibleName(el)
        const rawHref = el.tagName === "A" ? el.getAttribute("href") : null

        let identity: string | null = null
        let identitySource: ActionIdentitySource = "label"

        const verb = el.getAttribute("data-action")
        if (verb && verb.trim()) {
            identity = "action:" + verb.trim()
            identitySource = "data-action"
        } else if (rawHref !== null) {
            const h = hrefIdentity(rawHref)
            if (h !== null) {
                identity = h
                identitySource = "href"
            }
        }
        if (identity === null) {
            // Submit controls: form action + accessible name (see header —
            // destination alone merges «Αποθήκευση» with «Διαγραφή»).
            const asInput = el as HTMLInputElement
            const isSubmit =
                typeof asInput.form !== "undefined" &&
                asInput.form !== null &&
                (el.getAttribute("type") === "submit" ||
                    (el.tagName === "BUTTON" && !el.getAttribute("type")))
            if (isSubmit && asInput.form) {
                const action =
                    el.getAttribute("formaction") || asInput.form.getAttribute("action") || "(self)"
                identity = "form:" + action + "#" + normName(name)
                identitySource = "form"
            }
        }
        if (identity === null) {
            const n = normName(name)
            if (!n) {
                unidentifiable++
                continue
            }
            identity = "label:" + n
            identitySource = "label"
        }

        const navEl = el.closest(NAV_SEL)
        offered.push({
            identity,
            identitySource,
            subject: subjectOf(el),
            label: name.replace(/\s+/g, " ").trim().slice(0, 60),
            href: rawHref,
            region: navEl ? "nav" : "content",
            where: whereOf(el),
            navEl,
        })
    }

    // Group by identity + subject (the duplicateFacts composite convention).
    const byGroup = new Map<string, Working[]>()
    for (const inst of offered) {
        const key = inst.identity + " " + inst.subject
        const arr = byGroup.get(key) || []
        arr.push(inst)
        byGroup.set(key, arr)
    }

    const groups: DuplicateActionGroup[] = []
    for (const arr of byGroup.values()) {
        if (arr.length < 2) continue
        const contentCount = arr.filter((i) => i.region === "content").length
        const navCount = arr.length - contentCount

        let classification: ActionGroupClassification
        if (contentCount >= 2) {
            classification = "content-repeat"
        } else {
            // ≥2 instances inside the SAME nav element is a defect in any
            // reading; two different navs sharing a link is a convention.
            const navCounts = new Map<Element, number>()
            for (const i of arr) {
                if (i.navEl) navCounts.set(i.navEl, (navCounts.get(i.navEl) || 0) + 1)
            }
            const sameNavRepeat = Array.from(navCounts.values()).some((n) => n >= 2)
            if (sameNavRepeat) classification = "same-nav-repeat"
            else if (contentCount >= 1) classification = "nav-overlap"
            else classification = "cross-nav"
        }
        const gated =
            navPolicy === "count" ||
            classification === "content-repeat" ||
            classification === "same-nav-repeat"

        groups.push({
            identity: arr[0].identity,
            identitySource: arr[0].identitySource,
            subject: arr[0].subject,
            count: arr.length,
            contentCount,
            navCount,
            classification,
            gated,
            instances: arr.map((i) => ({
                label: i.label,
                href: i.href,
                region: i.region,
                where: i.where,
            })),
        })
    }
    groups.sort((a, b) => b.count - a.count)

    return {
        totalCandidates: candidates.length,
        offeredInstances: offered.length,
        excluded: Array.from(excludedTally.entries()).map(([reason, count]) => ({ reason, count })),
        unidentifiable,
        groups,
        duplicateActionCount: groups.filter((g) => g.gated).length,
        navOverlapCount: groups.filter((g) => !g.gated).length,
        navPolicy,
    }
}
