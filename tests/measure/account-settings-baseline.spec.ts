/**
 * T-015 baseline — Ρυθμίσεις `/account` + its 5 subpages (priority 7 of the
 * §4.5 order). PAID tier.
 *
 * `/account` itself renders DIFFERENTLY per breakpoint by CSS, not by
 * measuring the viewport (`AccountPage`'s own comment): `lg:hidden` shows a
 * settings NAV MENU on mobile, `hidden lg:block` shows the profile pane on
 * desktop. At the 320/390/430 widths this run measures, `/account` is
 * therefore the nav menu, not the profile content — the profile content is
 * what `/account/profile` shows.
 *
 * Run:  npx playwright test --project=measure account-settings-baseline
 */
import { test } from "@playwright/test"
import { FIXTURE_SPECS, DEFECT_SPECS, provisionMatrixFixtures } from "./fixtures"
import { evidenceDirs, ensureDirs, openSurface, captureSurface, withDb } from "./surface-harness"

const WIDTHS = [320, 390, 430] as const
const EMAIL = "e2e-ph@policywallet.test"
const dirs = evidenceDirs("account-settings")

const ROUTES: { path: string; label: string }[] = [
    { path: "/account", label: "index-nav" },
    { path: "/account/profile", label: "profile" },
    { path: "/account/security", label: "security" },
    { path: "/account/privacy", label: "privacy" },
    { path: "/account/plan", label: "plan" },
    { path: "/account/notifications", label: "notifications" },
]

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
    test.setTimeout(300_000)
    ensureDirs(dirs)
    await withDb((db) => provisionMatrixFixtures(db, EMAIL, [...FIXTURE_SPECS, ...DEFECT_SPECS]))
})

for (const route of ROUTES) {
    test(`baseline: ${route.label} (paid)`, async ({ page }) => {
        test.setTimeout(8 * 60_000)
        for (const width of WIDTHS) {
            await openSurface(page, route.path, width)
            await captureSurface(page, dirs, `${route.label}-paid`, width, [], { tier: "paid", route: route.path }, 200)
        }
    })
}
