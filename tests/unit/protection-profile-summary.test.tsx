import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { ProtectionMapCard } from "@/components/onboarding/protection-profile/ProtectionMapCard"
import { getTranslations } from "@/lib/i18n"
import type { ProtectionPriority } from "@/lib/services/protection-profile/derive-priorities"

const labels = getTranslations("el").onboarding.protectionProfile.summary
const priorities: ProtectionPriority[] = [
    { id: "money:income", domain: "money", facet: "income", importance: "high", reason: { id: "stated_primary", text: { el: "Το ανέφερες ως αυτό που θα σε επηρέαζε περισσότερο.", en: "You named it." } }, confidence: "partial", requiresValidation: true, status: "needs_review", source: "both" },
    { id: "household", domain: "household", importance: "medium", reason: { id: "dependants", text: { el: "Άλλοι βασίζονται σε σένα.", en: "Others depend on you." } }, confidence: "known", requiresValidation: true, status: "needs_review", source: "declared_fact" },
    { id: "mobility", domain: "mobility", importance: "needs_review", reason: { id: "unsure", text: { el: "Δεν το ξεκαθαρίσαμε.", en: "Unsettled." } }, confidence: "unknown", requiresValidation: true, status: "needs_review", source: "declared_fact" },
]

describe("ProtectionMapCard — the protection map", () => {
    it("names the areas, says why, carries the disclaimer, and never a score or a coverage word", () => {
        const { container } = render(
            <ProtectionMapCard labels={labels} language="el" priorities={priorities} insight={null} confidence="gaps" unsureCount={1} countedTotal={10}
                actions={<button type="button" className="pw-primary-button">Να δούμε τι έχω ήδη</button>} />
        )
        const text = container.textContent ?? ""
        expect(text).toContain("Εισόδημα")
        expect(text).toContain("Υψηλή προτεραιότητα")
        expect(text).toContain("Χρειάζονται περισσότερα στοιχεία")
        expect(text).toContain(labels.disclaimer)
        expect(text).toContain(labels.confidence.gaps)
        expect(text).not.toMatch(/\d\s?%/)
        expect(text).not.toMatch(/σκορ|score|βαθμ|καλύπτεσαι|ανασφάλιστ/i)
        expect(container.querySelector('[aria-live="polite"]')).toBeTruthy()
        expect(container.querySelectorAll(".pw-primary-button")).toHaveLength(1)
        expect(container.querySelector('[data-count="needs.priorityCount"]')?.textContent).toContain("3")
        expect(container.querySelector('[data-count="needs.unsureCount"]')?.textContent).toContain("1")
    })

    it("with nothing standing out it says so instead of inventing a priority", () => {
        const { container } = render(<ProtectionMapCard labels={labels} language="el" priorities={[]} insight={null} confidence={null} unsureCount={0} countedTotal={10} />)
        expect(container.textContent).toContain(labels.leadNone)
        expect(container.textContent).toContain(labels.notAskedYet)
    })
})
