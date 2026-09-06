/**
 * The policyholder home, photographed before and after the story rebuild
 * (impeccable brief, 2026-09-06): phone (390) and desktop (1280), full page,
 * with the rendered `data-fact` / `data-count` maps, the section order, the
 * horizontal-scroll check and the page height. Evidence, not assertion — the
 * only assertion is the one the brief makes binding: no horizontal scroll.
 *
 * STORY_PHASE=before|after picks the evidence folder. Runs in the `measure`
 * project (policyholder session).
 */

import { test, expect } from "@playwright/test"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { openSurface } from "./surface-harness"
import { extractAttributeMap } from "./bridge/facts"

const PHASE = process.env.STORY_PHASE || "before"
const DIR = join(process.cwd(), "docs", "evidence", "dashboard-story", PHASE)
const BASE = process.env.BASE_URL || "http://localhost:3000"

for (const [label, width, height] of [["phone", 390, 844], ["desktop", 1280, 900]] as const) {
    test(`home at ${width} (${PHASE})`, async ({ page }) => {
        test.setTimeout(4 * 60 * 1000)
        mkdirSync(DIR, { recursive: true })
        await page.setViewportSize({ width, height })
        await openSurface(page, `${BASE}/dashboard`, width === 390 ? 390 : 430)
        await page.setViewportSize({ width, height })
        await page.waitForTimeout(1200)
        // Who is wider than the viewport? Named boxes, or the finding is a rumour.
        const overflowers = await page.evaluate(() => {
            const limit = document.documentElement.clientWidth + 1
            return [...document.querySelectorAll<HTMLElement>("body *")]
                .map((el) => ({ el, r: el.getBoundingClientRect() }))
                .filter(({ r }) => r.width > 0 && r.right > limit)
                .slice(0, 12)
                .map(({ el, r }) => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}.${String(el.className || "").slice(0, 60)} right=${Math.round(r.right)} w=${Math.round(r.width)}`)
        })
        const [facts, counts, sections, hscroll, scrollHeight, h1, text] = await Promise.all([
            page.evaluate(extractAttributeMap as unknown as (a: string) => Record<string, string>, "data-fact"),
            page.evaluate(extractAttributeMap as unknown as (a: string) => Record<string, string>, "data-count"),
            page.evaluate(() => [...document.querySelectorAll("main section[id], main [data-story]")].map((s) => ({ id: s.id || s.getAttribute("data-story"), top: Math.round(s.getBoundingClientRect().top + window.scrollY), heading: (s.querySelector("h1,h2,h3")?.textContent || "").trim().slice(0, 60) }))),
            page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth),
            page.evaluate(() => document.documentElement.scrollHeight),
            page.evaluate(() => (document.querySelector("h1")?.textContent || "").trim()),
            page.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " ").trim().slice(0, 6000)),
        ])
        await page.screenshot({ path: join(DIR, `home-${label}.png`), fullPage: true })
        writeFileSync(join(DIR, `home-${label}.json`), JSON.stringify({ phase: PHASE, width, h1, scrollHeight, viewportsOfContent: +(scrollHeight / height).toFixed(1), hscroll, overflowers, sections, facts, counts, text }, null, 2))
        console.log(`[${PHASE}/${label}] h1=«${h1}» height=${scrollHeight} (${(scrollHeight / height).toFixed(1)} viewports) sections=${sections.length} facts=${Object.keys(facts).length} counts=${Object.keys(counts).length} hscroll=${hscroll}${overflowers.length ? "\n  overflow: " + overflowers.join("\n  overflow: ") : ""}`)
        expect(hscroll, "the page must never scroll sideways").toBe(false)
    })
}
