/**
 * Baseline — the surfaces §4.2 created, replacing four that were deleted.
 *
 * `/branches`, `/insights/risk-profile`, `/coverage-insights` and `/timeline`
 * each had a baseline spec; V2-P2-03 deleted all four with their routes, which
 * left «Η προστασία μου» and the relocated history with **no measurement
 * coverage at all**. Their committed evidence stays as the before-picture.
 *
 * Both lenses are captured separately because the surface renders exactly one
 * per request — that is deliberate (two lenses in one DOM would put the same
 * §6.7 fact on the page twice), and it means one capture cannot see both.
 *
 * Run:  PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
 *         npx playwright test --project=measure --no-deps protection-baseline
 * (`--no-deps` because the `setup` dependency needs a bundled browser this
 * machine does not have; refresh `playwright/.auth/*.json` with
 * `--project=setup` when a run starts rendering the sign-in page at HTTP 200.)
 */
import { test } from "@playwright/test"
import { evidenceDirs, ensureDirs, openSurface, captureSurface } from "./surface-harness"

const WIDTHS = [320, 390, 430] as const
const dirs = evidenceDirs("protection")

test.describe.configure({ mode: "serial" })
test.beforeAll(() => ensureDirs(dirs))

test("baseline: /protection — ανά κλάδο lens (paid)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await openSurface(page, "/protection", width, ".pw-page-shell h1, main h1, h1")
        await captureSurface(page, dirs, "branch-lens-paid", width, [], { tier: "paid", lens: "branch" }, 200)
    }
})

test("baseline: /protection?lens=risk — ανά κίνδυνο lens (paid)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await openSurface(page, "/protection?lens=risk", width, ".pw-page-shell h1, main h1, h1")
        await captureSurface(page, dirs, "risk-lens-paid", width, [], { tier: "paid", lens: "risk" }, 200)
    }
})

test("baseline: /account/history — the relocated timeline (paid)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await openSurface(page, "/account/history", width, ".pw-page-shell h1, main h1, h1")
        await captureSurface(page, dirs, "history-paid", width, [], { tier: "paid" }, 200)
    }
})
