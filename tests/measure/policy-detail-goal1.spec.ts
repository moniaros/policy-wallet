/**
 * GOAL 1 acceptance — every confirmed BROKEN item, asserted fixed.
 *
 * This is not a re-measurement (the matrix pass does that, unchanged). It
 * asserts the OUTCOME of each fix on the state that produced the defect, at
 * 320/390/430, across both product types and all three lifecycle states where
 * the defect is state-dependent.
 *
 * Every assertion here was written against the Goal 0 evidence and must FAIL
 * on the pre-fix code — a check that could never have been red proves nothing.
 * The three `defect-*` fixtures exist precisely so the broken states are
 * reproducible rather than hypothetical (tests/measure/fixtures.ts).
 *
 * Run:  npx playwright test --project=measure policy-detail-goal1
 */

import { test, expect, type Page } from "@playwright/test"
import { readFileSync } from "fs"
import path from "path"
import { dismissCookieBanner } from "../helpers/ui"
import { FIXTURE_SPECS, fixtureDates, provisionMatrixFixtures } from "./fixtures"
import { WIDTHS, settle, nonTelPhoneNumbers, clippedLabels } from "./policy-detail"

const HEIGHT: Record<number, number> = { 320: 720, 390: 844, 430: 932 }

function loadEnvFromDotenvFiles() {
    for (const file of [".env.local", ".env"]) {
        try {
            const content = readFileSync(path.join(process.cwd(), file), "utf8")
            for (const line of content.split("\n")) {
                const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\n]*)"?\s*$/)
                if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
            }
        } catch { /* absent — fine */ }
    }
}

test.describe.configure({ mode: "serial" })

let ids: Record<string, string> = {}

test.beforeAll(async () => {
    test.setTimeout(300_000)
    loadEnvFromDotenvFiles()
    const base = process.env.DATABASE_URL || ""
    const url = base.replace(/connection_limit=\d+/, "connection_limit=1").replace(/pool_timeout=\d+/, "pool_timeout=120")
    const { PrismaClient } = await import("@prisma/client")
    const db = new PrismaClient({ datasources: { db: { url } } })
    try {
        for (let attempt = 0; ; attempt++) {
            try {
                ids = await provisionMatrixFixtures(db, "e2e-ph@policywallet.test")
                break
            } catch (err) {
                if (attempt >= 1) throw err
                await new Promise((r) => setTimeout(r, 5_000))
            }
        }
    } finally {
        await db.$disconnect()
    }
})

async function open(page: Page, key: string, width: number) {
    const policyId = ids[key]
    expect(policyId, `fixture ${key} provisioned`).toBeTruthy()
    await page.setViewportSize({ width, height: HEIGHT[width] })
    for (let attempt = 0; attempt < 2; attempt++) {
        await page.goto(`/wallet/${policyId}`, { waitUntil: "domcontentloaded", timeout: 90_000 })
        await page.waitForTimeout(400)
        if (!page.url().includes("/auth/signin")) {
            await dismissCookieBanner(page)
            // Never assert against a half-rendered page. Under `next dev` the
            // shell paints first and the RSC body can still be streaming when
            // networkidle+1s elapses — which reads as "the fix did not render"
            // and is really "nothing rendered yet". Wait for the page's own
            // content, then settle.
            try {
                await page.waitForSelector("#summary", { timeout: 45_000, state: "attached" })
            } catch {
                continue // retry the navigation once
            }
            await settle(page)
            return
        }
    }
    throw new Error(`open: ${key} never rendered its content (or bounced to signin) — refusing to assert`)
}

const bodyText = (page: Page) => page.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " "))

// ── B2 — a wrong-language summary never renders ──────────────────────────────
test("B2: an English stored summary is withheld, explained, and offers re-analysis", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await open(page, "defect-english-summary", width)
        const text = await bodyText(page)

        // The English sentence must be gone from the page entirely.
        expect(text, `@${width}: English summary still rendered`).not.toContain("The policy concerns the insurance")
        // …replaced by a Greek explanation and a route to the fix.
        expect(text, `@${width}: no mismatch explanation`).toContain("δημιουργήθηκε σε άλλη γλώσσα")
        await expect(
            page.locator('#summary a[href="#analysis"]'),
            `@${width}: no re-analysis affordance`
        ).toHaveCount(1)
        // The heading still promises plain Greek — and nothing under it now
        // contradicts that. Compared case- and accent-folded: this surface
        // uppercases headings in CSS, and innerText returns the transformed
        // text, so a sentence-case comparison would be asserting the stylesheet.
        expect(fold(text)).toContain(fold("Το ασφαλιστήριό σας σε απλά ελληνικά"))
    }
})

test("B2: a Greek summary still renders untouched (the gate is not a blanket suppression)", async ({ page }) => {
    test.setTimeout(4 * 60_000)
    await open(page, "motor-active", 390)
    const text = await bodyText(page)
    expect(text).toContain("Το συμβόλαιο καλύπτει την αστική ευθύνη προς τρίτους")
    expect(text).not.toContain("δημιουργήθηκε σε άλλη γλώσσα")
})

// ── B4 — status, expiry and countdown agree ──────────────────────────────────
const el = (d: Date) => d.toLocaleDateString("el-GR", { timeZone: "Europe/Athens" })

/** Case- and accent-folded compare: this surface uppercases labels in CSS and
 *  innerText returns the transformed text, so a sentence-case comparison would
 *  be asserting the stylesheet rather than the copy. */
const fold = (v: string) => v.toUpperCase().normalize("NFD").replace(/\p{Diacritic}/gu, "")

for (const spec of FIXTURE_SPECS) {
    test(`B4: status, expiry and countdown are mutually consistent — ${spec.key}`, async ({ page }) => {
        test.setTimeout(6 * 60_000)
        const { end } = fixtureDates(spec.state)
        const expectedDate = el(end)
        const expectedStatus =
            spec.state === "expired" ? "Ληγμένο" : spec.state === "expiring" ? "Λήγει σύντομα" : "Ενεργό"

        for (const width of WIDTHS) {
            await open(page, spec.key, width)

            // Read the three renderings SEPARATELY, so a failure names which one
            // disagreed instead of dumping the page.
            const facts = await page.evaluate(() => {
                const text = (document.body.innerText || "").replace(/\s+/g, " ")
                const up = text.toUpperCase().normalize("NFD").replace(/\p{Diacritic}/gu, "")
                return {
                    // every expiry-shaped date rendered anywhere
                    dates: Array.from(text.matchAll(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g)).map((m) => m[0]),
                    // status, wherever it renders (hero chip + key-dates line)
                    statuses: Array.from(
                        up.matchAll(/(ΕΝΕΡΓΟ|ΛΗΓΕΙ ΣΥΝΤΟΜΑ|ΛΗΓΜΕΝΟ|ΑΚΥΡΩΜΕΝΟ|ΑΓΝΩΣΤΗ ΔΙΑΡΚΕΙΑ|ΑΠΑΙΤΕΙΤΑΙ ΕΝΕΡΓΕΙΑ)/g)
                    ).map((m) => m[1]),
                    // every countdown: the outlook/brief sentence, the key-dates
                    // tile, and the hero chip inside 30 days.
                    countdowns: Array.from(
                        up.matchAll(/(?:ΑΝΑΝΕΩΣΗ ΣΕ|ΛΗΓΕΙ ΣΕ)\s+(\d+)\s+ΗΜΕΡΕΣ/g)
                    ).map((m) => Number(m[1])),
                    expired: up.includes("ΕΧΕΙ ΛΗΞΕΙ"),
                }
            })

            // 1. The expiry date the server resolved is what renders.
            expect(facts.dates, `@${width}: expiry date ${expectedDate} not rendered (saw ${facts.dates.join(", ")})`)
                .toContain(expectedDate)

            // 2. Status agrees with what the date implies, everywhere it renders.
            const statusSet = Array.from(new Set(facts.statuses))
            expect(statusSet, `@${width}: status renderings disagree — ${statusSet.join(" / ")}`)
                .toEqual([fold(expectedStatus)])

            // 3. THE B4 assertion: every countdown reports the SAME number.
            //    Pre-fix, the key-dates tile (client UTC-float) and the outlook
            //    could differ by one around the Athens day boundary.
            const counts = Array.from(new Set(facts.countdowns))
            expect(counts.length, `@${width}: countdowns disagree — ${counts.join(" vs ")}`).toBeLessThanOrEqual(1)

            if (spec.state === "expired") {
                expect(facts.countdowns.length, `@${width}: an expired policy is counting down to renewal`).toBe(0)
                expect(facts.expired, `@${width}: expired policy does not say so`).toBe(true)
            } else {
                expect(counts.length, `@${width}: a live policy renders no countdown`).toBe(1)
                if (spec.state === "expiring") {
                    expect(counts[0], `@${width}: countdown outside the renewal window`).toBeLessThanOrEqual(30)
                    expect(counts[0]).toBeGreaterThanOrEqual(0)
                }
            }
        }
    })
}

// ── B10 — unreadable ≠ redacted ──────────────────────────────────────────────
test("B10: extractor placeholders are named as unread, not printed as values", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await open(page, "defect-unreadable", width)
        const text = await bodyText(page)

        // The bare placeholder must never stand where a value goes…
        const heroPlate = await page.evaluate(
            () => document.querySelector('[data-fact="vehicle.plateNumber"]')?.textContent?.replace(/\s+/g, " ").trim() || ""
        )
        expect(heroPlate, `@${width}: plate tile still prints the placeholder`).not.toMatch(/\bXXXX\b/)
        expect(heroPlate, `@${width}: plate tile does not say it could not be read`).toContain("Δεν διαβάστηκε από το έγγραφο")

        // …and where the model embedded one mid-sentence, the page says what it
        // is and offers the document, rather than leaving it to look redacted.
        expect(text, `@${width}: no unread-values note on the summary`).toContain("Δεν είναι κρυμμένα")
        await expect(
            page.locator('#summary a[href*="/documents/"]'),
            `@${width}: summary note offers no document`
        ).toHaveCount(1)
    }
})

// ── B1 — the hero void ───────────────────────────────────────────────────────
test("B1: the premium card is not the hero's own background colour", async ({ page }) => {
    test.setTimeout(4 * 60_000)
    for (const width of WIDTHS) {
        await open(page, "motor-active", width)
        const result = await page.evaluate(() => {
            // Alpha, whatever the serialisation. Tailwind 4 + Chrome emit
            // `oklab(… / .05)` here, not `rgba(…, .05)` — matching on rgba()
            // alone asserts the serialiser, not the design.
            const alphaOf = (color: string): number => {
                if (!color || color === "transparent") return 0
                const slash = color.match(/\/\s*([0-9.]+%?)\s*\)$/)
                if (slash) return slash[1].endsWith("%") ? parseFloat(slash[1]) / 100 : parseFloat(slash[1])
                const rgba = color.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([0-9.]+)\s*\)$/)
                if (rgba) return parseFloat(rgba[1])
                return 1
            }
            const card = document.querySelector('[data-fact="policy.premiumAmount"]') as HTMLElement | null
            if (!card) return null
            const hero = card.closest("section") as HTMLElement | null
            const bg = getComputedStyle(card).backgroundColor
            return {
                card: bg,
                cardAlpha: alphaOf(bg),
                hero: hero ? getComputedStyle(hero).backgroundColor : null,
            }
        })
        expect(result, `@${width}: premium card not found`).not.toBeNull()
        // The defect was an opaque fill identical to the surface behind it.
        expect(result!.card, `@${width}: premium card still paints the hero's ground`).not.toBe(result!.hero)
        // A translucent lift over the hero, not another opaque slab.
        expect(
            result!.cardAlpha,
            `@${width}: premium card is opaque (${result!.card})`
        ).toBeLessThan(1)
        expect(result!.cardAlpha, `@${width}: premium card has no fill at all`).toBeGreaterThan(0)
    }
})

// ── B3 — the section nav is readable and scrolls ─────────────────────────────
test("B3: no nav label is clipped, and the strip overflows instead of compressing", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await open(page, "motor-active", width)

        const clipped = (await clippedLabels(page)).filter((c) => c.startsWith("<a>"))
        expect(clipped, `@${width}: nav labels still clipped:\n${clipped.join("\n")}`).toEqual([])

        const strip = await page.evaluate(() => {
            const el = document.querySelector(".pw-scroll-strip") as HTMLElement | null
            if (!el) return null
            const pills = Array.from(el.querySelectorAll("a")) as HTMLElement[]
            return {
                scrolls: el.scrollWidth > el.clientWidth,
                widths: pills.map((p) => Math.round(p.getBoundingClientRect().width)),
                labels: pills.map((p) => (p.textContent || "").trim()),
            }
        })
        expect(strip, `@${width}: no scroll strip`).not.toBeNull()
        // Each pill is at least as wide as its own label needs — the baseline
        // defect compressed all of them to ~34px.
        const narrowest = Math.min(...strip!.widths)
        expect(narrowest, `@${width}: pills still compressed (min ${narrowest}px)`).toBeGreaterThanOrEqual(60)
        // With this many Greek labels the strip MUST overflow at mobile widths.
        expect(strip!.scrolls, `@${width}: strip does not scroll — labels were made to fit instead`).toBe(true)
    }
})

// ── B9 — phones stay real tel: targets ───────────────────────────────────────
test("B9: every rendered phone number is a tel: target (regression hold)", async ({ page }) => {
    test.setTimeout(4 * 60_000)
    for (const width of WIDTHS) {
        await open(page, "motor-active", width)
        const offenders = await nonTelPhoneNumbers(page)
        expect(offenders, `@${width}: phone rendered as plain text:\n${offenders.join("\n")}`).toEqual([])
    }
})

// ── B5 — a failed run is not a finding ───────────────────────────────────────
test("B5: analysis failure sits outside the findings register and marks them stale", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await open(page, "defect-failed-run", width)

        const placement = await page.evaluate(() => {
            const section = document.querySelector("#analysis")
            if (!section) return null
            const failure = Array.from(section.querySelectorAll("div")).find((d) =>
                (d.textContent || "").includes("Η ανάλυση απέτυχε")
            ) as HTMLElement | undefined
            if (!failure) return { found: false, insideFindings: null, staleNoted: false }
            // The findings register is the analysis card's own body.
            const card = section.querySelector(".bg-white\\/80, .dark\\:bg-slate-900\\/80")
            return {
                found: true,
                insideFindings: card ? card.contains(failure) : null,
                staleNoted: (section.textContent || "").includes("προέρχονται από προηγούμενη ανάλυση"),
            }
        })

        expect(placement, `@${width}: #analysis missing`).not.toBeNull()
        expect(placement!.found, `@${width}: failure state not rendered`).toBe(true)
        // THE fix: the failure is no longer inside the card that holds findings.
        expect(placement!.insideFindings, `@${width}: failure still inside the findings card`).toBe(false)
        // …and the findings underneath say they predate the failed run.
        expect(placement!.staleNoted, `@${width}: findings not marked stale`).toBe(true)

        // The retry affordance travels with the failure state.
        const text = await bodyText(page)
        expect(text).toContain("Επανάληψη")
    }
})

// ── B7 — no meter against an unlimited allowance ─────────────────────────────
test("B7: the usage meter and its limit-reasoned upsell are gone on unlimited plans", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await open(page, "motor-active", width)
        const text = await bodyText(page)
        // The widget's OWN heading — not a bare search for «Απεριόριστες», which
        // legitimately appears in policy content («Απεριόριστες κλήσεις» on a
        // roadside-assistance perk) and would make this assertion lie.
        expect(text, `@${width}: usage widget still rendered on an unlimited plan`).not.toContain("Χρήση Πλάνου AI")
        expect(text, `@${width}: still counting analyses`).not.toContain("αναλύσεις απομένουν αυτόν τον μήνα")
        const upsell = await page.locator('a[href*="reason=ai_analysis_limit"]').count()
        expect(upsell, `@${width}: upsell still argues from a removed limit`).toBe(0)
        // Only the widget was removed — the sidebar it lived in still renders.
        // (Not "an /upgrade link still exists": the E2E account resolves to
        // ph-pro, where having NO upgrade CTA on this page is correct.)
        await expect(
            page.locator(".pw-page-shell aside #documents"),
            `@${width}: the sidebar lost more than the widget`
        ).toHaveCount(1)
    }
})

// ── B8 — one string, one place ───────────────────────────────────────────────
test("B8: «Δεν έχει μοιραστεί ακόμα» renders at most once", async ({ page }) => {
    test.setTimeout(4 * 60_000)
    for (const width of WIDTHS) {
        await open(page, "motor-active", width)
        const where = await page.evaluate(() => {
            const hits: string[] = []
            document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
                // RENDERED text only. The RSC payload ships every translation
                // string inside <script>, so an unfiltered scan finds the copy
                // in the serialised props and reports a duplicate that no
                // reader can see — a measurement defect, not a product one.
                if (/^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT|TITLE)$/.test(el.tagName)) return
                const cs = getComputedStyle(el)
                if (cs.display === "none" || cs.visibility === "hidden") return
                if (el.getBoundingClientRect().height === 0) return
                const own = Array.from(el.childNodes)
                    .filter((x) => x.nodeType === 3)
                    .map((x) => (x.textContent || "").trim())
                    .join(" ")
                if (!own.includes("Δεν έχει μοιραστεί ακόμα")) return
                const sec = el.closest("section[id]")
                hits.push(
                    `<${el.tagName.toLowerCase()}${el.className ? "." + String(el.className).slice(0, 30) : ""}> in ` +
                        (sec ? "#" + (sec as HTMLElement).id : el.closest("aside") ? "aside" : "top")
                )
            })
            return hits
        })
        expect(where.length, `@${width}: duplicated empty-state string at:\n${where.join("\n")}`).toBeLessThanOrEqual(1)
    }
})

// ── B6 — no heading truncated mid-word ───────────────────────────────────────
test("B6: gap headings never break mid-word, and the surface is formal Greek", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await open(page, "motor-active", width)

        const badHeadings = await page.evaluate(() =>
            Array.from(document.querySelectorAll("#analysis h4"))
                .map((h) => (h.textContent || "").trim())
                // The character-slice signature: an ellipsis glued to a letter
                // with no space anywhere near it. A word-boundary truncation
                // leaves a completed word before the «…».
                .filter((t) => /\p{L}…$/u.test(t) && !/\s\p{L}+…$/u.test(t))
        )
        expect(badHeadings, `@${width}: mid-word truncated headings:\n${badHeadings.join("\n")}`).toEqual([])

        // REGISTER IS NOT ASSERTED HERE. Goal 1 fixed the informal strings this
        // page's OWN bundle carried (wallet.policyDetailsPage + the export card
        // literal). The rest of the mixing comes from the per-branch editorial
        // layer (lib/insurance/content/*.ts — 33 of 35 files), which also feeds
        // /branches pages that are out of scope for this series, and which the
        // goal series assigns to Goal 3's explicit register sweep. Asserting it
        // green here would either be a lie or force an out-of-scope edit.
    }
})
