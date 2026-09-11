import { describe, it, expect, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"

// The tab tree imports the wallet server actions, whose module chain parses the
// environment at load (`lib/env.ts`); the test asserts rendering, not actions.
vi.mock("@/app/(protected)/wallet/actions", () => ({
    confirmGap: vi.fn(),
    ignoreGap: vi.fn(),
    notifyAgentAboutGap: vi.fn(),
    runPolicyAnalysis: vi.fn(),
}))
vi.mock("@/app/(protected)/agent/actions", () => ({ requestAiConsent: vi.fn() }))

import { LanguageProvider } from "@/contexts/LanguageContext"
import { TranslationsProvider } from "@/contexts/TranslationsProvider"
import { PolicyAnalysisTabs } from "@/app/(protected)/wallet/[id]/PolicyAnalysisTabs"
import { getTranslations } from "@/lib/i18n"

/**
 * PW-PROVENANCE-01 W0-01. The insights tab read `policy.insurer` and
 * `policy.premium.currency` — two paths `AcordDataSchema` never declared and
 * the pipeline never wrote (0 production rows carried either on 2026-09-11) —
 * so every production policy rendered an empty insurer tile and a premium
 * with no currency, and `tsc` had nothing to say because the value is `any`.
 * `tests/unit/acord-data-read-sites.test.ts` now refuses such a path; this
 * proves the rendered outcome, with a fixture shaped exactly as the schema
 * declares it.
 */
describe("the analysis tab reads the insurer and the currency where the schema puts them", () => {
    it("renders the extracted insurer name and the premium with its currency", () => {
        render(
            <LanguageProvider>
                <TranslationsProvider>
                    <PolicyAnalysisTabs
                        acordData={{
                            policy: { insurerName: "Interamerican", premium: { amount: 420 }, currency: "EUR" },
                            coverages: [],
                        }}
                        gaps={[]}
                        policyId="p1"
                        t={getTranslations("el")}
                    />
                </TranslationsProvider>
            </LanguageProvider>
        )
        fireEvent.click(screen.getAllByRole("tab")[1])
        expect(screen.getByText("Interamerican")).toBeTruthy()
        expect(screen.getByText(/420\s+EUR/)).toBeTruthy()
    })
})
