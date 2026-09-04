/**
 * THE DOCUMENT GATE, walked as the E2E policyholder.
 *
 * The invariant under test is resource behaviour, not copy: a document that is
 * not a plausible insurance policy of the selected type must be refused on
 * /wallet/add BEFORE a Policy row exists, before storage and before any model
 * reads it — and a real schedule must still go through. The direct-API cases
 * prove the same for callers that skip the UI. Database assertions live in
 * scratchpad/document-gate-db.mjs (run after this spec).
 *
 * Runs against the local dev server (localhost:3000, dev Supabase) as the
 * `chromium` project; the health→motor case consults the real classifier when
 * GEMINI_API_KEY is set locally, so it asserts on the set of honest verdicts.
 */
import { test, expect, type Page } from "@playwright/test"
import { readFileSync } from "node:fs"
import path from "node:path"
import { dismissCookieBanner } from "./helpers/ui"

const FIXTURES = path.join(process.cwd(), "tests/fixtures/documents")
const fixture = (name: string) => path.join(FIXTURES, name)

async function acceptConsentIfShown(page: Page) {
    const dialog = page.getByRole("dialog")
    if (await dialog.isVisible({ timeout: 2_000 }).catch(() => false)) {
        const accept = dialog.getByRole("button", { name: /συμφωνώ|αποδέχομαι|αποδοχή|συνέχεια|accept|agree|continue|allow/i }).first()
        if (await accept.isVisible().catch(() => false)) await accept.click()
    }
}

async function submitUpload(page: Page, file: string, branch: string) {
    await page.goto("/wallet/add")
    await dismissCookieBanner(page)
    await page.setInputFiles("#file-upload", fixture(file))
    await page.selectOption("#add-lineOfBusiness", branch)
    await page.locator("form button[type=submit]").click()
    await acceptConsentIfShown(page)
}

const gateCard = (page: Page) => page.locator("#add-policy-gate")

// Serial: the dev server compiles on first hit and each submission is one
// server action carrying the file; seven parallel workers made every step
// exceed the default 30 s and the duplicate case depends on the motor case.
test.describe.configure({ mode: "serial", timeout: 150_000 })

test.describe("/wallet/add — the gate decides before anything is stored", () => {
    test.beforeAll(async ({ request }) => {
        // The policy cap is checked BEFORE the gate (no spend on a document the
        // person cannot save). A capped E2E user would show the upgrade modal
        // instead of the gate card and prove nothing — say so rather than fail.
        const list = await request.get("/api/v1/policies")
        const payload = list.ok() ? await list.json() : null
        const count = (payload?.data?.policies ?? payload?.data ?? []).length
        test.skip(count >= 3, `the E2E policyholder holds ${count} policies — at the free cap; prune before running`)
    })

    test("a restaurant menu declared as Motor is refused as not an insurance document", async ({ page }) => {
        await submitUpload(page, "menu.pdf", "motor")
        await expect(gateCard(page)).toBeVisible({ timeout: 45_000 })
        await expect(gateCard(page)).toHaveAttribute("data-gate-code", "NOT_AN_INSURANCE_DOCUMENT")
        // Still on the form: nothing was created, nothing is being analysed.
        await expect(page.locator("form")).toBeVisible()
    })

    for (const [file, code] of [
        ["bank-statement.pdf", "NOT_AN_INSURANCE_DOCUMENT"],
        ["cv.pdf", "NOT_AN_INSURANCE_DOCUMENT"],
        ["lease.pdf", "NOT_AN_INSURANCE_DOCUMENT"],
        ["injection.pdf", "NOT_AN_INSURANCE_DOCUMENT"],
        ["terms-booklet.pdf", "NOT_AN_INSURANCE_POLICY"],
        ["corrupt.pdf", "FILE_UNREADABLE"],
        ["renamed-exe.pdf", "FILE_UNREADABLE"],
        ["many-pages.pdf", "TOO_MANY_PAGES"],
    ] as const) {
        test(`${file} declared as Motor → ${code}`, async ({ page }) => {
            await submitUpload(page, file, "motor")
            await expect(gateCard(page)).toBeVisible({ timeout: 45_000 })
            await expect(gateCard(page)).toHaveAttribute("data-gate-code", code)
        })
    }

    test("a health schedule declared as Motor is not analysed as Motor; changing the type lets it through", async ({ page }) => {
        await submitUpload(page, "health-schedule.pdf", "motor")
        await expect(gateCard(page)).toBeVisible({ timeout: 60_000 })
        const code = await gateCard(page).getAttribute("data-gate-code")
        expect(["BRANCH_MISMATCH", "BRANCH_UNCONFIRMED"]).toContain(code)
        const changeType = gateCard(page).getByRole("button", { name: /άλλαξε τύπο|change type/i })
        await expect(changeType).toBeVisible()
        await changeType.click()
        // The form gives way to the post-upload processing screen.
        await expect(page.locator("form")).toHaveCount(0, { timeout: 60_000 })
        await expect(page.locator("#add-policy-gate")).toHaveCount(0)
    })

    test("a motor schedule declared as Motor goes straight through", async ({ page }) => {
        await submitUpload(page, "motor-schedule.pdf", "motor")
        await expect(page.locator("form")).toHaveCount(0, { timeout: 60_000 })
        await expect(page.locator("#add-policy-gate")).toHaveCount(0)
    })

    test("the same motor schedule a second time is a duplicate, not a second policy", async ({ page }) => {
        await submitUpload(page, "motor-schedule.pdf", "motor")
        await expect(gateCard(page)).toBeVisible({ timeout: 45_000 })
        await expect(gateCard(page)).toHaveAttribute("data-gate-code", "DUPLICATE_DOCUMENT")
    })

    test("an image-only scan is never validated without a confident reading", async ({ page }) => {
        await submitUpload(page, "image-only.pdf", "motor")
        // A one-pixel «scan» cannot be a policy: either refused or held — never the processing screen.
        await expect(gateCard(page)).toBeVisible({ timeout: 90_000 })
        const code = await gateCard(page).getAttribute("data-gate-code")
        expect(["FILE_UNREADABLE", "NOT_AN_INSURANCE_DOCUMENT", "DOCUMENT_REVIEW_REQUIRED", "AI_UNAVAILABLE", "AI_CONSENT_REQUIRED"]).toContain(code)
    })
})

test.describe("direct API — the same gate for callers that skip the UI", () => {
    test.beforeAll(async ({ request }) => {
        const list = await request.get("/api/v1/policies")
        const payload = list.ok() ? await list.json() : null
        const count = (payload?.data?.policies ?? payload?.data ?? []).length
        test.skip(count >= 3, `the E2E policyholder holds ${count} policies — the extract route caps before the gate`)
    })

    test("POST /api/policies/extract refuses a menu with 422 and the gate's code", async ({ request }) => {
        const res = await request.post("/api/policies/extract", {
            multipart: { file: { name: "menu.pdf", mimeType: "application/pdf", buffer: readFileSync(fixture("menu.pdf")) } },
        })
        expect(res.status()).toBe(422)
        const body = await res.json()
        expect(body.code).toBe("NOT_AN_INSURANCE_DOCUMENT")
        expect(body.stage).toBe("recognition")
    })

    test("POST /api/policies/extract refuses a spoofed content type and a disguised executable at the door", async ({ request }) => {
        const spoofed = await request.post("/api/policies/extract", {
            multipart: { file: { name: "menu.pdf", mimeType: "image/png", buffer: readFileSync(fixture("menu.pdf")) } },
        })
        expect([400, 415]).toContain(spoofed.status())
        const exe = await request.post("/api/policies/extract", {
            multipart: { file: { name: "policy.pdf", mimeType: "application/pdf", buffer: readFileSync(fixture("renamed-exe.pdf")) } },
        })
        expect(exe.status()).toBe(415)
        expect((await exe.json()).code).toBe("FILE_UNREADABLE")
    })

    test("POST /api/v1/policies/[id]/documents refuses a menu declared as a policy schedule", async ({ request }) => {
        const list = await request.get("/api/v1/policies")
        expect(list.ok()).toBeTruthy()
        const payload = await list.json()
        const policies: Array<{ id: string }> = payload?.data?.policies ?? payload?.data ?? []
        test.skip(policies.length === 0, "the E2E policyholder holds no policy to attach to")
        const res = await request.post(`/api/v1/policies/${policies[0].id}/documents`, {
            multipart: {
                file: { name: "menu.pdf", mimeType: "application/pdf", buffer: readFileSync(fixture("menu.pdf")) },
                documentKind: "policy_schedule",
            },
        })
        expect(res.status()).toBe(422)
        const body = await res.json()
        expect(body?.error?.code).toBe("DOCUMENT_REJECTED")
        expect(body?.error?.details?.code).toBe("NOT_AN_INSURANCE_DOCUMENT")
    })
})
