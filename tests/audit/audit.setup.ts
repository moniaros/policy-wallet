import path from "path"
import { test as setup } from "@playwright/test"
import { E2E_POLICYHOLDER } from "../e2e-users"
import { dismissCookieBanner } from "../helpers/ui"
import { OLD_BASE, NEW_BASE, TARGET, assertOldBuild, assertNewBuild } from "./helpers"

/**
 * Audit login (D0). Cookies are origin-scoped, so the two targets need two
 * storage states; dev sessions rot in about an hour, so this runs on every
 * audit invocation. Only the CURRENT target's login is performed — the other
 * server may legitimately be down when a single-target run is asked for.
 */

const OLD_STATE = path.join(__dirname, "../../playwright/.auth/audit-old.json")
const NEW_STATE = path.join(__dirname, "../../playwright/.auth/user.json")

async function login(page: import("@playwright/test").Page, base: string, file: string) {
    await page.goto(`${base}/auth/signin`)
    await page.waitForLoadState("networkidle")
    await dismissCookieBanner(page)
    await page.fill('input[type="email"]', E2E_POLICYHOLDER.email)
    await page.fill("#signin-password", E2E_POLICYHOLDER.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(dashboard|home|wallet)|\/$/, { timeout: 45_000 })
    await page.context().storageState({ path: file })
}

setup("authenticate on the audit target", async ({ page, request }) => {
    setup.setTimeout(120_000)
    if (TARGET === "old") {
        await assertOldBuild(request)
        await login(page, OLD_BASE, OLD_STATE)
    } else {
        await assertNewBuild(request)
        await login(page, NEW_BASE, NEW_STATE)
    }
})
