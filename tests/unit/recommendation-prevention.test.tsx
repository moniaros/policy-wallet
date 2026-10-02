import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render } from "@testing-library/react"
import { getTranslations } from "@/lib/i18n"
import { RecommendationCards } from "@/components/coverage/RecommendationCards"

vi.mock("@/contexts/LanguageContext", () => ({
    useLanguage: () => ({ language: "en", t: getTranslations("en") }),
}))

afterEach(cleanup)

describe("recommendation prevention and price evidence", () => {
    it("opens practical steps before insurance discussion without publishing a flat premium estimate", () => {
        const bilingual = (text: string) => ({ en: text, el: text })
        const view = render(<RecommendationCards language="en" tier="pro" recommendations={[{
            id: "tenant-review", lineOfBusiness: "renters", ruleId: "risk:home_contents_tenant",
            title: bilingual("Tenant belongings"), description: bilingual("Check the terms"),
            personalReason: bilingual("You rent your home"), urgency: "low",
            estimatedCostEur: 9876, status: "active", createdAt: "2026-10-02T00:00:00Z",
            mitigations: [
                { kind: "reduce", label: bilingual("Check for leaks"), detail: bilingual("Inspect visible connections") },
                { kind: "transfer", label: bilingual("Insurance option"), detail: bilingual("Discuss the terms"), line: "renters" },
            ],
            suggestedSolution: bilingual("Discuss the terms"),
        }]} />)
        fireEvent.click(view.getByRole("button", { name: getTranslations("en").policyholderExperience.openExplanation }))
        const steps = view.getByRole("region", { name: getTranslations("en").policyholderExperience.practicalSteps })
        expect(steps.textContent).toContain("Inspect visible connections")
        expect(steps.textContent).not.toContain("Insurance option")
        expect(view.container.textContent).toContain("Discuss the terms")
        expect(view.container.textContent).not.toMatch(/9[,.\s]?876/)
    })
})
