/**
 * THE DOCUMENT GATE on the agent's «Μεταφόρτωση ασφαλιστηρίου» door, as the
 * E2E agent (project agent-chromium). The scan step must refuse a non-insurance
 * document before the billable extraction; the commit step must refuse a
 * schedule filed under the wrong branch and offer the type it read.
 */
import { test, expect } from "@playwright/test"
import path from "node:path"
import { dismissCookieBanner } from "./helpers/ui"

const fixture = (name: string) => path.join(process.cwd(), "tests/fixtures/documents", name)

async function openUploadModal(page: import("@playwright/test").Page) {
    await page.goto("/customers")
    await dismissCookieBanner(page)
    await page.getByRole("button", { name: /Μεταφόρτωση ασφαλιστηρίου|Upload policy/i }).first().click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await dialog.locator('[data-testid="upload-policy-prescan-attestation"] input[type="checkbox"]').check()
    return dialog
}

test("scan: a restaurant menu is refused before the extraction, with the gate's copy", async ({ page }) => {
    const dialog = await openUploadModal(page)
    await page.setInputFiles("#upload-policy-file", fixture("menu.pdf"))
    const alert = dialog.getByRole("alert")
    await expect(alert).toBeVisible({ timeout: 45_000 })
    await expect(alert).toContainText(/Αυτό δεν φαίνεται να είναι ασφαλιστικό έγγραφο|doesn't appear to be an insurance document/)
    // Still on the upload step: nothing was scanned, nothing was created.
    await expect(dialog.locator("#upload-policy-file")).toBeAttached()
})

test("commit: a motor schedule filed as Health is refused with the branch it read, and changing the type passes", async ({ page }) => {
    test.setTimeout(240_000)
    const dialog = await openUploadModal(page)
    await page.setInputFiles("#upload-policy-file", fixture("motor-schedule.pdf"))
    // The scan (a real extraction) pre-fills the form; the agent lands on resolve or confirm.
    const branchSelect = dialog.locator("select").filter({ has: page.locator('option[value="motor"]') }).first()
    await expect(branchSelect).toBeVisible({ timeout: 180_000 })
    // Move past resolution when the modal asks who the customer is.
    const continueButton = dialog.getByRole("button", { name: /Νέος πελάτης|Επιβεβαίωση πελάτη|Δημιουργία|Συνέχεια|New customer|Confirm/i }).first()
    if (await continueButton.isVisible().catch(() => false)) await continueButton.click().catch(() => undefined)
    await branchSelect.selectOption("health")
    // Required identity fields must be filled for the submit to be enabled.
    for (const [label, value] of [
        [/ασφαλιστ|insurer/i, "Example Insurance"],
        [/αριθμ|number/i, "MT-2026-0001234"],
    ] as const) {
        const input = dialog.getByLabel(label).first()
        if ((await input.count()) && !(await input.inputValue())) await input.fill(value)
    }
    const submit = dialog.getByRole("button", { name: /Προσθήκη|Καταχώρηση|Add policy|Save/i }).last()
    await submit.click()
    const actions = dialog.locator('[data-testid="upload-policy-gate-actions"]')
    await expect(actions).toBeVisible({ timeout: 60_000 })
    expect(["BRANCH_MISMATCH", "BRANCH_UNCONFIRMED"]).toContain(await actions.getAttribute("data-gate-code"))
    const changeType = actions.getByRole("button", { name: /Άλλαξε τύπο|Change type/i })
    await expect(changeType).toBeVisible()
    await changeType.click()
    await submit.click()
    await expect(actions).toHaveCount(0, { timeout: 60_000 })
})
