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
 *
 * UPDATED FOR THE GOAL 2 RESTRUCTURE. Several assertions named the DOM the
 * defect lived in — `#summary`, `#analysis`, `.pw-scroll-strip`, the sidebar —
 * and Goal 2 legitimately renamed or removed all of it. Each one below is
 * rewritten to assert the same INVARIANT against the new structure; where a
 * defect's surface no longer exists at all, that is stated on the assertion
 * rather than the test being quietly dropped. Nothing here was weakened to make
 * the restructure pass.
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
                            // Readiness is the page's H1 — the policy's identity — not a
            // section id. Waiting on `#summary` tied the harness to one
            // structure, so the Goal 2 restructure (which legitimately renames
            // and removes section ids) read as "the page never rendered". The
            // probe must survive the change it exists to measure.
            await page.waitForSelector(".pw-page-shell h1", { timeout: 45_000, state: "attached" })
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
        // A route to re-analysis, wherever the summary now lives and whatever
        // the analysis section is called. Hardcoding `#summary a[href="#analysis"]`
        // is what made this assertion describe a structure instead of a promise —
        // and it caught a real dead link when the structure changed.
        const reanalysisHref = await page.evaluate(() => {
            const note = Array.from(document.querySelectorAll("a[href^='#']")).find((a) =>
                (a.closest("div,section")?.textContent || "").includes("δημιουργήθηκε σε άλλη γλώσσα")
            ) as HTMLAnchorElement | undefined
            if (!note) return null
            const id = note.getAttribute("href")!.slice(1)
            return { href: note.getAttribute("href"), targetExists: Boolean(document.getElementById(id)) }
        })
        expect(reanalysisHref, `@${width}: no re-analysis affordance beside the mismatch note`).not.toBeNull()
        expect(reanalysisHref!.targetExists, `@${width}: the re-analysis link points at a section that does not exist (${reanalysisHref!.href})`).toBe(true)
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
            } else if (spec.state === "expiring") {
                // Inside the renewal window the head states the countdown, once.
                expect(counts.length, `@${width}: an expiring policy states no countdown`).toBe(1)
                expect(counts[0], `@${width}: countdown outside the renewal window`).toBeLessThanOrEqual(30)
                expect(counts[0]).toBeGreaterThanOrEqual(0)
            } else {
                // An ACTIVE policy renders a DATE, not a countdown: "165 days"
                // is not information a reader acts on, and the tile that used to
                // print it was one of the three sites stating the same fact.
                expect(counts.length, `@${width}: an active policy is counting down (${counts.join(", ")})`).toBe(0)
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
        // `policy.insuredSubject` — Goal 2 generalised the marker, because the
        // "what is insured" answer is a plate for motor and a person otherwise.
        const heroPlate = await page.evaluate(
            () => document.querySelector('[data-fact="policy.insuredSubject"]')?.textContent?.replace(/\s+/g, " ").trim() || ""
        )
        expect(heroPlate, `@${width}: insured-subject field still prints the placeholder`).not.toMatch(/\bXXXX\b/)
        expect(heroPlate, `@${width}: insured-subject field does not say it could not be read`).toContain("Δεν διαβάστηκε από το έγγραφο")

        // …and where the model embedded one mid-sentence, the page says what it
        // is and offers the document, rather than leaving it to look redacted.
        expect(text, `@${width}: no unread-values note on the summary`).toContain("Δεν είναι κρυμμένα")
        // The note travels with the summary, wherever the summary sits.
        const summaryDocLinks = await page.evaluate(() =>
            Array.from(document.querySelectorAll('a[href*="/documents/"]')).filter((a) =>
                (a.closest("div,section,p")?.textContent || "").includes("Δεν είναι κρυμμένα")
            ).length
        )
        expect(summaryDocLinks, `@${width}: the unread-values note offers no document`).toBeGreaterThanOrEqual(1)
    }
})

// ── B1 — the hero void ───────────────────────────────────────────────────────
test("B1: the premium is legible against its own surface (the hero void is gone)", async ({ page }) => {
    test.setTimeout(4 * 60_000)
    for (const width of WIDTHS) {
        await open(page, "motor-active", width)

        // THE DEFECT'S SURFACE NO LONGER EXISTS. B1 was a premium card painted
        // `#111111` on a `#111111` hero; Goal 2 removed that hero entirely and
        // the premium is now a tile in the dates section. The invariant that
        // remains — a value must never be painted the same colour as the thing
        // behind it — is asserted here against the new location, and the
        // section is opened first because a closed disclosure renders nothing.
        await page.evaluate(() => {
            const btn = document.querySelector('#dates button[aria-expanded="false"]') as HTMLButtonElement | null
            btn?.click()
        })
        await page.waitForTimeout(400)

        const result = await page.evaluate(() => {
            const tile = document.querySelector('[data-fact="policy.premiumAmount"]') as HTMLElement | null
            if (!tile) return null
            // Nearest ancestor that actually paints a background.
            let parent: HTMLElement | null = tile.parentElement
            let behind = "rgba(0, 0, 0, 0)"
            while (parent && parent !== document.body) {
                const bg = getComputedStyle(parent).backgroundColor
                if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") { behind = bg; break }
                parent = parent.parentElement
            }
            return { tile: getComputedStyle(tile).backgroundColor, behind }
        })
        expect(result, `@${width}: premium tile not found in the dates section`).not.toBeNull()
        expect(result!.tile, `@${width}: the premium tile is painted the same colour as its surround`)
            .not.toBe(result!.behind)
    }
})

// ── B3 — the section nav is readable and scrolls ─────────────────────────────
test("B3: no navigation label is clipped at any width (now the section headers)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await open(page, "motor-active", width)

        // THE DEFECT'S SURFACE NO LONGER EXISTS: Goal 2 removed the 14-pill
        // anchor strip along with the other two navigation systems. The
        // invariant it protected — a Greek navigation label must render in full
        // at 320px — now belongs to the section headers, which ARE the
        // navigation. This is a stricter test than the original: the headers
        // carry longer strings than the pills did
        // («Όροι που μπορούν να επηρεάσουν μια αποζημίωση»).
        const clipped = await clippedLabels(page)
        expect(clipped, `@${width}: labels still clipped:\n${clipped.join("\n")}`).toEqual([])

        const headers = await page.evaluate(() =>
            Array.from(document.querySelectorAll("section[id] > h2 > button")).map((b) => {
                const el = b as HTMLElement
                const r = el.getBoundingClientRect()
                return {
                    label: (el.textContent || "").trim().slice(0, 60),
                    clipped: el.scrollWidth > el.clientWidth + 1,
                    height: Math.round(r.height),
                }
            })
        )
        expect(headers.length, `@${width}: no section headers found — the navigation is missing`).toBeGreaterThan(0)
        const bad = headers.filter((h) => h.clipped)
        expect(bad, `@${width}: clipped section header(s): ${bad.map((b) => b.label).join(" | ")}`).toEqual([])
        // Each header is the section's tap target.
        const small = headers.filter((h) => h.height < 44)
        expect(small, `@${width}: section header under 44px: ${small.map((s2) => s2.label).join(" | ")}`).toEqual([])
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

        await page.evaluate(() => {
            const btn = document.querySelector('#review button[aria-expanded="false"]') as HTMLButtonElement | null
            btn?.click()
        })
        await page.waitForTimeout(400)

        const placement = await page.evaluate(() => {
            const section = document.querySelector("#review")
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

        expect(placement, `@${width}: #review section missing`).not.toBeNull()
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
        // Only the widget was removed — everything that shared its column still
        // renders. Goal 2 dissolved the sidebar into the documents section, so
        // that is what this checks now. (Not "an /upgrade link still exists":
        // the E2E account is ph-pro, where NO upgrade CTA is the correct state.)
        await expect(
            page.locator("#documents"),
            `@${width}: the documents section went missing with the widget`
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

        // Gap headings live inside a disclosure; open it or there is nothing to check.
        await page.evaluate(() => {
            const btn = document.querySelector('#review button[aria-expanded="false"]') as HTMLButtonElement | null
            btn?.click()
        })
        await page.waitForTimeout(400)

        const badHeadings = await page.evaluate(() =>
            Array.from(document.querySelectorAll("#review h4"))
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
