import { test, expect, type Browser, type Page } from "@playwright/test"
import { readFileSync } from "node:fs"
import path from "node:path"
import { dismissCookieBanner } from "../helpers/ui"
import { WIDTHS, overlappingHitAreas } from "./metrics"

/**
 * Prevention brief — the MVP journey, end to end, on the local dev database:
 *   upload (seeded) → benefit with citation → user-selected action →
 *   follow-up state; the daily nudge; consented sharing seen by the advisor.
 * LOCAL fixtures only: the same refusal-to-touch-prod guard as global-setup.
 */
function loadEnvFromDotenvFiles() {
    for (const file of [".env.local", ".env"]) {
        try {
            const content = readFileSync(path.join(process.cwd(), file), "utf8")
            for (const line of content.split("\n")) {
                const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\n]*)"?\s*$/)
                if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
            }
        } catch { /* absent — fine */ }
    }
}

const PH = "e2e-ph@policywallet.test"
const AGENT = "e2e-agent@policywallet.test"
const POLICY_NUMBER = "E2E-PREV-HEALTH-1"
let phId = ""
let policyId = ""
let fallbackPolicyId = ""

test.describe.configure({ mode: "serial" })

test.beforeAll(async () => {
    test.setTimeout(300_000)
    loadEnvFromDotenvFiles()
    if (/cquudefwfwrmvpftuhyl/.test(process.env.DATABASE_URL || "") || /cquudefwfwrmvpftuhyl/.test(process.env.DIRECT_URL || "")) {
        throw new Error("wellness-prevention: refusing to run against the PRODUCTION database")
    }
    const url = (process.env.DATABASE_URL || "").replace(/connection_limit=\d+/, "connection_limit=1").replace(/pool_timeout=\d+/, "pool_timeout=120")
    const { PrismaClient } = await import("@prisma/client")
    const db = new PrismaClient({ datasources: { db: { url } } })
    try {
        const ph = await db.user.findUniqueOrThrow({ where: { email: PH }, select: { id: true } })
        const agent = await db.user.findUniqueOrThrow({ where: { email: AGENT }, select: { id: true } })
        phId = ph.id
        const now = Date.now()
        const acordData = {
            _version: 3,
            health: {
                annualCheckupIncluded: true,
                checkup: {
                    frequency: "μία φορά ανά ασφαλιστικό έτος",
                    limitAmount: 150,
                    tests: ["γενική αίματος", "σάκχαρο", "καρδιογράφημα"],
                    network: "συμβεβλημένα διαγνωστικά κέντρα",
                    waitingPeriodDays: 90,
                },
                coordinationCentre: { name: "Κέντρο Συντονισμού Υγείας", phone: "210 000 0000" },
            },
            perksAndBenefits: [{
                perkType: "prevention", usageLimit: "1 φορά τον χρόνο",
                name: { el: "Ετήσιος έλεγχος", en: "Annual check-up" },
                description: { el: "Προληπτικός έλεγχος", en: "Preventive check-up" },
                expiresWithPolicy: true, reminderRecommended: true,
            }],
            extraction: {
                summaryLanguage: "el",
                sources: {
                    "acordData.health.annualCheckupIncluded": { page: 4, snippet: "Ετήσιος προληπτικός έλεγχος υγείας", verified: true },
                    "acordData.health.checkup.frequency": { page: 4, snippet: "μία φορά ανά ασφαλιστικό έτος", verified: true },
                    "acordData.health.checkup.limitAmount": { page: 4, snippet: "έως 150 ευρώ", verified: true },
                },
            },
        }
        const existing = await db.policy.findFirst({ where: { ownerUserId: ph.id, policyNumber: POLICY_NUMBER }, select: { id: true } })
        const data = {
            ownerUserId: ph.id, createdByUserId: ph.id, policyNumber: POLICY_NUMBER, insurerName: "Εθνική Ασφαλιστική",
            lineOfBusiness: "health", status: "active",
            startDate: new Date(now - 165 * 86_400_000), endDate: new Date(now + 200 * 86_400_000),
            acordData,
        }
        policyId = existing
            ? (await db.policy.update({ where: { id: existing.id }, data, select: { id: true } })).id
            : (await db.policy.create({ data, select: { id: true } })).id
        // A second health policy whose document states NO phone: the card must
        // fall back to the insurer's VERIFIED call centre from the catalogue.
        const fbData = {
            ...data, policyNumber: "E2E-PREV-HEALTH-2", insurerName: "ΕΘΝΙΚΗ Η ΠΡΩΤΗ ΑΣΦΑΛΙΣΤΙΚΗ",
            acordData: { _version: 3, health: { annualCheckupIncluded: true }, extraction: { summaryLanguage: "el" } },
        }
        const fbExisting = await db.policy.findFirst({ where: { ownerUserId: ph.id, policyNumber: "E2E-PREV-HEALTH-2" }, select: { id: true } })
        fallbackPolicyId = fbExisting
            ? (await db.policy.update({ where: { id: fbExisting.id }, data: fbData, select: { id: true } })).id
            : (await db.policy.create({ data: fbData, select: { id: true } })).id
        await db.healthBenefitUsage.deleteMany({ where: { userId: ph.id, policyKey: { in: [policyId, fallbackPolicyId] } } })
        await db.healthShare.deleteMany({ where: { userId: ph.id } })
        if (!(await db.healthRiskAssessment.findFirst({ where: { userId: ph.id } }))) {
            await db.healthRiskAssessment.create({
                data: {
                    userId: ph.id, consentVersion: "2026-09",
                    answers: { ageBand: "40_49", sex: "female", smoking: "never", activity: "moderate", bmiBand: "normal", bloodPressure: "normal", familyCardio: "no", familyDiabetes: "no", backPain: "no" },
                    scores: [{ category: "cardiovascular", score: 24, band: "low", checks: [] }, { category: "metabolic", score: 18, band: "low", checks: [] }, { category: "musculoskeletal", score: 14, band: "low", checks: [] }],
                },
            })
        }
        await db.customerRelationship.upsert({
            where: { agentUserId_policyholderUserId: { agentUserId: agent.id, policyholderUserId: ph.id } },
            create: { agentUserId: agent.id, policyholderUserId: ph.id, status: "active" },
            update: { status: "active" },
        })
    } finally {
        await db.$disconnect()
    }
})

async function horizontalOverflow(page: Page): Promise<number> {
    return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
}

async function openWellness(page: Page) {
    await page.goto("/wellness")
    await dismissCookieBanner(page)
    await expect(page.locator(`[data-fact="wellness.checkupBenefit"][data-fact-subject="${policyId}"]`)).toBeVisible({ timeout: 60_000 })
}

for (const width of WIDTHS) {
    test(`wellness renders every state cleanly at ${width}px`, async ({ page }) => {
        test.setTimeout(120_000)
        await page.setViewportSize({ width, height: 900 })
        await openWellness(page)
        const card = page.locator(`[data-fact="wellness.checkupBenefit"][data-fact-subject="${policyId}"]`)
        await expect(card).toHaveAttribute("data-fact-value", "confirmed_by_document")
        await expect(card).toContainText("αναφέρει ετήσιο έλεγχο υγείας")
        await expect(card).toContainText("Ετήσιος προληπτικός έλεγχος υγείας")
        await expect(card).toContainText("Όπως αναγράφονται στο ασφαλιστήριο:")
        await expect(card).toContainText("μία φορά ανά ασφαλιστικό έτος")
        await expect(card).toContainText("150")
        await expect(card).toContainText("γενική αίματος · σάκχαρο · καρδιογράφημα")
        await expect(card).toContainText("90 ημέρες")
        // Tests / network / waiting carry no verified citation in the seed → marked.
        await expect(card).toContainText("δεν εντοπίστηκε αυτούσιο στο έγγραφο")
        await expect(card.getByRole("link", { name: /Δείτε τι γράφει το ασφαλιστήριο/ })).toBeVisible()
        await expect(card.getByRole("link", { name: /Καλέστε το κέντρο συντονισμού/ })).toHaveAttribute("href", "tel:2100000000")
        await expect(card).toContainText("Η κράτηση ραντεβού δεν γίνεται μέσα από την εφαρμογή.")
        await expect(page.locator('[data-fact="wellness.dailyNudge"]')).toBeVisible()
        // No phone in the document → the insurer's verified call centre, labelled as such.
        const fb = page.locator(`[data-fact="wellness.checkupBenefit"][data-fact-subject="${fallbackPolicyId}"]`)
        await expect(fb).toHaveAttribute("data-fact-value", "needs_confirmation")
        await expect(fb.getByRole("link", { name: /Καλέστε την ασφαλιστική εταιρεία/ })).toHaveAttribute("href", "tel:+302109099000")
        await expect(fb).toContainText("επιβεβαιωμένο τηλέφωνο εξυπηρέτησης της Εθνική Ασφαλιστική")
        await expect(fb).not.toContainText("Το ασφαλιστήριο δεν καταγράφει τηλέφωνο κέντρου συντονισμού.")
        // The retired pieces are gone.
        await expect(page.getByText("Προληπτικοί έλεγχοι")).toHaveCount(0)
        await expect(page.getByText("Αξίζει να ρωτήσετε τον γιατρό σας")).toHaveCount(0)
        expect(await horizontalOverflow(page), `horizontal scroll at ${width}px`).toBeLessThanOrEqual(1)
        const overlaps = await overlappingHitAreas(page)
        test.info().annotations.push({ type: "overlaps", description: JSON.stringify(overlaps) })
        const inOurCards = overlaps.filter((o: any) => /wellness|benefit|nudge|share/i.test(JSON.stringify(o)))
        expect(inOurCards, `overlapping hit areas inside the prevention cards at ${width}px`).toEqual([])
    })
}

test("benefit → «Αργότερα» with a date → persists → undo → «Ολοκληρώθηκε» hides the home card", async ({ page }) => {
    test.setTimeout(180_000)
    await page.setViewportSize({ width: 390, height: 900 })
    await page.goto("/dashboard")
    await dismissCookieBanner(page)
    await expect(page.locator("[data-checkup-nudge]")).toBeVisible({ timeout: 60_000 })

    await openWellness(page)
    const card = page.locator(`[data-fact="wellness.checkupBenefit"][data-fact-subject="${policyId}"]`)
    await card.getByRole("button", { name: "Αργότερα" }).click()
    await card.getByRole("button", { name: "Αποθήκευση" }).click()
    await expect(card).toContainText("Θα σας το θυμίσουμε στις")
    await page.reload()
    await expect(card).toContainText("Θα σας το θυμίσουμε στις", { timeout: 60_000 })
    await expect(card.locator('[data-fact="wellness.checkupIntent"]')).toHaveAttribute("data-fact-value", "later")

    await card.getByRole("button", { name: "Αναίρεση" }).click()
    await expect(card.getByRole("button", { name: "Ολοκληρώθηκε" })).toBeVisible()
    await card.getByRole("button", { name: "Ολοκληρώθηκε" }).click()
    await expect(card).toContainText("Σημειώθηκε ως ολοκληρωμένο για το")
    // The home card stays while ANY health policy still has an open check-up:
    // settle the second one too, then it must go.
    await page.goto("/dashboard")
    await expect(page.locator("[data-checkup-nudge]")).toBeVisible({ timeout: 60_000 })
    await openWellness(page)
    const second = page.locator(`[data-fact="wellness.checkupBenefit"][data-fact-subject="${fallbackPolicyId}"]`)
    await second.getByRole("button", { name: "Δεν με αφορά" }).click()
    await expect(second).toContainText("Δεν θα το ξαναδείτε φέτος.")

    await page.goto("/dashboard")
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 60_000 })
    await expect(page.locator("[data-checkup-nudge]")).toHaveCount(0)
})

test("daily nudge: «Όχι σήμερα» hides it for the day in this browser", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 })
    await openWellness(page)
    const nudge = page.locator('[data-fact="wellness.dailyNudge"]')
    await nudge.getByRole("button", { name: "Όχι σήμερα" }).click()
    await expect(nudge).toContainText("Εντάξει, τα λέμε αύριο.")
    await page.reload()
    await expect(page.locator('[data-fact="wellness.dailyNudge"]')).toContainText("Εντάξει, τα λέμε αύριο.", { timeout: 60_000 })
})

async function agentPage(browser: Browser): Promise<Page> {
    const context = await browser.newContext({ storageState: "playwright/.auth/agent.json", viewport: { width: 390, height: 900 } })
    return context.newPage()
}

test("share: consent → the advisor sees the snapshot (logged) → revoke → the advisor sees nothing", async ({ page, browser }) => {
    test.setTimeout(240_000)
    await page.setViewportSize({ width: 390, height: 900 })
    await openWellness(page)
    const panel = page.locator('[aria-labelledby="share-heading"]')
    await expect(panel.getByRole("button", { name: "Κοινοποίηση" })).toBeDisabled()
    await panel.getByRole("checkbox", { name: /Συμφωνώ να δει/ }).check()
    await panel.getByRole("button", { name: "Κοινοποίηση" }).click()
    await expect(panel).toContainText("Κοινοποιήθηκε", { timeout: 30_000 })

    const agent = await agentPage(browser)
    await agent.goto(`/customers/${phId}`)
    await dismissCookieBanner(agent)
    const shared = agent.locator('[data-fact="customer.healthShare"]')
    await expect(shared).toBeVisible({ timeout: 60_000 })
    await expect(shared).toContainText("Εικόνα υγείας που κοινοποίησε ο πελάτης")
    await expect(shared).toContainText("Καρδιαγγειακό")
    // Raw answers never travel.
    await expect(shared).not.toContainText("40–49")

    await page.reload()
    await expect(panel).toContainText("Τελευταία προβολή", { timeout: 60_000 })
    await panel.getByRole("button", { name: "Ανάκληση κοινοποίησης" }).click()
    await expect(panel).toContainText("Η κοινοποίηση ανακλήθηκε.")

    await agent.reload()
    await expect(agent.locator('[data-fact="customer.healthShare"]')).toHaveCount(0, { timeout: 60_000 })
    await agent.context().close()
})
