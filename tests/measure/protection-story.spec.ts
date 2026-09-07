/**
 * «Καλύψεις & κενά» (/protection), photographed before and after the story
 * rebuild (goal series, 2026-09-07): phone (390), tablet (768) and desktop
 * (1280), both lenses, full page, with the rendered `data-fact` / `data-count`
 * maps, the section order, the elements that overflow the viewport (named
 * boxes, or the finding is a rumour), the page height, and the FIRST
 * VIEWPORT's text — the material for the five-second test («what does this
 * page tell me / how well am I protected / where are my gaps / which matters
 * most / what next»). Evidence, not assertion — the one binding assertion is
 * the brief's: no horizontal scroll.
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
const DIR = join(process.cwd(), "docs", "evidence", "protection-story", PHASE)
const BASE = process.env.BASE_URL || "http://localhost:3000"

const VIEWPORTS = [
    ["phone", 390, 844],
    ["tablet", 768, 1024],
    ["desktop", 1280, 900],
] as const
const LENSES = [
    ["branch", "/protection"],
    ["risk", "/protection?lens=risk"],
] as const

for (const [lens, path] of LENSES) {
    for (const [label, width, height] of VIEWPORTS) {
        test(`${lens} lens at ${width} (${PHASE})`, async ({ page }) => {
            test.setTimeout(4 * 60 * 1000)
            mkdirSync(DIR, { recursive: true })
            await page.setViewportSize({ width, height })
            await openSurface(page, `${BASE}${path}`, width === 390 ? 390 : 430)
            await page.setViewportSize({ width, height })
            await page.waitForTimeout(1200)
            const overflowers = await page.evaluate(() => {
                const limit = document.documentElement.clientWidth + 1
                return [...document.querySelectorAll<HTMLElement>("body *")]
                    .map((el) => ({ el, r: el.getBoundingClientRect() }))
                    .filter(({ r }) => r.width > 0 && r.right > limit)
                    .slice(0, 12)
                    .map(({ el, r }) => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}.${String(el.className || "").slice(0, 60)} right=${Math.round(r.right)} w=${Math.round(r.width)}`)
            })
            const [facts, counts, sections, hscroll, scrollHeight, h1, text, firstViewport, primaries] = await Promise.all([
                page.evaluate(extractAttributeMap as unknown as (a: string) => Record<string, string>, "data-fact"),
                page.evaluate(extractAttributeMap as unknown as (a: string) => Record<string, string>, "data-count"),
                page.evaluate(() => [...document.querySelectorAll("main section[id], main [data-story]")].map((s) => ({ id: s.id || s.getAttribute("data-story"), top: Math.round(s.getBoundingClientRect().top + window.scrollY), heading: (s.querySelector("h1,h2,h3")?.textContent || "").trim().slice(0, 60) }))),
                page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth),
                page.evaluate(() => document.documentElement.scrollHeight),
                page.evaluate(() => (document.querySelector("h1")?.textContent || "").trim()),
                page.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " ").trim().slice(0, 8000)),
                // What a reader sees before scrolling: every leaf text node whose
                // box starts above the fold, in document order.
                page.evaluate((h) => {
                    const out: string[] = []
                    const walker = document.createTreeWalker(document.querySelector("main") ?? document.body, NodeFilter.SHOW_TEXT)
                    let node: Node | null
                    while ((node = walker.nextNode())) {
                        const t = (node.textContent || "").replace(/\s+/g, " ").trim()
                        if (!t) continue
                        const el = node.parentElement
                        if (!el) continue
                        const r = el.getBoundingClientRect()
                        if (r.height === 0 || r.top >= h) continue
                        out.push(t)
                    }
                    return out.join(" · ").slice(0, 3000)
                }, height),
                page.evaluate(() => [...document.querySelectorAll("main .pw-primary-button")].map((a) => (a.textContent || "").trim())),
            ])
            await page.screenshot({ path: join(DIR, `${lens}-${label}.png`), fullPage: true })
            writeFileSync(
                join(DIR, `${lens}-${label}.json`),
                JSON.stringify({ phase: PHASE, lens, width, h1, scrollHeight, viewportsOfContent: +(scrollHeight / height).toFixed(1), hscroll, overflowers, primaries, sections, facts, counts, firstViewport, text }, null, 2)
            )
            console.log(`[${PHASE}/${lens}/${label}] h1=«${h1}» height=${scrollHeight} (${(scrollHeight / height).toFixed(1)} viewports) sections=${sections.length} facts=${Object.keys(facts).length} counts=${Object.keys(counts).length} primaries=${primaries.length} hscroll=${hscroll}${overflowers.length ? "\n  overflow: " + overflowers.join("\n  overflow: ") : ""}`)
            expect(hscroll, "the page must never scroll sideways").toBe(false)
        })
    }
}
