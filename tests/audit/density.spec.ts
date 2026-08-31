import { test, expect } from "@playwright/test"
import { BASE, TARGET, auditContext, settleDeterministic, assertTarget } from "./helpers"

/**
 * Gate 8 — the two density assertions of §3.
 *
 *   1. The dashboard at 393×852 shows, above the fold, the verdict with its
 *      three counts AND at least one named action with its deadline.
 *      (The rendered gate's fold test covers the verdict + first row; this
 *      one additionally demands the deadline wording and the three tiles.)
 *   2. A policy row at 375 carries asset identifier, insurer, key covers,
 *      premium and status — five facts — without truncation.
 */

test.describe("gate 8 — density", () => {
    test.beforeEach(async ({ request }, testInfo) => {
        test.skip(!["iphone-se", "iphone-15"].includes(testInfo.project.name), "phone-density assertions")
        test.skip(TARGET === "old", "asserted on the rebuilt app")
        await assertTarget(request)
    })

    test("the fold at 393×852 carries the verdict counts and a dated action", async ({ browser }, testInfo) => {
        test.skip(testInfo.project.name !== "iphone-15", "the fold is the 393×852 contract")
        const ctx = await auditContext(browser, testInfo.project.name, "light")
        const page = await ctx.newPage()
        await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" })
        await settleDeterministic(page)
        const fold = await page.evaluate(() => {
            const inFold = (el: Element | null) => { const r = el?.getBoundingClientRect(); return !!r && r.top >= 0 && r.bottom <= 852 && r.height > 0 }
            const verdict = document.querySelector("#verdict")
            const tiles = verdict ? [...verdict.querySelectorAll("a")].filter((a) => /Καλύπτονται|Με κενό|Για έλεγχο/.test(a.textContent || "")) : []
            const firstRow = document.querySelector("#now li a, #now li")
            return {
                verdictInFold: inFold(verdict),
                tileCount: tiles.filter(inFold).length,
                rowInFold: inFold(firstRow),
                rowHasDeadline: /ημέρες|ημέρα|σήμερα|αύριο/.test(firstRow?.textContent || ""),
                rowNames: (firstRow?.textContent || "").trim().slice(0, 60),
            }
        })
        await ctx.close()
        expect(fold.verdictInFold, "verdict above the fold").toBe(true)
        expect(fold.tileCount, "three state tiles above the fold").toBe(3)
        expect(fold.rowInFold, "a now-action above the fold").toBe(true)
        expect(fold.rowHasDeadline, `the first action names its deadline: «${fold.rowNames}»`).toBe(true)
    })

    test("a policy row at 375 carries five facts untruncated", async ({ browser }, testInfo) => {
        test.skip(testInfo.project.name !== "iphone-se", "the row contract is 375")
        const ctx = await auditContext(browser, testInfo.project.name, "light")
        const page = await ctx.newPage()
        await page.goto(`${BASE}/policies`, { waitUntil: "domcontentloaded" })
        await settleDeterministic(page)
        const row = await page.evaluate(() => {
            const rows = [...document.querySelectorAll('section#list li a[href^="/policies/"]')]
            // the contract row: one that has an asset identifier (plate)
            const el = rows.find((r) => /[A-ZΑ-ΩΪΫ]{2,3}-?\d{3,4}/.test(r.textContent || "")) || rows[0]
            if (!el) return null
            const text = (el.textContent || "").replace(/\s+/g, " ")
            const clipped = [...el.querySelectorAll<HTMLElement>("*")].filter((c) => {
                const cs = getComputedStyle(c)
                // line-clamp is the sanctioned multi-line fit; single-line clip is truncation
                return cs.overflow !== "visible" && cs.webkitLineClamp === "none" && c.scrollWidth > c.clientWidth + 2
            }).length
            return {
                text: text.slice(0, 160),
                hasAsset: /[A-ZΑ-ΩΪΫ]{2,3}-?\d{3,4}/.test(text),
                hasInsurer: /[A-ZΑ-Ωa-zα-ω]{4,}/.test(text),
                hasCovers: /·/.test(text),
                hasPremium: /€/.test(text),
                hasStatus: /Καλύπτεται|Κενό|Για έλεγχο|Ληγμένο|Λήγει/.test(text),
                clipped,
            }
        })
        await ctx.close()
        expect(row, "a policy row exists").not.toBeNull()
        expect(row!.hasAsset, `asset identifier in «${row!.text}»`).toBe(true)
        expect(row!.hasInsurer, "insurer present").toBe(true)
        expect(row!.hasCovers, "key covers present").toBe(true)
        expect(row!.hasPremium, "premium present").toBe(true)
        expect(row!.hasStatus, "status present").toBe(true)
        expect(row!.clipped, "no single-line truncation inside the row").toBe(0)
    })
})
