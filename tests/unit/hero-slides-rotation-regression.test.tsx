import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, fireEvent, act } from "@testing-library/react"
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import path from "node:path"

import { HeroSlides } from "@/components/landing/HeroSlides"

/**
 * REGRESSION-GUARD (labelled as such, deliberately).
 *
 * This file measures the ABSENCE of a change: `HeroSlides`' rotation and
 * accessibility machinery was extracted into `components/growth/use-rotation.ts`
 * (GROWTH-HOOKS-01, D-G05 "extend by extraction") so `HookTicker` could consume
 * the same primitive instead of re-solving six a11y problems. The homepage hero
 * carries a FIXED P0 — the CTA once moved on interaction — and this guard exists
 * so the refactor provably changed nothing a visitor can observe:
 *
 *   - same 7s interval, same pause semantics (hover, keyboard focus, button),
 *   - same reduced-motion behaviour (auto-advance disabled ENTIRELY, pause
 *     control removed because there is nothing left to pause),
 *   - same aria-live transitions (off while self-advancing → polite once a
 *     person takes control),
 *   - same inert/aria-hidden handling of inactive slides,
 *   - byte-identical DOM against baselines captured from the PRE-refactor
 *     component (commit 6a63... state of HeroSlides.tsx, 2026-08-26).
 *
 * It CANNOT fail on pre-change code — the pre-change render IS the baseline —
 * so it is not evidence the ticker works; it is evidence the hero did not move.
 * Report it separately from the criteria that measure the ticker.
 *
 * Regenerating the baselines (UPDATE_HERO_BASELINE=1) is only legitimate after
 * an INTENTIONAL, owner-visible change to the hero. Regenerating to silence a
 * red run defeats the only purpose this file has.
 */

const BASELINE_DIR = path.join(process.cwd(), "tests/fixtures/hero-slides-baseline")
const UPDATE = process.env.UPDATE_HERO_BASELINE === "1"

function checkBaseline(name: string, html: string) {
    const file = path.join(BASELINE_DIR, `${name}.html`)
    if (UPDATE) {
        mkdirSync(BASELINE_DIR, { recursive: true })
        writeFileSync(file, html)
        return
    }
    expect(existsSync(file), `baseline ${name}.html is missing — capture it on the PRE-change component`).toBe(true)
    expect(html, `HeroSlides DOM diverged from the pre-refactor baseline (${name})`).toBe(
        readFileSync(file, "utf8")
    )
}

/** matchMedia stub with a controllable prefers-reduced-motion answer. */
function stubMatchMedia(reduced: boolean) {
    const listeners = new Set<(e: unknown) => void>()
    window.matchMedia = ((query: string) => ({
        matches: query.includes("prefers-reduced-motion") ? reduced : false,
        media: query,
        onchange: null,
        addEventListener: (_: string, cb: (e: unknown) => void) => listeners.add(cb),
        removeEventListener: (_: string, cb: (e: unknown) => void) => listeners.delete(cb),
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
    return listeners
}

const INTERVAL = 7000

function activeHeadlines(container: HTMLElement): string[] {
    return [...container.querySelectorAll("h1")].map((h) => h.textContent ?? "")
}

function liveRegion(container: HTMLElement): string | null {
    return container.querySelector("[aria-live]")?.getAttribute("aria-live") ?? null
}

beforeEach(() => {
    vi.useFakeTimers()
})

afterEach(() => {
    vi.useRealTimers()
})

describe("REGRESSION-GUARD: HeroSlides behaves identically after the rotation extraction", () => {
    it("renders byte-identical initial DOM in Greek", () => {
        stubMatchMedia(false)
        const { container } = render(<HeroSlides locale="el" />)
        checkBaseline("el-initial", container.innerHTML)
    })

    it("renders byte-identical initial DOM in English", () => {
        stubMatchMedia(false)
        const { container } = render(<HeroSlides locale="en" />)
        checkBaseline("en-initial", container.innerHTML)
    })

    it("renders byte-identical DOM under prefers-reduced-motion (no pause control, no advance)", () => {
        stubMatchMedia(true)
        const { container } = render(<HeroSlides locale="el" />)
        checkBaseline("el-reduced-motion", container.innerHTML)
        // and the timer really is off, not merely slower
        const before = activeHeadlines(container)
        act(() => vi.advanceTimersByTime(INTERVAL * 3))
        expect(activeHeadlines(container)).toEqual(before)
    })

    it("renders byte-identical DOM after one 7s advance", () => {
        stubMatchMedia(false)
        const { container } = render(<HeroSlides locale="el" />)
        act(() => vi.advanceTimersByTime(INTERVAL))
        checkBaseline("el-after-one-advance", container.innerHTML)
    })

    it("renders byte-identical DOM when paused via the visible control", () => {
        stubMatchMedia(false)
        const { container, getByRole } = render(<HeroSlides locale="el" />)
        fireEvent.click(getByRole("button", { name: "Παύση εναλλαγής" }))
        checkBaseline("el-paused", container.innerHTML)
        // paused means paused: no advance however long we wait
        const before = activeHeadlines(container)
        act(() => vi.advanceTimersByTime(INTERVAL * 4))
        expect(activeHeadlines(container)).toEqual(before)
        // and the control now offers to resume
        expect(getByRole("button", { name: "Συνέχεια εναλλαγής" })).toBeTruthy()
    })

    it("exactly one slide is exposed; the other two are aria-hidden AND inert", () => {
        stubMatchMedia(false)
        const { container } = render(<HeroSlides locale="el" />)
        const cells = [...container.querySelectorAll(".col-start-1.row-start-1")]
        expect(cells).toHaveLength(3)
        expect(cells.filter((c) => c.getAttribute("aria-hidden") === "true")).toHaveLength(2)
        expect(cells.filter((c) => c.hasAttribute("inert"))).toHaveLength(2)
        // only the visible slide is an h1 — the document outline rule
        expect(container.querySelectorAll("h1")).toHaveLength(1)
    })

    it("hover pauses the advance; leaving resumes it", () => {
        stubMatchMedia(false)
        const { container } = render(<HeroSlides locale="el" />)
        const group = container.querySelector('[role="group"]')!
        const before = activeHeadlines(container)
        fireEvent.mouseEnter(group)
        act(() => vi.advanceTimersByTime(INTERVAL * 2))
        expect(activeHeadlines(container)).toEqual(before)
        fireEvent.mouseLeave(group)
        act(() => vi.advanceTimersByTime(INTERVAL))
        expect(activeHeadlines(container)).not.toEqual(before)
    })

    it("keyboard focus anywhere inside pauses the advance", () => {
        stubMatchMedia(false)
        const { container } = render(<HeroSlides locale="el" />)
        const firstDot = container.querySelector("button")!
        const before = activeHeadlines(container)
        fireEvent.focus(firstDot) // bubbles to onFocusCapture on the group
        act(() => vi.advanceTimersByTime(INTERVAL * 2))
        expect(activeHeadlines(container)).toEqual(before)
    })

    it("aria-live is off while self-advancing and polite once a person takes control", () => {
        stubMatchMedia(false)
        const { container } = render(<HeroSlides locale="el" />)
        expect(liveRegion(container)).toBe("off")
        const dots = [...container.querySelectorAll("button")]
        fireEvent.click(dots[1]) // goTo → tookControl
        expect(liveRegion(container)).toBe("polite")
    })

    it("aria-live also turns polite when paused via the control", () => {
        stubMatchMedia(false)
        const { container, getByRole } = render(<HeroSlides locale="el" />)
        fireEvent.click(getByRole("button", { name: "Παύση εναλλαγής" }))
        expect(liveRegion(container)).toBe("polite")
    })

    it("dot navigation selects its slide and marks it current", () => {
        stubMatchMedia(false)
        const { container } = render(<HeroSlides locale="el" />)
        const dots = [...container.querySelectorAll("button")].slice(0, 3)
        fireEvent.click(dots[2])
        expect(dots[2].getAttribute("aria-current")).toBe("true")
        expect(dots[0].getAttribute("aria-current")).toBeNull()
    })
})
