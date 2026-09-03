import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { ProtectionPrioritiesCard } from "@/components/dashboard/home/ProtectionPrioritiesCard"
import { ProtectionProfileResumeCard } from "@/components/dashboard/home/ProtectionProfileResumeCard"
import { getTranslations } from "@/lib/i18n"
import type { ProtectionPriority } from "@/lib/services/protection-profile/derive-priorities"

const t = getTranslations("el")
const home = t.dashboard.home
const labels = {
    kicker: home.prioritiesKicker,
    lead: home.prioritiesLead,
    countLabel: home.prioritiesCountLabel,
    unsureLabel: home.prioritiesUnsureLabel,
    confirmChip: home.prioritiesConfirmChip,
    declaredChip: home.prioritiesDeclaredChip,
    noPolicies: home.prioritiesNoPolicies,
    uploadCta: home.prioritiesUploadCta,
    withPolicies: home.prioritiesWithPolicies,
    alignmentCta: home.prioritiesAlignmentCta,
    disclaimer: home.prioritiesDisclaimer,
    reason: home.priorityReason,
}
const priorities: ProtectionPriority[] = [
    { id: "money:income", domain: "money", facet: "income", importance: "high", reason: { id: "stated_primary", text: { el: "Το ανέφερες ως αυτό που θα σε επηρέαζε περισσότερο.", en: "You named it." } }, confidence: "partial", requiresValidation: true, status: "needs_review", source: "both" },
    { id: "household", domain: "household", importance: "medium", reason: { id: "dependants", text: { el: "Άλλοι βασίζονται σε σένα.", en: "Others depend on you." } }, confidence: "known", requiresValidation: true, status: "needs_review", source: "declared_fact" },
    { id: "mobility", domain: "mobility", importance: "needs_review", reason: { id: "unsure", text: { el: "Δεν το ξεκαθαρίσαμε.", en: "Unsettled." } }, confidence: "unknown", requiresValidation: true, status: "needs_review", source: "declared_fact" },
]

function renderCard(hasPolicies: boolean) {
    return render(
        <ProtectionPrioritiesCard priorities={priorities} hasPolicies={hasPolicies} unsureCount={1} language="el" mapLabels={t.onboarding.protectionProfile.summary} labels={labels} />
    )
}

describe("ProtectionPrioritiesCard — Layer 1 on the home", () => {
    it("speaks in the app's plural voice, carries no score, no dialog and no upload action of its own", () => {
        const { container } = renderCard(false)
        const text = container.textContent ?? ""
        expect(text).toContain("Το αναφέρατε ως αυτό που θα σας επηρέαζε περισσότερο.")
        expect(text).not.toContain("Το ανέφερες")
        expect(text).toContain(home.prioritiesDisclaimer)
        expect(text).toContain(home.prioritiesNoPolicies)
        expect(text).not.toMatch(/\d\s?%/)
        expect(text).not.toMatch(/σκορ|score|βαθμ|ανασφάλιστ/i)
        expect(container.querySelector('[data-action="upload"]')).toBeNull()
        expect(container.querySelector('[role="dialog"]')).toBeNull()
        expect(container.querySelectorAll("button")).toHaveLength(0)
        expect(container.querySelector("a")?.getAttribute("href")).toBe("/wallet/add")
        expect(container.querySelector('[data-count="needs.priorityCount"]')?.textContent).toBe("3")
        expect(container.querySelector('[data-count="needs.unsureCount"]')?.textContent).toBe("1")
        expect(container.querySelector('[aria-live="polite"]')).toBeTruthy()
    })

    it("links to the alignment lens once policies exist", () => {
        const { container } = renderCard(true)
        expect(container.querySelector("a")?.getAttribute("href")).toBe("/protection?lens=risk")
        expect(container.textContent).toContain(home.prioritiesWithPolicies)
    })
})

describe("ProtectionProfileResumeCard", () => {
    it.each(["in_progress", "start"] as const)("%s is one link into /onboarding", (variant) => {
        const { container } = render(
            <ProtectionProfileResumeCard variant={variant} labels={{ kicker: home.resumeStartKicker, body: home.resumeStartBody, cta: home.resumeStartCta }} />
        )
        const link = container.querySelector("a")
        expect(link?.getAttribute("href")).toBe("/onboarding")
        expect(link?.getAttribute("data-variant")).toBe(variant)
        expect(container.querySelectorAll("a")).toHaveLength(1)
        expect(container.textContent).toContain(home.resumeStartCta)
    })
})
