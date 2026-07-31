/**
 * WP-19 — every route group announces that it is loading.
 *
 * 18 `loading.tsx` files existed and all 18 were inside `app/(protected)`. The
 * 59 public marketing routes, the whole auth tree and both onboarding flows had
 * none, so a slow navigation there rendered a blank frame — worst on the
 * landing pages, which are additionally wrapped in `<Suspense fallback={null}>`
 * and are the one surface with no session to fall back on.
 *
 * Accessibility is pinned alongside presence: a skeleton made of empty divs is
 * invisible to a screen reader, so every route fallback must carry a live
 * region AND actual announced text.
 */
import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

/** Route groups that own a user-facing navigation surface. */
const GROUPS = [
    "app/(protected)/loading.tsx",
    "app/(public)/loading.tsx",
    "app/auth/loading.tsx",
    "app/onboarding/loading.tsx",
]

describe("route-level loading states", () => {
    it("covers every top-level route group", () => {
        const missing = GROUPS.filter((f) => !existsSync(f))
        expect(missing).toEqual([])
    })

    it("marks each fallback as a busy live region", () => {
        const unmarked = GROUPS.filter((f) => {
            const src = readFileSync(f, "utf-8")
            return !src.includes('role="status"') || !src.includes('aria-busy="true"')
        })
        expect(unmarked).toEqual([])
    })

    it("gives a screen reader something to actually announce", () => {
        // The original defect: correct ARIA over an empty region announces
        // silence, so the user cannot tell loading from empty from broken.
        const silent = GROUPS.filter(
            (f) => !readFileSync(f, "utf-8").includes("LoadingAnnouncement")
        )
        expect(silent).toEqual([])
    })

    it("announces in both languages, since loading.tsx renders above the language provider", () => {
        const src = readFileSync("components/ui/LoadingSkeleton.tsx", "utf-8")
        expect(src).toContain("Φόρτωση")
        expect(src).toContain("Loading")
    })
})
