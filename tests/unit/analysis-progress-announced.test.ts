/**
 * WP-22 — the longest wait in the product must not be silent.
 *
 * The AI analysis panel on a policy page shows a step label, a hint, a
 * percentage and a bar, and carried no ARIA at all: no `role="status"`, no
 * `aria-live`, no `role="progressbar"`. A blind policyholder who started an
 * analysis was told nothing — not that it began, not which step it reached, not
 * that it finished. The upload surface already announced its progress
 * (AddPolicyClient) and the usage meter already exposed a progressbar; this
 * panel, the one people actually watch for a minute at a time, did not.
 *
 * The two mistakes worth pinning are not "is there ARIA" but which ARIA:
 *
 *  1. **The percentage must stay OUT of the live region.** A polite region
 *     containing a number that ticks announces on every change, which is worse
 *     than silence — it makes the page unusable while the run proceeds. The
 *     step label changes rarely and is what a person actually needs. The number
 *     stays reachable on demand through the progressbar.
 *  2. **`aria-valuenow` must not inherit the bar's cosmetic floor.** The visual
 *     bar is clamped to a minimum 8% width so a just-started run still looks
 *     started. Reusing that expression for the ARIA value would report 8%
 *     progress on a run that has made none — a small lie, told to precisely the
 *     user who cannot see the bar and has no way to check it.
 */
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const SOURCE = readFileSync("app/(protected)/wallet/[id]/AnalysisCard.tsx", "utf-8")

/** The in-progress panel, from its guard to the warning block that follows. */
const PANEL = SOURCE.split("{analysisInProgress && (")[1]?.split("{analysisWarning")[0] ?? ""

describe("the analysis progress panel", () => {
    it("was located in the source", () => {
        // Vacuity floor: a renamed flag would leave PANEL empty and every
        // assertion below would be checking the empty string.
        expect(PANEL.length).toBeGreaterThan(200)
        expect(PANEL).toContain("animate-spin")
    })

    it("announces the step politely", () => {
        expect(PANEL).toContain('role="status"')
        expect(PANEL).toContain('aria-live="polite"')
    })

    it("exposes progress as a progressbar with a name and a range", () => {
        expect(PANEL).toContain('role="progressbar"')
        expect(PANEL).toContain("aria-valuenow")
        expect(PANEL).toContain("aria-valuemin={0}")
        expect(PANEL).toContain("aria-valuemax={100}")
        expect(PANEL).toContain("aria-label=")
    })

    it("keeps the ticking percentage out of the live region", () => {
        // Otherwise every percent change interrupts the screen-reader user.
        const percentLine = PANEL.split("{runProgress}%")[0].split("<span").pop() ?? ""
        expect(percentLine).toContain('aria-hidden="true"')
    })

    it("hides the decorative spinner from assistive tech", () => {
        const spinner = PANEL.split("animate-spin")[0].split("<Loader2").pop() ?? ""
        expect(spinner).toContain('aria-hidden="true"')
    })

    it("does not report the bar's cosmetic 8% floor as real progress", () => {
        // The visual width keeps the floor; the announced value must not.
        const valueNow = PANEL.split("aria-valuenow=")[1]?.split("\n")[0] ?? ""

        expect(valueNow).toContain("Math.max(0,")
        expect(valueNow).not.toContain("Math.max(8,")
        // ...while the bar itself still has it, so a started run looks started.
        expect(PANEL).toContain("Math.max(8, Math.min(100, runProgress))")
    })
})
