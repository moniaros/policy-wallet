import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, fireEvent, act } from "@testing-library/react"

import { HookTicker } from "@/components/growth/HookTicker"
import { GROWTH_HOOKS } from "@/lib/growth/hooks"
import { localizeHref } from "@/lib/seo/locale-links"
import {
    NoPauseTicker,
    MotionIgnoringTicker,
    HidingTicker,
    PROBE_ITEMS,
} from "@/tests/fixtures/guard-probes/ticker-probes"

/**
 * ticker-a11y — the hook ticker fails CI when it:
 *   1. auto-advances without a visible pause control (WCAG 2.2.2, Level A);
 *   2. ignores prefers-reduced-motion (the answer must be a STATIC STACK,
 *      not slower motion, not a frozen carousel with a dead pause button);
 *   3. hides content from the accessibility tree / the DOM — every hook line
 *      must be in the DOM whatever the animation state.
 *
 * The matchers are the exported audit helpers below, and each one is proven
 * RED against a committed probe component (tests/fixtures/guard-probes/
 * ticker-probes.tsx) that commits exactly that violation. A guard whose
 * matcher was never shown red is not a guard.
 *
 * The universe is the register: items, links and counts are derived from
 * GROWTH_HOOKS, never retyped here — a new hook is guarded the moment the
 * register carries it.
 */

const INTERVAL = 7000

function stubMatchMedia(reduced: boolean) {
    window.matchMedia = ((query: string) => ({
        matches: query.includes("prefers-reduced-motion") ? reduced : false,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
}

/** Matcher 1: a labelled pause/play control exists as a real button. */
export function hasPauseControl(container: HTMLElement): boolean {
    return [...container.querySelectorAll("button")].some((b) =>
        /παύση|συνέχεια|pause|resume/i.test(b.textContent ?? "")
    )
}

/** Matcher 3: every expected line is present in the DOM, animated or not. */
export function allContentInDom(container: HTMLElement, lines: readonly string[]): boolean {
    const text = container.textContent ?? ""
    return lines.every((line) => text.includes(line))
}

/** The exposed (not aria-hidden) text content — what assistive tech reads. */
function exposedText(container: HTMLElement): string {
    const clone = container.cloneNode(true) as HTMLElement
    clone.querySelectorAll('[aria-hidden="true"]').forEach((el) => el.remove())
    return clone.textContent ?? ""
}

beforeEach(() => {
    vi.useFakeTimers()
})

afterEach(() => {
    vi.useRealTimers()
})

describe("ticker-a11y: rotating mode (no reduced-motion preference)", () => {
    it("renders every hook from the register, in the DOM, with exactly one exposed", () => {
        stubMatchMedia(false)
        const { container } = render(<HookTicker locale="el" mode="rotating" />)
        expect(allContentInDom(container, GROWTH_HOOKS.map((h) => h.line.el))).toBe(true)
        const cells = [...container.querySelectorAll("[data-hook-id]")].map(
            (link) => link.closest('[aria-hidden]') ?? link.parentElement!
        )
        const hidden = [...container.querySelectorAll('.col-start-1[aria-hidden="true"]')]
        expect(hidden).toHaveLength(GROWTH_HOOKS.length - 1)
        for (const cell of hidden) expect(cell.hasAttribute("inert")).toBe(true)
        expect(cells.length).toBe(GROWTH_HOOKS.length)
    })

    it("carries a visible, labelled pause control — not a hover affordance", () => {
        stubMatchMedia(false)
        const { container } = render(<HookTicker locale="el" mode="rotating" />)
        expect(hasPauseControl(container)).toBe(true)
    })

    it("auto-advances on the shared 7s interval, and the pause control genuinely stops it", () => {
        stubMatchMedia(false)
        const { container, getByRole } = render(<HookTicker locale="el" mode="rotating" />)
        const first = exposedText(container)
        act(() => vi.advanceTimersByTime(INTERVAL))
        const second = exposedText(container)
        expect(second).not.toBe(first)

        fireEvent.click(getByRole("button", { name: "Παύση εναλλαγής" }))
        const atPause = exposedText(container)
        act(() => vi.advanceTimersByTime(INTERVAL * 3))
        expect(exposedText(container)).toBe(atPause)
        expect(getByRole("button", { name: "Συνέχεια εναλλαγής" })).toBeTruthy()
    })

    it("holds while hovered and while keyboard focus is inside", () => {
        stubMatchMedia(false)
        const { container } = render(<HookTicker locale="el" mode="rotating" />)
        const group = container.querySelector('[role="group"]')!
        const before = exposedText(container)
        fireEvent.mouseEnter(group)
        act(() => vi.advanceTimersByTime(INTERVAL * 2))
        expect(exposedText(container)).toBe(before)
        fireEvent.mouseLeave(group)

        fireEvent.focus(container.querySelector("a")!)
        act(() => vi.advanceTimersByTime(INTERVAL * 2))
        expect(exposedText(container)).toBe(before)
    })

    it("live region is off while self-advancing and polite once a person takes control", () => {
        stubMatchMedia(false)
        const { container } = render(<HookTicker locale="el" mode="rotating" />)
        const region = container.querySelector("[aria-live]")!
        expect(region.getAttribute("aria-live")).toBe("off")
        const dots = [...container.querySelectorAll("button")]
        fireEvent.click(dots[1])
        expect(region.getAttribute("aria-live")).toBe("polite")
    })

    it("every hook links to its guide, localized per locale", () => {
        for (const locale of ["el", "en"] as const) {
            stubMatchMedia(false)
            const { container, unmount } = render(<HookTicker locale={locale} mode="rotating" />)
            for (const hook of GROWTH_HOOKS) {
                const link = container.querySelector(`a[data-hook-id="${hook.id}"]`)
                expect(link, `${hook.id} has no link in ${locale}`).toBeTruthy()
                expect(link!.getAttribute("href")).toBe(localizeHref(hook.guideHref, locale))
                expect(link!.textContent).toContain(hook.line[locale])
            }
            unmount()
        }
    })
})

describe("ticker-a11y: prefers-reduced-motion renders the static stack", () => {
    it("does not rotate, exposes every hook, and drops the (dead) pause control", () => {
        stubMatchMedia(true)
        const { container } = render(<HookTicker locale="el" mode="rotating" />)
        expect(container.querySelector('[data-mode="static"]')).toBeTruthy()
        // nothing aria-hidden: the whole stack is exposed to assistive tech
        for (const hook of GROWTH_HOOKS) {
            expect(exposedText(container)).toContain(hook.line.el)
        }
        const before = container.innerHTML
        act(() => vi.advanceTimersByTime(INTERVAL * 4))
        expect(container.innerHTML).toBe(before)
        // a pause control with nothing to pause is worse than none
        expect(hasPauseControl(container)).toBe(false)
    })
})

describe("ticker-a11y: static mode never moves, regardless of motion preference", () => {
    it("renders the full stack with no timer and no controls", () => {
        stubMatchMedia(false)
        const { container } = render(<HookTicker locale="el" mode="static" />)
        expect(container.querySelector('[data-mode="static"]')).toBeTruthy()
        for (const hook of GROWTH_HOOKS) {
            expect(exposedText(container)).toContain(hook.line.el)
        }
        const before = container.innerHTML
        act(() => vi.advanceTimersByTime(INTERVAL * 4))
        expect(container.innerHTML).toBe(before)
        expect(container.querySelectorAll("button")).toHaveLength(0)
    })
})

/**
 * The matchers proven RED against committed probes — one per violation class.
 */
describe("the matchers are proven against the probe components", () => {
    it("flags the rotator with no pause control", () => {
        stubMatchMedia(false)
        const { container } = render(<NoPauseTicker />)
        act(() => vi.advanceTimersByTime(INTERVAL)) // it really is a rotator…
        expect(hasPauseControl(container)).toBe(false) // …and the matcher sees the violation
    })

    it("flags the rotator that ignores prefers-reduced-motion", () => {
        stubMatchMedia(true) // the user asked for no motion
        const { container } = render(<MotionIgnoringTicker />)
        const before = exposedText(container)
        act(() => vi.advanceTimersByTime(INTERVAL))
        expect(exposedText(container)).not.toBe(before) // violation: it moved anyway
    })

    it("flags the rotator that removes inactive content from the DOM", () => {
        stubMatchMedia(false)
        const { container } = render(<HidingTicker />)
        expect(allContentInDom(container, PROBE_ITEMS)).toBe(false)
    })
})
